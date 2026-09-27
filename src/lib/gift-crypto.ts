import crypto from "crypto";

/**
 * Encryption and hashing utility for Gift Codes inventory (PRD §14, §42, §44, §61).
 * Uses AES-256-GCM authenticated encryption so codes are safely encrypted at rest.
 * Uses SHA-256 hashing for uniqueness checks without exposing plaintext.
 */

const SECRET_SEED =
  process.env.GIFT_ENCRYPTION_KEY ||
  process.env.AUTH_SECRET ||
  "nexora-gift-encryption-default-seed-key-32chars!";

// Derive 32-byte encryption key
const ENCRYPTION_KEY = crypto.scryptSync(SECRET_SEED, "nexora-gift-salt", 32);

/**
 * Encrypt a plain gift code using AES-256-GCM.
 * Output format: `iv:tag:ciphertext` (all hex encoded)
 */
export function encryptGiftCode(plainCode: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainCode.trim(), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt an AES-256-GCM encrypted gift code string.
 */
export function decryptGiftCode(encryptedString: string): string {
  if (!encryptedString || !encryptedString.includes(":")) {
    return encryptedString;
  }

  const parts = encryptedString.split(":");
  if (parts.length !== 3) {
    return encryptedString;
  }

  const [ivHex, tagHex, contentHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const content = Buffer.from(contentHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Deterministic SHA-256 hash of a gift code for duplicate detection (PRD §44, §61).
 */
export function hashGiftCode(plainCode: string): string {
  const normalized = plainCode.trim();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Mask a gift code for safe inventory display (PRD §42).
 * e.g., "ABCD-EFGH-1234" -> "••••-••••-1234"
 */
export function maskGiftCode(plainCode: string): string {
  const trimmed = plainCode.trim();
  if (trimmed.length <= 4) {
    return "••••" + trimmed;
  }
  const last4 = trimmed.slice(-4);
  const prefix = trimmed.slice(0, -4).replace(/[A-Za-z0-9]/g, "•");
  return `${prefix}${last4}`;
}
