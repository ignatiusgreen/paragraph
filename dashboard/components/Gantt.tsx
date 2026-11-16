import { Modal } from "./client";
import { F, RowForm } from "./ui";
import { addDays, fmtDate, weekday } from "@/lib/format";
import type { Event, TimelineItem, Todo } from "@/lib/types";

// One colour per phase, in a fixed order (validated to stay distinguishable for colour-blind readers).
const PHASE_COLORS = ["#00919b", "#c47e10", "#b8527a", "#4f7bc4", "#4f9a4f", "#8b5fc7"];
const DAY = 86400000;
const days = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / DAY);
const span = (a: string, b: string | null) => (b && b !== a ? `${fmtDate(a)} – ${fmtDate(b)}` : fmtDate(a));

export function TimelineFields({ item, kind, phases, today }: { item?: TimelineItem; kind: "task" | "milestone"; phases: string[]; today: string }) {
  const listId = `phases-${item?.id ?? kind}`;
  return (
    <div className="fgrid">
      <F label={kind === "milestone" ? "Milestone" : "Task"} name="title" defaultValue={item?.title} required full
        placeholder={kind === "milestone" ? "e.g. Picture lock" : "e.g. Rough cut"} />
      {kind === "task" ? (
        <>
          <div className="field full">
            <label htmlFor={`${listId}-input`}>Phase (groups and colours the bars)</label>
            <input id={`${listId}-input`} name="group_name" list={listId} defaultValue={item?.group_name ?? ""} placeholder="e.g. Prep, Shooting, Post" />
            <datalist id={listId}>{phases.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <F label="Starts" name="start_date" type="date" defaultValue={item?.start_date ?? today} required />
          <F label="Ends" name="end_date" type="date" defaultValue={item?.end_date ?? item?.start_date ?? addDays(today, 7)} required />
        </>
      ) : (
        <F label="Date" name="start_date" type="date" defaultValue={item?.start_date ?? today} required />
      )}
    </div>
  );
}

/**
 * A project timeline: tasks as bars grouped and coloured by phase, milestones as vertical markers, a line for
 * today, and a row of dots for the project's to-do deadlines and scheduled events.
 */
export function Gantt({ owner, items, todos, events, today, phaseHints }: {
  /** Who the timeline belongs to: a project ({ project_id }) or a named scope ({ scope: "ops" }). */
  owner: Record<string, string>; items: TimelineItem[]; todos: Todo[]; events: Event[]; today: string; phaseHints: string[];
}) {
  const tasks = items.filter((i) => i.kind === "task").map((i) => ({ ...i, end: i.end_date && i.end_date >= i.start_date ? i.end_date : i.start_date }));
  const milestones = items.filter((i) => i.kind === "milestone").sort((a, b) => a.start_date.localeCompare(b.start_date));
  const dots = [
    ...todos.filter((t) => !t.done && t.due_date && !items.some((i) => i.todo_id === t.id)).map((t) => ({ key: `t${t.id}`, date: t.due_date!, label: `To-do due: ${t.title}`, tone: "due" })),
    ...events.map((e) => ({ key: `e${e.id}`, date: e.date, label: `Event: ${e.title}`, tone: "event" })),
  ];
  const phaseNames = [...new Set([...tasks].sort((a, b) => a.start_date.localeCompare(b.start_date)).map((t) => t.group_name?.trim() || "General"))];
  const knownPhases = [...new Set([...phaseNames.filter((p) => p !== "General"), ...phaseHints])];
  const add = (kind: "task" | "milestone", label: string, className = "btn sm") => (
    <Modal label={label} title={kind === "task" ? "New task" : "New milestone"} className={className}>
      <RowForm table="timeline_items" hidden={{ ...owner, kind }} submit="Add">
        <TimelineFields kind={kind} phases={knownPhases} today={today} />
      </RowForm>
    </Modal>
  );

  if (!tasks.length && !milestones.length) {
    return (
      <div className="gantt-empty">
        <p>No timeline yet. Add tasks with start and end dates, grouped into phases, and milestones for the key dates.</p>
        <div className="row">{add("task", "+ Task", "btn")}{add("milestone", "+ Milestone", "btn ghost")}</div>
      </div>
    );
  }

  // The chart runs from the Monday before the first date to the Sunday after the last, with a week of margin.
  const all = [...tasks.flatMap((t) => [t.start_date, t.end]), ...milestones.map((m) => m.start_date), ...dots.map((d) => d.date), today].sort();
  const first = addDays(all[0], -7), lastDay = addDays(all[all.length - 1], 7);
  const start = addDays(first, -((weekday(first) + 6) % 7));
  const end = addDays(lastDay, (7 - weekday(lastDay)) % 7);
  const total = days(start, end) + 1;
  const pct = (d: string) => (days(start, d) / total) * 100;
  const weeks = Array.from({ length: Math.ceil(total / 7) }, (_, i) => addDays(start, i * 7));
  const showWeeks = weeks.length <= 40;
  const months: { key: string; from: string; to: string }[] = [];
  for (let d = start; d <= end; ) {
    const ym = d.slice(0, 7), nextMonth = addDays(ym + "-28", 7).slice(0, 7) + "-01";
    const to = addDays(nextMonth, -1) > end ? end : addDays(nextMonth, -1);
    months.push({ key: ym, from: d, to });
    d = addDays(to, 1);
  }
  const inRange = (d: string) => d >= start && d <= end;

  return (
    <div className="gantt-scroll">
      <div className="gantt" role="group" aria-label="Project timeline">
        {/* vertical guides behind and above the rows: month bands, week lines, milestones, today */}
        <div className="gantt-guides" aria-hidden="true">
          {months.map((m, i) => i % 2 ? <span key={m.key} className="g-band" style={{ left: `${pct(m.from)}%`, width: `${pct(addDays(m.to, 1)) - pct(m.from)}%` }} /> : null)}
          {(showWeeks ? weeks : months.map((m) => m.from)).map((w) => <span key={w} className="g-week" style={{ left: `${pct(w)}%` }} />)}
          {milestones.map((m) => <span key={m.id} className="g-mile" style={{ left: `${pct(addDays(m.start_date, 1))}%` }} />)}
          {inRange(today) ? <span className="g-today" style={{ left: `${pct(today) + 50 / total}%` }} /> : null}
        </div>

        <div className="g-row g-months">
          <div className="g-label">{add("task", "+ Task")}{add("milestone", "+ Milestone", "btn ghost sm")}</div>
          <div className="g-track">
            {months.map((m) => (
              <span key={m.key} className="g-month" style={{ left: `${pct(m.from)}%`, width: `${pct(addDays(m.to, 1)) - pct(m.from)}%` }}>
                {days(m.from, m.to) >= 9 ? fmtDate(m.key, "month").replace(/ (\d{4})$/, (_, y) => (m.key.endsWith("-01") || m === months[0] ? ` ${y}` : "")) : ""}
              </span>
            ))}
          </div>
        </div>
        {showWeeks ? (
          <div className="g-row g-weeks" aria-hidden="true">
            <div className="g-label">Week of</div>
            <div className="g-track">{weeks.map((w) => <span key={w} className="g-weeknum" style={{ left: `${pct(w)}%`, width: `${700 / total}%` }}>{Number(w.slice(8))}</span>)}</div>
          </div>
        ) : null}

        <div className="g-row g-miles">
          <div className="g-label">Milestones</div>
          <div className="g-track">
            {inRange(today) ? <span className="g-todaytag" style={{ left: `${pct(today) + 50 / total}%` }}>Today</span> : null}
            {milestones.map((m, i) => (
              <Modal key={m.id} className={`g-flag${i % 2 ? " low" : ""}${pct(m.start_date) > 76 ? " flip" : ""}`} title="Edit milestone" ariaLabel={`Milestone: ${m.title}, ${fmtDate(m.start_date, "long")}`}
                label={<span style={{ left: `${pct(addDays(m.start_date, 1))}%` }}><i aria-hidden="true">◆</i> {m.title} <small>{fmtDate(m.start_date)}</small></span>}>
                <RowForm table="timeline_items" id={m.id} what="this milestone"><TimelineFields item={m} kind="milestone" phases={knownPhases} today={today} /></RowForm>
              </Modal>
            ))}
          </div>
        </div>

        {phaseNames.map((phase, pi) => {
          const color = PHASE_COLORS[pi % PHASE_COLORS.length];
          const rows = tasks.filter((t) => (t.group_name?.trim() || "General") === phase).sort((a, b) => a.start_date.localeCompare(b.start_date) || a.end.localeCompare(b.end));
          return (
            <div className="g-phase" key={phase} style={{ ["--phase" as string]: color }}>
              <div className="g-phase-name"><strong>{phase}</strong><span>{rows.length} task{rows.length === 1 ? "" : "s"} · {span(rows[0].start_date, [...rows].sort((a, b) => b.end.localeCompare(a.end))[0].end)}</span></div>
              <div className="g-phase-rows">
                {rows.map((t) => {
                  const left = pct(t.start_date), width = Math.max(pct(addDays(t.end, 1)) - left, 0.7);
                  // The title sits inside the bar when it fits (assuming a chart about 760px wide), otherwise just after it.
                  // A bar that stands for a to-do shows when that to-do is finished.
                  const linked = t.todo_id ? todos.find((x) => x.id === t.todo_id) : undefined;
                  const done = !!linked?.done;
                  const inside = (width / 100) * 780 > t.title.length * 7.2 + 30;
                  // Near the right edge there is no room after the bar, so the title goes in front of it.
                  const before = !inside && left + width > 70;
                  return (
                    <div className="g-track g-task" key={t.id}>
                      <Modal className="g-bar-btn" title="Edit task" ariaLabel={`${t.title}: ${span(t.start_date, t.end)}`}
                        label={
                          <>
                            <span className={`g-bar${done ? " done" : ""}`} style={{ left: `${left}%`, width: `${width}%` }} title={`${t.title} · ${span(t.start_date, t.end)}${linked ? (done ? " · to-do, done" : " · to-do") : ""}`}>{inside ? `${done ? "✓ " : linked ? "☐ " : ""}${t.title}` : ""}</span>
                            {inside ? null : before
                              ? <span className="g-after before" style={{ right: `${100 - left}%` }}>{done ? "✓ " : linked ? "☐ " : ""}{t.title}</span>
                              : <span className="g-after" style={{ left: `${left + width}%` }}>{done ? "✓ " : linked ? "☐ " : ""}{t.title}</span>}
                          </>
                        }>
                        <RowForm table="timeline_items" id={t.id} what="this task"><TimelineFields item={t} kind="task" phases={knownPhases} today={today} /></RowForm>
                        {linked ? <p className="tiny muted">This bar belongs to the to-do “{linked.title}”{done ? " (done)" : ""}. Deleting the bar leaves the to-do in place.</p> : null}
                      </Modal>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {dots.length ? (
          <div className="g-row g-dots">
            <div className="g-label">To-dos + events</div>
            <div className="g-track">
              {dots.filter((d) => inRange(d.date)).map((d) => <span key={d.key} className={`g-dot ${d.tone}`} style={{ left: `${pct(d.date) + 50 / total}%` }} title={`${d.label} · ${fmtDate(d.date)}`} role="img" aria-label={`${d.label}, ${fmtDate(d.date, "long")}`} />)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
