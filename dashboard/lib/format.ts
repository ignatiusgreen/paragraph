export const DEFAULT_TZ = "America/New_York";

export function money(v: number | string | null | undefined, opts: { cents?: boolean; compact?: boolean } = {}) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (opts.compact && Math.abs(n) >= 10000) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(n);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: opts.cents ? 2 : 0 }).format(n);
}
export const num = (v: number | string | null | undefined) => (v == null ? "—" : new Intl.NumberFormat("en-US").format(Number(v)));

/** Today's date (YYYY-MM-DD) in a time zone. */
export function today(tz: string = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function nowTime(tz: string = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}
const utc = (d: string) => new Date(d + "T00:00:00Z");
export function addDays(d: string, n: number) {
  const x = utc(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
export function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1 + n, 1));
  return x.toISOString().slice(0, 7);
}
export const weekday = (d: string) => utc(d).getUTCDay();
export function fmtDate(d: string | null | undefined, style: "short" | "long" | "weekday" | "month" = "short") {
  if (!d) return "";
  const o: Intl.DateTimeFormatOptions =
    style === "long" ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    : style === "weekday" ? { weekday: "short", month: "short", day: "numeric" }
    : style === "month" ? { month: "long", year: "numeric" }
    : { month: "short", day: "numeric" };
  return new Intl.DateTimeFormat("en-US", { ...o, timeZone: "UTC" }).format(utc(d.slice(0, 10).length === 7 ? d + "-01" : d.slice(0, 10)));
}
/** "14:30:00" → "2:30 PM" */
export function fmtTime(t: string | null | undefined) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 ? "AM" : "PM"}`;
}
/** Add minutes to "HH:MM", clamped to the same day. */
export function addMinutes(t: string, mins: number) {
  const [h, m] = t.split(":").map(Number);
  const total = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
/** Weeks (arrays of 7 dates) covering a month, Sunday first. */
export function monthGrid(ym: string) {
  const first = ym + "-01";
  let d = addDays(first, -weekday(first));
  const weeks: string[][] = [];
  do {
    const w: string[] = [];
    for (let i = 0; i < 7; i++) { w.push(d); d = addDays(d, 1); }
    weeks.push(w);
  } while (d.slice(0, 7) === ym);
  return weeks;
}
export function relDay(d: string, t: string) {
  if (d === t) return "Today";
  if (d === addDays(t, 1)) return "Tomorrow";
  if (d === addDays(t, -1)) return "Yesterday";
  return fmtDate(d, "weekday");
}
export const label = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
