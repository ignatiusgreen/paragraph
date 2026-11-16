import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPrivacy } from "@/lib/privacy";
import { Card, Empty, EventFields, eventWhen, PageHead, ProjectFields, RowForm, TodoItem } from "@/components/ui";
import { AutoSelect, Modal } from "@/components/client";
import { Gantt } from "@/components/Gantt";
import { saveRow } from "@/app/(app)/actions";
import { db } from "@/lib/supabase/server";
import { getClients, getEvents, getNotes, getProjects, getTodos, getTz } from "@/lib/data";
import { getGoogle } from "@/lib/google";
import { addDays, fmtDate, money, relDay, today } from "@/lib/format";
import { KIND_LABEL, KIND_PATH, STAGES, stageLabel, type Project, type TimelineItem, type Todo } from "@/lib/types";

const SECTION = { client: "clients", documentary: "documentary", narrative: "narrative" } as const;
/** Urgent first, then soonest deadline, then oldest. */
const byPriority = (a: Todo, b: Todo) =>
  Number(b.urgent) - Number(a.urgent) || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.created_at.localeCompare(b.created_at);

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await loadPrivacy();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const tz = await getTz();
  const t = today(tz);
  const supabase = await db();
  const [{ data }, { data: timelineRows }, clients, todos, events, notes, projects, google] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("timeline_items").select("*").eq("project_id", id).order("start_date"),
    getClients(), getTodos(), getEvents(addDays(t, -1), addDays(t, 365)), getNotes(), getProjects(), getGoogle(),
  ]);
  const project = data as Project | null;
  if (!project) notFound();

  const timeline = (timelineRows ?? []) as TimelineItem[];
  const client = clients.find((c) => c.id === project.client_id);
  const stages = STAGES[project.kind];
  const mine = todos.filter((x) => x.project_id === project.id);
  const open = mine.filter((x) => !x.done).sort(byPriority);
  const done = mine.filter((x) => x.done).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  const schedule = events.filter((e) => e.project_id === project.id && (e.end_date ?? e.date) >= t);
  const linkedNotes = notes.filter((n) => n.project_id === project.id);
  const hasMoney = project.budget != null || project.hard_costs != null || project.invoiced != null;

  // Everything with a date, in one line of sight: scheduled events, to-do deadlines, and when money is expected.
  const dates = [
    ...schedule.map((e) => ({ key: `e${e.id}`, date: e.date, kind: "Event", tone: "sky", title: e.title, detail: [eventWhen(e), e.location].filter(Boolean).join(" · ") })),
    ...open.filter((x) => x.due_date).map((x) => ({ key: `t${x.id}`, date: x.due_date!, kind: "Deadline", tone: "urgent", title: x.title, detail: x.urgent ? "Urgent to-do" : "To-do" })),
    ...(project.expected_on ? [{ key: "money", date: project.expected_on, kind: "Money", tone: "leaf", title: "Money expected", detail: project.budget != null ? money(project.budget) : "" }] : []),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHead section={SECTION[project.kind]} image={project.image_url} title={project.title} plain
        eyebrow={[KIND_LABEL[project.kind], stageLabel(project.kind, project.stage), client?.name, project.archived ? "Archived" : null].filter(Boolean).join(" · ")}
        sub={project.logline ?? undefined}>
        <Link className="btn ghost" href={KIND_PATH[project.kind]}>‹ All {KIND_LABEL[project.kind].toLowerCase()}</Link>
        <Modal label="Edit project" title={project.title}>
          <RowForm table="projects" id={project.id} bools={["archived"]} what="this project" hidden={{ _after_delete: KIND_PATH[project.kind] }}>
            <ProjectFields kind={project.kind} project={project} clients={clients} />
          </RowForm>
        </Modal>
      </PageHead>

      <div className="grid stretch">
        <Card className="s12" title="Timeline" actions={
          <form action={saveRow} className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
            <input type="hidden" name="_table" value="projects" />
            <input type="hidden" name="_id" value={project.id} />
            <label htmlFor="stage" className="small muted">Stage</label>
            <AutoSelect id="stage" name="stage" defaultValue={project.stage} aria-label="Stage" style={{ width: 230 }}>
              {stages.map((s) => <option key={s.value} value={s.value}>{s.group ? `${s.group}: ` : ""}{s.label}</option>)}
            </AutoSelect>
          </form>
        }>
          <Gantt projectId={project.id} items={timeline} todos={mine} events={schedule} today={t} phaseHints={stages.map((s) => s.label)} />
          {timeline.length ? (
            <div className="legend">
              <span><i style={{ background: "var(--saffron)" }} />Today</span>
              <span><i style={{ background: "var(--dusk)" }} />Milestone</span>
              <span><i style={{ background: "var(--saffron)", borderRadius: "50%" }} />To-do deadline</span>
              <span><i style={{ background: "#4f7bc4", borderRadius: "50%" }} />Scheduled event</span>
              <span className="muted">Click a bar or milestone to edit it.</span>
            </div>
          ) : null}
          {project.notes ? <p style={{ whiteSpace: "pre-wrap" }}>{project.notes}</p> : null}
          {project.links?.length ? (
            <div className="row" style={{ gap: 6 }}>
              {project.links.map((l, i) => <a key={i} className="chip sky" href={l.url} target="_blank" rel="noreferrer">{l.label || "Link"} ↗</a>)}
            </div>
          ) : null}
        </Card>

        <Card tone="dark" className="s4" title="Next steps">
          {open.length ? (
            <div className="list">
              {open.slice(0, 3).map((x) => <TodoItem key={x.id} todo={x} projects={projects} hideProject today={t} />)}
            </div>
          ) : <p className="small muted">Nothing queued. Add a to-do to set the next step.</p>}
          {open.length > 3 ? <p className="tiny muted">{open.length - 3} more below</p> : null}
        </Card>

        <Card className="s4" title={`To-dos · ${open.length} open`}>
          <div className="list">
            {open.map((x) => <TodoItem key={x.id} todo={x} projects={projects} hideProject today={t} synced={!!google} />)}
          </div>
          {!open.length ? <Empty>No open to-dos for this project.</Empty> : null}
          <form action={saveRow} className="todo-add">
            <input type="hidden" name="_table" value="todos" />
            <input type="hidden" name="_bools" value="urgent" />
            <input type="hidden" name="project_id" value={project.id} />
            <input name="title" required placeholder="+ Add task" aria-label={`Add a to-do to ${project.title}`} />
          </form>
          {done.length ? (
            <details>
              <summary className="small">Done · {done.length}</summary>
              <div className="list" style={{ marginTop: 10 }}>
                {done.slice(0, 30).map((x) => <TodoItem key={x.id} todo={x} projects={projects} hideProject today={t} />)}
              </div>
            </details>
          ) : null}
        </Card>

        <Card className="s4" title="Schedule + deadlines" actions={
          <Modal label="+ Event" title={`New event for ${project.title}`} className="btn sm">
            <RowForm table="events" submit="Add event"><EventFields projects={projects} date={t} event={{ project_id: project.id } as never} /></RowForm>
          </Modal>
        }>
          {dates.length ? (
            <div className="list">
              {dates.map((d) => (
                <div className="item" key={d.key}>
                  <div className="grow">
                    <div className="rowtitle">{d.title}</div>
                    <div className="meta">
                      <span className={`chip ${d.tone}`}>{d.kind}</span>
                      <span className={`chip${d.date < t ? " late" : ""}`}>{d.date < t ? "Overdue · " : ""}{relDay(d.date, t)}</span>
                      {d.detail ? <span>{d.detail}</span> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty>Nothing dated yet. Add an event, or give a to-do a deadline.</Empty>}
        </Card>

        {hasMoney ? (
          <Card tone="teal" className="s6" title="Money">
            <div className="tiles two">
              <div className="tile"><span className="tile-label">{project.kind === "client" ? "Budget" : "Expected revenue"}</span><span className="tile-value">{money(project.budget, { compact: true })}</span></div>
              <div className="tile"><span className="tile-label">Hard costs</span><span className="tile-value">{money(project.hard_costs, { compact: true })}</span></div>
              <div className="tile"><span className="tile-label">Invoiced</span><span className="tile-value">{money(project.invoiced, { compact: true })}</span></div>
              <div className="tile"><span className="tile-label">Margin</span><span className="tile-value">{money(project.budget != null ? Number(project.budget) - Number(project.hard_costs ?? 0) : null, { compact: true })}</span></div>
            </div>
            {project.expected_on ? <p className="small muted">Money expected by {fmtDate(project.expected_on, "long")}.</p> : null}
          </Card>
        ) : null}

        <Card className={hasMoney ? "s6" : "s12"} title={`Notebook · ${linkedNotes.length}`} more="/notebook">
          {linkedNotes.length ? (
            <div className="list">
              {linkedNotes.slice(0, 6).map((n) => (
                <div className="item" key={n.id}>
                  <div className="grow">
                    <div className="rowtitle">{n.title}</div>
                    {n.body ? <div className="small muted" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.body}</div> : null}
                    <div className="meta">{fmtDate(n.noted_on)}{n.tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="small muted">No notes linked to this project. In the Notebook, choose it under “Linked project”.</p>}
        </Card>
      </div>
    </>
  );
}
