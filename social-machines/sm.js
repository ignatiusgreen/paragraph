/* Social Machines: private pitch microsite.
   One page per slide. Arrows, keys, wheel or swipe move between pages;
   the label at top right shows where you are, and hovering it opens the contents. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var body = document.body;
  var pages = [].slice.call(document.querySelectorAll('.pg'));
  var N = pages.length;
  var idx = 0, leaveTimer = 0, leavingPage = null, lockUntil = 0, acc = 0, lastWheel = 0;
  var $ = function (id) { return document.getElementById(id); };
  var fill = $('smFill'), label = $('smLabel'), toc = $('smToc'), nav = $('smNav'), where = $('smWhere');
  var prevBtn = $('smPrev'), nextBtn = $('smNext'), live = $('smLive');
  var DPR = function () { return Math.min(2, window.devicePixelRatio || 1); };

  /* ---------- text splitting ---------- */
  function wrapChain(node, stop, html) {
    for (var a = node; a && a !== stop; a = a.parentNode) {
      var c = a.cloneNode(false), o = c.outerHTML, close = '</' + c.tagName.toLowerCase() + '>';
      html = o.slice(0, o.length - close.length) + html + close;
    }
    return html;
  }
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function wordSpans(el, cls) {
    var out = [], space = false;
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/([ \t\n\r]+)/).forEach(function (p) {
            if (!p) return;
            if (/^[ \t\n\r]+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); space = true; return; }
            var s = document.createElement('span'); s.className = cls; s.textContent = p;
            s._sp = space && out.length > 0; space = false;   // was there a space before this word?
            frag.appendChild(s); out.push(s);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    })(el);
    return out;
  }
  // [data-split]: wrap each rendered line in a mask so lines slide up one after another
  function splitLines(el) {
    if (el._src == null) el._src = el.innerHTML;
    el.innerHTML = el._src;
    var words = wordSpans(el, 'sw'), lines = [], lastTop = null;
    words.forEach(function (w) {
      var top = Math.round(w.getBoundingClientRect().top), fresh = lastTop === null || Math.abs(top - lastTop) > 4;
      if (fresh) { lines.push([]); lastTop = top; }
      lines[lines.length - 1].push((w._sp && !fresh ? ' ' : '') + wrapChain(w.parentNode, el, esc(w.textContent)));
    });
    el.innerHTML = lines.map(function (l, k) {
      return '<span class="ln"><span class="ln-i" style="--li:' + k + '">' + l.join('') + '</span></span>';
    }).join('');
  }
  // [data-words]: words brighten in sequence (as on the Paragraph site)
  function splitWords(el) {
    wordSpans(el, 'wd').forEach(function (w, i) { w.style.setProperty('--wi', i); });
  }
  var splitEls = [].slice.call(document.querySelectorAll('[data-split]'));
  function splitAll() { splitEls.forEach(splitLines); }

  /* ---------- lazy images ---------- */
  function loadNear(i) {
    for (var k = i - 1; k <= i + 2; k++) {
      var p = pages[k]; if (!p) continue;
      [].forEach.call(p.querySelectorAll('img[data-src]'), function (im) {
        im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); im.decoding = 'async';
      });
    }
  }

  /* ---------- canvas: dotted orb (the "AI" presence) ---------- */
  function Orb(c) {
    this.c = c; this.ctx = c.getContext('2d');
    this.light = c.hasAttribute('data-light');
    this.scale = parseFloat(c.getAttribute('data-scale') || '.29');
    var n = c.closest('.phone') ? 760 : 1150, P = new Float32Array(n * 3), g = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = g * i;
      P[i * 3] = Math.cos(th) * r; P[i * 3 + 1] = y; P[i * 3 + 2] = Math.sin(th) * r;
    }
    this.P = P; this.n = n; this.sparks = [37, 211, 402, 583, 690]; this.t0 = performance.now(); this.raf = 0;
  }
  Orb.prototype.fit = function () {
    var d = DPR(), w = Math.round(this.c.clientWidth * d), h = Math.round(this.c.clientHeight * d);
    if (w && h && (w !== this.c.width || h !== this.c.height)) { this.c.width = w; this.c.height = h; }
    return d;
  };
  Orb.prototype.draw = function (now) {
    var d = this.fit(), ctx = this.ctx, W = this.c.width, H = this.c.height;
    if (!W || !H) return;
    var t = (now - this.t0) / 1000, P = this.P, R = Math.min(W, H) * this.scale;
    var cx = W / 2, cy = H / 2, ry = t * 0.22, rx = 0.45 + 0.12 * Math.sin(t * 0.31);
    var cY = Math.cos(ry), sY = Math.sin(ry), cX = Math.cos(rx), sX = Math.sin(rx);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.light ? '#2c2b2e' : '#e4e2e6';
    var am = this.light ? 0.55 : 1, sp = [];
    for (var i = 0; i < this.n; i++) {
      var x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      var r = 1 + 0.16 * Math.sin(2.7 * x + t * 1.05) * Math.cos(2.1 * y - t * 0.8)
                + 0.11 * Math.sin(3.6 * z + 1.4 * x + t * 1.3) + 0.06 * Math.sin(5.1 * y + t * 1.9);
      x *= r; y *= r * 0.8; z *= r;
      var x1 = x * cY - z * sY, z1 = x * sY + z * cY;
      var y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
      var f = 3.6 / (3.6 - z2 * 0.7), sx = cx + x1 * R * f, sy = cy + y1 * R * f;
      var dep = Math.max(0, Math.min(1, (z2 + 1.3) / 2.6));
      var s = (0.6 + 1.25 * dep) * d;
      ctx.globalAlpha = (0.07 + 0.8 * dep * dep) * am;
      ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
      if (this.sparks.indexOf(i) > -1 && !this.light) sp.push([sx, sy, dep]);
    }
    ctx.globalAlpha = 1;
    if (sp.length) {
      ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = 10 * d;
      sp.forEach(function (p, k) {
        ctx.globalAlpha = 0.35 + 0.65 * p[2];
        ctx.beginPath(); ctx.arc(p[0], p[1], (1.5 + 0.6 * Math.sin(t * 2 + k)) * d, 0, 6.283); ctx.fill();
      });
      ctx.restore();
    }
  };

  /* ---------- canvas: dot-matrix field (section dividers) ---------- */
  var ROSE = [213, 167, 176], TEAL = [57, 133, 146], VIOLET = [123, 91, 208];
  function Field(c) {
    this.c = c; this.ctx = c.getContext('2d'); this.mode = c.getAttribute('data-mode') || 'wave';
    this.t0 = performance.now(); this.raf = 0; this.skip = 0;
  }
  Field.prototype.draw = function (now) {
    if ((this.skip = (this.skip + 1) % 2)) return;          // ~30fps is plenty
    var d = DPR(), c = this.c, w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
    var ctx = this.ctx, t = (now - this.t0) / 1000, sp = Math.max(15, Math.min(w, h) / 36), mode = this.mode;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
    var mn = Math.min(w, h);
    for (var gx = sp / 2; gx < w; gx += sp) {
      var u = gx / w, a = mode === 'rise' ? TEAL : ROSE, b = mode === 'rings' ? VIOLET : TEAL, m = u;
      ctx.fillStyle = 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * m) + ',' + Math.round(a[1] + (b[1] - a[1]) * m) + ',' + Math.round(a[2] + (b[2] - a[2]) * m) + ')';
      for (var gy = sp / 2; gy < h; gy += sp) {
        var v = gy / h, dx = (gx - w / 2) / mn, dy = (gy - h / 2) / mn, dist = Math.sqrt(dx * dx + dy * dy), val;
        if (mode === 'rings') val = 0.5 + 0.5 * Math.sin(dist * 15 - t * 1.5 + Math.sin(u * 4 + t * 0.3));
        else if (mode === 'rise') val = 0.5 + 0.5 * Math.sin(v * 8 + t * 1.3 + Math.sin(u * 5 + t * 0.45) * 1.6);
        else val = 0.5 + 0.5 * Math.sin(u * 6 + v * 2.2 - t * 0.9 + Math.sin(v * 3 + t * 0.4) * 1.3);
        val = mode === 'rings' ? val * val * val * val : val * val * val;
        var fall = 1 - Math.min(1, Math.max(0, (dist - 0.32) / 0.6));
        var al = (0.05 + 0.85 * val) * (0.25 + 0.75 * fall);
        if (al < 0.03) continue;
        var s = sp * (0.16 + 0.4 * val);
        ctx.globalAlpha = al;
        ctx.fillRect(gx - s / 2, gy - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  };

  function loop(obj) {
    obj.start = function () {
      if (obj.raf) return;
      if (reduce) { obj.draw(performance.now() + 4000); return; }
      var f = function (t) { obj.draw(t); obj.raf = requestAnimationFrame(f); };
      obj.raf = requestAnimationFrame(f);
    };
    obj.stop = function () { if (obj.raf) cancelAnimationFrame(obj.raf); obj.raf = 0; };
    return obj;
  }
  function components(p) {
    if (!p._comps) {
      p._comps = [];
      [].forEach.call(p.querySelectorAll('canvas[data-orb]'), function (c) { p._comps.push(loop(new Orb(c))); });
      [].forEach.call(p.querySelectorAll('canvas[data-dots]'), function (c) { p._comps.push(loop(new Field(c))); });
    }
    return p._comps;
  }

  /* ---------- timed effects: count-ups, typing, conversation ---------- */
  function later(p, fn, ms) { var id = setTimeout(fn, ms); (p._timers = p._timers || []).push(id); return id; }
  function clearTimers(p) { (p._timers || []).forEach(clearTimeout); p._timers = []; (p._rafs || []).forEach(cancelAnimationFrame); p._rafs = []; }
  var BASE = function () { return parseFloat(getComputedStyle(root).getPropertyValue('--base')) * 1000 || 500; };

  function countUp(p, el) {
    var to = parseFloat(el.getAttribute('data-to')), suf = el.getAttribute('data-suffix') || '';
    if (reduce) { el.textContent = to + suf; return; }
    var delay = parseFloat(el.getAttribute('data-delay') || '.35') * 1000 + BASE(), dur = parseFloat(el.getAttribute('data-dur') || '2') * 1000;
    el.textContent = '0' + suf;
    later(p, function () {
      var t0 = performance.now();
      var step = function (t) {
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(to * e) + suf;
        if (k < 1) (p._rafs = p._rafs || []).push(requestAnimationFrame(step));
      };
      (p._rafs = p._rafs || []).push(requestAnimationFrame(step));
    }, delay);
  }
  function typeText(p, el) {
    var txt = el.getAttribute('data-text').replace(/\|/g, '\n\n');
    if (reduce) { el.textContent = txt; return; }
    var speed = parseFloat(el.getAttribute('data-speed') || '36'), i = 0;
    el.textContent = '';
    var box = el.closest('.chat');
    var tick = function () {
      i++; el.textContent = txt.slice(0, i);
      if (box && i === 1) box.classList.add('has-text');
      if (i < txt.length) later(p, tick, txt[i - 1] === '\n' ? 260 : /[.,?!]/.test(txt[i - 1]) ? speed * 6 : speed * (0.6 + Math.random() * 0.8));
      else if (box && el.hasAttribute('data-send')) {
        // press send: button dips, message lifts away, field resets
        later(p, function () { box.classList.add('pressing'); }, 900);
        later(p, function () { box.classList.remove('pressing'); box.classList.add('sent'); }, 1120);
        later(p, function () { el.textContent = ''; box.classList.remove('has-text', 'sent'); }, 1900);
      }
    };
    later(p, tick, parseFloat(el.getAttribute('data-delay') || '1') * 1000 + BASE());
  }
  function typeSteps(p, el) {
    var steps = el.getAttribute('data-steps').split('|'), box = el.closest('.chat');
    var base = steps[0].slice(0, steps[0].lastIndexOf(' ') + 1);
    if (reduce) { el.textContent = base + steps[steps.length - 1]; if (box) box.classList.add('has-text'); return; }
    var speed = parseFloat(el.getAttribute('data-speed') || '50'), cur = '';
    var set = function (t) { cur = t; el.textContent = t; if (box) box.classList.toggle('has-text', t.length > 0); };
    var typeTo = function (target, done) {
      if (cur.length < target.length) { set(target.slice(0, cur.length + 1)); later(p, function () { typeTo(target, done); }, speed * (0.6 + Math.random() * 0.8)); }
      else later(p, done, 1500);
    };
    var eraseTo = function (len, done) {
      if (cur.length > len) { set(cur.slice(0, -1)); later(p, function () { eraseTo(len, done); }, 45); }
      else later(p, done, 380);
    };
    var k = 0;
    var next = function () {
      k++; if (k >= steps.length) return;
      eraseTo(base.length, function () { typeTo(base + steps[k], next); });
    };
    later(p, function () { typeTo(steps[0], next); }, parseFloat(el.getAttribute('data-delay') || '1') * 1000 + BASE());
  }
  function typeCycle(p, el) {
    var list = el.getAttribute('data-cycle').split('|'), k = 0;
    if (reduce) { el.textContent = list[0]; return; }
    el.textContent = '';
    var typeIt = function (s, i) {
      el.textContent = s.slice(0, i);
      if (i < s.length) later(p, function () { typeIt(s, i + 1); }, 55 + Math.random() * 70);
      else later(p, function () { erase(s, s.length); }, 2100);
    };
    var erase = function (s, i) {
      el.textContent = s.slice(0, i);
      if (i > 0) later(p, function () { erase(s, i - 1); }, 24);
      else { k = (k + 1) % list.length; later(p, function () { typeIt(list[k], 1); }, 500); }
    };
    later(p, function () { typeIt(list[0], 1); }, 1300 + BASE());
  }
  function convo(p, box) {
    var ms = [].slice.call(box.querySelectorAll('.m'));
    if (reduce) { ms.forEach(function (m) { m.classList.add('show'); }); return; }
    var t = 1000 + BASE();
    ms.forEach(function (m) {
      if (m.classList.contains('ai')) {
        later(p, function () {
          var ty = document.createElement('div'); ty.className = 'typing'; ty.innerHTML = '<i></i><i></i><i></i>';
          box.insertBefore(ty, m); box._typing = ty;
        }, t);
        t += 1300;
        later(p, function () { if (box._typing) { box._typing.remove(); box._typing = null; } m.classList.add('show'); }, t);
        t += 900;
      } else {
        later(p, function () { m.classList.add('show'); }, t);
        t += 1000;
      }
    });
  }
  function resetEffects(p) {
    clearTimers(p);
    [].forEach.call(p.querySelectorAll('.count'), function (el) { if (!reduce) el.textContent = '0' + (el.getAttribute('data-suffix') || ''); });
    [].forEach.call(p.querySelectorAll('.type,.typer,.typesteps'), function (el) { if (!reduce) el.textContent = ''; });
    [].forEach.call(p.querySelectorAll('.chat'), function (b) { b.classList.remove('has-text', 'pressing', 'sent'); });
    [].forEach.call(p.querySelectorAll('.convo'), function (b) {
      [].forEach.call(b.querySelectorAll('.typing'), function (x) { x.remove(); }); b._typing = null;
      [].forEach.call(b.querySelectorAll('.m'), function (m) { if (!reduce) m.classList.remove('show'); });
    });
  }
  function enter(p) {
    components(p).forEach(function (c) { c.start(); });
    [].forEach.call(p.querySelectorAll('.count'), function (el) { countUp(p, el); });
    [].forEach.call(p.querySelectorAll('.type'), function (el) { typeText(p, el); });
    [].forEach.call(p.querySelectorAll('.typer'), function (el) { typeCycle(p, el); });
    [].forEach.call(p.querySelectorAll('.typesteps'), function (el) { typeSteps(p, el); });
    [].forEach.call(p.querySelectorAll('.convo'), function (b) { convo(p, b); });
  }
  function leave(p) { components(p).forEach(function (c) { c.stop(); }); resetEffects(p); stopVideo(p); }

  /* ---------- trailer: play in place, stop when leaving the page ---------- */
  function stopVideo(p) {
    [].forEach.call(p.querySelectorAll('.player iframe'), function (f) { f.remove(); });
    [].forEach.call(p.querySelectorAll('.play-cover'), function (b) { b.style.display = ''; });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.play-cover');
    if (!b) return;
    var f = document.createElement('iframe');
    f.src = 'https://player.vimeo.com/video/' + b.getAttribute('data-vimeo') + '?title=0&byline=0&portrait=0&autoplay=1&dnt=1';
    f.title = 'Social Animals trailer';
    f.allow = 'autoplay; fullscreen; picture-in-picture';
    f.allowFullscreen = true;
    b.parentNode.appendChild(f);
    b.style.display = 'none';
    f.focus();
  });

  /* ---------- contents (table of contents) ---------- */
  var secs = [];
  pages.forEach(function (p, i) {
    var s = p.getAttribute('data-sec');
    if (!secs.length || secs[secs.length - 1].name !== s) secs.push({ name: s, items: [] });
    secs[secs.length - 1].items.push(i);
  });
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  toc.innerHTML = '<div class="toc-head"><b>Contents</b><span id="smCount"></span></div><ol class="toc-list">' +
    secs.map(function (s, k) {
      var first = pages[s.items[0]], name = s.name === 'Social Animals' ? '<em>Social Animals</em>' : s.name;
      return '<li><a href="#/' + first.getAttribute('data-slug') + '" data-go="' + s.items[0] + '" data-sec="' + k + '"><span class="n">' + (k ? pad(k) : '—') + '</span><span>' + name + '</span></a></li>';
    }).join('') + '</ol>';
  var tocLinks = [].slice.call(toc.querySelectorAll('a[data-go]'));
  function secOf(i) { for (var k = 0; k < secs.length; k++) if (secs[k].items.indexOf(i) > -1) return k; return 0; }
  var countEl = $('smCount');

  function setOpen(on) { nav.classList.toggle('open', on); where.setAttribute('aria-expanded', on ? 'true' : 'false'); }
  where.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') setOpen(!nav.classList.contains('open')); });
  where.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!nav.classList.contains('open')); } });
  nav.addEventListener('mouseenter', function () { where.setAttribute('aria-expanded', 'true'); });
  nav.addEventListener('mouseleave', function () { nav.classList.remove('hush'); if (!nav.classList.contains('open')) where.setAttribute('aria-expanded', 'false'); });
  document.addEventListener('pointerdown', function (e) { if (!nav.contains(e.target)) setOpen(false); });

  /* ---------- navigation ---------- */
  function chrome() {
    var p = pages[idx];
    fill.style.width = (N > 1 ? (idx / (N - 1)) * 100 : 100) + '%';
    label.textContent = p.getAttribute('data-label');
    body.classList.toggle('on-dark', p.classList.contains('dark'));
    body.classList.toggle('mark-light', p.getAttribute('data-mark') === 'light');
    body.classList.toggle('at-cover', idx === 0);
    prevBtn.disabled = idx === 0; nextBtn.disabled = idx === N - 1;
    countEl.textContent = pad(idx + 1) + ' / ' + pad(N);
    var cs = secOf(idx);
    tocLinks.forEach(function (a) { var on = +a.getAttribute('data-sec') === cs; a.classList.toggle('cur', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    pages.forEach(function (q, i) { var hide = i !== idx; q.setAttribute('aria-hidden', hide ? 'true' : 'false'); if ('inert' in q) q.inert = hide; });
    live.textContent = 'Page ' + (idx + 1) + ' of ' + N + ': ' + p.getAttribute('data-title');
    try { history.replaceState(null, '', '#/' + p.getAttribute('data-slug')); } catch (e) {}
  }
  function finishLeave() {
    clearTimeout(leaveTimer);
    if (leavingPage) {
      var p = leavingPage; leavingPage = null;
      p.classList.remove('on', 'leaving', 'to-next', 'to-prev');
      leave(p);
    }
  }
  function go(to) {
    to = Math.max(0, Math.min(N - 1, to));
    if (to === idx) return;
    finishLeave();
    root.style.setProperty('--base', '.5s');
    var from = pages[idx], next = pages[to], dir = to > idx ? 'next' : 'prev';
    loadNear(to);
    next.scrollTop = 0;
    next.classList.add('enter-' + dir); void next.offsetWidth;
    next.classList.add('on'); void next.offsetWidth;
    next.classList.remove('enter-' + dir);
    from.classList.add('leaving', 'to-' + dir);
    leavingPage = from;
    leaveTimer = setTimeout(finishLeave, reduce ? 0 : 1200);
    idx = to;
    chrome();
    enter(next);
  }
  function goSlug(slug) {
    for (var i = 0; i < N; i++) if (pages[i].getAttribute('data-slug') === slug) return i;
    return -1;
  }

  prevBtn.addEventListener('click', function () { go(idx - 1); });
  nextBtn.addEventListener('click', function () { go(idx + 1); });
  [].forEach.call(document.querySelectorAll('.go-next'), function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var box = b.closest('.chat');
      if (box && !reduce) { box.classList.add('pressing'); setTimeout(function () { box.classList.remove('pressing'); go(idx + 1); }, 220); }
      else go(idx + 1);
    });
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a) return;
    e.preventDefault();
    var g = a.getAttribute('data-go'), i = g != null ? +g : goSlug(a.getAttribute('href').slice(2));
    setOpen(false); if (document.activeElement) document.activeElement.blur();
    if (nav.contains(a)) nav.classList.add('hush');   // close now; reopen on the next hover
    if (i > -1) go(i);
  });
  window.addEventListener('hashchange', function () { var i = goSlug(location.hash.replace(/^#\/?/, '')); if (i > -1) go(i); });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typing) return;
    if (e.key === 'Escape') { setOpen(false); return; }
    var onCtl = t && t !== body && /^(A|BUTTON)$/.test(t.tagName);
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === 'ArrowDown' && !scrollable()) || (e.key === ' ' && !onCtl)) { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === 'ArrowUp' && !scrollable())) { e.preventDefault(); go(idx - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(N - 1); }
  });
  function scrollable() {
    var p = pages[idx];
    return getComputedStyle(p).overflowY !== 'hidden' && p.scrollHeight > p.clientHeight + 4;
  }

  window.addEventListener('wheel', function (e) {
    if (e.target.closest && e.target.closest('.sm-toc')) return;
    var p = pages[idx], dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX, now = performance.now();
    if (scrollable() && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      if (dy > 0 && p.scrollTop + p.clientHeight < p.scrollHeight - 2) return;
      if (dy < 0 && p.scrollTop > 2) return;
    }
    e.preventDefault();
    if (now < lockUntil) { lockUntil = Math.max(lockUntil, now + 160); return; }
    if (now - lastWheel > 250) acc = 0;
    lastWheel = now; acc += dy;
    if (Math.abs(acc) > 50) { go(idx + (acc > 0 ? 1 : -1)); acc = 0; lockUntil = now + 950; }
  }, { passive: false });

  var tx = 0, ty = 0, tt = 0;
  window.addEventListener('touchstart', function (e) { var t = e.touches[0]; tx = t.clientX; ty = t.clientY; tt = Date.now(); }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (e.target.closest && e.target.closest('.sm-toc')) return;
    var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
    if (Date.now() - tt < 800 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) go(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  var rz = 0;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(splitAll, 160); });

  /* ---------- start ---------- */
  [].forEach.call(document.querySelectorAll('[data-words]'), splitWords);
  if (!reduce) [].forEach.call(document.querySelectorAll('.count'), function (el) { el.textContent = '0' + (el.getAttribute('data-suffix') || ''); });
  var start = goSlug(location.hash.replace(/^#\/?/, ''));
  idx = start > -1 ? start : 0;
  loadNear(idx);
  root.style.setProperty('--base', reduce ? '0s' : '.85s');
  var started = false;
  function boot() {
    if (started) return; started = true;
    splitAll();
    pages[idx].classList.add('on');
    chrome();
    enter(pages[idx]);
    requestAnimationFrame(function () { body.classList.add('ready'); });
    setTimeout(function () { loadNear(Math.min(N - 1, idx + 3)); }, 2500);
  }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(boot); setTimeout(boot, 1600); }
  else boot();
})();
