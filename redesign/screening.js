// Screening room for film pages: trailer opens full screen on black, no Vimeo/YouTube chrome,
// click (or space) to play/pause with a label that follows the mouse, a sound toggle, and an X / Escape to leave.
// Brand pages run their own copy of this inside alt.js, so this only acts where the page has no #lb yet.
(function () {
  if (document.getElementById('lb')) return;
  var covers = [].slice.call(document.querySelectorAll('.play-cover[data-src]')); if (!covers.length) return;
  window.__screening = true;
  var lb = document.createElement('div'); lb.className = 'lightbox'; lb.id = 'lb'; lb.hidden = true;
  lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Video player');
  lb.innerHTML = '<button type="button" class="lb-x" aria-label="Close the player"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></button><div class="lb-frame"></div>';
  document.body.appendChild(lb);
  var lbf = lb.querySelector('.lb-frame'), x = lb.querySelector('.lb-x'), lastFocus = null;
  var hit = document.createElement('button'); hit.type = 'button'; hit.className = 'lb-hit'; hit.setAttribute('aria-label', 'Pause');
  var label = document.createElement('div'); label.className = 'lb-label'; label.setAttribute('aria-hidden', 'true');
  var snd = document.createElement('button'); snd.type = 'button'; snd.className = 'lb-snd'; snd.textContent = 'Sound on';
  lb.appendChild(label); lb.appendChild(snd);
  var isYT = function (u) { return /youtube(-nocookie)?\.com/.test(u); };
  function bare(u) {
    if (isYT(u)) return u + (u.indexOf('?') < 0 ? '?' : '&') + 'controls=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1&enablejsapi=1&origin=' + encodeURIComponent(location.origin);
    return u + (u.indexOf('?') < 0 ? '?' : '&') + 'controls=0&title=0&byline=0&portrait=0&dnt=1';
  }
  var cur = { f: null, yt: false, playing: true, muted: false };
  function cmd(name) {
    var f = cur.f; if (!f || !f.contentWindow) return;
    if (cur.yt) { var map = { play: 'playVideo', pause: 'pauseVideo', mute: 'mute', unmute: 'unMute' }; f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: map[name], args: [] }), '*'); return; }
    var m = { play: ['play'], pause: ['pause'], mute: ['setMuted', true], unmute: ['setMuted', false] }[name];
    var msg = { method: m[0] }; if (m.length > 1) msg.value = m[1];
    f.contentWindow.postMessage(JSON.stringify(msg), 'https://player.vimeo.com');
  }
  hit.addEventListener('click', function () { cur.playing = !cur.playing; cmd(cur.playing ? 'play' : 'pause'); label.textContent = cur.playing ? 'Pause' : 'Play'; hit.setAttribute('aria-label', label.textContent); });
  hit.addEventListener('mousemove', function (ev) { label.style.left = ev.clientX + 'px'; label.style.top = ev.clientY + 'px'; label.classList.add('on'); });
  hit.addEventListener('mouseleave', function () { label.classList.remove('on'); });
  lb.addEventListener('mousemove', function (ev) { if (ev.target !== hit) label.classList.remove('on'); });
  lb.addEventListener('mouseleave', function () { label.classList.remove('on'); });
  snd.addEventListener('click', function () { cur.muted = !cur.muted; cmd(cur.muted ? 'mute' : 'unmute'); snd.textContent = cur.muted ? 'Sound off' : 'Sound on'; });
  function open(src, title) {
    lastFocus = document.activeElement;
    lbf.innerHTML = ''; var f = document.createElement('iframe'); f.src = bare(src); f.title = title || 'Video';
    f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; f.setAttribute('allowfullscreen', ''); lbf.appendChild(f); lbf.appendChild(hit);
    cur = { f: f, yt: isYT(src), playing: true, muted: false }; label.textContent = 'Pause'; snd.textContent = 'Sound on';
    if (cur.yt) f.addEventListener('load', function () { f.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*'); });
    lb.hidden = false; requestAnimationFrame(function () { lb.classList.add('on'); });
    document.documentElement.classList.add('screening'); x.focus();
  }
  function close() {
    lb.classList.remove('on'); document.documentElement.classList.remove('screening'); label.classList.remove('on');
    setTimeout(function () { lb.hidden = true; lbf.innerHTML = ''; cur.f = null; }, 450);
    if (lastFocus) lastFocus.focus();
  }
  covers.forEach(function (b) { b.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopImmediatePropagation(); open(b.dataset.src, b.dataset.title); }, true); });
  x.addEventListener('click', close);
  lb.addEventListener('click', function (ev) { if (ev.target === lb) close(); });
  addEventListener('keydown', function (ev) {
    if (lb.hidden) return;
    if (ev.key === 'Escape') close();
    else if (ev.key === ' ' || ev.key === 'k') { ev.preventDefault(); hit.click(); }
  });
})();
