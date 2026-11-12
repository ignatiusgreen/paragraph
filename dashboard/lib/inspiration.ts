import "server-only";
import { unstable_cache } from "next/cache";

export type Inspiration = { image: string; title: string; credit: string; url: string | null };
/** A place to pull images from. `weight` 3 = favour, 2 = normal, 1 = occasionally. */
export type Source = { label: string; url: string; weight: number };
export type SourceResult = { source: Source; items: Inspiration[]; error: string | null };

/** Kansas City first, then other museums with open collections, then film stills. Editable in Settings. */
/** Magazines and journals whose feeds carry an image with each story. Added to the built-in list at Normal weight. */
export const MAGAZINES: Source[] = [
  // Art + design
  { label: "Colossal", url: "https://www.thisiscolossal.com/feed/", weight: 2 },
  { label: "Hyperallergic", url: "https://hyperallergic.com/feed/", weight: 2 },
  { label: "ARTnews", url: "https://www.artnews.com/feed/", weight: 2 },
  { label: "Artnet News", url: "https://news.artnet.com/feed", weight: 2 },
  { label: "It's Nice That", url: "https://www.itsnicethat.com/?format=rss", weight: 2 },
  { label: "Juxtapoz", url: "https://www.juxtapoz.com/news/?format=feed&type=rss", weight: 2 },
  { label: "Booooooom", url: "https://www.booooooom.com/feed/", weight: 2 },
  { label: "Creative Boom", url: "https://www.creativeboom.com/feed/", weight: 2 },
  { label: "Designboom", url: "https://www.designboom.com/feed/", weight: 2 },
  { label: "Dezeen", url: "https://www.dezeen.com/feed/", weight: 2 },
  { label: "Aesthetica", url: "https://aestheticamagazine.com/feed/", weight: 2 },
  { label: "The Guardian — Art & design", url: "https://www.theguardian.com/artanddesign/rss", weight: 2 },
  { label: "The New York Times — Art & design", url: "https://rss.nytimes.com/services/xml/rss/nyt/ArtandDesign.xml", weight: 2 },
  // Photography
  { label: "Aperture", url: "https://aperture.org/feed/", weight: 2 },
  { label: "British Journal of Photography", url: "https://www.1854.photography/feed/", weight: 2 },
  { label: "Feature Shoot", url: "https://www.featureshoot.com/feed/", weight: 2 },
  { label: "The Guardian — Photography", url: "https://www.theguardian.com/artanddesign/photography/rss", weight: 2 },
  // Film
  { label: "Little White Lies", url: "https://lwlies.com/feed/", weight: 2 },
  { label: "Film Comment", url: "https://www.filmcomment.com/feed/", weight: 2 },
  { label: "Filmmaker Magazine", url: "https://filmmakermagazine.com/feed/", weight: 2 },
  { label: "The Film Stage", url: "https://thefilmstage.com/feed/", weight: 2 },
  { label: "MUBI Notebook", url: "https://mubi.com/en/notebook/posts.atom", weight: 2 },
  { label: "IndieWire", url: "https://www.indiewire.com/feed/", weight: 2 },
  { label: "The Guardian — Film", url: "https://www.theguardian.com/film/rss", weight: 2 },
  { label: "The New York Times — Movies", url: "https://rss.nytimes.com/services/xml/rss/nyt/Movies.xml", weight: 2 },
  // Fashion + culture
  { label: "Vogue", url: "https://www.vogue.com/feed/rss", weight: 2 },
  { label: "Dazed", url: "https://www.dazeddigital.com/rss", weight: 2 },
  { label: "AnOther Magazine", url: "https://www.anothermag.com/rss", weight: 2 },
  { label: "i-D", url: "https://i-d.co/feed/", weight: 2 },
  { label: "W Magazine", url: "https://www.wmagazine.com/rss", weight: 2 },
  { label: "Hypebeast", url: "https://hypebeast.com/feed", weight: 2 },
  { label: "Wallpaper*", url: "https://www.wallpaper.com/feeds.xml", weight: 2 },
  { label: "The Guardian — Fashion", url: "https://www.theguardian.com/fashion/rss", weight: 2 },
  { label: "The New York Times — Fashion", url: "https://rss.nytimes.com/services/xml/rss/nyt/FashionandStyle.xml", weight: 2 },
  { label: "The Paris Review", url: "https://www.theparisreview.org/blog/feed/", weight: 2 },
];

/** Kansas City first, then museums with open collections, film stills, and the magazines above. Editable in Settings. */
export const DEFAULT_SOURCES: Source[] = [
  { label: "Nelson-Atkins Museum of Art", url: "https://nelson-atkins.org/exhibitions/", weight: 3 },
  { label: "Kemper Museum of Contemporary Art", url: "https://www.kemperart.org/exhibitions", weight: 3 },
  { label: "Nerman Museum of Contemporary Art", url: "https://www.nermanmuseum.org/exhibitions/", weight: 3 },
  { label: "Art Institute of Chicago", url: "https://api.artic.edu/api/v1/exhibitions", weight: 2 },
  { label: "The Met", url: "https://collectionapi.metmuseum.org/public/collection/v1/search", weight: 2 },
  { label: "Cleveland Museum of Art", url: "https://openaccess-api.clevelandart.org/api/artworks/", weight: 2 },
  { label: "FILM-GRAB (film stills)", url: "https://film-grab.com/feed/", weight: 3 },
  ...MAGAZINES,
];

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15";
const rand = (n: number) => Math.floor(Math.random() * n);
const request = (url: string) =>
  fetch(url, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(5000), headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8", "accept-language": "en-US,en;q=0.9" } });
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

/** Film stills from TMDB (needs TMDB_API_KEY): this week's trending films plus a random page of the top-rated list. */
async function filmStills(): Promise<Inspiration[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [];
  const pages = await Promise.all([
    getJson(`https://api.themoviedb.org/3/trending/movie/week?api_key=${key}`).catch(() => ({ results: [] })),
    getJson(`https://api.themoviedb.org/3/movie/top_rated?api_key=${key}&page=${1 + rand(25)}`).catch(() => ({ results: [] })),
  ]);
  return pages.flatMap((j) => j.results ?? []).filter((m: any) => m.backdrop_path).map((m: any) => ({
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

/**
 * A web page or feed, remembered for an hour whether it worked or not. Without this, a site that is slow
 * or blocking us would be retried (and waited for) on every dashboard load.
 */
const cachedGeneric = (source: Source) =>
  unstable_cache(
    async (): Promise<{ items: Inspiration[]; error: string | null }> => {
      try {
        return { items: await generic(source), error: null };
      } catch (e) {
        return { items: [], error: explain(e) };
      }
    },
    ["inspiration-source-v1", source.url, source.label],
    { revalidate: 3600 },
  )();
const explain = (e: unknown) => {
  const msg = (e as Error).message ?? "";
  return /abort|timeout/i.test(msg) ? "Timed out" : /invalid url/i.test(msg) ? "Not a valid address" : /fetch failed/i.test(msg) ? "Couldn't reach the site" : msg;
};

/** Fetch one source. Never throws: a failure comes back as `error`. */
export async function fetchSource(source: Source): Promise<SourceResult> {
  try {
    const host = new URL(source.url).hostname;
    // The museum APIs are quick and pick at random on each call; everything else goes through the hourly cache.
    if (host === "api.artic.edu") return { source, items: await artInstitute(source.label), error: null };
    if (host === "collectionapi.metmuseum.org") return { source, items: await met(source.label), error: null };
    if (host === "openaccess-api.clevelandart.org") return { source, items: await cleveland(source.label), error: null };
    return { source, ...(await cachedGeneric(source)) };
  } catch (e) {
    return { source, items: [], error: explain(e) };
  }
}

export function readSources(setting: unknown): Source[] {
  if (!Array.isArray(setting)) return DEFAULT_SOURCES;
  return (setting as Source[]).filter((s) => s && /^https?:\/\//.test(s.url ?? ""))
    .map((s) => ({ label: String(s.label || new URL(s.url).hostname.replace(/^www\./, "")), url: s.url, weight: [1, 2, 3].includes(Number(s.weight)) ? Number(s.weight) : 2 }));
}

export type SourceStatus = { label: string; url: string; weight: number; count: number; error: string | null; sample: string | null };

/**
 * A mixed set of images for the panel. Each round takes `weight` images from every source, so favoured
 * sources fill more of it, and no source may take more than its cap (Occasionally 2, Normal 4, Favor 6)
 * even when the others come back empty. Each source is shuffled first, so every load is a new selection.
 */
export async function getInspiration(
  sources: Source[],
  opts: { limit?: number; skip?: (image: string) => boolean } = {},
): Promise<{ items: Inspiration[]; status: SourceStatus[]; available: number }> {
  const { limit = 16, skip } = opts;
  const [results, stills] = await Promise.all([Promise.all(sources.map(fetchSource)), filmStills().catch(() => [])]);
  // `skip` leaves out images already shown today. Sources of equal weight go in a random order each time.
  const fresh = (items: Inspiration[]) => shuffle(skip ? items.filter((i) => !skip(i.image)) : items);
  const lists = [
    ...shuffle(results).map((r) => ({ weight: r.source.weight, items: fresh(r.items), taken: 0 })),
    ...(stills.length ? [{ weight: 2, items: fresh(stills), taken: 0 }] : []),
  ].filter((l) => l.items.length).sort((a, b) => b.weight - a.weight);
  const available = lists.reduce((n, l) => n + l.items.length, 0);
  const out: Inspiration[] = [];
  const seen = new Set<string>();
  const open = () => lists.filter((l) => l.items.length && l.taken < l.weight * 2);
  while (out.length < limit && open().length) {
    for (const l of open()) {
      for (const item of l.items.splice(0, Math.min(l.weight, l.weight * 2 - l.taken))) {
        if (out.length < limit && !seen.has(item.image)) { seen.add(item.image); out.push(item); l.taken++; }
      }
    }
  }
  const status = results.map((r) => ({
    label: r.source.label, url: r.source.url, weight: r.source.weight, count: r.items.length, error: r.error, sample: r.items[0]?.image ?? null,
  }));
  return { items: out, status, available };
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
