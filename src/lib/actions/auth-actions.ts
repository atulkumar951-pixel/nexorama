"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { audit, notify } from "@/lib/helpers";

export type FormState = { error?: string; success?: string };

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!name || name.length < 2) return { error: "Please enter your full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  try {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return { error: "An account with this email already exists. Please sign in." };

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: hashPassword(password), authMethod: "email" })
      .returning();

    await notify(user.id, "Welcome to Nexora! 👋", "Your account is ready. Browse the marketplace and start shopping.", "ACCOUNT");
    await createSession(user.id);
  } catch (err: any) {
    if (err?.message?.includes("NEXT_REDIRECT") || err?.digest?.includes("NEXT_REDIRECT")) throw err;
    console.error("registerAction error:", err);
    if (err?.message?.includes("tenant") || err?.message?.includes("ENOTFOUND") || err?.message?.includes("connect")) {
      return { error: "Database is unreachable. Please unpause or restore the database in Supabase." };
    }
    return { error: err?.message || "Failed to create account." };
  }
  redirect("/");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rawNext = String(formData.get("next") ?? "").trim();
  const next = rawNext && rawNext !== "/dashboard" && rawNext.startsWith("/") ? rawNext : "/";

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return { error: "Invalid email or password." };
    }
    if (user.status !== "ACTIVE") {
      return { error: "Your account is suspended. Please contact support." };
    }
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await createSession(user.id);
  } catch (err: any) {
    if (err?.message?.includes("NEXT_REDIRECT") || err?.digest?.includes("NEXT_REDIRECT")) throw err;
    console.error("loginAction error:", err);
    if (err?.message?.includes("tenant") || err?.message?.includes("ENOTFOUND") || err?.message?.includes("connect")) {
      return { error: "Database connection failed: The database is paused or unreachable in Supabase. Please unpause it in the Supabase dashboard." };
    }
    return { error: err?.message || "Failed to sign in." };
  }
  redirect(next);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "You must be signed in." };
    const current = String(formData.get("current") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password.length < 6) return { error: "New password must be at least 6 characters." };
    if (password !== confirm) return { error: "Passwords do not match." };

    const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!row?.passwordHash || !verifyPassword(current, row.passwordHash)) {
      return { error: "Current password is incorrect." };
    }
    await db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, user.id));
    await audit({ id: user.id, email: user.email }, "user.password_changed", "user", user.id);
    return { success: "Password updated successfully." };
  } catch (err: any) {
    return { error: err?.message || "Failed to update password." };
  }
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "You must be signed in." };
    const name = String(formData.get("name") ?? "").trim();
    if (!name || name.length < 2) return { error: "Please enter a valid name." };
    await db.update(users).set({ name }).where(eq(users.id, user.id));
    return { success: "Profile updated." };
  } catch (err: any) {
    return { error: err?.message || "Failed to update profile." };
  }
}
