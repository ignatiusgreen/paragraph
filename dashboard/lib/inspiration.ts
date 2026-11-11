import "server-only";

export type Inspiration = { image: string; title: string; credit: string; url: string | null };
const get = async (url: string) => {
  const res = await fetch(url, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
};

/** Exhibitions on view now at the Art Institute of Chicago (open API). */
async function artInstitute(): Promise<Inspiration[]> {
  const j = await get("https://api.artic.edu/api/v1/exhibitions?limit=40&fields=id,title,image_url,web_url,aic_start_at,aic_end_at");
  const now = Date.now();
  return (j.data ?? [])
    .filter((e: any) => e.image_url && (!e.aic_start_at || +new Date(e.aic_start_at) <= now) && (!e.aic_end_at || +new Date(e.aic_end_at) >= now))
    .slice(0, 6)
    .map((e: any) => ({ image: e.image_url, title: e.title, credit: "Art Institute of Chicago · on view", url: e.web_url ?? null }));
}

/** Highlights currently on view at The Met (open API); a different handful each day. */
async function met(): Promise<Inspiration[]> {
  const j = await get("https://collectionapi.metmuseum.org/public/collection/v1/search?isHighlight=true&isOnView=true&hasImages=true&q=*");
  const ids: number[] = j.objectIDs ?? [];
  if (!ids.length) return [];
  const day = Math.floor(Date.now() / 86400000);
  const pick = Array.from({ length: 5 }, (_, i) => ids[(day * 7919 + i * 104729) % ids.length]);
  const objs = await Promise.all(pick.map((id) => get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`).catch(() => null)));
  return objs.filter((o) => o?.primaryImageSmall).map((o) => ({
    image: o.primaryImageSmall, title: o.title, credit: [o.artistDisplayName, "The Met"].filter(Boolean).join(" · "), url: o.objectURL ?? null,
  }));
}

/** Stills from films trending this week (needs TMDB_API_KEY). */
async function filmStills(): Promise<Inspiration[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [];
  const j = await get(`https://api.themoviedb.org/3/trending/movie/week?api_key=${key}`);
  return (j.results ?? []).filter((m: any) => m.backdrop_path).slice(0, 6).map((m: any) => ({
    image: `https://image.tmdb.org/t/p/w780${m.backdrop_path}`, title: m.title, credit: "Film still · TMDB", url: `https://www.themoviedb.org/movie/${m.id}`,
  }));
}

export async function getInspiration(): Promise<Inspiration[]> {
  const [a, b, c] = await Promise.all([filmStills().catch(() => []), artInstitute().catch(() => []), met().catch(() => [])]);
  // Interleave the sources so the panel mixes film, exhibitions and artworks.
  const out: Inspiration[] = [];
  for (let i = 0; i < 6; i++) for (const list of [a, b, c]) if (list[i]) out.push(list[i]);
  return out;
}
