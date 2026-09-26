import crypto from "crypto";

/** Generate a cryptographically random URL-safe token. */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** SHA-256 hash of a token, for storing lookups safely. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Generate a human-friendly order number, e.g. ORD-2026-000124 */
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomInt(0, 1_000_000);
  return `ORD-${year}-${rand.toString().padStart(6, "0")}`;
}

/** URL slug from a title. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Make a slug unique by appending a short random suffix when needed. */
export function slugWithSuffix(base: string): string {
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${slugify(base) || "item"}-${suffix}`;
}

export function clientIpFrom(req: { headers: Record<string, unknown>; ip?: string; socket: { remoteAddress?: string } }): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) {
    return xf.split(",")[0].trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}
