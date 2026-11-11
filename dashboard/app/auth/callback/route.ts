import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";

// Handles the magic link in the sign-in email (the 6-digit code is the other option).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const supabase = await db();
  if (code) await supabase.auth.exchangeCodeForSession(code);
  else if (tokenHash) await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  return NextResponse.redirect(new URL("/", url.origin));
}
