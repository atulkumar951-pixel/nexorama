import type { NextFunction, Request, Response } from "express";
import * as giftCatalog from "../services/giftCatalog.service";

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function getGiftCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await giftCatalog.listGiftCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function getGiftBrands(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brands = await giftCatalog.listGiftBrands();
    res.json({ brands });
  } catch (err) {
    next(err);
  }
}

export async function getGiftProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as Record<string, string | undefined>;
    const result = await giftCatalog.listGiftProducts({
      page: parseNum(q.page),
      limit: parseNum(q.limit),
      category: q.category,
      brand: q.brand,
      minPrice: parseNum(q.minPrice),
      maxPrice: parseNum(q.maxPrice),
      search: q.search?.trim(),
      availability: q.inStockOnly === "true" ? "in_stock" : "all",
      sort: (q.sort as any) || "newest",
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getGiftProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await giftCatalog.getGiftProductBySlug(req.params.slug);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBrandDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brand = await giftCatalog.getBrandDetail(req.params.brandName);
    res.json(brand);
  } catch (err) {
    next(err);
  }
}

export async function getGiftBanners(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const banners = await giftCatalog.listActiveGiftBanners();
    res.json({ banners });
  } catch (err) {
    next(err);
  }
}
