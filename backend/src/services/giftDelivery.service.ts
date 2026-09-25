import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { Errors } from "../utils/errors";
import { logger } from "../utils/logger";
import { revealCode, sweepExpiredInventory } from "./giftInventory.service";
import { getGiftSettings, canViewRawCodes, type AdminRoleName } from "./settings.service";

/**
 * Gift-code delivery operations (PRD §18, §19, §46, §47, §48, §72, §73).
 *
 * The Nexora team sends the actual code manually from their own mailbox; this
 * module only tracks state and gives authorised admins a secure way to read the
 * assigned code — every read is written to the audit log.
 */

export interface DeliveryActor {
  id: string;
  email: string;
  role: AdminRoleName;
}

/** Only explicitly granted roles may ever see a raw code (PRD §72). */
export async function assertCanViewRawCodes(actor: DeliveryActor): Promise<void> {
  const allowed = await canViewRawCodes(actor.role);
  if (!allowed) {
    throw Errors.forbidden("Your role is not permitted to view raw gift codes. Ask a Super Admin for access.");
  }
}

// ------------------------------------------------------------------
// Pending delivery queue (PRD §18, §92, §93)
// ------------------------------------------------------------------

export async function listPendingDeliveries(options: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  overdueOnly?: boolean;
} = {}) {
  await sweepExpiredInventory();
  const settings = await getGiftSettings();
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const page = Math.max(1, options.page ?? 1);

  const statuses = options.status ? [options.status] : ["PENDING", "ASSIGNED", "PROCESSING", "MANUAL_REVIEW", "FAILED"];

  const where: Prisma.GiftCodeDeliveryWhereInput = { status: { in: statuses as never[] } };
  if (options.search) {
    where.OR = [
      { order: { orderNumber: { contains: options.search, mode: "insensitive" } } },
      { recipientEmail: { contains: options.search, mode: "insensitive" } },
      { order: { user: { name: { contains: options.search, mode: "insensitive" } } } },
    ];
  }

  const [total, deliveries] = await Promise.all([
    prisma.giftCodeDelivery.count({ where }),
    prisma.giftCodeDelivery.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        status: true,
        recipientEmail: true,
        sentAt: true,
        adminNote: true,
        failureReason: true,
        giftCodeId: true,
        giftCode: { select: { maskedCode: true } },
        orderItem: { select: { title: true, denomination: true, quantity: true } },
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            currency: true,
            status: true,
            paidAt: true,
            createdAt: true,
            emailSnapshot: true,
            user: { select: { id: true, name: true, email: true } },
            payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
          },
        },
      },
    }),
  ]);

  const now = Date.now();
  const rows = deliveries.map((d) => {
    const paidAt = d.order.paidAt;
    const target = paidAt ? paidAt.getTime() + settings.deliveryTargetMinutes * 60_000 : null;
    return {
      id: d.id,
      orderId: d.order.id,
      orderNumber: d.order.orderNumber,
      customerName: d.order.user.name,
      customerEmail: d.order.user.email,
      recipientEmail: d.recipientEmail,
      emailSnapshot: d.order.emailSnapshot,
      product: d.orderItem?.title ?? "Gift code",
      denomination: d.orderItem?.denomination ? d.orderItem.denomination.toString() : "0",
      quantity: d.orderItem?.quantity ?? 1,
      amount: Number(d.order.total),
      currency: d.order.currency,
      paymentStatus: d.order.payments[0]?.status ?? "CREATED",
      orderStatus: d.order.status,
      codeAssigned: Boolean(d.giftCodeId),
      maskedCode: d.giftCode?.maskedCode ?? "••••",
      deliveryStatus: d.status,
      purchaseTime: paidAt ? paidAt.toISOString() : d.order.createdAt.toISOString(),
      minutesWaiting: paidAt ? Math.max(0, Math.round((now - paidAt.getTime()) / 60_000)) : null,
      targetMinutes: settings.deliveryTargetMinutes,
      overdue: d.status !== "SENT" && target !== null && target < now,
      adminNote: d.adminNote,
      failureReason: d.failureReason,
      sentAt: d.sentAt ? d.sentAt.toISOString() : null,
    };
  });

  const filtered = options.overdueOnly ? rows.filter((r) => r.overdue) : rows;

  return {
    deliveries: filtered,
    summary: {
      pending: rows.filter((r) => r.deliveryStatus !== "SENT").length,
      overdue: rows.filter((r) => r.overdue).length,
      manualReview: rows.filter((r) => r.deliveryStatus === "MANUAL_REVIEW").length,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ------------------------------------------------------------------
// Delivery detail view (PRD §46, §47)
// ------------------------------------------------------------------

export async function getDeliveryDetail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      payments: { orderBy: { createdAt: "desc" } },
      items: { include: { giftProduct: { select: { id: true, name: true, brandName: true, denomination: true } } } },
      giftDeliveries: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          recipientEmail: true,
          assignedAt: true,
          sentAt: true,
          adminNote: true,
          failureReason: true,
          giftCodeId: true,
          sentBy: { select: { id: true, name: true, email: true } },
          giftCode: { select: { id: true, maskedCode: true, status: true, expiryDate: true, assignedAt: true, soldAt: true } },
          orderItem: { select: { id: true, title: true, denomination: true, quantity: true, unitPrice: true } },
        },
      },
    },
  });

  if (!order || order.orderType !== "GIFT_CODE") throw Errors.notFound("Gift code order not found");

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
      emailSnapshot: order.emailSnapshot,
      customer: order.user,
      payments: order.payments.map((p) => ({
        id: p.id,
        status: p.status,
        amount: Number(p.amount),
        razorpayOrderId: p.razorpayOrderId,
        razorpayPaymentId: p.razorpayPaymentId,
        method: p.method,
      })),
      refundable: false,
      refundPolicyNote:
        "Gift code purchases are non-refundable. A Super Admin may resolve an exceptional case manually with a recorded reason.",
      items: order.items.map((item) => ({
        id: item.id,
        title: item.title,
        brandName: item.giftProduct?.brandName ?? "",
        denomination: item.denomination ? item.denomination.toString() : "0",
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      deliveries: order.giftDeliveries.map((d) => ({
        id: d.id,
        status: d.status,
        recipientEmail: d.recipientEmail,
        assignedAt: d.assignedAt ? d.assignedAt.toISOString() : null,
        sentAt: d.sentAt ? d.sentAt.toISOString() : null,
        adminNote: d.adminNote,
        failureReason: d.failureReason,
        giftCodeId: d.giftCodeId,
        maskedCode: d.giftCode?.maskedCode ?? null,
        codeStatus: d.giftCode?.status ?? null,
        expiryDate: d.giftCode?.expiryDate ? d.giftCode.expiryDate.toISOString() : null,
        sentBy: d.sentBy,
        item: d.orderItem ? { id: d.orderItem.id, title: d.orderItem.title, quantity: d.orderItem.quantity } : null,
      })),
    },
  };
}

// ------------------------------------------------------------------
// Code reveal for dispatch (PRD §46, §72, §73)
// ------------------------------------------------------------------

export async function revealDeliveryCode(deliveryId: string, actor: DeliveryActor, reason?: string) {
  await assertCanViewRawCodes(actor);

  const delivery = await prisma.giftCodeDelivery.findUnique({
    where: { id: deliveryId },
    select: {
      id: true,
      giftCodeId: true,
      recipientEmail: true,
      order: { select: { orderNumber: true } },
    },
  });
  if (!delivery) throw Errors.notFound("Delivery record not found");
  if (!delivery.giftCodeId) throw Errors.badRequest("No gift code has been assigned to this delivery line yet");

  const revealReason = reason?.trim() || `Manual dispatch for order ${delivery.order.orderNumber} (${delivery.recipientEmail})`;
  const revealed = await revealCode(delivery.giftCodeId, { id: actor.id, email: actor.email }, revealReason);

  return {
    deliveryId: delivery.id,
    orderNumber: delivery.order.orderNumber,
    recipientEmail: delivery.recipientEmail,
    code: revealed.code,
    maskedCode: revealed.maskedCode,
    productId: revealed.productId,
  };
}


// ------------------------------------------------------------------
// Mark delivery as sent (PRD §46, §47)
// ------------------------------------------------------------------

export interface MarkSentInput {
  deliveryIds: string[];
  adminNote?: string;
}

export async function markDeliveriesSent(input: MarkSentInput, actor: DeliveryActor) {
  if (!input.deliveryIds?.length) throw Errors.badRequest("At least one delivery id is required");

  const deliveries = await prisma.giftCodeDelivery.findMany({
    where: { id: { in: input.deliveryIds } },
    include: { order: true, giftCode: true },
  });

  if (deliveries.length !== input.deliveryIds.length) {
    throw Errors.badRequest("One or more delivery IDs were not found");
  }

  const now = new Date();
  const orderIds = new Set<string>();

  await prisma.$transaction(async (tx) => {
    for (const d of deliveries) {
      orderIds.add(d.orderId);

      await tx.giftCodeDelivery.update({
        where: { id: d.id },
        data: {
          status: "SENT",
          sentAt: now,
          sentByAdminId: actor.id,
          adminNote: input.adminNote ?? d.adminNote,
          failureReason: null,
        },
      });

      if (d.giftCodeId) {
        await tx.giftCode.update({
          where: { id: d.giftCodeId },
          data: { status: "SOLD", soldAt: now },
        });
      }
    }

    for (const orderId of orderIds) {
      const remaining = await tx.giftCodeDelivery.count({
        where: { orderId, status: { not: "SENT" } },
      });
      if (remaining === 0) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "COMPLETED" },
        });
      } else {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "PROCESSING" },
        });
      }
    }
  });

  logger.info(`Admin ${actor.email} marked ${deliveries.length} gift delivery records as SENT`);
  return { updatedCount: deliveries.length, sentAt: now.toISOString() };
}

// ------------------------------------------------------------------
// Manual assignment for MANUAL_REVIEW rows (PRD §20, §46, §47)
// ------------------------------------------------------------------

export async function assignCodeManually(deliveryId: string, giftCodeId: string, actor: DeliveryActor) {
  const delivery = await prisma.giftCodeDelivery.findUnique({
    where: { id: deliveryId },
    include: { orderItem: true },
  });
  if (!delivery) throw Errors.notFound("Delivery record not found");
  if (!delivery.orderItem || !delivery.orderItem.giftProductId) {
    throw Errors.badRequest("Delivery record has no associated gift product");
  }

  const targetCode = await prisma.giftCode.findUnique({ where: { id: giftCodeId } });
  if (!targetCode) throw Errors.notFound("Gift code not found");
  if (targetCode.status !== "AVAILABLE") throw Errors.badRequest(`Gift code is ${targetCode.status}, not AVAILABLE`);

  if (targetCode.giftProductId !== delivery.orderItem.giftProductId) {
    throw Errors.badRequest("Selected gift code does not match the product in the order");
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.giftCode.update({
      where: { id: giftCodeId },
      data: { status: "ASSIGNED", assignedOrderId: delivery.orderId, assignedAt: now },
    });

    await tx.giftCodeDelivery.update({
      where: { id: deliveryId },
      data: {
        giftCodeId,
        status: "ASSIGNED",
        assignedAt: now,
        failureReason: null,
      },
    });
  });

  logger.info(`Admin ${actor.email} manually assigned code ${targetCode.id} to delivery ${deliveryId}`);
  return { deliveryId, giftCodeId, assignedAt: now.toISOString() };
}


// ------------------------------------------------------------------
// Code replacement (PRD §48)
// ------------------------------------------------------------------

export async function replaceCode(
  deliveryId: string,
  reason: string,
  actor: DeliveryActor,
  overrideCodeId?: string,
) {
  if (!reason?.trim()) throw Errors.badRequest("A replacement reason is required");

  const delivery = await prisma.giftCodeDelivery.findUnique({
    where: { id: deliveryId },
    include: { orderItem: true, giftCode: true, order: true },
  });
  if (!delivery) throw Errors.notFound("Delivery record not found");
  if (!delivery.orderItem || !delivery.orderItem.giftProductId) {
    throw Errors.badRequest("Delivery record has no associated gift product");
  }

  const productId = delivery.orderItem.giftProductId;
  const now = new Date();

  const replacement = await prisma.$transaction(async (tx) => {
    let nextCodeId: string;
    if (overrideCodeId) {
      const explicit = await tx.giftCode.findUnique({ where: { id: overrideCodeId } });
      if (!explicit || explicit.giftProductId !== productId || explicit.status !== "AVAILABLE") {
        throw Errors.badRequest("Explicit replacement code is invalid or unavailable");
      }
      nextCodeId = explicit.id;
    } else {
      const available = await tx.giftCode.findFirst({
        where: { giftProductId: productId, status: "AVAILABLE", expiryDate: { not: null, gt: now } },
        orderBy: { createdAt: "asc" },
      });
      if (!available) {
        throw Errors.badRequest("No available codes in inventory to use for replacement. Please import fresh codes first.");
      }
      nextCodeId = available.id;
    }

    if (delivery.giftCodeId) {
      await tx.giftCode.update({
        where: { id: delivery.giftCodeId },
        data: {
          status: "CANCELLED",
          internalNote: `Replaced by admin ${actor.email}. Reason: ${reason}`,
        },
      });
    }

    await tx.giftCode.update({
      where: { id: nextCodeId },
      data: {
        status: "ASSIGNED",
        assignedOrderId: delivery.orderId,
        assignedAt: now,
      },
    });

    const note = delivery.adminNote
      ? `${delivery.adminNote}\n[Replacement by ${actor.email} on ${now.toISOString()}]: ${reason}`
      : `[Replacement by ${actor.email} on ${now.toISOString()}]: ${reason}`;

    const updatedDelivery = await tx.giftCodeDelivery.update({
      where: { id: deliveryId },
      data: {
        giftCodeId: nextCodeId,
        status: "ASSIGNED",
        assignedAt: now,
        adminNote: note,
      },
      include: { giftCode: { select: { maskedCode: true } } },
    });

    return updatedDelivery;
  });

  logger.info(`Admin ${actor.email} replaced code for delivery ${deliveryId}. New code: ${replacement.giftCodeId}`);
  return {
    deliveryId,
    newGiftCodeId: replacement.giftCodeId,
    maskedCode: replacement.giftCode?.maskedCode ?? "••••",
    status: replacement.status,
  };
}

// ------------------------------------------------------------------
// Super Admin manual refund override (PRD §48)
// ------------------------------------------------------------------

export async function superAdminRefundOverride(
  orderId: string,
  reason: string,
  actor: DeliveryActor,
) {
  if (actor.role !== "SUPER_ADMIN") {
    throw Errors.forbidden("Only a Super Admin may process exceptional gift-code refunds");
  }
  if (!reason?.trim()) throw Errors.badRequest("A recorded reason is mandatory for refunds");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: { where: { status: "CAPTURED" }, orderBy: { createdAt: "desc" }, take: 1 },
      giftDeliveries: { include: { giftCode: true } },
    },
  });

  if (!order || order.orderType !== "GIFT_CODE") throw Errors.notFound("Gift code order not found");
  if (order.status === "REFUNDED") throw Errors.badRequest("Order is already refunded");

  const payment = order.payments[0];

  await prisma.$transaction(async (tx) => {
    for (const d of order.giftDeliveries) {
      if (d.giftCodeId) {
        await tx.giftCode.update({
          where: { id: d.giftCodeId },
          data: {
            status: "CANCELLED",
            internalNote: `Refunded by super admin ${actor.email}: ${reason}`,
          },
        });
      }
      await tx.giftCodeDelivery.update({
        where: { id: d.id },
        data: {
          status: "FAILED",
          failureReason: `Refunded: ${reason}`,
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "REFUNDED" },
    });

    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED" },
      });
    }
  });

  logger.warn(`Super Admin ${actor.email} refunded gift order ${order.orderNumber}. Reason: ${reason}`);
  return { orderNumber: order.orderNumber, status: "REFUNDED", reason };
}

