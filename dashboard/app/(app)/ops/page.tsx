import Link from "next/link";
import { loadPrivacy } from "@/lib/privacy";
import { Card, Empty, PageHead, TodoItem } from "@/components/ui";
import { Gantt } from "@/components/Gantt";
import { saveRow } from "@/app/(app)/actions";
import { db } from "@/lib/supabase/server";
import { getProjects, getTodos, getTz, rows } from "@/lib/data";
import { getGoogle } from "@/lib/google";
import { burn } from "@/lib/finance";
import { money, relDay, today } from "@/lib/format";
import { OPERATIONS, type Overhead, type TimelineItem, type Todo } from "@/lib/types";

/** Urgent first, then soonest deadline, then oldest. */
const byPriority = (a: Todo, b: Todo) =>
  Number(b.urgent) - Number(a.urgent) || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.created_at.localeCompare(b.created_at);

export default async function Ops() {
  await loadPrivacy();
  const tz = await getTz();
  const t = today(tz);
  const supabase = await db();
  const [todos, projects, google, overhead, { data: timelineRows }] = await Promise.all([
    getTodos(), getProjects(), getGoogle(), rows<Overhead>("overhead", "monthly", false),
    supabase.from("timeline_items").select("*").eq("scope", "ops").order("start_date"),
  ]);
  const timeline = (timelineRows ?? []) as TimelineItem[];
  const mine = todos.filter((x) => x.category === "operations" && !x.project_id);
  const open = mine.filter((x) => !x.done).sort(byPriority);
  const done = mine.filter((x) => x.done).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  const dated = open.filter((x) => x.due_date).sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  const b = burn(overhead);

  return (
    <>
      <PageHead section="ops" title="Ops" sub="Running the business: operations to-dos, and a timeline of tasks and milestones that aren’t tied to a project." />

      <div className="grid stretch">
        <Card className="s12" title="Timeline">
          <Gantt owner={{ scope: "ops" }} items={timeline} todos={mine} events={[]} today={t} phaseHints={["Admin", "Finance", "Legal", "Insurance", "Studio", "Hiring"]} />
          {timeline.length ? (
            <div className="legend">
              <span><i style={{ background: "var(--saffron)" }} />Today</span>
              <span><i style={{ background: "var(--dusk)" }} />Milestone</span>
              <span><i style={{ background: "var(--saffron)", borderRadius: "50%" }} />To-do deadline</span>
              <span className="muted">Click a bar or milestone to edit it.</span>
            </div>
          ) : null}
        </Card>

        <Card tone="dark" className="s4" title="Next steps">
          {open.length ? (
            <div className="list">{open.slice(0, 3).map((x) => <TodoItem key={x.id} todo={x} projects={projects} hideProject today={t} />)}</div>
          ) : <p className="small muted">Nothing queued. Add an operations to-do to set the next step.</p>}
          {open.length > 3 ? <p className="tiny muted">{open.length - 3} more in the list</p> : null}
        </Card>

        <Card className="s4" title={`To-dos · ${open.length} open`} more="/todos">
          <div className="list">{open.map((x) => <TodoItem key={x.id} todo={x} projects={projects} hideProject today={t} synced={!!google} />)}</div>
          {!open.length ? <Empty>No open operations to-dos.</Empty> : null}
          <form action={saveRow} className="todo-add">
            <input type="hidden" name="_table" value="todos" />
            <input type="hidden" name="_bools" value="urgent" />
            <input type="hidden" name="project_id" value={OPERATIONS} />
            <input name="title" required placeholder="+ Add task" aria-label="Add an operations to-do" />
          </form>
          {done.length ? (
            <details>
              <summary className="small">Done · {done.length}</summary>
              <div className="list" style={{ marginTop: 10 }}>{done.slice(0, 30).map((x) => <TodoItem key={x.id} todo={x} projects={projects} hideProject today={t} />)}</div>
            </details>
          ) : null}
        </Card>

        <div className="s4 stack" style={{ gap: "var(--gap)" }}>
          <Card title="Deadlines">
            {dated.length ? (
              <div className="list">
                {dated.map((x) => (
                  <div className="item" key={x.id}>
                    <div className="grow">
                      <div className="rowtitle">{x.title}</div>
                      <div className="meta">
                        <span className={`chip${x.due_date! < t ? " late" : ""}`}>{x.due_date! < t ? "Overdue · " : ""}{relDay(x.due_date!, t)}</span>
                        {x.urgent ? <span className="chip urgent">Urgent</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="small muted">No operations to-dos have a deadline.</p>}
          </Card>
          <Card tone="sun" title="Overhead" more="/finance">
            <div>
              <div className="big">{money(b.total, { compact: true })}<small>/ month</small></div>
              <div className="small" style={{ marginTop: 8 }}>Salary {money(b.salary)} · Op ex {money(b.opex)}</div>
            </div>
            <p className="small"><Link href="/finance">Edit overhead lines in Finance</Link></p>
          </Card>
        </div>
      </div>
    </>
  );
}
