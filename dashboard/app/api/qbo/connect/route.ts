import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getMe } from "@/lib/data";
import { qboAuthUrl, qboConfigured } from "@/lib/qbo";
import { tokenKey } from "@/lib/qbo-crypto";

export async function GET(req: Request) {
  if (!(await getMe())) return NextResponse.redirect(new URL("/login", req.url));
  if (!qboConfigured()) return NextResponse.redirect(new URL("/settings", req.url));
  // Tokens are only ever stored encrypted: refuse to start a connection without the key.
  try {
    tokenKey();
  } catch (e) {
    const back = NextResponse.redirect(new URL("/settings", req.url));
    back.cookies.set("flash", `Couldn't connect QuickBooks: ${(e as Error).message}`, { maxAge: 60, path: "/" });
    return back;
  }
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(qboAuthUrl(state));
  res.cookies.set("oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
