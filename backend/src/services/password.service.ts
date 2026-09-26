import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";
import { hashPassword, validatePasswordStrength, verifyPassword } from "../utils/password";
import { consumeToken, issueToken, sendPasswordResetEmail, sendVerificationEmail } from "./verification.service";
import type { ChangePasswordInput } from "../validators/auth.validators";
import { UserStatus } from "@prisma/client";

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always silent success — avoid account enumeration (PRD §84)
  if (!user || user.status === "DELETED") return;

  const { token } = await issueToken({ email, purpose: "PASSWORD_RESET" });
  await sendPasswordResetEmail(email, token);
}

export async function resetPassword(input: { token: string; password: string }): Promise<void> {
  const identifier = await consumeToken(input.token, "PASSWORD_RESET");
  if (!identifier) {
    throw Errors.badRequest("This reset link is invalid or has expired. Please request a new one.");
  }

  const weakness = validatePasswordStrength(input.password);
  if (weakness) throw Errors.badRequest(weakness);

  const user = await prisma.user.findUnique({ where: { email: identifier } });
  if (!user) throw Errors.badRequest("This reset link is invalid or has expired.");

  const passwordHash = await hashPassword(input.password);

  // Password reset invalidates all existing sessions for safety (PRD §9)
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound("Account not found");

  if (user.passwordHash) {
    const valid = await verifyPassword(user.passwordHash, input.currentPassword);
    if (!valid) throw Errors.badRequest("Your current password is incorrect");
  }

  const weakness = validatePasswordStrength(input.newPassword);
  if (weakness) throw Errors.badRequest(weakness);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
}

export async function verifyEmail(token: string): Promise<{ email: string }> {
  const identifier = await consumeToken(token, "EMAIL_VERIFICATION");
  if (!identifier) {
    throw Errors.badRequest("This verification link is invalid or has expired.");
  }

  const user = await prisma.user.findUnique({ where: { email: identifier } });
  if (!user) throw Errors.badRequest("This verification link is invalid or has expired.");

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, status: UserStatus.ACTIVE },
  });

  return { email: user.email };
}

export async function resendVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Silent success when nothing to do — avoid enumeration
  if (!user || user.emailVerified || user.status === "DELETED") return;

  const { token } = await issueToken({ email, purpose: "EMAIL_VERIFICATION" });
  await sendVerificationEmail(user.email, user.name, token);
}
