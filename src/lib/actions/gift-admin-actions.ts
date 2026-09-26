"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { giftAdminApi } from "@/lib/gift-admin-api";

export type GiftAdminFormState = { error?: string; success?: string };

/**
 * Mark gift deliveries as sent (email delivered manually by the ops team).
 * Gated by the Nexora session first, then proxied with the backend admin JWT.
 */
export async function markDeliveriesSentAction(
  deliveryIds: string[],
  _formData?: FormData,
): Promise<GiftAdminFormState> {
  try {
    await requireAdmin();
    if (!deliveryIds.length) return { error: "No deliveries selected." };
    await giftAdminApi("/deliveries/mark-sent", { method: "POST", body: { deliveryIds } });
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
  formData: FormData,
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
    purchaseLimit: formData.get("purchaseLimit") ? Number(formData.get("purchaseLimit")) : null,
    lowStockThreshold: formData.get("lowStockThreshold") ? Number(formData.get("lowStockThreshold")) : null,
  };

  try {
    await requireAdmin();
    await giftAdminApi("/products", { method: "POST", body });
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
  _formData?: FormData,
): Promise<GiftAdminFormState> {
  try {
    await requireAdmin();
    await giftAdminApi(`/products/${productId}/status`, { method: "PATCH", body: { status } });
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
  formData: FormData,
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
export async function setMarketplaceModeAction(
  _prev: GiftAdminFormState,
  formData: FormData,
): Promise<GiftAdminFormState> {
  const mode = String(formData.get("mode") ?? "");
  if (mode !== "DIGITAL" && mode !== "GIFT_CODES") {
    return { error: "Invalid marketplace mode." };
  }
  try {
    await requireAdmin();
    await giftAdminApi("/settings/mode", { method: "POST", body: { mode } });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to switch mode." };
  }
  revalidatePath("/nexora/gift-cards");
  return { success: `Marketplace mode set to ${mode === "DIGITAL" ? "Digital Products" : "Gift Codes"}.` };
}