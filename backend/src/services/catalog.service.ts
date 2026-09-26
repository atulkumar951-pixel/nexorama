import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { Errors } from "../utils/errors";

export interface CatalogQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string; // slug
  productType?: string;
  minPrice?: number;
  maxPrice?: number;
  free?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest" | "popular";
}

export async function listCategories() {
  return prisma.category.findMany({
    where: { isVisible: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      children: {
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true, image: true },
      },
      _count: { select: { products: { where: { status: "PUBLISHED" } } } },
    },
  });
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { children: { where: { isVisible: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!category || !category.isVisible) throw Errors.notFound("Category not found");
  return category;
}

export function buildWhere(query: CatalogQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: "PUBLISHED", salesActive: true };

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { shortDescription: { contains: query.search, mode: "insensitive" } },
      { category: { name: { contains: query.search, mode: "insensitive" } } },
    ];
  }
  if (query.category) {
    where.category = { slug: query.category };
  }
  if (query.productType) {
    const types = query.productType.split(",").map((t) => t.trim().toUpperCase());
    where.productType = { in: types as never[] };
  }
  if (query.free === true) {
    where.OR = [...(where.OR ?? []), { isFree: true }, { price: 0 }, { salePrice: 0 }];
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.AND = [];
    if (query.minPrice !== undefined) {
      where.AND.push({
        OR: [
          { salePrice: { gte: query.minPrice } },
          { AND: [{ salePrice: null }, { price: { gte: query.minPrice } }] },
        ],
      });
    }
    if (query.maxPrice !== undefined) {
      where.AND.push({
        OR: [
          { salePrice: { lte: query.maxPrice } },
          { AND: [{ salePrice: null }, { price: { lte: query.maxPrice } }] },
        ],
      });
    }
  }
  return where;
}

export function buildOrderBy(sort: CatalogQuery["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ salePrice: "asc" }, { price: "asc" }];
    case "price_desc":
      return [{ salePrice: "desc" }, { price: "desc" }];
    case "popular":
      return [{ salesCount: "desc" }, { viewCount: "desc" }];
    case "relevance":
    case "newest":
    default:
      return [{ publishedAt: "desc" }, { createdAt: "desc" }];
  }
}

export function cardSelect() {
  return {
    id: true,
    title: true,
    slug: true,
    shortDescription: true,
    productType: true,
    coverImage: true,
    price: true,
    salePrice: true,
    isFree: true,
    isFeatured: true,
    salesCount: true,
    createdAt: true,
    category: { select: { id: true, name: true, slug: true } },
  } satisfies Prisma.ProductSelect;
}

export async function listProducts(query: CatalogQuery) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 12));
  const skip = (page - 1) * limit;

  const where = buildWhere(query);
  const orderBy = buildOrderBy(query.sort);

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: cardSelect(),
    }),
  ]);

  return {
    products,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getFeaturedProducts(limit = 8) {
  return prisma.product.findMany({
    where: { status: "PUBLISHED", isFeatured: true, salesActive: true },
    orderBy: [{ publishedAt: "desc" }],
    take: limit,
    select: cardSelect(),
  });
}

export async function getPopularProducts(limit = 8) {
  return prisma.product.findMany({
    where: { status: "PUBLISHED", salesActive: true },
    orderBy: [{ salesCount: "desc" }, { viewCount: "desc" }],
    take: limit,
    select: cardSelect(),
  });
}

export async function getLatestProducts(limit = 8) {
  return prisma.product.findMany({
    where: { status: "PUBLISHED", salesActive: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: cardSelect(),
  });
}

/** Full product detail. Drafts/archived are hidden from the public (PRD §50). */
export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      assets: {
        where: { status: "ACTIVE" },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          isPreview: true,
          sortOrder: true,
        },
      },
      chapters: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          sortOrder: true,
          lectures: {
            where: { isPublished: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              duration: true,
              thumbnail: true,
              sortOrder: true,
              isPreview: true,
              provider: true,
            },
          },
        },
      },
      bundleItems: {
        select: {
          child: {
            select: {
              id: true, title: true, slug: true, coverImage: true,
              price: true, salePrice: true, productType: true,
            },
          },
        },
      },
    },
  });

  if (!product || product.status !== "PUBLISHED") {
    throw Errors.notFound("Product not found");
  }

  // Count a view (fire-and-forget)
  void prisma.product
    .update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);

  // Related products in the same category
  const related = product.categoryId
    ? await prisma.product.findMany({
        where: { status: "PUBLISHED", categoryId: product.categoryId, id: { not: product.id } },
        take: 4,
        select: cardSelect(),
      })
    : [];

  return { ...product, related };
}

/**
 * Active, non-expired banners (PRD §46: expired banners stop displaying automatically).
 * Banners are audience-scoped so the Digital Marketplace and Gift Codes Mode
 * never leak each other's marketing (PRD §53).
 */
export async function getActiveBanners(audience: "DIGITAL" | "GIFT_CODES" = "DIGITAL") {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      status: "ACTIVE",
      audience: { in: [audience, "BOTH"] },
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

