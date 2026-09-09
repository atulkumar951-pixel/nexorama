import { db } from "@/db";
import { categories, products } from "@/db/schema";
import ActionForm from "@/components/ActionForm";
import { saveProductAction } from "@/lib/actions/admin-actions";

type Product = typeof products.$inferSelect;

export default async function ProductForm({ product }: { product?: Product }) {
  const cats = await db.select().from(categories).orderBy(categories.sortOrder);

  return (
    <div className="card p-6">
      <ActionForm action={saveProductAction} submitLabel={product ? "Save changes" : "Create product (draft)"}>
        {product && <input type="hidden" name="id" value={product.id} />}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label">Title *</label>
            <input name="title" required defaultValue={product?.title} className="input" placeholder="Complete Java Notes" />
          </div>
          <div>
            <label className="label">Slug (URL)</label>
            <input name="slug" defaultValue={product?.slug} className="input" placeholder="auto-generated from title" />
          </div>
          <div>
            <label className="label">Category</label>
            <select name="categoryId" defaultValue={product?.categoryId ?? ""} className="input">
              <option value="">— None —</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Product type</label>
            <select name="productType" defaultValue={product?.productType ?? "PDF"} className="input">
              {["PDF", "ZIP", "DOCUMENT", "EBOOK", "COURSE", "BUNDLE"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cover image URL</label>
            <input name="coverImage" defaultValue={product?.coverImage ?? ""} className="input" placeholder="/images/covers/java-notes.jpg" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Short description</label>
            <input name="shortDescription" defaultValue={product?.shortDescription ?? ""} className="input" maxLength={300} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Full description</label>
            <textarea name="description" defaultValue={product?.description ?? ""} rows={6} className="input" />
          </div>
          <div>
            <label className="label">Regular price (₹) *</label>
            <input name="price" type="number" min={0} required defaultValue={product?.price ?? 0} className="input" />
          </div>
          <div>
            <label className="label">Sale price (₹, optional)</label>
            <input name="salePrice" type="number" min={0} defaultValue={product?.salePrice ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Download limit (0 = unlimited)</label>
            <input name="downloadLimit" type="number" min={0} defaultValue={product?.downloadLimit ?? 5} className="input" />
          </div>
          <div>
            <label className="label">Access duration in days (empty = lifetime)</label>
            <input name="accessDays" type="number" min={1} defaultValue={product?.accessDays ?? ""} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="isFree" defaultChecked={product?.isFree} className="h-4 w-4 rounded" /> Free product
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured} className="h-4 w-4 rounded" /> Featured on homepage
          </label>
        </div>
      </ActionForm>
    </div>
  );
}
