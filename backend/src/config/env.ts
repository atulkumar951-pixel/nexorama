import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name];
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV") ?? "development",
  isProd: process.env.NODE_ENV === "production",

  appName: optional("APP_NAME") ?? "Digital Marketplace",
  appUrl: optional("APP_URL") ?? "http://localhost:3000",

  port: num("API_PORT", 5000),
  apiUrl: optional("API_URL") ?? "http://localhost:5000",

  databaseUrl: required("DATABASE_URL"),

  authSecret: required("AUTH_SECRET", "dev-only-secret-change-me-in-production-0123456789abcdef0123456789abcdef"),
  jwtExpiresIn: optional("JWT_EXPIRES_IN") ?? "7d",
  sessionCookieName: optional("SESSION_COOKIE_NAME") ?? "dm_session",

  google: {
    clientId: optional("GOOGLE_CLIENT_ID"),
    clientSecret: optional("GOOGLE_CLIENT_SECRET"),
  },

  razorpay: {
    keyId: optional("RAZORPAY_KEY_ID"),
    keySecret: optional("RAZORPAY_KEY_SECRET"),
    webhookSecret: optional("RAZORPAY_WEBHOOK_SECRET"),
  },

  storage: {
    driver: optional("STORAGE_DRIVER") ?? "local",
    localRoot: optional("STORAGE_LOCAL_ROOT") ?? "./private-storage",
    accessKey: optional("STORAGE_ACCESS_KEY"),
    secretKey: optional("STORAGE_SECRET_KEY"),
    bucket: optional("STORAGE_BUCKET"),
    region: optional("STORAGE_REGION"),
    endpoint: optional("STORAGE_ENDPOINT"),
    signedUrlTtlMinutes: num("SIGNED_URL_TTL_MINUTES", 10),
  },

  email: {
    driver: optional("EMAIL_DRIVER") ?? "console",
    from: optional("EMAIL_FROM") ?? "Digital Marketplace <no-reply@example.com>",
    smtpHost: optional("SMTP_HOST"),
    smtpPort: num("SMTP_PORT", 587),
    smtpUser: optional("SMTP_USER"),
    smtpPass: optional("SMTP_PASS"),
    apiKey: optional("EMAIL_API_KEY"),
  },

  // Uploads
  uploads: {
    maxFileSizeMb: num("MAX_FILE_SIZE_MB", 200),
    allowedExtensions: (
      optional("ALLOWED_EXTENSIONS") ??
      "pdf,zip,doc,docx,ppt,pptx,xls,xlsx,txt,mp4,epub,png,jpg,jpeg,webp"
    )
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  },

  // Auth limits
  verification: {
    emailTokenTtlHours: num("EMAIL_TOKEN_TTL_HOURS", 24),
    resetTokenTtlMinutes: num("RESET_TOKEN_TTL_MINUTES", 30),
  },

  // Gift Codes Mode (extension feature)
  giftCodes: {
    /** Dedicated 32-byte (hex/base64) key for AES-256-GCM code encryption. */
    encryptionKey: optional("GIFT_CODE_ENCRYPTION_KEY"),
    /** Defaults applied when the DB settings row is absent. */
    defaultReservationMinutes: num("GIFT_RESERVATION_MINUTES", 10),
    defaultLowStockThreshold: num("GIFT_LOW_STOCK_THRESHOLD", 10),
    defaultMaxQuantityPerOrder: num("GIFT_MAX_QUANTITY_PER_ORDER", 5),
    defaultDeliveryTargetMinutes: num("GIFT_DELIVERY_TARGET_MINUTES", 5),
    defaultMaxQuantityPerUserPerDay: num("GIFT_MAX_QUANTITY_PER_USER_PER_DAY", 0),
  },
} as const;
