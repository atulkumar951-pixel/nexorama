import { getMarketplaceMode, getPlatformSetting } from "@/lib/marketplace-mode";
import SettingsClient from "./settings-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Marketplace Settings" };

export default async function AdminSettingsPage() {
  const mode = await getMarketplaceMode();
  const reservationMinutes = await getPlatformSetting("cart_reservation_minutes", "10");
  const lowStockThreshold = await getPlatformSetting("low_stock_threshold", "10");
  const maxQtyPerOrder = await getPlatformSetting("max_quantity_per_order", "5");
  const deliveryTargetMinutes = await getPlatformSetting("delivery_target_minutes", "5");
  const couponSupport = (await getPlatformSetting("coupon_support", "false")) === "true";
  const giftPurchaseEnabled = (await getPlatformSetting("gift_purchase_enabled", "true")) !== "false";

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform & Marketplace Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Control the master marketplace mode and operational parameters for digital products and gift codes.
        </p>
      </div>

      <SettingsClient
        initialMode={mode}
        initialSettings={{
          reservationMinutes: Number(reservationMinutes),
          lowStockThreshold: Number(lowStockThreshold),
          maxQtyPerOrder: Number(maxQtyPerOrder),
          deliveryTargetMinutes: Number(deliveryTargetMinutes),
          couponSupport,
          giftPurchaseEnabled,
        }}
      />
    </div>
  );
}
