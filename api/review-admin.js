// Owner side of the Review Portal. Reached only through middleware.js, which requires the archive password.
const crypto = require('crypto');
const { db, enc, clean, ready, normalizeVideoUrl, send, readBody } = require('./_db');

const NOTE_COLS = 'id,review_id,parent_id,author_name,author_email,is_team,timecode,body,resolved,created_at,edited_at';
const isId = (s) => /^[0-9a-f-]{36}$/i.test(String(s || ''));

module.exports = async function handler(req, res) {
  try {
    if (!ready()) return send(res, 503, { error: 'Add SUPABASE_SERVICE_KEY in Vercel to turn the review portal on.' });
    const url = new URL(req.url, 'http://x');

    if (req.method === 'GET') {
      if (url.searchParams.get('analytics')) {   // views, plays and downloads for the last 30 days
        const since = new Date(Date.now() - 30 * 86400000).toISOString();
        const [reviews, projects, notes, views] = await Promise.all([
          db('GET', 'reviews?select=id,title,label,kind,project_id&order=created_at.desc&limit=500'),
          db('GET', 'review_projects?select=id,name&limit=300'),
          db('GET', 'review_notes?select=review_id,resolved,parent_id&limit=5000'),
          db('GET', 'review_views?select=review_id,event,created_at&created_at=gte.' + enc(since) + '&limit=20000'),
        ]);
        const pn = {}; projects.forEach((p) => { pn[p.id] = p.name; });
        const by = {}; reviews.forEach((r) => { by[r.id] = { id: r.id, title: r.title, label: r.label, kind: r.kind, project: r.project_id ? pn[r.project_id] || null : null, views: 0, plays: 0, downloads: 0, open: 0 }; });
        notes.forEach((n) => { const r = by[n.review_id]; if (r && !n.parent_id && !n.resolved) r.open++; });
        const days = []; const idx = {};
        for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); idx[d] = days.length; days.push({ d, views: 0 }); }
        const tot = { views: 0, plays: 0, downloads: 0 };
        views.forEach((v) => {
          const r = by[v.review_id]; if (!r) return;
          if (v.event === 'view') { r.views++; tot.views++; const k = idx[String(v.created_at).slice(0, 10)]; if (k !== undefined) days[k].views++; }
          else if (v.event === 'play') { r.plays++; tot.plays++; }
          else if (v.event === 'download') { r.downloads++; tot.downloads++; }
        });
        return send(res, 200, { totals: tot, days, videos: Object.values(by).sort((x, y) => y.views - x.views || y.plays - x.plays) });
      }
      if (url.searchParams.get('vimeo')) {   // owner-only: every video in the Vimeo library with its best download link (links expire after a few hours)
        const token = process.env.VIMEO_TOKEN;
        if (!token) return send(res, 503, { error: 'VIMEO_TOKEN isn’t set in Vercel.' });
        const out = [];
        let next = '/me/videos?per_page=100&fields=uri,name,download.link,download.quality,download.size,download.type,download.width,download.height';
        for (let i = 0; next && i < 10; i++) {
          const r = await fetch('https://api.vimeo.com' + next, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.vimeo.*+json;version=3.4' } });
          if (!r.ok) return send(res, 502, { error: 'Vimeo said ' + r.status + '. The token needs the video_files scope.' });
          const j = await r.json();
          (j.data || []).forEach((v) => {
            const id = String(v.uri || '').split('/').pop();
            const files = (v.download || []).filter((d) => d.link).sort((a, b) => (b.size || 0) - (a.size || 0));
            const best = files.find((d) => d.quality === 'source') || files[0];
            out.push({ id, name: v.name, size: best ? best.size : null, quality: best ? best.quality : null, url: best ? best.link : null });
          });
          next = j.paging && j.paging.next;
        }
        const body = { total: out.length, missing: out.filter((v) => !v.url).length, videos: out };
        if (url.searchParams.get('file')) {   // open /api/review-admin?vimeo=1&file=1 while signed in and the list downloads as a file
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Content-Disposition', 'attachment; filename="vimeo-manifest.json"');
          res.setHeader('Cache-Control', 'no-store');
          return res.end(JSON.stringify(body, null, 1));
        }
        return send(res, 200, body);
      }
      if (url.searchParams.get('reels')) {   // saved custom reels
        const reels = await db('GET', 'reels?select=id,token,title,client,vimeo_ids,allow_download,created_at&order=created_at.desc&limit=300');
        return send(res, 200, { reels });
      }
      if (url.searchParams.get('site')) {   // Website Videos section: every video on paragraphfilms.com
        const videos = await db('GET', 'site_videos?select=id,vimeo_id,title,grp,area,pages,video_url,sort&order=sort.asc&limit=1000');
        return send(res, 200, { videos });
      }
      const id = url.searchParams.get('id');
      if (id) {
        if (!isId(id)) return send(res, 400, { error: 'Bad id' });
        const notes = await db('GET', 'review_notes?review_id=eq.' + id + '&select=' + NOTE_COLS + '&order=created_at.asc&limit=1000');
        return send(res, 200, { notes });
      }
      const REV = 'id,token,title,client,video_url,status,kind,label,project_id,request_status,requested_name,requested_email,requested_message,requested_at,created_at';
      const projects = await db('GET', 'review_projects?select=id,name,client,created_at&order=created_at.desc&limit=300');
      const reviews = await db('GET', 'reviews?select=' + REV + '&order=created_at.desc&limit=500');
      const notes = await db('GET', 'review_notes?select=review_id,resolved,parent_id&limit=5000');
      const stat = {};
      notes.forEach((n) => { const s = stat[n.review_id] || (stat[n.review_id] = { open: 0, done: 0 }); if (!n.parent_id) { if (n.resolved) s.done++; else s.open++; } });
      return send(res, 200, { projects, reviews: reviews.map((r) => Object.assign(r, { open: (stat[r.id] || {}).open || 0, done: (stat[r.id] || {}).done || 0 })) });
    }

    if (req.method === 'POST') {
      const b = await readBody(req);
      const a = b.action;

      if (a === 'create') {
        const title = clean(b.title, 140), client = clean(b.client, 140), video = normalizeVideoUrl(b.video_url);
        if (!title) return send(res, 400, { error: 'Give the review a title.' });
        if (!video) return send(res, 400, { error: 'The video link must be a full https:// link to an MP4 file.' });
        const token = crypto.randomBytes(18).toString('base64url');
        const kind = b.kind === 'presentation' ? 'presentation' : 'review';
        const label = clean(b.label, 40) || null;
        const project_id = isId(b.project_id) ? b.project_id : null;
        const row = await db('POST', 'reviews?select=id,token,title,client,video_url,status,kind,label,project_id,created_at', { token, title, client: client || null, video_url: video, kind, label, project_id }, 'return=representation');
        return send(res, 200, { review: row[0] });
      }
      if (a === 'update') {
        if (!isId(b.id)) return send(res, 400, { error: 'Bad id' });
        const patch = {};
        if (b.status === 'open' || b.status === 'closed') patch.status = b.status;
        if (b.title !== undefined) { patch.title = clean(b.title, 140); if (!patch.title) return send(res, 400, { error: 'Title can’t be empty.' }); }
        if (b.client !== undefined) patch.client = clean(b.client, 140) || null;
        if (b.kind === 'review' || b.kind === 'presentation') patch.kind = b.kind;
        if (b.label !== undefined) patch.label = clean(b.label, 40) || null;
        if (b.project_id !== undefined) patch.project_id = isId(b.project_id) ? b.project_id : null;
        if (b.video_url !== undefined) { const v = normalizeVideoUrl(b.video_url); if (!v) return send(res, 400, { error: 'The video link must be a full https:// link.' }); patch.video_url = v; }
        await db('PATCH', 'reviews?id=eq.' + b.id, patch);
        return send(res, 200, { ok: true });
      }
      if (a === 'delete') {
        if (!isId(b.id)) return send(res, 400, { error: 'Bad id' });
        await db('DELETE', 'reviews?id=eq.' + b.id);
        return send(res, 200, { ok: true });
      }
      if (a === 'resolve') {
        if (!isId(b.note_id)) return send(res, 400, { error: 'Bad id' });
        await db('PATCH', 'review_notes?id=eq.' + b.note_id, { resolved: !!b.resolved });
        return send(res, 200, { ok: true });
      }
      if (a === 'delete_note') {
        if (!isId(b.note_id)) return send(res, 400, { error: 'Bad id' });
        await db('DELETE', 'review_notes?id=eq.' + b.note_id);
        return send(res, 200, { ok: true });
      }
      if (a === 'note') {   // a note or reply from the Paragraph team
        if (!isId(b.id)) return send(res, 400, { error: 'Bad id' });
        const body = clean(b.body, 3000);
        if (!body) return send(res, 400, { error: 'Write something first.' });
        let parent = null;
        if (b.parent_id) {
          if (!isId(b.parent_id)) return send(res, 400, { error: 'Bad id' });
          const p = await db('GET', 'review_notes?id=eq.' + b.parent_id + '&review_id=eq.' + b.id + '&select=id,parent_id&limit=1');
          if (!p || !p[0]) return send(res, 400, { error: 'That note no longer exists.' });
          parent = p[0].parent_id || p[0].id;
        }
        const row = await db('POST', 'review_notes?select=' + NOTE_COLS, { review_id: b.id, parent_id: parent, author_name: clean(b.name, 80) || 'Paragraph', is_team: true, body }, 'return=representation');
        return send(res, 200, { note: row[0] });
      }
      if (a === 'request') {   // approve or decline a viewer's request to leave notes
        if (!isId(b.id)) return send(res, 400, { error: 'Bad id' });
        if (b.decision === 'approve') await db('PATCH', 'reviews?id=eq.' + b.id, { kind: 'review', request_status: 'approved' });
        else await db('PATCH', 'reviews?id=eq.' + b.id, { request_status: 'declined' });
        return send(res, 200, { ok: true });
      }
      if (a === 'project_create') {
        const name = clean(b.name, 140);
        if (!name) return send(res, 400, { error: 'Give the project a name.' });
        const row = await db('POST', 'review_projects?select=id,name,client,created_at', { name, client: clean(b.client, 140) || null }, 'return=representation');
        return send(res, 200, { project: row[0] });
      }
      if (a === 'project_update') {
        if (!isId(b.id)) return send(res, 400, { error: 'Bad id' });
        const patch = {};
        if (b.name !== undefined) { patch.name = clean(b.name, 140); if (!patch.name) return send(res, 400, { error: 'Name can’t be empty.' }); }
        if (b.client !== undefined) patch.client = clean(b.client, 140) || null;
        await db('PATCH', 'review_projects?id=eq.' + b.id, patch);
        return send(res, 200, { ok: true });
      }
      if (a === 'project_delete') {   // videos stay, they just leave the folder
        if (!isId(b.id)) return send(res, 400, { error: 'Bad id' });
        await db('DELETE', 'review_projects?id=eq.' + b.id);
        return send(res, 200, { ok: true });
      }
      if (a === 'site_update') {   // set or clear the Dropbox (or other direct) link for a site video, rename, regroup
        if (!isId(b.id)) return send(res, 400, { error: 'Bad id' });
        const patch = { updated_at: new Date().toISOString() };
        if (b.video_url !== undefined) {
          if (String(b.video_url).trim() === '') patch.video_url = null;
          else { const v = normalizeVideoUrl(b.video_url); if (!v) return send(res, 400, { error: 'The link must be a full https:// link to a video file.' }); patch.video_url = v; }
        }
        if (b.title !== undefined) { patch.title = clean(b.title, 160); if (!patch.title) return send(res, 400, { error: 'Title can’t be empty.' }); }
        if (b.grp !== undefined) { patch.grp = clean(b.grp, 80); if (!patch.grp) return send(res, 400, { error: 'Group can’t be empty.' }); }
        const row = await db('PATCH', 'site_videos?id=eq.' + b.id + '&select=id,vimeo_id,title,grp,area,pages,video_url,sort', patch, 'return=representation');
        return send(res, 200, { video: row && row[0] });
      }
      if (a === 'reel_save') {   // create or update a custom reel: title, client, ordered list of site video ids
        const ids = [...new Set((Array.isArray(b.vimeo_ids) ? b.vimeo_ids : []).map((x) => String(x).replace(/\D/g, '')).filter(Boolean))].slice(0, 100);
        const title = clean(b.title, 140);
        if (!title) return send(res, 400, { error: 'Give the reel a name.' });
        if (!ids.length) return send(res, 400, { error: 'Pick at least one video.' });
        const row = { title, client: clean(b.client, 140) || null, vimeo_ids: ids, allow_download: b.allow_download !== false, updated_at: new Date().toISOString() };
        const cols = 'id,token,title,client,vimeo_ids,allow_download,created_at';
        let out;
        if (b.id) {
          if (!isId(b.id)) return send(res, 400, { error: 'Bad id' });
          out = await db('PATCH', 'reels?id=eq.' + b.id + '&select=' + cols, row, 'return=representation');
        } else {
          row.token = crypto.randomBytes(12).toString('hex');
          out = await db('POST', 'reels?select=' + cols, row, 'return=representation');
        }
        return send(res, 200, { reel: out && out[0] });
      }
      if (a === 'reel_delete') {
        if (!isId(b.id)) return send(res, 400, { error: 'Bad id' });
        await db('DELETE', 'reels?id=eq.' + b.id);
        return send(res, 200, { ok: true });
      }
      return send(res, 400, { error: 'Unknown action' });
    }

    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return send(res, 500, { error: 'Something went wrong: ' + String(e.message || e).slice(0, 160) });
  }
};
