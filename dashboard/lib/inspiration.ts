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

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15";
const rand = (n: number) => Math.floor(Math.random() * n);
const request = (url: string) =>
  fetch(url, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(7000), headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8", "accept-language": "en-US,en;q=0.9" } });
const getJson = async (url: string) => {
  const res = await request(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ---------------- Museums with open APIs ----------------
/** Art Institute of Chicago: exhibitions on view now, plus a random page of artworks from the collection. */
async function artInstitute(credit: string): Promise<Inspiration[]> {
  const now = Date.now();
  const [shows, works] = await Promise.all([
    getJson("https://api.artic.edu/api/v1/exhibitions?limit=40&fields=id,title,image_url,web_url,aic_start_at,aic_end_at").catch(() => ({ data: [] })),
    getJson(`https://api.artic.edu/api/v1/artworks?page=${1 + rand(40)}&limit=24&fields=id,title,image_id,artist_title`).catch(() => ({ data: [] })),
  ]);
  return [
    ...(shows.data ?? [])
      .filter((e: any) => e.image_url && (!e.aic_start_at || +new Date(e.aic_start_at) <= now) && (!e.aic_end_at || +new Date(e.aic_end_at) >= now))
      .map((e: any) => ({ image: e.image_url, title: e.title, credit: `${credit} · on view`, url: e.web_url ?? null })),
    ...(works.data ?? []).filter((w: any) => w.image_id).map((w: any) => ({
      image: `https://www.artic.edu/iiif/2/${w.image_id}/full/843,/0/default.jpg`, title: w.title,
      credit: [w.artist_title, credit].filter(Boolean).join(" · "), url: `https://www.artic.edu/artworks/${w.id}`,
    })),
  ];
}

/** Highlights currently on view at The Met: a different random handful on every load. */
async function met(credit: string): Promise<Inspiration[]> {
  const j = await getJson("https://collectionapi.metmuseum.org/public/collection/v1/search?isHighlight=true&isOnView=true&hasImages=true&q=*");
  const ids: number[] = j.objectIDs ?? [];
  if (!ids.length) return [];
  const pick = [...new Set(Array.from({ length: 10 }, () => ids[rand(ids.length)]))];
  const objs = await Promise.all(pick.map((id) => getJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`).catch(() => null)));
  return objs.filter((o) => o?.primaryImageSmall).map((o) => ({
    image: o.primaryImageSmall, title: o.title, credit: [o.artistDisplayName, credit].filter(Boolean).join(" · "), url: o.objectURL ?? null,
  }));
}

/** Works on view at the Cleveland Museum of Art: a random page on every load. */
async function cleveland(credit: string): Promise<Inspiration[]> {
  const j = await getJson(`https://openaccess-api.clevelandart.org/api/artworks/?has_image=1&currently_on_view&limit=24&skip=${rand(40) * 24}`);
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

/** Image addresses that appear anywhere in a page's code (data blobs, CSS backgrounds), for sites that build their pages in the browser. */
function fromCode(html: string, base: string, credit: string): Inspiration[] {
  const text = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const out: Inspiration[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(/https?:\/\/[^\s"'<>()\\]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>()\\]*)?/gi)) {
    const image = m[0];
    if (JUNK.test(image) || /[-_/](?:\d{2,3})x(?:\d{2,3})\.|thumb|[?&]w=(?:\d{1,2}|1\d{2})(?:&|$)|social|share|og[-_]|apple-touch|sprite/i.test(image)) continue;
    // One entry per picture: sites list the same image at many sizes.
    const key = image.split("?")[0].replace(/[-_]\d{2,4}x\d{2,4}(?=\.\w+$)/, "").replace(/\/(?:w|h|c|q|f|fl|g|ar|dpr)_[^/]+(?=\/)/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ image, title: credit, credit, url: base });
    if (out.length >= 40) break;
  }
  return out;
}

/** WordPress sites expose their recent posts, with each post's main image, as JSON. */
async function fromWordPress(base: string, credit: string): Promise<Inspiration[]> {
  const j = await getJson(`${new URL(base).origin}/wp-json/wp/v2/posts?per_page=40&_embed=wp:featuredmedia`);
  if (!Array.isArray(j)) return [];
  return j.map((post: any) => {
    const media = post?._embedded?.["wp:featuredmedia"]?.[0];
    const image = media?.media_details?.sizes?.large?.source_url ?? media?.source_url ?? post?.jetpack_featured_media_url ?? "";
    return { image, title: short(decode(post?.title?.rendered ?? "")) || credit, credit, url: post?.link ?? base };
  }).filter((i: Inspiration) => i.image && !JUNK.test(i.image));
}

async function generic(src: Source): Promise<Inspiration[]> {
  const res = await request(src.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const head = text.slice(0, 600).toLowerCase();
  const feed = head.includes("<rss") || head.includes("<feed") || head.includes("<rdf");
  let items = feed ? fromFeed(text, src.url, src.label) : fromPage(text, src.url, src.label);
  const add = (more: Inspiration[]) => {
    const have = new Set(items.map((i) => i.image.split("?")[0]));
    items = [...items, ...more.filter((i) => !have.has(i.image.split("?")[0]))];
  };
  // Thin results: look for image addresses in the page's code, then try the site's WordPress post list.
  if (items.length < 8 && !feed) add(fromCode(text, src.url, src.label));
  if (items.length < 8) add(await fromWordPress(src.url, src.label).catch(() => []));
  return items.slice(0, 40);
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
 * sources fill more of it. Each source is shuffled first, so every page load shows a different selection.
 */
export async function getInspiration(sources: Source[], limit = 16): Promise<Inspiration[]> {
  const [results, stills] = await Promise.all([Promise.all(sources.map(fetchSource)), filmStills().catch(() => [])]);
  const lists = [
    ...results.filter((r) => r.items.length).sort((a, b) => b.source.weight - a.source.weight).map((r) => ({ weight: r.source.weight, items: shuffle(r.items) })),
    ...(stills.length ? [{ weight: 2, items: shuffle(stills) }] : []),
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
/** A fresh random order (Fisher–Yates), so the panel changes on every page load. */
export function shuffle<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
