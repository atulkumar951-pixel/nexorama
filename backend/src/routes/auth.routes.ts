import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import * as oauth from "../controllers/oauth.controller";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { authLimiter, sensitiveLimiter } from "../middleware/rateLimiter";

const router = Router();

// Public endpoints (rate limited per PRD §85)
router.post("/register", authLimiter, auth.register);
router.post("/login", authLimiter, auth.login);
router.post("/forgot-password", sensitiveLimiter, auth.forgotPassword);
router.post("/reset-password", sensitiveLimiter, auth.resetPassword);
router.post("/verify-email", sensitiveLimiter, auth.verifyEmail);
router.post("/resend-verification", sensitiveLimiter, auth.resendVerification);

// Google OAuth
router.get("/google/url", oauth.googleAuthUrl);
router.get("/google/url-redirect", oauth.googleAuthRedirect);
router.get("/google/callback", oauth.googleCallbackPage); // browser redirect from Google
router.post("/google/callback", authLimiter, oauth.googleCallback); // SPA posts the code

// Authenticated user endpoints
router.post("/logout", requireAuth, auth.logout);
router.get("/me", requireAuth, auth.me);
router.patch("/me", requireAuth, auth.updateProfile);
router.patch("/change-password", requireAuth, auth.changePassword);

// Admin authentication (separate identity space)
router.post("/admin/login", authLimiter, oauth.adminLogin);
router.get("/admin/me", requireAdmin("*"), oauth.adminMe);

export default router;
