import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { randomToken, hashToken } from "../utils/crypto";
import { emailTemplate, sendEmail } from "./email.service";
import { VerificationPurpose } from "@prisma/client";

interface IssuedToken {
  token: string;
  expiresAt: Date;
}

/** Create a one-time token and email the action link to the user. */
export async function issueToken(options: {
  email: string;
  purpose: VerificationPurpose;
}): Promise<IssuedToken> {
  // Invalidate previous unused tokens of the same purpose
  await prisma.verificationToken.updateMany({
    where: { identifier: options.email, purpose: options.purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomToken(32);
  const ttlMs =
    options.purpose === VerificationPurpose.EMAIL_VERIFICATION
      ? env.verification.emailTokenTtlHours * 60 * 60 * 1000
      : env.verification.resetTokenTtlMinutes * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  await prisma.verificationToken.create({
    data: {
      identifier: options.email,
      token: hashToken(token),
      purpose: options.purpose,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Consume a one-time token. Returns the identifier (email) when valid,
 * or null when the token is missing, expired, already used, or mismatched.
 */
export async function consumeToken(
  token: string,
  purpose: VerificationPurpose,
): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(token) },
  });

  if (
    !record ||
    record.purpose !== purpose ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    return null;
  }

  await prisma.verificationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.identifier;
}

export async function sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
  const link = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: `Verify your email — ${env.appName}`,
    html: emailTemplate(
      `Welcome, ${name}!`,
      `<p>Thanks for creating an account on <strong>${env.appName}</strong>.</p>
       <p>Please confirm your email address to unlock the full platform. This link is valid for ${env.verification.emailTokenTtlHours} hours.</p>`,
      { label: "Verify Email Address", url: link },
    ),
    text: `Welcome to ${env.appName}! Verify your email: ${link}`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const link = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: `Reset your password — ${env.appName}`,
    html: emailTemplate(
      "Password Reset Request",
      `<p>We received a request to reset the password for your account.</p>
       <p>This link is valid for ${env.verification.resetTokenTtlMinutes} minutes. If you didn't request it, you can safely ignore this email.</p>`,
      { label: "Reset Password", url: link },
    ),
    text: `Reset your password: ${link}`,
  });
}
