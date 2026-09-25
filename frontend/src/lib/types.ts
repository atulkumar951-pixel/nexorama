// Shared API types mirroring the backend responses

export type ProductType = "PDF" | "ZIP" | "DOCUMENT" | "EBOOK" | "PLAYLIST" | "BUNDLE";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  children?: Pick<Category, "id" | "name" | "slug" | "image">[];
  _count?: { products: number };
}

export interface ProductCard {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  productType: ProductType;
  coverImage?: string | null;
  price: string;
  salePrice?: string | null;
  isFree: boolean;
  isFeatured: boolean;
  salesCount: number;
  createdAt: string;
  category?: { id: string; name: string; slug: string } | null;
}

export interface LectureSummary {
  id: string;
  title: string;
  description?: string | null;
  duration?: number | null;
  thumbnail?: string | null;
  sortOrder: number;
  isPreview: boolean;
  provider: string;
}

export interface ProductDetail extends ProductCard {
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  assets: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    isPreview: boolean;
    sortOrder: number;
  }>;
  chapters: Array<{
    id: string;
    title: string;
    sortOrder: number;
    lectures: LectureSummary[];
  }>;
  bundleItems: Array<{
    child: Pick<ProductCard, "id" | "title" | "slug" | "coverImage" | "price" | "salePrice" | "productType">;
  }>;
  related: ProductCard[];
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  position: "HERO" | "PROMOTIONAL" | "CATEGORY" | "CAMPAIGN";
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  phone: string | null;
  emailVerified: boolean;
  status: string;
  authProvider: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Effective display price in paise→rupees formatting helper. */
export function formatPrice(price: string | number | null | undefined, isFree?: boolean): string {
  if (isFree) return "Free";
  const value = Number(price ?? 0);
  if (value === 0) return "Free";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function discountPercent(price: string | number, salePrice?: string | number | null): number | null {
  const p = Number(price);
  const s = salePrice != null ? Number(salePrice) : NaN;
  if (!Number.isFinite(s) || s <= 0 || s >= p) return null;
  return Math.round(((p - s) / p) * 100);
}

// ------------------------------------------------------------------
// Gift Codes Marketplace Types
// ------------------------------------------------------------------

export type MarketplaceMode = "DIGITAL" | "GIFT_CODES";

export interface GiftCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  icon?: string | null;
  _count?: { products: number };
}

export interface StockSummary {
  available: number;
  reserved: number;
  sold: number;
  inStock: boolean;
  lowStock: boolean;
  outOfStock: boolean;
}

export interface GiftProductCard {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  image: string | null;
  denomination: string;
  sellingPrice: string;
  currency: string;
  featured: boolean;
  category?: { id: string; name: string; slug: string } | null;
  stock: StockSummary;
}

export interface GiftProductDetail extends GiftProductCard {
  description?: string | null;
  terms?: string | null;
  instructions?: string | null;
  purchaseLimit?: number | null;
  allowCoupon: boolean;
  lowStockThreshold?: number | null;
}

export interface GiftCartLine {
  id: string;
  giftProductId: string;
  name: string;
  brandName: string;
  denomination: string;
  sellingPrice: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  availableStock: number;
  hasActiveHold: boolean;
  reservationExpiresAt: string | null;
  holdSecondsRemaining: number;
}

export interface GiftCartSummary {
  items: GiftCartLine[];
  itemCount: number;
  subtotal: number;
  expiresAt: string | null;
  minSecondsRemaining: number;
}

export interface GiftCodeVaultItem {
  id: string;
  orderNumber: string;
  productName: string;
  brandName: string;
  denomination: string;
  maskedCode: string;
  code?: string;
  status: "PENDING" | "ASSIGNED" | "PROCESSING" | "SENT" | "MANUAL_REVIEW" | "FAILED" | "CANCELLED" | "REPLACED";
  deliveryMethod: string;
  recipientEmail: string;
  sentAt?: string | null;
  createdAt: string;
}

