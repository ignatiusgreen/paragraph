import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteGcal, pushEvent, pushTodo } from "./google";
import type { Event, Todo } from "./types";

type Result<T> = { row: T | null; error?: string; warning?: string };

/** Create or update a to-do, then mirror it to Google Calendar. */
export async function saveTodo(sb: SupabaseClient, id: string | null, patch: Partial<Todo>, tz: string): Promise<Result<Todo>> {
  if (patch.done !== undefined) patch.done_at = patch.done ? new Date().toISOString() : null;
  const q = id ? sb.from("todos").update(patch).eq("id", id) : sb.from("todos").insert(patch);
  const { data, error } = await q.select().maybeSingle();
  if (error || !data) return { row: null, error: error?.message ?? "To-do not found" };
  const todo = data as Todo;
  try {
    const gid = await pushTodo(todo, tz);
    if (gid !== todo.gcal_event_id) {
      await sb.from("todos").update({ gcal_event_id: gid }).eq("id", todo.id);
      todo.gcal_event_id = gid;
    }
  } catch (e) {
    return { row: todo, warning: `Saved, but Google Calendar didn't update: ${(e as Error).message}` };
  }
  // Finishing a to-do that came from a lead's next step clears that next step, ready for the following one.
  if (patch.done && todo.lead_id) {
    await sb.from("leads").update({ next_step: null, next_on: null }).eq("id", todo.lead_id).eq("next_step", todo.title);
  }
  return { row: todo };
}

/**
 * Keep a lead's "next step" on the to-do list: one open to-do per lead, filed under New Biz, with the
 * step as its title and the "by" date as its deadline. Changing the step updates it; clearing the step removes it.
 */
export async function syncLeadTodo(sb: SupabaseClient, leadId: string, tz: string): Promise<{ warning?: string }> {
  const { data: lead } = await sb.from("leads").select("id,name,company,next_step,next_on,status").eq("id", leadId).maybeSingle();
  if (!lead) return {};
  const { data: open } = await sb.from("todos").select("*").eq("lead_id", leadId).eq("done", false).order("created_at").limit(1);
  const current = (open?.[0] as Todo | undefined) ?? null;
  const step = (lead.next_step ?? "").trim();
  if (!step) {
    if (current) await removeTodo(sb, current.id);
    return {};
  }
  const patch: Partial<Todo> = {
    title: step, due_date: lead.next_on ?? null, category: "newbiz", lead_id: lead.id, project_id: null,
    notes: `Next step for ${[lead.name, lead.company].filter(Boolean).join(", ")} (New Biz lead).`,
  };
  if (current) {
    if (current.title === step && (current.due_date ?? null) === (lead.next_on ?? null)) return {};
    const r = await saveTodo(sb, current.id, { title: patch.title, due_date: patch.due_date, notes: patch.notes }, tz);
    return { warning: r.error ?? r.warning };
  }
  // Don't recreate a step that was already ticked off (the lead still shows it until it is changed).
  const { data: finished } = await sb.from("todos").select("id").eq("lead_id", leadId).eq("done", true).eq("title", step).limit(1);
  if (finished?.length) return {};
  const r = await saveTodo(sb, null, patch, tz);
  return { warning: r.error ?? r.warning };
}

export async function removeTodo(sb: SupabaseClient, id: string) {
  const { data } = await sb.from("todos").select("gcal_event_id").eq("id", id).maybeSingle();
  const { error } = await sb.from("todos").delete().eq("id", id);
  if (!error) await deleteGcal(data?.gcal_event_id ?? null);
  return { error: error?.message };
}

export async function saveEvent(sb: SupabaseClient, id: string | null, patch: Partial<Event>, tz: string): Promise<Result<Event>> {
  const q = id ? sb.from("events").update(patch).eq("id", id) : sb.from("events").insert(patch);
  const { data, error } = await q.select().maybeSingle();
  if (error || !data) return { row: null, error: error?.message ?? "Event not found" };
  const event = data as Event;
  try {
    const gid = await pushEvent(event, tz);
    if (gid !== event.gcal_event_id) {
      await sb.from("events").update({ gcal_event_id: gid }).eq("id", event.id);
      event.gcal_event_id = gid;
    }
  } catch (e) {
    return { row: event, warning: `Saved, but Google Calendar didn't update: ${(e as Error).message}` };
  }
  return { row: event };
}

export async function removeEvent(sb: SupabaseClient, id: string) {
  const { data } = await sb.from("events").select("gcal_event_id").eq("id", id).maybeSingle();
  const { error } = await sb.from("events").delete().eq("id", id);
  if (!error) await deleteGcal(data?.gcal_event_id ?? null);
  return { error: error?.message };
}
