import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";
import { getGiftSettings } from "./settings.service";
import { sweepExpiredInventory } from "./giftInventory.service";
import { maskEmail } from "./giftCheckout.service";

/**
 * Customer-facing gift-code order read models (PRD §49, §50, §86).
 *
 * NOTHING in this file may return `encryptedCode`, a raw code, or a decrypted
 * code. The customer only ever sees order + delivery state (PRD §15, §87, §88).
 */

export interface GiftOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  deliveryStatus: string;
  deliveryTargetMinutes: number;
  expectedBy: string | null;
  overdue: boolean;
  items: Array<{
    id: string;
    title: string;
    brandName: string;
    denomination: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

/** Roll per-code delivery states into a single customer-visible state. */
export function rollUpDeliveryStatus(statuses: string[]): string {
  if (statuses.length === 0) return "PROCESSING";
  if (statuses.every((s) => s === "SENT")) return "SENT";
  if (statuses.some((s) => s === "SENT")) return "PARTIALLY_SENT";
  return "PROCESSING";
}

/** Human-readable delivery copy — never promises an instant reveal (PRD §17, §85). */
export function deliveryMessage(status: string, targetMinutes: number): string {
  switch (status) {
    case "SENT":
      return "Code sent to your registered email";
    case "PARTIALLY_SENT":
      return "Some codes have been sent to your registered email";
    default:
      return `Your gift code will be sent to your registered email within approximately ${targetMinutes} minutes`;
  }
}

function expectedBy(paidAt: Date | null, targetMinutes: number): string | null {
  if (!paidAt) return null;
  return new Date(paidAt.getTime() + targetMinutes * 60_000).toISOString();
}

export async function getUserGiftOrders(userId: string, page = 1, limit = 10) {
  const settings = await getGiftSettings();
  const skip = (Math.max(1, page) - 1) * limit;

  const where = { userId, orderType: "GIFT_CODE" as const };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: { include: { giftProduct: { select: { brandName: true, image: true, slug: true } } } },
        payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, amount: true } },
        giftDeliveries: { select: { status: true } },
      },
    }),
  ]);

  const summaries: GiftOrderSummary[] = orders.map((order) => {
    const deliveryStatus = rollUpDeliveryStatus(order.giftDeliveries.map((d) => d.status));
    const expected = expectedBy(order.paidAt, settings.deliveryTargetMinutes);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.payments[0]?.status ?? "CREATED",
      amount: Number(order.total),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
      deliveryStatus,
      deliveryTargetMinutes: settings.deliveryTargetMinutes,
      expectedBy: expected,
      overdue:
        deliveryStatus !== "SENT" &&
        expected !== null &&
        new Date(expected).getTime() < Date.now() &&
        order.status !== "CANCELLED",
      items: order.items.map((item) => ({
        id: item.id,
        title: item.title,
        brandName: item.giftProduct?.brandName ?? "",
        denomination: item.denomination ? item.denomination.toString() : "0",
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    };
  });
  return {
    orders: summaries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}



/** Single order detail — used by the order confirmation screen (PRD §86). */
export async function getUserGiftOrder(userId: string, orderNumber: string) {
  const settings = await getGiftSettings();

  const order = await prisma.order.findFirst({
    where: { userId, orderNumber, orderType: "GIFT_CODE" },
    include: {
      items: { include: { giftProduct: { select: { brandName: true, image: true, slug: true } } } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      giftDeliveries: {
        select: { id: true, status: true, sentAt: true, assignedAt: true, recipientEmail: true, orderItemId: true },
      },
    },
  });

  if (!order) throw Errors.notFound("Gift code order not found");

  const deliveryStatus = rollUpDeliveryStatus(order.giftDeliveries.map((d) => d.status));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    amount: Number(order.total),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    paymentStatus: order.payments[0]?.status ?? "CREATED",
    refundPolicy: "NON_REFUNDABLE" as const,
    deliveryStatus,
    deliveryMessage: deliveryMessage(deliveryStatus, settings.deliveryTargetMinutes),
    expectedDeliveryMinutes: settings.deliveryTargetMinutes,
    expectedBy: expectedBy(order.paidAt, settings.deliveryTargetMinutes),
    recipientEmailMasked: maskEmail(order.emailSnapshot ?? ""),
    items: order.items.map((item) => ({
      id: item.id,
      title: item.title,
      brandName: item.giftProduct?.brandName ?? "",
      image: item.giftProduct?.image ?? null,
      denomination: item.denomination ? item.denomination.toString() : "0",
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      deliveryStatus: rollUpDeliveryStatus(
        order.giftDeliveries.filter((d) => d.orderItemId === item.id).map((d) => d.status),
      ),
    })),
    // Deliberately no code fields — ever (PRD §15, §87).
  };
}

/**
 * "My Gift Codes" listing (PRD §50).
 * Shows purchase + delivery information only — there is no Reveal/Copy action
 * because the code is emailed manually by the Nexora team.
 */
export async function getMyGiftCodes(userId: string, page = 1, limit = 10) {
  await sweepExpiredInventory();
  const settings = await getGiftSettings();
  const skip = (Math.max(1, page) - 1) * limit;

  const where = { order: { userId, orderType: "GIFT_CODE" as const } };

  const [total, deliveries] = await Promise.all([
    prisma.giftCodeDelivery.count({ where }),
    prisma.giftCodeDelivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        sentAt: true,
        assignedAt: true,
        createdAt: true,
        recipientEmail: true,
        order: {
          select: { orderNumber: true, total: true, currency: true, status: true, paidAt: true, createdAt: true },
        },
        orderItem: { select: { title: true, denomination: true, quantity: true, unitPrice: true } },
      },
    }),
  ]);

  return {
    giftCodes: deliveries.map((d) => {
      const sent = d.status === "SENT";
      return {
        id: d.id,
        orderNumber: d.order.orderNumber,
        product: d.orderItem?.title ?? "Gift code",
        denomination: d.orderItem?.denomination ? d.orderItem.denomination.toString() : "0",
        quantity: d.orderItem?.quantity ?? 1,
        amount: Number(d.order.total),
        currency: d.order.currency,
        purchasedAt: d.order.paidAt ? d.order.paidAt.toISOString() : d.order.createdAt.toISOString(),
        paymentStatus: d.order.status === "PAID" ? "SUCCESS" : d.order.status,
        deliveryStatus: sent ? "SENT" : "PROCESSING",
        deliveryMessage: deliveryMessage(sent ? "SENT" : "PROCESSING", settings.deliveryTargetMinutes),
        sentAt: d.sentAt ? d.sentAt.toISOString() : null,
        recipientEmailMasked: maskEmail(d.recipientEmail),
      };
    }),
    pagination: { page: Math.max(1, page), limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Code-free aggregate numbers for the customer dashboard. */
export async function getUserGiftStats(userId: string) {
  const [orders, codesOwned, pendingDelivery] = await Promise.all([
    prisma.order.count({ where: { userId, orderType: "GIFT_CODE" } }),
    prisma.giftCodeDelivery.count({ where: { order: { userId, orderType: "GIFT_CODE" } } }),
    prisma.giftCodeDelivery.count({
      where: {
        order: { userId, orderType: "GIFT_CODE" },
        status: { in: ["PENDING", "ASSIGNED", "PROCESSING", "MANUAL_REVIEW"] },
      },
    }),
  ]);

  return { orders, codesOwned, pendingDelivery };
}
