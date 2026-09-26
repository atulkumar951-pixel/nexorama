import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";
import { generateReservationToken } from "../utils/giftCode";
import { sweepExpiredInventory, withInventoryLock, type Tx } from "./giftInventory.service";
import { getGiftSettings } from "./settings.service";

/**
 * Gift-code cart with *temporary* inventory reservation (PRD §22, §23, §24, §25).
 *
 * Adding to the cart never permanently locks a specific code — it holds a
 * quantity-based reservation that expires. The actual code is only claimed
 * inside the payment transaction (see giftCheckout.service).
 */

export interface GiftCartLine {
  id: string;
  giftProductId: string;
  quantity: number;
  reservationExpiresAt: string | null;
  reservationStatus: "ACTIVE" | "EXPIRED" | "NONE";
  product: {
    id: string;
    name: string;
    slug: string;
    brandName: string;
    image: string | null;
    denomination: string;
    sellingPrice: string;
    currency: string;
    category: { id: string; name: string; slug: string } | null;
  };
  unitPrice: number;
  lineTotal: number;
  stock: { sellable: number; outOfStock: boolean; lowStock: boolean };
}

export interface GiftCartSummary {
  items: GiftCartLine[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  currency: string;
  reservationExpiresAt: string | null;
  reservationMinutes: number;
  serverTime: string;
}

/** Available codes minus reservations held by *other* customers. */
async function sellableForUser(tx: Tx, giftProductId: string, userId: string): Promise<number> {
  const now = new Date();
  const [availableRows, otherReservations] = await Promise.all([
    tx.giftCode.groupBy({
      by: ["status"],
      where: { giftProductId, status: "AVAILABLE", OR: [{ expiryDate: null }, { expiryDate: { gt: now } }] },
      _count: { _all: true },
    }),
    tx.giftCodeReservation.aggregate({
      where: { giftProductId, status: "ACTIVE", expiresAt: { gt: now }, userId: { not: userId } },
      _sum: { quantity: true },
    }),
  ]);

  const available = availableRows.reduce((sum, row) => sum + row._count._all, 0);
  return Math.max(0, available - (otherReservations._sum.quantity ?? 0));
}

async function assertPurchasable(productId: string) {
  const product = await prisma.giftProduct.findUnique({
    where: { id: productId },
    select: { id: true, status: true, name: true, purchaseLimit: true },
  });
  if (!product || product.status !== "PUBLISHED") throw Errors.notFound("Gift code product not found");
  return product;
}

/** Create or extend the ACTIVE reservation row for one cart line. */
async function upsertReservation(
  tx: Tx,
  userId: string,
  giftProductId: string,
  quantity: number,
  reservationMinutes: number,
): Promise<Date> {
  const expiresAt = new Date(Date.now() + reservationMinutes * 60_000);

  const existing = await tx.giftCodeReservation.findFirst({
    where: { userId, giftProductId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    await tx.giftCodeReservation.update({ where: { id: existing.id }, data: { quantity, expiresAt } });
    return expiresAt;
  }

  await tx.giftCodeReservation.create({
    data: {
      userId,
      giftProductId,
      quantity,
      reservationToken: generateReservationToken(),
      status: "ACTIVE",
      expiresAt,
    },
  });
  return expiresAt;
}

// ------------------------------------------------------------------
// Cart mutations
// ------------------------------------------------------------------

/**
 * Add (or top up) a gift-code line. The reservation is quantity based and always
 * expires, so one customer can never hold all inventory indefinitely.
 */
export async function addToGiftCart(userId: string, giftProductId: string, quantity: number): Promise<GiftCartLine> {
  if (!Number.isInteger(quantity) || quantity < 1) throw Errors.badRequest("Quantity must be a positive whole number");

  const settings = await getGiftSettings();
  if (!settings.giftCodePurchase) throw Errors.forbidden("Gift code purchases are temporarily paused.");

  const product = await assertPurchasable(giftProductId);
  const cap = Math.min(product.purchaseLimit ?? Number.MAX_SAFE_INTEGER, settings.maxQuantityPerOrder);

  await withInventoryLock(async (tx) => {
    const existing = await tx.giftCartItem.findUnique({
      where: { userId_giftProductId: { userId, giftProductId } },
    });
    const desired = (existing?.quantity ?? 0) + quantity;

    if (desired > cap) throw Errors.badRequest(`Maximum ${cap} code(s) per order for this product.`);

    const sellable = await sellableForUser(tx, giftProductId, userId);
    if (sellable < desired) {
      throw Errors.conflict(
        sellable === 0
          ? "This gift code is out of stock right now."
          : `Only ${sellable} code(s) available. Please reduce the quantity.`,
      );
    }

    await tx.giftCartItem.upsert({
      where: { userId_giftProductId: { userId, giftProductId } },
      update: { quantity: desired },
      create: { userId, giftProductId, quantity: desired },
    });

    await upsertReservation(tx, userId, giftProductId, desired, settings.reservationMinutes);
  });

  const cart = await getGiftCart(userId);
  const line = cart.items.find((i) => i.giftProductId === giftProductId);
  if (!line) throw Errors.internal("Unable to update your cart. Please retry.");
  return line;
}

/** Replace the quantity of a cart line (0 removes it). */
export async function setGiftCartQuantity(
  userId: string,
  giftProductId: string,
  quantity: number,
): Promise<GiftCartSummary> {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw Errors.badRequest("Quantity must be zero or a positive whole number");
  }
  if (quantity === 0) return removeFromGiftCart(userId, giftProductId);

  const settings = await getGiftSettings();
  const product = await assertPurchasable(giftProductId);
  const cap = Math.min(product.purchaseLimit ?? Number.MAX_SAFE_INTEGER, settings.maxQuantityPerOrder);
  if (quantity > cap) throw Errors.badRequest(`Maximum ${cap} code(s) per order for this product.`);

  await withInventoryLock(async (tx) => {
    const existing = await tx.giftCartItem.findUnique({
      where: { userId_giftProductId: { userId, giftProductId } },
    });
    if (!existing) throw Errors.notFound("This item is not in your cart");

    const sellable = await sellableForUser(tx, giftProductId, userId);
    if (sellable < quantity) {
      throw Errors.conflict(
        sellable === 0
          ? "This gift code is out of stock right now."
          : `Only ${sellable} code(s) available. Please reduce the quantity.`,
      );
    }

    await tx.giftCartItem.update({
      where: { userId_giftProductId: { userId, giftProductId } },
      data: { quantity },
    });
    await upsertReservation(tx, userId, giftProductId, quantity, settings.reservationMinutes);
  });

  return getGiftCart(userId);
}

/** Release the hold for a single line. */
export async function removeFromGiftCart(userId: string, giftProductId: string): Promise<GiftCartSummary> {
  await withInventoryLock(async (tx) => {
    await tx.giftCartItem.deleteMany({ where: { userId, giftProductId } });
    await tx.giftCodeReservation.updateMany({
      where: { userId, giftProductId, status: "ACTIVE" },
      data: { status: "CANCELLED", releasedAt: new Date() },
    });
  });
  return getGiftCart(userId);
}

export async function clearGiftCart(userId: string): Promise<void> {
  await withInventoryLock(async (tx) => {
    await tx.giftCartItem.deleteMany({ where: { userId } });
    await tx.giftCodeReservation.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "CANCELLED", releasedAt: new Date() },
    });
  });
}


// ------------------------------------------------------------------
// Read models
// ------------------------------------------------------------------

/**
 * Cart read model. Reservation expiry comes from the database, never from a
 * frontend countdown, so a tampered client cannot extend a hold (PRD §59).
 */
export async function getGiftCart(userId: string): Promise<GiftCartSummary> {
  await sweepExpiredInventory();

  const settings = await getGiftSettings();
  const now = new Date();

  const [items, reservations] = await Promise.all([
    prisma.giftCartItem.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        giftProduct: {
          select: {
            id: true,
            name: true,
            slug: true,
            brandName: true,
            image: true,
            denomination: true,
            sellingPrice: true,
            currency: true,
            status: true,
            lowStockThreshold: true,
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
    prisma.giftCodeReservation.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const { getStockMap } = await import("./giftInventory.service");
  const thresholds = new Map<string, number>();
  for (const item of items) {
    if (item.giftProduct.lowStockThreshold !== null) {
      thresholds.set(item.giftProductId, item.giftProduct.lowStockThreshold);
    }
  }
  const stockMap = await getStockMap(
    items.map((i) => i.giftProductId),
    thresholds,
  );

  const activeByProduct = new Map<string, (typeof reservations)[number]>();
  for (const r of reservations) {
    if (r.expiresAt > now && !activeByProduct.has(r.giftProductId)) activeByProduct.set(r.giftProductId, r);
  }

  const lines: GiftCartLine[] = items.map((item) => {
    const reservation = activeByProduct.get(item.giftProductId);
    const unitPrice = Number(item.giftProduct.sellingPrice);
    const stock = stockMap.get(item.giftProductId);

    return {
      id: item.id,
      giftProductId: item.giftProductId,
      quantity: item.quantity,
      reservationExpiresAt: reservation ? reservation.expiresAt.toISOString() : null,
      reservationStatus: reservation ? "ACTIVE" : "EXPIRED",
      product: {
        id: item.giftProduct.id,
        name: item.giftProduct.name,
        slug: item.giftProduct.slug,
        brandName: item.giftProduct.brandName,
        image: item.giftProduct.image,
        denomination: item.giftProduct.denomination.toString(),
        sellingPrice: item.giftProduct.sellingPrice.toString(),
        currency: item.giftProduct.currency,
        category: item.giftProduct.category,
      },
      unitPrice,
      lineTotal: Number((unitPrice * item.quantity).toFixed(2)),
      stock: {
        sellable: stock?.sellable ?? 0,
        outOfStock: stock?.outOfStock ?? true,
        lowStock: stock?.lowStock ?? false,
      },
    };
  });

  const expiries = lines
    .map((l) => l.reservationExpiresAt)
    .filter((v): v is string => Boolean(v))
    .map((v) => new Date(v).getTime());

  return {
    items: lines,
    itemCount: lines.length,
    totalQuantity: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal: Number(lines.reduce((sum, l) => sum + l.lineTotal, 0).toFixed(2)),
    currency: lines[0]?.product.currency ?? "INR",
    reservationExpiresAt: expiries.length ? new Date(Math.min(...expiries)).toISOString() : null,
    reservationMinutes: settings.reservationMinutes,
    serverTime: now.toISOString(),
  };
}


export interface ValidatedCartLine {
  giftProductId: string;
  quantity: number;
  unitPrice: number;
  title: string;
  denomination: string;
  reservationId: string;
}

/**
 * Checkout guard (PRD §24, §25, §30).
 * Fails when the cart is empty, a reservation has lapsed, or a line no longer
 * has enough free inventory. Sweeps stale reservations first.
 */
export async function validateCartForCheckout(userId: string): Promise<{
  lines: ValidatedCartLine[];
  subtotal: number;
  cartSummary: GiftCartSummary;
  reservationIds: string[];
}> {
  await sweepExpiredInventory();
  const summary = await getGiftCart(userId);
  if (summary.items.length === 0) throw Errors.badRequest("Your gift code cart is empty");

  const settings = await getGiftSettings();
  if (!settings.giftCodePurchase) throw Errors.forbidden("Gift code purchases are temporarily paused.");

  const now = new Date();
  const reservations = await prisma.giftCodeReservation.findMany({
    where: { userId, status: "ACTIVE", expiresAt: { gt: now } },
  });

  const lines: ValidatedCartLine[] = [];
  const reservationIds: string[] = [];

  for (const item of summary.items) {
    const reservation = reservations.find((r) => r.giftProductId === item.giftProductId);
    if (!reservation) {
      throw Errors.conflict(
        `Your reservation for ${item.product.name} has expired. Inventory has been released — please refresh your cart.`,
      );
    }
    if (reservation.quantity < item.quantity) {
      throw Errors.conflict(`Available quantity for ${item.product.name} changed. Please refresh your cart.`);
    }
    if (item.stock.sellable < item.quantity) {
      throw Errors.conflict(
        item.stock.sellable === 0
          ? `${item.product.name} is out of stock right now.`
          : `Only ${item.stock.sellable} code(s) of ${item.product.name} available. Please reduce the quantity.`,
      );
    }

    lines.push({
      giftProductId: item.giftProductId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      title: item.product.name,
      denomination: item.product.denomination,
      reservationId: reservation.id,
    });
    reservationIds.push(reservation.id);
  }

  const subtotal = Number(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0).toFixed(2));
  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);

  // Purchase limits are re-checked server-side (PRD §26, §99).
  if (totalQuantity > settings.maxQuantityPerOrder) {
    throw Errors.badRequest(`Maximum ${settings.maxQuantityPerOrder} code(s) per order.`);
  }
  if (settings.maxTransactionAmount > 0 && subtotal > settings.maxTransactionAmount) {
    throw Errors.badRequest(`Maximum transaction amount is ₹${settings.maxTransactionAmount}.`);
  }

  return { lines, subtotal, cartSummary: summary, reservationIds };
}

/**
 * Per-user daily purchase cap (PRD §26). Counts codes bought in the last 24h
 * so a high-value card cannot be farmed by one account.
 */
export async function assertDailyPurchaseLimit(userId: string, additionalQuantity: number): Promise<void> {
  const settings = await getGiftSettings();
  if (settings.maxQuantityPerUserPerDay <= 0) return;

  const since = new Date(Date.now() - 86_400_000);
  const bought = await prisma.giftCodeReservation.aggregate({
    where: { userId, status: "CONVERTED", updatedAt: { gte: since } },
    _sum: { quantity: true },
  });

  const already = bought._sum.quantity ?? 0;
  if (already + additionalQuantity > settings.maxQuantityPerUserPerDay) {
    throw Errors.forbidden(
      `Daily limit reached. You can purchase up to ${settings.maxQuantityPerUserPerDay} gift code(s) per day.`,
    );
  }
}

