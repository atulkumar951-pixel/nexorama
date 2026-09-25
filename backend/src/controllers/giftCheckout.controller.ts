import type { NextFunction, Request, Response } from "express";
import * as giftCheckout from "../services/giftCheckout.service";
import { Errors } from "../utils/errors";

export async function createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const session = await giftCheckout.createGiftCheckout({
      userId: user.id,
      email: user.email,
    });
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
}

export async function verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { razorpayOrderId, razorpayPaymentId, signature } = req.body ?? {};

    if (!razorpayOrderId || !razorpayPaymentId || !signature) {
      throw Errors.badRequest("Missing payment verification parameters");
    }

    const confirmation = await giftCheckout.verifyGiftPayment({
      userId,
      razorpayOrderId,
      razorpayPaymentId,
      signature,
    });
    res.json(confirmation);
  } catch (err) {
    next(err);
  }
}

export async function handleRazorpayWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const rawBuffer = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body));

    const result = await giftCheckout.processRazorpayWebhook(rawBuffer, signature);
    res.status(result.status).json(result);
  } catch (err) {
    next(err);
  }
}
