import { env } from "../config/env";
import { Errors } from "../utils/errors";
import { logger } from "../utils/logger";

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
  emailVerified: boolean;
}

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function isGoogleConfigured(): boolean {
  return Boolean(env.google.clientId && env.google.clientSecret);
}

/** Build the URL the frontend should redirect the user to. */
export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  if (!isGoogleConfigured()) {
    throw Errors.internal("Google login is not configured on this server");
  }
  const params = new URLSearchParams({
    client_id: env.google.clientId as string,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Exchange an OAuth authorization code for the user's Google profile.
 */
export async function exchangeCodeForProfile(
  code: string,
  redirectUri: string,
): Promise<GoogleProfile> {
  if (!isGoogleConfigured()) {
    throw Errors.internal("Google login is not configured on this server");
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId as string,
      client_secret: env.google.clientSecret as string,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenRes.ok || !tokenData.access_token) {
    logger.warn("Google token exchange failed", tokenData.error_description ?? tokenData.error);
    throw Errors.badRequest("Google sign-in failed. Please try again.");
  }

  const userinfoRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userinfoRes.ok) {
    throw Errors.badRequest("Could not retrieve your Google profile. Please try again.");
  }

  const info = (await userinfoRes.json()) as GoogleUserInfo;
  if (!info.email) {
    throw Errors.badRequest("Your Google account does not expose an email address.");
  }

  return {
    googleId: info.sub,
    email: info.email.toLowerCase(),
    name: info.name ?? info.email.split("@")[0],
    picture: info.picture ?? null,
    emailVerified: Boolean(info.email_verified),
  };
}
