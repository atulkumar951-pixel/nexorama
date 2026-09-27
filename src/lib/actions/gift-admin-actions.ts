"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { giftAdminApi } from "@/lib/gift-admin-api";
import { db } from "@/db";
import { giftCodes, giftCodeDeliveries, giftProducts, orders, auditLogs } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { encryptGiftCode, decryptGiftCode, hashGiftCode, maskGiftCode } from "@/lib/gift-crypto";
import { setMarketplaceMode, setPlatformSetting, type MarketplaceMode } from "@/lib/marketplace-mode";

export type GiftAdminFormState = { error?: string; success?: string; rawCode?: string };

/**
 * Mark gift deliveries as sent (email delivered manually by the ops team).
 */
export async function markDeliveriesSentAction(
  deliveryIds: string[],
  adminNote?: string
): Promise<GiftAdminFormState> {
  try {
    await requireAdmin();
    if (!deliveryIds.length) return { error: "No deliveries selected." };
    await giftAdminApi("/deliveries/mark-sent", { method: "POST", body: { deliveryIds, adminNote } });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update deliveries." };
  }
  revalidatePath("/nexora/gift-cards/deliveries");
  revalidatePath("/nexora/gift-cards");
  return { success: "Marked as sent." };
}

/** Create a gift product (or update when `id` is provided). */
export async function saveGiftProductAction(
  _prev: GiftAdminFormState,
  formData: FormData
): Promise<GiftAdminFormState> {
  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const name = str("name");
  const brandName = str("brandName");
  const denomination = Number(formData.get("denomination") ?? 0);
  const sellingPrice = Number(formData.get("sellingPrice") ?? 0);

  if (!name) return { error: "Gift product name is required." };
  if (!brandName) return { error: "Brand name is required." };
  if (!denomination || denomination <= 0) return { error: "Gift card value must be greater than zero." };
  if (!sellingPrice || sellingPrice <= 0) return { error: "Selling price must be greater than zero." };

  const body = {
    name,
    brandName,
    categoryId: str("categoryId") || null,
    description: str("description") || null,
    terms: str("terms") || null,
    instructions: str("instructions") || null,
    image: str("image") || null,
    denomination,
    sellingPrice,
    status: str("status") || "DRAFT",
    featured: formData.get("featured") === "on",
    allowCoupon: formData.get("allowCoupon") === "on",
    purchaseLimit: formData.get("purchaseLimit") ? Number(formData.get("purchaseLimit")) : 5,
    lowStockThreshold: formData.get("lowStockThreshold") ? Number(formData.get("lowStockThreshold")) : 10,
  };

  try {
    const admin = await requireAdmin();
    await giftAdminApi("/products", { method: "POST", body });

    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "GIFT_PRODUCT_CREATED",
      targetType: "GIFT_PRODUCT",
      detail: `Created gift product: ${brandName} - ${name} (Denomination: ₹${denomination})`,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the gift product." };
  }
  revalidatePath("/nexora/gift-cards/products");
  revalidatePath("/nexora/gift-cards");
  return { success: `Gift product “${name}” created.` };
}

/** Publish / unpublish a gift product. */
export async function setGiftProductStatusAction(
  productId: string,
  status: "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED" | "DRAFT",
  _formData?: FormData
): Promise<GiftAdminFormState> {
  try {
    const admin = await requireAdmin();
    await giftAdminApi(`/products/${productId}/status`, { method: "PATCH", body: { status } });

    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorEmail: admin.email,
      action: status === "PUBLISHED" ? "GIFT_PRODUCT_PUBLISHED" : "GIFT_PRODUCT_UNPUBLISHED",
      targetType: "GIFT_PRODUCT",
      targetId: productId,
      detail: `Product ${productId} status set to ${status}`,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not change the product status." };
  }
  revalidatePath("/nexora/gift-cards/products");
  revalidatePath("/nexora/gift-cards");
  return { success: `Product ${status.toLowerCase()}.` };
}

/** Create a gift category (Gaming, Shopping, OTT, …). */
export async function saveGiftCategoryAction(
  _prev: GiftAdminFormState,
  formData: FormData
): Promise<GiftAdminFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Category name is required." };
  const slug = String(formData.get("slug") ?? "").trim();

  try {
    await requireAdmin();
    await giftAdminApi("/categories", {
      method: "POST",
      body: {
        name,
        ...(slug ? { slug } : {}),
        description: String(formData.get("description") ?? "").trim() || null,
        icon: String(formData.get("icon") ?? "").trim() || null,
        status: "ACTIVE",
      },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create the category." };
  }
  revalidatePath("/nexora/gift-cards/products");
  revalidatePath("/nexora/gift-cards");
  return { success: `Category “${name}” created.` };
}

/** Master Marketplace Mode Toggle (PRD §2, §76, §77, §79, §80). */
export async function setMarketplaceModeAction(
  _prev: GiftAdminFormState,
  formData: FormData
): Promise<GiftAdminFormState> {
  const mode = String(formData.get("mode") ?? "") as MarketplaceMode;
  if (mode !== "DIGITAL" && mode !== "GIFT_CODES") {
    return { error: "Invalid marketplace mode." };
  }
  try {
    const admin = await requireAdmin();
    await setMarketplaceMode(mode, { id: admin.id, email: admin.email });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to switch mode." };
  }
  revalidatePath("/", "layout");
  revalidatePath("/nexora", "layout");
  revalidatePath("/nexora");
  revalidatePath("/nexora/products");
  revalidatePath("/nexora/categories");
  revalidatePath("/nexora/gift-cards");
  revalidatePath("/nexora/gift-cards/products");
  revalidatePath("/nexora/gift-cards/inventory");
  revalidatePath("/nexora/gift-cards/deliveries");
  revalidatePath("/nexora/settings");
  return { success: `Marketplace mode set to ${mode === "DIGITAL" ? "Digital Products" : "Gift Codes"}.` };
}

/**
 * Add an individual gift code to inventory (PRD §13 Option A).
 */
export async function addSingleCodeAction(
  _prev: GiftAdminFormState,
  formData: FormData
): Promise<GiftAdminFormState> {
  try {
    const admin = await requireAdmin();
    const giftProductId = Number(formData.get("giftProductId"));
    const code = String(formData.get("code") || "").trim();
    const expiry = formData.get("expiryDate") ? new Date(String(formData.get("expiryDate"))) : null;
    const internalNote = String(formData.get("internalNote") || "").trim() || null;
    const batchLabel = String(formData.get("batchLabel") || "").trim() || null;

    if (!giftProductId) return { error: "Please select a gift product." };
    if (!code) return { error: "Gift code cannot be empty." };

    const codeHash = hashGiftCode(code);

    // Duplicate check (PRD §44)
    const [existing] = await db
      .select({ id: giftCodes.id })
      .from(giftCodes)
      .where(and(eq(giftCodes.giftProductId, giftProductId), eq(giftCodes.codeHash, codeHash)))
      .limit(1);

    if (existing) {
      return { error: "This gift code already exists in inventory for this product." };
    }

    const encryptedCode = encryptGiftCode(code);
    const maskedCode = maskGiftCode(code);

    await db.insert(giftCodes).values({
      giftProductId,
      encryptedCode,
      codeHash,
      maskedCode,
      batchLabel,
      internalNote,
      expiryDate: expiry && !isNaN(expiry.getTime()) ? expiry : null,
      status: "AVAILABLE",
      importedByAdminId: admin.id,
    });

    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "GIFT_CODE_IMPORTED",
      targetType: "GIFT_INVENTORY",
      targetId: String(giftProductId),
      detail: `Added single code for product ${giftProductId} (masked: ${maskedCode})`,
    });

    revalidatePath("/nexora/gift-cards/inventory");
    revalidatePath("/nexora/gift-cards");
    return { success: `Gift code ${maskedCode} added to inventory.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to add gift code." };
  }
}

/**
 * Bulk import gift codes from CSV (PRD §13 Option B, §43, §44).
 */
export async function bulkImportCodesAction(
  _prev: GiftAdminFormState,
  formData: FormData
): Promise<GiftAdminFormState> {
  try {
    const admin = await requireAdmin();
    const giftProductId = Number(formData.get("giftProductId"));
    const csvContent = String(formData.get("csvContent") || "").trim();
    const batchLabel = String(formData.get("batchLabel") || "").trim() || "Bulk Import";

    if (!giftProductId) return { error: "Please select a gift product." };
    if (!csvContent) return { error: "CSV content cannot be empty." };

    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Skip header line if it looks like header (e.g. code,expiry,notes)
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.startsWith("code") || firstLine.includes("expiry");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    if (!dataLines.length) return { error: "No valid code rows found in CSV." };

    let validCount = 0;
    let duplicateCount = 0;
    const seenInBatch = new Set<string>();

    for (const line of dataLines) {
      const parts = line.split(",").map((p) => p.trim());
      const rawCode = parts[0];
      if (!rawCode) continue;

      const codeHash = hashGiftCode(rawCode);
      if (seenInBatch.has(codeHash)) {
        duplicateCount++;
        continue;
      }
      seenInBatch.add(codeHash);

      // Check DB duplicate
      const [existing] = await db
        .select({ id: giftCodes.id })
        .from(giftCodes)
        .where(and(eq(giftCodes.giftProductId, giftProductId), eq(giftCodes.codeHash, codeHash)))
        .limit(1);

      if (existing) {
        duplicateCount++;
        continue;
      }

      const expiryStr = parts[1];
      const expiry = expiryStr ? new Date(expiryStr) : null;
      const note = parts[2] || null;

      await db.insert(giftCodes).values({
        giftProductId,
        encryptedCode: encryptGiftCode(rawCode),
        codeHash,
        maskedCode: maskGiftCode(rawCode),
        batchLabel,
        internalNote: note,
        expiryDate: expiry && !isNaN(expiry.getTime()) ? expiry : null,
        status: "AVAILABLE",
        importedByAdminId: admin.id,
      });

      validCount++;
    }

    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "GIFT_CODE_IMPORTED",
      targetType: "GIFT_INVENTORY",
      targetId: String(giftProductId),
      detail: `Bulk imported ${validCount} codes (duplicates skipped: ${duplicateCount}) for product ${giftProductId}`,
    });

    revalidatePath("/nexora/gift-cards/inventory");
    revalidatePath("/nexora/gift-cards");
    return {
      success: `Successfully imported ${validCount} gift codes. (${duplicateCount} duplicate codes skipped).`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Bulk import failed." };
  }
}

/**
 * Securely reveal raw gift code for authorized admin with audit log (PRD §42, §72, §73).
 */
export async function revealGiftCodeAction(codeId: number): Promise<{ error?: string; rawCode?: string }> {
  try {
    const admin = await requireAdmin();

    const [row] = await db
      .select({
        id: giftCodes.id,
        encryptedCode: giftCodes.encryptedCode,
        giftProductId: giftCodes.giftProductId,
        maskedCode: giftCodes.maskedCode,
      })
      .from(giftCodes)
      .where(eq(giftCodes.id, codeId))
      .limit(1);

    if (!row) return { error: "Gift code not found." };

    // Decrypt the raw code
    const rawCode = decryptGiftCode(row.encryptedCode);

    // Update view count and timestamp
    await db
      .update(giftCodes)
      .set({
        viewCount: sql`${giftCodes.viewCount} + 1`,
        lastViewedAt: new Date(),
        lastViewedByAdminId: admin.id,
      })
      .where(eq(giftCodes.id, codeId));

    // Mandatory Audit Log (PRD §73)
    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "RAW_CODE_VIEWED",
      targetType: "GIFT_CODE",
      targetId: String(codeId),
      detail: `Admin ${admin.email} viewed raw code for item ${row.maskedCode} (Product ${row.giftProductId})`,
    });

    return { rawCode };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to decrypt code." };
  }
}

/**
 * Replace a faulty assigned code with another available code (PRD §46).
 */
export async function replaceGiftCodeAction(
  deliveryId: number,
  reason: string
): Promise<GiftAdminFormState> {
  try {
    const admin = await requireAdmin();
    if (!reason?.trim()) return { error: "A reason is mandatory when replacing a gift code." };

    const [del] = await db
      .select()
      .from(giftCodeDeliveries)
      .where(eq(giftCodeDeliveries.id, deliveryId))
      .limit(1);

    if (!del) return { error: "Delivery record not found." };
    if (!del.giftCodeId) return { error: "No code currently assigned to replace." };

    const [oldCode] = await db
      .select()
      .from(giftCodes)
      .where(eq(giftCodes.id, del.giftCodeId))
      .limit(1);

    if (!oldCode) return { error: "Original code not found." };

    // Find next available code for the same product
    const [replacement] = await db
      .select()
      .from(giftCodes)
      .where(and(eq(giftCodes.giftProductId, oldCode.giftProductId), eq(giftCodes.status, "AVAILABLE")))
      .limit(1);

    if (!replacement) {
      return { error: "No available replacement codes in inventory for this product." };
    }

    const now = new Date();

    // Mark old code as CANCELLED with note
    await db
      .update(giftCodes)
      .set({
        status: "CANCELLED",
        internalNote: `Replaced by admin ${admin.email}: ${reason}`,
        updatedAt: now,
      })
      .where(eq(giftCodes.id, oldCode.id));

    // Assign replacement code
    await db
      .update(giftCodes)
      .set({
        status: "ASSIGNED",
        assignedOrderId: del.orderId,
        assignedAt: now,
        updatedAt: now,
      })
      .where(eq(giftCodes.id, replacement.id));

    // Update delivery record
    await db
      .update(giftCodeDeliveries)
      .set({
        giftCodeId: replacement.id,
        replacedFromId: oldCode.id,
        status: "PENDING",
        adminNote: `Code replaced: ${reason}`,
        updatedAt: now,
      })
      .where(eq(giftCodeDeliveries.id, deliveryId));

    // Audit log
    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "GIFT_CODE_REPLACED",
      targetType: "GIFT_DELIVERY",
      targetId: String(deliveryId),
      detail: `Replaced code ${oldCode.maskedCode} with ${replacement.maskedCode}. Reason: ${reason}`,
    });

    revalidatePath("/nexora/gift-cards/deliveries");
    revalidatePath("/nexora/gift-cards/inventory");
    return { success: `Code replaced with ${replacement.maskedCode}. Delivery marked PENDING.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to replace code." };
  }
}

/**
 * Save operational settings for Gift Codes mode (PRD §106).
 */
export async function saveOperationalSettingsAction(
  _prev: GiftAdminFormState,
  formData: FormData
): Promise<GiftAdminFormState> {
  try {
    const admin = await requireAdmin();
    const reservationMinutes = String(formData.get("reservationMinutes") ?? "10");
    const lowStockThreshold = String(formData.get("lowStockThreshold") ?? "10");
    const deliveryTargetMinutes = String(formData.get("deliveryTargetMinutes") ?? "5");
    const maxQtyPerOrder = String(formData.get("maxQtyPerOrder") ?? "5");

    await setPlatformSetting("cart_reservation_minutes", reservationMinutes);
    await setPlatformSetting("low_stock_threshold", lowStockThreshold);
    await setPlatformSetting("delivery_target_minutes", deliveryTargetMinutes);
    await setPlatformSetting("max_quantity_per_order", maxQtyPerOrder);

    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "PLATFORM_SETTINGS_UPDATED",
      targetType: "PLATFORM_SETTING",
      detail: `Updated parameters: reservation=${reservationMinutes}m, lowStock=${lowStockThreshold}, deliveryTarget=${deliveryTargetMinutes}m, maxQty=${maxQtyPerOrder}`,
    });

    revalidatePath("/nexora/settings");
    return { success: "Operational parameters saved successfully." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save settings." };
  }
}