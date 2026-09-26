import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";
import { hashPassword, verifyPassword } from "../utils/password";
import { createSession } from "../middleware/auth";
import { issueToken, sendVerificationEmail } from "./verification.service";
import { notifyUser } from "./notification.service";
import type { RegisterInput, LoginInput } from "../validators/auth.validators";
import { UserStatus } from "@prisma/client";

export function publicUser(user: {
  id: string; name: string; email: string; profileImage: string | null;
  phone: string | null; emailVerified: boolean; status: UserStatus;
  authProvider: string; createdAt: Date; lastLoginAt: Date | null;
}) {
  return {
    id: user.id, name: user.name, email: user.email,
    profileImage: user.profileImage, phone: user.phone,
    emailVerified: user.emailVerified, status: user.status,
    authProvider: user.authProvider, createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export async function registerUser(
  input: RegisterInput,
  meta: { userAgent?: string; ip?: string },
): Promise<{ user: ReturnType<typeof publicUser>; token: string; verificationRequired: boolean }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Errors.conflict("An account with this email already exists. Try signing in instead.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone ?? null,
      authProvider: "EMAIL",
      // Unverified users stay restricted until they confirm their email (PRD §8)
      status: UserStatus.PENDING_VERIFICATION,
    },
  });

  const { token } = await issueToken({ email: user.email, purpose: "EMAIL_VERIFICATION" });
  await sendVerificationEmail(user.email, user.name, token);

  await notifyUser({
    userId: user.id,
    title: "Welcome to the marketplace!",
    message: "Your account has been created. Verify your email to unlock purchasing.",
    type: "ACCOUNT",
    email: { to: user.email },
  });

  const session = await createSession(user.id, meta.userAgent, meta.ip);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { user: publicUser(user), token: session.token, verificationRequired: true };
}

export async function loginUser(
  input: LoginInput,
  meta: { userAgent?: string; ip?: string },
): Promise<{ user: ReturnType<typeof publicUser>; token: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Uniform error to avoid user enumeration (PRD §84)
  if (!user || !user.passwordHash || user.status === "DELETED") {
    throw Errors.unauthorized("Invalid email or password");
  }
  if (user.status === "BANNED") {
    throw Errors.forbidden("This account has been banned. Contact support.");
  }
  if (user.status === "SUSPENDED") {
    throw Errors.forbidden("This account is suspended. Contact support.");
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) throw Errors.unauthorized("Invalid email or password");

  const session = await createSession(user.id, meta.userAgent, meta.ip);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { user: publicUser(user), token: session.token };
}

/** Google sign-in/sign-up (PRD §7.2). Creates or links accounts. */
export async function googleAuth(
  profile: {
    googleId: string; email: string; name: string;
    picture: string | null; emailVerified: boolean;
  },
  meta: { userAgent?: string; ip?: string },
): Promise<{ user: ReturnType<typeof publicUser>; token: string; isNewUser: boolean }> {
  let user = await prisma.user.findUnique({ where: { email: profile.email } });
  let isNewUser = false;

  if (!user || user.status === "DELETED") {
    user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        profileImage: profile.picture,
        googleId: profile.googleId,
        authProvider: "GOOGLE",
        emailVerified: profile.emailVerified,
        status: profile.emailVerified ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION,
      },
    });
    isNewUser = true;
    await notifyUser({
      userId: user.id,
      title: "Welcome to the marketplace!",
      message: "Your account has been created with Google. Start exploring products now.",
      type: "ACCOUNT",
      email: { to: user.email },
    });
  } else {
    if (user.status === "BANNED") {
      throw Errors.forbidden("This account has been banned. Contact support.");
    }
    if (user.status === "SUSPENDED") {
      throw Errors.forbidden("This account is suspended. Contact support.");
    }
    if (!user.googleId) {
      // Link Google identity to the existing email account
      await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          profileImage: user.profileImage ?? profile.picture,
          emailVerified: user.emailVerified || profile.emailVerified,
        },
      });
    }
  }

  const session = await createSession(user.id, meta.userAgent, meta.ip);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { user: publicUser(user), token: session.token, isNewUser };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status === "DELETED") throw Errors.notFound("Account not found");
  return publicUser(user);
}

export async function updateProfile(
  userId: string,
  data: { name?: string; phone?: string | null; profileImage?: string | null },
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.profileImage !== undefined ? { profileImage: data.profileImage } : {}),
    },
  });
  return publicUser(user);
}

