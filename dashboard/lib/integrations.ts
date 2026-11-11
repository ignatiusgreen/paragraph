import "server-only";
import { adminDb } from "./supabase/admin";

export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const hasServiceKey = () => !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function getIntegration<T = Record<string, unknown>>(provider: string): Promise<T | null> {
  if (!hasServiceKey()) return null;
  const { data } = await adminDb().from("integrations").select("data").eq("provider", provider).maybeSingle();
  return (data?.data as T) ?? null;
}
export async function setIntegration(provider: string, data: Record<string, unknown>) {
  await adminDb().from("integrations").upsert({ provider, data, updated_at: new Date().toISOString() });
}
export async function clearIntegration(provider: string) {
  await adminDb().from("integrations").delete().eq("provider", provider);
}
export async function setSetting(key: string, value: unknown) {
  await adminDb().from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
}
