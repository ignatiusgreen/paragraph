(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header: solid after scrolling, mobile menu
  var hdr = document.getElementById('hdr');
  var hasHero = !!document.querySelector('.hero');
  if (hasHero) document.body.classList.add('has-hero');
  function onScroll() { hdr.classList.toggle('solid', !hasHero || scrollY > 40); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var nav = document.getElementById('nav'), mb = nav.querySelector('.menu-btn');
  mb.addEventListener('click', function () { var o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', o); });
  nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); }); });

  // Hero: rotating slides, each with its trailer looping silently behind the title
  var slides = [].slice.call(document.querySelectorAll('.hero .slide'));
  if (slides.length) {
    var cur = 0, timer, DUR = 8000, prog = document.querySelector('.hero .progress'), count = document.querySelector('.hero .count');
    // Each slide loops only its chosen stretch of the trailer (data-start → data-end, in seconds),
    // and the video fades in only once it is inside that stretch, so no title cards flash up.
    var players = [];
    function post(f, method, value) {
      var msg = { method: method }; if (value !== undefined) msg.value = value;
      f.contentWindow && f.contentWindow.postMessage(JSON.stringify(msg), 'https://player.vimeo.com');
    }
    addEventListener('message', function (ev) {
      if (!/^https:\/\/player\.vimeo\.com$/.test(ev.origin)) return;
      var d; try { d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch (e) { return; }
      var p = players.filter(function (x) { return x.f.contentWindow === ev.source; })[0]; if (!p) return;
      if (d.event === 'ready') { post(p.f, 'addEventListener', 'timeupdate'); post(p.f, 'setVolume', 0); post(p.f, 'setCurrentTime', p.start); post(p.f, 'play'); }
      if (d.event === 'timeupdate' && d.data) {
        var t = d.data.seconds;
        if (t >= p.end || t < p.start - 0.5) { post(p.f, 'setCurrentTime', p.start); return; }
        if (!p.shown && t >= p.start) { p.shown = true; p.box.classList.add('ready'); }
      }
    });
    function loadVideo(s) {
      if (reduce || s.dataset.loaded) return; s.dataset.loaded = 1;
      var box = s.querySelector('.vid'), f = document.createElement('iframe');
      f.src = s.dataset.v; f.allow = 'autoplay; fullscreen'; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      var p = { f: f, box: box, start: +s.dataset.start || 0, end: +s.dataset.end || 1e9, shown: false };
      players.push(p);
      f.onload = function () { post(f, 'addEventListener', 'timeupdate'); post(f, 'setCurrentTime', p.start); post(f, 'play'); };
      box.appendChild(f);
    }
    function show(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('on', k === cur); s.setAttribute('aria-hidden', k !== cur); });
      loadVideo(slides[cur]);
      count.textContent = (cur + 1) + ' / ' + slides.length;
      prog.style.transition = 'none'; prog.style.width = '0';
      requestAnimationFrame(function () { requestAnimationFrame(function () { prog.style.transition = 'width ' + DUR + 'ms linear'; prog.style.width = '100%'; }); });
      clearTimeout(timer); timer = setTimeout(function () { show(cur + 1); }, DUR);
    }
    document.querySelectorAll('.hero .arrow').forEach(function (b) { b.addEventListener('click', function () { show(cur + (+b.dataset.go)); }); });
    show(0);
  }

  // Film filters
  document.querySelectorAll('.filters').forEach(function (bar) {
    var grid = bar.closest('section').querySelector('.grid.films');
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      bar.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      grid.querySelectorAll('.card').forEach(function (c) { c.classList.toggle('hide', b.dataset.f !== 'all' && c.dataset.s !== b.dataset.f); });
    });
  });

  // Branded list: photo follows the cursor
  var peek = document.querySelector('.peek');
  if (peek) {
    var pimg = peek.querySelector('img');
    document.querySelectorAll('.clients a').forEach(function (a) {
      new Image().src = a.dataset.img;
      a.addEventListener('mouseenter', function () { pimg.src = a.dataset.img; peek.classList.add('on'); });
      a.addEventListener('mouseleave', function () { peek.classList.remove('on'); });
      a.addEventListener('mousemove', function (e) { peek.style.left = e.clientX + 'px'; peek.style.top = e.clientY + 'px'; });
    });
  }

  // Trailer players: our own play button; clicking swaps in the Vimeo player and starts it with sound
  document.querySelectorAll('.play-cover').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = b.dataset.src; f.title = b.dataset.title || 'Trailer';
      f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; f.setAttribute('allowfullscreen', '');
      b.replaceWith(f); f.focus();
    });
  });
})();
