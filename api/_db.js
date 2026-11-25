// Tiny Supabase REST helper for the Review Portal (server side only; uses the service key from Vercel env).
const URL_ = () => (process.env.SUPABASE_URL || 'https://dujhgnnphqmcskfpbmll.supabase.co').replace(/\/$/, '');

function ready() { return !!process.env.SUPABASE_SERVICE_KEY; }

async function db(method, path, body, prefer) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(URL_() + '/rest/v1/' + path, {
    method,
    headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, prefer ? { Prefer: prefer } : {}),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error('db ' + r.status + ' ' + text.slice(0, 200));
  return text ? JSON.parse(text) : null;
}

const enc = encodeURIComponent;
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);

// Dropbox share links only stream as a raw file with raw=1
function normalizeVideoUrl(u) {
  let x;
  try { x = new URL(String(u).trim()); } catch (e) { return null; }
  if (x.protocol !== 'https:') return null;
  if (/(^|\.)dropbox\.com$/.test(x.hostname)) { x.searchParams.delete('dl'); x.searchParams.set('raw', '1'); }
  return x.toString();
}

function downloadUrl(u) {
  try {
    const x = new URL(u);
    if (/(^|\.)dropbox\.com$/.test(x.hostname)) { x.searchParams.delete('raw'); x.searchParams.set('dl', '1'); }
    return x.toString();
  } catch (e) { return u; }
}

const STREAM_HOST = () => process.env.CLOUDFLARE_STREAM_SUBDOMAIN || 'customer-huj8xg5h2triagb2.cloudflarestream.com';
const streamUrl = (uid) => 'https://' + STREAM_HOST() + '/' + uid + '/manifest/video.m3u8';

// Cloudflare Stream: every video whose link is added or changed is copied there automatically for fast playback.
async function cf(method, path, body) {
  const token = process.env.CLOUDFLARE_API_TOKEN, acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !acct) return null;
  const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + acct + path, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error((j.errors && j.errors[0] && j.errors[0].message) || ('Cloudflare said ' + r.status));
  return j.result;
}
// Start copying a video link to Stream and record it on the row. Never throws: the original link keeps working either way.
async function streamKick(table, id, videoUrl, name) {
  if (!process.env.CLOUDFLARE_API_TOKEN || !videoUrl) return { stream_uid: null, stream_status: null };
  let patch;
  try {
    const r = await cf('POST', '/stream/copy', { url: downloadUrl(videoUrl), meta: { name: String(name || '').slice(0, 120) }, requireSignedURLs: false });
    patch = { stream_uid: r.uid, stream_status: 'inprogress' };
  } catch (e) { patch = { stream_uid: null, stream_status: 'error' }; }
  await db('PATCH', table + '?id=eq.' + id, patch).catch(() => {});
  return patch;
}
// Bring any still-processing rows up to date (called when a list or page loads, so nobody has to press a button).
async function streamRefresh(table, rows) {
  const pending = (rows || []).filter((v) => v.stream_uid && v.stream_status !== 'ready' && v.stream_status !== 'error');
  await Promise.all(pending.map(async (v) => {
    try {
      const r = await cf('GET', '/stream/' + v.stream_uid);
      if (!r) return;
      const st = r.readyToStream ? 'ready' : (r.status && r.status.state === 'error' ? 'error' : 'inprogress');
      if (st !== v.stream_status) { v.stream_status = st; await db('PATCH', table + '?id=eq.' + v.id, { stream_status: st }).catch(() => {}); }
    } catch (e) { /* try again next load */ }
  }));
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const c of req) { raw += c; if (raw.length > 20000) break; }
  try { return JSON.parse(raw || '{}'); } catch (e) { return {}; }
}

module.exports = { streamKick, streamRefresh, streamUrl, db, enc, clean, ready, normalizeVideoUrl, downloadUrl, send, readBody };
