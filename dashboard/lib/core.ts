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
  return { row: todo };
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
