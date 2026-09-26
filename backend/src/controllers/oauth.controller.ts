import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { Errors } from "../utils/errors";
import * as authService from "../services/auth.service";
import * as adminAuthService from "../services/adminAuth.service";
import * as googleAuthService from "../services/googleAuth.service";
import { loginSchema } from "../validators/auth.validators";
import { metaFrom } from "./auth.controller";

// ------------------------------------------------------------
// Google OAuth (PRD §7.2)
// ------------------------------------------------------------

export function googleAuthUrl(_req: Request, res: Response): void {
  if (!googleAuthService.isGoogleConfigured()) {
    res.status(503).json({
      error: { code: "NOT_CONFIGURED", message: "Google sign-in is not available" },
    });
    return;
  }
  const redirectUri = `${env.apiUrl}/api/auth/google/callback`;
  const url = googleAuthService.buildGoogleAuthUrl(redirectUri, "dm");
  res.json({ url, redirectUri });
}

/** 302 the browser straight to Google's consent screen. */
export function googleAuthRedirect(_req: Request, res: Response): void {
  if (!googleAuthService.isGoogleConfigured()) {
    res.status(503).send("Google sign-in is not available");
    return;
  }
  const redirectUri = `${env.apiUrl}/api/auth/google/callback`;
  const url = googleAuthService.buildGoogleAuthUrl(redirectUri, "dm");
  res.redirect(302, url);
}

/** Google redirects the browser back to the SPA with the code; the SPA posts it here. */
export function googleCallbackPage(req: Request, res: Response): void {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const error = typeof req.query.error === "string" ? req.query.error : "";
  const target = error
    ? `${env.appUrl}/login?google_error=1`
    : `${env.appUrl}/login?google_code=${encodeURIComponent(code)}`;
  res.redirect(302, target);
}

interface GoogleCallbackBody {
  code?: string;
}

export async function googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as GoogleCallbackBody;
    if (!body.code) throw Errors.badRequest("Missing Google authorization code");

    // Must match the redirect URI registered in Google Cloud Console
    const redirectUri = `${env.apiUrl}/api/auth/google/callback`;
    const profile = await googleAuthService.exchangeCodeForProfile(body.code, redirectUri);
    const result = await authService.googleAuth(profile, metaFrom(req));

    res.json({
      message: result.isNewUser ? "Account created with Google" : "Signed in with Google",
      user: result.user,
      token: result.token,
      isNewUser: result.isNewUser,
    });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------
// Admin auth
// ------------------------------------------------------------

export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const result = await adminAuthService.loginAdmin(input, metaFrom(req));
    res.json({ message: "Admin signed in", token: result.token, admin: result.admin });
  } catch (err) {
    next(err);
  }
}

export async function adminMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.admin) throw Errors.unauthorized("Admin authentication required");
    const admin = await adminAuthService.getAdminProfile(req.admin.id);
    res.json({ admin });
  } catch (err) {
    next(err);
  }
}
