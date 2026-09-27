import "server-only";

import { db } from "@/db";
import {
  platformSettings,
  giftCategories,
  giftProducts,
  giftCodes,
  giftCodeDeliveries,
  orders,
  orderItems,
  users,
  auditLogs,
} from "@/db/schema";
import { eq, and, desc, sql, count, inArray, gte } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { encryptGiftCode, decryptGiftCode, hashGiftCode, maskGiftCode } from "@/lib/gift-crypto";
import { getMarketplaceMode, setMarketplaceMode, type MarketplaceMode } from "@/lib/marketplace-mode";

export class GiftAdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "GiftAdminApiError";
  }
}

// ---------------------------------------------------------------------------
// Response shapes consumed by the Nexora Gift Codes pages (PRD §38–§42)
// ---------------------------------------------------------------------------

export interface GiftAdminDashboard {
  cards: {
    totalGiftProducts: number;
    activeProducts: number;
    totalCodes: number;
    availableCodes: number;
    reservedCodes: number;
    assignedCodes: number;
    soldCodes: number;
    expiredCodes: number;
    pendingDelivery: number;
    manualReview: number;
    deliveredToday: number;
    giftCodeRevenue: number;
    giftCodeOrders: number;
  };
  sla: {
    targetMinutes: number;
    overdue: number;
    open: number;
    oldestPending: { orderNumber: string; paidAt: string | null } | null;
  };
  alerts: {
    lowStock: Array<{
      id: string;
      name: string;
      brandName: string;
      denomination: string;
      sellable: number;
      threshold: number;
      lowStock: boolean;
    }>;
    expiringSoon: number;
    manualReview: number;
  };
}

export interface GiftAdminModeConfig {
  mode: MarketplaceMode;
  settings: {
    giftCodePurchase: boolean;
    couponSupport: boolean;
    reservationMinutes: number;
    lowStockThreshold: number;
    maxQuantityPerOrder: number;
    maxQuantityPerUserPerDay: number;
    maxTransactionAmount: number;
    deliveryTargetMinutes: number;
  };
  rawCodeAccessRoles: string[];
}

export interface GiftStockSummary {
  total: number;
  available: number;
  reserved: number;
  assigned: number;
  sold: number;
  expired: number;
  sellable: number;
  outOfStock: boolean;
  lowStock: boolean;
}

export interface GiftAdminProduct {
  id: string;
  name: string;
  brandName: string;
  denomination: string;
  sellingPrice: string;
  status: string;
  featured: boolean;
  stock: GiftStockSummary | null;
}

export interface GiftInventoryCode {
  id: string;
  maskedCode: string;
  batchLabel: string | null;
  internalNote: string | null;
  expiryDate: string | null;
  status: string;
  assignedAt: string | null;
  soldAt: string | null;
  viewCount: number;
  createdAt: string;
  giftProduct: { id: string; name: string; brandName: string; denomination: string };
  assignedOrder: { id: string; orderNumber: string } | null;
}

export interface GiftDeliveryRow {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  recipientEmail: string;
  product: string;
  denomination: string;
  quantity: number;
  amount: number;
  currency: string;
  codeAssigned: boolean;
  maskedCode: string;
  deliveryStatus: string;
  purchaseTime: string;
  minutesWaiting: number | null;
  targetMinutes: number;
  overdue: boolean;
  adminNote: string | null;
  failureReason: string | null;
  sentAt: string | null;
  giftCodeId?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GiftInventoryResponse {
  codes: GiftInventoryCode[];
  pagination: Pagination;
}

export interface GiftProductsResponse {
  products: GiftAdminProduct[];
  pagination: Pagination;
}

export interface GiftDeliveryQueueResponse {
  deliveries: GiftDeliveryRow[];
  summary: { pending: number; overdue: number; manualReview: number };
  pagination: Pagination;
}

/**
 * Native, server-side implementation of Gift Codes admin operations.
 * Runs directly on PostgreSQL via Drizzle ORM inside the unified Nexora app.
 */
export async function giftAdminApi<T>(
  path: string,
  init: { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: any } = {}
): Promise<T> {
  const method = init.method || "GET";
  const body = init.body;
  const url = new URL(`http://localhost${path}`);
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  // 1. Dashboard API: GET /dashboard
  if (pathname === "/dashboard" && method === "GET") {
    return (await getDashboardData()) as T;
  }

  // 2. Settings Mode API: /settings/mode
  if (pathname === "/settings/mode") {
    if (method === "GET") {
      const mode = await getMarketplaceMode();
      const config: GiftAdminModeConfig = {
        mode,
        settings: {
          giftCodePurchase: true,
          couponSupport: false,
          reservationMinutes: 10,
          lowStockThreshold: 10,
          maxQuantityPerOrder: 5,
          maxQuantityPerUserPerDay: 10,
          maxTransactionAmount: 50000,
          deliveryTargetMinutes: 5,
        },
        rawCodeAccessRoles: ["admin", "super_admin"],
      };
      return config as T;
    }
    if (method === "POST") {
      const user = await getCurrentUser();
      const newMode = body?.mode === "GIFT_CODES" ? "GIFT_CODES" : "DIGITAL";
      await setMarketplaceMode(newMode, user ? { id: user.id, email: user.email } : undefined);
      return { success: true, mode: newMode } as T;
    }
  }

  // 3. Products List / Creation: /products
  if (pathname === "/products") {
    if (method === "GET") {
      return (await getProductsList(searchParams)) as T;
    }
    if (method === "POST") {
      return (await createGiftProduct(body)) as T;
    }
  }

  // 4. Product Status: /products/:id/status
  const productStatusMatch = pathname.match(/^\/products\/([^/]+)\/status$/);
  if (productStatusMatch && method === "PATCH") {
    const productId = parseInt(productStatusMatch[1], 10);
    const status = body?.status;
    await db
      .update(giftProducts)
      .set({ status, updatedAt: new Date() })
      .where(eq(giftProducts.id, productId));
    return { success: true } as T;
  }

  // 5. Categories API: /categories
  if (pathname === "/categories") {
    if (method === "POST") {
      return (await createCategory(body)) as T;
    }
    if (method === "GET") {
      const rows = await db.select().from(giftCategories).orderBy(giftCategories.sortOrder, giftCategories.name);
      return { categories: rows } as T;
    }
  }

  // 6. Inventory List: /inventory
  if (pathname === "/inventory" && method === "GET") {
    return (await getInventoryList(searchParams)) as T;
  }

  // 7. Deliveries List: /deliveries or /deliveries/queue
  if ((pathname === "/deliveries" || pathname === "/deliveries/queue") && method === "GET") {
    return (await getDeliveriesList(searchParams)) as T;
  }

  // 8. Mark Deliveries Sent: /deliveries/mark-sent
  if (pathname === "/deliveries/mark-sent" && method === "POST") {
    const deliveryIds = (body?.deliveryIds || []).map((id: string | number) => Number(id));
    return (await markDeliveriesSent(deliveryIds, body?.adminNote)) as T;
  }

  throw new GiftAdminApiError(404, `Unknown admin path: ${pathname}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getDashboardData(): Promise<GiftAdminDashboard> {
  const [prodCounts] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${giftProducts.status} = 'PUBLISHED')::int`,
    })
    .from(giftProducts);

  const [codeCounts] = await db
    .select({
      total: count(),
      available: sql<number>`count(*) filter (where ${giftCodes.status} = 'AVAILABLE')::int`,
      reserved: sql<number>`count(*) filter (where ${giftCodes.status} = 'RESERVED')::int`,
      assigned: sql<number>`count(*) filter (where ${giftCodes.status} = 'ASSIGNED')::int`,
      sold: sql<number>`count(*) filter (where ${giftCodes.status} = 'SOLD')::int`,
      expired: sql<number>`count(*) filter (where ${giftCodes.status} = 'EXPIRED')::int`,
    })
    .from(giftCodes);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [deliveryCounts] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${giftCodeDeliveries.status} = 'PENDING')::int`,
      deliveredToday: sql<number>`count(*) filter (where ${giftCodeDeliveries.status} = 'SENT' and ${giftCodeDeliveries.sentAt} >= ${todayStart})::int`,
    })
    .from(giftCodeDeliveries);

  const [orderMetrics] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.orderType} = 'GIFT_CODE' and ${orders.status} in ('PAID', 'COMPLETED')), 0)::int`,
      count: sql<number>`count(*) filter (where ${orders.orderType} = 'GIFT_CODE' and ${orders.status} in ('PAID', 'COMPLETED'))::int`,
    })
    .from(orders);

  // Check oldest pending delivery for SLA target calculation
  const [oldestPending] = await db
    .select({
      orderNumber: orders.orderNumber,
      paidAt: orders.createdAt,
    })
    .from(giftCodeDeliveries)
    .innerJoin(orders, eq(giftCodeDeliveries.orderId, orders.id))
    .where(eq(giftCodeDeliveries.status, "PENDING"))
    .orderBy(orders.createdAt)
    .limit(1);

  const targetMinutes = 5;
  const overdueCutoff = new Date(Date.now() - targetMinutes * 60 * 1000);
  const [overdueRes] = await db
    .select({ count: count() })
    .from(giftCodeDeliveries)
    .innerJoin(orders, eq(giftCodeDeliveries.orderId, orders.id))
    .where(and(eq(giftCodeDeliveries.status, "PENDING"), sql`${orders.createdAt} < ${overdueCutoff}`));

  return {
    cards: {
      totalGiftProducts: prodCounts?.total ?? 0,
      activeProducts: prodCounts?.active ?? 0,
      totalCodes: codeCounts?.total ?? 0,
      availableCodes: codeCounts?.available ?? 0,
      reservedCodes: codeCounts?.reserved ?? 0,
      assignedCodes: codeCounts?.assigned ?? 0,
      soldCodes: codeCounts?.sold ?? 0,
      expiredCodes: codeCounts?.expired ?? 0,
      pendingDelivery: deliveryCounts?.pending ?? 0,
      manualReview: 0,
      deliveredToday: deliveryCounts?.deliveredToday ?? 0,
      giftCodeRevenue: orderMetrics?.revenue ?? 0,
      giftCodeOrders: orderMetrics?.count ?? 0,
    },
    sla: {
      targetMinutes,
      overdue: overdueRes?.count ?? 0,
      open: deliveryCounts?.pending ?? 0,
      oldestPending: oldestPending
        ? {
            orderNumber: oldestPending.orderNumber,
            paidAt: oldestPending.paidAt.toISOString(),
          }
        : null,
    },
    alerts: {
      lowStock: [],
      expiringSoon: 0,
      manualReview: 0,
    },
  };
}

async function getProductsList(searchParams: URLSearchParams): Promise<GiftProductsResponse> {
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
  const offset = (page - 1) * limit;

  const [totalRes] = await db.select({ count: count() }).from(giftProducts);
  const total = totalRes?.count ?? 0;

  const rows = await db
    .select()
    .from(giftProducts)
    .orderBy(desc(giftProducts.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch stock counts for these products
  const productIds = rows.map((r) => r.id);
  const stockMap: Record<number, GiftStockSummary> = {};

  if (productIds.length > 0) {
    const stockStats = await db
      .select({
        productId: giftCodes.giftProductId,
        total: count(),
        available: sql<number>`count(*) filter (where ${giftCodes.status} = 'AVAILABLE')::int`,
        reserved: sql<number>`count(*) filter (where ${giftCodes.status} = 'RESERVED')::int`,
        assigned: sql<number>`count(*) filter (where ${giftCodes.status} = 'ASSIGNED')::int`,
        sold: sql<number>`count(*) filter (where ${giftCodes.status} = 'SOLD')::int`,
        expired: sql<number>`count(*) filter (where ${giftCodes.status} = 'EXPIRED')::int`,
      })
      .from(giftCodes)
      .where(inArray(giftCodes.giftProductId, productIds))
      .groupBy(giftCodes.giftProductId);

    for (const stat of stockStats) {
      const avail = stat.available ?? 0;
      stockMap[stat.productId] = {
        total: stat.total ?? 0,
        available: avail,
        reserved: stat.reserved ?? 0,
        assigned: stat.assigned ?? 0,
        sold: stat.sold ?? 0,
        expired: stat.expired ?? 0,
        sellable: avail,
        outOfStock: avail === 0,
        lowStock: avail > 0 && avail <= 10,
      };
    }
  }

  const mapped: GiftAdminProduct[] = rows.map((p) => {
    const stock = stockMap[p.id] || {
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
    return {
      id: String(p.id),
      name: p.name,
      brandName: p.brandName,
      denomination: String(p.denomination),
      sellingPrice: String(p.sellingPrice),
      status: p.status,
      featured: p.isFeatured,
      stock,
    };
  });

  return {
    products: mapped,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function createGiftProduct(body: any) {
  const name = String(body.name || "").trim();
  const brandName = String(body.brandName || "").trim();
  const denomination = Number(body.denomination || 0);
  const sellingPrice = Number(body.sellingPrice || 0);

  // Generate unique slug
  let slug = `${brandName}-${denomination}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) slug = `gift-${Date.now()}`;

  const categoryId = body.categoryId ? parseInt(String(body.categoryId), 10) : null;

  const [created] = await db
    .insert(giftProducts)
    .values({
      name,
      brandName,
      slug,
      categoryId: categoryId && !isNaN(categoryId) ? categoryId : null,
      description: body.description || null,
      terms: body.terms || null,
      instructions: body.instructions || null,
      image: body.image || null,
      denomination,
      sellingPrice,
      status: body.status || "DRAFT",
      isFeatured: Boolean(body.featured),
      allowCoupon: Boolean(body.allowCoupon),
      purchaseLimit: body.purchaseLimit ? Number(body.purchaseLimit) : 5,
      lowStockThreshold: body.lowStockThreshold ? Number(body.lowStockThreshold) : 10,
    })
    .returning();

  return created;
}

async function createCategory(body: any) {
  const name = String(body.name || "").trim();
  let slug = String(body.slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  if (!slug) slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const [created] = await db
    .insert(giftCategories)
    .values({
      name,
      slug,
      description: body.description || null,
      image: body.image || null,
      icon: body.icon || "🎁",
      status: "ACTIVE",
    })
    .returning();

  return created;
}

async function getInventoryList(searchParams: URLSearchParams): Promise<GiftInventoryResponse> {
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));
  const offset = (page - 1) * limit;

  const statusFilter = searchParams.get("status");
  const giftProductId = searchParams.get("giftProductId")
    ? parseInt(searchParams.get("giftProductId")!, 10)
    : null;

  let conditions: any[] = [];
  if (statusFilter) conditions.push(eq(giftCodes.status, statusFilter));
  if (giftProductId) conditions.push(eq(giftCodes.giftProductId, giftProductId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRes] = await db.select({ count: count() }).from(giftCodes).where(whereClause);
  const total = totalRes?.count ?? 0;

  const rows = await db
    .select({
      id: giftCodes.id,
      maskedCode: giftCodes.maskedCode,
      batchLabel: giftCodes.batchLabel,
      internalNote: giftCodes.internalNote,
      expiryDate: giftCodes.expiryDate,
      status: giftCodes.status,
      assignedAt: giftCodes.assignedAt,
      soldAt: giftCodes.soldAt,
      viewCount: giftCodes.viewCount,
      createdAt: giftCodes.createdAt,
      giftProductId: giftProducts.id,
      productName: giftProducts.name,
      brandName: giftProducts.brandName,
      denomination: giftProducts.denomination,
      assignedOrderId: orders.id,
      assignedOrderNumber: orders.orderNumber,
    })
    .from(giftCodes)
    .innerJoin(giftProducts, eq(giftCodes.giftProductId, giftProducts.id))
    .leftJoin(orders, eq(giftCodes.assignedOrderId, orders.id))
    .where(whereClause)
    .orderBy(desc(giftCodes.createdAt))
    .limit(limit)
    .offset(offset);

  const mapped: GiftInventoryCode[] = rows.map((r) => ({
    id: String(r.id),
    maskedCode: r.maskedCode,
    batchLabel: r.batchLabel,
    internalNote: r.internalNote,
    expiryDate: r.expiryDate ? r.expiryDate.toISOString() : null,
    status: r.status,
    assignedAt: r.assignedAt ? r.assignedAt.toISOString() : null,
    soldAt: r.soldAt ? r.soldAt.toISOString() : null,
    viewCount: r.viewCount,
    createdAt: r.createdAt.toISOString(),
    giftProduct: {
      id: String(r.giftProductId),
      name: r.productName,
      brandName: r.brandName,
      denomination: String(r.denomination),
    },
    assignedOrder: r.assignedOrderId
      ? {
          id: String(r.assignedOrderId),
          orderNumber: r.assignedOrderNumber!,
        }
      : null,
  }));

  return {
    codes: mapped,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getDeliveriesList(searchParams: URLSearchParams): Promise<GiftDeliveryQueueResponse> {
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));
  const offset = (page - 1) * limit;

  const targetMinutes = 5;
  const overdueCutoff = new Date(Date.now() - targetMinutes * 60 * 1000);

  const [summary] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${giftCodeDeliveries.status} = 'PENDING')::int`,
      overdue: sql<number>`count(*) filter (where ${giftCodeDeliveries.status} = 'PENDING' and ${orders.createdAt} < ${overdueCutoff})::int`,
      manualReview: sql<number>`0::int`,
    })
    .from(giftCodeDeliveries)
    .innerJoin(orders, eq(giftCodeDeliveries.orderId, orders.id));

  const [totalRes] = await db.select({ count: count() }).from(giftCodeDeliveries);
  const total = totalRes?.count ?? 0;

  const rows = await db
    .select({
      id: giftCodeDeliveries.id,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      customerName: users.name,
      customerEmail: users.email,
      recipientEmail: giftCodeDeliveries.recipientEmail,
      status: giftCodeDeliveries.status,
      assignedAt: giftCodeDeliveries.assignedAt,
      sentAt: giftCodeDeliveries.sentAt,
      adminNote: giftCodeDeliveries.adminNote,
      failureReason: giftCodeDeliveries.failureReason,
      createdAt: orders.createdAt,
      totalAmount: orders.total,
      currency: orders.currency,
      giftCodeId: giftCodes.id,
      maskedCode: giftCodes.maskedCode,
      productName: giftProducts.name,
      denomination: giftProducts.denomination,
    })
    .from(giftCodeDeliveries)
    .innerJoin(orders, eq(giftCodeDeliveries.orderId, orders.id))
    .innerJoin(users, eq(orders.userId, users.id))
    .leftJoin(giftCodes, eq(giftCodeDeliveries.giftCodeId, giftCodes.id))
    .leftJoin(giftProducts, eq(giftCodes.giftProductId, giftProducts.id))
    .orderBy(desc(giftCodeDeliveries.assignedAt))
    .limit(limit)
    .offset(offset);

  const mapped: GiftDeliveryRow[] = rows.map((r) => {
    const minutesWaiting = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 60000);
    const overdue = r.status === "PENDING" && minutesWaiting > targetMinutes;

    return {
      id: String(r.id),
      orderId: String(r.orderId),
      orderNumber: r.orderNumber,
      customerName: r.customerName || "Customer",
      customerEmail: r.customerEmail || r.recipientEmail,
      recipientEmail: r.recipientEmail,
      product: r.productName || "Gift Card",
      denomination: String(r.denomination || 0),
      quantity: 1,
      amount: r.totalAmount,
      currency: r.currency,
      codeAssigned: Boolean(r.giftCodeId),
      maskedCode: r.maskedCode || "UNASSIGNED",
      deliveryStatus: r.status,
      purchaseTime: r.createdAt.toISOString(),
      minutesWaiting,
      targetMinutes,
      overdue,
      adminNote: r.adminNote,
      failureReason: r.failureReason,
      sentAt: r.sentAt ? r.sentAt.toISOString() : null,
      giftCodeId: r.giftCodeId ? String(r.giftCodeId) : undefined,
    };
  });

  return {
    deliveries: mapped,
    summary: {
      pending: summary?.pending ?? 0,
      overdue: summary?.overdue ?? 0,
      manualReview: 0,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function markDeliveriesSent(deliveryIds: number[], adminNote?: string) {
  if (!deliveryIds.length) return { success: false };

  const admin = await getCurrentUser();
  const now = new Date();

  for (const deliveryId of deliveryIds) {
    const [del] = await db
      .select({ id: giftCodeDeliveries.id, giftCodeId: giftCodeDeliveries.giftCodeId, orderId: giftCodeDeliveries.orderId })
      .from(giftCodeDeliveries)
      .where(eq(giftCodeDeliveries.id, deliveryId));

    if (!del) continue;

    // Update delivery record
    await db
      .update(giftCodeDeliveries)
      .set({
        status: "SENT",
        sentAt: now,
        sentByAdminId: admin?.id,
        adminNote: adminNote || "Sent to registered email manually by ops team.",
        updatedAt: now,
      })
      .where(eq(giftCodeDeliveries.id, deliveryId));

    // Update gift code status to SOLD
    if (del.giftCodeId) {
      await db
        .update(giftCodes)
        .set({
          status: "SOLD",
          soldAt: now,
          updatedAt: now,
        })
        .where(eq(giftCodes.id, del.giftCodeId));
    }

    // Update order status to COMPLETED
    await db
      .update(orders)
      .set({
        status: "COMPLETED",
        updatedAt: now,
      })
      .where(eq(orders.id, del.orderId));

    // Create audit log entry (PRD §74)
    if (admin) {
      await db.insert(auditLogs).values({
        actorId: admin.id,
        actorEmail: admin.email,
        action: "GIFT_DELIVERY_MARKED_SENT",
        targetType: "GIFT_DELIVERY",
        targetId: String(deliveryId),
        detail: `Delivery marked as SENT by ${admin.email}. Order ID: ${del.orderId}`,
      });
    }
  }

  return { success: true };
}
