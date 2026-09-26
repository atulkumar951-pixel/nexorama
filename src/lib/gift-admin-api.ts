import "server-only";

/**
 * Server-side proxy client for the Gift Codes admin API (`/api/admin/gift/*`).
 *
 * The Gift Codes backend keeps admins in a separate identity space (`admins`
 * table, JWT with `typ: "admin"`), so the Nexora panel authenticates here with
 * a dedicated service account and caches the token for its 12h lifetime. The
 * token never reaches the browser — pages/actions call these helpers from
 * server components and server actions only.
 */

const API_BASE = (process.env.GIFT_API_URL || process.env.API_URL || "http://localhost:5000").replace(/\/+$/, "");
// Defaults match backend/prisma/seed.ts (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD).
const ADMIN_EMAIL = process.env.GIFT_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.GIFT_ADMIN_PASSWORD || "Admin@12345";

export class GiftAdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "GiftAdminApiError";
  }
}

interface TokenCache {
  value: string;
  expiresAt: number;
}

// Cached on globalThis so dev-server HMR and serverless warm instances reuse it.
const globalForGift = globalThis as typeof globalThis & { __giftAdminToken?: TokenCache };

async function loginAdmin(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new GiftAdminApiError(
      res.status,
      `Gift admin login failed (HTTP ${res.status}). Check GIFT_ADMIN_EMAIL / GIFT_ADMIN_PASSWORD on this deployment.`,
    );
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new GiftAdminApiError(500, "Gift admin login returned no token.");
  // Backend issues 12h admin JWTs — refresh 30 minutes before expiry.
  globalForGift.__giftAdminToken = { value: data.token, expiresAt: Date.now() + (12 * 60 - 30) * 60_000 };
  return data.token;
}

async function getToken(forceRefresh = false): Promise<string> {
  const cached = globalForGift.__giftAdminToken;
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.value;
  return loginAdmin();
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

/** Call the Gift Codes admin API. Retries once with a fresh login on 401. */
export async function giftAdminApi<T>(
  path: string,
  init: { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", body } = init;

  const call = async (token: string): Promise<Response> =>
    fetch(`${API_BASE}/api/admin/gift${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

  let res: Response;
  try {
    res = await call(await getToken());
    if (res.status === 401) res = await call(await getToken(true));
  } catch (err) {
    if (err instanceof GiftAdminApiError) throw err;
    throw new GiftAdminApiError(
      0,
      `Cannot reach the Gift Codes API at ${API_BASE}. Set GIFT_API_URL (and ensure the backend is running).`,
    );
  }

  if (!res.ok) {
    let message = `Gift Codes API error (HTTP ${res.status}).`;
    try {
      const data = (await res.json()) as ApiErrorBody;
      if (data?.error?.message) message = data.error.message;
    } catch {
      // empty body
    }
    throw new GiftAdminApiError(res.status, message);
  }

  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Response shapes consumed by the Nexora Gift Codes pages
// ---------------------------------------------------------------------------

export interface GiftAdminDashboard {
  cards: {
    totalGiftProducts: number;
    activeProducts: number;
    totalCodes: number;
    availableCodes: number;
    reservedCodes: number;
    assignedCodes: number;
    soldCodes: number;
    expiredCodes: number;
    pendingDelivery: number;
    manualReview: number;
    deliveredToday: number;
    giftCodeRevenue: number;
    giftCodeOrders: number;
  };
  sla: {
    targetMinutes: number;
    overdue: number;
    open: number;
    oldestPending: { orderNumber: string; paidAt: string | null } | null;
  };
  alerts: {
    lowStock: Array<{
      id: string;
      name: string;
      brandName: string;
      denomination: string;
      sellable: number;
      threshold: number;
      lowStock: boolean;
    }>;
    expiringSoon: number;
    manualReview: number;
  };
}

export interface GiftAdminModeConfig {
  mode: "DIGITAL" | "GIFT_CODES";
  settings: {
    giftCodePurchase: boolean;
    couponSupport: boolean;
    reservationMinutes: number;
    lowStockThreshold: number;
    maxQuantityPerOrder: number;
    maxQuantityPerUserPerDay: number;
    maxTransactionAmount: number;
    deliveryTargetMinutes: number;
  };
  rawCodeAccessRoles: string[];
}

export interface GiftStockSummary {
  total: number;
  available: number;
  reserved: number;
  assigned: number;
  sold: number;
  expired: number;
  sellable: number;
  outOfStock: boolean;
  lowStock: boolean;
}

export interface GiftAdminProduct {
  id: string;
  name: string;
  brandName: string;
  denomination: string;
  sellingPrice: string;
  status: string;
  featured: boolean;
  stock: GiftStockSummary | null;
}

export interface GiftInventoryCode {
  id: string;
  maskedCode: string;
  batchLabel: string | null;
  internalNote: string | null;
  expiryDate: string | null;
  status: string;
  assignedAt: string | null;
  soldAt: string | null;
  viewCount: number;
  createdAt: string;
  giftProduct: { id: string; name: string; brandName: string; denomination: string };
  assignedOrder: { id: string; orderNumber: string } | null;
}

export interface GiftDeliveryRow {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  recipientEmail: string;
  product: string;
  denomination: string;
  quantity: number;
  amount: number;
  currency: string;
  codeAssigned: boolean;
  maskedCode: string;
  deliveryStatus: string;
  purchaseTime: string;
  minutesWaiting: number | null;
  targetMinutes: number;
  overdue: boolean;
  adminNote: string | null;
  failureReason: string | null;
  sentAt: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GiftInventoryResponse {
  codes: GiftInventoryCode[];
  pagination: Pagination;
}

export interface GiftProductsResponse {
  products: GiftAdminProduct[];
  pagination: Pagination;
}

export interface GiftDeliveryQueueResponse {
  deliveries: GiftDeliveryRow[];
  summary: { pending: number; overdue: number; manualReview: number };
  pagination: Pagination;
}
