(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;

  // Smooth scrolling (Lenis), falling back to native scrolling if it didn't load
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.25, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true }); window.__lenis = lenis;
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
    // the section whose top has passed its trigger line sets the colours (default: middle of the screen;
    // a section can ask to take over earlier with data-bg-at, as a fraction of the screen height)
    var active = null;
    var pick = function () {
      var vh = innerHeight, cur = sections[0];
      sections.forEach(function (s) {
        var ok;
        if (s.dataset.bgAfter) { var el = document.querySelector(s.dataset.bgAfter); ok = el ? el.getBoundingClientRect().bottom < 0 : false; }   // wait until that element has left the screen
        else ok = s.getBoundingClientRect().top < vh * (+s.dataset.bgAt || 0.5);
        if (ok) cur = s;
      });
      if (cur !== active) { active = cur; setTheme(cur); }
      requestAnimationFrame(pick);
    };
    requestAnimationFrame(pick);
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

  // Film rows open a lightbox player
  var lb = document.getElementById('lb'), lbf = lb && lb.querySelector('.lb-frame'), lastFocus = null;
  // Player without Vimeo/YouTube chrome: click anywhere to play/pause; a label follows the mouse; one small sound toggle
  var isYT = function (u) { return /youtube(-nocookie)?\.com/.test(u); };
  function bare(u) {
    if (isYT(u)) return u + (u.indexOf('?') < 0 ? '?' : '&') + 'controls=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1&enablejsapi=1&origin=' + encodeURIComponent(location.origin);
    return u + (u.indexOf('?') < 0 ? '?' : '&') + 'controls=0&title=0&byline=0&portrait=0&dnt=1';
  }
  var cur = { f: null, yt: false, playing: true, muted: false };
  function cmd(name, arg) {
    var f = cur.f; if (!f || !f.contentWindow) return;
    if (cur.yt) {
      var map = { play: 'playVideo', pause: 'pauseVideo', mute: 'mute', unmute: 'unMute' };
      f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: map[name], args: [] }), '*');
    } else {
      var m = { play: ['play'], pause: ['pause'], mute: ['setMuted', true], unmute: ['setMuted', false] }[name];
      var msg = { method: m[0] }; if (m.length > 1) msg.value = m[1];
      f.contentWindow.postMessage(JSON.stringify(msg), 'https://player.vimeo.com');
    }
  }
  var hit, label, snd;
  function ensureUI() {
    if (hit) return;
    hit = document.createElement('button'); hit.type = 'button'; hit.className = 'lb-hit'; hit.setAttribute('aria-label', 'Pause');
    label = document.createElement('div'); label.className = 'lb-label'; label.setAttribute('aria-hidden', 'true');
    snd = document.createElement('button'); snd.type = 'button'; snd.className = 'lb-snd'; snd.textContent = 'Sound on';
    lbf.parentNode.appendChild(label); lbf.parentNode.appendChild(snd);
    hit.addEventListener('click', function () {
      cur.playing = !cur.playing; cmd(cur.playing ? 'play' : 'pause');
      label.textContent = cur.playing ? 'Pause' : 'Play'; hit.setAttribute('aria-label', label.textContent);
    });
    hit.addEventListener('mousemove', function (ev) { label.style.left = ev.clientX + 'px'; label.style.top = ev.clientY + 'px'; label.classList.add('on'); });
    hit.addEventListener('mouseleave', function () { label.classList.remove('on'); });
    // belt and braces: hide the label whenever the pointer is anywhere other than the picture
    lb.addEventListener('mousemove', function (ev) { if (ev.target !== hit) label.classList.remove('on'); });
    lb.addEventListener('mouseleave', function () { label.classList.remove('on'); });
    document.addEventListener('mouseleave', function () { label.classList.remove('on'); });
    snd.addEventListener('click', function () { cur.muted = !cur.muted; cmd(cur.muted ? 'mute' : 'unmute'); snd.textContent = cur.muted ? 'Sound off' : 'Sound on'; });
  }
  function openLB(src, title) {
    lastFocus = document.activeElement; ensureUI();
    lbf.innerHTML = ''; var f = document.createElement('iframe'); f.src = bare(src); f.title = title || 'Video';
    f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; f.setAttribute('allowfullscreen', ''); lbf.appendChild(f);
    lbf.appendChild(hit);
    cur = { f: f, yt: isYT(src), playing: true, muted: false };
    label.textContent = 'Pause'; snd.textContent = 'Sound on';
    if (cur.yt) f.addEventListener('load', function () { f.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*'); });
    lb.hidden = false; requestAnimationFrame(function () { lb.classList.add('on'); });
    if (lenis) lenis.stop(); document.documentElement.classList.add('screening'); lb.querySelector('.lb-x').focus();
  }
  addEventListener('keydown', function (ev) { if (lb && !lb.hidden && (ev.key === ' ' || ev.key === 'k') && hit) { ev.preventDefault(); hit.click(); } });
  function closeLB() {
    lb.classList.remove('on'); if (lenis) lenis.start(); document.documentElement.classList.remove('screening');
    if (label) label.classList.remove('on');
    setTimeout(function () { lb.hidden = true; lbf.innerHTML = ''; cur.f = null; }, 450);
    if (lastFocus) lastFocus.focus();
  }
  document.querySelectorAll('.film-row, [data-lb], button.cover[data-src]').forEach(function (b) { b.addEventListener('click', function () { openLB(b.dataset.src, b.dataset.title); }); });
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
    var img = a.querySelector('.wi, .mi, .pi') || a;
    img.addEventListener('mouseenter', function (ev) {
      c.innerHTML = String(a.dataset.cursor).split(' ').map(function (w) { return '<span>' + w + '</span>'; }).join(''); c.classList.toggle('light', !!a.closest('.a-more'));
      if (!c.classList.contains('on')) { cx = x = ev.clientX; cy = y = ev.clientY; c.style.left = cx + 'px'; c.style.top = cy + 'px'; }
      c.classList.add('on');
    });
    img.addEventListener('mouseleave', function () { c.classList.remove('on'); });
  });
})();

// Film index: posters wipe in left to right as each row arrives; filters replay the wipe
(function () {
  var grid = document.querySelector('.pgrid.ix'); if (!grid) return;
  var bar = document.querySelector('.fbar');
  var cards = [].slice.call(grid.querySelectorAll('.pf'));
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cols() { return getComputedStyle(grid).gridTemplateColumns.split(' ').length || 4; }
  function shown() { return cards.filter(function (c) { return !c.classList.contains('hide'); }); }
  function stagger() { var n = cols(); shown().forEach(function (c, i) { c.style.setProperty('--d', ((i % n) * 0.14).toFixed(2) + 's'); }); }
  stagger();
  if (reduce || !('IntersectionObserver' in window)) { cards.forEach(function (c) { c.classList.add('on'); }); }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -10% 0px' }) : null;
  if (io && !reduce) cards.forEach(function (c) { io.observe(c); });
  if (!bar) return;
  bar.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    bar.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    cards.forEach(function (c) {
      c.classList.remove('on'); if (io) io.unobserve(c);
      c.classList.toggle('hide', !(b.dataset.f === 'all' || c.dataset.s === b.dataset.f));
    });
    stagger();
    void grid.offsetWidth;                                     // restart the wipe
    requestAnimationFrame(function () {
      shown().forEach(function (c) { if (io && !reduce) io.observe(c); else c.classList.add('on'); });
    });
  });
})();

// About: behind-the-scenes marquee — drifts on its own; hover right half to speed it right, left half to run it left
(function () {
  [].forEach.call(document.querySelectorAll('.marquee'), run);
  function run(mq) {
  var track = mq.querySelector('.mq-track');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var x = 0, v = 0, target = 0.6, base = 0.6, last = performance.now();   // px per frame at 60fps
  mq.addEventListener('mousemove', function (ev) {
    var r = mq.getBoundingClientRect(), f = (ev.clientX - r.left) / r.width - 0.5;   // -0.5 … 0.5
    target = Math.abs(f) < 0.08 ? base * 0.4 : (f > 0 ? base + f * 14 : f * 14);
  });
  mq.addEventListener('mouseleave', function () { target = base; });
  function tick(now) {
    var dt = Math.min(48, now - last) / 16.67; last = now;
    v += (target - v) * 0.06;
    var half = track.scrollWidth / 2;
    x -= v * dt; if (x <= -half) x += half; if (x > 0) x -= half;
    track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    requestAnimationFrame(tick);
  }
  if (!reduce) requestAnimationFrame(tick);
  }
})();

// Background reels: nudge the Vimeo player to start (some browsers ignore autoplay in embeds until told to play)
(function () {
  var frames = [].slice.call(document.querySelectorAll('iframe.reel-bg')); if (!frames.length) return;
  function post(f, method, value) { var m = { method: method }; if (value !== undefined) m.value = value; try { f.contentWindow.postMessage(JSON.stringify(m), 'https://player.vimeo.com'); } catch (e) {} }
  function kick(f) { post(f, 'setVolume', 0); post(f, 'setMuted', true); post(f, 'setLoop', true); post(f, 'play'); }
  frames.forEach(function (f) {
    f.addEventListener('load', function () { kick(f); setTimeout(function () { kick(f); }, 800); setTimeout(function () { kick(f); }, 2500); });
  });
  addEventListener('message', function (ev) {
    if (ev.origin !== 'https://player.vimeo.com') return;
    var d; try { d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch (e) { return; }
    if (d && d.event === 'ready') frames.forEach(function (f) { if (f.contentWindow === ev.source) kick(f); });
  });
  // first touch/click/scroll anywhere also starts it, for browsers that wait for a gesture
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function (t) { addEventListener(t, function once() { frames.forEach(kick); removeEventListener(t, once); }, { passive: true }); });
})();

// Self-hosted background reels: make sure they start (and restart if the tab was hidden)
(function () {
  var vids = [].slice.call(document.querySelectorAll('video.reel-bg')); if (!vids.length) return;
  function go(v) { v.muted = true; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  vids.forEach(function (v) { go(v); v.addEventListener('canplay', function () { if (v.paused) go(v); }); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) vids.forEach(go); });
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function (t) { addEventListener(t, function once() { vids.forEach(function (v) { if (v.paused) go(v); }); removeEventListener(t, once); }, { passive: true }); });
})();

// In-page anchors (e.g. Say hello): glide there with the smooth scroller, and honour #hash on arrival
(function () {
  function go(hash, instant) {
    var el = hash && document.getElementById(hash.slice(1)); if (!el) return false;
    var y = el.getBoundingClientRect().top + scrollY;
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: !!instant }); else scrollTo({ top: y, behavior: instant ? 'auto' : 'smooth' });
    return true;
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('a[href*="#"]'); if (!a) return;
    var u = new URL(a.href, location.href);
    if (u.pathname === location.pathname && u.hash && go(u.hash)) { ev.preventDefault(); history.replaceState(null, '', u.hash); }
  });
  if (location.hash) addEventListener('load', function () { setTimeout(function () { go(location.hash, true); }, 60); });
})();
