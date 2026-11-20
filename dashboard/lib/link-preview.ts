import "server-only";

/** What a link looks like on a board: its poster or preview image and its title. */
export type LinkPreview = { kind: "image" | "link"; image: string | null; title: string | null };

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15";
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$)|\.(internal|local)$/i;
/** Only public web addresses may be fetched from the server. */
export const publicUrl = (u: URL) => /^https?:$/.test(u.protocol) && (!PRIVATE_HOST.test(u.hostname) || !!process.env.MOOD_ALLOW_LOCAL);
export const BROWSER_UA = UA;

const get = (url: string, accept: string, ms = 8000) => fetch(url, { cache: "no-store", signal: AbortSignal.timeout(ms), headers: { "user-agent": UA, accept, "accept-language": "en-US,en;q=0.9" } });
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"))?.slice(1).find((v) => v !== undefined) ?? "";
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&rsquo;/gi, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
const abs = (found: string, base: string) => { try { const u = new URL(found, base); return publicUrl(u) ? u.href : null; } catch { return null; } };

/** The id of a YouTube video, from any of the shapes its links take. */
export function youtubeId(url: URL): string | null {
  const h = url.hostname.replace(/^(www|m|music)\./, "");
  const ok = (id?: string | null) => (id && /^[\w-]{11}$/.test(id) ? id : null);
  if (h === "youtu.be") return ok(url.pathname.split("/")[1]);
  if (h !== "youtube.com" && h !== "youtube-nocookie.com") return null;
  return ok(url.searchParams.get("v")) ?? ok(url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/)?.[1]);
}

/** A service's own description of a link (oEmbed): title and poster image. */
async function oembed(endpoint: string): Promise<{ image: string | null; title: string | null }> {
  try {
    const res = await get(endpoint, "application/json", 6000);
    if (!res.ok) return { image: null, title: null };
    const j = (await res.json()) as { thumbnail_url?: string; title?: string; type?: string; url?: string };
    return { image: j.thumbnail_url || (j.type === "photo" ? j.url ?? null : null) || null, title: j.title?.trim() || null };
  } catch { return { image: null, title: null }; }
}

/** The first of these image addresses that actually answers with an image. */
async function firstImage(urls: string[]): Promise<string | null> {
  for (const u of urls) {
    try { const r = await get(u, "image/*", 6000); if (r.ok && (r.headers.get("content-type") ?? "").startsWith("image/")) return u; } catch { /* try the next */ }
  }
  return null;
}

/** Work out how to show a link: video sites give their poster frame, other pages their preview image. */
export async function linkPreview(url: URL): Promise<LinkPreview> {
  if (/\.(jpe?g|png|gif|webp|avif)$/i.test(url.pathname)) return { kind: "image", image: url.href, title: null };

  // YouTube: the poster frame lives at a fixed address; the title comes from YouTube's own link description.
  const yt = youtubeId(url);
  if (yt) {
    const [image, info] = await Promise.all([
      firstImage([`https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${yt}/sddefault.jpg`, `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`]),
      oembed(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${yt}`)}`),
    ]);
    return { kind: "link", image: image ?? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`, title: info.title };
  }
  if (/(^|\.)vimeo\.com$/.test(url.hostname)) {
    const info = await oembed(`https://vimeo.com/api/oembed.json?width=1280&url=${encodeURIComponent(url.href)}`);
    if (info.image) return { kind: "link", ...info };
  }

  let image: string | null = null, title: string | null = null;
  try {
    const res = await get(url.href, "text/html,image/*;q=0.9,*/*;q=0.8");
    const type = res.headers.get("content-type") ?? "";
    if (res.ok && type.startsWith("image/")) return { kind: "image", image: url.href, title: null };
    if (res.ok) {
      const html = (await res.text()).slice(0, 600_000);
      const meta = (prop: string) => {
        const tag = html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${prop}["'][^>]*>`, "i"))?.[0];
        return tag ? decode(attr(tag, "content")) : "";
      };
      const linkTag = (test: RegExp) => { const tag = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((t) => test.test(t)); return tag ? decode(attr(tag, "href")) : ""; };
      title = meta("og:title") || meta("twitter:title") || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || null;
      const found = meta("og:image") || meta("og:image:secure_url") || meta("og:image:url") || meta("twitter:image") || meta("twitter:image:src") || meta("image") || meta("thumbnailUrl")
        || linkTag(/rel=["']image_src["']/i)
        || decode(html.match(/"thumbnailUrl"\s*:\s*\[?\s*"([^"]+)"/)?.[1]?.replace(/\\\//g, "/") ?? "");
      if (found) image = abs(found, url.href);
      // Many sites publish a machine-readable description of the page (oEmbed) that names a poster image.
      if (!image) {
        const endpoint = linkTag(/type=["']application\/json\+oembed["']/i);
        const target = endpoint ? abs(endpoint, url.href) : null;
        if (target) { const info = await oembed(target); image = info.image ? abs(info.image, url.href) : null; title = title || info.title; }
      }
      // Last resort: the first sizeable picture on the page.
      if (!image) {
        const img = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]).find((t) => { const w = Number(attr(t, "width")); const src = attr(t, "src"); return src && !/^data:|\.svg(\?|$)|sprite|logo|icon|pixel|avatar/i.test(src) && (!w || w >= 300); });
        if (img) image = abs(decode(attr(img, "src")), url.href);
      }
    }
  } catch { /* the page couldn't be read: it stays a plain link card */ }
  return { kind: "link", image, title };
}
