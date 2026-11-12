import "server-only";
import { isPrivate } from "./privacy";
import { getProjects, getSettings, getTz, rows } from "./data";
import { burn, pipeline, projection, runway } from "./finance";
import { today } from "./format";
import type { QboSnapshot } from "./qbo";
import type { Overhead } from "./types";

/** Everything the Finance page and the dashboard tile need, from QuickBooks (or the manual cash figure) plus projects and overhead. */
export async function financeSummary() {
  const [settings, projects, overhead, tz] = await Promise.all([getSettings(), getProjects(), rows<Overhead>("overhead", "monthly", false), getTz()]);
  const qbo = (settings.qbo_snapshot as QboSnapshot | undefined) ?? null;
  const manualCash = typeof settings.cash_on_hand === "number" ? settings.cash_on_hand : null;
  const cash = qbo ? qbo.cash : manualCash;
  const receivables = qbo?.receivables ?? 0;
  const b = burn(overhead);
  const pipe = pipeline(projects);
  const series = projection({ cash: cash ?? 0, receivables, monthlyBurn: b.total, pipe, thisMonth: today(tz).slice(0, 7) });
  const booked = pipe.filter((p) => p.booked).reduce((s, p) => s + p.remaining, 0);
  const pitched = pipe.filter((p) => !p.booked).reduce((s, p) => s + p.weighted, 0);
  const known = cash != null && b.total > 0;
  return {
    qbo, manualCash, cash, receivables, burn: b, overhead, pipe, series, booked, pitched, known,
    // Simple runway: what's in hand or owed, divided by monthly overhead.
    monthsCashOnly: known ? cash! / b.total : null,
    monthsBooked: known ? (cash! + receivables + booked) / b.total : null,
    monthsWithPitches: known ? (cash! + receivables + booked + pitched) / b.total : null,
    outBooked: runway(series.map((m) => m.booked)),
    outWithPitches: runway(series.map((m) => m.withPitches)),
  };
}
export const months = (n: number | null) => (isPrivate() ? "••" : n == null ? "—" : n >= 24 ? "24+" : n.toFixed(1));
