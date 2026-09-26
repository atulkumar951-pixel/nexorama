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

/** Switch the marketplace mode (DIGITAL ↔ GIFT_CODES) on the backend. */
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