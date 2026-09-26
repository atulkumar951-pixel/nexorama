import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";
import * as library from "../services/library.service";

export async function getLibrary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw Errors.unauthorized();
    const items = await library.getUserLibrary(req.user.id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

export async function getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw Errors.unauthorized();
    const page = Number(req.query.page) || 1;
    const result = await library.getUserOrders(req.user.id, page);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw Errors.unauthorized();
    const items = await library.getWishlist(req.user.id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

export async function addToWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw Errors.unauthorized();
    const productId = String(req.body?.productId ?? "");
    if (!productId) throw Errors.badRequest("productId is required");

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true },
    });
    if (!product || product.status !== "PUBLISHED") throw Errors.notFound("Product not found");

    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: req.user.id, productId } },
      update: {},
      create: { userId: req.user.id, productId },
    });
    res.status(201).json({ message: "Added to wishlist" });
  } catch (err) {
    next(err);
  }
}

export async function removeFromWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw Errors.unauthorized();
    const productId = String(req.params.productId ?? "");
    await prisma.wishlistItem.deleteMany({
      where: { userId: req.user.id, productId },
    });
    res.json({ message: "Removed from wishlist" });
  } catch (err) {
    next(err);
  }
}

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw Errors.unauthorized();
    const page = Number(req.query.page) || 1;
    const result = await library.getNotifications(req.user.id, page);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw Errors.unauthorized();
    const id = String(req.params.id ?? "");
    await prisma.notification.updateMany({
      where: { id, userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ message: "Marked as read" });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw Errors.unauthorized();
    await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
}
