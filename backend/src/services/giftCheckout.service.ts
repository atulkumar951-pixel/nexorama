import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";
import { logger } from "../utils/logger";
import { generateGiftOrderNumber } from "../utils/giftCode";
import { notifyUser } from "./notification.service";
import { getMarketplaceMode, getGiftSettings } from "./settings.service";
import { claimCodesForOrder, markCodesSold, sweepExpiredInventory, withInventoryLock, type Tx } from "./giftInventory.service";
import { validateCartForCheckout, assertDailyPurchaseLimit, getGiftCart } from "./giftCart.service";
import {
  createGatewayOrder,
  fetchGatewayPayment,
  publicKeyId,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "./razorpay.service";
import { alertAdmins } from "./adminNotification.service";

/**
 * Gift-code checkout & payment finalisation (PRD §29–§35, §65–§68).
 *
 * Ordering rules that MUST hold:
 *   • The browser can never tell us the price, the quantity or that payment succeeded.
 *   • A code is only claimed after the gateway payment is verified server-side.
 *   • Every webhook event is processed exactly once (idempotency ledger).
 *   • If claiming fails after payment, the order is never lost: it lands in
 *     MANUAL_REVIEW with an admin alert (PRD §66).
 */

export interface GiftCheckoutSession {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayKeyId: string | null;
  email: string;
  reservationExpiresAt: string | null;
}

export interface GiftPaymentConfirmation {
  orderId: string;
  orderNumber: string;
  amountPaid: number;
  currency: string;
  paymentStatus: "SUCCESS" | "PENDING" | "FAILED";
  deliveryStatus: string;
  recipientEmail: string;
  expectedDeliveryMinutes: number;
  message: string;
  alreadyProcessed: boolean;
}

/** Start of the current UTC day — used for the daily order-number sequence. */
function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Allocate a unique `NX-GC-YYYYMMDD-NNNNN` order number (PRD §33). */
async function allocateGiftOrder(tx: Prisma.TransactionClient, data: {
  userId: string;
  emailSnapshot: string;
  subtotal: number;
  total: number;
  currency: string;
  items: Array<{ giftProductId: string; title: string; denomination: string; unitPrice: number; quantity: number }>;
}) {
  const todayCount = await tx.order.count({
    where: { orderType: "GIFT_CODE", createdAt: { gte: startOfUtcDay() } },
  });

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const sequence = todayCount + 1 + attempt;
    const orderNumber = generateGiftOrderNumber(sequence);
    const exists = await tx.order.findUnique({ where: { orderNumber }, select: { id: true } });
    if (exists) continue;

    try {
      return await tx.order.create({
        data: {
          orderNumber,
          userId: data.userId,
          orderType: "GIFT_CODE",
          emailSnapshot: data.emailSnapshot,
          subtotal: data.subtotal,
          discount: 0,
          couponDiscount: 0,
          tax: 0,
          total: data.total,
          currency: data.currency,
          status: "PENDING",
          items: {
            create: data.items.map((item) => ({
              giftProductId: item.giftProductId,
              itemType: "GIFT_CODE" as const,
              title: item.title,
              denomination: item.denomination,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: Number((item.unitPrice * item.quantity).toFixed(2)),
            })),
          },
        },
        include: { items: true },
      });
    } catch (err) {
      if (isUniqueViolation(err)) continue;
      throw err;
    }
  }

  throw Errors.internal("Unable to allocate an order number. Please retry.");
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

export interface GiftCheckoutSession {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayKeyId: string | null;
  email: string;
  reservationExpiresAt: string | null;
}

export interface GiftPaymentConfirmation {
  orderId: string;
  orderNumber: string;
  amountPaid: number;
  currency: string;
  paymentStatus: "SUCCESS" | "PENDING" | "FAILED";
  deliveryStatus: string;
  recipientEmail: string;
  expectedDeliveryMinutes: number;
  message: string;
  alreadyProcessed: boolean;
}

/**
 * Create the order + gateway order for the current gift-code cart.
 * Price, quantity and stock are all recomputed here from the database (PRD §68, §99).
 */
export async function createGiftCheckout(input: {
  userId: string;
  email: string;
}): Promise<GiftCheckoutSession> {
  const mode = await getMarketplaceMode();
  if (mode !== "GIFT_CODES") {
    throw Errors.forbidden("Gift code purchases are not available right now.");
  }

  const settings = await getGiftSettings();
  if (!settings.giftCodePurchase) throw Errors.forbidden("Gift code purchases are temporarily paused.");

  const { lines, subtotal, cartSummary, reservationIds } = await validateCartForCheckout(input.userId);
  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
  await assertDailyPurchaseLimit(input.userId, totalQuantity);

  const currency = cartSummary.currency || "INR";

  const order = await withInventoryLock((tx) =>
    allocateGiftOrder(tx, {
      userId: input.userId,
      emailSnapshot: input.email,
      subtotal,
      total: subtotal,
      currency,
      items: lines.map((l) => ({
        giftProductId: l.giftProductId,
        title: l.title,
        denomination: l.denomination,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      })),
    }),
  );

  // Extend the reservations to cover the payment window for every line.
  await withInventoryLock(async (tx) => {
    const expiresAt = new Date(Date.now() + settings.reservationMinutes * 60_000);
    await tx.giftCodeReservation.updateMany({
      where: { id: { in: reservationIds }, userId: input.userId, status: "ACTIVE" },
      data: { expiresAt },
    });
  });

  const gatewayOrder = await createGatewayOrder({
    amountInRupees: subtotal,
    currency,
    receipt: order.orderNumber,
    notes: { orderId: order.id, orderType: "GIFT_CODE", userId: input.userId },
  });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      userId: input.userId,
      razorpayOrderId: gatewayOrder.id,
      amount: subtotal,
      currency,
      status: "CREATED",
    },
  });

  await prisma.auditLog
    .create({
      data: {
        action: "GIFT_ORDER_CREATED",
        targetType: "Order",
        targetId: order.id,
        description: `Gift code order ${order.orderNumber} created for ₹${subtotal}`,
        newValue: { orderNumber: order.orderNumber, items: lines.length, quantity: totalQuantity },
      },
    })
    .catch(() => undefined);

  const refreshed = await getGiftCart(input.userId).catch(() => null);

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: subtotal,
    currency,
    razorpayOrderId: gatewayOrder.id,
    razorpayKeyId: publicKeyId(),
    email: input.email,
    reservationExpiresAt: refreshed?.reservationExpiresAt ?? null,
  };
}


// ------------------------------------------------------------------
// Payment finalisation (atomic — PRD §20, §30, §65)
// ------------------------------------------------------------------

export interface FinaliseResult {
  orderNumber: string;
  assignmentFailed: boolean;
  alreadyProcessed: boolean;
  assignedCount: number;
}

/**
 * Turn a verified payment into assigned inventory + delivery tasks.
 *
 * Runs inside one transaction holding the inventory lock. If the code claim
 * fails (concurrency or a genuinely empty shelf) the transaction rolls back and
 * the caller converts the order into MANUAL_REVIEW — money is never taken
 * without a recoverable operational record (PRD §66).
 */
async function assignCodesForPaidOrder(input: {
  orderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  method?: string;
  source: "CHECKOUT" | "WEBHOOK";
}): Promise<FinaliseResult> {
  return withInventoryLock(async (tx: Tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { items: { where: { itemType: "GIFT_CODE" } } },
    });
    if (!order) throw Errors.notFound("Order not found");
    if (order.orderType !== "GIFT_CODE") throw Errors.badRequest("This is not a gift code order");

    if (order.status === "PAID") {
      return { orderNumber: order.orderNumber, assignmentFailed: false, alreadyProcessed: true, assignedCount: 0 };
    }

    const recipientEmail = order.emailSnapshot ?? "";
    let assignedCount = 0;

    for (const item of order.items) {
      if (!item.giftProductId) continue;

      // Atomic SKIP LOCKED claim — throws when stock is short (rolls everything back).
      const codes = await claimCodesForOrder(tx, {
        giftProductId: item.giftProductId,
        quantity: item.quantity,
        orderId: order.id,
      });

      await tx.giftCodeDelivery.createMany({
        data: codes.map((code) => ({
          orderId: order.id,
          orderItemId: item.id,
          giftCodeId: code.id,
          recipientEmail,
          status: "PENDING" as const,
          assignedAt: new Date(),
        })),
      });

      assignedCount += codes.length;

      // Release the temporary hold: it has been converted into a real sale.
      await tx.giftCodeReservation.updateMany({
        where: { userId: order.userId, giftProductId: item.giftProductId, status: "ACTIVE" },
        data: { status: "CONVERTED", convertedOrderId: order.id },
      });

      await tx.giftCartItem.deleteMany({ where: { userId: order.userId, giftProductId: item.giftProductId } });
    }

    const now = new Date();
    await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: now } });

    await tx.payment.updateMany({
      where: { orderId: order.id, status: { in: ["CREATED", "PENDING", "AUTHORIZED"] } },
      data: {
        status: "CAPTURED",
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature ?? null,
        method: input.method ?? null,
      },
    });

    await tx.auditLog
      .create({
        data: {
          action: "GIFT_ORDER_PAID",
          targetType: "Order",
          targetId: order.id,
          description: `Gift order ${order.orderNumber} paid (source=${input.source}); ${assignedCount} code(s) assigned`,
          newValue: { orderNumber: order.orderNumber, assignedCount, source: input.source },
        },
      })
      .catch(() => undefined);

    return {
      orderNumber: order.orderNumber,
      assignmentFailed: false,
      alreadyProcessed: false,
      assignedCount,
    };
  });
}

/**
 * Convert a paid-but-unassignable order into a recoverable manual state (PRD §66).
 * Marks PAYMENT = SUCCESS and DELIVERY = MANUAL_REVIEW, then alerts the team.
 */
async function flagOrderForManualReview(orderId: string, reason: string, razorpayPaymentId: string) {
  const now = new Date();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { id: true, name: true, email: true } }, items: { where: { itemType: "GIFT_CODE" } } },
  });
  if (!order) return;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "PROCESSING", paidAt: now } });
    await tx.payment.updateMany({
      where: { orderId, razorpayPaymentId: null },
      data: { status: "CAPTURED", razorpayPaymentId, failureReason: null },
    });
    await tx.giftCodeDelivery.createMany({
      data: order.items.map((item) => ({
        orderId,
        orderItemId: item.id,
        giftCodeId: null,
        recipientEmail: order.emailSnapshot ?? order.user.email,
        status: "MANUAL_REVIEW" as const,
        failureReason: reason,
      })),
    });
    await tx.auditLog
      .create({
        data: {
          action: "GIFT_ORDER_PAID",
          targetType: "Order",
          targetId: orderId,
          description: `Payment captured but code assignment failed for ${order.orderNumber}: ${reason}`,
          newValue: { manualReview: true, reason },
        },
      })
      .catch(() => undefined);
  });

  await alertAdmins({
    title: `Manual review required — ${order.orderNumber}`,
    message: `Payment succeeded but no inventory could be assigned automatically. Reason: ${reason}. Resolve from Gift Codes → Pending Delivery.`,
    severity: "CRITICAL",
    link: `/admin/gift-codes/delivery?order=${order.orderNumber}`,
    targetId: orderId,
  });
}


// ------------------------------------------------------------------
// Client-side verification (never trusted on its own — PRD §31, §32, §68)
// ------------------------------------------------------------------

/**
 * Verify a gift-code payment after the Razorpay checkout callback.
 * Validates signature + gateway truth (amount, currency, order, ownership)
 * before any code is assigned.
 */
export async function verifyGiftPayment(input: {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<GiftPaymentConfirmation> {
  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId: input.razorpayOrderId, userId: input.userId },
    include: { order: { include: { items: { where: { itemType: "GIFT_CODE" } } } } },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) throw Errors.notFound("Payment record not found for this order");
  if (payment.order.orderType !== "GIFT_CODE") throw Errors.badRequest("This is not a gift code order");
  if (payment.order.userId !== input.userId) throw Errors.forbidden("This order does not belong to you");

  const settings = await getGiftSettings();

  // Idempotent: a retried callback for an already-finalised order just returns state.
  if (payment.order.status === "PAID") {
    return buildConfirmation(payment.order.id, true);
  }

  if (!verifyCheckoutSignature({
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    signature: input.signature,
  })) {
    await prisma.payment.updateMany({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: "Signature verification failed" },
    });
    throw Errors.badRequest("Payment verification failed. If money was deducted, contact support with your order number.");
  }

  // Cross-check with Razorpay: amount, currency and order ownership (PRD §31, §68).
  const gatewayPayment = await fetchGatewayPayment(input.razorpayPaymentId);
  if (!gatewayPayment) {
    throw Errors.internal("Unable to confirm the payment with the gateway right now. Please retry in a moment.");
  }
  if (gatewayPayment.order_id !== input.razorpayOrderId) {
    throw Errors.badRequest("Payment does not match this order.");
  }
  const expectedPaise = Math.round(Number(payment.order.total) * 100);
  if (gatewayPayment.amount !== expectedPaise || gatewayPayment.currency !== payment.order.currency) {
    logger.warn(
      `Gift payment amount mismatch: order=${payment.order.orderNumber} expected=${expectedPaise} received=${gatewayPayment.amount}`,
    );
    throw Errors.badRequest("Payment amount does not match the order total. Please contact support.");
  }
  if (!["captured", "authorized"].includes(gatewayPayment.status)) {
    await prisma.payment.updateMany({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: `Gateway status: ${gatewayPayment.status}` },
    });
    throw Errors.badRequest("The payment was not successful. No codes were assigned.");
  }

  try {
    const result = await assignCodesForPaidOrder({
      orderId: payment.order.id,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.signature,
      method: gatewayPayment.method,
      source: "CHECKOUT",
    });
    if (!result.alreadyProcessed) {
      await notifyGiftOrderPaid(payment.order.id);
    }
    return await buildConfirmation(payment.order.id, result.alreadyProcessed, settings.deliveryTargetMinutes);
  } catch (err) {
    logger.error(
      `Gift code assignment failed after verified payment (order=${payment.order.orderNumber})`,
      err instanceof Error ? err.message : err,
    );
    await flagOrderForManualReview(
      payment.order.id,
      err instanceof Error ? err.message : "Assignment failed",
      input.razorpayPaymentId,
    );
    return await buildConfirmation(payment.order.id, false, settings.deliveryTargetMinutes);
  }
}

/** Build the customer-facing confirmation payload — deliberately code-free (PRD §87). */
async function buildConfirmation(
  orderId: string,
  alreadyProcessed: boolean,
  deliveryTargetMinutes = 5,
): Promise<GiftPaymentConfirmation> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      giftDeliveries: { select: { status: true } },
    },
  });
  if (!order) throw Errors.notFound("Order not found");

  const paid = order.status === "PAID";
  const deliveryStatus = deriveDeliveryStatus(order.giftDeliveries.map((d) => d.status));

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amountPaid: Number(order.total),
    currency: order.currency,
    paymentStatus: paid ? "SUCCESS" : order.status === "PENDING" ? "PENDING" : "FAILED",
    deliveryStatus,
    recipientEmail: maskEmail(order.emailSnapshot ?? order.user.email),
    expectedDeliveryMinutes: deliveryTargetMinutes,
    message: paid
      ? "Your gift code will be sent to your registered email within approximately 5 minutes."
      : "We could not assign your code automatically. Our team has been notified and will process your order manually.",
    alreadyProcessed,
  };
}

function deriveDeliveryStatus(statuses: string[]): string {
  if (statuses.length === 0) return "PROCESSING";
  if (statuses.includes("MANUAL_REVIEW")) return "MANUAL_REVIEW";
  if (statuses.every((s) => s === "SENT")) return "SENT";
  if (statuses.some((s) => s === "SENT")) return "PARTIALLY_SENT";
  if (statuses.some((s) => s === "PENDING" || s === "ASSIGNED")) return "PENDING";
  return statuses[0];
}

/** Mask an email for display: a***@gmail.com (PRD §50). */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "•••";
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(2, Math.min(4, local.length - 1)))}@${domain}`;
}


// ------------------------------------------------------------------
// Notifications (PRD §51, §52) — never contain the actual code
// ------------------------------------------------------------------

function envAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/** Customer confirmation + operations alert. Deliberately code-free. */
export async function notifyGiftOrderPaid(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { select: { title: true, quantity: true } },
    },
  });
  if (!order) return;

  const recipient = order.emailSnapshot || order.user.email;
  const itemLines = order.items.map((i) => `${i.title} × ${i.quantity}`).join(", ");
  const settings = await getGiftSettings();

  await notifyUser({
    userId: order.userId,
    title: `Gift Code Order Confirmed — ${order.orderNumber}`,
    message:
      `Your payment has been successfully received.\n\n` +
      `Order Number: ${order.orderNumber}\n` +
      `Items: ${itemLines}\n` +
      `Amount: ₹${Number(order.total)}\n\n` +
      `Your gift code will be sent manually to your registered email (${maskEmail(recipient)}) within approximately ` +
      `${settings.deliveryTargetMinutes} minutes. Please also check your spam/junk folder.\n\n` +
      `Gift code purchases are non-refundable.`,
    type: "PURCHASE",
    link: "/gift-codes/orders",
    email: {
      to: recipient,
      subject: `Nexora Gift Code Order Confirmed — ${order.orderNumber}`,
      cta: { label: "View Order", url: `${envAppUrl()}/gift-codes/orders` },
    },
  });

  await alertAdmins({
    title: `New Gift Code Order — ${order.orderNumber}`,
    message:
      `Customer: ${order.user.name}\n` +
      `Email: ${recipient}\n` +
      `Product: ${itemLines}\n` +
      `Amount: ₹${Number(order.total)}\n` +
      `Payment: Successful\n\n` +
      `Action Required: send the gift code to the customer's email, then mark the delivery as SENT.`,
    severity: "WARNING",
    link: `/admin/gift-codes/delivery?order=${order.orderNumber}`,
    targetId: order.id,
  });
}


// ------------------------------------------------------------------
// Razorpay webhook (PRD §31, §67)
// ------------------------------------------------------------------

export interface WebhookResult {
  status: number;
  message: string;
  duplicate?: boolean;
}

interface RazorpayWebhookBody {
  id?: string;
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
        method?: string;
        error_description?: string;
      };
    };
    order?: { entity?: { id?: string; amount?: number } };
  };
}

/**
 * Process a Razorpay webhook exactly once.
 *
 * The same event may be delivered repeatedly (PRD §67). We claim the event id in
 * `gateway_events` first — the unique constraint makes a duplicate delivery a
 * no-op, so no duplicate order, code assignment, delivery or alert is created.
 */
export async function processRazorpayWebhook(rawBody: Buffer, signature: string | undefined): Promise<WebhookResult> {
  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn("Razorpay webhook rejected: signature verification failed");
    return { status: 401, message: "Invalid webhook signature" };
  }

  let body: RazorpayWebhookBody;
  try {
    body = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhookBody;
  } catch {
    return { status: 400, message: "Invalid webhook payload" };
  }

  const eventType = String(body.event ?? "unknown");
  const eventId = String(body.id ?? body.payload?.payment?.entity?.id ?? "");
  if (!eventId) return { status: 400, message: "Webhook event id missing" };

  try {
    await prisma.gatewayEvent.create({
      data: {
        provider: "razorpay",
        eventId,
        eventType,
        payloadRef: body.payload?.payment?.entity?.id ?? null,
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { status: 200, message: "Event already processed", duplicate: true };
    throw err;
  }

  const entity = body.payload?.payment?.entity;

  if (eventType === "payment.failed") {
    if (entity?.order_id) {
      await prisma.payment.updateMany({
        where: { razorpayOrderId: entity.order_id, status: { in: ["CREATED", "PENDING", "AUTHORIZED"] } },
        data: {
          status: "FAILED",
          failureReason: entity.error_description ?? "Payment failed at gateway",
          method: entity.method ?? null,
        },
      });
    }
    return { status: 200, message: "Failure recorded" };
  }

  if (eventType !== "payment.captured" && eventType !== "order.paid") {
    return { status: 200, message: "Event acknowledged" };
  }

  if (!entity?.id || !entity.order_id) {
    return { status: 200, message: "Payment reference missing — acknowledged" };
  }

  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId: entity.order_id },
    include: { order: true },
    orderBy: { createdAt: "desc" },
  });

  if (!payment) {
    logger.warn(`Webhook: no local payment for gateway order ${entity.order_id}`);
    return { status: 200, message: "Unknown gateway order — acknowledged" };
  }

  // Amount/currency must match what we charged (PRD §31, §68).
  const expectedPaise = Math.round(Number(payment.order.total) * 100);
  if (entity.amount !== undefined && entity.amount !== expectedPaise) {
    logger.warn(
      `Webhook amount mismatch: order=${payment.order.orderNumber} expected=${expectedPaise} received=${entity.amount}`,
    );
    await prisma.payment.updateMany({
      where: { id: payment.id, razorpayPaymentId: null },
      data: { status: "FAILED", failureReason: `Amount mismatch (expected ${expectedPaise}, got ${entity.amount})` },
    });
    return { status: 200, message: "Amount mismatch recorded" };
  }

  if (payment.order.orderType === "GIFT_CODE") {
    if (payment.order.status === "PAID") return { status: 200, message: "Order already finalised" };

    try {
      await assignCodesForPaidOrder({
        orderId: payment.order.id,
        razorpayPaymentId: entity.id,
        method: entity.method,
        source: "WEBHOOK",
      });
      await notifyGiftOrderPaid(payment.order.id);
      return { status: 200, message: "Gift order finalised" };
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Assignment failed";
      logger.error(`Webhook gift assignment failed (order=${payment.order.orderNumber})`, reason);
      const current = await prisma.order.findUnique({ where: { id: payment.order.id }, select: { status: true } });
      if (current?.status !== "PAID") {
        await flagOrderForManualReview(payment.order.id, reason, entity.id);
      }
      return { status: 200, message: "Manual review flagged" };
    }
  }

  // Digital orders fall through to the shared digital finaliser (PRD §34).
  const { finaliseDigitalOrderFromPayment } = await import("./digitalCheckout.service");
  try {
    await finaliseDigitalOrderFromPayment({
      orderId: payment.order.id,
      razorpayPaymentId: entity.id,
      method: entity.method,
    });
    return { status: 200, message: "Digital order finalised" };
  } catch (err) {
    logger.error(
      `Webhook digital fulfilment failed (order=${payment.order.orderNumber})`,
      err instanceof Error ? err.message : err,
    );
    return { status: 200, message: "Digital fulfilment deferred" };
  }
}

