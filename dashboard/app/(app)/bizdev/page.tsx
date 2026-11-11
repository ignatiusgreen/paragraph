import { Card, Check, Empty, F, PageHead, RowForm } from "@/components/ui";
import { Modal, Submit } from "@/components/client";
import { Spark } from "@/components/charts";
import { importContacts, snapshotMetricsNow } from "@/app/(app)/actions";
import { getTz, rows } from "@/lib/data";
import { instagramConfigured, vimeoConfigured } from "@/lib/metrics";
import { fmtDate, label, money, num, relDay, today } from "@/lib/format";
import type { Contact, Gift, Lead, Metric } from "@/lib/types";

const STATUSES = ["lead", "contacted", "meeting", "proposal", "won", "lost"].map((v) => ({ value: v, label: label(v) }));
const CHANNELS = [
  { value: "website", label: "Website", tone: "", metrics: ["visitors", "pageviews"] },
  { value: "vimeo", label: "Vimeo", tone: "sky", metrics: ["plays", "followers"] },
  { value: "linkedin", label: "LinkedIn", tone: "leaf", metrics: ["followers", "impressions"] },
  { value: "instagram", label: "Instagram", tone: "sun", metrics: ["followers", "reach"] },
];
const METRICS = ["visitors", "pageviews", "plays", "followers", "impressions", "reach", "posts", "videos"].map((v) => ({ value: v, label: label(v) }));
const GIFT_STATUS = ["idea", "ordered", "sent"].map((v) => ({ value: v, label: label(v) }));

function LeadFields({ lead }: { lead?: Lead }) {
  return (
    <div className="fgrid">
      <F label="Name" name="name" defaultValue={lead?.name} required /><F label="Company" name="company" defaultValue={lead?.company} />
      <F label="Email" name="email" type="email" defaultValue={lead?.email} /><F label="Where it came from" name="source" defaultValue={lead?.source} placeholder="Referral, festival, cold outreach…" />
      <F label="Status" name="status" options={STATUSES} defaultValue={lead?.status ?? "lead"} /><F label="Estimated value" name="est_value" type="number" defaultValue={lead?.est_value} />
      <F label="Next step" name="next_step" defaultValue={lead?.next_step} /><F label="By" name="next_on" type="date" defaultValue={lead?.next_on} />
      <F label="Notes" name="notes" type="textarea" defaultValue={lead?.notes} full rows={3} />
    </div>
  );
}
function GiftFields({ gift, year }: { gift?: Gift; year: number }) {
  return (
    <div className="fgrid">
      <F label="Recipient" name="recipient" defaultValue={gift?.recipient} required /><F label="Company" name="company" defaultValue={gift?.company} />
      <F label="Gift" name="gift" defaultValue={gift?.gift} /><F label="Cost" name="cost" type="number" defaultValue={gift?.cost} />
      <F label="Status" name="status" options={GIFT_STATUS} defaultValue={gift?.status ?? "idea"} /><F label="Year" name="year" type="number" step="1" defaultValue={gift?.year ?? year} required />
      <F label="Shipping address" name="address" type="textarea" defaultValue={gift?.address} full rows={2} /><F label="Notes" name="notes" defaultValue={gift?.notes} full />
    </div>
  );
}

export default async function BizDev() {
  const [leads, metrics, contacts, gifts, tz] = await Promise.all([
    rows<Lead>("leads"), rows<Metric>("metrics", "recorded_on"), rows<Contact>("contacts", "email"), rows<Gift>("gifts", "recipient"), getTz(),
  ]);
  const t = today(tz), year = Number(t.slice(0, 4));
  const open = leads.filter((l) => !["won", "lost"].includes(l.status));
  const subscribed = contacts.filter((c) => c.subscribed);
  const years = [...new Set([year, ...gifts.map((g) => g.year)])].sort((a, b) => b - a);
  return (
    <>
      <PageHead section="bizdev" title="New biz dev" sub="Leads, marketing numbers, the newsletter list and holiday gifts.">
        <Modal label="+ Lead" title="New lead"><RowForm table="leads" submit="Add lead"><LeadFields /></RowForm></Modal>
      </PageHead>

      <Card title={`Leads · ${open.length} open · ${money(open.reduce((s, l) => s + Number(l.est_value ?? 0), 0), { compact: true })}`}>
        {leads.length ? (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Lead</th><th>Status</th><th>Next step</th><th>Source</th><th className="num">Est. value</th></tr></thead>
              <tbody>
                {[...leads].sort((a, b) => STATUSES.findIndex((s) => s.value === a.status) - STATUSES.findIndex((s) => s.value === b.status)).map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Modal label={<span className="rowtitle"><strong>{l.name}</strong></span>} title={l.name} className="rowbtn" ariaLabel={`Edit ${l.name}`}>
                        <RowForm table="leads" id={l.id} what="this lead"><LeadFields lead={l} /></RowForm>
                      </Modal>
                      <div className="tiny muted">{[l.company, l.email].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td><span className={`chip${l.status === "won" ? " leaf" : l.status === "lost" ? "" : l.status === "proposal" ? " sun" : " sky"}`}>{label(l.status)}</span></td>
                    <td>{l.next_step ?? <span className="muted">—</span>}{l.next_on ? <div className={`tiny${l.next_on < t && open.includes(l) ? "" : " muted"}`}>{l.next_on < t && open.includes(l) ? "Overdue · " : ""}{relDay(l.next_on, t)}</div> : null}</td>
                    <td className="muted">{l.source ?? "—"}</td>
                    <td className="num">{money(l.est_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No leads yet. Add the first with “+ Lead”.</Empty>}
      </Card>

      <div className="row between">
        <h2 className="card-title">Marketing analytics</h2>
        <div className="row">
          {vimeoConfigured() || instagramConfigured() ? <form action={snapshotMetricsNow}><Submit className="btn ghost sm">Refresh from APIs</Submit></form> : null}
          <Modal label="+ Add numbers" title="Record a number" className="btn sm">
            <RowForm table="metrics" submit="Record">
              <div className="fgrid">
                <F label="Channel" name="channel" options={CHANNELS} /><F label="What" name="metric" options={METRICS} />
                <F label="Value" name="value" type="number" required /><F label="Date" name="recorded_on" type="date" defaultValue={t} required />
              </div>
            </RowForm>
          </Modal>
        </div>
      </div>
      <div className="grid stretch">
        {CHANNELS.map((c) => {
          const mine = metrics.filter((m) => m.channel === c.value);
          const names = [...new Set([...c.metrics, ...mine.map((m) => m.metric)])];
          return (
            <Card key={c.value} tone={c.tone} className="s3" title={c.label}>
              {names.map((name) => {
                const series = mine.filter((m) => m.metric === name);
                const last = series[series.length - 1], prev = series[series.length - 2];
                const delta = last && prev ? Number(last.value) - Number(prev.value) : null;
                return (
                  <div key={name}>
                    <div className="row between" style={{ alignItems: "baseline" }}>
                      <span className="tile-label">{label(name)}</span>
                      {delta != null ? <span className="tiny">{delta >= 0 ? "▲" : "▼"} {num(Math.abs(delta))} since {fmtDate(prev.recorded_on)}</span> : null}
                    </div>
                    <div className="mid" style={{ marginTop: 4 }}>{last ? num(last.value) : "—"}</div>
                    <Spark values={series.map((m) => Number(m.value))} color="var(--dusk)" />
                    <div className="tiny muted">{last ? `As of ${fmtDate(last.recorded_on)}${last.source === "api" ? " · automatic" : ""}` : "No numbers yet"}</div>
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
      <p className="tiny muted">Vimeo and Instagram update automatically each day once their keys are added (see Settings). Website and LinkedIn numbers are entered by hand with “+ Add numbers”.</p>

      <div className="grid">
        <Card className="s6" title={`Email newsletter list · ${subscribed.length}`} actions={
          <>
            <a className="btn ghost sm" href="/api/export/contacts">Export CSV</a>
            <Modal label="Import" title="Import contacts" className="btn ghost sm">
              <form action={importContacts} className="stack">
                <div className="field"><label htmlFor="csv">One per line: email, name, company</label><textarea id="csv" name="csv" rows={8} required placeholder={"jane@example.com, Jane Doe, Example Co"} /></div>
                <div className="form-foot"><span /><Submit>Import</Submit></div>
              </form>
            </Modal>
            <Modal label="+ Contact" title="New contact" className="btn sm">
              <RowForm table="contacts" submit="Add" hidden={{ _tags: "1" }}>
                <F label="Email" name="email" type="email" required /><F label="Name" name="name" /><F label="Company" name="company" /><F label="Tags (comma separated)" name="tags_extra" />
              </RowForm>
            </Modal>
          </>
        }>
          {contacts.length ? (
            <div className="tablewrap" style={{ maxHeight: 420, overflowY: "auto" }}>
              <table>
                <thead><tr><th>Email</th><th>Name</th><th>Tags</th></tr></thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Modal label={<span className="rowtitle">{c.email}</span>} title={c.email} className="rowbtn" ariaLabel={`Edit ${c.email}`}>
                          <RowForm table="contacts" id={c.id} bools={["subscribed"]} hidden={{ _tags: "1" }} what="this contact">
                            <F label="Email" name="email" type="email" defaultValue={c.email} required /><F label="Name" name="name" defaultValue={c.name} />
                            <F label="Company" name="company" defaultValue={c.company} /><F label="Tags (comma separated)" name="tags_extra" defaultValue={c.tags.join(", ")} />
                            <Check label="Subscribed" name="subscribed" defaultChecked={c.subscribed} />
                          </RowForm>
                        </Modal>
                        {!c.subscribed ? <span className="chip">Unsubscribed</span> : null}
                      </td>
                      <td>{[c.name, c.company].filter(Boolean).join(", ") || <span className="muted">—</span>}</td>
                      <td>{c.tags.map((tag) => <span key={tag} className="chip" style={{ marginRight: 4 }}>{tag}</span>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>No one on the list yet. Add contacts or paste a list with Import.</Empty>}
        </Card>

        <Card className="s6" title="Holiday gifts" actions={
          <Modal label="+ Gift" title="New gift" className="btn sm"><RowForm table="gifts" submit="Add"><GiftFields year={year} /></RowForm></Modal>
        }>
          {years.map((y) => {
            const list = gifts.filter((g) => g.year === y);
            return (
              <div key={y}>
                <div className="group-label">{y} · {list.filter((g) => g.status === "sent").length} of {list.length} sent · {money(list.reduce((s, g) => s + Number(g.cost ?? 0), 0))}</div>
                {list.length ? (
                  <table>
                    <tbody>
                      {list.map((g) => (
                        <tr key={g.id}>
                          <td>
                            <Modal label={<span className="rowtitle"><strong>{g.recipient}</strong></span>} title={g.recipient} className="rowbtn" ariaLabel={`Edit gift for ${g.recipient}`}>
                              <RowForm table="gifts" id={g.id} what="this gift"><GiftFields gift={g} year={year} /></RowForm>
                            </Modal>
                            <div className="tiny muted">{[g.company, g.gift].filter(Boolean).join(" · ")}</div>
                          </td>
                          <td><span className={`chip${g.status === "sent" ? " leaf" : g.status === "ordered" ? " sun" : ""}`}>{label(g.status)}</span></td>
                          <td className="num">{money(g.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="small muted">No gifts planned for {y} yet.</p>}
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}
