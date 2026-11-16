import Link from "next/link";
import { addDays, fmtDate, weekday } from "@/lib/format";
import { KIND_LABEL, stageLabel, type Kind, type Project, type TimelineItem } from "@/lib/types";

const DAY = 86400000;
const days = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / DAY);
// Same colours as the project tags elsewhere: Branded sky, Documentary green, Narrative dark.
const KIND_COLOR: Record<Kind, { bar: string; text: string }> = {
  client: { bar: "var(--sky)", text: "var(--dusk)" },
  documentary: { bar: "var(--leaf)", text: "var(--dusk)" },
  narrative: { bar: "var(--dusk)", text: "#fff" },
};

/**
 * All active projects on one timeline: a bar per project spanning its tasks and milestones (from its own
 * timeline), its milestones as diamonds, and a line for today. Projects without a timeline are listed with a prompt.
 */
export function PortfolioGantt({ projects, items, today }: { projects: Project[]; items: TimelineItem[]; today: string }) {
  const rows = projects.map((p) => {
    const mine = items.filter((i) => i.project_id === p.id);
    const dates = mine.flatMap((i) => [i.start_date, i.kind === "task" && i.end_date && i.end_date >= i.start_date ? i.end_date : i.start_date]).sort();
    return { project: p, from: dates[0] ?? null, to: dates[dates.length - 1] ?? null, milestones: mine.filter((i) => i.kind === "milestone") };
  });
  const dated = rows.filter((r) => r.from);
  if (!projects.length) return <p className="small muted">No active projects yet. Add them under Branded, Documentary and Narrative.</p>;

  // Scale: Monday before the first date to Sunday after the last, never less than about ten weeks around today.
  const all = [...dated.flatMap((r) => [r.from!, r.to!]), addDays(today, -14), addDays(today, 56)].sort();
  const first = addDays(all[0], -7), lastDay = addDays(all[all.length - 1], 7);
  const start = addDays(first, -((weekday(first) + 6) % 7));
  const end = addDays(lastDay, (7 - weekday(lastDay)) % 7);
  const total = days(start, end) + 1;
  const pct = (d: string) => (days(start, d) / total) * 100;
  const months: { key: string; from: string; to: string }[] = [];
  for (let d = start; d <= end; ) {
    const ym = d.slice(0, 7), nextMonth = addDays(ym + "-28", 7).slice(0, 7) + "-01";
    const to = addDays(nextMonth, -1) > end ? end : addDays(nextMonth, -1);
    months.push({ key: ym, from: d, to });
    d = addDays(to, 1);
  }
  const kinds = (["client", "documentary", "narrative"] as Kind[]).filter((k) => rows.some((r) => r.project.kind === k));

  return (
    <div className="gantt-scroll">
      <div className="gantt portfolio" role="group" aria-label="Timeline of active projects">
        <div className="gantt-guides" aria-hidden="true">
          {months.map((m, i) => i % 2 ? <span key={m.key} className="g-band" style={{ left: `${pct(m.from)}%`, width: `${pct(addDays(m.to, 1)) - pct(m.from)}%` }} /> : null)}
          {months.map((m) => <span key={m.key} className="g-week" style={{ left: `${pct(m.from)}%` }} />)}
          <span className="g-today" style={{ left: `${pct(today) + 50 / total}%` }} />
        </div>
        <div className="g-row g-months">
          <div className="g-label">Project</div>
          <div className="g-track">
            {months.map((m) => (
              <span key={m.key} className="g-month" style={{ left: `${pct(m.from)}%`, width: `${pct(addDays(m.to, 1)) - pct(m.from)}%` }}>
                {days(m.from, m.to) >= 12 ? fmtDate(m.key, "month").split(" ")[0].slice(0, total > 240 ? 3 : 9) + (m.key.endsWith("-01") ? ` ’${m.key.slice(2, 4)}` : "") : ""}
              </span>
            ))}
            <span className="g-todaytag" style={{ left: `${pct(today) + 50 / total}%`, bottom: "auto", top: 7 }}>Today</span>
          </div>
        </div>
        {kinds.map((kind) => (
          <div className="g-phase" key={kind} style={{ ["--phase" as string]: KIND_COLOR[kind].bar, ["--btext" as string]: KIND_COLOR[kind].text }}>
            <div className="g-phase-name"><strong>{KIND_LABEL[kind]}</strong><span>{rows.filter((r) => r.project.kind === kind).length} active</span></div>
            <div className="g-phase-rows">
              {rows.filter((r) => r.project.kind === kind).map((r) => {
                const p = r.project;
                if (!r.from || !r.to) {
                  return (
                    <div className="g-track g-task" key={p.id}>
                      <Link className="g-untimed" href={`/projects/${p.id}`}><strong>{p.title}</strong> · {stageLabel(p.kind, p.stage)} · add a timeline</Link>
                    </div>
                  );
                }
                const left = pct(r.from), width = Math.max(pct(addDays(r.to, 1)) - left, 0.8);
                const inside = (width / 100) * 560 > p.title.length * 7.2 + 18;
                const before = !inside && left + width > 62;
                const label = `${p.title} · ${stageLabel(p.kind, p.stage)} · ${fmtDate(r.from)} – ${fmtDate(r.to)}`;
                return (
                  <div className="g-track g-task" key={p.id}>
                    <Link className="g-bar-link" href={`/projects/${p.id}`} aria-label={label} title={label}>
                      <span className="g-bar" style={{ left: `${left}%`, width: `${width}%` }}>{inside ? p.title : ""}</span>
                      {inside ? null : before
                        ? <span className="g-after before" style={{ right: `${100 - left}%` }}>{p.title}</span>
                        : <span className="g-after" style={{ left: `${left + width}%` }}>{p.title}</span>}
                    </Link>
                    {r.milestones.map((m) => (
                      <span key={m.id} className="g-diamond" style={{ left: `${pct(m.start_date) + 50 / total}%` }} title={`${m.title} · ${fmtDate(m.start_date)}`} role="img" aria-label={`Milestone: ${m.title}, ${fmtDate(m.start_date, "long")}`} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
