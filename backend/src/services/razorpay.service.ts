import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../config/env";
import { Errors } from "../utils/errors";
import { logger } from "../utils/logger";
import { safeEqual } from "../utils/giftCode";

/**
 * Single shared Razorpay integration (PRD §29).
 * The same account/keys serve both DIGITAL_PRODUCT and GIFT_CODE orders;
 * only the `order_type` recorded in our own database distinguishes them.
 */

let client: Razorpay | null = null;

export function isRazorpayConfigured(): boolean {
  return Boolean(env.razorpay.keyId && env.razorpay.keySecret);
}

function apiError503(): never {
  throw Errors.badRequest("Payments are not configured on this environment. Please contact support.");
}

function razorpay(): Razorpay {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    apiError503();
  }
  if (!client) {
    client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  }
  return client;
}

export interface CreatedGatewayOrder {
  id: string;
  amount: number; // in the smallest currency unit (paise)
  currency: string;
  receipt?: string;
  status?: string;
}

/** Create a Razorpay order. `amountInRupees` is converted to paise server-side. */
export async function createGatewayOrder(input: {
  amountInRupees: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreatedGatewayOrder> {
  if (!Number.isFinite(input.amountInRupees) || input.amountInRupees <= 0) {
    throw Errors.badRequest("Invalid payment amount");
  }
  const amount = Math.round(input.amountInRupees * 100);

  const order = (await razorpay().orders.create({
    amount,
    currency: input.currency ?? "INR",
    receipt: input.receipt,
    notes: input.notes,
  } as never)) as unknown as CreatedGatewayOrder;

  if (!order?.id) throw Errors.internal("Unable to create the payment order. Please retry.");

  return order;
}

export async function fetchGatewayOrder(gatewayOrderId: string): Promise<CreatedGatewayOrder | null> {
  try {
    const order = (await razorpay().orders.fetch(gatewayOrderId)) as unknown as CreatedGatewayOrder;
    return order ?? null;
  } catch (err) {
    logger.error(`Razorpay order fetch failed for ${gatewayOrderId}`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function fetchGatewayPayment(gatewayPaymentId: string) {
  try {
    return (await razorpay().payments.fetch(gatewayPaymentId)) as unknown as {
      id: string;
      order_id: string;
      amount: number;
      currency: string;
      status: string;
      method?: string;
      error_description?: string;
    };
  } catch (err) {
    logger.error(`Razorpay payment fetch failed for ${gatewayPaymentId}`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Verify the checkout signature: HMAC_SHA256(`${order_id}|${payment_id}`, key_secret).
 * Never trust the browser's `handler` callback on its own (PRD §31).
 */
export function verifyCheckoutSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  if (!env.razorpay.keySecret) return false;
  if (!input.razorpayOrderId || !input.razorpayPaymentId || !input.signature) return false;

  const expected = crypto
    .createHmac("sha256", env.razorpay.keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");

  return safeEqual(expected, input.signature);
}

/**
 * Verify a webhook signature: HMAC_SHA256(rawBody, webhook_secret) (PRD §31).
 * Requires the RAW request body — never the re-serialised JSON.
 */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string | undefined): boolean {
  if (!env.razorpay.webhookSecret || !signature) return false;
  const body = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
  const expected = crypto.createHmac("sha256", env.razorpay.webhookSecret).update(body).digest("hex");
  return safeEqual(expected, signature);
}

export function publicKeyId(): string | null {
  return env.razorpay.keyId ?? null;
}

export async function refundGatewayPayment(input: {
  razorpayPaymentId: string;
  amountInRupees?: number;
  notes?: Record<string, string>;
}) {
  const payload: Record<string, unknown> = { notes: input.notes };
  if (input.amountInRupees !== undefined) payload.amount = Math.round(input.amountInRupees * 100);
  const refund = (await razorpay().payments.refund(input.razorpayPaymentId, payload as never)) as unknown as {
    id: string;
    status: string;
    amount: number;
  };
  return refund;
}
