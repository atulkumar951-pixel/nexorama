import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";
import { logger } from "../utils/logger";
import { generateOrderNumber } from "../utils/crypto";
import { notifyUser } from "./notification.service";
import { getMarketplaceMode } from "./settings.service";
import { createGatewayOrder, fetchGatewayPayment, publicKeyId, verifyCheckoutSignature } from "./razorpay.service";

/**
 * Digital marketplace checkout (the pre-existing Nexora purchase flow).
 *
 * This keeps the original behaviour intact while sharing the same Order/Payment
 * tables as Gift Codes Mode, distinguished by `order_type` (PRD §34, §101, §104).
 * When Gift Codes Mode is active these endpoints are refused server-side (PRD §77).
 */

export interface DigitalCheckoutSession {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayKeyId: string | null;
}

interface CheckoutLine {
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
}

async function assertDigitalMode(): Promise<void> {
  const mode = await getMarketplaceMode();
  if (mode === "GIFT_CODES") {
    throw Errors.featureNotAvailable(
      "The Digital Marketplace is not available right now. Please visit the Gift Codes marketplace.",
    );
  }
}

/** Build checkout lines from a single product or from the customer's cart. */
async function resolveLines(userId: string, productId?: string): Promise<{ lines: CheckoutLine[]; currency: string }> {
  const currency = "INR";
  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, title: true, price: true, salePrice: true, isFree: true, status: true, salesActive: true },
    });
    if (!product || product.status !== "PUBLISHED" || !product.salesActive) throw Errors.notFound("Product not found");
    const unitPrice = Number(product.salePrice ?? product.price);
    if (product.isFree || unitPrice <= 0) throw Errors.badRequest("This product does not require payment.");
    return { lines: [{ productId: product.id, title: product.title, unitPrice, quantity: 1 }], currency };
  }

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        select: { id: true, title: true, price: true, salePrice: true, isFree: true, status: true, salesActive: true },
      },
    },
  });

  const lines: CheckoutLine[] = [];
  for (const item of cartItems) {
    const product = item.product;
    if (!product || product.status !== "PUBLISHED" || !product.salesActive) continue;
    const unitPrice = Number(product.salePrice ?? product.price);
    if (product.isFree || unitPrice <= 0) continue;
    lines.push({ productId: product.id, title: product.title, unitPrice, quantity: Math.max(1, item.quantity) });
  }

  if (lines.length === 0) throw Errors.badRequest("Your cart is empty");
  return { lines, currency };
}

export async function createDigitalCheckout(input: {
  userId: string;
  email: string;
  productId?: string;
}): Promise<DigitalCheckoutSession> {
  await assertDigitalMode();

  const { lines, currency } = await resolveLines(input.userId, input.productId);
  const subtotal = Number(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0).toFixed(2));

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: input.userId,
      orderType: "DIGITAL_PRODUCT",
      emailSnapshot: input.email,
      subtotal,
      total: subtotal,
      currency,
      status: "PENDING",
      items: {
        create: lines.map((l) => ({
          productId: l.productId,
          itemType: "DIGITAL_PRODUCT" as const,
          title: l.title,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          totalPrice: Number((l.unitPrice * l.quantity).toFixed(2)),
        })),
      },
    },
  });

  const gatewayOrder = await createGatewayOrder({
    amountInRupees: subtotal,
    currency,
    receipt: order.orderNumber,
    notes: { orderId: order.id, orderType: "DIGITAL_PRODUCT", userId: input.userId },
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

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: subtotal,
    currency,
    razorpayOrderId: gatewayOrder.id,
    razorpayKeyId: publicKeyId(),
  };
}

// ------------------------------------------------------------------
// Fulfilment (idempotent — safe to call from checkout AND webhook)
// ------------------------------------------------------------------

export interface DigitalFinaliseResult {
  orderNumber: string;
  alreadyProcessed: boolean;
}

/**
 * Grant library access for a paid digital order.
 * Idempotent: repeated webhook delivery or a retried checkout callback will not
 * create duplicate access grants (PRD §67, §101).
 */
export async function finaliseDigitalOrderFromPayment(input: {
  orderId: string;
  razorpayPaymentId: string;
  method?: string;
}): Promise<DigitalFinaliseResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { items: { where: { itemType: "DIGITAL_PRODUCT" } } },
    });
    if (!order) throw Errors.notFound("Order not found");
    if (order.orderType !== "DIGITAL_PRODUCT") throw Errors.badRequest("This is not a digital product order");

    if (order.status === "PAID") {
      return { orderNumber: order.orderNumber, alreadyProcessed: true };
    }

    const now = new Date();

    for (const item of order.items) {
      if (!item.productId) continue;

      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, downloadLimit: true },
      });
      if (!product) continue;

      const existing = await tx.accessGrant.findFirst({
        where: { userId: order.userId, productId: product.id, orderId: order.id },
      });

      if (existing) {
        await tx.accessGrant.update({ where: { id: existing.id }, data: { status: "ACTIVE", revokedAt: null } });
      } else {
        await tx.accessGrant.create({
          data: {
            userId: order.userId,
            productId: product.id,
            orderId: order.id,
            status: "ACTIVE",
            grantedAt: now,
          },
        });
      }

      await tx.product.update({ where: { id: product.id }, data: { salesCount: { increment: item.quantity } } });
    }

    await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: now } });

    await tx.payment.updateMany({
      where: { orderId: order.id, status: { in: ["CREATED", "PENDING", "AUTHORIZED"] } },
      data: { status: "CAPTURED", razorpayPaymentId: input.razorpayPaymentId, method: input.method ?? null },
    });

    // Purchased items no longer belong in the cart.
    const productIds = order.items.map((i) => i.productId).filter((v): v is string => Boolean(v));
    if (productIds.length > 0) {
      await tx.cartItem.deleteMany({ where: { userId: order.userId, productId: { in: productIds } } });
    }

    return { orderNumber: order.orderNumber, alreadyProcessed: false };
  });
}


export interface DigitalPaymentConfirmation {
  orderId: string;
  orderNumber: string;
  amountPaid: number;
  currency: string;
  paymentStatus: "SUCCESS" | "PENDING" | "FAILED";
  alreadyProcessed: boolean;
}

/** Verify a digital payment (signature + gateway truth) and grant access. */
export async function verifyDigitalPayment(input: {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<DigitalPaymentConfirmation> {
  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId: input.razorpayOrderId, userId: input.userId },
    include: { order: true },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) throw Errors.notFound("Payment record not found for this order");
  if (payment.order.userId !== input.userId) throw Errors.forbidden("This order does not belong to you");

  if (payment.order.status === "PAID") {
    return {
      orderId: payment.order.id,
      orderNumber: payment.order.orderNumber,
      amountPaid: Number(payment.order.total),
      currency: payment.order.currency,
      paymentStatus: "SUCCESS",
      alreadyProcessed: true,
    };
  }

  const signatureOk = verifyCheckoutSignature({
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    signature: input.signature,
  });
  if (!signatureOk) {
    await prisma.payment.updateMany({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: "Signature verification failed" },
    });
    throw Errors.badRequest("Payment verification failed. If money was deducted, contact support with your order number.");
  }

  const gatewayPayment = await fetchGatewayPayment(input.razorpayPaymentId);
  if (!gatewayPayment || gatewayPayment.order_id !== input.razorpayOrderId) {
    throw Errors.internal("Unable to confirm the payment with the gateway right now. Please retry in a moment.");
  }

  const expectedPaise = Math.round(Number(payment.order.total) * 100);
  if (gatewayPayment.amount !== expectedPaise || gatewayPayment.currency !== payment.order.currency) {
    logger.warn(
      `Digital payment amount mismatch: order=${payment.order.orderNumber} expected=${expectedPaise} received=${gatewayPayment.amount}`,
    );
    throw Errors.badRequest("Payment amount does not match the order total. Please contact support.");
  }
  if (!["captured", "authorized"].includes(gatewayPayment.status)) {
    await prisma.payment.updateMany({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: `Gateway status: ${gatewayPayment.status}` },
    });
    throw Errors.badRequest("The payment was not successful. No access was granted.");
  }

  const result = await finaliseDigitalOrderFromPayment({
    orderId: payment.order.id,
    razorpayPaymentId: input.razorpayPaymentId,
    method: gatewayPayment.method,
  });

  if (!result.alreadyProcessed) {
    await notifyUser({
      userId: input.userId,
      title: `Order Confirmed — ${result.orderNumber}`,
      message: `Your payment of ₹${Number(payment.order.total)} was successful. Your library access is ready — open My Library to start learning.`,
      type: "PURCHASE",
      link: "/library",
    });
  }

  return {
    orderId: payment.order.id,
    orderNumber: result.orderNumber,
    amountPaid: Number(payment.order.total),
    currency: payment.order.currency,
    paymentStatus: "SUCCESS",
    alreadyProcessed: result.alreadyProcessed,
  };
}

