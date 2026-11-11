import { Card, PageHead } from "@/components/ui";
import { Submit, TokenForm } from "@/components/client";
import { disconnect, revokeAgentToken, saveSettings } from "@/app/(app)/actions";
import { adminDb } from "@/lib/supabase/admin";
import { getSettings, getTz } from "@/lib/data";
import { appUrl, hasServiceKey } from "@/lib/integrations";
import { getGoogle, googleConfigured } from "@/lib/google";
import { getQbo, qboConfigured } from "@/lib/qbo";
import { instagramConfigured, vimeoConfigured } from "@/lib/metrics";
import { DEFAULT_FEEDS } from "@/lib/feeds";
import type { QboSnapshot } from "@/lib/qbo";

const Status = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => <span className={`chip${ok ? " leaf" : ""}`}>{ok ? "✓ " : ""}{children}</span>;

export default async function Settings() {
  const [settings, google, qbo, tz] = await Promise.all([getSettings(), getGoogle(), getQbo(), getTz()]);
  const tokens = hasServiceKey() ? (await adminDb().from("agent_tokens").select("id,name,last_used_at,created_at").order("created_at")).data ?? [] : [];
  const feeds = Array.isArray(settings.feeds) && settings.feeds.length ? (settings.feeds as string[]) : DEFAULT_FEEDS;
  const snap = settings.qbo_snapshot as QboSnapshot | undefined;
  const url = appUrl();
  return (
    <>
      <PageHead section="settings" title="Settings" sub="Connections, AI access and the news sources on the dashboard." />
      {!hasServiceKey() ? <div className="notice warn">SUPABASE_SERVICE_ROLE_KEY isn’t set in Vercel yet, so connections and AI access can’t be saved. See SETUP.md.</div> : null}

      <div className="grid">
        <Card className="s6" title="Google Calendar + Docs" actions={<Status ok={!!google}>{google ? "Connected" : "Not connected"}</Status>}>
          <p className="small muted">To-dos and schedule sync with the Google Calendar of the account you connect, and the notebook is written to a Google Doc.</p>
          {google ? (
            <div className="row between">
              <span>{google.email ?? "Google account"}{google.last_pull ? <span className="muted small"> · last synced {new Date(google.last_pull).toLocaleString("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span> : null}</span>
              <form action={disconnect}><input type="hidden" name="provider" value="google" /><Submit className="btn ghost sm">Disconnect</Submit></form>
            </div>
          ) : googleConfigured() ? <div><a className="btn" href="/api/google/connect">Connect Google</a></div>
            : <p className="small">Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in Vercel first (SETUP.md, step 3).</p>}
        </Card>

        <Card className="s6" title="QuickBooks" actions={<Status ok={!!qbo}>{qbo ? "Connected" : "Not connected"}</Status>}>
          <p className="small muted">Pulls the client list, bank balances, open invoices and monthly profit &amp; loss. Read-only: nothing is written to QuickBooks.</p>
          {qbo ? (
            <div className="row between">
              <span className="small muted">{snap ? `Last synced ${new Date(snap.synced_at).toLocaleString("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Not synced yet"}</span>
              <form action={disconnect}><input type="hidden" name="provider" value="qbo" /><Submit className="btn ghost sm">Disconnect</Submit></form>
            </div>
          ) : qboConfigured() ? <div><a className="btn" href="/api/qbo/connect">Connect QuickBooks</a></div>
            : <p className="small">Add <code>QBO_CLIENT_ID</code> and <code>QBO_CLIENT_SECRET</code> in Vercel first (SETUP.md, step 4).</p>}
        </Card>

        <Card className="s12" tone="dark" title="AI access (INSTINCT AI)">
          <p className="small muted">Give an AI assistant a token and it can read the dashboard and add or change to-dos, schedule events, project stages and notes. Anything it adds to the schedule or with a deadline also goes to Google Calendar. Revoke a token to cut off access.</p>
          <div className="grid">
            <div className="s6 stack">
              <div className="eyebrow">Connect as an MCP server</div>
              <pre>{`URL:    ${url}/api/mcp\nHeader: Authorization: Bearer <token>`}</pre>
              <div className="eyebrow">Or plain REST</div>
              <pre>{`GET  ${url}/api/agent            (lists the tools)\nPOST ${url}/api/agent/add_todo\n     {"title": "Send treatment", "due_date": "2026-11-20", "urgent": true}`}</pre>
            </div>
            <div className="s6 stack">
              <TokenForm />
              {tokens.length ? (
                <table>
                  <thead><tr><th>Token</th><th>Last used</th><th /></tr></thead>
                  <tbody>
                    {tokens.map((t) => (
                      <tr key={t.id}>
                        <td>{t.name}</td>
                        <td className="muted">{t.last_used_at ? new Date(t.last_used_at).toLocaleString("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Never"}</td>
                        <td className="num"><form action={revokeAgentToken}><input type="hidden" name="id" value={t.id} /><Submit className="btn ghost sm">Revoke</Submit></form></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="small muted">No tokens yet.</p>}
            </div>
          </div>
        </Card>

        <Card className="s6" title="Dashboard">
          <form action={saveSettings} className="stack">
            <div className="field">
              <label htmlFor="tz">Time zone for the AI assistant and daily sync</label>
              <input id="tz" name="set:timezone" defaultValue={(settings.timezone as string) ?? tz} placeholder="America/Los_Angeles" />
              <span className="tiny muted">In the browser the dashboard follows your device’s time zone ({tz}).</span>
            </div>
            <div className="field">
              <label htmlFor="feeds">Industry news feeds (RSS, one per line)</label>
              <textarea id="feeds" name="set:feeds" rows={6} defaultValue={feeds.join("\n")} />
            </div>
            <div className="form-foot"><span /><Submit>Save</Submit></div>
          </form>
        </Card>

        <Card className="s6" title="Analytics + images">
          <div className="list">
            <div className="item"><div className="grow"><div className="rowtitle">Vimeo</div><div className="meta">Plays and followers, recorded daily</div></div><Status ok={vimeoConfigured()}>{vimeoConfigured() ? "Key set" : "Needs VIMEO_ACCESS_TOKEN"}</Status></div>
            <div className="item"><div className="grow"><div className="rowtitle">Instagram</div><div className="meta">Followers and posts, recorded daily</div></div><Status ok={instagramConfigured()}>{instagramConfigured() ? "Key set" : "Needs INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID"}</Status></div>
            <div className="item"><div className="grow"><div className="rowtitle">Film stills</div><div className="meta">Trending films on the inspiration panel (TMDB)</div></div><Status ok={!!process.env.TMDB_API_KEY}>{process.env.TMDB_API_KEY ? "Key set" : "Needs TMDB_API_KEY"}</Status></div>
            <div className="item"><div className="grow"><div className="rowtitle">Website + LinkedIn</div><div className="meta">Entered by hand under New biz dev</div></div><span className="chip">Manual</span></div>
          </div>
        </Card>
      </div>
    </>
  );
}
