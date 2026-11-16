import "server-only";
import { unstable_cache } from "next/cache";

/** An event or deadline pulled automatically from an organisation's website. */
export type FeedEvent = { title: string; date: string; end_date: string | null; url: string | null; org: string };
export type EventFeed = { org: string; url: string };
export type FeedResult = { feed: EventFeed; events: FeedEvent[]; error: string | null };

/** Sites whose public event listings are read automatically. */
export const EVENT_FEEDS: EventFeed[] = [
  { org: "Wedgwood Circle", url: "https://www.wedgwoodcircle.com/events" },
  { org: "Wedgwood Circle", url: "https://www.wedgwoodcircle.com/" },
];

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15";
const get = (url: string) => fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000), headers: { "user-agent": UA, accept: "text/html,application/json;q=0.9,*/*;q=0.8" } });
const day = (v: unknown): string | null => {
  if (v == null || v === "") return null;
  const d = typeof v === "number" ? new Date(v) : new Date(String(v));
  return isNaN(+d) ? null : (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : d.toISOString().slice(0, 10));
};
const clean = (s: unknown) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const absolute = (u: unknown, base: string) => { try { return u ? new URL(String(u), base).href : null; } catch { return null; } };

/** Events described in a page's structured data (schema.org "Event"), which most event platforms publish. */
function fromStructuredData(html: string, feed: EventFeed): FeedEvent[] {
  const out: FeedEvent[] = [];
  const visit = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    const types = ([] as string[]).concat(node["@type"] ?? []);
    if (types.some((t) => /Event$/.test(t)) && node.name && node.startDate) {
      const date = day(node.startDate);
      if (date) out.push({ title: clean(node.name), date, end_date: day(node.endDate), url: absolute(node.url, feed.url) ?? feed.url, org: feed.org });
    }
    Object.values(node).forEach(visit);
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(m[1])); } catch { /* not valid JSON: skip this block */ }
  }
  return out;
}

/** Squarespace sites (and a few others) return a page's events as JSON when asked with ?format=json. */
function fromCollectionJson(json: any, feed: EventFeed): FeedEvent[] {
  const items: any[] = [...(json?.upcoming ?? []), ...(json?.items ?? [])];
  return items.filter((i) => i?.title && i?.startDate).map((i) => ({
    title: clean(i.title), date: day(i.startDate)!, end_date: day(i.endDate), url: absolute(i.fullUrl, feed.url) ?? feed.url, org: feed.org,
  })).filter((e) => e.date);
}

async function readFeed(feed: EventFeed): Promise<FeedResult> {
  try {
    const res = await get(feed.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let events = fromStructuredData(await res.text(), feed);
    if (!events.length) {
      const alt = await get(feed.url + (feed.url.includes("?") ? "&" : "?") + "format=json").catch(() => null);
      if (alt?.ok) events = fromCollectionJson(await alt.json().catch(() => null), feed);
    }
    return { feed, events, error: null };
  } catch (e) {
    const msg = (e as Error).message ?? "";
    return { feed, events: [], error: /abort|timeout/i.test(msg) ? "Timed out" : /fetch failed/i.test(msg) ? "Couldn't reach the site" : msg };
  }
}

/** Events from the automatic feeds, remembered for an hour (whether they worked or not). */
export const getFeedEvents = unstable_cache(
  async (): Promise<FeedResult[]> => Promise.all(EVENT_FEEDS.map(readFeed)),
  ["industry-event-feeds-v1"],
  { revalidate: 3600 },
);
