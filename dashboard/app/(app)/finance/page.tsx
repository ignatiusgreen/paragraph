import Link from "next/link";
import { loadPrivacy } from "@/lib/privacy";
import { Card, Empty, F, PageHead, RowForm } from "@/components/ui";
import { Modal, Submit } from "@/components/client";
import { LineChart } from "@/components/charts";
import { saveSettings, syncQboNow } from "@/app/(app)/actions";
import { financeSummary, months } from "@/lib/finance-data";
import { qboConfigured } from "@/lib/qbo";
import { fmtDate, money } from "@/lib/format";
import { KIND_LABEL, KIND_PATH, stageLabel, type Overhead } from "@/lib/types";

const CATS = [{ value: "salary", label: "Salary" }, { value: "opex", label: "Operating expense" }];

function OverheadTable({ title, items, total }: { title: string; items: Overhead[]; total: number }) {
  return (
    <Card title={title} className="s6" actions={<span className="mid">{money(total)}<span className="small muted"> / mo</span></span>}>
      {items.length ? (
        <table>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td>
                  <Modal label={<span className="rowtitle">{o.name}</span>} title="Edit overhead" className="rowbtn" ariaLabel={`Edit ${o.name}`}>
                    <RowForm table="overhead" id={o.id} what="this line">
                      <F label="Name" name="name" defaultValue={o.name} required /><F label="Type" name="category" options={CATS} defaultValue={o.category} />
                      <F label="Monthly amount" name="monthly" type="number" defaultValue={o.monthly} required /><F label="Notes" name="notes" defaultValue={o.notes} />
                    </RowForm>
                  </Modal>
                  {o.notes ? <div className="tiny muted">{o.notes}</div> : null}
                </td>
                <td className="num">{money(o.monthly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <Empty>Nothing listed yet.</Empty>}
    </Card>
  );
}

export default async function Finance() {
  const hidden = await loadPrivacy();
  const f = await financeSummary();
  const outLabel = (i: number | null) => (i == null ? "Positive through the next 12 months" : `Runs out in ${fmtDate(f.series[i].month, "month")}`);
  return (
    <>
      <PageHead section="finance" title="Finance" sub="Cash, overhead, projected revenue and how many months the studio can run.">
        {f.qbo ? <form action={syncQboNow}><Submit className="btn ghost">Sync QuickBooks</Submit></form> : null}
        <Modal label="+ Overhead" title="New overhead line">
          <RowForm table="overhead" submit="Add">
            <F label="Name" name="name" required placeholder="e.g. Studio rent" /><F label="Type" name="category" options={CATS} />
            <F label="Monthly amount" name="monthly" type="number" required /><F label="Notes" name="notes" />
          </RowForm>
        </Modal>
      </PageHead>

      {!f.qbo ? (
        <div className="notice">
          <span className="grow">{qboConfigured()
            ? <>QuickBooks isn’t connected yet. <Link href="/settings">Connect it in Settings</Link> to pull bank balances, receivables and profit &amp; loss. Until then, enter cash by hand.</>
            : <>QuickBooks keys aren’t set up yet (see Settings), so cash is entered by hand for now.</>}</span>
        </div>
      ) : null}

      <div className="grid stretch">
        <Card tone="dark" className="s4" title="Current cash flow">
          <div>
            <div className="big">{money(f.cash, { compact: true })}</div>
            <div className="small muted" style={{ marginTop: 8 }}>
              {f.qbo ? `Bank balances from QuickBooks · synced ${new Date(f.qbo.synced_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : f.cash == null ? "No cash figure yet" : "Cash on hand, entered by hand"}
            </div>
          </div>
          {f.qbo ? (
            <table>
              <tbody>
                {f.qbo.accounts.map((a) => <tr key={a.name}><td>{a.name}</td><td className="num">{money(a.balance)}</td></tr>)}
                <tr><td>Receivables (open invoices)</td><td className="num">{money(f.receivables)}</td></tr>
                {f.qbo.credit_cards ? <tr><td>Credit cards owed</td><td className="num">{money(f.qbo.credit_cards)}</td></tr> : null}
              </tbody>
            </table>
          ) : (
            <form action={saveSettings} className="quick">
              <div className="field wide"><label htmlFor="cash">Cash on hand</label><input id="cash" name="set:cash_on_hand" inputMode="decimal" defaultValue={hidden ? "" : f.manualCash ?? ""} disabled={hidden} placeholder="0" /></div>
              <Submit>Save</Submit>
            </form>
          )}
        </Card>

        <Card tone="sun" className="s4" title="Burn rate">
          <div>
            <div className="big">{money(f.burn.total, { compact: true })}<small>/ month</small></div>
            <div className="small" style={{ marginTop: 8 }}>Salary {money(f.burn.salary)} · Op ex {money(f.burn.opex)}</div>
          </div>
          {f.qbo?.months.length ? (
            <p className="small">QuickBooks shows average expenses of {money(f.qbo.months.reduce((s, m) => s + m.expenses, 0) / f.qbo.months.length)} a month over the last {f.qbo.months.length} months.</p>
          ) : null}
        </Card>

        <Card tone="teal" className="s4" title="Runway">
          <div>
            <div className="big">{months(f.monthsBooked)}<small>months</small></div>
            <div className="small muted" style={{ marginTop: 8 }}>Cash + receivables + booked work not yet invoiced, at the current burn.</div>
          </div>
          <div className="tiles">
            <div className="tile"><span className="tile-label">Cash only</span><span className="tile-value">{months(f.monthsCashOnly)}</span><span className="tile-note">months</span></div>
            <div className="tile"><span className="tile-label">With pitches</span><span className="tile-value">{months(f.monthsWithPitches)}</span><span className="tile-note">months, weighted</span></div>
          </div>
        </Card>

        <Card className="s12" title="Cash projection, next 12 months">
          {hidden ? <Empty>Hidden while private mode is on. Click the eye in the top bar to show financial data.</Empty> : f.known ? (
            <>
              <LineChart label="Projected month-end cash for the next 12 months" months={f.series.map((m) => m.month + "-01")}
                series={[
                  { name: "Booked only", color: "#00919b", values: f.series.map((m) => m.booked) },
                  { name: "With pitches", color: "#c47e10", values: f.series.map((m) => m.withPitches), dashed: true },
                ]} />
              <div className="legend">
                <span><i style={{ background: "#00919b" }} />Booked only: {outLabel(f.outBooked)}</span>
                <span><i style={{ background: "#c47e10" }} />With pitches (weighted by odds): {outLabel(f.outWithPitches)}</span>
              </div>
              <details>
                <summary className="small">Show as a table</summary>
                <div className="tablewrap" style={{ marginTop: 10 }}>
                  <table>
                    <thead><tr><th>Month</th><th className="num">Booked money in</th><th className="num">Pitched money in</th><th className="num">Overhead</th><th className="num">Cash, booked only</th><th className="num">Cash, with pitches</th></tr></thead>
                    <tbody>
                      {f.series.map((m) => (
                        <tr key={m.month}><td>{fmtDate(m.month, "month")}</td><td className="num">{money(m.inBooked)}</td><td className="num">{money(m.inPitches)}</td><td className="num">{money(-f.burn.total)}</td><td className="num">{money(m.booked)}</td><td className="num">{money(m.withPitches)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <p className="tiny muted">Each month: cash, plus money expected that month, minus overhead. Receivables are assumed to arrive next month; a project with no “money expected by” date is too.</p>
            </>
          ) : <Empty>Enter a cash figure and at least one overhead line to see the projection.</Empty>}
        </Card>

        <OverheadTable title="Overhead — salary" items={f.overhead.filter((o) => o.category === "salary")} total={f.burn.salary} />
        <OverheadTable title="Overhead — op ex" items={f.overhead.filter((o) => o.category === "opex")} total={f.burn.opex} />

        <Card className="s12" title="Projected revenue">
          {f.pipe.length ? (
            <div className="tablewrap">
              <table>
                <thead><tr><th>Project</th><th>Stage</th><th>Expected</th><th className="num">Budget</th><th className="num">Hard costs</th><th className="num">Still to come, net</th><th className="num">Odds</th><th className="num">Counted</th></tr></thead>
                <tbody>
                  {[...f.pipe].sort((a, b) => Number(b.booked) - Number(a.booked) || b.weighted - a.weighted).map((p) => (
                    <tr key={p.project.id}>
                      <td><Link href={KIND_PATH[p.project.kind]}><strong>{p.project.title}</strong></Link><div className="tiny muted">{KIND_LABEL[p.project.kind]}</div></td>
                      <td><span className={`chip${p.booked ? " leaf" : " sun"}`}>{p.booked ? "Booked" : "Pitched"}</span> <span className="small muted">{stageLabel(p.project.kind, p.project.stage)}</span></td>
                      <td>{p.project.expected_on ? fmtDate(p.project.expected_on.slice(0, 7), "month") : <span className="muted">Not set</span>}</td>
                      <td className="num">{money(p.project.budget)}</td>
                      <td className="num">{money(p.project.hard_costs ?? 0)}</td>
                      <td className="num">{money(p.remaining)}</td>
                      <td className="num">{hidden ? "••" : `${p.probability}%`}</td>
                      <td className="num"><strong>{money(p.weighted)}</strong></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={7}>Booked, not yet invoiced</td><td className="num">{money(f.booked)}</td></tr>
                  <tr><td colSpan={7}>Pitched, weighted by odds</td><td className="num">{money(f.pitched)}</td></tr>
                </tfoot>
              </table>
            </div>
          ) : <Empty>Projects with a budget show up here. Add budgets on the Client, Documentary and Narrative pages.</Empty>}
          <p className="tiny muted">Booked means past bidding or pitching. Pitched work counts at its odds of landing (set on the project; bids default to 50%, pitches in finance to 25%). Amounts already invoiced are left out because they are in cash or receivables.</p>
        </Card>

        {f.qbo?.months.length ? (
          <Card className="s6" title="Profit + loss by month (QuickBooks)">
            <table>
              <thead><tr><th>Month</th><th className="num">Income</th><th className="num">Expenses</th><th className="num">Net</th></tr></thead>
              <tbody>{f.qbo.months.map((m) => <tr key={m.label}><td>{m.label}</td><td className="num">{money(m.income)}</td><td className="num">{money(m.expenses)}</td><td className="num">{money(m.income - m.expenses)}</td></tr>)}</tbody>
            </table>
          </Card>
        ) : null}
        {f.qbo?.invoices.length ? (
          <Card className="s6" title="Open invoices (QuickBooks)">
            <table>
              <thead><tr><th>Client</th><th>Due</th><th className="num">Balance</th></tr></thead>
              <tbody>{f.qbo.invoices.slice(0, 12).map((i, n) => <tr key={n}><td>{i.customer}</td><td>{i.due ? fmtDate(i.due) : "—"}</td><td className="num">{money(i.balance)}</td></tr>)}</tbody>
            </table>
          </Card>
        ) : null}
      </div>
    </>
  );
}
