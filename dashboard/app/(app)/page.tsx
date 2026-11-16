import Link from "next/link";
import { loadPrivacy } from "@/lib/privacy";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { hasServiceKey, setSetting } from "@/lib/integrations";
import { Card, Empty, eventWhen, PageHead, RowForm, TodoFields, TodoItem, F } from "@/components/ui";
import { Clock, ImageField, Modal, ScrollList, ShuffleButton, Weather } from "@/components/client";
import { WidgetGrid } from "@/components/WidgetGrid";
import { getEvents, getNotes, getProjects, getSettings, getTodos, getTz, rows } from "@/lib/data";
import { financeSummary, months } from "@/lib/finance-data";
import { DEFAULT_FEEDS, getNews } from "@/lib/feeds";
import { getInspiration, readSources, shuffle } from "@/lib/inspiration";
import { getFeedEvents } from "@/lib/industry";
import { PortfolioGantt } from "@/components/PortfolioGantt";
import { addDays, fmtDate, money, monthGrid, nowTime, relDay, today } from "@/lib/format";
import { type IndustryEvent, type TimelineItem, KIND_LABEL, KIND_PATH, stageLabel, STAGES, type Gear, type Kind, type Lead, type Pin } from "@/lib/types";

const EVENT_KINDS = [{ value: "deadline", label: "Submission deadline" }, { value: "event", label: "Event" }];
function IndustryFields({ event }: { event?: IndustryEvent }) {
  return (
    <div className="fgrid">
      <F label="What" name="title" defaultValue={event?.title} required full placeholder="e.g. SXSW feature film — final deadline" />
      <F label="Festival or organisation" name="org" defaultValue={event?.org} />
      <F label="Type" name="kind" options={EVENT_KINDS} defaultValue={event?.kind ?? "deadline"} />
      <F label="Date" name="date" type="date" defaultValue={event?.date} />
      <F label="Last day (if it runs several days)" name="end_date" type="date" defaultValue={event?.end_date} />
      <F label="Link" name="url" type="url" defaultValue={event?.url} full placeholder="https://…" />
      <F label="Notes" name="notes" defaultValue={event?.notes} full />
    </div>
  );
}

const RAMP = ["#b0d4e4", "#7fb4c0", "#4b929b", "#04656b", "#114c5a", "#172b36", "#041b21"];
const ago = (iso: string | null) => {
  if (!iso) return "";
  const h = Math.round((Date.now() - +new Date(iso)) / 3600000);
  return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

export default async function Dashboard() {
  await loadPrivacy();
  const tz = await getTz();
  // Vercel tells us roughly where the request came from; the weather panel uses it until the browser shares a precise location.
  const h = await headers();
  const lat = Number(h.get("x-vercel-ip-latitude")), lon = Number(h.get("x-vercel-ip-longitude"));
  const approx = h.get("x-vercel-ip-latitude") && Number.isFinite(lat) && Number.isFinite(lon)
    ? { lat: +lat.toFixed(2), lon: +lon.toFixed(2), place: [decodeURIComponent(h.get("x-vercel-ip-city") ?? ""), h.get("x-vercel-ip-country-region")].filter(Boolean).join(", ") }
    : null;
  const t = today(tz), ym = t.slice(0, 7);
  const grid = monthGrid(ym);
  const [todos, projects, events, notes, leads, gear, pins, settings, fin] = await Promise.all([
    getTodos(), getProjects(), getEvents(grid[0][0], addDays(t, 45)), getNotes(), rows<Lead>("leads"), rows<Gear>("gear"),
    rows<Pin>("pins", "created_at", false), getSettings(), financeSummary(),
  ]);
  // The Projects panel: active work only. Narrative ideas still in Ideation are left out.
  const activeProjects = projects.filter((p) => (p.kind === "client" ? p.stage !== "delivered" : p.kind === "narrative" ? ["in_development", "writing"].includes(p.stage) : true));
  const timelineItems = await rows<TimelineItem>("timeline_items", "start_date");
  // Industry events: the ones kept by hand (festival deadlines) plus anything read from event feeds.
  const [manualEvents, feedResults] = await Promise.all([rows<IndustryEvent>("industry_events", "date"), getFeedEvents().catch(() => [])]);
  const known = new Set(manualEvents.map((e) => `${e.title.toLowerCase()}|${e.date}`));
  const pulled = [...new Map(feedResults.flatMap((r) => r.events).map((e) => [`${e.title.toLowerCase()}|${e.date}`, e])).values()]
    .filter((e) => !known.has(`${e.title.toLowerCase()}|${e.date}`));
  const dated = [
    ...manualEvents.filter((e) => e.date && (e.end_date ?? e.date) >= t).map((e) => ({ ...e, date: e.date!, row: e as IndustryEvent | null })),
    ...pulled.filter((e) => (e.end_date ?? e.date) >= t).map((e) => ({ id: `${e.org}-${e.title}-${e.date}`, title: e.title, org: e.org, kind: "event" as const, date: e.date, end_date: e.end_date, url: e.url, notes: null, row: null as IndustryEvent | null })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const undated = manualEvents.filter((e) => !e.date);
  const feedOrgs = [...new Set(feedResults.map((r) => r.feed.org))];
  const quietOrgs = feedOrgs.filter((org) => !pulled.some((e) => e.org === org));
  const feeds = Array.isArray(settings.feeds) && settings.feeds.length ? (settings.feeds as string[]) : DEFAULT_FEEDS;
  const sources = readSources(settings.inspiration_sources);
  // Images already shown today are left out, so a reload or Shuffle always brings new ones.
  const seenToday = settings.inspiration_seen as { date?: string; ids?: string[] } | undefined;
  const shown = new Set(seenToday?.date === t ? seenToday.ids ?? [] : []);
  const imageId = (url: string) => createHash("sha1").update(url).digest("hex").slice(0, 12);
  let startedOver = false;
  const [news, firstDraw] = await Promise.all([getNews(feeds, 4), getInspiration(sources, { skip: (url) => shown.has(imageId(url)) })]);
  let draw = firstDraw;
  // Once nearly everything has been shown, start the day's rotation again.
  if (shown.size && draw.items.length < 6) {
    shown.clear();
    startedOver = true;
    draw = await getInspiration(sources);
  }
  const { items: inspiration, status: sourceStatus } = draw;
  // Keep a record of what each source returned (at most every ten minutes), so problems can be diagnosed.
  const lastStatus = settings.inspiration_status as { at?: string } | undefined;
  if (hasServiceKey() && (!lastStatus?.at || Date.now() - +new Date(lastStatus.at) > 600_000)) {
    after(() => setSetting("inspiration_status", { at: new Date().toISOString(), sources: sourceStatus }).catch(() => {}));
    after(() => setSetting("industry_feed_status", { at: new Date().toISOString(), feeds: feedResults.map((r) => ({ url: r.feed.url, count: r.events.length, error: r.error })) }).catch(() => {}));
  }
  const silent = sourceStatus.filter((x) => !x.count);

  const open = todos.filter((x) => !x.done);
  const urgent = open.filter((x) => x.urgent);
  const dueToday = open.filter((x) => x.due_date && x.due_date <= t);
  const top = [...open].sort((a, b) => Number(b.urgent) - Number(a.urgent) || (a.due_date ?? "9").localeCompare(b.due_date ?? "9")).slice(0, 60);
  const now = nowTime(tz); // "HH:MM" in the viewer's time zone
  // Still relevant: anything today that hasn't finished yet, and everything after today.
  const upcoming = events.filter((e) => {
    const last = e.end_date ?? e.date;
    if (last !== t) return last > t;
    return !e.start_time || (e.end_time ?? e.start_time).slice(0, 5) > now;
  });
  // "Next up" is strictly in the future: starts later today, or on a later day.
  const next = events.find((e) => e.date > t || (e.date === t && !!e.start_time && e.start_time.slice(0, 5) > now));
  const week = upcoming.filter((e) => e.date <= addDays(t, 7));
  const busy = new Set([...events.map((e) => e.date), ...open.map((x) => x.due_date).filter(Boolean)]);
  const openLeads = leads.filter((l) => !["won", "lost"].includes(l.status));
  const hour = Number(now.slice(0, 2));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  // A different mix on every load: up to four of your pins plus images from the sources, in random order.
  const freshPins = pins.filter((p) => !shown.has(imageId(p.image_url)));
  const images = shuffle([
    ...shuffle(freshPins).slice(0, 4).map((p) => ({ image: p.image_url, title: p.caption ?? "", credit: "Pinned", url: p.source_url, pin: p })),
    ...inspiration.map((i) => ({ ...i, pin: null as Pin | null })),
  ].slice(0, 11));
  // Remember what this load showed, before the page is sent, so the next load can't repeat it.
  if (hasServiceKey() && images.length) {
    const ids = [...new Set([...shown, ...images.map((i) => imageId(i.image))])].slice(-4000);
    await setSetting("inspiration_seen", { date: t, ids }).catch(() => {});
  }
  const selling = gear.filter((g) => g.list === "sell" && g.sell_status !== "sold");
  const buying = gear.filter((g) => g.list === "buy");

  return (
    <>
      <PageHead section="dashboard" title={greeting} eyebrow={fmtDate(t, "long")}
        sub={<>{open.length} open to-do{open.length === 1 ? "" : "s"}{urgent.length ? `, ${urgent.length} urgent` : ""} · {week.length} thing{week.length === 1 ? "" : "s"} on the schedule this week · {projects.length} active project{projects.length === 1 ? "" : "s"}</>}>
        <Modal label="+ To-do" title="New to-do">
          <RowForm table="todos" bools={["urgent"]} submit="Add to-do"><TodoFields projects={projects} /></RowForm>
        </Modal>
      </PageHead>

      <WidgetGrid saved={Array.isArray(settings.dashboard_layout) ? (settings.dashboard_layout as { id: string; span: string }[]) : null} items={[
        { id: "now", href: "/schedule", label: "Now", span: "s4", node: (
        <Card tone="dark" title="Now" more="/schedule">
          <Clock />
          <hr className="rule" />
          <div>
            <div className="eyebrow">Next up</div>
            {next ? (
              <p style={{ marginTop: 6 }}><strong>{next.title}</strong><br /><span className="muted small">{relDay(next.date, t)} · {eventWhen(next)}{next.location ? ` · ${next.location}` : ""}</span></p>
            ) : <p className="muted small" style={{ marginTop: 6 }}>Nothing on the schedule.</p>}
          </div>
        </Card>
        ) },

        { id: "weather", label: "Weather", span: "s4", node: (
        <Card tone="sky" title="This week's weather"><Weather approx={approx} /></Card>
        ) },

        { id: "calendar", href: "/schedule", label: "Calendar", span: "s4", node: (
        <Card title={fmtDate(ym, "month")} more="/schedule">
          <div className="minical" role="img" aria-label={`Calendar for ${fmtDate(ym, "month")}; ${upcoming.length} upcoming events`}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="dow">{d}</div>)}
            {grid.flat().map((d) => (
              <div key={d} className={`d${d.slice(0, 7) !== ym ? " out" : ""}${d === t ? " today" : ""}${busy.has(d) ? " has" : ""}`}>{Number(d.slice(8))}</div>
            ))}
          </div>
        </Card>
        ) },

        { id: "todos", href: "/todos", label: "To-dos", span: "s4", node: (
        <Card tone="sun" title="To-dos" more="/todos">
          <div className="row" style={{ gap: 18 }}>
            <div><div className="big">{open.length}</div><div className="small">open</div></div>
            <div><div className="mid">{urgent.length}</div><div className="small">urgent</div></div>
            <div><div className="mid">{dueToday.length}</div><div className="small">due or overdue</div></div>
          </div>
          {/* Three to-dos are visible; the rest scroll inside the card. */}
          <ScrollList show={3} label="Open to-dos">
            {top.map((x) => <TodoItem key={x.id} todo={x} projects={projects} today={t} />)}
          </ScrollList>
          {!top.length ? <p className="small">Nothing open. Add one with “+ To-do”.</p> : null}
          {top.length > 3 ? <p className="tiny" style={{ marginTop: -6 }}>Scroll for {top.length - 3} more</p> : null}
        </Card>
        ) },

        { id: "projects", label: "Projects", span: "s8", node: (
        <Card title={`Active projects · ${activeProjects.length}`}>
          {/* Branded work not yet delivered, every documentary, and narrative projects in development or being written. */}
          <PortfolioGantt projects={activeProjects} items={timelineItems} today={t} />
          <div className="legend">
            <span><i style={{ background: "var(--sky)" }} />Branded</span>
            <span><i style={{ background: "var(--leaf)" }} />Documentary</span>
            <span><i style={{ background: "var(--dusk)" }} />Narrative</span>
            <span><i style={{ background: "var(--dusk)", transform: "rotate(45deg) scale(.8)" }} />Milestone</span>
            <span className="muted">Each bar spans the project’s own timeline. Click one to open the project.</span>
          </div>
        </Card>
        ) },

        { id: "finance", href: "/finance", label: "Finance", span: "s4", node: (
        <Card tone="teal" title="Finance" more="/finance">
          <div>
            <div className="big">{months(fin.monthsBooked)}<small>months of runway</small></div>
            <div className="small muted" style={{ marginTop: 8 }}>
              {fin.known ? `Cash, receivables and booked work against ${money(fin.burn.total)} a month.` : "Add your cash position and monthly overhead in Finance to see runway."}
            </div>
          </div>
          <div className="tiles">
            <div className="tile"><span className="tile-label">Overhead</span><span className="tile-value">{money(fin.burn.total, { compact: true })}</span><span className="tile-note">a month</span></div>
            <div className="tile"><span className="tile-label">Cash</span><span className="tile-value">{money(fin.cash, { compact: true })}</span></div>
            <div className="tile"><span className="tile-label">Booked</span><span className="tile-value">{money(fin.booked, { compact: true })}</span></div>
            <div className="tile"><span className="tile-label">Pitched</span><span className="tile-value">{money(fin.pitched, { compact: true })}</span><span className="tile-note">weighted by odds</span></div>
          </div>
        </Card>
        ) },

        { id: "bizdev", href: "/bizdev", label: "New Biz", span: "s4", node: (
        <Card tone="pearl" title="New Biz" more="/bizdev">
          <div className="row" style={{ gap: 18 }}>
            <div><div className="big">{openLeads.length}</div><div className="small muted">open leads</div></div>
            <div><div className="mid">{money(openLeads.reduce((s, l) => s + Number(l.est_value ?? 0), 0), { compact: true })}</div><div className="small muted">estimated value</div></div>
          </div>
          <div className="list">
            {openLeads.filter((l) => l.next_step).slice(0, 3).map((l) => (
              <div className="item" key={l.id}><div className="grow"><div className="rowtitle">{l.next_step}</div><div className="meta">{l.name}{l.company ? `, ${l.company}` : ""}{l.next_on ? ` · ${relDay(l.next_on, t)}` : ""}</div></div></div>
            ))}
          </div>
        </Card>
        ) },

        { id: "notebook", href: "/notebook", label: "Notebook + gear", span: "s4", node: (
        <Card title="Notebook + gear" more="/notebook">
          <div className="list">
            {notes.slice(0, 3).map((n) => (
              <div className="item" key={n.id}><div className="grow"><div className="rowtitle">{n.title}</div><div className="meta">{fmtDate(n.noted_on)}{n.tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}</div></div></div>
            ))}
            {!notes.length ? <p className="small muted">No notes yet.</p> : null}
          </div>
          <hr className="rule" />
          <Link href="/gear" className="tiles" style={{ textDecoration: "none", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            <span className="tile"><span className="tile-label">Gear owned</span><span className="tile-value">{gear.filter((g) => g.list === "inventory").length}</span></span>
            <span className="tile"><span className="tile-label">For sale</span><span className="tile-value">{selling.length}</span></span>
            <span className="tile"><span className="tile-label">To buy</span><span className="tile-value">{buying.length}</span><span className="tile-note">{money(buying.reduce((s, g) => s + Number(g.est_cost ?? 0), 0), { compact: true })}</span></span>
          </Link>
        </Card>
        ) },

        { id: "news", label: "Industry news + events", span: "s4", node: (
        <div className="stack-cards">
        <Card className="news" title="Industry news">
          <div className="list">
            {news.map((a) => (
              <a className="item" key={a.url} href={a.url} target="_blank" rel="noreferrer">
                <div className="grow"><div className="rowtitle">{a.title}</div><div className="meta">{a.source}{a.date ? ` · ${ago(a.date)}` : ""}</div></div>
              </a>
            ))}
            {!news.length ? <Empty>Headlines couldn’t be loaded just now. They refresh every half hour.</Empty> : null}
          </div>
        </Card>
        <Card title="Industry events" actions={
          <Modal label="+ Add" title="New industry event or deadline" className="btn sm">
            <RowForm table="industry_events" submit="Add"><IndustryFields /></RowForm>
          </Modal>
        }>
          <ScrollList show={4} label="Industry events and deadlines">
            {dated.map((e) => (
              <div className="item" key={e.id}>
                <div className="grow">
                  {e.row ? (
                    <Modal label={<span className="rowtitle">{e.title}</span>} title="Edit industry event" className="rowbtn" ariaLabel={`Edit ${e.title}`}>
                      <RowForm table="industry_events" id={e.row.id} what="this entry"><IndustryFields event={e.row} /></RowForm>
                    </Modal>
                  ) : <div className="rowtitle">{e.title}</div>}
                  <div className="meta">
                    <span className={`chip${e.kind === "deadline" ? " urgent" : " sky"}`}>{e.kind === "deadline" ? "Deadline" : "Event"}</span>
                    <span className="chip">{relDay(e.date, t)}{e.end_date && e.end_date !== e.date ? ` – ${fmtDate(e.end_date)}` : ""}</span>
                    {e.org ? <span>{e.org}</span> : null}
                    {e.url ? <a href={e.url} target="_blank" rel="noreferrer">Details ↗</a> : null}
                  </div>
                </div>
              </div>
            ))}
            {undated.map((e) => (
              <div className="item" key={e.id}>
                <div className="grow">
                  <Modal label={<span className="rowtitle">{e.title}</span>} title="Edit industry event" className="rowbtn" ariaLabel={`Edit ${e.title}`}>
                    <RowForm table="industry_events" id={e.id} what="this entry"><IndustryFields event={e} /></RowForm>
                  </Modal>
                  <div className="meta">
                    <span className="chip outline">Date to confirm</span>
                    {e.notes ? <span>{e.notes}</span> : null}
                    {e.url ? <a href={e.url} target="_blank" rel="noreferrer">Check site ↗</a> : null}
                  </div>
                </div>
              </div>
            ))}
          </ScrollList>
          {!dated.length && !undated.length ? <p className="small muted">Nothing listed. Add a deadline or event with “+ Add”.</p> : null}
          {quietOrgs.length ? (
            <p className="tiny muted">
              No upcoming events could be read from {quietOrgs.join(", ")}.{" "}
              {feedResults.filter((r) => quietOrgs.includes(r.feed.org)).slice(0, 1).map((r) => <a key={r.feed.url} href={r.feed.url} target="_blank" rel="noreferrer">Open their events page ↗</a>)}
            </p>
          ) : null}
        </Card>
        </div>
        ) },

        { id: "inspiration", label: "Visual inspiration", span: "s8", node: (
        <Card tone="dark" title="Visual inspiration" actions={
          <Modal label="+ Pin image" title="Pin an image" className="btn sm">
            <RowForm table="pins" submit="Pin">
              <ImageField name="image_url" label="Image" folder="pins" />
              <F label="Caption" name="caption" placeholder="Film, artist, where it's from" />
              <F label="Link (optional)" name="source_url" type="url" placeholder="https://…" />
            </RowForm>
          </Modal>
        }>
          {images.length ? (
            <div className="mosaic">
              {images.map((i, n) => i.pin ? (
                <Modal key={i.pin.id} className="tileimg rowbtn" title="Pinned image" ariaLabel={`Pinned image: ${i.title || "untitled"}`} label={
                  // eslint-disable-next-line @next/next/no-img-element
                  <><img src={i.image} alt={i.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /><span className="cap">{i.title || "Pinned"}</span></>
                }>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.image} alt={i.title} />
                  <RowForm table="pins" id={i.pin.id} what="this pin">
                    <F label="Caption" name="caption" defaultValue={i.pin.caption} />
                    <F label="Link" name="source_url" type="url" defaultValue={i.pin.source_url} />
                  </RowForm>
                </Modal>
              ) : (
                <a key={n} href={i.url ?? i.image} target="_blank" rel="noreferrer" style={{ backgroundImage: `url("${i.image}")` }} aria-label={`${i.title} — ${i.credit}`}>
                  <span className="cap"><strong>{i.title}</strong><br />{i.credit}</span>
                </a>
              ))}
            </div>
          ) : <p className="small muted">None of the image sources returned anything just now. Check them in Settings, or pin your own with “+ Pin image”.</p>}
          <div className="row between" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
            <p className="tiny muted grow">
              No image repeats on the same day. Now showing: {[...new Set(inspiration.map((i) => i.credit.split(" · ").pop()))].slice(0, 6).join(", ") || "your pins"}.{startedOver ? " Everything has been shown once today, so the rotation started over." : ""}{silent.length ? ` ${silent.length} of ${sourceStatus.length} sources returned nothing (see Settings).` : ""} <Link href="/settings#inspiration">Choose sources</Link> · <a href="https://shotdeck.com/shots" target="_blank" rel="noreferrer">Open ShotDeck ↗</a>
            </p>
            <ShuffleButton />
          </div>
        </Card>
        ) },
      ]} />
    </>
  );
}
