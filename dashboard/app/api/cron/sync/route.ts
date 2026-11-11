import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { adminDb } from "@/lib/supabase/admin";
import { pullCalendar, syncNotebook } from "@/lib/google";
import { syncQbo } from "@/lib/qbo";
import { snapshotMetrics } from "@/lib/metrics";
import { DEFAULT_TZ } from "@/lib/format";

// Daily: pull Google Calendar, refresh QuickBooks, record analytics, rewrite the notebook doc.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await adminDb().from("settings").select("value").eq("key", "timezone").maybeSingle();
  const tz = typeof data?.value === "string" && data.value ? data.value : DEFAULT_TZ;
  const out: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try { out[name] = await fn(); } catch (e) { out[name] = { error: (e as Error).message }; }
  };
  await step("calendar", () => pullCalendar(tz));
  await step("quickbooks", () => syncQbo());
  await step("metrics", () => snapshotMetrics());
  await step("notebook", () => syncNotebook());
  return NextResponse.json(out);
}
