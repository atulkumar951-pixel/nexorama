import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { Errors } from "../utils/errors";
import { getStockMap, sweepExpiredInventory, type StockSummary } from "./giftInventory.service";
import { getGiftSettings } from "./settings.service";

/**
 * Public Gift Codes catalogue (PRD §54, §55, §56, §84).
 * Every stock number returned here is derived from real inventory and is
 * re-validated server-side at checkout (PRD §99).
 */

export interface GiftCatalogQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string; // slug
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minDenomination?: number;
  maxDenomination?: number;
  availability?: "in_stock" | "all";
  sort?: "relevance" | "price_asc" | "price_desc" | "newest" | "denomination_asc" | "denomination_desc";
  featured?: boolean;
}

export interface GiftProductCard {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  image: string | null;
  denomination: string;
  sellingPrice: string;
  currency: string;
  featured: boolean;
  category: { id: string; name: string; slug: string } | null;
  stock: StockSummary;
}

const EMPTY_STOCK: StockSummary = {
  total: 0,
  available: 0,
  reserved: 0,
  assigned: 0,
  sold: 0,
  expired: 0,
  sellable: 0,
  outOfStock: true,
  lowStock: false,
};

function cardSelect() {
  return {
    id: true,
    name: true,
    slug: true,
    brandName: true,
    image: true,
    denomination: true,
    sellingPrice: true,
    currency: true,
    featured: true,
    lowStockThreshold: true,
    category: { select: { id: true, name: true, slug: true } },
  } satisfies Prisma.GiftProductSelect;
}

type CardRow = Prisma.GiftProductGetPayload<{ select: ReturnType<typeof cardSelect> }>;

function toCard(row: CardRow, stock: StockSummary): GiftProductCard {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brandName: row.brandName,
    image: row.image,
    denomination: row.denomination.toString(),
    sellingPrice: row.sellingPrice.toString(),
    currency: row.currency,
    featured: row.featured,
    category: row.category,
    stock,
  };
}

/** Attach live stock numbers to a page of gift products (single batch query). */
async function decorate(rows: CardRow[]): Promise<GiftProductCard[]> {
  const thresholds = new Map<string, number>();
  for (const row of rows) {
    if (row.lowStockThreshold !== null) thresholds.set(row.id, row.lowStockThreshold);
  }
  const stock = await getStockMap(
    rows.map((r) => r.id),
    thresholds,
  );
  return rows.map((row) => toCard(row, stock.get(row.id) ?? { ...EMPTY_STOCK }));
}

export function buildGiftWhere(query: GiftCatalogQuery): Prisma.GiftProductWhereInput {
  const where: Prisma.GiftProductWhereInput = { status: "PUBLISHED" };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { brandName: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { category: { name: { contains: query.search, mode: "insensitive" } } },
    ];
  }
  if (query.category) where.category = { slug: query.category };
  if (query.brand) where.brandName = { equals: query.brand, mode: "insensitive" };
  if (query.featured) where.featured = true;

  const price: Prisma.DecimalFilter = {};
  if (query.minPrice !== undefined) price.gte = query.minPrice;
  if (query.maxPrice !== undefined) price.lte = query.maxPrice;
  if (Object.keys(price).length > 0) where.sellingPrice = price;

  const denom: Prisma.DecimalFilter = {};
  if (query.minDenomination !== undefined) denom.gte = query.minDenomination;
  if (query.maxDenomination !== undefined) denom.lte = query.maxDenomination;
  if (Object.keys(denom).length > 0) where.denomination = denom;

  return where;
}

function buildGiftOrderBy(sort: GiftCatalogQuery["sort"]): Prisma.GiftProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ sellingPrice: "asc" }];
    case "price_desc":
      return [{ sellingPrice: "desc" }];
    case "denomination_asc":
      return [{ denomination: "asc" }];
    case "denomination_desc":
      return [{ denomination: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "relevance":
    default:
      return [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }];
  }
}

export async function listGiftCategories() {
  return prisma.giftCategory.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      icon: true,
      sortOrder: true,
      _count: { select: { products: { where: { status: "PUBLISHED" } } } },
    },
  });
}

export async function getGiftCategoryBySlug(slug: string) {
  const category = await prisma.giftCategory.findUnique({ where: { slug } });
  if (!category || category.status !== "ACTIVE") throw Errors.notFound("Gift code category not found");
  return category;
}

/** Brands available within an optional category — the brand list is admin-driven (PRD §8). */
export async function listGiftBrands(categorySlug?: string) {
  const rows = await prisma.giftProduct.groupBy({
    by: ["brandName"],
    where: { status: "PUBLISHED", ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
    _count: { _all: true },
    orderBy: { brandName: "asc" },
  });
  return rows.map((r) => ({ brand: r.brandName, productCount: r._count._all }));
}

export async function listGiftProducts(query: GiftCatalogQuery) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(60, Math.max(1, query.limit ?? 12));
  const where = buildGiftWhere(query);

  const [total, rows] = await Promise.all([
    prisma.giftProduct.count({ where }),
    prisma.giftProduct.findMany({
      where,
      orderBy: buildGiftOrderBy(query.sort),
      skip: (page - 1) * limit,
      take: limit,
      select: cardSelect(),
    }),
  ]);

  let products = await decorate(rows);

  // Availability is filtered after stock is known so the numbers stay honest.
  if (query.availability === "in_stock") {
    products = products.filter((p) => !p.stock.outOfStock);
  }

  return {
    products,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    filters: {
      brands: await listGiftBrands(query.category),
      categories: await listGiftCategories(),
    },
  };
}

/** Full gift-product detail payload (PRD §56). */
export async function getGiftProductBySlug(slug: string) {
  const product = await prisma.giftProduct.findUnique({
    where: { slug },
    select: {
      ...cardSelect(),
      description: true,
      terms: true,
      instructions: true,
      purchaseLimit: true,
      allowCoupon: true,
      status: true,
    },
  });

  if (!product || product.status !== "PUBLISHED") throw Errors.notFound("Gift code product not found");

  const thresholds =
    product.lowStockThreshold !== null ? new Map([[product.id, product.lowStockThreshold]]) : new Map<string, number>();
  const stock = (await getStockMap([product.id], thresholds)).get(product.id) ?? { ...EMPTY_STOCK };

  const related = await prisma.giftProduct.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: product.id },
      OR: [
        ...(product.category ? [{ categoryId: product.category.id }] : []),
        { brandName: product.brandName },
      ],
    },
    take: 4,
    select: cardSelect(),
  });

  const settings = await getGiftSettings();

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brandName: product.brandName,
    image: product.image,
    denomination: product.denomination.toString(),
    sellingPrice: product.sellingPrice.toString(),
    currency: product.currency,
    featured: product.featured,
    category: product.category,
    description: product.description,
    terms: product.terms,
    instructions: product.instructions,
    purchaseLimit: product.purchaseLimit,
    allowCoupon: product.allowCoupon && settings.couponSupport,
    refundPolicy: "NON_REFUNDABLE" as const,
    stock,
    related: await decorate(related),
  };
}

/** Gift Codes Mode homepage payload (PRD §84). */
export async function getGiftHomepage() {
  await sweepExpiredInventory();

  const [categories, featured, newest, brands] = await Promise.all([
    listGiftCategories(),
    prisma.giftProduct.findMany({
      where: { status: "PUBLISHED", featured: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 8,
      select: cardSelect(),
    }),
    prisma.giftProduct.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: cardSelect(),
    }),
    listGiftBrands(),
  ]);

  return {
    categories,
    featured: await decorate(featured),
    latest: await decorate(newest),
    brands: brands.slice(0, 16),
  };
}

/** Search across brand, product, category and denomination (PRD §54). */
export async function searchGiftProducts(query: GiftCatalogQuery) {
  return listGiftProducts({ ...query, sort: query.sort ?? "relevance" });
}


/** Single brand detail page with list of its gift products. */
export async function getBrandDetail(brandName: string) {
  const result = await listGiftProducts({ brand: brandName, limit: 100 });
  const categoryNames = [
    ...new Set(
      result.products
        .map((p: GiftProductCard) => p.category?.name)
        .filter((n): n is string => Boolean(n))
    ),
  ];
  return {
    brandName,
    productsCount: result.pagination.total,
    categories: categoryNames,
    products: result.products,
  };
}

/** Active banners scoped to GIFT_CODES or BOTH audience targets. */
export async function listActiveGiftBanners() {
  const now = new Date();
  const banners = await prisma.banner.findMany({
    where: {
      status: "ACTIVE",
      audience: { in: ["GIFT_CODES", "BOTH"] },
      OR: [
        { startsAt: null, endsAt: null },
        { startsAt: { lte: now }, endsAt: null },
        { startsAt: null, endsAt: { gte: now } },
        { startsAt: { lte: now }, endsAt: { gte: now } },
      ],
    },
    orderBy: { priority: "desc" },
  });
  return banners;
}

