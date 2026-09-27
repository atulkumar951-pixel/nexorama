import { redirect } from "next/navigation";
import { getMarketplaceMode } from "@/lib/marketplace-mode";
import ProductForm from "../product-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · New Product" };

export default async function NewProductPage() {
  const mode = await getMarketplaceMode();
  if (mode === "GIFT_CODES") {
    redirect("/nexora/gift-cards/products");
  }
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Create Product</h1>
      <p className="mt-1 text-sm text-slate-500">New products start as drafts. Add files/lectures after saving, then publish.</p>
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
