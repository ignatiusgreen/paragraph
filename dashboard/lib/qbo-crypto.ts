import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM encryption for QuickBooks OAuth tokens at rest.
// Stored form: enc:v1:<base64 nonce>.<base64 ciphertext + 16-byte auth tag>
const PREFIX = "enc:v1:";
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

/** The 32-byte key from QBO_TOKEN_KEY (base64). Throws if it is missing or the wrong size: there is no plaintext fallback. */
export function tokenKey(): Buffer {
  const raw = process.env.QBO_TOKEN_KEY?.trim();
  if (!raw) throw new Error("QBO_TOKEN_KEY is not set. Add the 32-byte base64 key in Vercel before connecting or syncing QuickBooks.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("QBO_TOKEN_KEY must be a base64-encoded 32-byte key.");
  return key;
}

/** True for a value this module encrypted (current version). */
export const isSealed = (value: string) => value.startsWith(PREFIX);

/** Encrypt one token. `field` is bound into the ciphertext so one field's value can't be swapped into another. */
export function seal(plain: string, field: string): string {
  const nonce = randomBytes(NONCE_BYTES); // fresh random nonce for every write
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), nonce);
  cipher.setAAD(Buffer.from(`qbo:${field}`));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return `${PREFIX}${nonce.toString("base64")}.${body.toString("base64")}`;
}

/** Decrypt a value made by seal(). Throws on anything malformed or tampered with; never returns the input as-is. */
export function unseal(value: string, field: string): string {
  if (!isSealed(value)) throw new Error("QuickBooks token is not in the encrypted format.");
  const [nonceB64, bodyB64, ...extra] = value.slice(PREFIX.length).split(".");
  const nonce = Buffer.from(nonceB64 ?? "", "base64");
  const body = Buffer.from(bodyB64 ?? "", "base64");
  if (extra.length || nonce.length !== NONCE_BYTES || body.length <= TAG_BYTES) {
    throw new Error("Stored QuickBooks token is malformed. Disconnect and reconnect QuickBooks.");
  }
  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), nonce);
  decipher.setAAD(Buffer.from(`qbo:${field}`));
  decipher.setAuthTag(body.subarray(body.length - TAG_BYTES));
  try {
    return Buffer.concat([decipher.update(body.subarray(0, body.length - TAG_BYTES)), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Stored QuickBooks token could not be decrypted (wrong QBO_TOKEN_KEY, or the value was altered). Disconnect and reconnect QuickBooks.");
  }
}

/**
 * Read one stored token field. Encrypted values are decrypted (and throw if that fails); values with no
 * prefix are legacy plaintext from before encryption was added, reported through `onLegacy` so the caller
 * can re-save them encrypted. Anything that looks like another encryption version is refused.
 */
export function openStored(value: string, field: string, onLegacy: () => void): string {
  if (isSealed(value)) return unseal(value, field);
  if (value.startsWith("enc:")) throw new Error("Stored QuickBooks token uses an unsupported encryption version.");
  onLegacy();
  return value;
}
