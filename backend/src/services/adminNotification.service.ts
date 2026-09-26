import { prisma } from "../config/prisma";

/**
 * Internal operations alerts (PRD §52, §66, §94).
 * These are deliberately separate from customer notifications — they must never
 * carry a raw gift code, only identifiers and amounts.
 */

export interface AdminAlertInput {
  title: string;
  message: string;
  type?: "GIFT_CODE" | "SYSTEM";
  severity?: "INFO" | "WARNING" | "CRITICAL";
  link?: string;
  targetId?: string;
}

/** Never throws — an alert failure must not break a payment flow. */
export async function alertAdmins(input: AdminAlertInput): Promise<void> {
  try {
    await prisma.adminNotification.create({
      data: {
        title: input.title,
        message: input.message,
        type: input.type ?? "GIFT_CODE",
        severity: input.severity ?? "INFO",
        link: input.link ?? null,
        targetId: input.targetId ?? null,
      },
    });
  } catch {
    // best-effort
  }
}

export async function listAdminNotifications(options: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const page = Math.max(1, options.page ?? 1);
  const where = options.unreadOnly ? { readAt: null } : {};

  const [total, unread, notifications] = await Promise.all([
    prisma.adminNotification.count({ where }),
    prisma.adminNotification.count({ where: { readAt: null } }),
    prisma.adminNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { notifications, unread, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function markAdminNotificationRead(id: string): Promise<void> {
  await prisma.adminNotification.updateMany({ where: { id, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  await prisma.adminNotification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
}
