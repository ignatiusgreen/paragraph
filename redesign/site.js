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
      a.addEventListener('mousemove', function (e) {
        // the thumbnail hangs off the cursor by its corner; flip to the other side near the screen edges
        var w = peek.offsetWidth, h = peek.offsetHeight, gap = 4;
        var flipX = e.clientX + gap + w > innerWidth - 8, flipY = e.clientY + gap + h > innerHeight - 8;
        peek.style.left = (flipX ? e.clientX - gap - w : e.clientX + gap) + 'px';
        peek.style.top = (flipY ? e.clientY - gap - h : e.clientY + gap) + 'px';
        peek.style.transformOrigin = (flipX ? 'right' : 'left') + ' ' + (flipY ? 'bottom' : 'top');
      });
    });
  }

  // Trailer players: our own play button; clicking swaps in the Vimeo player and starts it with sound
  if (!window.__screening) document.querySelectorAll('.play-cover').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = b.dataset.src; f.title = b.dataset.title || 'Trailer';
      f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; f.setAttribute('allowfullscreen', '');
      b.replaceWith(f); f.focus();
    });
  });
  // Brand pages: video cards load into the main player; Play film; Share
  var bplayer = document.getElementById('bplayer');
  if (bplayer) {
    var cardsEls = [].slice.call(document.querySelectorAll('.vcard'));
    function playIn(src, title) {
      var f = document.createElement('iframe'); f.src = src; f.title = title || 'Video';
      f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; f.setAttribute('allowfullscreen', '');
      bplayer.innerHTML = ''; bplayer.appendChild(f);
    }
    cardsEls.forEach(function (c) {
      c.addEventListener('click', function () {
        cardsEls.forEach(function (x) { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', x === c); });
        playIn(c.dataset.src, c.dataset.title); bplayer.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      });
    });
    var pf = document.getElementById('playfirst'), cov = document.getElementById('bcover');
    if (pf && cov) pf.addEventListener('click', function () { var c = document.getElementById('bcover'); if (c) c.click(); bplayer.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); });
    var sh = document.getElementById('share');
    if (sh) sh.addEventListener('click', function () {
      var out = document.querySelector('.shared');
      if (navigator.share) { navigator.share({ title: document.title, url: location.href }).catch(function () {}); }
      else if (navigator.clipboard) { navigator.clipboard.writeText(location.href).then(function () { out.textContent = 'Link copied'; }); }
    });
  }
})();

// Home: fade the page to white while the Branded section sits in the middle of the screen
(function () {
  var br = document.getElementById('branded'); if (!br || !('IntersectionObserver' in window)) return;
  var secs = [].slice.call(document.querySelectorAll('main#top > section'));
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) document.body.classList.toggle('lightzone', en.target === br); });
  }, { rootMargin: '-50% 0px -50% 0px' });
  secs.forEach(function (s) { io.observe(s); });
})();

// "View film" label follows the mouse over film posters (alt pages run their own version in alt.js)
(function () {
  if (document.body.classList.contains('alt')) return;
  if (!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
  var targets = document.querySelectorAll('.card[data-cursor]'); if (!targets.length) return;
  var c = document.createElement('div'); c.className = 'vcursor'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
  var x = 0, y = 0, cx = 0, cy = 0, raf = null;
  function loop() { cx += (x - cx) * 0.25; cy += (y - cy) * 0.25; c.style.left = cx + 'px'; c.style.top = cy + 'px'; raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(loop) : null; }
  addEventListener('mousemove', function (ev) { x = ev.clientX; y = ev.clientY; if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  targets.forEach(function (a) {
    var fr = a.querySelector('.frame') || a;
    fr.addEventListener('mouseenter', function (ev) {
      c.innerHTML = String(a.dataset.cursor).split(' ').map(function (w) { return '<span>' + w + '</span>'; }).join('');
      if (!c.classList.contains('on')) { cx = x = ev.clientX; cy = y = ev.clientY; c.style.left = cx + 'px'; c.style.top = cy + 'px'; }
      c.classList.add('on');
    });
    fr.addEventListener('mouseleave', function () { c.classList.remove('on'); });
  });
})();
