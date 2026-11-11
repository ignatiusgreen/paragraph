import Link from "next/link";
import { Card, Check, Empty, F, PageHead, projectOptions, TodoItem } from "@/components/ui";
import { Submit } from "@/components/client";
import { saveRow } from "@/app/(app)/actions";
import { getProjects, getTodos, getTz } from "@/lib/data";
import { getGoogle } from "@/lib/google";
import { addDays, today } from "@/lib/format";
import { REMINDERS, type Todo } from "@/lib/types";

export default async function Todos({ searchParams }: { searchParams: Promise<{ show?: string; project?: string }> }) {
  const { show = "open", project } = await searchParams;
  const [todos, projects, tz, google] = await Promise.all([getTodos(), getProjects(), getTz(), getGoogle()]);
  const t = today(tz);
  const scoped = project ? todos.filter((x) => x.project_id === project) : todos;
  const open = scoped.filter((x) => !x.done);
  const list = show === "urgent" ? open.filter((x) => x.urgent) : show === "done" ? [] : open;
  const done = scoped.filter((x) => x.done).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? "")).slice(0, 40);
  const groups: [string, Todo[]][] = [
    ["Overdue", list.filter((x) => x.due_date && x.due_date < t)],
    ["Today", list.filter((x) => x.due_date === t)],
    ["Next 7 days", list.filter((x) => x.due_date && x.due_date > t && x.due_date <= addDays(t, 7))],
    ["Later", list.filter((x) => x.due_date && x.due_date > addDays(t, 7))],
    ["No deadline", list.filter((x) => !x.due_date)],
  ];
  const href = (s: string) => `/todos?show=${s}${project ? `&project=${project}` : ""}`;
  const tagged = projects.filter((p) => todos.some((x) => x.project_id === p.id && !x.done));
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
          <F label="Project" name="project_id" options={projectOptions(projects)} blank="No project" defaultValue={project} />
          <F label="Deadline" name="due_date" type="date" />
          <F label="Time" name="due_time" type="time" />
          <F label="Reminder" name="remind_minutes" options={REMINDERS} blank="None" />
          <Check label="Urgent" name="urgent" />
          <Submit>Add</Submit>
        </form>
      </Card>

      <div className="row between">
        <nav className="seg" aria-label="Filter">
          <Link href={href("open")} aria-current={show === "open"}>Open · {open.length}</Link>
          <Link href={href("urgent")} aria-current={show === "urgent"}>Urgent · {open.filter((x) => x.urgent).length}</Link>
          <Link href={href("done")} aria-current={show === "done"}>Done</Link>
        </nav>
        {tagged.length || project ? (
          <nav className="row" aria-label="Filter by project" style={{ gap: 6 }}>
            {project ? <Link className="chip" href={`/todos?show=${show}`}>All projects ×</Link> : null}
            {tagged.map((p) => <Link key={p.id} className={`chip${p.id === project ? " teal" : " sky"}`} href={`/todos?show=${show}&project=${p.id}`}>{p.title}</Link>)}
          </nav>
        ) : null}
      </div>

      <Card>
        {show === "done" ? (
          <div className="list">
            {done.map((x) => <TodoItem key={x.id} todo={x} projects={projects} today={t} />)}
            {!done.length ? <Empty>Nothing completed yet.</Empty> : null}
          </div>
        ) : list.length ? (
          <div>
            {groups.filter(([, g]) => g.length).map(([name, g]) => (
              <div key={name}>
                <div className="group-label">{name} · {g.length}</div>
                <div className="list">
                  {g.sort((a, b) => Number(b.urgent) - Number(a.urgent)).map((x) => <TodoItem key={x.id} todo={x} projects={projects} today={t} synced={!!google} />)}
                </div>
              </div>
            ))}
          </div>
        ) : <Empty>{show === "urgent" ? "Nothing urgent." : "No open to-dos. Add one above."}</Empty>}
      </Card>
    </>
  );
}
