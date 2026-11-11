import Link from "next/link";
import { Card, Empty, EventFields, eventWhen, PageHead, RowForm, TodoFields } from "@/components/ui";
import { Modal, Submit } from "@/components/client";
import { syncCalendarNow } from "@/app/(app)/actions";
import { getEvents, getProjects, getTodos, getTz } from "@/lib/data";
import { getGoogle, googleConfigured, pullCalendar } from "@/lib/google";
import { addDays, addMonths, fmtDate, fmtTime, monthGrid, relDay, today } from "@/lib/format";
import type { Event } from "@/lib/types";

export default async function Schedule({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const tz = await getTz();
  const t = today(tz);
  const { m } = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(m ?? "") ? m! : t.slice(0, 7);
  const grid = monthGrid(ym);
  const first = grid[0][0], last = grid[grid.length - 1][6];

  // Keep the page fresh: pull from Google when the last pull is more than ten minutes old.
  const google = await getGoogle();
  let stale = "";
  if (google && (!google.last_pull || Date.now() - +new Date(google.last_pull) > 600_000)) {
    try { await pullCalendar(tz); } catch (e) { stale = (e as Error).message; }
  }
  const [events, agenda, todos, projects] = await Promise.all([getEvents(addDays(first, -31), last), getEvents(t, addDays(t, 30)), getTodos(), getProjects()]);
  const dueTodos = todos.filter((x) => !x.done && x.due_date);
  const onDay = (d: string) => events.filter((e) => e.date <= d && (e.end_date ?? e.date) >= d);
  const edit = (e: Event) => (
    <RowForm table="events" id={e.id} what="this event"><EventFields event={e} projects={projects} /></RowForm>
  );

  return (
    <>
      <PageHead section="schedule" title="Schedule" sub={google
        ? `Two-way sync with ${google.email ?? "Google Calendar"}: what you add here is pushed to Google, and your Google events appear here.`
        : googleConfigured() ? "Connect Google in Settings to sync this with your Google Calendar." : "Events are saved here. Add the Google keys (see Settings) to sync with your Google Calendar."}>
        {google ? <form action={syncCalendarNow}><Submit className="btn ghost">Sync now</Submit></form> : null}
        <Modal label="+ Event" title="New event">
          <RowForm table="events" submit="Add event"><EventFields projects={projects} date={ym === t.slice(0, 7) ? t : ym + "-01"} /></RowForm>
        </Modal>
      </PageHead>
      {stale ? <div className="notice warn">Couldn’t refresh from Google Calendar: {stale}</div> : null}

      <div className="grid">
        <Card className="s9">
          <div className="card-head">
            <h2 className="card-title">{fmtDate(ym, "month")}</h2>
            <div className="row" style={{ gap: 4 }}>
              <Link className="btn sm" href={`/schedule?m=${addMonths(ym, -1)}`} aria-label="Previous month">‹</Link>
              <Link className="btn ghost sm" href="/schedule">Today</Link>
              <Link className="btn sm" href={`/schedule?m=${addMonths(ym, 1)}`} aria-label="Next month">›</Link>
            </div>
          </div>
          <div className="cal">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="dow">{d}</div>)}
            {grid.flat().map((d) => (
              <div key={d} className={`day${d.slice(0, 7) !== ym ? " out" : ""}${d === t ? " today" : ""}`}>
                <span className="daynum">{Number(d.slice(8))}</span>
                {onDay(d).map((e) => (
                  <Modal key={e.id} className={`ev${e.project_id ? " proj" : ""}`} title="Edit event" ariaLabel={`${e.title}, ${fmtDate(d)}`}
                    label={<>{e.start_time ? <strong>{fmtTime(e.start_time).replace(" ", "").toLowerCase()} </strong> : null}{e.title}</>}>
                    {edit(e)}
                  </Modal>
                ))}
                {dueTodos.filter((x) => x.due_date === d).map((x) => (
                  <Modal key={x.id} className="ev todo" title="Edit to-do" ariaLabel={`To-do due: ${x.title}`} label={<>☐ {x.title}</>}>
                    <RowForm table="todos" id={x.id} bools={["urgent"]} what="this to-do"><TodoFields todo={x} projects={projects} /></RowForm>
                  </Modal>
                ))}
              </div>
            ))}
          </div>
          <div className="legend">
            <span><i style={{ background: "var(--sky)" }} />Event</span>
            <span><i style={{ background: "var(--leaf)" }} />Tagged to a project</span>
            <span><i style={{ background: "var(--forsythia)" }} />To-do deadline</span>
          </div>
        </Card>

        <Card className="s3" tone="dark" title="Next 30 days">
          <div className="list">
            {agenda.map((e) => (
              <div className="item" key={e.id}>
                <div className="grow">
                  <div className="rowtitle">{e.title}</div>
                  <div className="meta">{relDay(e.date, t)} · {eventWhen(e)}{e.location ? ` · ${e.location}` : ""}</div>
                </div>
              </div>
            ))}
            {!agenda.length ? <p className="small muted">Nothing scheduled.</p> : null}
          </div>
        </Card>
      </div>
      {!events.length && !dueTodos.length ? <Empty>No events yet. Add one with “+ Event”.</Empty> : null}
    </>
  );
}
