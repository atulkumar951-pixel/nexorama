import { prisma } from "../config/prisma";
import { Prisma, type GiftCode } from "@prisma/client";
import { Errors } from "../utils/errors";
import { logger } from "../utils/logger";
import { canonicalCode, decryptGiftCode, encryptGiftCode, hashGiftCode, maskGiftCode } from "../utils/giftCode";

/**
 * Gift code inventory engine.
 *
 * Two invariants matter more than anything else here:
 *   1. A single physical code can never be sold twice (PRD §20, §65).
 *   2. A reservation never withholds inventory forever (PRD §23, §24).
 *
 * Both are guaranteed with Postgres transactions plus a transaction-scoped
 * advisory lock that serialises all gift-inventory mutations, and a
 * `FOR UPDATE SKIP LOCKED` code claim that is atomic at the row level.
 */

/** Fixed advisory-lock key — all gift inventory mutations queue behind it. */
const GIFT_INVENTORY_LOCK_KEY = 918_273_645;

export type Tx = Prisma.TransactionClient;

/** Run `fn` inside a transaction holding the gift-inventory advisory lock. */
export async function withInventoryLock<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${GIFT_INVENTORY_LOCK_KEY})`;
      return fn(tx);
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}

export interface StockSummary {
  total: number;
  available: number;
  reserved: number;
  assigned: number;
  sold: number;
  expired: number;
  /** Codes a customer can actually buy right now (available − active holds). */
  sellable: number;
  outOfStock: boolean;
  lowStock: boolean;
}

const EMPTY_STOCK: StockSummary = {
  total: 0,
  available: 0,
  reserved: 0,
  assigned: 0,
  sold: 0,
  expired: 0,
  sellable: 0,
  outOfStock: true,
  lowStock: false,
};

function finaliseStock(input: {
  total: number;
  available: number;
  reserved: number;
  assigned: number;
  sold: number;
  expired: number;
  lowStockThreshold: number;
}): StockSummary {
  const sellable = Math.max(0, input.available - input.reserved);
  return {
    total: input.total,
    available: input.available,
    reserved: input.reserved,
    assigned: input.assigned,
    sold: input.sold,
    expired: input.expired,
    sellable,
    outOfStock: sellable <= 0,
    lowStock: input.lowStockThreshold > 0 && sellable > 0 && sellable <= input.lowStockThreshold,
  };
}

/**
 * Release reservations past their expiry (PRD §23, §24) and flag codes whose
 * expiry date has passed so they can never be assigned (PRD §45, §96).
 * Idempotent and cheap enough to run on relevant requests.
 */
export async function sweepExpiredInventory(): Promise<{ released: number; expiredCodes: number }> {
  const now = new Date();

  const [released, expiredCodes] = await Promise.all([
    prisma.giftCodeReservation.updateMany({
      where: { status: "ACTIVE", expiresAt: { lt: now } },
      data: { status: "EXPIRED", releasedAt: now },
    }),
    prisma.giftCode.updateMany({
      where: { status: "AVAILABLE", expiryDate: { not: null, lt: now } },
      data: { status: "EXPIRED" },
    }),
  ]);

  return { released: released.count, expiredCodes: expiredCodes.count };
}

/** Aggregate inventory numbers for one product. */
export async function getStockForProduct(
  giftProductId: string,
  lowStockThreshold = 0,
): Promise<StockSummary> {
  const now = new Date();

  const [grouped, reservedAgg] = await Promise.all([
    prisma.giftCode.groupBy({ by: ["status"], where: { giftProductId }, _count: { _all: true } }),
    prisma.giftCodeReservation.aggregate({
      where: { giftProductId, status: "ACTIVE", expiresAt: { gt: now } },
      _sum: { quantity: true },
    }),
  ]);

  const counts = new Map<string, number>();
  let total = 0;
  for (const row of grouped) {
    counts.set(row.status, row._count._all);
    total += row._count._all;
  }

  return finaliseStock({
    total,
    available: counts.get("AVAILABLE") ?? 0,
    reserved: reservedAgg._sum.quantity ?? 0,
    assigned: counts.get("ASSIGNED") ?? 0,
    sold: counts.get("SOLD") ?? 0,
    expired: counts.get("EXPIRED") ?? 0,
    lowStockThreshold,
  });
}

/** Batch stock lookup used by catalogue listings (avoids N+1 queries). */
export async function getStockMap(
  giftProductIds: string[],
  thresholds: Map<string, number> = new Map(),
): Promise<Map<string, StockSummary>> {
  const result = new Map<string, StockSummary>();
  if (giftProductIds.length === 0) return result;

  const now = new Date();

  const [grouped, reservations] = await Promise.all([
    prisma.giftCode.groupBy({
      by: ["giftProductId", "status"],
      where: { giftProductId: { in: giftProductIds } },
      _count: { _all: true },
    }),
    prisma.giftCodeReservation.groupBy({
      by: ["giftProductId"],
      where: { giftProductId: { in: giftProductIds }, status: "ACTIVE", expiresAt: { gt: now } },
      _sum: { quantity: true },
    }),
  ]);

  const reservedByProduct = new Map<string, number>();
  for (const row of reservations) reservedByProduct.set(row.giftProductId, row._sum.quantity ?? 0);

  const acc = new Map<string, { total: number; available: number; assigned: number; sold: number; expired: number }>();
  for (const id of giftProductIds) {
    acc.set(id, { total: 0, available: 0, assigned: 0, sold: 0, expired: 0 });
  }

  for (const row of grouped) {
    const bucket = acc.get(row.giftProductId);
    if (!bucket) continue;
    const count = row._count._all;
    bucket.total += count;
    if (row.status === "AVAILABLE") bucket.available += count;
    else if (row.status === "ASSIGNED") bucket.assigned += count;
    else if (row.status === "SOLD") bucket.sold += count;
    else if (row.status === "EXPIRED") bucket.expired += count;
  }

  for (const id of giftProductIds) {
    const bucket = acc.get(id) ?? { total: 0, available: 0, assigned: 0, sold: 0, expired: 0 };
    result.set(
      id,
      finaliseStock({ ...bucket, reserved: reservedByProduct.get(id) ?? 0, lowStockThreshold: thresholds.get(id) ?? 0 }),
    );
  }

  return result;
}

/**
 * Atomically claim `quantity` codes for an order.
 * Throws (and rolls back any partial claim) when inventory is insufficient.
 * MUST be called with an active inventory lock — see `withInventoryLock`.
 */
export async function claimCodesForOrder(
  tx: Tx,
  input: { giftProductId: string; quantity: number; orderId: string },
): Promise<GiftCode[]> {
  if (input.quantity < 1) throw Errors.badRequest("Quantity must be at least 1");

  const claimedIds = await tx.$queryRaw<Array<{ id: string }>>`
    UPDATE "gift_codes"
    SET "status" = 'ASSIGNED'::"GiftCodeStatus",
        "assigned_order_id" = ${input.orderId},
        "assigned_at" = NOW(),
        "updated_at" = NOW()
    WHERE "id" IN (
      SELECT "id" FROM "gift_codes"
      WHERE "gift_product_id" = ${input.giftProductId}
        AND "status" = 'AVAILABLE'::"GiftCodeStatus"
        AND ("expiry_date" IS NULL OR "expiry_date" > NOW())
      ORDER BY "created_at" ASC
      LIMIT ${input.quantity}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"
  `;

  if (claimedIds.length < input.quantity) {
    const ids = claimedIds.map((r) => r.id);
    if (ids.length > 0) {
      await tx.giftCode.updateMany({
        where: { id: { in: ids } },
        data: { status: "AVAILABLE", assignedOrderId: null, assignedAt: null },
      });
    }
    logger.warn(
      `Gift inventory shortfall: product=${input.giftProductId} requested=${input.quantity} claimed=${claimedIds.length}`,
    );
    throw Errors.conflict(
      claimedIds.length === 0
        ? "This gift code is out of stock right now. Please try another denomination."
        : `Only ${claimedIds.length} code(s) available. Please reduce the quantity.`,
    );
  }

  const ids = claimedIds.map((r) => r.id);
  return tx.giftCode.findMany({ where: { id: { in: ids } } });
}

/** Mark assigned codes as fully sold (called when delivery is confirmed). */
export async function markCodesSold(tx: Tx, giftCodeIds: string[], when: Date = new Date()): Promise<number> {
  if (giftCodeIds.length === 0) return 0;
  const result = await tx.giftCode.updateMany({
    where: { id: { in: giftCodeIds }, status: "ASSIGNED" },
    data: { status: "SOLD", soldAt: when },
  });
  return result.count;
}

// ------------------------------------------------------------------
// Import (PRD §13, §43, §44)
// ------------------------------------------------------------------

export interface ImportRow {
  code: string;
  expiry?: Date | null;
  notes?: string | null;
  batch?: string | null;
}

/** Parse raw CSV text with columns: code, expiry (optional), notes (optional), batch (optional). */
export function parseCsvRows(csvText: string): ImportRow[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const rows: ImportRow[] = [];
  const first = lines[0].toLowerCase();
  const hasHeader = first.includes("code");
  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
    const code = parts[0];
    if (!code) continue;

    const expiryStr = parts[1];
    let expiry: Date | null = null;
    if (expiryStr) {
      const parsed = new Date(expiryStr);
      if (!Number.isNaN(parsed.getTime())) expiry = parsed;
    }

    rows.push({
      code,
      expiry,
      notes: parts[2] || null,
      batch: parts[3] || null,
    });
  }

  return rows;
}

/** Parse plain multi-line input (one code per line) with optional shared batch / expiry. */
export function parseBatchLines(
  text: string,
  defaults: { expiry?: Date | null; batch?: string | null } = {},
): ImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((code) => ({
    code,
    expiry: defaults.expiry ?? null,
    notes: null,
    batch: defaults.batch ?? null,
  }));
}


export interface ImportPreviewRow {
  rowNumber: number;
  codeMasked: string;
  expiry: string | null;
  notes: string | null;
  batch: string | null;
  status: "VALID" | "DUPLICATE_FILE" | "DUPLICATE_DB" | "INVALID" | "EXPIRED";
  message?: string;
}

export interface ImportPreview {
  totalRows: number;
  valid: number;
  duplicates: number;
  invalid: number;
  rows: ImportPreviewRow[];
  /** Validated rows returned to the admin panel and replayed on confirm. */
  committedRows: ImportRow[];
}

/**
 * Validate an upload before importing anything (PRD §43, §44).
 * Nothing is written until the admin explicitly confirms.
 */
export async function previewImport(giftProductId: string, rows: ImportRow[]): Promise<ImportPreview> {
  const product = await prisma.giftProduct.findUnique({ where: { id: giftProductId }, select: { id: true } });
  if (!product) throw Errors.notFound("Gift product not found");

  const preview: ImportPreviewRow[] = [];
  const seen = new Map<string, number>();
  const committed: ImportRow[] = [];
  let valid = 0;
  let duplicates = 0;
  let invalid = 0;

  const hashes = rows.map((r) => hashGiftCode(r.code ?? "")).filter(Boolean);
  const existing = new Set(
    (
      await prisma.giftCode.findMany({
        where: { giftProductId, codeHash: { in: hashes } },
        select: { codeHash: true },
      })
    ).map((c) => c.codeHash),
  );

  const now = new Date();

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const code = canonicalCode(row.code ?? "");
    const masked = maskGiftCode(code);
    const base = { rowNumber, codeMasked: masked, expiry: row.expiry ? row.expiry.toISOString().slice(0, 10) : null, notes: row.notes ?? null, batch: row.batch ?? null };

    if (!code) {
      invalid += 1;
      preview.push({ ...base, status: "INVALID", message: "Empty code" });
      return;
    }
    if (code.length < 4 || code.length > 512) {
      invalid += 1;
      preview.push({ ...base, status: "INVALID", message: "Code length looks invalid (4–512 characters expected)" });
      return;
    }
    if (/[\r\n\t]/.test(code)) {
      invalid += 1;
      preview.push({ ...base, status: "INVALID", message: "Code contains control characters" });
      return;
    }

    const hash = hashGiftCode(code);
    if (existing.has(hash)) {
      duplicates += 1;
      preview.push({ ...base, status: "DUPLICATE_DB", message: "Code already exists in inventory" });
      return;
    }
    if (seen.has(hash)) {
      duplicates += 1;
      preview.push({ ...base, status: "DUPLICATE_FILE", message: `Duplicate of row ${seen.get(hash)} in this file` });
      return;
    }
    if (row.expiry && row.expiry.getTime() <= now.getTime()) {
      invalid += 1;
      preview.push({ ...base, status: "EXPIRED", message: "Expiry date is in the past" });
      return;
    }

    seen.set(hash, rowNumber);
    valid += 1;
    committed.push(row);
    preview.push({ ...base, status: "VALID" });
  });

  return {
    totalRows: rows.length,
    valid,
    duplicates,
    invalid,
    rows: preview.slice(0, 500),
    committedRows: committed,
  };
}

/**
 * Import validated rows atomically (PRD §43, §65).
 * The unique (giftProductId, codeHash) constraint means a concurrent import can
 * never double-insert a code.
 */
export async function commitImport(
  giftProductId: string,
  rows: ImportRow[],
  adminId?: string,
): Promise<{ imported: number; skipped: number }> {
  if (rows.length === 0) return { imported: 0, skipped: 0 };

  return withInventoryLock(async (tx) => {
    const product = await tx.giftProduct.findUnique({ where: { id: giftProductId }, select: { id: true } });
    if (!product) throw Errors.notFound("Gift product not found");

    const seen = new Set<string>();
    const data: Prisma.GiftCodeCreateManyInput[] = [];
    let skipped = 0;

    for (const row of rows) {
      const code = canonicalCode(row.code ?? "");
      if (!code) {
        skipped += 1;
        continue;
      }
      const codeHash = hashGiftCode(code);
      if (seen.has(codeHash)) {
        skipped += 1;
        continue;
      }
      seen.add(codeHash);
      data.push({
        giftProductId,
        encryptedCode: encryptGiftCode(code),
        codeHash,
        maskedCode: maskGiftCode(code),
        batchLabel: row.batch ? row.batch.slice(0, 120) : null,
        internalNote: row.notes ? row.notes.slice(0, 500) : null,
        expiryDate: row.expiry ?? null,
        status: row.expiry && row.expiry.getTime() <= Date.now() ? "EXPIRED" : "AVAILABLE",
        importedByAdminId: adminId ?? null,
      });
    }

    if (data.length === 0) return { imported: 0, skipped };

    const result = await tx.giftCode.createMany({ data, skipDuplicates: true });
    return { imported: result.count, skipped: skipped + (data.length - result.count) };
  });
}


// ------------------------------------------------------------------
// Admin inventory views (PRD §41, §42) — never expose `encryptedCode`
// ------------------------------------------------------------------

/**
 * Decrypt a single code for an authorised admin action and record the view (PRD §73).
 * Returns the raw code — callers must never place it in a list response or a log.
 */
export async function revealCode(
  giftCodeId: string,
  admin: { id: string; email: string },
  reason?: string,
): Promise<{ id: string; code: string; maskedCode: string; productId: string }> {
  const record = await prisma.giftCode.findUnique({
    where: { id: giftCodeId },
    select: { id: true, giftProductId: true, encryptedCode: true, maskedCode: true },
  });
  if (!record) throw Errors.notFound("Gift code not found");

  const code = decryptGiftCode(record.encryptedCode);

  await prisma.giftCode
    .update({
      where: { id: record.id },
      data: { lastViewedAt: new Date(), lastViewedByAdminId: admin.id, viewCount: { increment: 1 } },
    })
    .catch(() => undefined);

  // Mandatory audit trail for every raw-code reveal (PRD §73).
  await prisma.auditLog
    .create({
      data: {
        actorAdminId: admin.id,
        actorEmail: admin.email,
        action: "GIFT_CODE_VIEWED",
        targetType: "GiftCode",
        targetId: record.id,
        description: `Raw gift code viewed (masked ${record.maskedCode})${reason ? `: ${reason}` : ""}`,
        newValue: { giftProductId: record.giftProductId, maskedCode: record.maskedCode },
      },
    })
    .catch(() => undefined);

  logger.info(`Gift code revealed: codeId=${record.id} productId=${record.giftProductId} adminId=${admin.id}`);

  return { id: record.id, code, maskedCode: record.maskedCode, productId: record.giftProductId };
}

/** Admin inventory listing — the encrypted payload is never selected. */
export async function listInventory(options: {
  page?: number;
  limit?: number;
  giftProductId?: string;
  status?: string;
  expiringWithinDays?: number;
}) {
  const limit = Math.min(200, Math.max(1, options.limit ?? 25));
  const page = Math.max(1, options.page ?? 1);

  const where: Prisma.GiftCodeWhereInput = {};
  if (options.giftProductId) where.giftProductId = options.giftProductId;
  if (options.status) where.status = options.status as never;
  if (options.expiringWithinDays !== undefined) {
    where.expiryDate = { not: null, lte: new Date(Date.now() + options.expiringWithinDays * 86_400_000) };
  }

  const [total, codes] = await Promise.all([
    prisma.giftCode.count({ where }),
    prisma.giftCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        giftProductId: true,
        maskedCode: true,
        batchLabel: true,
        internalNote: true,
        expiryDate: true,
        status: true,
        assignedOrderId: true,
        assignedAt: true,
        soldAt: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        giftProduct: { select: { id: true, name: true, brandName: true, denomination: true } },
        assignedOrder: { select: { id: true, orderNumber: true } },
      },
    }),
  ]);

  return { codes, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

/** Cancel / invalidate a code that can no longer be used (PRD §46, §105). */
export async function cancelCode(giftCodeId: string, reason: string, adminId?: string) {
  return withInventoryLock(async (tx) => {
    const code = await tx.giftCode.findUnique({ where: { id: giftCodeId } });
    if (!code) throw Errors.notFound("Gift code not found");
    if (code.status === "SOLD") {
      throw Errors.conflict("A delivered code cannot be cancelled — use Replace Code instead.");
    }
    const updated = await tx.giftCode.update({
      where: { id: giftCodeId },
      data: {
        status: "CANCELLED",
        internalNote: code.internalNote ? `${code.internalNote} | Cancelled: ${reason}` : `Cancelled: ${reason}`,
      },
    });

    if (adminId) {
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          action: "GIFT_CODE_CANCELLED",
          targetType: "GiftCode",
          targetId: giftCodeId,
          description: `Gift code cancelled: ${reason}`,
          newValue: { status: "CANCELLED", reason },
        },
      });
    }

    return updated;
  });
}

export { EMPTY_STOCK };

