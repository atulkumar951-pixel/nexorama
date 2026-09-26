import type { NextFunction, Request, Response } from "express";
import { getMarketplaceMode, isGiftModeActive, isDigitalModeActive } from "../services/settings.service";
import { Errors } from "../utils/errors";

/**
 * Ensures customer traffic only reaches the Gift Codes marketplace when the
 * platform is running in GIFT_CODES mode (PRD §4, §35).
 * Admin routes are exempt so that staff can configure either mode at any time.
 */
export async function requireGiftMode(_req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const active = await isGiftModeActive();
    if (!active) {
      throw Errors.featureNotAvailable(
        "Gift Codes marketplace is currently unavailable. Please visit our Digital Products catalog.",
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Ensures customer traffic only reaches the Digital marketplace when the
 * platform is running in DIGITAL mode (PRD §4, §35).
 */
export async function requireDigitalMode(_req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const active = await isDigitalModeActive();
    if (!active) {
      throw Errors.featureNotAvailable(
        "Digital Products marketplace is currently unavailable. Please visit our Gift Codes catalog.",
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Attaches the current marketplace mode to `req.marketplaceMode` for observability
 * without rejecting requests.
 */
export async function attachMarketplaceMode(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    (req as any).marketplaceMode = await getMarketplaceMode();
  } catch {
    (req as any).marketplaceMode = "DIGITAL";
  }
  next();
}
