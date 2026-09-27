-- ============================================================
-- Migration: 0001_gift_codes_mode.sql
-- Gift Codes Mode & Master Mode Toggle Integration
-- ============================================================

-- 1. Extend orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_type" varchar(30) DEFAULT 'DIGITAL_PRODUCT' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "email_snapshot" varchar(255);

-- 2. Extend order_items table
ALTER TABLE "order_items" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gift_product_id" integer;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "item_type" varchar(30) DEFAULT 'DIGITAL_PRODUCT' NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "denomination" integer;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 1 NOT NULL;

-- 3. Platform Settings (Master Mode Toggle & Configuration)
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" serial PRIMARY KEY,
  "key" varchar(80) NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "platform_settings_key_idx" ON "platform_settings" ("key");

-- Initial default settings if not already present
INSERT INTO "platform_settings" ("key", "value") VALUES
  ('marketplace_mode', 'DIGITAL'),
  ('cart_reservation_minutes', '10'),
  ('low_stock_threshold', '10'),
  ('max_quantity_per_order', '5'),
  ('delivery_target_minutes', '5'),
  ('coupon_support', 'false'),
  ('gift_purchase_enabled', 'true')
ON CONFLICT ("key") DO NOTHING;

-- 4. Gift Categories
CREATE TABLE IF NOT EXISTS "gift_categories" (
  "id" serial PRIMARY KEY,
  "name" varchar(120) NOT NULL,
  "slug" varchar(140) NOT NULL,
  "description" text,
  "image" text,
  "icon" varchar(40) DEFAULT '🎁',
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "gift_categories_slug_idx" ON "gift_categories" ("slug");

-- 5. Gift Products
CREATE TABLE IF NOT EXISTS "gift_products" (
  "id" serial PRIMARY KEY,
  "category_id" integer REFERENCES "gift_categories"("id") ON DELETE SET NULL,
  "brand_name" varchar(120) NOT NULL,
  "name" varchar(200) NOT NULL,
  "slug" varchar(220) NOT NULL,
  "description" text,
  "terms" text,
  "instructions" text,
  "image" text,
  "denomination" integer DEFAULT 0 NOT NULL,
  "selling_price" integer DEFAULT 0 NOT NULL,
  "currency" varchar(8) DEFAULT 'INR' NOT NULL,
  "status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
  "is_featured" boolean DEFAULT false NOT NULL,
  "purchase_limit" integer DEFAULT 5 NOT NULL,
  "allow_coupon" boolean DEFAULT false NOT NULL,
  "low_stock_threshold" integer DEFAULT 10 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "gift_products_slug_idx" ON "gift_products" ("slug");
CREATE INDEX IF NOT EXISTS "gift_products_category_idx" ON "gift_products" ("category_id");
CREATE INDEX IF NOT EXISTS "gift_products_brand_idx" ON "gift_products" ("brand_name");
CREATE INDEX IF NOT EXISTS "gift_products_status_idx" ON "gift_products" ("status");

-- 6. Gift Codes Inventory
CREATE TABLE IF NOT EXISTS "gift_codes" (
  "id" serial PRIMARY KEY,
  "gift_product_id" integer NOT NULL REFERENCES "gift_products"("id") ON DELETE CASCADE,
  "encrypted_code" text NOT NULL,
  "code_hash" varchar(128) NOT NULL,
  "masked_code" varchar(80) NOT NULL,
  "batch_label" varchar(120),
  "internal_note" text,
  "expiry_date" timestamp,
  "status" varchar(20) DEFAULT 'AVAILABLE' NOT NULL,
  "assigned_order_id" integer REFERENCES "orders"("id") ON DELETE SET NULL,
  "assigned_at" timestamp,
  "sold_at" timestamp,
  "imported_by_admin_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "last_viewed_at" timestamp,
  "last_viewed_by_admin_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "view_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "gift_codes_product_hash_idx" ON "gift_codes" ("gift_product_id", "code_hash");
CREATE INDEX IF NOT EXISTS "gift_codes_product_status_idx" ON "gift_codes" ("gift_product_id", "status");
CREATE INDEX IF NOT EXISTS "gift_codes_status_idx" ON "gift_codes" ("status");
CREATE INDEX IF NOT EXISTS "gift_codes_assigned_order_idx" ON "gift_codes" ("assigned_order_id");

-- 7. Gift Code Reservations
CREATE TABLE IF NOT EXISTS "gift_code_reservations" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "gift_product_id" integer NOT NULL REFERENCES "gift_products"("id") ON DELETE CASCADE,
  "quantity" integer DEFAULT 1 NOT NULL,
  "reservation_token" varchar(128) NOT NULL,
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "released_at" timestamp,
  "converted_order_id" integer REFERENCES "orders"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "gift_reservations_token_idx" ON "gift_code_reservations" ("reservation_token");
CREATE INDEX IF NOT EXISTS "gift_reservations_user_idx" ON "gift_code_reservations" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "gift_reservations_product_idx" ON "gift_code_reservations" ("gift_product_id", "status");
CREATE INDEX IF NOT EXISTS "gift_reservations_expires_idx" ON "gift_code_reservations" ("expires_at");

-- 8. Gift Code Deliveries
CREATE TABLE IF NOT EXISTS "gift_code_deliveries" (
  "id" serial PRIMARY KEY,
  "order_id" integer NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "order_item_id" integer REFERENCES "order_items"("id") ON DELETE SET NULL,
  "gift_code_id" integer REFERENCES "gift_codes"("id") ON DELETE SET NULL,
  "recipient_email" varchar(255) NOT NULL,
  "status" varchar(20) DEFAULT 'PENDING' NOT NULL,
  "assigned_at" timestamp DEFAULT now() NOT NULL,
  "sent_at" timestamp,
  "sent_by_admin_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "admin_note" text,
  "failure_reason" text,
  "replaced_from_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "gift_deliveries_order_idx" ON "gift_code_deliveries" ("order_id");
CREATE INDEX IF NOT EXISTS "gift_deliveries_code_idx" ON "gift_code_deliveries" ("gift_code_id");
CREATE INDEX IF NOT EXISTS "gift_deliveries_status_idx" ON "gift_code_deliveries" ("status");
CREATE INDEX IF NOT EXISTS "gift_deliveries_recipient_idx" ON "gift_code_deliveries" ("recipient_email");
