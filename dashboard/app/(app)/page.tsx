import Link from "next/link";
import { Card, Empty, eventWhen, PageHead, RowForm, TodoFields, TodoItem, F } from "@/components/ui";
import { Clock, ImageField, Modal, Weather } from "@/components/client";
import { getEvents, getNotes, getProjects, getSettings, getTodos, getTz, rows } from "@/lib/data";
import { financeSummary, months } from "@/lib/finance-data";
import { DEFAULT_FEEDS, getNews } from "@/lib/feeds";
import { getInspiration } from "@/lib/inspiration";
import { addDays, fmtDate, money, monthGrid, nowTime, relDay, today } from "@/lib/format";
import { KIND_LABEL, KIND_PATH, STAGES, type Gear, type Kind, type Lead, type Pin } from "@/lib/types";

const RAMP = ["#b0d4e4", "#7fb4c0", "#4b929b", "#04656b", "#114c5a", "#172b36", "#041b21"];
const ago = (iso: string | null) => {
  if (!iso) return "";
  const h = Math.round((Date.now() - +new Date(iso)) / 3600000);
  return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

export default async function Dashboard() {
  const tz = await getTz();
  const t = today(tz), ym = t.slice(0, 7);
  const grid = monthGrid(ym);
  const [todos, projects, events, notes, leads, gear, pins, settings, fin] = await Promise.all([
    getTodos(), getProjects(), getEvents(grid[0][0], addDays(t, 45)), getNotes(), rows<Lead>("leads"), rows<Gear>("gear"),
    rows<Pin>("pins", "created_at", false), getSettings(), financeSummary(),
  ]);
  const feeds = Array.isArray(settings.feeds) && settings.feeds.length ? (settings.feeds as string[]) : DEFAULT_FEEDS;
  const [news, inspiration] = await Promise.all([getNews(feeds, 7), getInspiration()]);

  const open = todos.filter((x) => !x.done);
  const urgent = open.filter((x) => x.urgent);
  const dueToday = open.filter((x) => x.due_date && x.due_date <= t);
  const top = [...open].sort((a, b) => Number(b.urgent) - Number(a.urgent) || (a.due_date ?? "9").localeCompare(b.due_date ?? "9")).slice(0, 6);
  const upcoming = events.filter((e) => (e.end_date ?? e.date) >= t);
  const week = upcoming.filter((e) => e.date <= addDays(t, 7));
  const busy = new Set([...events.map((e) => e.date), ...open.map((x) => x.due_date).filter(Boolean)]);
  const openLeads = leads.filter((l) => !["won", "lost"].includes(l.status));
  const hour = Number(nowTime(tz).slice(0, 2));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const images = [
    ...pins.map((p) => ({ image: p.image_url, title: p.caption ?? "", credit: "Pinned", url: p.source_url, pin: p })),
    ...inspiration.map((i) => ({ ...i, pin: null as Pin | null })),
  ].slice(0, 11);
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

      <div className="grid stretch">
        <Card tone="dark" className="s4" title="Now">
          <Clock />
          <hr className="rule" />
          <div>
            <div className="eyebrow">Next up</div>
            {upcoming[0] ? (
              <p style={{ marginTop: 6 }}><strong>{upcoming[0].title}</strong><br /><span className="muted small">{relDay(upcoming[0].date, t)} · {eventWhen(upcoming[0])}{upcoming[0].location ? ` · ${upcoming[0].location}` : ""}</span></p>
            ) : <p className="muted small" style={{ marginTop: 6 }}>Nothing on the schedule.</p>}
          </div>
        </Card>

        <Card tone="sky" className="s4" title="This week's weather"><Weather /></Card>

        <Card className="s4" title={fmtDate(ym, "month")} more="/schedule">
          <div className="minical" role="img" aria-label={`Calendar for ${fmtDate(ym, "month")}; ${upcoming.length} upcoming events`}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="dow">{d}</div>)}
            {grid.flat().map((d) => (
              <div key={d} className={`d${d.slice(0, 7) !== ym ? " out" : ""}${d === t ? " today" : ""}${busy.has(d) ? " has" : ""}`}>{Number(d.slice(8))}</div>
            ))}
          </div>
          <div className="list">
            {upcoming.slice(0, 3).map((e) => (
              <div className="item" key={e.id}>
                <div className="grow"><div className="rowtitle">{e.title}</div><div className="meta">{relDay(e.date, t)} · {eventWhen(e)}</div></div>
              </div>
            ))}
          </div>
        </Card>

        <Card tone="sun" className="s4" title="To-dos" more="/todos">
          <div className="row" style={{ gap: 18 }}>
            <div><div className="big">{open.length}</div><div className="small">open</div></div>
            <div><div className="mid">{urgent.length}</div><div className="small">urgent</div></div>
            <div><div className="mid">{dueToday.length}</div><div className="small">due or overdue</div></div>
          </div>
          <div className="list">
            {top.map((x) => <TodoItem key={x.id} todo={x} projects={projects} today={t} />)}
            {!top.length ? <p className="small">Nothing open. Add one with “+ To-do”.</p> : null}
          </div>
        </Card>

        <Card className="s8" title="Projects">
          {(["client", "documentary", "narrative"] as Kind[]).map((kind) => {
            const list = projects.filter((p) => p.kind === kind);
            return (
              <div key={kind} className="stack" style={{ gap: 8 }}>
                <div className="row between">
                  <Link href={KIND_PATH[kind]} style={{ textDecoration: "none" }}><strong>{KIND_LABEL[kind]}</strong> <span className="muted">· {list.length}</span></Link>
                  {kind === "client" ? <span className="small muted">{money(list.filter((p) => p.stage !== "delivered").reduce((s, p) => s + Number(p.budget ?? 0), 0), { compact: true })} in budgets not yet delivered</span> : null}
                </div>
                <div className="stagebar" aria-hidden="true">
                  {list.length ? STAGES[kind].map((s, i) => {
                    const n = list.filter((p) => p.stage === s.value).length;
                    return n ? <span key={s.value} style={{ flex: n, background: RAMP[i] }} /> : null;
                  }) : <span style={{ flex: 1, background: "var(--line)" }} />}
                </div>
                <div className="legend">
                  {STAGES[kind].map((s, i) => (
                    <span key={s.value}><i style={{ background: RAMP[i] }} />{s.label} <strong>{list.filter((p) => p.stage === s.value).length}</strong></span>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>

        <Card tone="teal" className="s4" title="Finance" more="/finance">
          <div>
            <div className="big">{months(fin.monthsBooked)}<small>months of runway</small></div>
            <div className="small muted" style={{ marginTop: 8 }}>
              {fin.known ? `Cash, receivables and booked work against ${money(fin.burn.total)} a month.` : "Add your cash position and monthly overhead in Finance to see runway."}
            </div>
          </div>
          <div className="tiles">
            <div className="tile"><span className="tile-label">Cash</span><span className="tile-value">{money(fin.cash, { compact: true })}</span></div>
            <div className="tile"><span className="tile-label">Booked</span><span className="tile-value">{money(fin.booked, { compact: true })}</span></div>
            <div className="tile"><span className="tile-label">Pitched</span><span className="tile-value">{money(fin.pitched, { compact: true })}</span><span className="tile-note">weighted by odds</span></div>
          </div>
        </Card>

        <Card tone="pearl" className="s4" title="New biz" more="/bizdev">
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

        <Card className="s4" title="Notebook + gear" more="/notebook">
          <div className="list">
            {notes.slice(0, 3).map((n) => (
              <div className="item" key={n.id}><div className="grow"><div className="rowtitle">{n.title}</div><div className="meta">{fmtDate(n.noted_on)}{n.tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}</div></div></div>
            ))}
            {!notes.length ? <p className="small muted">No notes yet.</p> : null}
          </div>
          <hr className="rule" />
          <Link href="/gear" className="tiles" style={{ textDecoration: "none" }}>
            <span className="tile"><span className="tile-label">Gear owned</span><span className="tile-value">{gear.filter((g) => g.list === "inventory").length}</span></span>
            <span className="tile"><span className="tile-label">For sale</span><span className="tile-value">{selling.length}</span></span>
            <span className="tile"><span className="tile-label">To buy</span><span className="tile-value">{money(buying.reduce((s, g) => s + Number(g.est_cost ?? 0), 0), { compact: true })}</span></span>
          </Link>
        </Card>

        <Card className="s5 news" title="Industry news">
          <div className="list">
            {news.map((a) => (
              <a className="item" key={a.url} href={a.url} target="_blank" rel="noreferrer">
                <div className="grow"><div className="rowtitle">{a.title}</div><div className="meta">{a.source}{a.date ? ` · ${ago(a.date)}` : ""}</div></div>
              </a>
            ))}
            {!news.length ? <Empty>Headlines couldn’t be loaded just now. They refresh every half hour.</Empty> : null}
          </div>
        </Card>

        <Card tone="dark" className="s7" title="Visual inspiration" actions={
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
          ) : <p className="small muted">Museum and film images couldn’t be loaded just now. Pin your own with “+ Pin image”.</p>}
          <p className="tiny muted">Exhibitions on view at the Art Institute of Chicago, highlights on view at The Met{process.env.TMDB_API_KEY ? ", stills from films trending this week" : ""}, and your pins.</p>
        </Card>
      </div>
    </>
  );
}
