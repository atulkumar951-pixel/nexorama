import { prisma } from "../config/prisma";
import { Prisma, type GiftCategoryStatus, type GiftProductStatus } from "@prisma/client";
import { Errors } from "../utils/errors";
import { slugify, slugWithSuffix } from "../utils/crypto";
import { getStockForProduct, getStockMap, sweepExpiredInventory } from "./giftInventory.service";
import { getGiftSettings } from "./settings.service";

/**
 * Admin-side Gift Codes management (PRD §38–§41, §53, §97, §106).
 * These functions power the Admin Panel only — they must never be reachable from
 * the customer-facing surface.
 */

// ------------------------------------------------------------------
// Categories (PRD §7)
// ------------------------------------------------------------------

export interface GiftCategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  image?: string | null;
  icon?: string | null;
  status?: GiftCategoryStatus;
  sortOrder?: number;
}

export async function listGiftCategoriesAdmin() {
  return prisma.giftCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
}

export async function createGiftCategory(input: GiftCategoryInput) {
  const slug = (input.slug?.trim() ? slugify(input.slug) : slugify(input.name)) || "gift-category";
  const existing = await prisma.giftCategory.findUnique({ where: { slug } });
  const finalSlug = existing ? slugWithSuffix(slug) : slug;

  return prisma.giftCategory.create({
    data: {
      name: input.name.trim(),
      slug: finalSlug,
      description: input.description ?? null,
      image: input.image ?? null,
      icon: input.icon ?? null,
      status: input.status ?? "ACTIVE",
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateGiftCategory(id: string, input: Partial<GiftCategoryInput>) {
  const category = await prisma.giftCategory.findUnique({ where: { id } });
  if (!category) throw Errors.notFound("Gift category not found");

  const data: Prisma.GiftCategoryUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.slug !== undefined && input.slug.trim()) {
    const slug = slugify(input.slug);
    if (slug && slug !== category.slug) {
      const clash = await prisma.giftCategory.findUnique({ where: { slug } });
      if (clash && clash.id !== id) throw Errors.conflict("A category with this slug already exists");
      data.slug = slug;
    }
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.image !== undefined) data.image = input.image;
  if (input.icon !== undefined) data.icon = input.icon;
  if (input.status !== undefined) data.status = input.status;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  return prisma.giftCategory.update({ where: { id }, data });
}

/**
 * Categories are never hard-deleted when they still hold products — the
 * catalogue stays intact and the category is simply hidden (PRD §5, §101).
 */
export async function deleteGiftCategory(id: string) {
  const category = await prisma.giftCategory.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) throw Errors.notFound("Gift category not found");

  if (category._count.products > 0) {
    const archived = await prisma.giftCategory.update({ where: { id }, data: { status: "INACTIVE" } });
    return { archived: true, category: archived };
  }

  await prisma.giftCategory.delete({ where: { id } });
  return { archived: false, category: null };
}

// ------------------------------------------------------------------
// Products / denominations (PRD §9, §10, §11, §40, §70)
// ------------------------------------------------------------------

export interface GiftProductInput {
  categoryId?: string | null;
  brandName: string;
  name: string;
  slug?: string;
  description?: string | null;
  terms?: string | null;
  instructions?: string | null;
  image?: string | null;
  denomination: number;
  sellingPrice: number;
  currency?: string;
  status?: GiftProductStatus;
  featured?: boolean;
  purchaseLimit?: number | null;
  allowCoupon?: boolean;
  lowStockThreshold?: number | null;
  sortOrder?: number;
}

function validatePricing(denomination: number, sellingPrice: number): void {
  if (!Number.isFinite(denomination) || denomination <= 0) {
    throw Errors.badRequest("Gift card value (denomination) must be greater than zero");
  }
  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    throw Errors.badRequest("Selling price must be greater than zero");
  }
  // Selling price is intentionally independent of the face value (PRD §10).
  if (sellingPrice > denomination * 10) {
    throw Errors.badRequest("Selling price looks incorrect — please verify the amount.");
  }
}

export async function listGiftProductsAdmin(options: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: string;
} = {}) {
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const page = Math.max(1, options.page ?? 1);

  const where: Prisma.GiftProductWhereInput = {};
  if (options.categoryId) where.categoryId = options.categoryId;
  if (options.status) where.status = options.status as GiftProductStatus;
  if (options.search) {
    where.OR = [
      { name: { contains: options.search, mode: "insensitive" } },
      { brandName: { contains: options.search, mode: "insensitive" } },
    ];
  }

  const [total, products] = await Promise.all([
    prisma.giftProduct.count({ where }),
    prisma.giftProduct.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { category: { select: { id: true, name: true, slug: true } } },
    }),
  ]);

  const thresholds = new Map<string, number>();
  for (const p of products) if (p.lowStockThreshold !== null) thresholds.set(p.id, p.lowStockThreshold);
  const stockMap = await getStockMap(
    products.map((p) => p.id),
    thresholds,
  );

  return {
    products: products.map((product) => ({
      ...product,
      denomination: product.denomination.toString(),
      sellingPrice: product.sellingPrice.toString(),
      stock: stockMap.get(product.id),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getGiftProductAdmin(id: string) {
  const product = await prisma.giftProduct.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
  if (!product) throw Errors.notFound("Gift product not found");

  const settings = await getGiftSettings();
  const stock = await getStockForProduct(product.id, product.lowStockThreshold ?? settings.lowStockThreshold);

  return {
    product: {
      ...product,
      denomination: product.denomination.toString(),
      sellingPrice: product.sellingPrice.toString(),
      stock,
    },
  };
}


export async function createGiftProduct(input: GiftProductInput) {
  validatePricing(input.denomination, input.sellingPrice);

  if (input.categoryId) {
    const category = await prisma.giftCategory.findUnique({ where: { id: input.categoryId }, select: { id: true } });
    if (!category) throw Errors.notFound("Gift category not found");
  }

  const base = input.slug?.trim() ? slugify(input.slug) : slugify(`${input.brandName} ${input.denomination}`);
  const baseSlug = base || "gift-card";
  const clash = await prisma.giftProduct.findUnique({ where: { slug: baseSlug } });
  const slug = clash ? slugWithSuffix(baseSlug) : baseSlug;

  return prisma.giftProduct.create({
    data: {
      categoryId: input.categoryId ?? null,
      brandName: input.brandName.trim(),
      name: input.name.trim(),
      slug,
      description: input.description ?? null,
      terms: input.terms ?? null,
      instructions: input.instructions ?? null,
      image: input.image ?? null,
      denomination: input.denomination,
      sellingPrice: input.sellingPrice,
      currency: input.currency ?? "INR",
      status: input.status ?? "DRAFT",
      featured: input.featured ?? false,
      purchaseLimit: input.purchaseLimit ?? null,
      allowCoupon: input.allowCoupon ?? false,
      lowStockThreshold: input.lowStockThreshold ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

/**
 * Update a gift product.
 * Price edits only affect future purchases — historical orders already store
 * their own unit price (PRD §70, §71).
 */
export async function updateGiftProduct(id: string, input: Partial<GiftProductInput>) {
  const product = await prisma.giftProduct.findUnique({ where: { id } });
  if (!product) throw Errors.notFound("Gift product not found");

  const denomination = input.denomination ?? Number(product.denomination);
  const sellingPrice = input.sellingPrice ?? Number(product.sellingPrice);
  validatePricing(denomination, sellingPrice);

  const data: Prisma.GiftProductUpdateInput = {};
  if (input.categoryId !== undefined) {
    data.category = input.categoryId ? { connect: { id: input.categoryId } } : { disconnect: true };
  }
  if (input.brandName !== undefined) data.brandName = input.brandName.trim();
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.slug !== undefined && input.slug.trim()) {
    const slug = slugify(input.slug);
    if (slug && slug !== product.slug) {
      const clash = await prisma.giftProduct.findUnique({ where: { slug } });
      if (clash && clash.id !== id) throw Errors.conflict("A gift product with this slug already exists");
      data.slug = slug;
    }
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.terms !== undefined) data.terms = input.terms;
  if (input.instructions !== undefined) data.instructions = input.instructions;
  if (input.image !== undefined) data.image = input.image;
  if (input.denomination !== undefined) data.denomination = input.denomination;
  if (input.sellingPrice !== undefined) data.sellingPrice = input.sellingPrice;
  if (input.currency !== undefined) data.currency = input.currency;
  if (input.status !== undefined) data.status = input.status;
  if (input.featured !== undefined) data.featured = input.featured;
  if (input.purchaseLimit !== undefined) data.purchaseLimit = input.purchaseLimit;
  if (input.allowCoupon !== undefined) data.allowCoupon = input.allowCoupon;
  if (input.lowStockThreshold !== undefined) data.lowStockThreshold = input.lowStockThreshold;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  return prisma.giftProduct.update({ where: { id }, data });
}

/** Publish / unpublish / archive without touching inventory (PRD §40, §5). */
export async function setGiftProductStatus(id: string, status: GiftProductStatus) {
  const product = await prisma.giftProduct.findUnique({ where: { id }, select: { id: true } });
  if (!product) throw Errors.notFound("Gift product not found");
  return prisma.giftProduct.update({ where: { id }, data: { status } });
}

export async function deleteGiftProduct(id: string) {
  const product = await prisma.giftProduct.findUnique({
    where: { id },
    include: { _count: { select: { codes: true, orderItems: true } } },
  });
  if (!product) throw Errors.notFound("Gift product not found");

  // Never destroy sold inventory or order history (PRD §5, §101).
  if (product._count.orderItems > 0 || product._count.codes > 0) {
    return {
      archived: true,
      product: await prisma.giftProduct.update({ where: { id }, data: { status: "ARCHIVED" } }),
    };
  }

  await prisma.giftProduct.delete({ where: { id } });
  return { archived: false, product: null };
}


// ------------------------------------------------------------------
// Dashboard (PRD §38, §93, §94, §96)
// ------------------------------------------------------------------

export async function getGiftDashboard() {
  await sweepExpiredInventory();
  const settings = await getGiftSettings();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const now = new Date();

  const [
    totalProducts,
    activeProducts,
    totalCodes,
    availableCodes,
    assignedCodes,
    soldCodes,
    expiredCodes,
    reservedAgg,
    pendingDelivery,
    manualReview,
    deliveredToday,
    revenueAgg,
    pendingTargets,
    lowStockProducts,
    expiringSoon,
  ] = await Promise.all([
    prisma.giftProduct.count(),
    prisma.giftProduct.count({ where: { status: "PUBLISHED" } }),
    prisma.giftCode.count(),
    prisma.giftCode.count({ where: { status: "AVAILABLE" } }),
    prisma.giftCode.count({ where: { status: "ASSIGNED" } }),
    prisma.giftCode.count({ where: { status: "SOLD" } }),
    prisma.giftCode.count({ where: { status: "EXPIRED" } }),
    prisma.giftCodeReservation.aggregate({
      where: { status: "ACTIVE", expiresAt: { gt: now } },
      _sum: { quantity: true },
    }),
    prisma.giftCodeDelivery.count({ where: { status: { in: ["PENDING", "ASSIGNED", "PROCESSING"] } } }),
    prisma.giftCodeDelivery.count({ where: { status: "MANUAL_REVIEW" } }),
    prisma.giftCodeDelivery.count({ where: { status: "SENT", sentAt: { gte: startOfToday } } }),
    prisma.order.aggregate({
      where: { orderType: "GIFT_CODE", status: { in: ["PAID", "PROCESSING", "COMPLETED"] } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: { orderType: "GIFT_CODE", status: { in: ["PAID", "PROCESSING"] } },
      select: { id: true, orderNumber: true, paidAt: true, total: true },
      orderBy: { paidAt: "asc" },
      take: 300,
    }),
    prisma.giftProduct.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, name: true, brandName: true, denomination: true, lowStockThreshold: true },
    }),
    prisma.giftCode.count({
      where: { status: "AVAILABLE", expiryDate: { not: null, lte: new Date(Date.now() + 30 * 86_400_000) } },
    }),
  ]);

  // Overdue = paid orders whose delivery SLA has already lapsed (PRD §93).
  const pendingOrderIds = new Set(
    (
      await prisma.giftCodeDelivery.findMany({
        where: { status: { in: ["PENDING", "ASSIGNED", "PROCESSING", "MANUAL_REVIEW"] } },
        select: { orderId: true },
        take: 500,
      })
    ).map((row) => row.orderId),
  );

  const openOrders = pendingTargets.filter((order) => pendingOrderIds.has(order.id));
  const overdueOrders = openOrders.filter(
    (order) => order.paidAt !== null && order.paidAt.getTime() + settings.deliveryTargetMinutes * 60_000 < Date.now(),
  );

  const thresholds = new Map<string, number>();
  for (const p of lowStockProducts) {
    thresholds.set(p.id, p.lowStockThreshold ?? settings.lowStockThreshold);
  }
  const stockMap = await getStockMap(
    lowStockProducts.map((p) => p.id),
    thresholds,
  );

  const lowStock = lowStockProducts
    .map((p) => {
      const stock = stockMap.get(p.id);
      return {
        id: p.id,
        name: p.name,
        brandName: p.brandName,
        denomination: p.denomination.toString(),
        sellable: stock?.sellable ?? 0,
        threshold: thresholds.get(p.id) ?? settings.lowStockThreshold,
        lowStock: stock?.lowStock ?? false,
      };
    })
    .filter((p) => p.lowStock);

  return {
    cards: {
      totalGiftProducts: totalProducts,
      activeProducts,
      totalCodes,
      availableCodes,
      reservedCodes: reservedAgg._sum.quantity ?? 0,
      assignedCodes,
      soldCodes,
      expiredCodes,
      pendingDelivery,
      manualReview,
      deliveredToday,
      giftCodeRevenue: Number(revenueAgg._sum.total ?? 0),
      giftCodeOrders: revenueAgg._count._all,
    },
    sla: {
      targetMinutes: settings.deliveryTargetMinutes,
      overdue: overdueOrders.length,
      open: openOrders.length,
      oldestPending: openOrders[0]
        ? { orderNumber: openOrders[0].orderNumber, paidAt: openOrders[0].paidAt }
        : null,
    },
    alerts: {
      lowStock,
      expiringSoon,
      manualReview,
    },
  };
}


// ------------------------------------------------------------------
// Reporting (PRD §97)
// ------------------------------------------------------------------

export type ReportPreset = "today" | "7d" | "30d" | "month" | "custom";

export function resolveReportRange(preset: ReportPreset = "7d", from?: Date, to?: Date): { from: Date; to: Date } {
  const end = to ?? new Date();
  if (preset === "custom" && from) return { from, to: end };

  const start = new Date(end);
  switch (preset) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "7d":
    default:
      start.setDate(start.getDate() - 7);
  }
  return { from: start, to: end };
}

export async function getGiftReports(options: { preset?: ReportPreset; from?: Date; to?: Date } = {}) {
  await sweepExpiredInventory();
  const { from, to } = resolveReportRange(options.preset ?? "7d", options.from, options.to);

  const [
    salesAgg,
    codesSold,
    codesAvailable,
    codesExpired,
    pendingDeliveries,
    deliveredCodes,
    topBrandRows,
    topDenominationRows,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { orderType: "GIFT_CODE", status: { in: ["PAID", "PROCESSING", "COMPLETED"] }, paidAt: { gte: from, lte: to } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.giftCode.count({ where: { status: { in: ["ASSIGNED", "SOLD"] }, assignedAt: { gte: from, lte: to } } }),
    prisma.giftCode.count({ where: { status: "AVAILABLE" } }),
    prisma.giftCode.count({ where: { status: "EXPIRED" } }),
    prisma.giftCodeDelivery.count({ where: { status: { in: ["PENDING", "ASSIGNED", "PROCESSING", "MANUAL_REVIEW"] } } }),
    prisma.giftCodeDelivery.count({ where: { status: "SENT", sentAt: { gte: from, lte: to } } }),
    prisma.orderItem.groupBy({
      by: ["giftProductId"],
      where: { itemType: "GIFT_CODE", order: { status: { in: ["PAID", "PROCESSING", "COMPLETED"] }, paidAt: { gte: from, lte: to } } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 10,
    }),
    prisma.orderItem.groupBy({
      by: ["denomination"],
      where: { itemType: "GIFT_CODE", order: { status: { in: ["PAID", "PROCESSING", "COMPLETED"] }, paidAt: { gte: from, lte: to } } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 10,
    }),
  ]);

  const productIds = topBrandRows.map((r) => r.giftProductId).filter((v): v is string => Boolean(v));
  const products = productIds.length
    ? await prisma.giftProduct.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, brandName: true, denomination: true },
      })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  return {
    range: { from: from.toISOString(), to: to.toISOString(), preset: options.preset ?? "7d" },
    summary: {
      totalSales: salesAgg._count._all,
      totalRevenue: Number(salesAgg._sum.total ?? 0),
      codesSold,
      codesAvailable,
      pendingDeliveries,
      deliveredCodes,
      expiredCodes: codesExpired,
    },
    topBrands: topBrandRows.map((row) => {
      const product = row.giftProductId ? productMap.get(row.giftProductId) : undefined;
      return {
        productId: row.giftProductId,
        name: product?.name ?? "Unknown",
        brandName: product?.brandName ?? "Unknown",
        denomination: product?.denomination?.toString() ?? "0",
        quantity: row._sum.quantity ?? 0,
        revenue: Number(row._sum.totalPrice ?? 0),
      };
    }),
    topDenominations: topDenominationRows.map((row) => ({
      denomination: row.denomination ? row.denomination.toString() : "0",
      quantity: row._sum.quantity ?? 0,
      revenue: Number(row._sum.totalPrice ?? 0),
    })),
  };
}


// ------------------------------------------------------------------
// Banners (PRD §53) — Gift Codes Mode has its own banner set
// ------------------------------------------------------------------

export interface GiftBannerInput {
  title: string;
  subtitle?: string | null;
  image?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  position?: "HERO" | "PROMOTIONAL" | "CATEGORY" | "CAMPAIGN";
  status?: "ACTIVE" | "INACTIVE";
  priority?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  /** GIFT_CODES (default here) or BOTH when the artwork suits both marketplaces. */
  audience?: "GIFT_CODES" | "BOTH";
}

export async function listGiftBanners() {
  return prisma.banner.findMany({
    where: { audience: { in: ["GIFT_CODES", "BOTH"] } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function createGiftBanner(input: GiftBannerInput) {
  if (!input.title?.trim()) throw Errors.badRequest("Banner title is required");
  return prisma.banner.create({
    data: {
      title: input.title.trim(),
      subtitle: input.subtitle ?? null,
      image: input.image ?? null,
      buttonText: input.buttonText ?? null,
      buttonUrl: input.buttonUrl ?? null,
      position: input.position ?? "HERO",
      audience: input.audience ?? "GIFT_CODES",
      status: input.status ?? "ACTIVE",
      priority: input.priority ?? 0,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
    },
  });
}

export async function updateGiftBanner(id: string, input: Partial<GiftBannerInput>) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw Errors.notFound("Banner not found");
  if (banner.audience === "DIGITAL") {
    throw Errors.badRequest("This banner belongs to the Digital Marketplace and cannot be edited here");
  }

  const data: Prisma.BannerUpdateInput = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.subtitle !== undefined) data.subtitle = input.subtitle;
  if (input.image !== undefined) data.image = input.image;
  if (input.buttonText !== undefined) data.buttonText = input.buttonText;
  if (input.buttonUrl !== undefined) data.buttonUrl = input.buttonUrl;
  if (input.position !== undefined) data.position = input.position;
  if (input.audience !== undefined) data.audience = input.audience;
  if (input.status !== undefined) data.status = input.status;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.startsAt !== undefined) data.startsAt = input.startsAt;
  if (input.endsAt !== undefined) data.endsAt = input.endsAt;

  return prisma.banner.update({ where: { id }, data });
}

export async function deleteGiftBanner(id: string) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw Errors.notFound("Banner not found");
  if (banner.audience === "DIGITAL") {
    throw Errors.badRequest("This banner belongs to the Digital Marketplace and cannot be deleted here");
  }
  await prisma.banner.delete({ where: { id } });
}

