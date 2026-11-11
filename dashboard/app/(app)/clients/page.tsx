import { Board, Card, Empty, F, NewProject, PageHead, RowForm } from "@/components/ui";
import { Modal, Submit } from "@/components/client";
import { syncQboNow } from "@/app/(app)/actions";
import { getClients, getProjects, getTodos } from "@/lib/data";
import { getQbo } from "@/lib/qbo";
import { money } from "@/lib/format";
import { STAGES } from "@/lib/types";

export default async function Clients() {
  const [projects, clients, todos, qbo] = await Promise.all([getProjects(), getClients(), getTodos(), getQbo()]);
  const mine = projects.filter((p) => p.kind === "client");
  const live = mine.filter((p) => p.stage !== "delivered");
  const sum = (k: "budget" | "hard_costs") => live.reduce((s, p) => s + Number(p[k] ?? 0), 0);
  return (
    <>
      <PageHead section="clients" title="Client projects" sub="Bidding through delivery, with budgets, hard costs and production documents.">
        <NewProject kind="client" clients={clients} />
      </PageHead>

      <div className="card pearl">
        <div className="tiles">
          <div className="tile"><span className="tile-label">Active</span><span className="tile-value">{live.length}</span><span className="tile-note">not yet delivered</span></div>
          <div className="tile"><span className="tile-label">Budgets</span><span className="tile-value">{money(sum("budget"), { compact: true })}</span><span className="tile-note">active projects</span></div>
          <div className="tile"><span className="tile-label">Hard costs</span><span className="tile-value">{money(sum("hard_costs"), { compact: true })}</span><span className="tile-note">estimated</span></div>
          <div className="tile"><span className="tile-label">Margin</span><span className="tile-value">{money(sum("budget") - sum("hard_costs"), { compact: true })}</span><span className="tile-note">budget less hard costs</span></div>
        </div>
      </div>

      <Board kind="client" stages={STAGES.client} projects={projects} clients={clients} todos={todos} />

      <Card title={`Clients · ${clients.length}`} actions={
        <>
          {qbo ? <form action={syncQboNow}><Submit className="btn ghost sm">Sync from QuickBooks</Submit></form> : null}
          <Modal label="+ Client" title="New client" className="btn sm">
            <RowForm table="clients" submit="Add client">
              <F label="Name" name="name" required /><F label="Email" name="email" type="email" /><F label="Phone" name="phone" /><F label="Notes" name="notes" type="textarea" rows={2} />
            </RowForm>
          </Modal>
        </>
      }>
        {!qbo ? <p className="small muted">Connect QuickBooks in Settings to pull your customer list in automatically. Until then, add clients by hand.</p> : null}
        {clients.length ? (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Client</th><th>Contact</th><th>Projects</th><th>Source</th></tr></thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Modal label={<span className="rowtitle"><strong>{c.name}</strong></span>} title={c.name} className="rowbtn" ariaLabel={`Edit ${c.name}`}>
                        <RowForm table="clients" id={c.id} what="this client">
                          <F label="Name" name="name" defaultValue={c.name} required /><F label="Email" name="email" type="email" defaultValue={c.email} />
                          <F label="Phone" name="phone" defaultValue={c.phone} /><F label="Notes" name="notes" type="textarea" rows={2} defaultValue={c.notes} />
                        </RowForm>
                      </Modal>
                    </td>
                    <td className="muted">{[c.email, c.phone].filter(Boolean).join(" · ") || "—"}</td>
                    <td>{mine.filter((p) => p.client_id === c.id).map((p) => p.title).join(", ") || <span className="muted">—</span>}</td>
                    <td className="muted">{c.qbo_id ? "QuickBooks" : "Added here"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No clients yet.</Empty>}
      </Card>
    </>
  );
}
