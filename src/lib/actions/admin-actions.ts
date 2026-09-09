"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { db } from "@/db";
import {
  accessGrants,
  banners,
  cartItems,
  categories,
  coupons,
  downloads,
  lectureProgress,
  notifications,
  orderItems,
  orders,
  payments,
  productAssets,
  productLectures,
  products,
  refunds,
  users,
  wishlistItems,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { audit, notify, slugify } from "@/lib/helpers";

export type AdminFormState = { error?: string; success?: string };

import os from "os";

const UPLOAD_DIR = path.join(os.tmpdir(), "nexora-uploads");
const ALLOWED_EXT = ["pdf", "zip", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "epub"];

// ---------------- Categories ----------------
export async function saveCategoryAction(_p: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id") || 0);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Category name is required." };
  const values = {
    name,
    slug: slugify(String(formData.get("slug") || name)),
    description: String(formData.get("description") ?? "").trim() || null,
    emoji: String(formData.get("emoji") ?? "📚").trim() || "📚",
    isActive: formData.get("isActive") === "on",
    sortOrder: Number(formData.get("sortOrder") || 0),
  };
  if (id) {
    await db.update(categories).set(values).where(eq(categories.id, id));
    await audit(admin, "category.updated", "category", id, name);
  } else {
    const [row] = await db.insert(categories).values(values).returning();
    await audit(admin, "category.created", "category", row.id, name);
  }
  revalidatePath("/nexora/categories");
  revalidatePath("/categories");
  return { success: "Category saved." };
}

// ---------------- Products ----------------
export async function saveProductAction(_p: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id") || 0);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Product title is required." };
  const price = Math.max(0, Math.round(Number(formData.get("price") || 0)));
  const salePriceRaw = String(formData.get("salePrice") ?? "").trim();
  const salePrice = salePriceRaw === "" ? null : Math.max(0, Math.round(Number(salePriceRaw)));
  if (salePrice !== null && salePrice >= price && price > 0)
    return { error: "Sale price must be lower than the regular price." };
  const accessDaysRaw = String(formData.get("accessDays") ?? "").trim();

  const values = {
    title,
    slug: slugify(String(formData.get("slug") || title)),
    shortDescription: String(formData.get("shortDescription") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    categoryId: Number(formData.get("categoryId") || 0) || null,
    productType: String(formData.get("productType") || "PDF"),
    coverImage: String(formData.get("coverImage") ?? "").trim() || null,
    price,
    salePrice,
    isFree: formData.get("isFree") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    downloadLimit: Math.max(0, Number(formData.get("downloadLimit") || 5)),
    accessDays: accessDaysRaw === "" ? null : Math.max(1, Number(accessDaysRaw)),
    updatedAt: new Date(),
  };

  let productId = id;
  try {
    if (id) {
      await db.update(products).set(values).where(eq(products.id, id));
      await audit(admin, "product.updated", "product", id, title);
    } else {
      const [row] = await db.insert(products).values({ ...values, status: "DRAFT" }).returning();
      productId = row.id;
      await audit(admin, "product.created", "product", row.id, title);
    }
  } catch {
    return { error: "Slug already exists. Choose another." };
  }
  revalidatePath("/nexora/products");
  revalidatePath(`/nexora/products/${productId}`);
  revalidatePath("/products");
  revalidatePath(`/products/${values.slug}`);
  revalidatePath("/", "layout");
  if (!id) redirect(`/nexora/products/${productId}`);
  return { success: "Product saved." };
}

export async function setProductStatus(productId: number, status: string) {
  const admin = await requireAdmin();
  const allowed = ["DRAFT", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"];
  if (!allowed.includes(status)) return;
  await db
    .update(products)
    .set({ status, updatedAt: new Date(), ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}) })
    .where(eq(products.id, productId));
  await audit(admin, `product.status.${status.toLowerCase()}`, "product", productId);
  revalidatePath("/nexora/products");
  revalidatePath(`/nexora/products/${productId}`);
  revalidatePath("/products");
  revalidatePath("/", "layout");
}

export async function deleteProductAction(productId: number): Promise<void> {
  const admin = await requireAdmin();
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return;

  try {
    // 1. Delete lecture progress for all lectures of this product
    const lectures = await db
      .select({ id: productLectures.id })
      .from(productLectures)
      .where(eq(productLectures.productId, productId));
    if (lectures.length > 0) {
      const lectureIds = lectures.map((l) => l.id);
      await db.delete(lectureProgress).where(inArray(lectureProgress.lectureId, lectureIds));
    }

    // 2. Delete downloads for this product
    await db.delete(downloads).where(eq(downloads.productId, productId));

    // 3. Delete assets and lectures
    await db.delete(productAssets).where(eq(productAssets.productId, productId));
    await db.delete(productLectures).where(eq(productLectures.productId, productId));

    // 4. Delete cart & wishlist items
    await db.delete(cartItems).where(eq(cartItems.productId, productId));
    await db.delete(wishlistItems).where(eq(wishlistItems.productId, productId));

    // 5. Delete access grants & order items
    await db.delete(accessGrants).where(eq(accessGrants.productId, productId));
    await db.delete(orderItems).where(eq(orderItems.productId, productId));

    // 6. Delete the product itself
    await db.delete(products).where(eq(products.id, productId));

    await audit(admin, "product.deleted", "product", productId, product.title);
  } catch (err: any) {
    console.error("Failed to delete product:", err);
    throw new Error(err?.message || "Failed to delete product.");
  }

  revalidatePath("/nexora/products");
  revalidatePath(`/nexora/products/${productId}`);
  revalidatePath("/products");
  revalidatePath("/", "layout");
  redirect("/nexora/products");
}

// ---------------- Assets (file upload & cloud link) ----------------
export async function uploadAssetAction(_p: AdminFormState, formData: FormData): Promise<AdminFormState> {
  try {
    const admin = await requireAdmin();
    const productId = Number(formData.get("productId") || 0);
    const file = formData.get("file") as File | null;
    if (!productId || !file || file.size === 0) return { error: "Please choose a file to upload." };
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return { error: `File type .${ext} is not allowed. Allowed: ${ALLOWED_EXT.join(", ")}` };
    if (file.size > 4.5 * 1024 * 1024) {
      return { error: "Direct file upload is limited to 4.5 MB on serverless hosting. For larger files, use 'Add Cloud / Download Link' below." };
    }

    const storageKey = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await fs.writeFile(path.join(UPLOAD_DIR, storageKey), buffer);
    } catch {
      // Ephemeral disk write fallback
    }

    await db.insert(productAssets).values({
      productId,
      fileName: file.name,
      fileType: ext,
      fileSize: file.size,
      storageKey,
      fileData: base64Data,
      isPreview: formData.get("isPreview") === "on",
    });
    await audit(admin, "file.uploaded", "product", productId, file.name);
    revalidatePath(`/nexora/products/${productId}`);
    return { success: `Uploaded ${file.name}` };
  } catch (err: any) {
    console.error("Upload error:", err);
    return { error: err?.message || "Failed to upload file. Please try again." };
  }
}

export async function addExternalAssetAction(_p: AdminFormState, formData: FormData): Promise<AdminFormState> {
  try {
    const admin = await requireAdmin();
    const productId = Number(formData.get("productId") || 0);
    const fileName = String(formData.get("fileName") ?? "").trim();
    const externalUrl = String(formData.get("externalUrl") ?? "").trim();
    const fileType = String(formData.get("fileType") ?? "zip").toLowerCase().replace(/^\./, "");
    const isPreview = formData.get("isPreview") === "on";

    if (!productId || !fileName || !externalUrl) {
      return { error: "File name and direct download URL are required." };
    }
    if (!/^https?:\/\//i.test(externalUrl)) {
      return { error: "URL must start with http:// or https://" };
    }

    const storageKey = `ext_${crypto.randomBytes(8).toString("hex")}`;
    await db.insert(productAssets).values({
      productId,
      fileName,
      fileType,
      fileSize: 0,
      storageKey,
      externalUrl,
      isPreview,
    });

    await audit(admin, "file.external_linked", "product", productId, fileName);
    revalidatePath(`/nexora/products/${productId}`);
    return { success: `Attached ${fileName}` };
  } catch (err: any) {
    console.error("External asset link error:", err);
    return { error: err?.message || "Failed to attach external file link." };
  }
}

export async function deleteAssetAction(assetId: number, productId: number) {
  const admin = await requireAdmin();
  const [asset] = await db.select().from(productAssets).where(eq(productAssets.id, assetId)).limit(1);
  if (!asset) return;
  await db.update(productAssets).set({ status: "DELETED" }).where(eq(productAssets.id, assetId));
  await audit(admin, "file.deleted", "asset", assetId, asset.fileName);
  revalidatePath(`/nexora/products/${productId}`);
}

// ---------------- Lectures ----------------
export async function addLectureAction(_p: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const productId = Number(formData.get("productId") || 0);
  const title = String(formData.get("title") ?? "").trim();
  const externalUrl = String(formData.get("externalUrl") ?? "").trim();
  if (!productId || !title || !externalUrl) return { error: "Lecture title and external URL are required." };
  if (!/^https?:\/\//.test(externalUrl)) return { error: "External URL must start with http(s)://" };
  await db.insert(productLectures).values({
    productId,
    chapterTitle: String(formData.get("chapterTitle") ?? "Chapter 1").trim() || "Chapter 1",
    title,
    externalUrl,
    provider: String(formData.get("provider") ?? "YouTube"),
    duration: String(formData.get("duration") ?? "").trim() || null,
    sortOrder: Number(formData.get("sortOrder") || 0),
    isPreview: formData.get("isPreview") === "on",
  });
  await audit(admin, "lecture.added", "product", productId, title);
  revalidatePath(`/nexora/products/${productId}`);
  return { success: "Lecture added." };
}

export async function deleteLectureAction(lectureId: number, productId: number) {
  const admin = await requireAdmin();
  await db.delete(productLectures).where(eq(productLectures.id, lectureId));
  await audit(admin, "lecture.deleted", "lecture", lectureId);
  revalidatePath(`/nexora/products/${productId}`);
}

// ---------------- Users ----------------
export async function setUserStatus(userId: number, status: string) {
  const admin = await requireAdmin();
  if (!["ACTIVE", "SUSPENDED", "BANNED"].includes(status)) return;
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target || target.role === "super_admin") return;
  await db.update(users).set({ status }).where(eq(users.id, userId));
  await audit(admin, `user.status.${status.toLowerCase()}`, "user", userId, target.email);
  revalidatePath("/nexora/users");
  revalidatePath(`/nexora/users/${userId}`);
}

// ---------------- Access management ----------------
export async function revokeAccessAction(grantId: number, reason: string) {
  const admin = await requireAdmin();
  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.id, grantId)).limit(1);
  if (!grant) return;
  await db
    .update(accessGrants)
    .set({ status: "REVOKED", revokedAt: new Date(), reason: reason || "Revoked by admin" })
    .where(eq(accessGrants.id, grantId));
  await audit(admin, "access.revoked", "access_grant", grantId, reason);
  await notify(grant.userId, "Access revoked", "Access to one of your products was revoked by an administrator.", "ACCOUNT");
  revalidatePath(`/nexora/users/${grant.userId}`);
}

export async function restoreAccessAction(grantId: number) {
  const admin = await requireAdmin();
  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.id, grantId)).limit(1);
  if (!grant) return;
  await db
    .update(accessGrants)
    .set({ status: "ACTIVE", revokedAt: null, reason: null })
    .where(eq(accessGrants.id, grantId));
  await audit(admin, "access.restored", "access_grant", grantId);
  await notify(grant.userId, "Access restored", "Access to one of your products was restored.", "ACCOUNT");
  revalidatePath(`/nexora/users/${grant.userId}`);
}

// ---------------- Refunds ----------------
export async function refundOrderAction(_p: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const orderId = Number(formData.get("orderId") || 0);
  const reason = String(formData.get("reason") ?? "").trim();
  const revokeAccess = formData.get("keepAccess") !== "on";
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { error: "Order not found." };
  if (order.status !== "PAID" && order.status !== "COMPLETED") return { error: "Only paid orders can be refunded." };

  const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
  if (!payment) return { error: "Payment record not found." };

  await db.insert(refunds).values({
    paymentId: payment.id,
    orderId,
    amount: payment.amount,
    reason: reason || "Admin refund",
    revokeAccess,
    createdBy: admin.id,
  });
  await db.update(payments).set({ status: "REFUNDED", updatedAt: new Date() }).where(eq(payments.id, payment.id));
  await db.update(orders).set({ status: "REFUNDED", updatedAt: new Date() }).where(eq(orders.id, orderId));

  if (revokeAccess) {
    await db
      .update(accessGrants)
      .set({ status: "REFUNDED", revokedAt: new Date(), reason: "Order refunded" })
      .where(and(eq(accessGrants.orderId, orderId), eq(accessGrants.status, "ACTIVE")));
  }
  await audit(admin, "refund.processed", "order", orderId, `₹${payment.amount} · ${reason}`);
  await notify(
    order.userId,
    "Refund processed",
    `Your order ${order.orderNumber} has been refunded (₹${payment.amount}).${revokeAccess ? " Product access has been revoked." : ""}`,
    "REFUND"
  );
  revalidatePath("/nexora/orders");
  revalidatePath(`/nexora/orders/${orderId}`);
  return { success: "Refund processed successfully." };
}

// ---------------- Coupons ----------------
export async function saveCouponAction(_p: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "Coupon code is required." };
  const value = Math.max(1, Number(formData.get("value") || 0));
  const type = String(formData.get("type") || "PERCENT");
  if (type === "PERCENT" && value > 100) return { error: "Percentage discount cannot exceed 100." };
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();
  try {
    const [row] = await db
      .insert(coupons)
      .values({
        code,
        type,
        value,
        minOrder: Math.max(0, Number(formData.get("minOrder") || 0)),
        maxDiscount: formData.get("maxDiscount") ? Number(formData.get("maxDiscount")) : null,
        usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : null,
        perUserLimit: Math.max(1, Number(formData.get("perUserLimit") || 1)),
        expiresAt: expiresRaw ? new Date(expiresRaw) : null,
      })
      .returning();
    await audit(admin, "coupon.created", "coupon", row.id, code);
  } catch {
    return { error: "Coupon code already exists." };
  }
  revalidatePath("/nexora/coupons");
  return { success: "Coupon created." };
}

export async function toggleCouponAction(couponId: number, isActive: boolean) {
  const admin = await requireAdmin();
  await db.update(coupons).set({ isActive }).where(eq(coupons.id, couponId));
  await audit(admin, isActive ? "coupon.enabled" : "coupon.disabled", "coupon", couponId);
  revalidatePath("/nexora/coupons");
}

// ---------------- Banners ----------------
export async function saveBannerAction(_p: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Banner title is required." };
  const [row] = await db
    .insert(banners)
    .values({
      title,
      subtitle: String(formData.get("subtitle") ?? "").trim() || null,
      image: String(formData.get("image") ?? "").trim() || null,
      buttonText: String(formData.get("buttonText") ?? "").trim() || null,
      buttonUrl: String(formData.get("buttonUrl") ?? "").trim() || null,
      position: String(formData.get("position") || "PROMO"),
      priority: Number(formData.get("priority") || 0),
    })
    .returning();
  await audit(admin, "banner.created", "banner", row.id, title);
  revalidatePath("/nexora/banners");
  revalidatePath("/");
  return { success: "Banner created." };
}

export async function toggleBannerAction(bannerId: number, isActive: boolean) {
  const admin = await requireAdmin();
  await db.update(banners).set({ isActive }).where(eq(banners.id, bannerId));
  await audit(admin, isActive ? "banner.enabled" : "banner.disabled", "banner", bannerId);
  revalidatePath("/nexora/banners");
  revalidatePath("/");
}

// ---------------- Broadcast notification ----------------
export async function broadcastNotificationAction(_p: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!title || !message) return { error: "Title and message are required." };
  const allUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "user"));
  if (allUsers.length > 0) {
    await db.insert(notifications).values(
      allUsers.map((u) => ({ userId: u.id, title, message, type: "PROMO" }))
    );
  }
  await audit(admin, "notification.broadcast", "notification", undefined, title);
  return { success: `Notification sent to ${allUsers.length} users.` };
}
