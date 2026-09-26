import type { NextFunction, Request, Response } from "express";
import * as giftOrders from "../services/giftOrder.service";

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function getUserOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const page = parseNum(req.query.page) ?? 1;
    const limit = parseNum(req.query.limit) ?? 10;
    const result = await giftOrders.getUserGiftOrders(userId, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getOrderDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const order = await giftOrders.getUserGiftOrder(userId, req.params.orderNumber);
    res.json(order);
  } catch (err) {
    next(err);
  }
}

export async function getMyGiftCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const page = parseNum(req.query.page) ?? 1;
    const limit = parseNum(req.query.limit) ?? 10;
    const result = await giftOrders.getMyGiftCodes(userId, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const stats = await giftOrders.getUserGiftStats(userId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}
