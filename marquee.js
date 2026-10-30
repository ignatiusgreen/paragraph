// Drifting, thumb-draggable marquee (used by 'More films' on film pages)
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
  // touch: drag the strip sideways with a thumb, fling it, then it settles back into its drift
  var drag = null, moved = false;
  mq.addEventListener('touchstart', function (ev) {
    var t = ev.touches[0]; drag = { x0: t.clientX, y0: t.clientY, lx: t.clientX, lt: performance.now(), dir: 0, vel: 0 }; moved = false;
  }, { passive: true });
  mq.addEventListener('touchmove', function (ev) {
    if (!drag) return; var t = ev.touches[0];
    if (!drag.dir) { var dx = Math.abs(t.clientX - drag.x0), dy = Math.abs(t.clientY - drag.y0); if (dx < 6 && dy < 6) return; drag.dir = dx > dy ? 'x' : 'y'; }
    if (drag.dir !== 'x') return;
    ev.preventDefault(); moved = true;
    var now = performance.now(), d = t.clientX - drag.lx;
    x += d; drag.vel = d / Math.max(1, (now - drag.lt) / 16.67); drag.lx = t.clientX; drag.lt = now;
    v = 0; target = 0;
  }, { passive: false });
  function release() { if (!drag) return; if (drag.dir === 'x') { v = -drag.vel; target = base; } drag = null; }
  mq.addEventListener('touchend', release); mq.addEventListener('touchcancel', release);
  mq.addEventListener('click', function (ev) { if (moved) { ev.preventDefault(); ev.stopPropagation(); moved = false; } }, true);
  function tick(now) {
    var dt = Math.min(48, now - last) / 16.67; last = now;
    if (!drag || drag.dir !== 'x') v += (target - v) * (Math.abs(v) > Math.abs(base) * 2 ? 0.035 : 0.06);
    var dup = track.querySelector('[data-dup]'), first = track.firstElementChild;
    var half = dup ? dup.offsetLeft - first.offsetLeft : track.scrollWidth / 2;   // exact width of one set of cards
    if (!drag || drag.dir !== 'x') x -= v * dt;
    while (x <= -half) x += half; while (x > 0) x -= half;
    track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    requestAnimationFrame(tick);
  }
  if (!reduce) requestAnimationFrame(tick);
  }
})();
