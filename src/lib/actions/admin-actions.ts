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
  categories,
  coupons,
  notifications,
  orders,
  payments,
  productAssets,
  productLectures,
  products,
  refunds,
  users,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { audit, notify, slugify } from "@/lib/helpers";

export type AdminFormState = { error?: string; success?: string };

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
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
  try {
    if (id) {
      await db.update(categories).set(values).where(eq(categories.id, id));
      await audit(admin, "category.updated", "category", id, name);
    } else {
      const [row] = await db.insert(categories).values(values).returning();
      await audit(admin, "category.created", "category", row.id, name);
    }
  } catch {
    return { error: "Slug already exists. Choose another." };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
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
  revalidatePath("/admin/products");
  revalidatePath("/products");
  if (!id) redirect(`/admin/products/${productId}`);
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
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products");
  revalidatePath("/", "layout");
}

// ---------------- Assets (file upload) ----------------
export async function uploadAssetAction(_p: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const productId = Number(formData.get("productId") || 0);
  const file = formData.get("file") as File | null;
  if (!productId || !file || file.size === 0) return { error: "Please choose a file to upload." };
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return { error: `File type .${ext} is not allowed. Allowed: ${ALLOWED_EXT.join(", ")}` };
  if (file.size > 50 * 1024 * 1024) return { error: "Maximum file size is 50 MB." };

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const storageKey = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, storageKey), buffer);

  await db.insert(productAssets).values({
    productId,
    fileName: file.name,
    fileType: ext,
    fileSize: file.size,
    storageKey,
    isPreview: formData.get("isPreview") === "on",
  });
  await audit(admin, "file.uploaded", "product", productId, file.name);
  revalidatePath(`/admin/products/${productId}`);
  return { success: `Uploaded ${file.name}` };
}

export async function deleteAssetAction(assetId: number, productId: number) {
  const admin = await requireAdmin();
  const [asset] = await db.select().from(productAssets).where(eq(productAssets.id, assetId)).limit(1);
  if (!asset) return;
  await db.update(productAssets).set({ status: "DELETED" }).where(eq(productAssets.id, assetId));
  await audit(admin, "file.deleted", "asset", assetId, asset.fileName);
  revalidatePath(`/admin/products/${productId}`);
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
  revalidatePath(`/admin/products/${productId}`);
  return { success: "Lecture added." };
}

export async function deleteLectureAction(lectureId: number, productId: number) {
  const admin = await requireAdmin();
  await db.delete(productLectures).where(eq(productLectures.id, lectureId));
  await audit(admin, "lecture.deleted", "lecture", lectureId);
  revalidatePath(`/admin/products/${productId}`);
}

// ---------------- Users ----------------
export async function setUserStatus(userId: number, status: string) {
  const admin = await requireAdmin();
  if (!["ACTIVE", "SUSPENDED", "BANNED"].includes(status)) return;
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target || target.role === "super_admin") return;
  await db.update(users).set({ status }).where(eq(users.id, userId));
  await audit(admin, `user.status.${status.toLowerCase()}`, "user", userId, target.email);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
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
  revalidatePath(`/admin/users/${grant.userId}`);
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
  revalidatePath(`/admin/users/${grant.userId}`);
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
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
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
  revalidatePath("/admin/coupons");
  return { success: "Coupon created." };
}

export async function toggleCouponAction(couponId: number, isActive: boolean) {
  const admin = await requireAdmin();
  await db.update(coupons).set({ isActive }).where(eq(coupons.id, couponId));
  await audit(admin, isActive ? "coupon.enabled" : "coupon.disabled", "coupon", couponId);
  revalidatePath("/admin/coupons");
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
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { success: "Banner created." };
}

export async function toggleBannerAction(bannerId: number, isActive: boolean) {
  const admin = await requireAdmin();
  await db.update(banners).set({ isActive }).where(eq(banners.id, bannerId));
  await audit(admin, isActive ? "banner.enabled" : "banner.disabled", "banner", bannerId);
  revalidatePath("/admin/banners");
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
