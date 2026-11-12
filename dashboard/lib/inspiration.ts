import "server-only";

export type Inspiration = { image: string; title: string; credit: string; url: string | null };
/** A place to pull images from. `weight` 3 = favour, 2 = normal, 1 = occasionally. */
export type Source = { label: string; url: string; weight: number };
export type SourceResult = { source: Source; items: Inspiration[]; error: string | null };

/** Kansas City first, then other museums with open collections, then film stills. Editable in Settings. */
export const DEFAULT_SOURCES: Source[] = [
  { label: "Nelson-Atkins Museum of Art", url: "https://nelson-atkins.org/exhibitions/", weight: 3 },
  { label: "Kemper Museum of Contemporary Art", url: "https://www.kemperart.org/exhibitions", weight: 3 },
  { label: "Nerman Museum of Contemporary Art", url: "https://www.nermanmuseum.org/exhibitions/", weight: 3 },
  { label: "Art Institute of Chicago", url: "https://api.artic.edu/api/v1/exhibitions", weight: 2 },
  { label: "The Met", url: "https://collectionapi.metmuseum.org/public/collection/v1/search", weight: 2 },
  { label: "Cleveland Museum of Art", url: "https://openaccess-api.clevelandart.org/api/artworks/", weight: 2 },
  { label: "FILM-GRAB (film stills)", url: "https://film-grab.com/feed/", weight: 3 },
];

const UA = "Mozilla/5.0 (compatible; StudioDashboard/1.0; +image-panel)";
const request = (url: string) =>
  fetch(url, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(7000), headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8" } });
const getJson = async (url: string) => {
  const res = await request(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
const day = () => Math.floor(Date.now() / 86400000);

// ---------------- Museums with open APIs ----------------
/** Exhibitions on view now at the Art Institute of Chicago. */
async function artInstitute(credit: string): Promise<Inspiration[]> {
  const j = await getJson("https://api.artic.edu/api/v1/exhibitions?limit=40&fields=id,title,image_url,web_url,aic_start_at,aic_end_at");
  const now = Date.now();
  return (j.data ?? [])
    .filter((e: any) => e.image_url && (!e.aic_start_at || +new Date(e.aic_start_at) <= now) && (!e.aic_end_at || +new Date(e.aic_end_at) >= now))
    .map((e: any) => ({ image: e.image_url, title: e.title, credit: `${credit} · on view`, url: e.web_url ?? null }));
}

/** Highlights currently on view at The Met; a different handful each day. */
async function met(credit: string): Promise<Inspiration[]> {
  const j = await getJson("https://collectionapi.metmuseum.org/public/collection/v1/search?isHighlight=true&isOnView=true&hasImages=true&q=*");
  const ids: number[] = j.objectIDs ?? [];
  if (!ids.length) return [];
  const pick = Array.from({ length: 6 }, (_, i) => ids[(day() * 7919 + i * 104729) % ids.length]);
  const objs = await Promise.all(pick.map((id) => getJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`).catch(() => null)));
  return objs.filter((o) => o?.primaryImageSmall).map((o) => ({
    image: o.primaryImageSmall, title: o.title, credit: [o.artistDisplayName, credit].filter(Boolean).join(" · "), url: o.objectURL ?? null,
  }));
}

/** Works on view at the Cleveland Museum of Art; a different page each day. */
async function cleveland(credit: string): Promise<Inspiration[]> {
  const j = await getJson(`https://openaccess-api.clevelandart.org/api/artworks/?has_image=1&currently_on_view&limit=12&skip=${(day() % 40) * 12}`);
  return (j.data ?? []).filter((a: any) => a?.images?.web?.url).map((a: any) => ({
    image: a.images.web.url, title: a.title, credit: [a.creators?.[0]?.description?.split(" (")[0], credit].filter(Boolean).join(" · "), url: a.url ?? null,
  }));
}

/** Stills from films trending this week (needs TMDB_API_KEY). */
async function filmStills(): Promise<Inspiration[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [];
  const j = await getJson(`https://api.themoviedb.org/3/trending/movie/week?api_key=${key}`);
  return (j.results ?? []).filter((m: any) => m.backdrop_path).slice(0, 8).map((m: any) => ({
    image: `https://image.tmdb.org/t/p/w780${m.backdrop_path}`, title: m.title, credit: "Film still · TMDB", url: `https://www.themoviedb.org/movie/${m.id}`,
  }));
}

// ---------------- Any other web page or feed ----------------
const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;|&#039;|&rsquo;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"))?.slice(1).find((v) => v !== undefined) ?? "";
const JUNK = /logo|icon|sprite|avatar|placeholder|spinner|pixel|badge|favicon|gravatar|emoji|blank\.|spacer|\.svg(\?|$)|^data:/i;
const absolute = (u: string, base: string) => { try { return new URL(u.replace(/&amp;/g, "&"), base).href; } catch { return ""; } };
/** Largest candidate in a srcset. */
function fromSrcset(srcset: string) {
  const list = srcset.split(",").map((c) => c.trim().split(/\s+/)).filter((c) => c[0]).map(([u, d]) => ({ u, w: parseFloat(d ?? "") || 0 }));
  return list.sort((a, b) => b.w - a.w)[0]?.u ?? "";
}
const short = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

/** Images in an RSS or Atom feed: one per item. */
function fromFeed(xml: string, base: string, credit: string): Inspiration[] {
  const tag = (s: string, name: string) => s.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? "";
  return (xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? []).map((item) => {
    const media = item.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*>/gi)?.map((t) => attr(t, "url")).find((u) => u && !JUNK.test(u) && !/\.(mp3|mp4|m4a)(\?|$)/i.test(u));
    const body = (tag(item, "content:encoded") || tag(item, "description") || tag(item, "content")).replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
    const img = body.match(/<img\b[^>]*>/gi)?.map((t) => attr(t, "src") || fromSrcset(attr(t, "srcset"))).find((u) => u && !JUNK.test(u));
    const link = decode(tag(item, "link")) || attr(item.match(/<link\b[^>]*>/i)?.[0] ?? "", "href");
    const found = media || img;
    return { image: found ? absolute(found, base) : "", title: short(decode(tag(item, "title"))), credit, url: link ? absolute(link, base) : null };
  }).filter((i) => i.image);
}

/** Images on an ordinary web page: content images with their alt text (or the nearest heading) and the link around them. */
function fromPage(html: string, base: string, credit: string): Inspiration[] {
  const page = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript>|<\/noscript>|<!--[\s\S]*?-->/gi, " ");
  const out: Inspiration[] = [];
  const seen = new Set<string>();
  for (const m of page.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const raw = attr(tag, "data-src") || attr(tag, "data-lazy-src") || attr(tag, "data-original") || fromSrcset(attr(tag, "data-srcset") || attr(tag, "srcset")) || attr(tag, "src");
    if (!raw || JUNK.test(raw) || JUNK.test(attr(tag, "class"))) continue;
    const w = Number(attr(tag, "width")), h = Number(attr(tag, "height"));
    if ((w && w < 200) || (h && h < 120)) continue;
    const image = absolute(raw, base);
    const key = image.split("?")[0];
    if (!image || seen.has(key)) continue;
    seen.add(key);
    // The link the image sits inside, if any.
    const before = page.slice(Math.max(0, m.index! - 1500), m.index!);
    const open = before.lastIndexOf("<a "), close = before.lastIndexOf("</a>");
    const href = open > close ? attr(before.slice(open, before.indexOf(">", open) + 1), "href") : "";
    // Title: alt text, else the next heading, else the link text.
    const after = page.slice(m.index! + tag.length, m.index! + tag.length + 900);
    const heading = after.match(/<h[1-5][^>]*>([\s\S]*?)<\/h[1-5]>/i)?.[1] ?? "";
    const title = decode(attr(tag, "alt")) || decode(heading) || decode(after.split(/<\/a>/i)[0] ?? "");
    out.push({ image, title: short(title) || credit, credit, url: href && !href.startsWith("#") && !href.startsWith("javascript") ? absolute(href, base) : base });
  }
  if (!out.length) {
    const og = page.match(/<meta[^>]+property=["']og:image["'][^>]*>/i)?.[0];
    const image = og ? absolute(attr(og, "content"), base) : "";
    if (image) out.push({ image, title: decode(page.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || credit, credit, url: base });
  }
  return out;
}

async function generic(src: Source): Promise<Inspiration[]> {
  const res = await request(src.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const head = text.slice(0, 600).toLowerCase();
  const items = head.includes("<rss") || head.includes("<feed") || head.includes("<rdf") ? fromFeed(text, src.url, src.label) : fromPage(text, src.url, src.label);
  return items.slice(0, 24);
}

/** Fetch one source. Never throws: a failure comes back as `error`. */
export async function fetchSource(source: Source): Promise<SourceResult> {
  try {
    const host = new URL(source.url).hostname;
    const items =
      host === "api.artic.edu" ? await artInstitute(source.label)
      : host === "collectionapi.metmuseum.org" ? await met(source.label)
      : host === "openaccess-api.clevelandart.org" ? await cleveland(source.label)
      : await generic(source);
    return { source, items, error: null };
  } catch (e) {
    const msg = (e as Error).message;
    return { source, items: [], error: /abort|timeout/i.test(msg) ? "Timed out" : /invalid url/i.test(msg) ? "Not a valid address" : msg };
  }
}

export function readSources(setting: unknown): Source[] {
  if (!Array.isArray(setting)) return DEFAULT_SOURCES;
  return (setting as Source[]).filter((s) => s && /^https?:\/\//.test(s.url ?? ""))
    .map((s) => ({ label: String(s.label || new URL(s.url).hostname.replace(/^www\./, "")), url: s.url, weight: [1, 2, 3].includes(Number(s.weight)) ? Number(s.weight) : 2 }));
}

/**
 * A mixed set of images for the panel. Each round takes `weight` images from every source, so favoured
 * sources fill more of it; the starting point in each source moves on every day.
 */
export async function getInspiration(sources: Source[], limit = 16): Promise<Inspiration[]> {
  const [results, stills] = await Promise.all([Promise.all(sources.map(fetchSource)), filmStills().catch(() => [])]);
  const lists = [
    ...results.filter((r) => r.items.length).sort((a, b) => b.source.weight - a.source.weight).map((r) => ({ weight: r.source.weight, items: rotate(r.items) })),
    ...(stills.length ? [{ weight: 2, items: rotate(stills) }] : []),
  ];
  const out: Inspiration[] = [];
  const seen = new Set<string>();
  for (let round = 0; out.length < limit && lists.some((l) => l.items.length); round++) {
    for (const l of lists) {
      for (const item of l.items.splice(0, l.weight)) {
        if (out.length < limit && !seen.has(item.image)) { seen.add(item.image); out.push(item); }
      }
    }
  }
  return out;
}
function rotate<T>(items: T[]) {
  const k = items.length ? day() % items.length : 0;
  return [...items.slice(k), ...items.slice(0, k)];
}
