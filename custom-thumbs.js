// Thumbnails chosen in the portal (Website Videos → Make Thumbnail) replace the default still wherever that video appears.
// Only portal-made thumbnails are swapped in, and only over the automatic stills. Artwork already assigned to a page
// (a film's big top image, a brand tile, the home carousel) is left alone.
(function () {
  var thumbs = null, KEY = 'pg_ct1';
  function id(el) {
    var s = el.getAttribute('data-src') || el.getAttribute('data-v') || '';
    var m = s.match(/\/video\/(\d+)/); return m ? m[1] : null;
  }
  function apply(root) {
    if (!thumbs) return;
    var list = (root || document).querySelectorAll('[data-src*="/video/"],[data-v*="/video/"]');
    for (var i = 0; i < list.length; i++) {
      var el = list[i], v = id(el), u = v && thumbs[v];
      if (!u) continue;
      var im = el.querySelector('img');
      if (!im || im.getAttribute('src') === u) continue;
      if (im.getAttribute('data-ct') || /\/img\/vt\/\d+(-1920)?\.jpg/.test(im.getAttribute('src') || '')) { im.removeAttribute('srcset'); im.setAttribute('data-ct', '1'); im.src = u; }
    }
  }
  function set(t) {
    thumbs = {}; for (var k in t) if (t[k] && String(t[k]).indexOf('/storage/') >= 0) thumbs[k] = t[k];
    apply();
  }
  try { var c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && typeof c === 'object') set(c); } catch (e) {}
  fetch('/api/site-videos').then(function (r) { return r.json(); }).then(function (j) {
    if (!j || !j.thumbs) return;
    window.__pgThumbs = j.thumbs; set(j.thumbs);
    try { localStorage.setItem(KEY, JSON.stringify(j.thumbs)); } catch (e) {}
  }).catch(function () {});
  var pend = false;
  new MutationObserver(function () { if (pend || !thumbs) return; pend = true; setTimeout(function () { pend = false; apply(); }, 120); })
    .observe(document.documentElement, { childList: true, subtree: true });
})();
