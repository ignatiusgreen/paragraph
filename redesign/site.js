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
    function loadVideo(s) {
      if (reduce || s.dataset.loaded) return; s.dataset.loaded = 1;
      var box = s.querySelector('.vid'), f = document.createElement('iframe');
      f.src = s.dataset.v; f.allow = 'autoplay; fullscreen'; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      f.onload = function () { setTimeout(function () { box.classList.add('ready'); }, 900); };
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
})();
