import { Delete, ImageField, LinksField, Modal, Submit, TodoCheck } from "./client";
import { deleteRow, saveRow, saveSection } from "@/app/(app)/actions";
import { getSection } from "@/lib/data";
import { fmtDate, fmtTime, money, relDay } from "@/lib/format";
import { KIND_LABEL, REMINDERS, STAGES, stageLabel, type Client, type Event, type Kind, type Project, type Todo } from "@/lib/types";

/** Big page title, with the section's optional header and background images. */
export async function PageHead({ section, title, eyebrow, sub, children }: {
  section: string; title: string; eyebrow?: string; sub?: React.ReactNode; children?: React.ReactNode;
}) {
  const s = await getSection(section);
  return (
    <header className={`hero${s?.header_url ? " has-image" : ""}`} style={s?.header_url ? { backgroundImage: `url("${s.header_url}")` } : undefined}>
      {s?.background_url ? <style>{`.main{background-image:linear-gradient(rgba(217,232,227,.55),rgba(217,232,227,.55)),url("${s.background_url}")}`}</style> : null}
      <div>
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1>{title}.</h1>
        {sub ? <p className="hero-sub">{sub}</p> : null}
      </div>
      <div className="hero-actions">
        {children}
        <Modal label="Images" title={`${title} — images`} className="btn ghost">
          <form action={saveSection} className="stack">
            <input type="hidden" name="key" value={section} />
            <ImageField name="header_url" label="Header image (behind the title)" defaultValue={s?.header_url} folder="sections" />
            <ImageField name="background_url" label="Background image (behind the whole page)" defaultValue={s?.background_url} folder="sections" />
            <div className="form-foot"><span /><Submit>Save</Submit></div>
          </form>
        </Modal>
      </div>
    </header>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Card({ title, tone = "", more, actions, children, className = "" }: {
  title?: string; tone?: string; more?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`card ${tone} ${className}`}>
      {title ? (
        <div className="card-head">
          <h2 className="card-title">{title}</h2>
          <div className="row">
            {actions}
            {more ? <a className="more" href={more} aria-label={`Open ${title}`}>›</a> : null}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Form that creates or edits one row of a table through the generic save action. */
export function RowForm({ table, id, bools, hidden, children, submit = "Save", what }: {
  table: string; id?: string; bools?: string[]; hidden?: Record<string, string>; children: React.ReactNode; submit?: string; what?: string;
}) {
  return (
    <form action={saveRow} className="stack">
      <input type="hidden" name="_table" value={table} />
      {id ? <input type="hidden" name="_id" value={id} /> : null}
      {bools ? <input type="hidden" name="_bools" value={bools.join(",")} /> : null}
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <div className="form-foot">
        {id ? <Delete action={deleteRow} what={what} /> : <span />}
        <Submit>{submit}</Submit>
      </div>
    </form>
  );
}

let uid = 0;
export function F({ label, name, type = "text", defaultValue, full, required, placeholder, step, options, blank, rows, min, max }: {
  label: string; name: string; type?: string; defaultValue?: string | number | null; full?: boolean; required?: boolean; placeholder?: string;
  step?: string; options?: { value: string; label: string; group?: string }[]; blank?: string; rows?: number; min?: number; max?: number;
}) {
  const id = `f${++uid}-${name}`;
  const v = defaultValue ?? "";
  const groups = options ? [...new Set(options.map((o) => o.group))] : [];
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {options ? (
        <select id={id} name={name} defaultValue={String(v)} required={required}>
          {blank !== undefined ? <option value="">{blank}</option> : null}
          {groups.map((g) => {
            const opts = options.filter((o) => o.group === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>);
            return g ? <optgroup key={g} label={g}>{opts}</optgroup> : opts;
          })}
        </select>
      ) : type === "textarea" ? (
        <textarea id={id} name={name} defaultValue={String(v)} required={required} placeholder={placeholder} rows={rows} />
      ) : (
        <input id={id} name={name} type={type} defaultValue={type === "time" ? String(v).slice(0, 5) : String(v)} required={required}
          placeholder={placeholder} step={step ?? (type === "number" ? "any" : undefined)} min={min} max={max} inputMode={type === "number" ? "decimal" : undefined} />
      )}
    </div>
  );
}
export function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return <label className="check"><input type="checkbox" name={name} defaultChecked={defaultChecked} />{label}</label>;
}

export const projectOptions = (projects: Project[]) =>
  projects.map((p) => ({ value: p.id, label: p.title, group: KIND_LABEL[p.kind] }));

// ---------------- To-dos ----------------
export function TodoFields({ todo, projects }: { todo?: Todo; projects: Project[] }) {
  return (
    <div className="fgrid">
      <F label="To-do" name="title" defaultValue={todo?.title} required full />
      <F label="Project" name="project_id" options={projectOptions(projects)} blank="No project" defaultValue={todo?.project_id} />
      <F label="Deadline" name="due_date" type="date" defaultValue={todo?.due_date} />
      <F label="Time (optional)" name="due_time" type="time" defaultValue={todo?.due_time} />
      <F label="Reminder" name="remind_minutes" options={REMINDERS} blank="No reminder" defaultValue={todo?.remind_minutes} />
      <F label="Notes" name="notes" type="textarea" defaultValue={todo?.notes} full rows={3} />
      <Check label="Urgent" name="urgent" defaultChecked={todo?.urgent} />
    </div>
  );
}

export function TodoItem({ todo, projects, today, synced }: { todo: Todo; projects: Project[]; today: string; synced?: boolean }) {
  const project = projects.find((p) => p.id === todo.project_id);
  const late = !todo.done && todo.due_date && todo.due_date < today;
  return (
    <div className={`item${todo.done ? " done" : ""}`}>
      <TodoCheck id={todo.id} done={todo.done} title={todo.title} />
      <div className="grow">
        <Modal label={<span className="rowtitle">{todo.title}</span>} title="Edit to-do" className="rowbtn" ariaLabel={`Edit ${todo.title}`}>
          <RowForm table="todos" id={todo.id} bools={["urgent"]} what="this to-do"><TodoFields todo={todo} projects={projects} /></RowForm>
        </Modal>
        <div className="meta">
          {todo.urgent && !todo.done ? <span className="chip urgent">Urgent</span> : null}
          {todo.due_date ? <span className={`chip${late ? " late" : ""}`}>{late ? "Overdue · " : ""}{relDay(todo.due_date, today)}{todo.due_time ? ` ${fmtTime(todo.due_time)}` : ""}</span> : null}
          {project ? <span className="chip sky">{project.title}</span> : null}
          {todo.remind_minutes != null ? <span title="Reminder set">⏰ {REMINDERS.find((r) => r.value === String(todo.remind_minutes))?.label ?? `${todo.remind_minutes} min before`}</span> : null}
          {synced && todo.gcal_event_id ? <span title="On Google Calendar">▣ Calendar</span> : null}
          {todo.source === "agent" ? <span title="Added by the AI assistant">✦ AI</span> : null}
        </div>
      </div>
    </div>
  );
}

// ---------------- Events ----------------
export function EventFields({ event, projects, date }: { event?: Event; projects: Project[]; date?: string }) {
  return (
    <div className="fgrid">
      <F label="Title" name="title" defaultValue={event?.title} required full />
      <F label="Date" name="date" type="date" defaultValue={event?.date ?? date} required />
      <F label="Last day (multi-day)" name="end_date" type="date" defaultValue={event?.end_date} />
      <F label="Starts (blank = all day)" name="start_time" type="time" defaultValue={event?.start_time} />
      <F label="Ends" name="end_time" type="time" defaultValue={event?.end_time} />
      <F label="Location" name="location" defaultValue={event?.location} />
      <F label="Project" name="project_id" options={projectOptions(projects)} blank="No project" defaultValue={event?.project_id} />
      <F label="Notes" name="notes" type="textarea" defaultValue={event?.notes} full rows={3} />
    </div>
  );
}
export const eventWhen = (e: Event) =>
  e.start_time ? `${fmtTime(e.start_time)}${e.end_time ? `–${fmtTime(e.end_time)}` : ""}` : e.end_date ? `Through ${fmtDate(e.end_date)}` : "All day";

// ---------------- Projects ----------------
const MONEY_LABEL: Record<Kind, [string, string]> = {
  client: ["Budget", "Estimated hard costs"],
  documentary: ["Expected revenue to Paragraph", "Estimated hard costs"],
  narrative: ["Expected revenue to Paragraph", "Estimated hard costs"],
};

export function ProjectFields({ kind, project, clients, stage }: { kind: Kind; project?: Project; clients: Client[]; stage?: string }) {
  const [budget, costs] = MONEY_LABEL[kind];
  return (
    <div className="fgrid">
      <F label="Title" name="title" defaultValue={project?.title} required full={kind !== "client"} />
      {kind === "client" ? <F label="Client" name="client_id" options={clients.map((c) => ({ value: c.id, label: c.name }))} blank="Choose a client" defaultValue={project?.client_id} /> : null}
      <F label="Stage" name="stage" options={STAGES[kind]} defaultValue={project?.stage ?? stage ?? STAGES[kind][0].value} required />
      <F label="Money expected by" name="expected_on" type="date" defaultValue={project?.expected_on} />
      <F label={budget} name="budget" type="number" defaultValue={project?.budget} placeholder="0" />
      <F label={costs} name="hard_costs" type="number" defaultValue={project?.hard_costs} placeholder="0" />
      <F label="Invoiced so far" name="invoiced" type="number" defaultValue={project?.invoiced} placeholder="0" />
      <F label="Odds of landing, % (if not booked)" name="probability" type="number" min={0} max={100} defaultValue={project?.probability} placeholder="e.g. 50" />
      <F label={kind === "client" ? "Brief" : "Logline"} name="logline" type="textarea" defaultValue={project?.logline} full rows={2} />
      <div className="full"><LinksField defaultValue={project?.links} label="Production documents + links" /></div>
      <div className="full"><ImageField name="image_url" label={kind === "client" ? "Thumbnail" : "Key art / thumbnail"} defaultValue={project?.image_url} folder="projects" /></div>
      <F label="Notes" name="notes" type="textarea" defaultValue={project?.notes} full rows={3} />
      {project ? <Check label="Archive (hide from boards)" name="archived" defaultChecked={project.archived} /> : null}
    </div>
  );
}

export function NewProject({ kind, clients, label = "Add project" }: { kind: Kind; clients: Client[]; label?: string }) {
  return (
    <Modal label={label} title={`New ${KIND_LABEL[kind].toLowerCase()} project`}>
      <RowForm table="projects" hidden={{ kind }} submit="Add project"><ProjectFields kind={kind} clients={clients} /></RowForm>
    </Modal>
  );
}

export function ProjectCard({ project, clients, todos }: { project: Project; clients: Client[]; todos: Todo[] }) {
  const client = clients.find((c) => c.id === project.client_id);
  const open = todos.filter((t) => t.project_id === project.id && !t.done).length;
  return (
    <div>
      <Modal className="pcard" title={project.title} ariaLabel={`Edit ${project.title}`} label={
        <>
          <span className="art" style={project.image_url ? { backgroundImage: `url("${project.image_url}")` } : undefined}>{project.image_url ? "" : project.title.slice(0, 1)}</span>
          <span className="body">
            {client ? <span className="eyebrow">{client.name}</span> : null}
            <span className="title">{project.title}</span>
            {project.logline ? <span className="logline">{project.logline}</span> : null}
            <span className="row" style={{ gap: 6 }}>
              {project.budget != null ? <span className="chip">{money(project.budget, { compact: true })}</span> : null}
              {project.hard_costs != null ? <span className="chip" title="Estimated hard costs">− {money(project.hard_costs, { compact: true })}</span> : null}
              {open ? <span className="chip sun">{open} to-do{open === 1 ? "" : "s"}</span> : null}
            </span>
          </span>
        </>
      }>
        <RowForm table="projects" id={project.id} bools={["archived"]} what="this project"><ProjectFields kind={project.kind} project={project} clients={clients} /></RowForm>
      </Modal>
      {project.links?.length ? (
        <div className="plinks">
          {project.links.map((l, i) => <a key={i} className="chip sky" href={l.url} target="_blank" rel="noreferrer">{l.label || "Link"} ↗</a>)}
        </div>
      ) : null}
    </div>
  );
}

export function Board({ kind, stages, projects, clients, todos }: { kind: Kind; stages: { value: string; label: string }[]; projects: Project[]; clients: Client[]; todos: Todo[] }) {
  return (
    <div className="board" style={{ gridAutoColumns: `minmax(230px, ${stages.length <= 2 ? "420px" : "1fr"})` }}>
      {stages.map((s) => {
        const list = projects.filter((p) => p.kind === kind && p.stage === s.value);
        return (
          <div className="col" key={s.value}>
            <div className="col-head"><span>{s.label}</span><span>{list.length}</span></div>
            {list.map((p) => <ProjectCard key={p.id} project={p} clients={clients} todos={todos} />)}
            {!list.length ? <span className="tiny muted">Nothing here yet.</span> : null}
          </div>
        );
      })}
    </div>
  );
}
export { stageLabel };
