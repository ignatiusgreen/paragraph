import Link from "next/link";
import { loadPrivacy } from "@/lib/privacy";
import { Card, Check, Empty, F, PageHead, TodoItem, todoProjectOptions } from "@/components/ui";
import { Submit } from "@/components/client";
import { saveRow } from "@/app/(app)/actions";
import { getProjects, getTodos, getTz } from "@/lib/data";
import { getGoogle } from "@/lib/google";
import { today } from "@/lib/format";
import { KIND_LABEL, PERSONAL, REMINDERS, type Kind, type Todo } from "@/lib/types";

type Column = { key: string; title: string; note?: string; tone?: string; todos: Todo[]; add: Record<string, string> };

/** Soonest deadline first; to-dos with no deadline last. */
const byDeadline = (a: Todo, b: Todo) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.created_at.localeCompare(b.created_at);

export default async function Todos({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await loadPrivacy();
  const { show = "open" } = await searchParams;
  const [todos, projects, tz, google] = await Promise.all([getTodos(), getProjects(), getTz(), getGoogle()]);
  const t = today(tz);
  const open = todos.filter((x) => !x.done);
  const done = todos.filter((x) => x.done).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? "")).slice(0, 60);

  // Urgent to-dos sit in their own column on the left; everything else is filed by project, then General and Personal.
  const rest = open.filter((x) => !x.urgent);
  const kinds: Kind[] = ["client", "documentary", "narrative"];
  const columns = ([
    { key: "urgent", title: "Urgent", tone: "urgent", todos: open.filter((x) => x.urgent), add: { urgent: "on" } },
    ...kinds.flatMap((kind) => projects.filter((p) => p.kind === kind).map((p) => ({
      key: p.id, title: p.title, note: KIND_LABEL[kind], todos: rest.filter((x) => x.project_id === p.id), add: { project_id: p.id },
    }))).filter((c) => c.todos.length),
    { key: "general", title: "General", note: "No project", todos: rest.filter((x) => !x.project_id && !x.personal), add: { project_id: "" } },
    { key: "personal", title: "Personal", todos: rest.filter((x) => !x.project_id && x.personal), add: { project_id: PERSONAL } },
  ] as Column[]).filter((c) => c.todos.length || c.key === "urgent" || c.key === "personal");
  // To-dos tagged to a project that has since been archived or deleted still need a home.
  const placed = new Set(columns.flatMap((c) => c.todos.map((x) => x.id)));
  const stray = open.filter((x) => !placed.has(x.id));
  if (stray.length) columns.splice(columns.length - 1, 0, { key: "other", title: "Other projects", note: "Archived", todos: stray, add: { project_id: "" } });

  return (
    <>
      <PageHead section="todos" title="To-dos" sub={google
        ? "To-dos with a deadline appear on your Google Calendar, with the reminder you choose."
        : "Connect Google in Settings to put deadlines and reminders on your Google Calendar."} />

      <Card tone="pearl" title="Add a to-do">
        <form action={saveRow} className="quick">
          <input type="hidden" name="_table" value="todos" />
          <input type="hidden" name="_bools" value="urgent" />
          <div className="field wide"><label htmlFor="q-title">To-do</label><input id="q-title" name="title" required placeholder="What needs doing?" /></div>
          <F label="Project" name="project_id" options={todoProjectOptions(projects)} blank="No project" />
          <F label="Deadline" name="due_date" type="date" />
          <F label="Time" name="due_time" type="time" />
          <F label="Reminder" name="remind_minutes" options={REMINDERS} blank="None" />
          <Check label="Urgent" name="urgent" />
          <Submit>Add</Submit>
        </form>
      </Card>

      <nav className="seg" aria-label="Show">
        <Link href="/todos" aria-current={show !== "done"}>Open · {open.length}</Link>
        <Link href="/todos?show=done" aria-current={show === "done"}>Done · {done.length}</Link>
      </nav>

      {show === "done" ? (
        <Card>
          <div className="list">
            {done.map((x) => <TodoItem key={x.id} todo={x} projects={projects} today={t} />)}
            {!done.length ? <Empty>Nothing completed yet.</Empty> : null}
          </div>
        </Card>
      ) : (
        <div className="board todo-board">
          {columns.map((c) => (
            <section className={`col todo-col${c.tone ? ` ${c.tone}` : ""}`} key={c.key} aria-label={`${c.title}: ${c.todos.length} to-do${c.todos.length === 1 ? "" : "s"}`}>
              <div className="col-head">
                <span>{c.title}{c.note ? <span className="col-note"> · {c.note}</span> : null}</span>
                <span>{c.todos.length}</span>
              </div>
              {[...c.todos].sort(byDeadline).map((x) => (
                <div className="todo-card" key={x.id}>
                  {/* In the Urgent column the project chip says where it belongs; elsewhere the column already does. */}
                  <TodoItem todo={x} projects={projects} hideProject={c.key !== "urgent" && c.key !== "other"} today={t} synced={!!google} />
                </div>
              ))}
              {!c.todos.length ? <span className="tiny muted">{c.key === "urgent" ? "Nothing urgent." : "Nothing here yet."}</span> : null}
              <form action={saveRow} className="todo-add">
                <input type="hidden" name="_table" value="todos" />
                <input type="hidden" name="_bools" value="urgent" />
                {Object.entries(c.add).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                <input name="title" required placeholder="+ Add task" aria-label={`Add a to-do to ${c.title}`} />
              </form>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
