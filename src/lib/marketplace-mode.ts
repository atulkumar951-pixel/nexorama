import { db } from "@/db";
import { platformSettings, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type MarketplaceMode = "DIGITAL" | "GIFT_CODES";

// Short in-memory cache to prevent repeated DB round-trips within the same second
let cachedMode: MarketplaceMode | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 2000; // 2 seconds TTL

/**
 * Retrieve the active marketplace mode (PRD §2, §76, §80, §82).
 * Single source of truth from database `platform_settings`.
 * Defaults to "DIGITAL".
 */
export async function getMarketplaceMode(): Promise<MarketplaceMode> {
  const now = Date.now();
  if (cachedMode && now - cacheTime < CACHE_TTL_MS) {
    return cachedMode;
  }

  try {
    const [row] = await db
      .select({ value: platformSettings.value })
      .from(platformSettings)
      .where(eq(platformSettings.key, "marketplace_mode"))
      .limit(1);

    const mode = row?.value === "GIFT_CODES" ? "GIFT_CODES" : "DIGITAL";
    cachedMode = mode;
    cacheTime = now;
    return mode;
  } catch (err) {
    // If DB is temporarily unavailable or table not created yet, default to DIGITAL
    console.warn("Failed to fetch marketplace mode, defaulting to DIGITAL:", err);
    return "DIGITAL";
  }
}

/**
 * Check if the active marketplace mode is GIFT_CODES.
 */
export async function isGiftMode(): Promise<boolean> {
  const mode = await getMarketplaceMode();
  return mode === "GIFT_CODES";
}

/**
 * Update the active marketplace mode (PRD §2, §74, §79, §80).
 * Updates single source of truth in DB and invalidates cache and Next.js paths.
 */
export async function setMarketplaceMode(
  mode: MarketplaceMode,
  actor?: { id: number; email: string }
): Promise<void> {
  const previousMode = await getMarketplaceMode();

  try {
    await db
      .insert(platformSettings)
      .values({
        key: "marketplace_mode",
        value: mode,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: {
          value: mode,
          updatedAt: new Date(),
        },
      });

    // Invalidate local cache immediately
    cachedMode = mode;
    cacheTime = Date.now();

    // Create audit log entry (PRD §74)
    if (actor) {
      await db.insert(auditLogs).values({
        actorId: actor.id,
        actorEmail: actor.email,
        action: mode === "GIFT_CODES" ? "GIFT_MODE_ENABLED" : "GIFT_MODE_DISABLED",
        targetType: "PLATFORM_SETTING",
        targetId: "marketplace_mode",
        detail: `Marketplace mode switched from ${previousMode} to ${mode}`,
      });
    }

    // Revalidate customer storefront and admin paths
    revalidatePath("/", "layout");
  } catch (err) {
    console.error("Failed to update marketplace mode:", err);
    throw new Error(err instanceof Error ? err.message : "Failed to switch marketplace mode.");
  }
}

/**
 * Read a platform setting with a fallback default value.
 */
export async function getPlatformSetting(key: string, defaultValue = ""): Promise<string> {
  try {
    const [row] = await db
      .select({ value: platformSettings.value })
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);

    return row?.value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Update a platform setting.
 */
export async function setPlatformSetting(key: string, value: string): Promise<void> {
  await db
    .insert(platformSettings)
    .values({
      key,
      value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        value,
        updatedAt: new Date(),
      },
    });
}
