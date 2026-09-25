import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";

/** Is this access grant currently usable? Checks expiry (PRD §111). */
export function isGrantActive(grant: { status: string; expiresAt: Date | null }): boolean {
  if (grant.status !== "ACTIVE") return false;
  if (grant.expiresAt && grant.expiresAt < new Date()) return false;
  return true;
}

export async function getUserLibrary(userId: string) {
  const grants = await prisma.accessGrant.findMany({
    where: { userId, status: { in: ["ACTIVE", "EXPIRED", "REVOKED", "REFUNDED"] } },
    orderBy: { grantedAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          productType: true,
          downloadLimit: true,
          downloadsActive: true,
          lecturesActive: true,
        },
      },
    },
  });

  // Group grants by product (a user may own a product via multiple orders)
  const byProduct = new Map<string, typeof grants>();
  for (const grant of grants) {
    const list = byProduct.get(grant.productId) ?? [];
    list.push(grant);
    byProduct.set(grant.productId, list);
  }

  const items = [];
  for (const [productId, productGrants] of byProduct) {
    const active = productGrants.find((g) => isGrantActive(g));
    const best = active ?? productGrants[0];
    const product = best.product;

    // Count downloads against the user's active grant(s)
    const downloadCount = await prisma.download.count({
      where: { userId, productId, status: { in: ["COMPLETED", "PENDING"] } },
    });

    const hasLectures = await prisma.productLecture.count({
      where: { productId, isPublished: true },
    });

    items.push({
      product,
      status: best.status,
      grantedAt: best.grantedAt,
      expiresAt: active?.expiresAt ?? null,
      lifetime: active?.expiresAt == null,
      downloadsUsed: downloadCount,
      downloadLimit: product.downloadLimit,
      hasLectures: hasLectures > 0,
      // expose active grant id for download requests
      grantId: active?.id ?? null,
    });
  }

  return items;
}

/** Verify the user holds active access to a product — used by download/lecture flows (PRD §60). */
export async function requireAccess(userId: string, productId: string) {
  const grant = await prisma.accessGrant.findFirst({
    where: {
      userId,
      productId,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { grantedAt: "desc" },
  });
  if (!grant) {
    throw Errors.forbidden("You do not have active access to this product");
  }
  return grant;
}

export async function getUserOrders(userId: string, page = 1, limit = 10) {
  const skip = (Math.max(1, page) - 1) * limit;
  const [total, orders] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: {
          select: {
            id: true,
            title: true,
            unitPrice: true,
            product: { select: { slug: true, coverImage: true } },
          },
        },
        payments: {
          select: { id: true, status: true, razorpayPaymentId: true, amount: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  return {
    orders,
    pagination: { page: Math.max(1, page), limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getWishlist(userId: string) {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          productType: true,
          price: true,
          salePrice: true,
          isFree: true,
          status: true,
          salesActive: true,
        },
      },
    },
  });
  return items.filter((i) => i.product.status === "PUBLISHED");
}

export async function getNotifications(userId: string, page = 1, limit = 20) {
  const skip = (Math.max(1, page) - 1) * limit;
  const [total, unread, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return {
    notifications,
    unreadCount: unread,
    pagination: { page: Math.max(1, page), limit, total, totalPages: Math.ceil(total / limit) },
  };
}
