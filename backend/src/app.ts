import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config/env";
import { apiLimiter } from "./middleware/rateLimiter";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import { attachMarketplaceMode } from "./middleware/modeGuard";
import authRoutes from "./routes/auth.routes";
import catalogRoutes from "./routes/catalog.routes";
import giftRoutes from "./routes/gift.routes";
import giftAdminRoutes from "./routes/giftAdmin.routes";
import { getMarketplaceMode } from "./services/settings.service";

const app = express();

// Security headers (PRD §84)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS — frontend origins only
app.use(
  cors({
    origin: [env.appUrl, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// Request logging
if (!env.isProd) {
  app.use(morgan("dev"));
}

// Health check for Render/Vercel monitoring
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "digital-marketplace-api", time: new Date().toISOString() });
});

// Mode probe (publicly consumable by frontends to adapt navigation / theme)
app.get("/api/marketplace-mode", async (_req, res, next) => {
  try {
    const mode = await getMarketplaceMode();
    res.json({ mode });
  } catch (err) {
    next(err);
  }
});

// Global rate limit
app.use("/api", apiLimiter);
app.use(attachMarketplaceMode);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/gift", giftRoutes);
app.use("/api/admin/gift", giftAdminRoutes);
app.use("/api", catalogRoutes);

// 404 + errors
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
