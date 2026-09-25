import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

function handler(_req: Request, res: Response): void {
  res.status(429).json({
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please slow down and try again shortly.",
    },
  });
}

const standard = {
  standardHeaders: true as const,
  legacyHeaders: false,
  handler,
};

/** Stricter limit for authentication endpoints (PRD §85). */
export const authLimiter = rateLimit({
  ...standard,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: undefined,
});

/** Password reset / email verification — stricter (PRD §85). */
export const sensitiveLimiter = rateLimit({
  ...standard,
  windowMs: 60 * 60 * 1000,
  max: 10,
});

/** Coupon validation / payment creation. */
export const commerceLimiter = rateLimit({
  ...standard,
  windowMs: 60 * 1000,
  max: 30,
});

/** Download-link generation. */
export const downloadLimiter = rateLimit({
  ...standard,
  windowMs: 60 * 1000,
  max: 20,
});

/** General API. */
export const apiLimiter = rateLimit({
  ...standard,
  windowMs: 60 * 1000,
  max: 300,
});
