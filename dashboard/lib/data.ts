import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "./supabase/server";
import { DEFAULT_TZ } from "./format";
import type { Client, Project, Section, Todo, Event, Note } from "./types";

export const getMe = cache(async () => {
  const supabase = await db();
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email;
  if (!email) return null;
  const { data } = await supabase.from("members").select("*").ilike("email", email).maybeSingle();
  return (data as { email: string; name: string | null } | null) ?? null;
});

/** The viewer's time zone (set by the browser in a cookie). */
export async function getTz() {
  const tz = (await cookies()).get("tz")?.value;
  try {
    if (tz) { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz; }
  } catch { /* bad cookie */ }
  return DEFAULT_TZ;
}

export const getSettings = cache(async () => {
  const supabase = await db();
  const { data } = await supabase.from("settings").select("key,value");
  const m: Record<string, unknown> = {};
  for (const r of data ?? []) m[r.key] = r.value;
  return m;
});

export const getSection = cache(async (key: string) => {
  const supabase = await db();
  const { data } = await supabase.from("sections").select("*").eq("key", key).maybeSingle();
  return (data as Section | null) ?? null;
});

export const getProjects = cache(async () => {
  const supabase = await db();
  const { data } = await supabase.from("projects").select("*").eq("archived", false).order("created_at");
  return (data ?? []) as Project[];
});

export const getClients = cache(async () => {
  const supabase = await db();
  const { data } = await supabase.from("clients").select("*").order("name");
  return (data ?? []) as Client[];
});

export const getTodos = cache(async () => {
  const supabase = await db();
  const { data } = await supabase.from("todos").select("*").order("due_date", { nullsFirst: false }).order("created_at");
  return (data ?? []) as Todo[];
});

export const getEvents = cache(async (from: string, to: string) => {
  const supabase = await db();
  const { data } = await supabase.from("events").select("*").gte("date", from).lte("date", to).order("date").order("start_time", { nullsFirst: true });
  return (data ?? []) as Event[];
});

export const getNotes = cache(async () => {
  const supabase = await db();
  const { data } = await supabase.from("notes").select("*").order("noted_on", { ascending: false }).order("created_at", { ascending: false });
  return (data ?? []) as Note[];
});

export async function rows<T>(table: string, order = "created_at", ascending = true) {
  const supabase = await db();
  const { data } = await supabase.from(table).select("*").order(order, { ascending });
  return (data ?? []) as T[];
}
