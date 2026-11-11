import { NextResponse, type NextRequest } from "next/server";
import { getMe } from "@/lib/data";
import { qboExchange, syncQbo } from "@/lib/qbo";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const done = (msg: string) => {
    const res = NextResponse.redirect(new URL("/settings", url.origin));
    res.cookies.set("flash", msg, { maxAge: 60, path: "/" });
    res.cookies.delete("oauth_state");
    return res;
  };
  if (!(await getMe())) return NextResponse.redirect(new URL("/login", url.origin));
  const code = url.searchParams.get("code"), realm = url.searchParams.get("realmId");
  if (!code || !realm || url.searchParams.get("state") !== req.cookies.get("oauth_state")?.value) return done("QuickBooks sign-in was cancelled or expired. Try again.");
  try {
    await qboExchange(code, realm);
    const r = await syncQbo();
    return done(`QuickBooks connected. ${r?.clients ?? 0} clients pulled in.`);
  } catch (e) {
    return done(`Couldn't connect QuickBooks: ${(e as Error).message}`);
  }
}
