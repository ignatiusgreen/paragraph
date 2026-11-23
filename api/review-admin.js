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
      const id = url.searchParams.get('id');
      if (id) {
        if (!isId(id)) return send(res, 400, { error: 'Bad id' });
        const notes = await db('GET', 'review_notes?review_id=eq.' + id + '&select=' + NOTE_COLS + '&order=created_at.asc&limit=1000');
        return send(res, 200, { notes });
      }
      const reviews = await db('GET', 'reviews?select=id,token,title,client,video_url,status,created_at&order=created_at.desc&limit=300');
      const notes = await db('GET', 'review_notes?select=review_id,resolved,parent_id&limit=5000');
      const stat = {};
      notes.forEach((n) => { const s = stat[n.review_id] || (stat[n.review_id] = { open: 0, done: 0 }); if (!n.parent_id) { if (n.resolved) s.done++; else s.open++; } });
      return send(res, 200, { reviews: reviews.map((r) => Object.assign(r, { open: (stat[r.id] || {}).open || 0, done: (stat[r.id] || {}).done || 0 })) });
    }

    if (req.method === 'POST') {
      const b = await readBody(req);
      const a = b.action;

      if (a === 'create') {
        const title = clean(b.title, 140), client = clean(b.client, 140), video = normalizeVideoUrl(b.video_url);
        if (!title) return send(res, 400, { error: 'Give the review a title.' });
        if (!video) return send(res, 400, { error: 'The video link must be a full https:// link to an MP4 file.' });
        const token = crypto.randomBytes(18).toString('base64url');
        const row = await db('POST', 'reviews?select=id,token,title,client,video_url,status,created_at', { token, title, client: client || null, video_url: video }, 'return=representation');
        return send(res, 200, { review: row[0] });
      }
      if (a === 'update') {
        if (!isId(b.id)) return send(res, 400, { error: 'Bad id' });
        const patch = {};
        if (b.status === 'open' || b.status === 'closed') patch.status = b.status;
        if (b.title !== undefined) { patch.title = clean(b.title, 140); if (!patch.title) return send(res, 400, { error: 'Title can’t be empty.' }); }
        if (b.client !== undefined) patch.client = clean(b.client, 140) || null;
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
      return send(res, 400, { error: 'Unknown action' });
    }

    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return send(res, 500, { error: 'Something went wrong: ' + String(e.message || e).slice(0, 160) });
  }
};
