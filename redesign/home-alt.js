(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var slides = [].slice.call(document.querySelectorAll('.hs')), caps = [].slice.call(document.querySelectorAll('.hc'));
  if (!slides.length) return;
  var bar = document.querySelector('.hprog span'), cur = 0, timer, DUR = 6500, players = [];
  function post(f, method, value) { var m = { method: method }; if (value !== undefined) m.value = value; f.contentWindow && f.contentWindow.postMessage(JSON.stringify(m), 'https://player.vimeo.com'); }
  addEventListener('message', function (ev) {
    if (ev.origin !== 'https://player.vimeo.com') return;
    var d; try { d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch (e) { return; }
    var p = players.filter(function (x) { return x.f.contentWindow === ev.source; })[0]; if (!p) return;
    if (d.event === 'ready') { post(p.f, 'addEventListener', 'timeupdate'); post(p.f, 'setVolume', 0); post(p.f, 'setCurrentTime', p.start); post(p.f, 'play'); }
    if (d.event === 'timeupdate' && d.data) {
      var t = d.data.seconds;
      if (t >= p.end || t < p.start - 0.5) { post(p.f, 'setCurrentTime', p.start); return; }
      if (!p.shown && t >= p.start) { p.shown = true; p.box.classList.add('ready'); }
    }
  });
  function load(s) {
    if (reduce || s.dataset.loaded || !s.dataset.v) return; s.dataset.loaded = 1;
    var box = s.querySelector('.vid'), f = document.createElement('iframe');
    f.src = s.dataset.v; f.allow = 'autoplay; fullscreen'; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    var p = { f: f, box: box, start: +s.dataset.start || 0, end: +s.dataset.end || 1e9, shown: false }; players.push(p);
    f.onload = function () { post(f, 'addEventListener', 'timeupdate'); post(f, 'setCurrentTime', p.start); post(f, 'play'); };
    box.appendChild(f);
  }
  function show(i) {
    cur = (i + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.classList.toggle('on', k === cur); });
    caps.forEach(function (c, k) { c.classList.toggle('on', k === cur); c.setAttribute('aria-hidden', k !== cur); });
    load(slides[cur]);
    var fr = document.getElementById('aframe'), sl = slides[cur];
    if (fr && sl.dataset.href) { fr.href = sl.dataset.href; fr.dataset.cursor = sl.dataset.cur; var vc = document.querySelector('.vcursor.on'); if (vc) vc.textContent = sl.dataset.cur; }
    if (bar) { bar.style.transition = 'none'; bar.style.width = '0'; requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.transition = 'width ' + DUR + 'ms linear'; bar.style.width = '100%'; }); }); }
    clearTimeout(timer); timer = setTimeout(function () { show(cur + 1); }, DUR);
  }
  document.querySelectorAll('.harrows button').forEach(function (b) { b.addEventListener('click', function () { show(cur + (+b.dataset.go)); }); });
  show(0);
})();
