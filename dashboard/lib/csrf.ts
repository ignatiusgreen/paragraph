import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { appUrl } from "./integrations";

/**
 * True only when the request's Origin header names this app's own host. Browsers send Origin on every
 * cross-site POST, so a form or script on another site fails this; a request with no Origin is refused too.
 */
export function sameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return false;
  let host: string;
  try { host = new URL(origin).host; } catch { return false; }
  const own = new Set<string>();
  try { own.add(new URL(appUrl()).host); } catch { /* NEXT_PUBLIC_APP_URL unset or invalid */ }
  for (const name of ["x-forwarded-host", "host"]) {
    const value = headers.get(name)?.split(",")[0]?.trim();
    if (value) own.add(value);
  }
  return own.has(host);
}

/** A random secret kept in an httpOnly cookie; the form carries a token derived from it and the signed-in user. */
export const newCsrfSecret = () => randomBytes(32).toString("hex");

/** Token for a form: tied to the cookie secret, the signed-in user and the one action it is for. */
export function csrfToken(secret: string, session: string, purpose: string) {
  return createHmac("sha256", secret).update(`${purpose}:${session}`).digest("hex");
}

export function csrfValid(secret: string | undefined, session: string, purpose: string, submitted: unknown) {
  if (!secret || typeof submitted !== "string") return false;
  const expected = Buffer.from(csrfToken(secret, session, purpose));
  const given = Buffer.from(submitted);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
