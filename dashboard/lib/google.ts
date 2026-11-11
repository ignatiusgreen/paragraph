import "server-only";
import { adminDb } from "./supabase/admin";
import { appUrl, getIntegration, setIntegration } from "./integrations";
import { addDays, addMinutes, today } from "./format";
import type { Event, Note, Todo } from "./types";

// Calendar events on the primary calendar, plus Docs the app itself creates (the notebook).
const SCOPES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/drive.file", "email"];
const CAL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const DOCS = "https://docs.googleapis.com/v1/documents";

type GoogleAuth = { refresh_token: string; access_token?: string; expires_at?: number; email?: string; notebook_doc_id?: string; last_pull?: string };

export const googleConfigured = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = () => `${appUrl()}/api/google/callback`;

export function googleAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(), response_type: "code", scope: SCOPES.join(" "),
    access_type: "offline", prompt: "consent", state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description ?? json.error ?? "Google token request failed");
  return json as { access_token: string; expires_in: number; refresh_token?: string; id_token?: string };
}

export async function googleExchange(code: string) {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  if (!t.refresh_token) throw new Error("Google didn't return a refresh token. Remove the app at myaccount.google.com/permissions and connect again.");
  let email: string | undefined;
  try { email = JSON.parse(Buffer.from(t.id_token!.split(".")[1], "base64url").toString()).email; } catch { /* optional */ }
  const prev = await getIntegration<GoogleAuth>("google");
  await setIntegration("google", {
    ...prev, refresh_token: t.refresh_token, access_token: t.access_token, expires_at: Date.now() + t.expires_in * 1000, email,
  });
}

export const getGoogle = () => (googleConfigured() ? getIntegration<GoogleAuth>("google") : Promise.resolve(null));

async function accessToken(): Promise<string | null> {
  const g = await getGoogle();
  if (!g?.refresh_token) return null;
  if (g.access_token && g.expires_at && g.expires_at > Date.now() + 60_000) return g.access_token;
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: g.refresh_token });
  await setIntegration("google", { ...g, access_token: t.access_token, expires_at: Date.now() + t.expires_in * 1000 });
  return t.access_token;
}

async function g<T = any>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await accessToken();
  if (!token) throw new Error("Google isn't connected");
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: { authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (res.status === 204) return {} as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json?.error?.message ?? `Google API ${res.status}`), { status: res.status });
  return json as T;
}

// ---------------- Calendar ----------------
const hm = (t: string) => t.slice(0, 5);

function todoBody(t: Todo, tz: string) {
  const timed = t.due_time ? hm(t.due_time) : null;
  return {
    summary: `${t.done ? "✓" : "☐"} ${t.title}${t.urgent && !t.done ? " (urgent)" : ""}`,
    description: [t.notes, `To-do from the Paragraph dashboard: ${appUrl()}/todos`].filter(Boolean).join("\n\n"),
    start: timed ? { dateTime: `${t.due_date}T${timed}:00`, timeZone: tz } : { date: t.due_date },
    end: timed ? { dateTime: `${t.due_date}T${addMinutes(timed, 30)}:00`, timeZone: tz } : { date: addDays(t.due_date!, 1) },
    reminders: t.remind_minutes != null && !t.done
      ? { useDefault: false, overrides: [{ method: "popup", minutes: t.remind_minutes }] }
      : { useDefault: false, overrides: [] },
    transparency: "transparent",
    extendedProperties: { private: { paragraph: "todo", id: t.id } },
  };
}

function eventBody(e: Event, tz: string) {
  const end = e.end_date ?? e.date;
  const timed = e.start_time ? hm(e.start_time) : null;
  return {
    summary: e.title,
    location: e.location ?? undefined,
    description: e.notes ?? undefined,
    start: timed ? { dateTime: `${e.date}T${timed}:00`, timeZone: tz } : { date: e.date },
    end: timed
      ? { dateTime: `${end}T${e.end_time ? hm(e.end_time) : addMinutes(timed, 60)}:00`, timeZone: tz }
      : { date: addDays(end, 1) },
    extendedProperties: { private: { paragraph: "event", id: e.id } },
  };
}

async function upsertGcal(id: string | null, body: unknown): Promise<string> {
  if (id) {
    try {
      await g(`${CAL}/${id}`, { method: "PATCH", body });
      return id;
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status !== 404 && status !== 410) throw err;
    }
  }
  const created = await g<{ id: string }>(CAL, { method: "POST", body });
  return created.id;
}

export async function deleteGcal(id: string | null) {
  if (!id || !(await getGoogle())) return;
  try { await g(`${CAL}/${id}`, { method: "DELETE" }); } catch { /* already gone */ }
}

/** Push a to-do to Google Calendar. Returns the event id it now lives at (null if it has no date). */
export async function pushTodo(t: Todo, tz: string): Promise<string | null> {
  if (!(await getGoogle())) return t.gcal_event_id;
  if (!t.due_date) { await deleteGcal(t.gcal_event_id); return null; }
  return upsertGcal(t.gcal_event_id, todoBody(t, tz));
}

export async function pushEvent(e: Event, tz: string): Promise<string | null> {
  if (!(await getGoogle())) return e.gcal_event_id;
  return upsertGcal(e.gcal_event_id, eventBody(e, tz));
}

type GEvent = {
  id: string; status?: string; summary?: string; location?: string; description?: string;
  start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
};

/** Pull the Google calendar into the events table (30 days back, a year ahead). */
export async function pullCalendar(tz: string): Promise<{ count: number } | null> {
  const auth = await getGoogle();
  if (!auth) return null;
  const from = addDays(today(tz), -30), to = addDays(today(tz), 365);
  const items: GEvent[] = [];
  let pageToken: string | undefined;
  do {
    const p = new URLSearchParams({
      timeMin: `${from}T00:00:00Z`, timeMax: `${to}T00:00:00Z`, singleEvents: "true", maxResults: "2500", timeZone: tz, orderBy: "startTime",
    });
    if (pageToken) p.set("pageToken", pageToken);
    const page = await g<{ items?: GEvent[]; nextPageToken?: string }>(`${CAL}?${p}`);
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  const sb = adminDb();
  const rows = items
    .filter((i) => i.status !== "cancelled" && i.extendedProperties?.private?.paragraph !== "todo" && (i.start?.date || i.start?.dateTime))
    .map((i) => {
      const allDay = !!i.start?.date;
      const date = allDay ? i.start!.date! : i.start!.dateTime!.slice(0, 10);
      const endDate = allDay ? addDays(i.end?.date ?? addDays(date, 1), -1) : (i.end?.dateTime ?? i.start!.dateTime!).slice(0, 10);
      return {
        gcal_event_id: i.id, title: i.summary ?? "(No title)", date, end_date: endDate !== date ? endDate : null,
        start_time: allDay ? null : i.start!.dateTime!.slice(11, 16), end_time: allDay ? null : (i.end?.dateTime ?? "").slice(11, 16) || null,
        location: i.location ?? null, notes: i.description ?? null,
      };
    });
  const { data: existing } = await sb.from("events").select("id,gcal_event_id").not("gcal_event_id", "is", null).gte("date", from).lte("date", to);
  const known = new Map((existing ?? []).map((r) => [r.gcal_event_id as string, r.id as string]));
  const seen = new Set(rows.map((r) => r.gcal_event_id));
  const inserts = rows.filter((r) => !known.has(r.gcal_event_id)).map((r) => ({ ...r, source: "google" }));
  if (inserts.length) await sb.from("events").insert(inserts);
  for (const r of rows.filter((r) => known.has(r.gcal_event_id))) await sb.from("events").update(r).eq("gcal_event_id", r.gcal_event_id);
  const gone = [...known].filter(([gid]) => !seen.has(gid)).map(([, id]) => id);
  if (gone.length) await sb.from("events").delete().in("id", gone);
  await setIntegration("google", { ...(await getIntegration("google")), last_pull: new Date().toISOString() });
  return { count: rows.length };
}

// ---------------- Notebook → Google Doc (one tab per tag) ----------------
type Tab = { tabProperties: { tabId: string; title: string }; documentTab?: { body?: { content?: { endIndex?: number }[] } } };

function noteText(n: Note, projectTitle?: string) {
  const meta = [n.noted_on, n.tags.length ? n.tags.join(", ") : null, projectTitle ? `Project: ${projectTitle}` : null].filter(Boolean).join("  ·  ");
  const parts = [meta];
  if (n.body) parts.push(n.body.trim());
  for (const l of n.links ?? []) parts.push(`${l.label ? l.label + ": " : ""}${l.url}`);
  if (n.image_url) parts.push(`Image: ${n.image_url}`);
  return parts.join("\n");
}

export async function notebookDocUrl() {
  const auth = await getGoogle();
  return auth?.notebook_doc_id ? `https://docs.google.com/document/d/${auth.notebook_doc_id}/edit` : null;
}

/** Rewrite the notebook Google Doc from the notes table. */
export async function syncNotebook(): Promise<string | null> {
  const auth = await getGoogle();
  if (!auth) return null;
  const sb = adminDb();
  const [{ data: notes }, { data: projects }] = await Promise.all([
    sb.from("notes").select("*").order("noted_on", { ascending: false }).order("created_at", { ascending: false }),
    sb.from("projects").select("id,title"),
  ]);
  const titles = new Map((projects ?? []).map((p) => [p.id, p.title as string]));
  const all = (notes ?? []) as Note[];
  const groups = new Map<string, Note[]>([["All notes", all]]);
  for (const n of all) for (const tag of n.tags.length ? n.tags : ["untagged"]) groups.set(tag, [...(groups.get(tag) ?? []), n]);

  let docId = auth.notebook_doc_id;
  if (docId) {
    try { await g(`${DOCS}/${docId}?fields=documentId`); } catch { docId = undefined; }
  }
  if (!docId) {
    docId = (await g<{ documentId: string }>(DOCS, { method: "POST", body: { title: "Paragraph Notebook" } })).documentId;
    await setIntegration("google", { ...(await getIntegration("google")), notebook_doc_id: docId });
  }
  const load = async () => (await g<{ tabs: Tab[] }>(`${DOCS}/${docId}?includeTabsContent=true`)).tabs ?? [];
  let tabs = await load();
  const wanted = [...groups.keys()];
  const have = new Set(tabs.map((t) => t.tabProperties.title));
  const setup: unknown[] = [];
  // A new doc starts with one untitled tab: reuse it for "All notes".
  if (!have.has("All notes") && tabs.length === 1 && !wanted.includes(tabs[0].tabProperties.title)) {
    setup.push({ updateDocumentTabProperties: { tabProperties: { tabId: tabs[0].tabProperties.tabId, title: "All notes" }, fields: "title" } });
    have.add("All notes");
  }
  for (const title of wanted) if (!have.has(title)) setup.push({ addDocumentTab: { tabProperties: { title } } });
  let tabbed = true;
  if (setup.length) {
    try {
      await g(`${DOCS}/${docId}:batchUpdate`, { method: "POST", body: { requests: setup } });
      tabs = await load();
    } catch {
      tabbed = false; // tabs couldn't be created: write everything into the first tab, grouped by tag
    }
  }

  const write = async (tab: Tab, sections: { heading?: string; notes: Note[] }[]) => {
    const tabId = tab.tabProperties.tabId;
    const content = tab.documentTab?.body?.content ?? [];
    const end = content.length ? content[content.length - 1].endIndex ?? 1 : 1;
    let text = "";
    const styles: { start: number; end: number; style: string }[] = [];
    const add = (line: string, style?: string) => {
      const start = 1 + text.length;
      text += line + "\n";
      if (style) styles.push({ start, end: 1 + text.length, style });
    };
    for (const s of sections) {
      if (s.heading) add(s.heading, "HEADING_1");
      for (const n of s.notes) { add(n.title, "HEADING_2"); add(noteText(n, n.project_id ? titles.get(n.project_id) : undefined)); add(""); }
    }
    if (!text) text = "No notes yet.\n";
    const requests: unknown[] = [];
    if (end > 2) requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: end - 1, tabId } } });
    requests.push({ insertText: { location: { index: 1, tabId }, text } });
    requests.push({ updateParagraphStyle: { range: { startIndex: 1, endIndex: 1 + text.length, tabId }, paragraphStyle: { namedStyleType: "NORMAL_TEXT" }, fields: "namedStyleType" } });
    for (const s of styles) {
      requests.push({ updateParagraphStyle: { range: { startIndex: s.start, endIndex: s.end, tabId }, paragraphStyle: { namedStyleType: s.style }, fields: "namedStyleType" } });
    }
    await g(`${DOCS}/${docId}:batchUpdate`, { method: "POST", body: { requests } });
  };

  if (tabbed) {
    for (const tab of tabs) await write(tab, [{ notes: groups.get(tab.tabProperties.title) ?? [] }]);
  } else {
    await write(tabs[0], [...groups].filter(([k]) => k !== "All notes").map(([heading, notes]) => ({ heading, notes })));
  }
  return docId!;
}
