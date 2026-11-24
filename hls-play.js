// Plays a video URL in a <video>. Cloudflare Stream links (.m3u8) use the browser's own HLS support (Safari) or hls.js;
// anything else is a plain file. If a stream can't play, the file at `fallback` is used instead.
(function () {
  var loading = null;
  function lib() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
      s.onload = function () { res(window.Hls); }; s.onerror = function () { rej(new Error('hls')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  window.pgAttach = function (v, url, fallback, opts) {
    opts = opts || {};
    function plain(u) { if (v.__hls) { try { v.__hls.destroy(); } catch (e) {} v.__hls = null; } v.src = u; }
    if (!/\.m3u8(\?|$)/.test(url || '')) { plain(url); return; }
    if (!opts.best && v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = url;
      if (fallback) v.addEventListener('error', function once() { v.removeEventListener('error', once); plain(fallback); });
      return;
    }
    lib().then(function (Hls) {
      if (!Hls || !Hls.isSupported()) { if (fallback) plain(fallback); return; }
      var h = new Hls({ maxBufferLength: 30 }); v.__hls = h;
      h.on(Hls.Events.ERROR, function (e, d) { if (d && d.fatal) { try { h.destroy(); } catch (x) {} v.__hls = null; if (fallback) v.src = fallback; } });
      if (opts.best) h.on(Hls.Events.MANIFEST_PARSED, function () { h.currentLevel = h.levels.length - 1; });   // top quality, for picking a still
      h.loadSource(url); h.attachMedia(v);
    }).catch(function () { if (fallback) plain(fallback); });
  };
})();
