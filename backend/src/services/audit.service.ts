import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export interface AuditInput {
  actorAdminId?: string | null;
  actorEmail?: string | null;
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  description?: string | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Append-only audit trail (PRD §73, §74).
 * Audit writes must never break the business flow they describe.
 */
export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorAdminId: input.actorAdminId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        description: input.description ?? null,
        oldValue: input.oldValue ?? undefined,
        newValue: input.newValue ?? undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent?.slice(0, 255) ?? null,
      },
    });
  } catch {
    // best-effort: never surface audit failures to callers
  }
}

/** Convenience wrapper carrying request metadata into the audit entry. */
export function auditFromRequest(
  req: { admin?: { id: string; email: string; role: string }; headers: Record<string, unknown>; ip?: string; socket: { remoteAddress?: string } },
  input: Omit<AuditInput, "actorAdminId" | "actorEmail" | "ipAddress" | "userAgent">,
): Promise<void> {
  const xf = req.headers["x-forwarded-for"];
  const ip = typeof xf === "string" && xf.length > 0 ? xf.split(",")[0].trim() : (req.ip ?? req.socket.remoteAddress ?? null);
  const ua = typeof req.headers["user-agent"] === "string" ? (req.headers["user-agent"] as string) : null;
  return writeAuditLog({
    ...input,
    actorAdminId: req.admin?.id ?? null,
    actorEmail: req.admin?.email ?? null,
    ipAddress: ip,
    userAgent: ua,
  });
}

export async function listAuditLogs(options: { page?: number; limit?: number; action?: string; targetType?: string }) {
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const page = Math.max(1, options.page ?? 1);
  const where: Prisma.AuditLogWhereInput = {};
  if (options.action) where.action = options.action as AuditAction;
  if (options.targetType) where.targetType = options.targetType;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
    }),
  ]);

  return { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
