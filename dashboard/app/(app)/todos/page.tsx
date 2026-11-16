import Link from "next/link";
import { loadPrivacy } from "@/lib/privacy";
import { Card, Check, Empty, F, PageHead, TodoItem, todoProjectOptions } from "@/components/ui";
import { Modal, Submit } from "@/components/client";
import { createProjectFromTodos, saveRow } from "@/app/(app)/actions";
import { getProjects, getSettings, getTodos, getTz } from "@/lib/data";
import { getGoogle } from "@/lib/google";
import { addDays, today } from "@/lib/format";
import { KIND_LABEL, NEWBIZ, OPERATIONS, PERSONAL, REMINDERS, type Kind, type Todo } from "@/lib/types";

type Column = { key: string; title: string; note?: string; tone?: string; todos: Todo[]; add: Record<string, string>; isNew?: boolean };

/** Soonest deadline first; to-dos with no deadline last. */
const byDeadline = (a: Todo, b: Todo) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.created_at.localeCompare(b.created_at);

export default async function Todos({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await loadPrivacy();
  const { show = "open" } = await searchParams;
  const [todos, projects, tz, google, settings] = await Promise.all([getTodos(), getProjects(), getTz(), getGoogle(), getSettings()]);
  const pinned = Array.isArray(settings.todo_board_projects) ? (settings.todo_board_projects as string[]) : [];
  const t = today(tz);
  const open = todos.filter((x) => !x.done);
  const done = todos.filter((x) => x.done).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? "")).slice(0, 60);

  // Urgent to-dos sit in their own column on the left; everything else is filed by project, then General and Personal.
  const rest = open.filter((x) => !x.urgent);
  const kinds: Kind[] = ["client", "documentary", "narrative"];
  const columns = ([
    { key: "urgent", title: "Urgent", tone: "urgent", todos: open.filter((x) => x.urgent), add: { urgent: "on" } },
    ...kinds.flatMap((kind) => projects.filter((p) => p.kind === kind).map((p) => ({
      key: p.id, title: p.title, note: KIND_LABEL[kind], tone: `kind-${kind}`, todos: rest.filter((x) => x.project_id === p.id), add: { project_id: p.id },
      isNew: pinned.includes(p.id) && p.created_at.slice(0, 10) >= addDays(t, -14),
    }))).filter((c) => c.todos.length || c.isNew), // a project started from this page keeps its empty column for two weeks
    { key: "general", title: "General", note: "No project", todos: rest.filter((x) => !x.project_id && !x.category), add: { project_id: "" } },
    { key: "newbiz", title: "New Biz", note: "Leads", tone: "newbiz", todos: rest.filter((x) => !x.project_id && x.category === "newbiz"), add: { project_id: NEWBIZ } },
    { key: "operations", title: "Operations", note: "Business", todos: rest.filter((x) => !x.project_id && x.category === "operations"), add: { project_id: OPERATIONS } },
    { key: "personal", title: "Personal", tone: "personal", todos: rest.filter((x) => !x.project_id && x.category === "personal"), add: { project_id: PERSONAL } },
  ] as Column[]).filter((c) => c.todos.length || ["urgent", "operations", "personal"].includes(c.key) || c.isNew);
  // To-dos tagged to a project that has since been archived or deleted still need a home.
  const placed = new Set(columns.flatMap((c) => c.todos.map((x) => x.id)));
  const stray = open.filter((x) => !placed.has(x.id));
  if (stray.length) columns.splice(columns.findIndex((c) => c.key === "operations"), 0, { key: "other", title: "Other projects", note: "Archived", todos: stray, add: { project_id: "" } });

  // Four stacks side by side. The first holds Urgent with Personal under it; every other panel goes onto
  // whichever stack is currently shortest, so the page fills evenly instead of running off to the right.
  const size = (c: Column) => 1.6 + c.todos.length;
  const pick = (key: string) => columns.find((c) => c.key === key);
  const stacks: Column[][] = [[pick("urgent"), pick("personal")].filter((c): c is Column => !!c), [], [], []];
  const heights = stacks.map((st) => st.reduce((n, c) => n + size(c), 0));
  for (const c of columns.filter((c) => c.key !== "urgent" && c.key !== "personal")) {
    // Prefer the three right-hand stacks until one of them is taller than the first.
    let to = 1;
    for (let i = 2; i < 4; i++) if (heights[i] < heights[to]) to = i;
    if (heights[0] < heights[to]) to = 0;
    stacks[to].push(c);
    heights[to] += size(c);
  }

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

      <div className="row between">
        <nav className="seg" aria-label="Show">
          <Link href="/todos" aria-current={show !== "done"}>Open · {open.length}</Link>
          <Link href="/todos?show=done" aria-current={show === "done"}>Done · {done.length}</Link>
        </nav>
        <div className="kind-key" aria-label="Project tag colours">
          <span className="chip sky">Branded</span><span className="chip leaf">Documentary</span><span className="chip dusk">Narrative</span>
        </div>
        <Modal label="+ New project" title="New project" className="btn ghost">
          <form action={createProjectFromTodos} className="stack">
            <div className="fgrid">
              <F label="Project name" name="title" required full />
              <F label="Type" name="kind" options={(["client", "documentary", "narrative"] as Kind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} defaultValue="narrative" />
              <F label="First to-do (optional)" name="todo_title" placeholder="e.g. Write outline" />
            </div>
            <p className="tiny muted">The project starts in the first stage of its type and gets its own column here. Add its budget, logline or key art later on its own page.</p>
            <div className="form-foot"><span /><Submit>Create project</Submit></div>
          </form>
        </Modal>
      </div>

      {show === "done" ? (
        <Card>
          <div className="list">
            {done.map((x) => <TodoItem key={x.id} todo={x} projects={projects} today={t} />)}
            {!done.length ? <Empty>Nothing completed yet.</Empty> : null}
          </div>
        </Card>
      ) : (
        <div className="todo-grid">
          {stacks.map((stack, i) => (
            <div className="todo-stack" key={i}>
          {stack.map((c) => (
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
          ))}
        </div>
      )}
    </>
  );
}
