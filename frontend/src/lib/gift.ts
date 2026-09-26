import { api, getToken } from "./api";

// ---------------------------------------------------------------------------
// Gift Codes — API types & thin client helpers (backend: /api/gift/*)
// ---------------------------------------------------------------------------

export interface GiftStock {
  sellable: number;
  outOfStock: boolean;
  lowStock: boolean;
  total?: number;
  available?: number;
  reserved?: number;
  sold?: number;
  assigned?: number;
  expired?: number;
}

export interface GiftCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  sortOrder?: number;
  _count?: { products: number };
}

export interface GiftBrand {
  brand: string;
  productCount: number;
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
  category: { id: string; name: string; slug: string } | null;
  stock: GiftStock;
}

export interface GiftProductDetail extends GiftProductCard {
  description: string | null;
  terms: string | null;
  instructions: string | null;
  purchaseLimit: number | null;
  allowCoupon: boolean;
  refundPolicy: "NON_REFUNDABLE";
  related: GiftProductCard[];
}

export interface GiftBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  position: string;
}

export interface GiftCartLine {
  id: string;
  giftProductId: string;
  quantity: number;
  reservationExpiresAt: string | null;
  reservationStatus: "ACTIVE" | "EXPIRED";
  product: {
    id: string;
    name: string;
    slug: string;
    brandName: string;
    image: string | null;
    denomination: string;
    sellingPrice: string;
    currency: string;
    category: { id: string; name: string; slug: string } | null;
  };
  unitPrice: number;
  lineTotal: number;
  stock: { sellable: number; outOfStock: boolean; lowStock: boolean };
}

export interface GiftCartSummary {
  items: GiftCartLine[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  currency: string;
  reservationExpiresAt: string | null;
  reservationMinutes: number;
  serverTime: string;
}

export interface GiftCheckoutSession {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayKeyId: string | null;
  email: string;
  reservationExpiresAt: string | null;
}

export interface GiftPaymentConfirmation {
  orderId: string;
  orderNumber: string;
  amountPaid: number;
  currency: string;
  paymentStatus: "SUCCESS" | "PENDING" | "FAILED";
  deliveryStatus: string;
  recipientEmail: string;
  expectedDeliveryMinutes: number;
  message: string;
}

export interface GiftOrderItem {
  id: string;
  title: string;
  brandName: string;
  image?: string | null;
  denomination: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryStatus?: string;
}

export interface GiftOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  deliveryStatus: string;
  deliveryTargetMinutes: number;
  expectedBy: string | null;
  overdue: boolean;
  items: GiftOrderItem[];
}

export interface GiftOrderDetail extends Omit<GiftOrderSummary, "items"> {
  refundPolicy: "NON_REFUNDABLE";
  deliveryMessage: string;
  recipientEmailMasked: string;
  items: GiftOrderItem[];
}

export interface GiftVaultItem {
  id: string;
  orderNumber: string;
  product: string;
  denomination: string;
  quantity: number;
  amount: number;
  currency: string;
  purchasedAt: string;
  paymentStatus: string;
  deliveryStatus: string;
  deliveryMessage: string;
  sentAt: string | null;
  recipientEmailMasked: string;
}

export interface GiftListResponse<T> {
  products?: T[];
  categories?: T[];
  brands?: T[];
  banners?: T[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export const inr = (value: string | number) => `₹${Number(value).toLocaleString("en-IN")}`;

/** Authenticated call to the gift-code customer API. */
export function giftApi<T>(path: string, options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {}) {
  return api<T>(`/api/gift${path}`, { ...options, token: getToken() });
}

export function stockLabel(stock: GiftStock) {
  if (stock.outOfStock) return { text: "Out of stock", cls: "bg-red-50 text-red-600" };
  if (stock.lowStock) return { text: `Only ${stock.sellable} left`, cls: "bg-amber-50 text-amber-700" };
  return { text: "In stock", cls: "bg-emerald-50 text-emerald-700" };
}
