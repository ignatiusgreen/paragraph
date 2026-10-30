// Screening room: a video opens full screen on black with no Vimeo/YouTube chrome.
// Underneath sits a small control bar — sound, a time bar you can click to jump, play/pause.
// Clicking the picture (or the space bar) also plays/pauses. X, Escape or clicking the black closes it.
// Used on every page that has something to play; brand pages already contain the #lb markup.
(function () {
  var triggers = [].slice.call(document.querySelectorAll('.play-cover[data-src], button.cover[data-src], .film-row[data-src], [data-lb][data-src]'));
  if (!triggers.length) return;
  window.__screening = true;
  var lb = document.getElementById('lb');
  if (!lb) {
    lb = document.createElement('div'); lb.className = 'lightbox'; lb.id = 'lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Video player');
    lb.innerHTML = '<button type="button" class="lb-x" aria-label="Close the player"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></button><div class="lb-frame"></div>';
    document.body.appendChild(lb);
  }
  var lbf = lb.querySelector('.lb-frame'), x = lb.querySelector('.lb-x'), lastFocus = null;
  var hit = document.createElement('button'); hit.type = 'button'; hit.className = 'lb-hit'; hit.setAttribute('aria-label', 'Play or pause');
  var ICON = {
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="1.5"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor"/></svg>'
  };
  var bar = document.createElement('div'); bar.className = 'lb-bar';
  bar.innerHTML = '<button type="button" class="lb-btn lb-mute" aria-label="Mute">' + ICON.sound + '</button>' +
    '<div class="lb-track" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="lb-fill"></div></div>' +
    '<button type="button" class="lb-btn lb-pp" aria-label="Pause">' + ICON.pause + '</button>';
  lb.appendChild(bar);
  [].forEach.call(lb.querySelectorAll('.lb-snd, .lb-label'), function (n) { n.remove(); });   // old controls, if any
  var mute = bar.querySelector('.lb-mute'), pp = bar.querySelector('.lb-pp'), track = bar.querySelector('.lb-track'), fill = bar.querySelector('.lb-fill');

  var isYT = function (u) { return /youtube(-nocookie)?\.com/.test(u); };
  function bare(u) {
    if (isYT(u)) return u + (u.indexOf('?') < 0 ? '?' : '&') + 'controls=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1&enablejsapi=1&origin=' + encodeURIComponent(location.origin);
    return u + (u.indexOf('?') < 0 ? '?' : '&') + 'controls=0&title=0&byline=0&portrait=0&dnt=1';
  }
  var cur = { f: null, yt: false, playing: true, muted: false, dur: 0, t: 0 };
  function send(obj) { if (cur.f && cur.f.contentWindow) cur.f.contentWindow.postMessage(JSON.stringify(obj), cur.yt ? '*' : 'https://player.vimeo.com'); }
  function cmd(name, val) {
    if (cur.yt) {
      var map = { play: 'playVideo', pause: 'pauseVideo', mute: 'mute', unmute: 'unMute', seek: 'seekTo' };
      send({ event: 'command', func: map[name], args: name === 'seek' ? [val, true] : [] });
    } else {
      var m = { play: { method: 'play' }, pause: { method: 'pause' }, mute: { method: 'setMuted', value: true }, unmute: { method: 'setMuted', value: false }, seek: { method: 'setCurrentTime', value: val } }[name];
      send(m);
    }
  }
  function setPlaying(p) { cur.playing = p; pp.innerHTML = p ? ICON.pause : ICON.play; pp.setAttribute('aria-label', p ? 'Pause' : 'Play'); }
  function setMuted(m) { cur.muted = m; mute.innerHTML = m ? ICON.muted : ICON.sound; mute.setAttribute('aria-label', m ? 'Unmute' : 'Mute'); }
  function setTime(t, d) { if (d) cur.dur = d; cur.t = t; var pct = cur.dur ? Math.min(100, t / cur.dur * 100) : 0; fill.style.width = pct + '%'; track.setAttribute('aria-valuenow', Math.round(pct)); }
  function toggle() { var p = !cur.playing; cmd(p ? 'play' : 'pause'); setPlaying(p); }
  hit.addEventListener('click', toggle);
  pp.addEventListener('click', toggle);
  mute.addEventListener('click', function () { var m = !cur.muted; cmd(m ? 'mute' : 'unmute'); setMuted(m); });
  function seekTo(clientX) { var r = track.getBoundingClientRect(), f = Math.max(0, Math.min(1, (clientX - r.left) / r.width)); if (cur.dur) { cmd('seek', f * cur.dur); setTime(f * cur.dur); } }
  var dragging = false;
  track.addEventListener('pointerdown', function (ev) { dragging = true; track.setPointerCapture(ev.pointerId); seekTo(ev.clientX); });
  track.addEventListener('pointermove', function (ev) { if (dragging) seekTo(ev.clientX); });
  track.addEventListener('pointerup', function () { dragging = false; });
  track.addEventListener('keydown', function (ev) {
    if (!cur.dur) return;
    if (ev.key === 'ArrowRight') { cmd('seek', Math.min(cur.dur, cur.t + 5)); ev.preventDefault(); }
    if (ev.key === 'ArrowLeft') { cmd('seek', Math.max(0, cur.t - 5)); ev.preventDefault(); }
  });
  // progress from the players
  addEventListener('message', function (ev) {
    if (!cur.f || ev.source !== cur.f.contentWindow) return;
    var d; try { d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch (e) { return; }
    if (!d) return;
    if (cur.yt) {
      var i = d.info || {};
      if (typeof i.currentTime === 'number') setTime(i.currentTime, i.duration);
      if (typeof i.playerState === 'number') { if (i.playerState === 1) setPlaying(true); if (i.playerState === 2 || i.playerState === 0) setPlaying(false); }
      return;
    }
    if (d.event === 'ready') ['timeupdate', 'play', 'pause', 'ended'].forEach(function (e) { send({ method: 'addEventListener', value: e }); });
    if ((d.event === 'timeupdate' || d.event === 'playProgress') && d.data) setTime(d.data.seconds, d.data.duration);   // Vimeo reports progress as playProgress
    if (d.event === 'play') setPlaying(true);
    if (d.event === 'pause' || d.event === 'ended') setPlaying(false);
  });
  function open(src, title) {
    lastFocus = document.activeElement;
    lbf.innerHTML = ''; var f = document.createElement('iframe'); f.src = bare(src); f.title = title || 'Video';
    f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; f.setAttribute('allowfullscreen', ''); lbf.appendChild(f); lbf.appendChild(hit);
    cur = { f: f, yt: isYT(src), playing: true, muted: false, dur: 0, t: 0 }; setPlaying(true); setMuted(false); setTime(0);
    f.addEventListener('load', function () {
      if (cur.yt) send({ event: 'listening' });
      else ['timeupdate', 'play', 'pause', 'ended'].forEach(function (e) { send({ method: 'addEventListener', value: e }); });
    });
    lb.hidden = false; requestAnimationFrame(function () { lb.classList.add('on'); });
    if (window.__lenis) window.__lenis.stop();
    document.documentElement.classList.add('screening'); x.focus();
  }
  function close() {
    lb.classList.remove('on'); document.documentElement.classList.remove('screening');
    if (window.__lenis) window.__lenis.start();
    setTimeout(function () { lb.hidden = true; lbf.innerHTML = ''; cur.f = null; }, 450);
    if (lastFocus) lastFocus.focus();
  }
  triggers.forEach(function (b) { b.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopImmediatePropagation(); open(b.dataset.src, b.dataset.title); }, true); });
  x.addEventListener('click', function (ev) { ev.stopImmediatePropagation(); close(); }, true);
  lb.addEventListener('click', function (ev) { if (ev.target === lb) { ev.stopImmediatePropagation(); close(); } }, true);
  addEventListener('keydown', function (ev) {
    if (lb.hidden) return;
    if (ev.key === 'Escape') { ev.stopImmediatePropagation(); close(); }
    else if ((ev.key === ' ' || ev.key === 'k') && document.activeElement !== track) { ev.preventDefault(); ev.stopImmediatePropagation(); toggle(); }
  }, true);
})();
