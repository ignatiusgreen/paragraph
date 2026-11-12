import "server-only";
import { adminDb } from "./supabase/admin";
import { appUrl, getIntegration, setIntegration, setSetting } from "./integrations";
import { openStored, seal, tokenKey } from "./qbo-crypto";

type QboAuth = { realm_id: string; refresh_token: string; access_token?: string; expires_at?: number };
export type QboSnapshot = {
  synced_at: string;
  cash: number;
  accounts: { name: string; balance: number }[];
  credit_cards: number;
  receivables: number;
  invoices: { customer: string; balance: number; due: string | null }[];
  months: { label: string; income: number; expenses: number }[];
};

export const qboConfigured = () => !!process.env.QBO_CLIENT_ID && !!process.env.QBO_CLIENT_SECRET;
const redirectUri = () => `${appUrl()}/api/qbo/callback`;
const apiBase = () => (process.env.QBO_ENV === "sandbox" ? "https://sandbox-quickbooks.api.intuit.com" : "https://quickbooks.api.intuit.com");

export function qboAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID!, redirect_uri: redirectUri(), response_type: "code", scope: "com.intuit.quickbooks.accounting", state,
  });
  return `https://appcenter.intuit.com/connect/oauth2?${p}`;
}

async function tokenRequest(body: Record<string, string>) {
  const basic = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams(body), cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error_description ?? json.error ?? "QuickBooks token request failed");
  return json as { access_token: string; refresh_token: string; expires_in: number };
}

export async function qboExchange(code: string, realmId: string) {
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri() });
  await saveQbo({ realm_id: realmId, refresh_token: t.refresh_token, access_token: t.access_token, expires_at: Date.now() + t.expires_in * 1000 });
}

/** Every write of the QuickBooks connection goes through here: both tokens are encrypted before they are stored. */
async function saveQbo(auth: QboAuth) {
  await setIntegration("qbo", {
    ...auth,
    refresh_token: seal(auth.refresh_token, "refresh_token"),
    access_token: auth.access_token ? seal(auth.access_token, "access_token") : undefined,
  });
}

/**
 * The stored QuickBooks connection with its tokens decrypted, or null when not connected.
 * Throws if QBO_TOKEN_KEY is missing or a stored token can't be decrypted. Tokens saved before encryption
 * was added (no enc:v1: prefix) are re-saved encrypted the first time they are read.
 */
export async function getQbo(): Promise<QboAuth | null> {
  if (!qboConfigured()) return null;
  const stored = await getIntegration<QboAuth>("qbo");
  if (!stored) return null;
  tokenKey(); // fail with a clear message before touching any token
  let legacy = false;
  const onLegacy = () => { legacy = true; };
  const auth: QboAuth = {
    ...stored,
    refresh_token: openStored(stored.refresh_token, "refresh_token", onLegacy),
    access_token: stored.access_token ? openStored(stored.access_token, "access_token", onLegacy) : undefined,
  };
  if (legacy) await saveQbo(auth);
  return auth;
}

const REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

/**
 * Disconnect QuickBooks: revoke the grant at Intuit (best effort), then delete the stored tokens and the
 * cached finance snapshot. The local deletion happens even if Intuit can't be reached.
 */
export async function disconnectQbo(): Promise<{ wasConnected: boolean; revoked: boolean }> {
  const stored = await getIntegration<QboAuth>("qbo");
  let revoked = false;
  if (stored?.refresh_token && qboConfigured()) {
    let token: string | null = null;
    try {
      token = openStored(stored.refresh_token, "refresh_token", () => {});
    } catch {
      console.warn("QuickBooks revoke skipped: the stored token could not be read");
    }
    if (token) {
      try {
        const basic = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString("base64");
        const res = await fetch(REVOKE_URL, {
          method: "POST",
          headers: { authorization: `Basic ${basic}`, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ token }), cache: "no-store", signal: AbortSignal.timeout(10_000),
        });
        // Status code only: never the token, the client secret or the response body.
        console.log(`QuickBooks revoke: HTTP ${res.status}`);
        revoked = res.ok;
      } catch {
        console.warn("QuickBooks revoke: request failed");
      }
    }
  }
  const sb = adminDb();
  const tokens = await sb.from("integrations").delete().eq("provider", "qbo");
  const snapshot = await sb.from("settings").delete().eq("key", "qbo_snapshot");
  if (tokens.error || snapshot.error) throw new Error("the stored QuickBooks data couldn't be deleted. Try again.");
  return { wasConnected: !!stored, revoked };
}

/** One line for the Settings page after a disconnect. */
export function disconnectMessage(r: { wasConnected: boolean; revoked: boolean }) {
  if (!r.wasConnected) return "QuickBooks was already disconnected. No stored QuickBooks data remains.";
  return r.revoked
    ? "QuickBooks disconnected: access was revoked at Intuit, and the stored tokens and cached figures were deleted."
    : "QuickBooks disconnected: the stored tokens and cached figures were deleted. Intuit didn't confirm the revocation, so also remove the app under Apps in QuickBooks.";
}

async function q<T = any>(path: string): Promise<T> {
  let auth = await getQbo();
  if (!auth) throw new Error("QuickBooks isn't connected");
  if (!auth.access_token || !auth.expires_at || auth.expires_at < Date.now() + 60_000) {
    const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: auth.refresh_token });
    auth = { ...auth, refresh_token: t.refresh_token, access_token: t.access_token, expires_at: Date.now() + t.expires_in * 1000 };
    await saveQbo(auth);
  }
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${apiBase()}/v3/company/${auth.realm_id}/${path}${sep}minorversion=75`, {
    headers: { authorization: `Bearer ${auth.access_token}`, accept: "application/json" }, cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.Fault?.Error?.[0]?.Detail ?? json?.Fault?.Error?.[0]?.Message ?? `QuickBooks API ${res.status}`);
  return json as T;
}
const query = <T = any>(sql: string) => q<{ QueryResponse: Record<string, T[]> }>(`query?query=${encodeURIComponent(sql)}`);

/** Total income and expenses per month from a Profit & Loss report. */
function parsePnl(report: any) {
  const cols: string[] = (report?.Columns?.Column ?? []).map((c: any) => c.ColTitle);
  const totals: Record<string, number[]> = {};
  const walk = (rows: any[]) => {
    for (const r of rows ?? []) {
      if (r.group && r.Summary?.ColData) totals[r.group] = r.Summary.ColData.map((c: any) => Number(c.value) || 0);
      if (r.Rows?.Row) walk(r.Rows.Row);
    }
  };
  walk(report?.Rows?.Row ?? []);
  const months: QboSnapshot["months"] = [];
  cols.forEach((label, i) => {
    if (i === 0 || /total/i.test(label)) return;
    const expenses = (totals.Expenses?.[i] ?? 0) + (totals.COGS?.[i] ?? 0) + (totals.OtherExpenses?.[i] ?? 0);
    months.push({ label, income: (totals.Income?.[i] ?? 0) + (totals.OtherIncome?.[i] ?? 0), expenses });
  });
  return months;
}

/** Pull customers into the client list and take a finance snapshot. */
export async function syncQbo(): Promise<{ clients: number } | null> {
  if (!(await getQbo())) return null;
  const sb = adminDb();
  const customers = (await query<any>("select * from Customer where Active = true maxresults 1000")).QueryResponse.Customer ?? [];
  for (const c of customers) {
    const row = { qbo_id: String(c.Id), name: c.DisplayName as string, email: c.PrimaryEmailAddr?.Address ?? null, phone: c.PrimaryPhone?.FreeFormNumber ?? null };
    await sb.from("clients").upsert(row, { onConflict: "qbo_id" });
  }
  const accounts = (await query<any>("select * from Account where AccountType in ('Bank','Credit Card') and Active = true")).QueryResponse.Account ?? [];
  const bank = accounts.filter((a) => a.AccountType === "Bank");
  const invoices = (await query<any>("select * from Invoice where Balance > '0' maxresults 500")).QueryResponse.Invoice ?? [];
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5, 1));
  let months: QboSnapshot["months"] = [];
  try {
    months = parsePnl(await q(`reports/ProfitAndLoss?start_date=${start.toISOString().slice(0, 10)}&end_date=${end.toISOString().slice(0, 10)}&summarize_column_by=Month`));
  } catch { /* report optional */ }
  const snapshot: QboSnapshot = {
    synced_at: new Date().toISOString(),
    cash: bank.reduce((s, a) => s + Number(a.CurrentBalance ?? 0), 0),
    accounts: bank.map((a) => ({ name: a.Name, balance: Number(a.CurrentBalance ?? 0) })),
    credit_cards: accounts.filter((a) => a.AccountType === "Credit Card").reduce((s, a) => s + Number(a.CurrentBalance ?? 0), 0),
    receivables: invoices.reduce((s, i) => s + Number(i.Balance ?? 0), 0),
    invoices: invoices.map((i) => ({ customer: i.CustomerRef?.name ?? "", balance: Number(i.Balance ?? 0), due: i.DueDate ?? null }))
      .sort((a, b) => b.balance - a.balance).slice(0, 25),
    months,
  };
  await setSetting("qbo_snapshot", snapshot);
  return { clients: customers.length };
}
