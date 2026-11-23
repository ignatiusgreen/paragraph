// Public: a Custom Reel (made in the portal's Reel Builder), found by its private token.
const { db, enc, ready, send, downloadUrl } = require('./_db');
// Private-link hashes for Vimeo videos, used only while a video has no direct file yet
const VH = {"1030184426":"1d51ab3c4d","1240465146":"8fc9c5fd98","1240465147":"86b7e5e4a0","756435121":"e42876e832","756437594":"5c21683088","756471529":"01c626f63d","756476179":"18fc8ea137","756476332":"cfa0f3a75f","756476489":"de23ef562e","756499538":"15d94c0347","756499635":"b54f6d1dc0","756505806":"1bce941076","756506004":"954fd44b2d","756506134":"59eff867f3","756507833":"a807228897","756508623":"7b056ddbb1","756514677":"e502579a04","756515017":"ee1c36e671","756516488":"3dd7be8f80","756516594":"c37543148d","802890453":"a4996e09a6","802890501":"c695f6e3bd","803251278":"162cc9f173","803252869":"d358b1cc07","803253074":"49d7ab0f6d","803256201":"9c8f55e851","803261256":"8130968feb","840215065":"ce1b71c46a","920304570":"7358c52636","998756130":"214f1c7288","998808760":"93fde589af","998835219":"86baa33c2c"};

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(res, 405, { error: 'Method not allowed' }); }
    if (!ready()) return send(res, 503, { error: 'Not available yet.' });
    const token = new URL(req.url, 'http://x').searchParams.get('token') || '';
    if (!/^[0-9a-f]{16,64}$/i.test(token)) return send(res, 404, { error: 'This link isn’t valid.' });
    const rows = await db('GET', 'reels?token=eq.' + enc(token) + '&select=title,client,vimeo_ids,allow_download&limit=1');
    const r = rows && rows[0];
    if (!r) return send(res, 404, { error: 'This link isn’t valid, or it was switched off.' });
    const ids = r.vimeo_ids || [];
    const vids = ids.length ? await db('GET', 'site_videos?vimeo_id=in.(' + ids.map(enc).join(',') + ')&select=vimeo_id,title,grp,video_url&limit=200') : [];
    const by = {}; (vids || []).forEach((v) => { by[v.vimeo_id] = v; });
    const videos = ids.filter((i) => by[i]).map((i) => {
      const v = by[i];
      return {
        title: v.title, project: v.grp,
        src: v.video_url || null,
        embed: v.video_url ? null : 'https://player.vimeo.com/video/' + i + (VH[i] ? '?h=' + VH[i] : ''),
        download: r.allow_download && v.video_url ? downloadUrl(v.video_url) : null,
      };
    });
    return send(res, 200, { title: r.title, client: r.client, videos });
  } catch (e) {
    return send(res, 500, { error: 'Something went wrong.' });
  }
};
