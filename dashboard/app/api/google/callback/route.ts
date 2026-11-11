import { NextResponse, type NextRequest } from "next/server";
import { getMe, getTz } from "@/lib/data";
import { googleExchange, pullCalendar } from "@/lib/google";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const done = (msg: string) => {
    const res = NextResponse.redirect(new URL("/settings", url.origin));
    res.cookies.set("flash", msg, { maxAge: 60, path: "/" });
    res.cookies.delete("oauth_state");
    return res;
  };
  if (!(await getMe())) return NextResponse.redirect(new URL("/login", url.origin));
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== req.cookies.get("oauth_state")?.value) return done("Google sign-in was cancelled or expired. Try again.");
  try {
    await googleExchange(code);
    const r = await pullCalendar(await getTz());
    return done(`Google connected. ${r?.count ?? 0} calendar events pulled in.`);
  } catch (e) {
    return done(`Couldn't connect Google: ${(e as Error).message}`);
  }
}
