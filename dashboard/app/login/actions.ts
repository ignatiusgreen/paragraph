"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/server";
import { adminDb } from "@/lib/supabase/admin";
import { appUrl, hasServiceKey } from "@/lib/integrations";

const back = (msg: string, email?: string): never =>
  redirect(`/login?${email ? `email=${encodeURIComponent(email)}&` : ""}error=${encodeURIComponent(msg)}`);

/** Only people in the members table get in; the database enforces it, this just gives a clear message. */
async function finish() {
  const supabase = await db();
  const { data } = await supabase.from("members").select("email").limit(1);
  if (!data?.length) {
    await supabase.auth.signOut();
    back("That account isn't on the access list for this dashboard.");
  }
  redirect("/");
}

export async function passwordSignIn(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const supabase = await db();
  const { error } = await supabase.auth.signInWithPassword({ email, password: String(form.get("password") ?? "") });
  if (error) back(/invalid login/i.test(error.message) ? "Wrong email or password." : `Couldn't sign in: ${error.message}`);
  await finish();
}

export async function sendCode(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) back("Enter your email first.");
  // The first code request creates the login, but only for emails on the access list.
  let allowed = false;
  if (hasServiceKey()) {
    const { data } = await adminDb().from("members").select("email").ilike("email", email).maybeSingle();
    if (!data) back("That email isn't on the access list for this dashboard.");
    allowed = true;
  }
  const supabase = await db();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: allowed, emailRedirectTo: `${appUrl()}/auth/callback` } });
  if (error) back(/signups not allowed|not found/i.test(error.message) ? "No login exists for that email." : error.message);
  redirect(`/login?email=${encodeURIComponent(email)}&sent=1`);
}

export async function verifyCode(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const supabase = await db();
  const { error } = await supabase.auth.verifyOtp({ email, token: String(form.get("code") ?? "").replace(/\s/g, ""), type: "email" });
  if (error) redirect(`/login?email=${encodeURIComponent(email)}&sent=1&error=${encodeURIComponent("That code didn't work. Try again or send a new one.")}`);
  await finish();
}
