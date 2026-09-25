import type { NextFunction, Request, Response } from "express";
import * as giftCart from "../services/giftCart.service";
import { Errors } from "../utils/errors";

export async function getGiftCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const cart = await giftCart.getGiftCart(userId);
    res.json(cart);
  } catch (err) {
    next(err);
  }
}

export async function addGiftCartItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { giftProductId, quantity } = req.body ?? {};
    if (!giftProductId) throw Errors.badRequest("giftProductId is required");

    const line = await giftCart.addToGiftCart(userId, giftProductId, Number(quantity ?? 1));
    res.status(201).json(line);
  } catch (err) {
    next(err);
  }
}

export async function updateGiftCartItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { giftProductId } = req.params;
    const { quantity } = req.body ?? {};
    if (quantity === undefined) throw Errors.badRequest("quantity is required");

    const cart = await giftCart.setGiftCartQuantity(userId, giftProductId, Number(quantity));
    res.json(cart);
  } catch (err) {
    next(err);
  }
}

export async function removeGiftCartItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { giftProductId } = req.params;
    const cart = await giftCart.removeFromGiftCart(userId, giftProductId);
    res.json(cart);
  } catch (err) {
    next(err);
  }
}

export async function clearGiftCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    await giftCart.clearGiftCart(userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

