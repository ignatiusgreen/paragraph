import "server-only";
import { adminDb } from "./supabase/admin";

export const vimeoConfigured = () => !!process.env.VIMEO_ACCESS_TOKEN;
export const instagramConfigured = () => !!process.env.INSTAGRAM_ACCESS_TOKEN && !!process.env.INSTAGRAM_USER_ID;

/** Record today's numbers for the channels that have API keys. */
export async function snapshotMetrics() {
  const rows: { channel: string; metric: string; value: number }[] = [];
  if (vimeoConfigured()) {
    try {
      const h = { authorization: `Bearer ${process.env.VIMEO_ACCESS_TOKEN}` };
      const me = await (await fetch("https://api.vimeo.com/me?fields=metadata.connections.followers.total,metadata.connections.videos.total", { headers: h, cache: "no-store" })).json();
      rows.push({ channel: "vimeo", metric: "followers", value: me?.metadata?.connections?.followers?.total ?? 0 });
      rows.push({ channel: "vimeo", metric: "videos", value: me?.metadata?.connections?.videos?.total ?? 0 });
      let plays = 0, page = 1, more = true;
      while (more && page <= 10) {
        const v = await (await fetch(`https://api.vimeo.com/me/videos?fields=stats.plays&per_page=100&page=${page}`, { headers: h, cache: "no-store" })).json();
        for (const x of v.data ?? []) plays += x?.stats?.plays ?? 0;
        more = !!v.paging?.next; page++;
      }
      rows.push({ channel: "vimeo", metric: "plays", value: plays });
    } catch { /* skip today */ }
  }
  if (instagramConfigured()) {
    try {
      const j = await (await fetch(`https://graph.facebook.com/v21.0/${process.env.INSTAGRAM_USER_ID}?fields=followers_count,media_count&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`, { cache: "no-store" })).json();
      if (j.followers_count != null) rows.push({ channel: "instagram", metric: "followers", value: j.followers_count });
      if (j.media_count != null) rows.push({ channel: "instagram", metric: "posts", value: j.media_count });
    } catch { /* skip today */ }
  }
  const recorded_on = new Date().toISOString().slice(0, 10);
  if (rows.length) {
    await adminDb().from("metrics").upsert(rows.map((r) => ({ ...r, recorded_on, source: "api" })), { onConflict: "channel,metric,recorded_on" });
  }
  return rows.length;
}
