import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { Errors } from "../utils/errors";
import { verifyPassword } from "../utils/password";

/** Admin login — separate identity space from customers (PRD §6, §8.1). */
export async function loginAdmin(
  input: { email: string; password: string },
  meta: { ip?: string; userAgent?: string },
): Promise<{ token: string; admin: { id: string; name: string; email: string; role: string } }> {
  const admin = await prisma.admin.findUnique({ where: { email: input.email } });
  if (!admin || !admin.isActive) {
    throw Errors.unauthorized("Invalid admin credentials");
  }

  const valid = await verifyPassword(admin.passwordHash, input.password);
  if (!valid) throw Errors.unauthorized("Invalid admin credentials");

  // 12h tokens for admins; role is embedded for quick checks but always
  // re-verified server-side in requireAdmin (PRD §60)
  const token = jwt.sign(
    { sub: admin.id, typ: "admin", role: admin.role },
    env.authSecret,
    { expiresIn: "12h" },
  );

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    token,
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  };
}

export async function getAdminProfile(adminId: string) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isActive) throw Errors.unauthorized("Admin account is inactive");
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    lastLoginAt: admin.lastLoginAt,
  };
}
