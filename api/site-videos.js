// Public: which Vimeo videos on paragraphfilms.com now have a direct video file (hosted on Dropbox or elsewhere).
// Returns { map: { "<vimeo id>": "<video url>" } }. The site only uses this once a link has been set in the portal.
const { db, ready, send } = require('./_db');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(res, 405, { error: 'Method not allowed' }); }
    if (!ready()) return send(res, 200, { map: {} });
    const rows = await db('GET', 'site_videos?or=(video_url.not.is.null,thumb_url.not.is.null)&select=vimeo_id,video_url,thumb_url&limit=1000');
    const map = {}, thumbs = {};
    (rows || []).forEach((r) => { if (r.video_url) map[r.vimeo_id] = r.video_url; if (r.thumb_url) thumbs[r.vimeo_id] = r.thumb_url; });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.end(JSON.stringify({ map, thumbs }));
  } catch (e) {
    return send(res, 200, { map: {} });
  }
};
