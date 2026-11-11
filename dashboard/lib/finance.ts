import { addMonths } from "./format";
import type { Overhead, Project } from "./types";

export type Pipeline = { project: Project; booked: boolean; net: number; remaining: number; probability: number; weighted: number };

/** Default odds for work that isn't booked yet. */
const DEFAULT_ODDS: Record<string, number> = { bidding: 50, pitching_finance: 25, pitch_dev: 10 };
const BOOKED = new Set(["in_production", "post_production", "finishing", "delivered", "prep", "shooting", "post"]);

/** What each project with a budget is still expected to bring in, net of hard costs. */
export function pipeline(projects: Project[]): Pipeline[] {
  return projects.filter((p) => Number(p.budget) > 0).map((p) => {
    const budget = Number(p.budget), costs = Number(p.hard_costs ?? 0), invoiced = Math.min(Number(p.invoiced ?? 0), budget);
    const booked = BOOKED.has(p.stage);
    const net = budget - costs;
    // Invoiced money is already cash or a receivable, so only the un-invoiced share counts here.
    const remaining = net * (1 - invoiced / budget);
    const probability = booked ? 100 : p.probability ?? DEFAULT_ODDS[p.stage] ?? 0;
    return { project: p, booked, net, remaining, probability, weighted: remaining * (probability / 100) };
  }).filter((x) => x.remaining > 0);
}

export function burn(overhead: Overhead[]) {
  const salary = overhead.filter((o) => o.category === "salary").reduce((s, o) => s + Number(o.monthly), 0);
  const opex = overhead.filter((o) => o.category === "opex").reduce((s, o) => s + Number(o.monthly), 0);
  return { salary, opex, total: salary + opex };
}

export type ProjectionMonth = { month: string; booked: number; withPitches: number; inBooked: number; inPitches: number };

/** Month-end cash for the coming months: booked work only, and with pitches weighted by their odds. */
export function projection(opts: { cash: number; receivables: number; monthlyBurn: number; pipe: Pipeline[]; thisMonth: string; months?: number }): ProjectionMonth[] {
  const { cash, receivables, monthlyBurn, pipe, thisMonth, months = 12 } = opts;
  const out: ProjectionMonth[] = [];
  let a = cash, b = cash;
  for (let i = 0; i < months; i++) {
    const month = addMonths(thisMonth, i);
    // Money with no expected date, or one already past, is assumed to land next month.
    const lands = (p: Pipeline) => {
      const m = p.project.expected_on?.slice(0, 7);
      return (!m || m < thisMonth ? addMonths(thisMonth, 1) : m) === month;
    };
    const inBooked = pipe.filter((p) => p.booked && lands(p)).reduce((s, p) => s + p.remaining, 0) + (i === 1 ? receivables : 0);
    const inPitches = pipe.filter((p) => !p.booked && lands(p)).reduce((s, p) => s + p.weighted, 0);
    a += inBooked - monthlyBurn;
    b += inBooked + inPitches - monthlyBurn;
    out.push({ month, booked: a, withPitches: b, inBooked, inPitches });
  }
  return out;
}

/** Months until the balance first goes negative (null = beyond the window). */
export function runway(series: number[]) {
  const i = series.findIndex((v) => v < 0);
  return i === -1 ? null : i;
}
