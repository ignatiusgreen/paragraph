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

// NOW STREAMING: the words and the poster wipes follow the scroll position (forwards and backwards)
(function () {
  var stage = document.querySelector('.pf-stage'); if (!stage) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var word = stage.querySelector('.pf-word span'), pis = [].slice.call(stage.querySelectorAll('.pi'));
  stage.classList.add('scrolled');
  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var ease = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var last = -1;
  function frame() {
    var r = stage.getBoundingClientRect(), vh = innerHeight;
    var p = clamp((vh * 0.95 - r.top) / (vh * 0.8));          // 0 as it enters, 1 when it nears the top
    if (p !== last) {
      last = p;
      var wi = ease(clamp(p / 0.22));                          // words rise in
      var wx = ease(clamp((p - 0.3) / 0.5));                   // then wipe away left to right
      word.style.setProperty('--wi', wi.toFixed(3));
      word.style.setProperty('--wx', wx.toFixed(3));
      word.style.setProperty('--wo', (wi * (1 - wx * 0.85)).toFixed(3));
      pis.forEach(function (el, i) { el.style.setProperty('--q', ease(clamp((p - (0.28 + i * 0.12)) / 0.3)).toFixed(3)); });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
