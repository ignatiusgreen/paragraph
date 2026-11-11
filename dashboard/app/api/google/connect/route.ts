import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getMe } from "@/lib/data";
import { googleAuthUrl, googleConfigured } from "@/lib/google";

export async function GET(req: Request) {
  if (!(await getMe())) return NextResponse.redirect(new URL("/login", req.url));
  if (!googleConfigured()) return NextResponse.redirect(new URL("/settings", req.url));
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
