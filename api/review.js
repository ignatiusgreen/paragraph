// Public side of the Review Portal: a reviewer opens /review/r/<token>, reads the notes, adds notes.
const { db, enc, clean, ready, send, readBody } = require('./_db');

const NOTE_COLS = 'id,parent_id,author_name,is_team,timecode,body,resolved,created_at';

async function load(token) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token || '')) return null;
  const rows = await db('GET', 'reviews?token=eq.' + enc(token) + '&select=id,title,client,video_url,status,created_at&limit=1');
  return rows && rows[0] ? rows[0] : null;
}

module.exports = async function handler(req, res) {
  try {
    if (!ready()) return send(res, 503, { error: 'The review portal isn’t connected yet.' });
    const url = new URL(req.url, 'http://x');

    if (req.method === 'GET') {
      const review = await load(url.searchParams.get('token'));
      if (!review) return send(res, 404, { error: 'This review link isn’t valid.' });
      const notes = await db('GET', 'review_notes?review_id=eq.' + review.id + '&select=' + NOTE_COLS + '&order=created_at.asc&limit=1000');
      const { id, ...pub } = review;
      return send(res, 200, { review: pub, notes });
    }

    if (req.method === 'POST') {
      const b = await readBody(req);
      const review = await load(b.token);
      if (!review) return send(res, 404, { error: 'This review link isn’t valid.' });
      if (review.status !== 'open') return send(res, 403, { error: 'This review is closed, so notes can’t be added.' });
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
      const row = await db('POST', 'review_notes?select=' + NOTE_COLS, { review_id: review.id, parent_id: parent, author_name: name, author_email: email || null, timecode: tc, body }, 'return=representation');
      return send(res, 200, { note: row[0] });
    }

    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return send(res, 500, { error: 'Something went wrong. Please try again.' });
  }
};
