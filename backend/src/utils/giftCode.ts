import crypto from "crypto";
import { env } from "../config/env";

/**
 * Gift code cryptography.
 *
 * Raw gift codes are sensitive inventory (PRD §14, §88, §89). They are:
 *   • encrypted at rest with AES-256-GCM (authenticated encryption),
 *   • hashed with SHA-256 for duplicate detection without decrypting,
 *   • masked for any list/table rendering.
 *
 * Codes are NEVER normalised beyond trimming outer whitespace — provider formats
 * vary and altering a code could invalidate it (PRD §12).
 */

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

/** Resolve the 32-byte encryption key from env, falling back to a derived key. */
function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const configured = env.giftCodes.encryptionKey?.trim();
  if (configured) {
    // Accept 64-char hex, 44-char base64, or any passphrase (stretched with SHA-256).
    let key: Buffer | null = null;
    if (/^[0-9a-fA-F]{64}$/.test(configured)) {
      key = Buffer.from(configured, "hex");
    } else {
      try {
        const b64 = Buffer.from(configured, "base64");
        if (b64.length === KEY_BYTES) key = b64;
      } catch {
        // ignore — fall through to hash-derived key
      }
    }
    cachedKey = key ?? crypto.createHash("sha256").update(configured, "utf8").digest();
    return cachedKey;
  }

  // No dedicated key configured: derive a stable key from AUTH_SECRET so that
  // encryption still works out of the box (a dedicated key is recommended).
  cachedKey = crypto
    .createHash("sha256")
    .update(`${env.authSecret}::gift-code-encryption-v1`, "utf8")
    .digest();
  return cachedKey;
}

/** Trim only the surrounding whitespace — never otherwise alter a provider code. */
export function canonicalCode(raw: string): string {
  return raw.trim();
}

/** Encrypt a raw gift code for storage. Format: v1:iv:tag:ciphertext (base64url). */
export function encryptGiftCode(rawCode: string): string {
  const plain = canonicalCode(rawCode);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

/** Decrypt a stored gift code. Throws when the payload was tampered with. */
export function decryptGiftCode(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Unsupported gift code payload format");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv(ALGO, encryptionKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}

/** Deterministic hash used for duplicate detection + lookups (never reversible). */
export function hashGiftCode(rawCode: string): string {
  return crypto.createHash("sha256").update(canonicalCode(rawCode), "utf8").digest("hex");
}

/**
 * Mask a gift code for display, e.g. `XXXX-XXXX-••••-A9F2`.
 * Reveals at most the final 4 characters so operators can eyeball a match
 * without exposing the full secret.
 */
export function maskGiftCode(rawCode: string): string {
  const code = canonicalCode(rawCode);
  if (!code) return "••••";
  const tail = code.length > 4 ? code.slice(-4) : "";
  const hidden = "•".repeat(Math.max(4, Math.min(24, code.length - tail.length)));
  if (!tail) return hidden;
  // Keep dash structure if the provider uses dashes.
  return code.includes("-") ? `${hidden}-${tail}` : `${hidden}${tail}`;
}

/** Constant-time comparison helper for signatures/secrets. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Generate a reservation token for temporary inventory holds. */
export function generateReservationToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/**
 * Generate a recognisable gift-code order number, e.g. `NX-GC-20260925-00021`
 * (PRD §33). Uniqueness is enforced by the database plus retry at insert time.
 */
export function generateGiftOrderNumber(sequence: number): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const seq = String(Math.max(1, sequence)).padStart(5, "0");
  return `NX-GC-${yyyy}${mm}${dd}-${seq}`;
}

/** Random 5-digit tiebreaker used when allocating the daily sequence. */
export function giftOrderSequence(): number {
  return crypto.randomInt(1, 99999);
}
