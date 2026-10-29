// Site cursor: a light circle that inverts whatever it passes over (mix-blend-mode: difference).
// Grows over links and buttons; steps aside for the "View film / View project" label over images.
(function () {
  if (!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
  var dot = document.createElement('div'); dot.className = 'cdot'; dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot); document.documentElement.classList.add('has-cdot');
  var x = -100, y = -100, cx = -100, cy = -100, raf = null, shown = false;
  function loop() {
    cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
    dot.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.2 ? requestAnimationFrame(loop) : null;
  }
  addEventListener('mousemove', function (ev) {
    x = ev.clientX; y = ev.clientY;
    if (!shown) { shown = true; cx = x; cy = y; dot.classList.add('on'); }
    var t = ev.target;
    var onMedia = !!(t.closest && t.closest('[data-cursor] .wi, [data-cursor] .mi, [data-cursor] .pi, [data-cursor] .frame, .card[data-cursor] .frame, a.hframe[href]'));
    var onHero = !!(t.closest && t.closest('a.hframe[href]'));
    dot.classList.toggle('go', onHero);
    dot.classList.toggle('play', onMedia);                       // over a film or project: open ring with a play triangle
    dot.classList.toggle('hide', !onMedia && !!(t.closest && t.closest('iframe, video[controls]')));
    dot.classList.toggle('big', !onMedia && !!(t.closest && t.closest('a, button, label, [role=button], input[type=submit]')));
    dot.classList.toggle('text', !!(t.closest && t.closest('input[type=text], input[type=email], input[type=password], textarea')));
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('mouseleave', function () { dot.classList.remove('on'); shown = false; });
  addEventListener('mousedown', function () { dot.classList.add('press'); });
  addEventListener('mouseup', function () { dot.classList.remove('press'); });
})();
