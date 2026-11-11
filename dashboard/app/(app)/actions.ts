"use server";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { after } from "next/server";
import { db } from "@/lib/supabase/server";
import { adminDb } from "@/lib/supabase/admin";
import { getMe, getTz } from "@/lib/data";
import { readForm, TABLES } from "@/lib/schema";
import { removeEvent, removeTodo, saveEvent, saveTodo } from "@/lib/core";
import { pullCalendar, syncNotebook } from "@/lib/google";
import { syncQbo } from "@/lib/qbo";
import { snapshotMetrics } from "@/lib/metrics";
import { clearIntegration, hasServiceKey } from "@/lib/integrations";
import type { Event, Todo } from "@/lib/types";

async function guard() {
  const me = await getMe();
  if (!me) throw new Error("Not signed in");
  return db();
}

/** Show a banner on the next page load. */
async function flash(message: string) {
  (await cookies()).set("flash", message, { maxAge: 60, path: "/" });
}
const refresh = () => revalidatePath("/", "layout");
const notebookSoon = () => after(async () => { try { await syncNotebook(); } catch { /* shown as "not synced" in Notebook */ } });

/** Create or update a row in any whitelisted table. The form names the table in `_table` and the row in `_id`. */
export async function saveRow(f: FormData) {
  const supabase = await guard();
  const table = String(f.get("_table"));
  const id = (f.get("_id") as string) || null;
  if (!TABLES[table]) throw new Error("Unknown table");
  const row = readForm(table, f);
  const tz = await getTz();
  let error: string | undefined, warning: string | undefined, savedId: string | null = id;

  if (table === "todos") {
    const r = await saveTodo(supabase, id, row as Partial<Todo>, tz);
    error = r.error; warning = r.warning; savedId = r.row?.id ?? null;
  } else if (table === "events") {
    const r = await saveEvent(supabase, id, row as Partial<Event>, tz);
    error = r.error; warning = r.warning;
  } else {
    const q = id ? supabase.from(table).update(row).eq("id", id) : supabase.from(table).insert(row);
    const { data, error: e } = await q.select("id").maybeSingle();
    error = e?.message; savedId = data?.id ?? id;
  }

  if (!error && table === "notes") {
    // "Add a to-do" on a note creates a linked to-do.
    const title = String(f.get("todo_title") ?? "").trim();
    if (title && savedId) {
      const r = await saveTodo(supabase, null, {
        title, note_id: savedId, project_id: (row.project_id as string) ?? null, due_date: (f.get("todo_due") as string) || null,
        urgent: f.get("todo_urgent") === "on",
      }, tz);
      error = r.error; warning = r.warning;
    }
    notebookSoon();
  }
  if (error) await flash(`Couldn't save: ${error}`);
  else if (warning) await flash(warning);
  refresh();
}

export async function deleteRow(f: FormData) {
  const supabase = await guard();
  const table = String(f.get("_table"));
  const id = String(f.get("_id"));
  if (!TABLES[table]) throw new Error("Unknown table");
  let error: string | undefined;
  if (table === "todos") error = (await removeTodo(supabase, id)).error;
  else if (table === "events") error = (await removeEvent(supabase, id)).error;
  else error = (await supabase.from(table).delete().eq("id", id)).error?.message;
  if (table === "notes") notebookSoon();
  if (error) await flash(`Couldn't delete: ${error}`);
  refresh();
}

export async function toggleTodo(id: string, done: boolean) {
  const supabase = await guard();
  const r = await saveTodo(supabase, id, { done }, await getTz());
  if (r.error) await flash(`Couldn't update: ${r.error}`);
  refresh();
}

/** Header and background image for a section. */
export async function saveSection(f: FormData) {
  const supabase = await guard();
  const { error } = await supabase.from("sections").upsert({
    key: String(f.get("key")), header_url: (f.get("header_url") as string) || null, background_url: (f.get("background_url") as string) || null,
    background_color: /^#[0-9a-f]{6}$/i.test(String(f.get("background_color"))) ? String(f.get("background_color")).toLowerCase() : null,
  });
  if (error) await flash(`Couldn't save: ${error.message}`);
  refresh();
}

/** Save simple settings: every field named `set:<key>` is stored under that key. */
export async function saveSettings(f: FormData) {
  const supabase = await guard();
  for (const [k, v] of f.entries()) {
    if (!k.startsWith("set:")) continue;
    const key = k.slice(4), raw = String(v).trim();
    const value = key === "feeds" ? raw.split(/\s+/).filter((u) => /^https?:\/\//.test(u)) : key === "cash_on_hand" ? (raw === "" ? null : Number(raw.replace(/[$,\s]/g, ""))) : raw;
    const { error } = await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) await flash(`Couldn't save: ${error.message}`);
  }
  refresh();
}

/** Paste of "email, name, company" lines into the newsletter list. */
export async function importContacts(f: FormData) {
  const supabase = await guard();
  const rows = String(f.get("csv") ?? "").split(/\r?\n/).map((line) => line.split(/[,\t]/).map((c) => c.trim().replace(/^"|"$/g, "")))
    .filter((c) => /.+@.+\..+/.test(c[0] ?? "")).map((c) => ({ email: c[0].toLowerCase(), name: c[1] || null, company: c[2] || null }));
  if (!rows.length) { await flash("No email addresses found. Use one per line: email, name, company."); return refresh(); }
  const { error } = await supabase.from("contacts").upsert(rows, { onConflict: "email", ignoreDuplicates: true });
  await flash(error ? `Couldn't import: ${error.message}` : `Imported ${rows.length} contact${rows.length === 1 ? "" : "s"}.`);
  refresh();
}

// ---------------- Sync buttons ----------------
async function run(what: string, fn: () => Promise<string | null>) {
  await guard();
  try {
    const msg = await fn();
    await flash(msg ?? `${what} isn't connected yet. Connect it in Settings.`);
  } catch (e) {
    await flash(`${what} sync failed: ${(e as Error).message}`);
  }
  refresh();
}
export async function syncCalendarNow() {
  const tz = await getTz();
  await run("Google Calendar", async () => { const r = await pullCalendar(tz); return r ? `Calendar synced: ${r.count} events.` : null; });
}
export async function syncNotebookNow() {
  await run("Google Docs", async () => ((await syncNotebook()) ? "Notebook synced to Google Docs." : null));
}
export async function syncQboNow() {
  await run("QuickBooks", async () => { const r = await syncQbo(); return r ? `QuickBooks synced: ${r.clients} clients.` : null; });
}
export async function snapshotMetricsNow() {
  await run("Analytics", async () => { const n = await snapshotMetrics(); return n ? `Recorded ${n} numbers.` : "No analytics keys are set yet. Add numbers by hand, or add the Vimeo and Instagram keys."; });
}
export async function disconnect(f: FormData) {
  await guard();
  await clearIntegration(String(f.get("provider")));
  refresh();
}

// ---------------- AI access tokens ----------------
export async function createAgentToken(_prev: { token?: string; error?: string }, f: FormData): Promise<{ token?: string; error?: string }> {
  await guard();
  if (!hasServiceKey()) return { error: "SUPABASE_SERVICE_ROLE_KEY isn't set, so tokens can't be stored yet." };
  const token = `pgf_${randomBytes(24).toString("base64url")}`;
  const { error } = await adminDb().from("agent_tokens").insert({
    name: String(f.get("name") || "INSTINCT AI"), token_hash: createHash("sha256").update(token).digest("hex"),
  });
  if (error) return { error: error.message };
  refresh();
  return { token };
}
export async function revokeAgentToken(f: FormData) {
  await guard();
  await adminDb().from("agent_tokens").delete().eq("id", String(f.get("id")));
  refresh();
}

/** Order and width of the dashboard widgets. */
export async function saveDashboardLayout(layout: { id: string; span: string }[]) {
  const supabase = await guard();
  const value = layout.filter((l) => /^[a-z]+$/.test(l.id) && /^s(3|4|6|8|12)$/.test(l.span)).slice(0, 30);
  const { error } = await supabase.from("settings").upsert({ key: "dashboard_layout", value, updated_at: new Date().toISOString() });
  if (error) await flash(`Couldn't save the layout: ${error.message}`);
  refresh();
}
