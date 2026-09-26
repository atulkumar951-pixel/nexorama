import type { NextFunction, Request, Response } from "express";
import * as catalog from "../services/catalog.service";

function parseCatalogQuery(req: Request): catalog.CatalogQuery {
  const q = req.query as Record<string, string | undefined>;
  const num = (v?: string) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);
  return {
    page: num(q.page),
    limit: num(q.limit),
    search: q.search?.trim() || undefined,
    category: q.category || undefined,
    productType: q.productType || undefined,
    minPrice: num(q.minPrice),
    maxPrice: num(q.maxPrice),
    free: q.free === "true" ? true : undefined,
    sort: (q.sort as catalog.CatalogQuery["sort"]) || undefined,
  };
}

export async function getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await catalog.listCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function getCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await catalog.getCategoryBySlug(req.params.slug);
    const products = await catalog.listProducts({
      ...parseCatalogQuery(req),
      category: req.params.slug,
    });
    res.json({ category, ...products });
  } catch (err) {
    next(err);
  }
}

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await catalog.listProducts(parseCatalogQuery(req));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await catalog.getProductBySlug(req.params.slug);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = parseCatalogQuery(req);
    const result = await catalog.listProducts({ ...query, sort: query.sort ?? "relevance" });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHomepage(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [categories, featured, popular, latest, banners] = await Promise.all([
      catalog.listCategories(),
      catalog.getFeaturedProducts(8),
      catalog.getPopularProducts(8),
      catalog.getLatestProducts(8),
      catalog.getActiveBanners(),
    ]);
    res.json({ categories, featured, popular, latest, banners });
  } catch (err) {
    next(err);
  }
}

export async function getBanners(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const banners = await catalog.getActiveBanners();
    res.json({ banners });
  } catch (err) {
    next(err);
  }
}
