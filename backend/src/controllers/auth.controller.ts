import type { NextFunction, Request, Response } from "express";
import { Errors } from "../utils/errors";
import { revokeSession } from "../middleware/auth";
import * as authService from "../services/auth.service";
import * as passwordService from "../services/password.service";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../validators/auth.validators";

export function metaFrom(req: Request): { userAgent?: string; ip?: string } {
  return {
    userAgent: req.headers["user-agent"],
    ip:
      (typeof req.headers["x-forwarded-for"] === "string"
        ? (req.headers["x-forwarded-for"] as string).split(",")[0].trim()
        : undefined) ?? req.ip,
  };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.registerUser(input, metaFrom(req));
    res.status(201).json({
      message: "Account created. Please verify your email address.",
      user: result.user,
      token: result.token,
      verificationRequired: result.verificationRequired,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.loginUser(input, metaFrom(req));
    res.json({ message: "Signed in successfully", user: result.user, token: result.token });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.sessionToken) await revokeSession(req.sessionToken);
    res.json({ message: "Signed out successfully" });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw Errors.unauthorized();
    const profile = await authService.getProfile(req.user.id);
    res.json({ user: profile });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw Errors.unauthorized();
    const input = updateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.user.id, input);
    res.json({ message: "Profile updated", user });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw Errors.unauthorized();
    const input = changePasswordSchema.parse(req.body);
    await passwordService.changePassword(req.user.id, input);
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    await passwordService.forgotPassword(input.email);
    res.json({ message: "If an account exists for this email, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = resetPasswordSchema.parse(req.body);
    await passwordService.resetPassword({ token: input.token, password: input.password });
    res.json({ message: "Password reset successfully. You can now sign in." });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = verifyEmailSchema.parse(req.body);
    const result = await passwordService.verifyEmail(input.token);
    res.json({ message: "Email verified successfully", email: result.email });
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = resendVerificationSchema.parse(req.body);
    await passwordService.resendVerification(input.email);
    res.json({
      message: "If an unverified account exists for this email, a new link has been sent.",
    });
  } catch (err) {
    next(err);
  }
}
