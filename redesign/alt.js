(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;

  // Smooth scrolling (Lenis), falling back to native scrolling if it didn't load
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.25, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }

  // Page enter: lift the curtain, then reveal the title lines
  requestAnimationFrame(function () { requestAnimationFrame(function () { body.classList.add('ready'); }); });
  addEventListener('pageshow', function (ev) { if (ev.persisted) { body.classList.remove('leaving'); body.classList.add('ready'); } });

  // Page leave: drop the curtain before following internal links
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('a[href]'); if (!a || reduce) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || a.target === '_blank' || ev.metaKey || ev.ctrlKey || ev.shiftKey || url.hash && url.pathname === location.pathname) return;
    ev.preventDefault();
    body.classList.add('leaving');
    setTimeout(function () { location.href = a.href; }, 650);
  });

  // Background colour shifts as each section reaches the middle of the screen
  var sections = [].slice.call(document.querySelectorAll('[data-bg]'));
  var setTheme = function (s) {
    var bg = s.dataset.bg, fg = s.dataset.fg || '#0d0d0c', dark = !!s.dataset.fg;
    body.style.setProperty('--pbg', bg); body.style.setProperty('--pfg', fg);
    body.style.setProperty('--pmute', dark ? '#9a968e' : '#7a766e');
    body.style.setProperty('--logo-inv', dark ? 0 : 1);
  };
  if ('IntersectionObserver' in window) {
    var themeIO = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) setTheme(en.target); }); }, { rootMargin: '-50% 0px -50% 0px' });
    sections.forEach(function (s) { themeIO.observe(s); });
  }

  // Lede: split into words that brighten in sequence
  document.querySelectorAll('[data-words]').forEach(function (p) {
    var words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map(function (w) { return '<span class="w">' + w.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>'; }).join(' ');
  });

  // Reveal on scroll
  var reveals = [].slice.call(document.querySelectorAll('[data-reveal], [data-words]'));
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; io.unobserve(el);
        if (el.hasAttribute('data-words')) {
          el.querySelectorAll('.w').forEach(function (w, i) { setTimeout(function () { w.classList.add('in'); }, i * 28); });
        } else el.classList.add('in');
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add('in'); el.querySelectorAll('.w').forEach(function (w) { w.classList.add('in'); }); });

  // Scroll-linked motion: hero frame widens to full bleed; stills drift at different speeds
  var frame = document.getElementById('aframe');
  var gals = [].slice.call(document.querySelectorAll('[data-speed]'));
  function tick() {
    var vh = innerHeight;
    if (frame) {
      var r = frame.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)));      // 0 when it enters, 1 near the top
      var ease = 1 - Math.pow(1 - p, 3);
      frame.style.setProperty('--inset', (12 * (1 - ease)).toFixed(2) + 'vw');
      frame.style.setProperty('--zoom', (1.15 - 0.15 * ease).toFixed(3));
    }
    if (innerWidth > 800) gals.forEach(function (g) {
      var r = g.getBoundingClientRect(), c = r.top + r.height / 2 - vh / 2;
      g.style.transform = 'translateY(' + (-c * +g.dataset.speed).toFixed(1) + 'px)';
    });
  }
  if (!reduce) {
    if (lenis) lenis.on('scroll', tick); else addEventListener('scroll', tick, { passive: true });
    addEventListener('resize', tick); tick();
  }

  // Hero video plays in place
  var cover = frame && frame.querySelector('.cover');
  if (cover) cover.addEventListener('click', function () {
    var f = document.createElement('iframe'); f.src = cover.dataset.src; f.title = cover.dataset.title;
    f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; f.setAttribute('allowfullscreen', '');
    cover.replaceWith(f); f.focus();
  });

  // Film rows open a lightbox player
  var lb = document.getElementById('lb'), lbf = lb && lb.querySelector('.lb-frame'), lastFocus = null;
  function openLB(src, title) {
    lastFocus = document.activeElement;
    lbf.innerHTML = ''; var f = document.createElement('iframe'); f.src = src; f.title = title || 'Video';
    f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; f.setAttribute('allowfullscreen', ''); lbf.appendChild(f);
    lb.hidden = false; requestAnimationFrame(function () { lb.classList.add('on'); });
    if (lenis) lenis.stop(); lb.querySelector('.lb-x').focus();
  }
  function closeLB() {
    lb.classList.remove('on'); if (lenis) lenis.start();
    setTimeout(function () { lb.hidden = true; lbf.innerHTML = ''; }, 450);
    if (lastFocus) lastFocus.focus();
  }
  document.querySelectorAll('.film-row').forEach(function (b) { b.addEventListener('click', function () { openLB(b.dataset.src, b.dataset.title); }); });
  if (lb) {
    lb.querySelector('.lb-x').addEventListener('click', closeLB);
    lb.addEventListener('click', function (ev) { if (ev.target === lb) closeLB(); });
    addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !lb.hidden) closeLB(); });
  }

  // More projects: drag to scroll on desktop
  var row = document.querySelector('.mrow');
  if (row) {
    var down = false, sx = 0, sl = 0, moved = false;
    row.addEventListener('pointerdown', function (ev) { if (ev.pointerType !== 'mouse') return; down = true; moved = false; sx = ev.clientX; sl = row.scrollLeft; });
    addEventListener('pointermove', function (ev) { if (!down) return; var dx = ev.clientX - sx; if (Math.abs(dx) > 4) { moved = true; row.classList.add('drag'); } row.scrollLeft = sl - dx; });
    addEventListener('pointerup', function () { down = false; row.classList.remove('drag'); });
    row.addEventListener('click', function (ev) { if (moved) { ev.preventDefault(); ev.stopPropagation(); } }, true);
    row.addEventListener('dragstart', function (ev) { ev.preventDefault(); });
  }
})();

// "View project" label follows the mouse over project images
(function () {
  if (!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
  var c = document.createElement('div'); c.className = 'vcursor'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
  var x = 0, y = 0, cx = 0, cy = 0, raf = null;
  function loop() { cx += (x - cx) * 0.25; cy += (y - cy) * 0.25; c.style.left = cx + 'px'; c.style.top = cy + 'px'; raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(loop) : null; }
  addEventListener('mousemove', function (ev) { x = ev.clientX; y = ev.clientY; if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  document.querySelectorAll('[data-cursor]').forEach(function (a) {
    var img = a.querySelector('.wi, .mi') || a;
    img.addEventListener('mouseenter', function (ev) {
      c.textContent = a.dataset.cursor; c.classList.toggle('light', !!a.closest('.a-more'));
      if (!c.classList.contains('on')) { cx = x = ev.clientX; cy = y = ev.clientY; c.style.left = cx + 'px'; c.style.top = cy + 'px'; }
      c.classList.add('on');
    });
    img.addEventListener('mouseleave', function () { c.classList.remove('on'); });
  });
})();
