import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export type MarketplaceModeValue = "DIGITAL" | "GIFT_CODES";

export const SETTING_KEYS = {
  marketplaceMode: "marketplace.mode",
  giftSettings: "gift.settings",
  rawCodeAccessRoles: "gift.rawCodeAccessRoles",
} as const;

/**
 * Roles allowed to reveal a raw gift code (PRD §72).
 * Deliberately NOT every admin — access is explicit and auditable.
 */
export const RAW_CODE_DEFAULT_ROLES: AdminRoleName[] = ["SUPER_ADMIN"];

export type AdminRoleName = "SUPER_ADMIN" | "ADMIN" | "CONTENT_MANAGER" | "SUPPORT";

export interface GiftSettings {
  /** Gift Codes Mode purchase switch (independent of the marketplace mode). */
  giftCodePurchase: boolean;
  /** Coupon support for gift-code products (opt-in per product too). */
  couponSupport: boolean;
  /** Minutes a cart line holds temporary inventory (PRD §23). */
  reservationMinutes: number;
  /** Threshold at which admin sees a LOW STOCK warning (PRD §94). */
  lowStockThreshold: number;
  /** Maximum codes allowed in a single order (PRD §26). */
  maxQuantityPerOrder: number;
  /** Maximum codes a single user may buy per day (0 = unlimited). */
  maxQuantityPerUserPerDay: number;
  /** Maximum order value in INR (0 = unlimited). */
  maxTransactionAmount: number;
  /** Target minutes for the team to email the code (PRD §92, §93). */
  deliveryTargetMinutes: number;
}

export const DEFAULT_GIFT_SETTINGS: GiftSettings = {
  giftCodePurchase: true,
  couponSupport: false,
  reservationMinutes: env.giftCodes.defaultReservationMinutes,
  lowStockThreshold: env.giftCodes.defaultLowStockThreshold,
  maxQuantityPerOrder: env.giftCodes.defaultMaxQuantityPerOrder,
  maxQuantityPerUserPerDay: env.giftCodes.defaultMaxQuantityPerUserPerDay,
  maxTransactionAmount: 0,
  deliveryTargetMinutes: env.giftCodes.defaultDeliveryTargetMinutes,
};

// ------------------------------------------------------------------
// Marketplace mode — single source of truth with a very short cache.
// Admin switches must be visible near-immediately without a restart
// (PRD §80, §82), so the TTL is deliberately tiny and writes invalidate.
// ------------------------------------------------------------------

const MODE_CACHE_TTL_MS = 2_000;

let modeCache: { value: MarketplaceModeValue; expiresAt: number } | null = null;

export function invalidateModeCache(): void {
  modeCache = null;
}

export async function getMarketplaceMode(): Promise<MarketplaceModeValue> {
  if (modeCache && modeCache.expiresAt > Date.now()) return modeCache.value;

  let mode: MarketplaceModeValue = "DIGITAL";
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTING_KEYS.marketplaceMode } });
    const raw = typeof row?.value === "string" ? row.value : null;
    if (raw === "GIFT_CODES" || raw === "DIGITAL") mode = raw;
  } catch (err) {
    logger.error("Failed to read marketplace mode — defaulting to DIGITAL", err instanceof Error ? err.message : err);
  }

  modeCache = { value: mode, expiresAt: Date.now() + MODE_CACHE_TTL_MS };
  return mode;
}

export async function setMarketplaceMode(mode: MarketplaceModeValue, adminId?: string): Promise<MarketplaceModeValue> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.marketplaceMode },
    update: { value: mode, updatedBy: adminId ?? null },
    create: { key: SETTING_KEYS.marketplaceMode, value: mode, updatedBy: adminId ?? null },
  });
  invalidateModeCache();
  return mode;
}

export function isGiftCodesMode(mode: MarketplaceModeValue): boolean {
  return mode === "GIFT_CODES";
}

// ------------------------------------------------------------------
// Gift settings
// ------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function coerceNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function getGiftSettings(): Promise<GiftSettings> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTING_KEYS.giftSettings } });
    if (!row || typeof row.value !== "object" || row.value === null || Array.isArray(row.value)) {
      return { ...DEFAULT_GIFT_SETTINGS };
    }
    const stored = row.value as Record<string, unknown>;
    return {
      giftCodePurchase: stored.giftCodePurchase !== false,
      couponSupport: stored.couponSupport === true,
      reservationMinutes: clamp(coerceNumber(stored.reservationMinutes, DEFAULT_GIFT_SETTINGS.reservationMinutes), 1, 240),
      lowStockThreshold: clamp(coerceNumber(stored.lowStockThreshold, DEFAULT_GIFT_SETTINGS.lowStockThreshold), 0, 100_000),
      maxQuantityPerOrder: clamp(coerceNumber(stored.maxQuantityPerOrder, DEFAULT_GIFT_SETTINGS.maxQuantityPerOrder), 1, 999),
      maxQuantityPerUserPerDay: clamp(
        coerceNumber(stored.maxQuantityPerUserPerDay, DEFAULT_GIFT_SETTINGS.maxQuantityPerUserPerDay),
        0,
        9999,
      ),
      maxTransactionAmount: clamp(
        coerceNumber(stored.maxTransactionAmount, DEFAULT_GIFT_SETTINGS.maxTransactionAmount),
        0,
        100_000_000,
      ),
      deliveryTargetMinutes: clamp(
        coerceNumber(stored.deliveryTargetMinutes, DEFAULT_GIFT_SETTINGS.deliveryTargetMinutes),
        1,
        1440,
      ),
    };
  } catch {
    return { ...DEFAULT_GIFT_SETTINGS };
  }
}

export async function updateGiftSettings(patch: Partial<GiftSettings>, adminId?: string): Promise<GiftSettings> {
  const current = await getGiftSettings();
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const next: GiftSettings = { ...current, ...defined };

  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.giftSettings },
    update: { value: next as unknown as object, updatedBy: adminId ?? null },
    create: { key: SETTING_KEYS.giftSettings, value: next as unknown as object, updatedBy: adminId ?? null },
  });

  return next;
}

/** Public platform configuration used by the frontend shell (PRD §76). */
export async function getPublicPlatformConfig() {
  const [mode, gift] = await Promise.all([getMarketplaceMode(), getGiftSettings()]);
  return {
    mode,
    giftCodes: {
      reservationMinutes: gift.reservationMinutes,
      maxQuantityPerOrder: gift.maxQuantityPerOrder,
      deliveryTargetMinutes: gift.deliveryTargetMinutes,
      purchaseEnabled: gift.giftCodePurchase,
    },
  };
}

// ------------------------------------------------------------------
// Raw code access roles (PRD §72, §73)
// ------------------------------------------------------------------

export async function getRawCodeAccessRoles(): Promise<AdminRoleName[]> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTING_KEYS.rawCodeAccessRoles } });
    const value = row?.value;
    if (Array.isArray(value)) {
      const roles = value.filter((v): v is AdminRoleName =>
        ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER", "SUPPORT"].includes(String(v)),
      );
      // SUPER_ADMIN always retains access — it can never be locked out.
      return roles.includes("SUPER_ADMIN") ? roles : ["SUPER_ADMIN", ...roles];
    }
  } catch {
    // fall through to defaults
  }
  return [...RAW_CODE_DEFAULT_ROLES];
}

export async function setRawCodeAccessRoles(roles: AdminRoleName[], adminId?: string): Promise<AdminRoleName[]> {
  const allowedRoles: AdminRoleName[] = ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER", "SUPPORT"];
  const unique = [...new Set(roles)].filter((r): r is AdminRoleName => allowedRoles.includes(r));
  const next: AdminRoleName[] = unique.includes("SUPER_ADMIN") ? unique : ["SUPER_ADMIN", ...unique];

  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.rawCodeAccessRoles },
    update: { value: next as unknown as object, updatedBy: adminId ?? null },
    create: { key: SETTING_KEYS.rawCodeAccessRoles, value: next as unknown as object, updatedBy: adminId ?? null },
  });

  return next;
}

export async function isGiftModeActive(): Promise<boolean> {
  const mode = await getMarketplaceMode();
  return mode === "GIFT_CODES";
}

export async function isDigitalModeActive(): Promise<boolean> {
  const mode = await getMarketplaceMode();
  return mode === "DIGITAL";
}

export async function canViewRawCodes(role: AdminRoleName): Promise<boolean> {
  const roles = await getRawCodeAccessRoles();
  return roles.includes(role);
}

