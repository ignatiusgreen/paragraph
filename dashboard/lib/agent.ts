import "server-only";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { adminDb } from "./supabase/admin";
import { hasServiceKey } from "./integrations";
import { removeEvent, removeTodo, saveEvent, saveTodo } from "./core";
import { syncNotebook } from "./google";
import { addDays, DEFAULT_TZ, today } from "./format";
import { STAGES, type Kind } from "./types";

/** Check a bearer token (header or ?token=) against the stored hashes. */
export async function agentAuthorized(req: Request) {
  if (!hasServiceKey()) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : new URL(req.url).searchParams.get("token");
  if (!token) return false;
  const hash = createHash("sha256").update(token).digest("hex");
  const sb = adminDb();
  const { data } = await sb.from("agent_tokens").select("id").eq("token_hash", hash).maybeSingle();
  if (!data) return false;
  await sb.from("agent_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return true;
}

async function tz() {
  const { data } = await adminDb().from("settings").select("value").eq("key", "timezone").maybeSingle();
  return typeof data?.value === "string" && data.value ? data.value : DEFAULT_TZ;
}

type Args = Record<string, any>;
type Tool = { name: string; description: string; inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] }; run: (a: Args) => Promise<unknown> };

const str = (description: string) => ({ type: "string", description });
const DATE = "Date as YYYY-MM-DD";
const TIME = "24-hour time as HH:MM, in the owner's time zone";

/** Resolve a project by id or by (part of) its title. */
async function projectId(a: Args): Promise<string | null | undefined> {
  if (a.project_id !== undefined) return a.project_id;
  if (!a.project) return undefined;
  const { data } = await adminDb().from("projects").select("id,title").ilike("title", `%${a.project}%`).limit(2);
  if (!data?.length) throw new Error(`No project matches "${a.project}". Call list_projects to see the titles.`);
  if (data.length > 1) throw new Error(`More than one project matches "${a.project}". Use project_id.`);
  return data[0].id;
}
const pick = (a: Args, keys: string[]) => Object.fromEntries(keys.filter((k) => a[k] !== undefined).map((k) => [k, a[k]]));
const unwrap = <T,>(r: { row: T | null; error?: string; warning?: string }) => {
  if (r.error) throw new Error(r.error);
  return r.warning ? { ...r.row, warning: r.warning } : r.row;
};

const todoProps = {
  title: str("What needs doing"),
  notes: str("Extra detail"),
  due_date: str(`Deadline. ${DATE}`),
  due_time: str(`Optional time of day for the deadline. ${TIME}`),
  urgent: { type: "boolean", description: "Mark as urgent" },
  remind_minutes: { type: "integer", description: "Reminder this many minutes before the deadline (e.g. 60, 1440 for a day)" },
  project: str("Title (or part of the title) of the project to tag"),
  project_id: str("Id of the project to tag (alternative to `project`)"),
};
const eventProps = {
  title: str("Event title"),
  date: str(`Start date. ${DATE}`),
  end_date: str(`Last day, for multi-day events. ${DATE}`),
  start_time: str(`Start time; leave out for an all-day event. ${TIME}`),
  end_time: str(`End time. ${TIME}`),
  location: str("Where"),
  notes: str("Description"),
  project: str("Title (or part of the title) of the project to tag"),
  project_id: str("Id of the project to tag (alternative to `project`)"),
};

export const TOOLS: Tool[] = [
  {
    name: "get_summary",
    description: "Overview of the dashboard: today's date, open and urgent to-dos, the next two weeks of schedule, and active projects by stage.",
    inputSchema: { type: "object", properties: {} },
    run: async () => {
      const sb = adminDb(), t = today(await tz());
      const [todos, events, projects] = await Promise.all([
        sb.from("todos").select("id,title,urgent,due_date,due_time,project_id").eq("done", false).order("due_date", { nullsFirst: false }),
        sb.from("events").select("id,title,date,end_date,start_time,end_time,location").gte("date", t).lte("date", addDays(t, 14)).order("date").order("start_time"),
        sb.from("projects").select("id,kind,title,stage").eq("archived", false),
      ]);
      return { today: t, open_todos: todos.data ?? [], upcoming_events: events.data ?? [], projects: projects.data ?? [] };
    },
  },
  {
    name: "list_todos",
    description: "List to-dos. By default only open ones.",
    inputSchema: { type: "object", properties: { include_done: { type: "boolean" }, urgent_only: { type: "boolean" }, due_before: str(DATE), project_id: str("Only this project") } },
    run: async (a) => {
      let q = adminDb().from("todos").select("*").order("due_date", { nullsFirst: false }).order("created_at");
      if (!a.include_done) q = q.eq("done", false);
      if (a.urgent_only) q = q.eq("urgent", true);
      if (a.due_before) q = q.lte("due_date", a.due_before);
      if (a.project_id) q = q.eq("project_id", a.project_id);
      const { data, error } = await q.limit(200);
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "add_todo",
    description: "Add a to-do. With a due date it also appears on the owner's Google Calendar.",
    inputSchema: { type: "object", properties: todoProps, required: ["title"] },
    run: async (a) => unwrap(await saveTodo(adminDb(), null, { ...pick(a, ["title", "notes", "due_date", "due_time", "urgent", "remind_minutes"]), project_id: (await projectId(a)) ?? null, source: "agent" }, await tz())),
  },
  {
    name: "update_todo",
    description: "Change a to-do: any of its fields, or mark it done / not done.",
    inputSchema: { type: "object", properties: { id: str("To-do id"), ...todoProps, done: { type: "boolean", description: "true to complete it" } }, required: ["id"] },
    run: async (a) => {
      const pid = await projectId(a);
      return unwrap(await saveTodo(adminDb(), a.id, { ...pick(a, ["title", "notes", "due_date", "due_time", "urgent", "remind_minutes", "done"]), ...(pid !== undefined ? { project_id: pid } : {}) }, await tz()));
    },
  },
  {
    name: "delete_todo",
    description: "Delete a to-do (and its calendar entry).",
    inputSchema: { type: "object", properties: { id: str("To-do id") }, required: ["id"] },
    run: async (a) => { const r = await removeTodo(adminDb(), a.id); if (r.error) throw new Error(r.error); return { deleted: a.id }; },
  },
  {
    name: "list_events",
    description: "List schedule events between two dates (default: today through the next 30 days).",
    inputSchema: { type: "object", properties: { from: str(DATE), to: str(DATE) } },
    run: async (a) => {
      const t = today(await tz());
      const { data, error } = await adminDb().from("events").select("*").gte("date", a.from ?? t).lte("date", a.to ?? addDays(t, 30)).order("date").order("start_time").limit(500);
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "add_event",
    description: "Add an event to the schedule. It is pushed to the owner's Google Calendar.",
    inputSchema: { type: "object", properties: eventProps, required: ["title", "date"] },
    run: async (a) => unwrap(await saveEvent(adminDb(), null, { ...pick(a, ["title", "date", "end_date", "start_time", "end_time", "location", "notes"]), project_id: (await projectId(a)) ?? null, source: "agent" }, await tz())),
  },
  {
    name: "update_event",
    description: "Change an event (move it, rename it, etc.).",
    inputSchema: { type: "object", properties: { id: str("Event id"), ...eventProps }, required: ["id"] },
    run: async (a) => {
      const pid = await projectId(a);
      return unwrap(await saveEvent(adminDb(), a.id, { ...pick(a, ["title", "date", "end_date", "start_time", "end_time", "location", "notes"]), ...(pid !== undefined ? { project_id: pid } : {}) }, await tz()));
    },
  },
  {
    name: "delete_event",
    description: "Delete an event from the schedule and Google Calendar.",
    inputSchema: { type: "object", properties: { id: str("Event id") }, required: ["id"] },
    run: async (a) => { const r = await removeEvent(adminDb(), a.id); if (r.error) throw new Error(r.error); return { deleted: a.id }; },
  },
  {
    name: "list_projects",
    description: "List client, documentary and narrative projects with their stage.",
    inputSchema: { type: "object", properties: { kind: { type: "string", enum: ["client", "documentary", "narrative"] } } },
    run: async (a) => {
      let q = adminDb().from("projects").select("id,kind,title,stage,logline,client_id,budget,expected_on").eq("archived", false).order("created_at");
      if (a.kind) q = q.eq("kind", a.kind);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "update_project_stage",
    description: `Move a project to another stage. Stages — client: ${STAGES.client.map((s) => s.value).join(", ")}; documentary: ${STAGES.documentary.map((s) => s.value).join(", ")}; narrative: ${STAGES.narrative.map((s) => s.value).join(", ")}.`,
    inputSchema: { type: "object", properties: { id: str("Project id"), stage: str("New stage") }, required: ["id", "stage"] },
    run: async (a) => {
      const sb = adminDb();
      const { data: p } = await sb.from("projects").select("kind").eq("id", a.id).maybeSingle();
      if (!p) throw new Error("Project not found");
      if (!STAGES[p.kind as Kind].some((s) => s.value === a.stage)) throw new Error(`"${a.stage}" isn't a ${p.kind} stage`);
      const { data, error } = await sb.from("projects").update({ stage: a.stage }).eq("id", a.id).select("id,kind,title,stage").maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "add_note",
    description: "Capture an idea in the notebook. Common tags: film, random, new biz, documentary.",
    inputSchema: {
      type: "object",
      properties: { title: str("Note title"), body: str("Body copy"), tags: { type: "array", items: { type: "string" } }, link: str("A URL to attach"), project: todoProps.project, project_id: todoProps.project_id },
      required: ["title"],
    },
    run: async (a) => {
      const { data, error } = await adminDb().from("notes").insert({
        title: a.title, body: a.body ?? null, tags: (a.tags ?? []).map((t: string) => String(t).toLowerCase()),
        links: a.link ? [{ label: "", url: a.link }] : [], project_id: (await projectId(a)) ?? null, noted_on: today(await tz()),
      }).select().maybeSingle();
      if (error) throw new Error(error.message);
      try { await syncNotebook(); } catch { /* the doc catches up on the next sync */ }
      return data;
    },
  },
  {
    name: "list_notes",
    description: "Recent notebook entries, optionally filtered by tag.",
    inputSchema: { type: "object", properties: { tag: str("Only notes with this tag") } },
    run: async (a) => {
      let q = adminDb().from("notes").select("id,title,body,tags,noted_on,project_id").order("noted_on", { ascending: false }).limit(50);
      if (a.tag) q = q.contains("tags", [String(a.tag).toLowerCase()]);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    },
  },
];

export async function callTool(name: string, args: Args) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool "${name}"`);
  for (const k of tool.inputSchema.required ?? []) if (args?.[k] == null || args[k] === "") throw new Error(`Missing "${k}"`);
  const result = await tool.run(args ?? {});
  if (!/^(list_|get_)/.test(name)) revalidatePath("/", "layout");
  return result;
}
