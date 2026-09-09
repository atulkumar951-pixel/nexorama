import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";
import { notify } from "@/lib/helpers";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const next = searchParams.get("state") || "/dashboard";

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "digimart9.vercel.app";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=Google authentication was cancelled or failed.`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/login?error=Google OAuth credentials missing on server.`);
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Failed to exchange Google OAuth code:", tokenData);
      return NextResponse.redirect(`${origin}/login?error=Failed to authenticate with Google.`);
    }

    // 2. Fetch user profile
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userRes.json();
    if (!userRes.ok || !profile.email) {
      return NextResponse.redirect(`${origin}/login?error=Failed to retrieve Google profile.`);
    }

    const email = String(profile.email).toLowerCase();
    const name = profile.name || email.split("@")[0];
    const image = profile.picture || null;

    // 3. Find or create user
    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (user) {
      if (user.status !== "ACTIVE") {
        return NextResponse.redirect(`${origin}/login?error=Your account is suspended.`);
      }
      await db
        .update(users)
        .set({
          name: user.name || name,
          image: image || user.image,
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, user.id));
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          name,
          email,
          image,
          authMethod: "google",
          emailVerified: true,
          role: "user",
          status: "ACTIVE",
        })
        .returning();
      user = newUser;
      await notify(user.id, "Welcome to Nexora! 👋", "Signed up with Google successfully.", "ACCOUNT");
    }

    await createSession(user.id);
    return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/dashboard"}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(`${origin}/login?error=Unexpected error during Google sign-in.`);
  }
}
