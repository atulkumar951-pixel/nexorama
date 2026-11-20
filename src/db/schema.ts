import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  varchar,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------------- Users & Auth ----------------
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash"),
    image: text("image"),
    role: varchar("role", { length: 20 }).notNull().default("user"), // user | admin | super_admin
    status: varchar("status", { length: 20 }).notNull().default("ACTIVE"), // ACTIVE | SUSPENDED | BANNED
    emailVerified: boolean("email_verified").notNull().default(true),
    authMethod: varchar("auth_method", { length: 20 }).notNull().default("email"), // email | google
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at"),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    token: varchar("token", { length: 128 }).notNull(),
    userId: integer("user_id").notNull().references(() => users.id),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_idx").on(t.token)]
);

// ---------------- Catalog ----------------
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description"),
    emoji: varchar("emoji", { length: 16 }).default("📚"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug)]
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    shortDescription: varchar("short_description", { length: 300 }),
    description: text("description"),
    categoryId: integer("category_id").references(() => categories.id),
    productType: varchar("product_type", { length: 20 }).notNull().default("PDF"), // PDF | ZIP | DOCUMENT | EBOOK | COURSE | BUNDLE
    coverImage: text("cover_image"),
    price: integer("price").notNull().default(0), // in INR (whole rupees)
    salePrice: integer("sale_price"), // null => no sale
    isFree: boolean("is_free").notNull().default(false),
    status: varchar("status", { length: 20 }).notNull().default("DRAFT"), // DRAFT | PUBLISHED | UNPUBLISHED | ARCHIVED
    isFeatured: boolean("is_featured").notNull().default(false),
    downloadLimit: integer("download_limit").notNull().default(5), // 0 = unlimited
    accessDays: integer("access_days"), // null = lifetime
    salesCount: integer("sales_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    publishedAt: timestamp("published_at"),
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_status_idx").on(t.status),
  ]
);

export const productAssets = pgTable("product_assets", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 20 }).notNull().default("pdf"),
  fileSize: integer("file_size").notNull().default(0), // bytes
  storageKey: varchar("storage_key", { length: 255 }).notNull(),
  fileData: text("file_data"), // base64 data for database-stored files on serverless
  externalUrl: text("external_url"), // direct external link (Google Drive, S3, Dropbox, etc.)
  isPreview: boolean("is_preview").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productLectures = pgTable("product_lectures", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  chapterTitle: varchar("chapter_title", { length: 200 }).default("Chapter 1"),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  externalUrl: text("external_url").notNull(),
  provider: varchar("provider", { length: 40 }).default("YouTube"),
  duration: varchar("duration", { length: 20 }),
  sortOrder: integer("sort_order").notNull().default(0),
  isPreview: boolean("is_preview").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------- Cart & Wishlist ----------------
export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    productId: integer("product_id").notNull().references(() => products.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cart_user_product_idx").on(t.userId, t.productId)]
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    productId: integer("product_id").notNull().references(() => products.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("wishlist_user_product_idx").on(t.userId, t.productId)]
);

// ---------------- Coupons ----------------
export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    type: varchar("type", { length: 10 }).notNull().default("PERCENT"), // PERCENT | FIXED
    value: integer("value").notNull(),
    minOrder: integer("min_order").notNull().default(0),
    maxDiscount: integer("max_discount"), // null = no cap
    usageLimit: integer("usage_limit"), // null = unlimited
    perUserLimit: integer("per_user_limit").notNull().default(1),
    usedCount: integer("used_count").notNull().default(0),
    startsAt: timestamp("starts_at"),
    expiresAt: timestamp("expires_at"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("coupons_code_idx").on(t.code)]
);

export const couponUsages = pgTable("coupon_usages", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull().references(() => coupons.id),
  userId: integer("user_id").notNull().references(() => users.id),
  orderId: integer("order_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------- Orders & Payments ----------------
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: varchar("order_number", { length: 40 }).notNull(),
    userId: integer("user_id").notNull().references(() => users.id),
    orderType: varchar("order_type", { length: 30 }).notNull().default("DIGITAL_PRODUCT"), // DIGITAL_PRODUCT | GIFT_CODE
    emailSnapshot: varchar("email_snapshot", { length: 255 }),
    subtotal: integer("subtotal").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    couponCode: varchar("coupon_code", { length: 40 }),
    couponDiscount: integer("coupon_discount").notNull().default(0),
    total: integer("total").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("INR"),
    status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING | PAID | COMPLETED | CANCELLED | REFUNDED
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("orders_number_idx").on(t.orderNumber)]
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  giftProductId: integer("gift_product_id"),
  itemType: varchar("item_type", { length: 30 }).notNull().default("DIGITAL_PRODUCT"), // DIGITAL_PRODUCT | GIFT_CODE
  title: varchar("title", { length: 200 }).notNull(),
  denomination: integer("denomination"),
  quantity: integer("quantity").notNull().default(1),
  price: integer("price").notNull().default(0),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  userId: integer("user_id").notNull().references(() => users.id),
  provider: varchar("provider", { length: 20 }).notNull().default("RAZORPAY"), // RAZORPAY | TEST
  razorpayOrderId: varchar("razorpay_order_id", { length: 80 }),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 80 }),
  amount: integer("amount").notNull().default(0),
  currency: varchar("currency", { length: 8 }).notNull().default("INR"),
  status: varchar("status", { length: 30 }).notNull().default("CREATED"), // CREATED | CAPTURED | FAILED | REFUNDED | PARTIALLY_REFUNDED
  method: varchar("method", { length: 40 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull().references(() => payments.id),
  orderId: integer("order_id").notNull().references(() => orders.id),
  amount: integer("amount").notNull(),
  reason: text("reason"),
  revokeAccess: boolean("revoke_access").notNull().default(true),
  status: varchar("status", { length: 20 }).notNull().default("COMPLETED"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------- Access & Downloads ----------------
export const accessGrants = pgTable(
  "access_grants",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    productId: integer("product_id").notNull().references(() => products.id),
    orderId: integer("order_id").references(() => orders.id),
    status: varchar("status", { length: 20 }).notNull().default("ACTIVE"), // ACTIVE | REVOKED | EXPIRED | REFUNDED
    grantedAt: timestamp("granted_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"), // null = lifetime
    revokedAt: timestamp("revoked_at"),
    reason: text("reason"),
  },
  (t) => [index("grants_user_idx").on(t.userId, t.productId)]
);

export const downloads = pgTable(
  "downloads",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    productId: integer("product_id").notNull().references(() => products.id),
    assetId: integer("asset_id").notNull().references(() => productAssets.id),
    token: varchar("token", { length: 128 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("CREATED"), // CREATED | COMPLETED | EXPIRED
    ipAddress: varchar("ip_address", { length: 64 }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [uniqueIndex("downloads_token_idx").on(t.token)]
);

// ---------------- Notifications, Banners, Audit ----------------
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 30 }).notNull().default("INFO"), // INFO | PURCHASE | REFUND | PROMO | ACCOUNT
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  subtitle: varchar("subtitle", { length: 300 }),
  image: text("image"),
  buttonText: varchar("button_text", { length: 60 }),
  buttonUrl: varchar("button_url", { length: 255 }),
  position: varchar("position", { length: 20 }).notNull().default("PROMO"), // HERO | PROMO
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => users.id),
  actorEmail: varchar("actor_email", { length: 255 }),
  action: varchar("action", { length: 120 }).notNull(),
  targetType: varchar("target_type", { length: 60 }),
  targetId: varchar("target_id", { length: 60 }),
  detail: text("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  ticketNo: varchar("ticket_no", { length: 40 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  problem: text("problem").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("OPEN"), // OPEN | IN_PROGRESS | RESOLVED | CLOSED
  resolutionTimeframe: varchar("resolution_timeframe", { length: 60 }).notNull().default("24-72 hours"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lectureProgress = pgTable(
  "lecture_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    lectureId: integer("lecture_id").notNull().references(() => productLectures.id),
    completed: boolean("completed").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("progress_user_lecture_idx").on(t.userId, t.lectureId)]
);

// ---------------- Platform Settings & Marketplace Mode (PRD §2, §76, §80, §106) ----------------
export const platformSettings = pgTable(
  "platform_settings",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 80 }).notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("platform_settings_key_idx").on(t.key)]
);

// ---------------- Gift Code Categories (PRD §7, §103) ----------------
export const giftCategories = pgTable(
  "gift_categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description"),
    image: text("image"),
    icon: varchar("icon", { length: 40 }).default("🎁"),
    status: varchar("status", { length: 20 }).notNull().default("ACTIVE"), // ACTIVE | INACTIVE
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("gift_categories_slug_idx").on(t.slug)]
);

// ---------------- Gift Code Products (PRD §9, §10, §11, §103) ----------------
export const giftProducts = pgTable(
  "gift_products",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id").references(() => giftCategories.id),
    brandName: varchar("brand_name", { length: 120 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    description: text("description"),
    terms: text("terms"),
    instructions: text("instructions"),
    image: text("image"),
    denomination: integer("denomination").notNull().default(0), // Gift Card Value (₹)
    sellingPrice: integer("selling_price").notNull().default(0), // Selling Price (₹)
    currency: varchar("currency", { length: 8 }).notNull().default("INR"),
    status: varchar("status", { length: 20 }).notNull().default("DRAFT"), // DRAFT | PUBLISHED | UNPUBLISHED | ARCHIVED
    isFeatured: boolean("is_featured").notNull().default(false),
    purchaseLimit: integer("purchase_limit").notNull().default(5),
    allowCoupon: boolean("allow_coupon").notNull().default(false),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("gift_products_slug_idx").on(t.slug),
    index("gift_products_category_idx").on(t.categoryId),
    index("gift_products_brand_idx").on(t.brandName),
    index("gift_products_status_idx").on(t.status),
  ]
);

// ---------------- Gift Codes Inventory (PRD §13, §14, §20, §42, §61, §103) ----------------
export const giftCodes = pgTable(
  "gift_codes",
  {
    id: serial("id").primaryKey(),
    giftProductId: integer("gift_product_id").notNull().references(() => giftProducts.id),
    encryptedCode: text("encrypted_code").notNull(),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    maskedCode: varchar("masked_code", { length: 80 }).notNull(),
    batchLabel: varchar("batch_label", { length: 120 }),
    internalNote: text("internal_note"),
    expiryDate: timestamp("expiry_date"),
    status: varchar("status", { length: 20 }).notNull().default("AVAILABLE"), // AVAILABLE | RESERVED | ASSIGNED | SOLD | EXPIRED | CANCELLED
    assignedOrderId: integer("assigned_order_id").references(() => orders.id),
    assignedAt: timestamp("assigned_at"),
    soldAt: timestamp("sold_at"),
    importedByAdminId: integer("imported_by_admin_id").references(() => users.id),
    lastViewedAt: timestamp("last_viewed_at"),
    lastViewedByAdminId: integer("last_viewed_by_admin_id").references(() => users.id),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("gift_codes_product_hash_idx").on(t.giftProductId, t.codeHash),
    index("gift_codes_product_status_idx").on(t.giftProductId, t.status),
    index("gift_codes_status_idx").on(t.status),
    index("gift_codes_assigned_order_idx").on(t.assignedOrderId),
  ]
);

// ---------------- Gift Code Reservations (PRD §22, §23, §59, §60) ----------------
export const giftCodeReservations = pgTable(
  "gift_code_reservations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    giftProductId: integer("gift_product_id").notNull().references(() => giftProducts.id),
    quantity: integer("quantity").notNull().default(1),
    reservationToken: varchar("reservation_token", { length: 128 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("ACTIVE"), // ACTIVE | EXPIRED | CONVERTED | CANCELLED
    expiresAt: timestamp("expires_at").notNull(),
    releasedAt: timestamp("released_at"),
    convertedOrderId: integer("converted_order_id").references(() => orders.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("gift_reservations_token_idx").on(t.reservationToken),
    index("gift_reservations_user_idx").on(t.userId, t.status),
    index("gift_reservations_product_idx").on(t.giftProductId, t.status),
    index("gift_reservations_expires_idx").on(t.expiresAt),
  ]
);

// ---------------- Gift Code Deliveries (PRD §18, §19, §47, §48, §62) ----------------
export const giftCodeDeliveries = pgTable(
  "gift_code_deliveries",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id),
    orderItemId: integer("order_item_id").references(() => orderItems.id),
    giftCodeId: integer("gift_code_id").references(() => giftCodes.id),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING | ASSIGNED | PROCESSING | SENT | FAILED | REPLACED | CANCELLED
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
    sentAt: timestamp("sent_at"),
    sentByAdminId: integer("sent_by_admin_id").references(() => users.id),
    adminNote: text("admin_note"),
    failureReason: text("failure_reason"),
    replacedFromId: integer("replaced_from_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("gift_deliveries_order_idx").on(t.orderId),
    index("gift_deliveries_code_idx").on(t.giftCodeId),
    index("gift_deliveries_status_idx").on(t.status),
    index("gift_deliveries_recipient_idx").on(t.recipientEmail),
  ]
);

