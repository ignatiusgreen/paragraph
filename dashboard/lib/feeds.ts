import "server-only";

export const DEFAULT_FEEDS = [
  "https://deadline.com/feed/",
  "https://variety.com/feed/",
  "https://www.indiewire.com/feed/",
  "https://www.hollywoodreporter.com/feed/",
  "https://filmmakermagazine.com/feed/",
];
export type Article = { title: string; url: string; source: string; date: string | null };

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'").trim();
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? "";

async function readFeed(url: string): Promise<Article[]> {
  const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) return [];
  const xml = await res.text();
  const source = decode(tag(xml.split(/<item|<entry/i)[0], "title")) || new URL(url).hostname.replace(/^www\./, "");
  return (xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? []).slice(0, 8).map((item) => {
    const link = decode(tag(item, "link")) || item.match(/<link[^>]*href="([^"]+)"/i)?.[1] || "";
    const d = new Date(decode(tag(item, "pubDate") || tag(item, "published") || tag(item, "updated")));
    return { title: decode(tag(item, "title")), url: link, source, date: isNaN(+d) ? null : d.toISOString() };
  }).filter((a) => a.title && a.url);
}

/** Latest film-industry headlines across the configured feeds. */
export async function getNews(feeds: string[] = DEFAULT_FEEDS, limit = 8): Promise<Article[]> {
  const lists = await Promise.all(feeds.map((f) => readFeed(f).catch(() => [])));
  // Newest first, but no outlet takes more than a third of the panel.
  const all = lists.flat().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const per = new Map<string, number>();
  const cap = Math.max(2, Math.ceil(limit / 3));
  return all.filter((a) => { const n = per.get(a.source) ?? 0; per.set(a.source, n + 1); return n < cap; }).slice(0, limit);
}
