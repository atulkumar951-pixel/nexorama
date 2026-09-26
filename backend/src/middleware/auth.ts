import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";
import { hashToken, randomToken } from "../utils/crypto";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  status: string;
  emailVerified: boolean;
  profileImage: string | null;
}

export interface AdminAuthUser {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "CONTENT_MANAGER" | "SUPPORT";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      admin?: AdminAuthUser;
      sessionToken?: string;
    }
  }
}

/** Issue a signed session token (JWT) bound to a DB session row. */
export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string,
): Promise<{ token: string; expiresAt: Date }> {
  const rawToken = randomToken(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      userAgent: userAgent?.slice(0, 255),
      ipAddress,
      expiresAt,
    },
  });

  const jwtToken = jwt.sign(
    { sub: userId, sid: hashToken(rawToken).slice(0, 16) },
    env.authSecret,
    { expiresIn: "7d" },
  );

  return { token: `${jwtToken}.${rawToken}`, expiresAt };
}

/** Revoke a session (logout). */
export async function revokeSession(compositeToken: string): Promise<void> {
  const [jwtPart, rawPart] = compositeToken.split(".");
  if (!jwtPart || !rawPart) return;
  try {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(rawPart), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // best-effort
  }
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

function loadUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      emailVerified: true,
      profileImage: true,
    },
  });
}

/** Require an authenticated, non-banned user. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearer(req);
    if (!token) throw Errors.unauthorized("Please sign in to continue");

    const [jwtPart, rawPart] = token.split(".");
    if (!jwtPart || !rawPart) throw Errors.unauthorized("Invalid session");

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(jwtPart, env.authSecret) as jwt.JwtPayload;
    } catch {
      throw Errors.unauthorized("Session expired. Please sign in again.");
    }
    if (!payload.sub) throw Errors.unauthorized();

    // Session must exist, not be revoked, and not be expired
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(rawPart) },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw Errors.unauthorized("Session expired. Please sign in again.");
    }

    const user = await loadUser(payload.sub);
    if (!user || user.status === "DELETED") throw Errors.unauthorized("Account not found");
    if (user.status === "BANNED") {
      throw Errors.forbidden("This account has been banned. Contact support.");
    }
    if (user.status === "SUSPENDED") {
      throw Errors.forbidden("This account is suspended. Contact support.");
    }

    req.user = user;
    req.sessionToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

/** Require an authenticated admin with one of the allowed roles. */
export function requireAdmin(...roles: Array<AdminAuthUser["role"] | "*">) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractBearer(req);
      if (!token) throw Errors.unauthorized("Admin authentication required");

      let payload: jwt.JwtPayload;
      try {
        payload = jwt.verify(token, env.authSecret) as jwt.JwtPayload;
      } catch {
        throw Errors.unauthorized("Admin session expired. Please sign in again.");
      }

      if (!payload.sub || payload.typ !== "admin") {
        throw Errors.unauthorized("Admin authentication required");
      }

      const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
      if (!admin || !admin.isActive) {
        throw Errors.unauthorized("Admin account is inactive");
      }

      if (roles[0] !== "*" && !roles.includes(admin.role)) {
        throw Errors.forbidden("You do not have permission for this action");
      }

      req.admin = { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Optional auth: attaches user if a valid token is present, never errors. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractBearer(req);
  if (token) {
    const [jwtPart, rawPart] = token.split(".");
    if (jwtPart && rawPart) {
      try {
        const payload = jwt.verify(jwtPart, env.authSecret) as jwt.JwtPayload;
        if (payload.sub) {
          const session = await prisma.session.findUnique({
            where: { tokenHash: hashToken(rawPart) },
          });
          if (session && !session.revokedAt && session.expiresAt > new Date()) {
            const user = await loadUser(payload.sub);
            if (user && user.status === "ACTIVE") {
              req.user = user;
            }
          }
        }
      } catch {
        // ignore — optional auth
      }
    }
  }
  next();
}

