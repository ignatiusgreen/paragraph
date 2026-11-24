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

module.exports = { streamUrl, db, enc, clean, ready, normalizeVideoUrl, downloadUrl, send, readBody };
