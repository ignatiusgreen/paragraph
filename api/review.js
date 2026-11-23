// Public side of the Review Portal: a reviewer opens /review/r/<token>, reads the notes, adds notes.
const crypto = require('crypto');
const { db, enc, clean, ready, downloadUrl, send, readBody } = require('./_db');

const NOTE_COLS = 'id,parent_id,author_name,is_team,timecode,body,resolved,created_at,edited_at';

async function load(token) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token || '')) return null;
  const rows = await db('GET', 'reviews?token=eq.' + enc(token) + '&select=id,title,client,video_url,status,kind,label,project_id,request_status,created_at&limit=1');
  return rows && rows[0] ? rows[0] : null;
}

module.exports = async function handler(req, res) {
  try {
    if (!ready()) return send(res, 503, { error: 'The review portal isn’t connected yet.' });
    const url = new URL(req.url, 'http://x');

    if (req.method === 'GET') {
      const review = await load(url.searchParams.get('token'));
      if (!review) return send(res, 404, { error: 'This review link isn’t valid.' });
      const isReview = review.kind === 'review';
      const notes = isReview ? await db('GET', 'review_notes?review_id=eq.' + review.id + '&select=' + NOTE_COLS + '&order=created_at.asc&limit=1000') : [];
      let project = null;
      if (review.project_id) { const p = await db('GET', 'review_projects?id=eq.' + review.project_id + '&select=name&limit=1'); project = p && p[0] ? p[0].name : null; }
      const { id, project_id, ...pub } = review;
      pub.project = project;
      if (!isReview) pub.download_url = downloadUrl(review.video_url);
      return send(res, 200, { review: pub, notes });
    }

    if (req.method === 'POST') {
      const b = await readBody(req);
      const review = await load(b.token);
      if (!review) return send(res, 404, { error: 'This review link isn’t valid.' });
      if (b.action === 'request_notes') {   // a viewer of a presentation asks to be allowed to leave notes
        if (review.kind !== 'presentation') return send(res, 400, { error: 'Notes are already open on this video.' });
        if (review.request_status === 'pending') return send(res, 200, { request_status: 'pending' });
        if (review.request_status === 'declined') return send(res, 403, { error: 'Notes weren’t enabled on this video.' });
        const name = clean(b.name, 80), email = clean(b.email, 160), message = clean(b.message, 600);
        if (!name) return send(res, 400, { error: 'Please add your name.' });
        await db('PATCH', 'reviews?id=eq.' + review.id, { request_status: 'pending', requested_name: name, requested_email: email || null, requested_message: message || null, requested_at: new Date().toISOString() });
        return send(res, 200, { request_status: 'pending' });
      }
      if (review.kind !== 'review') return send(res, 403, { error: 'Notes aren’t enabled on this video.' });
      if (review.status !== 'open') return send(res, 403, { error: 'This review is closed, so notes can’t be added.' });
      if (b.action === 'edit') {   // a reviewer changes their own note; the secret edit_key from when they wrote it proves it is theirs
        const text = clean(b.body, 3000);
        if (!text) return send(res, 400, { error: 'A note can’t be empty.' });
        const found = await db('GET', 'review_notes?id=eq.' + enc(String(b.note_id || '')) + '&review_id=eq.' + review.id + '&select=id,edit_key&limit=1');
        const key = found && found[0] && found[0].edit_key;
        const given = String(b.edit_key || '');
        const same = key && given.length === key.length && crypto.timingSafeEqual(Buffer.from(key), Buffer.from(given));
        if (!same) return send(res, 403, { error: 'You can only edit notes you wrote on this device.' });
        const upd = await db('PATCH', 'review_notes?id=eq.' + found[0].id + '&select=' + NOTE_COLS, { body: text, edited_at: new Date().toISOString() }, 'return=representation');
        return send(res, 200, { note: upd[0] });
      }
      const name = clean(b.name, 80), email = clean(b.email, 160), body = clean(b.body, 3000);
      if (!name) return send(res, 400, { error: 'Please add your name.' });
      if (!body) return send(res, 400, { error: 'Please write a note.' });
      let tc = b.timecode === null || b.timecode === undefined || b.timecode === '' ? null : Number(b.timecode);
      if (tc !== null && (!isFinite(tc) || tc < 0 || tc > 86400)) tc = null;
      let parent = null;
      if (b.parent_id) {
        const p = await db('GET', 'review_notes?id=eq.' + enc(String(b.parent_id)) + '&review_id=eq.' + review.id + '&select=id,parent_id&limit=1');
        if (!p || !p[0]) return send(res, 400, { error: 'That note no longer exists.' });
        parent = p[0].parent_id || p[0].id;   // replies stay one level deep
        tc = null;
      }
      const count = await db('GET', 'review_notes?review_id=eq.' + review.id + '&select=id&limit=600');
      if (count.length >= 500) return send(res, 429, { error: 'This review has reached its note limit.' });
      const editKey = crypto.randomBytes(18).toString('base64url');
      const row = await db('POST', 'review_notes?select=' + NOTE_COLS, { review_id: review.id, parent_id: parent, author_name: name, author_email: email || null, timecode: tc, body, edit_key: editKey }, 'return=representation');
      return send(res, 200, { note: row[0], edit_key: editKey });
    }

    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return send(res, 500, { error: 'Something went wrong. Please try again.' });
  }
};
