-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION', 'DELETED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'SUPPORT');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PDF', 'ZIP', 'DOCUMENT', 'EBOOK', 'PLAYLIST', 'BUNDLE');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'REPLACED', 'DELETED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('INITIATED', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AccessGrantStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ACCOUNT', 'PURCHASE', 'CONTENT', 'REFUND', 'PROMOTIONAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BannerPosition" AS ENUM ('HERO', 'PROMOTIONAL', 'CATEGORY', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "BannerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "MarketplaceMode" AS ENUM ('DIGITAL', 'GIFT_CODES');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DIGITAL_PRODUCT', 'GIFT_CODE');

-- CreateEnum
CREATE TYPE "OrderItemType" AS ENUM ('DIGITAL_PRODUCT', 'GIFT_CODE');

-- CreateEnum
CREATE TYPE "GiftCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GiftProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GiftCodeStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ASSIGNED', 'SOLD', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GiftReservationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GiftDeliveryStatus" AS ENUM ('PENDING', 'ASSIGNED', 'PROCESSING', 'SENT', 'FAILED', 'REPLACED', 'CANCELLED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED', 'PRODUCT_ARCHIVED', 'PRODUCT_PUBLISHED', 'PRODUCT_UNPUBLISHED', 'PRODUCT_PRICE_CHANGED', 'FILE_UPLOADED', 'FILE_REPLACED', 'FILE_DELETED', 'CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_DELETED', 'USER_SUSPENDED', 'USER_RESTORED', 'USER_BANNED', 'USER_DELETED', 'ACCESS_GRANTED', 'ACCESS_REVOKED', 'ACCESS_EXTENDED', 'ACCESS_RESTORED', 'COUPON_CREATED', 'COUPON_UPDATED', 'COUPON_DELETED', 'REFUND_ISSUED', 'REFUND_FAILED', 'ADMIN_CREATED', 'ADMIN_UPDATED', 'ADMIN_ROLE_CHANGED', 'ADMIN_DELETED', 'SETTING_CHANGED', 'BANNER_CREATED', 'BANNER_UPDATED', 'BANNER_DELETED', 'NOTIFICATION_SENT', 'GIFT_PRODUCT_CREATED', 'GIFT_PRODUCT_UPDATED', 'GIFT_PRODUCT_PUBLISHED', 'GIFT_PRODUCT_UNPUBLISHED', 'GIFT_CATEGORY_CREATED', 'GIFT_CATEGORY_UPDATED', 'GIFT_CATEGORY_DELETED', 'GIFT_CODE_IMPORTED', 'GIFT_CODE_VIEWED', 'GIFT_CODE_ASSIGNED', 'GIFT_CODE_REPLACED', 'GIFT_CODE_CANCELLED', 'GIFT_ORDER_CREATED', 'GIFT_ORDER_PAID', 'GIFT_DELIVERY_MARKED_SENT', 'GIFT_MODE_ENABLED', 'GIFT_MODE_DISABLED', 'GIFT_PRICE_CHANGED', 'GIFT_STOCK_CHANGED', 'GIFT_SETTING_CHANGED', 'GIFT_REFUND_OVERRIDE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "profileImage" TEXT,
    "phone" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'EMAIL',
    "googleId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPPORT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "parentId" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "categoryId" TEXT,
    "productType" "ProductType" NOT NULL,
    "coverImage" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "salePrice" DECIMAL(10,2),
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "downloadLimit" INTEGER,
    "accessDurationDays" INTEGER,
    "salesActive" BOOLEAN NOT NULL DEFAULT true,
    "downloadsActive" BOOLEAN NOT NULL DEFAULT true,
    "lecturesActive" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogImage" TEXT,
    "faq" JSONB,
    "contentSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_assets" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "downloadLimit" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_chapters" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_lectures" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "chapterId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "externalUrl" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'youtube',
    "duration" INTEGER,
    "thumbnail" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_lectures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_bundle_items" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "childProductId" TEXT NOT NULL,

    CONSTRAINT "product_bundle_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderType" "OrderType" NOT NULL DEFAULT 'DIGITAL_PRODUCT',
    "emailSnapshot" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "couponDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "giftProductId" TEXT,
    "itemType" "OrderItemType" NOT NULL DEFAULT 'DIGITAL_PRODUCT',
    "title" TEXT NOT NULL,
    "denomination" DECIMAL(10,2),
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "method" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'INITIATED',
    "razorpayRefundId" TEXT,
    "revokeAccess" BOOLEAN NOT NULL DEFAULT true,
    "processedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" "CouponType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "minimumOrder" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maximumDiscount" DECIMAL(10,2),
    "usageLimit" INTEGER,
    "perUserLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_scopes" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "productId" TEXT,

    CONSTRAINT "coupon_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "AccessGrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "downloads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "accessGrantId" TEXT,
    "downloadNumber" INTEGER NOT NULL,
    "token" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" "DownloadStatus" NOT NULL DEFAULT 'PENDING',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecture_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPositionSec" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lecture_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "link" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "image" TEXT,
    "buttonText" TEXT,
    "buttonUrl" TEXT,
    "position" "BannerPosition" NOT NULL DEFAULT 'HERO',
    "status" "BannerStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorAdminId" TEXT,
    "actorEmail" TEXT,
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "description" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "gift_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "icon" TEXT,
    "status" "GiftCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_products" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "brandName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "terms" TEXT,
    "instructions" TEXT,
    "image" TEXT,
    "denomination" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "GiftProductStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "purchaseLimit" INTEGER,
    "allowCoupon" BOOLEAN NOT NULL DEFAULT false,
    "lowStockThreshold" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_codes" (
    "id" TEXT NOT NULL,
    "giftProductId" TEXT NOT NULL,
    "encryptedCode" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "maskedCode" TEXT NOT NULL,
    "batchLabel" TEXT,
    "internalNote" TEXT,
    "expiryDate" TIMESTAMP(3),
    "status" "GiftCodeStatus" NOT NULL DEFAULT 'AVAILABLE',
    "assignedOrderId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "importedByAdminId" TEXT,
    "lastViewedAt" TIMESTAMP(3),
    "lastViewedByAdminId" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_cart_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "giftProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_code_reservations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "giftProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reservationToken" TEXT NOT NULL,
    "status" "GiftReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "convertedOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_code_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_code_deliveries" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "giftCodeId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "status" "GiftDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentByAdminId" TEXT,
    "adminNote" TEXT,
    "failureReason" TEXT,
    "replacedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_code_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "orderId" TEXT,
    "payloadRef" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gateway_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerId_key" ON "accounts"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_identifier_purpose_idx" ON "verification_tokens"("identifier", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_productType_idx" ON "products"("productType");

-- CreateIndex
CREATE INDEX "product_assets_productId_idx" ON "product_assets"("productId");

-- CreateIndex
CREATE INDEX "product_chapters_productId_idx" ON "product_chapters"("productId");

-- CreateIndex
CREATE INDEX "product_lectures_productId_idx" ON "product_lectures"("productId");

-- CreateIndex
CREATE INDEX "product_lectures_chapterId_idx" ON "product_lectures"("chapterId");

-- CreateIndex
CREATE INDEX "product_bundle_items_childProductId_idx" ON "product_bundle_items"("childProductId");

-- CreateIndex
CREATE UNIQUE INDEX "product_bundle_items_bundleId_childProductId_key" ON "product_bundle_items"("bundleId", "childProductId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_orderType_idx" ON "orders"("orderType");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_giftProductId_idx" ON "order_items"("giftProductId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayPaymentId_key" ON "payments"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_razorpayOrderId_key" ON "payments"("orderId", "razorpayOrderId");

-- CreateIndex
CREATE INDEX "refunds_orderId_idx" ON "refunds"("orderId");

-- CreateIndex
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_scopes_couponId_productId_key" ON "coupon_scopes"("couponId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_orderId_key" ON "coupon_redemptions"("orderId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_couponId_userId_idx" ON "coupon_redemptions"("couponId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_couponId_userId_orderId_key" ON "coupon_redemptions"("couponId", "userId", "orderId");

-- CreateIndex
CREATE INDEX "access_grants_userId_status_idx" ON "access_grants"("userId", "status");

-- CreateIndex
CREATE INDEX "access_grants_productId_idx" ON "access_grants"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "access_grants_userId_productId_orderId_key" ON "access_grants"("userId", "productId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "downloads_token_key" ON "downloads"("token");

-- CreateIndex
CREATE INDEX "downloads_userId_idx" ON "downloads"("userId");

-- CreateIndex
CREATE INDEX "downloads_assetId_idx" ON "downloads"("assetId");

-- CreateIndex
CREATE INDEX "downloads_productId_idx" ON "downloads"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "lecture_progress_userId_lectureId_key" ON "lecture_progress"("userId", "lectureId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_productId_key" ON "wishlist_items"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_userId_productId_key" ON "cart_items"("userId", "productId");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "banners_position_status_idx" ON "banners"("position", "status");

-- CreateIndex
CREATE INDEX "audit_logs_actorAdminId_idx" ON "audit_logs"("actorAdminId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "gift_categories_slug_key" ON "gift_categories"("slug");

-- CreateIndex
CREATE INDEX "gift_categories_slug_idx" ON "gift_categories"("slug");

-- CreateIndex
CREATE INDEX "gift_categories_status_idx" ON "gift_categories"("status");

-- CreateIndex
CREATE UNIQUE INDEX "gift_products_slug_key" ON "gift_products"("slug");

-- CreateIndex
CREATE INDEX "gift_products_slug_idx" ON "gift_products"("slug");

-- CreateIndex
CREATE INDEX "gift_products_categoryId_idx" ON "gift_products"("categoryId");

-- CreateIndex
CREATE INDEX "gift_products_brandName_idx" ON "gift_products"("brandName");

-- CreateIndex
CREATE INDEX "gift_products_status_idx" ON "gift_products"("status");

-- CreateIndex
CREATE INDEX "gift_codes_giftProductId_status_idx" ON "gift_codes"("giftProductId", "status");

-- CreateIndex
CREATE INDEX "gift_codes_status_idx" ON "gift_codes"("status");

-- CreateIndex
CREATE INDEX "gift_codes_expiryDate_idx" ON "gift_codes"("expiryDate");

-- CreateIndex
CREATE INDEX "gift_codes_assignedOrderId_idx" ON "gift_codes"("assignedOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_codes_giftProductId_codeHash_key" ON "gift_codes"("giftProductId", "codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "gift_cart_items_userId_giftProductId_key" ON "gift_cart_items"("userId", "giftProductId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_code_reservations_reservationToken_key" ON "gift_code_reservations"("reservationToken");

-- CreateIndex
CREATE INDEX "gift_code_reservations_userId_status_idx" ON "gift_code_reservations"("userId", "status");

-- CreateIndex
CREATE INDEX "gift_code_reservations_giftProductId_status_idx" ON "gift_code_reservations"("giftProductId", "status");

-- CreateIndex
CREATE INDEX "gift_code_reservations_expiresAt_idx" ON "gift_code_reservations"("expiresAt");

-- CreateIndex
CREATE INDEX "gift_code_deliveries_orderId_idx" ON "gift_code_deliveries"("orderId");

-- CreateIndex
CREATE INDEX "gift_code_deliveries_giftCodeId_idx" ON "gift_code_deliveries"("giftCodeId");

-- CreateIndex
CREATE INDEX "gift_code_deliveries_status_idx" ON "gift_code_deliveries"("status");

-- CreateIndex
CREATE INDEX "gift_code_deliveries_recipientEmail_idx" ON "gift_code_deliveries"("recipientEmail");

-- CreateIndex
CREATE INDEX "gateway_events_orderId_idx" ON "gateway_events"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_events_provider_eventId_key" ON "gateway_events"("provider", "eventId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_assets" ADD CONSTRAINT "product_assets_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_chapters" ADD CONSTRAINT "product_chapters_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_lectures" ADD CONSTRAINT "product_lectures_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_lectures" ADD CONSTRAINT "product_lectures_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "product_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_childProductId_fkey" FOREIGN KEY ("childProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_giftProductId_fkey" FOREIGN KEY ("giftProductId") REFERENCES "gift_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processedByAdminId_fkey" FOREIGN KEY ("processedByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_scopes" ADD CONSTRAINT "coupon_scopes_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_scopes" ADD CONSTRAINT "coupon_scopes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "product_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_accessGrantId_fkey" FOREIGN KEY ("accessGrantId") REFERENCES "access_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecture_progress" ADD CONSTRAINT "lecture_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecture_progress" ADD CONSTRAINT "lecture_progress_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "product_lectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_products" ADD CONSTRAINT "gift_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "gift_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_codes" ADD CONSTRAINT "gift_codes_giftProductId_fkey" FOREIGN KEY ("giftProductId") REFERENCES "gift_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_codes" ADD CONSTRAINT "gift_codes_assignedOrderId_fkey" FOREIGN KEY ("assignedOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_codes" ADD CONSTRAINT "gift_codes_lastViewedByAdminId_fkey" FOREIGN KEY ("lastViewedByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cart_items" ADD CONSTRAINT "gift_cart_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cart_items" ADD CONSTRAINT "gift_cart_items_giftProductId_fkey" FOREIGN KEY ("giftProductId") REFERENCES "gift_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_reservations" ADD CONSTRAINT "gift_code_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_reservations" ADD CONSTRAINT "gift_code_reservations_giftProductId_fkey" FOREIGN KEY ("giftProductId") REFERENCES "gift_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_deliveries" ADD CONSTRAINT "gift_code_deliveries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_deliveries" ADD CONSTRAINT "gift_code_deliveries_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_deliveries" ADD CONSTRAINT "gift_code_deliveries_giftCodeId_fkey" FOREIGN KEY ("giftCodeId") REFERENCES "gift_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_deliveries" ADD CONSTRAINT "gift_code_deliveries_sentByAdminId_fkey" FOREIGN KEY ("sentByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

