// Film pages: click the poster to see it full screen. Click anywhere, press Esc, or use the close button to return.
(function () {
  var img = document.querySelector('.film-body .poster > img'); if (!img) return;
  var ov = null, last = null;
  function big(src) { return src.replace(/format=\d+w/, 'format=2500w'); }
  function build() {
    ov = document.createElement('div'); ov.className = 'pz'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Poster, full screen');
    ov.innerHTML = '<button type="button" class="pz-x" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20" stroke="currentColor" stroke-width="2" fill="none"/></svg></button><img alt="">';
    document.body.appendChild(ov);
    ov.addEventListener('click', close);
  }
  function open() {
    if (!ov) build();
    last = document.activeElement;
    var im = ov.querySelector('img'); im.src = big(img.currentSrc || img.src); im.alt = img.alt || '';
    ov.hidden = false; document.documentElement.classList.add('pz-open');
    requestAnimationFrame(function () { ov.classList.add('on'); });
    ov.querySelector('.pz-x').focus();
  }
  function close() {
    if (!ov || ov.hidden) return;
    ov.classList.remove('on'); document.documentElement.classList.remove('pz-open');
    setTimeout(function () { ov.hidden = true; }, 350);
    if (last && last.focus) last.focus();
  }
  img.setAttribute('tabindex', '0'); img.setAttribute('role', 'button'); img.setAttribute('aria-label', (img.alt || 'Poster') + ', view full screen');
  img.classList.add('pz-trigger');
  img.addEventListener('click', open);
  img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
