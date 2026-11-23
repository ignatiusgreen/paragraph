import "server-only";
import { adminDb } from "./supabase/admin";
import { hasServiceKey } from "./integrations";

export const REVIEW_PORTAL_URL = "https://www.paragraphfilms.com/review/admin";

export type VideoRow = { id: string; title: string; label: string | null; project: string | null; kind: string; views: number; plays: number; downloads: number; openNotes: number; pending: boolean };
export type VideoAnalytics = {
  ok: boolean; reason?: string;
  videos: number; presentations: number; reviews: number;
  views: number; plays: number; downloads: number; openNotes: number; pending: number;
  daily: number[]; rows: VideoRow[];
};

const EMPTY: VideoAnalytics = { ok: false, videos: 0, presentations: 0, reviews: 0, views: 0, plays: 0, downloads: 0, openNotes: 0, pending: 0, daily: [], rows: [] };

/** Review Portal numbers for the last 30 days. Views, plays and downloads are anonymous counters kept by the review pages. */
export async function videoAnalytics(): Promise<VideoAnalytics> {
  if (!hasServiceKey()) return { ...EMPTY, reason: "SUPABASE_SERVICE_ROLE_KEY isn’t set in Vercel yet." };
  try {
    const sb = adminDb();
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [rv, pj, nt, vw] = await Promise.all([
      sb.from("reviews").select("id,title,label,kind,project_id,request_status").order("created_at", { ascending: false }),
      sb.from("review_projects").select("id,name"),
      sb.from("review_notes").select("review_id,resolved,parent_id"),
      sb.from("review_views").select("review_id,event,created_at").gte("created_at", since).limit(20000),
    ]);
    const err = rv.error ?? pj.error ?? nt.error ?? vw.error;
    if (err) return { ...EMPTY, reason: "The Review Portal tables aren’t reachable yet." };
    const proj = new Map((pj.data ?? []).map((p) => [p.id as string, p.name as string]));
    const by = new Map<string, VideoRow>();
    for (const r of rv.data ?? []) by.set(r.id, { id: r.id, title: r.title, label: r.label, project: r.project_id ? proj.get(r.project_id) ?? null : null, kind: r.kind, views: 0, plays: 0, downloads: 0, openNotes: 0, pending: r.request_status === "pending" });
    for (const n of nt.data ?? []) { const row = by.get(n.review_id); if (row && !n.parent_id && !n.resolved) row.openNotes++; }
    const days = 14, daily = Array<number>(days).fill(0), now = Date.now();
    let views = 0, plays = 0, downloads = 0;
    for (const v of vw.data ?? []) {
      const row = by.get(v.review_id); if (!row) continue;
      if (v.event === "view") { row.views++; views++; const i = days - 1 - Math.floor((now - +new Date(v.created_at)) / 86400000); if (i >= 0 && i < days) daily[i]++; }
      else if (v.event === "play") { row.plays++; plays++; }
      else if (v.event === "download") { row.downloads++; downloads++; }
    }
    const all = [...by.values()];
    const rows = all.filter((r) => r.views || r.plays || r.downloads || r.openNotes || r.pending).sort((a, b) => b.views - a.views || b.openNotes - a.openNotes).slice(0, 5);
    return {
      ok: true, videos: all.length, presentations: all.filter((r) => r.kind === "presentation").length, reviews: all.filter((r) => r.kind === "review").length,
      views, plays, downloads, openNotes: all.reduce((s, r) => s + r.openNotes, 0), pending: all.filter((r) => r.pending).length, daily, rows,
    };
  } catch {
    return { ...EMPTY, reason: "The Review Portal numbers couldn’t be loaded." };
  }
}
