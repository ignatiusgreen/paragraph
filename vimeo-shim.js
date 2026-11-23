/* Plays the Dropbox version of a site video when one is set in the portal (Review Portal > Website Videos).
   Every player on the site is a Vimeo iframe driven with Vimeo's postMessage API. This script swaps such an iframe for a
   native <video> that answers the same messages, so the other scripts keep working untouched. If a Dropbox file
   fails to load, the original Vimeo iframe is put back. */
(function () {
  var ORIGIN = 'https://player.vimeo.com', KEY = 'pg_sv1';
  var map = {"756516382":"https://www.dropbox.com/scl/fi/906s2uqq9gwbrthk3g0im/Uber-Uberville-756516382.mp4?rlkey=kx2fhs610yx1gnxebia0r4eoy&raw=1","756515532":"https://www.dropbox.com/scl/fi/uo95bq525rtx22yxg318y/Toyota-Kayak-756515532.mp4?rlkey=hpe7fpo8zeq30gvdmzl4042j8&raw=1","756515491":"https://www.dropbox.com/scl/fi/obm0b5q2pg3whs6d8qdhs/Toyota-Keep-It-Wild-756515491.mp4?rlkey=ke0pih0yh5v5okj2yaal34en9&raw=1","756515469":"https://www.dropbox.com/scl/fi/cljyaockfui3o6r95dz2n/Trifexis-Going-Out-756515469.mp4?rlkey=tzvtyex6n1i5q9x9e3rghjyks&raw=1","1240465146":"https://www.dropbox.com/scl/fi/rlgaiojuuedj7izh0c2an/What-s-Better-Than-Living-Like-a-King-More-to-the-Story-1240465146.mp4?rlkey=smnkl8n6b2d8d8kzdqhvsobrr&raw=1","756516594":"https://www.dropbox.com/scl/fi/4gxnfoipug1d191ep6jn2/Uber-Khalid-s-Road-to-the-Grammys-756516594.mp4?rlkey=fvd4ljlytzjq2u35xkxovoyfc&raw=1","756516488":"https://www.dropbox.com/scl/fi/dxqlrqyngxvzgnhqf64qj/Uber-Julia-Michaels-Road-to-the-Grammys-756516488.mp4?rlkey=wnhdzdwey0hn3n45xznkzpcee&raw=1","756516463":"https://www.dropbox.com/scl/fi/t1s067utg03gze6woh6zd/Uber-Uberville-Winter-756516463.mp4?rlkey=nn3zt4afi4j8mwaoa4oqnaao0&raw=1","1240465147":"https://www.dropbox.com/scl/fi/joqk3tflricc7dtsipwd2/Who-Were-the-Zealots-of-Jesus-Day-More-to-the-Story-1240465147.mp4?rlkey=tjaykboo7hpv4c30eaf3vpnxx&raw=1","882622635":"https://www.dropbox.com/scl/fi/msdm1kxnvn91b5rv67f3l/The-Pez-Outlaw-Official-Trailer-882622635.mp4?rlkey=7ih60kay9ubzgjrbcdii4rrlw&raw=1","920304570":"https://www.dropbox.com/scl/fi/zomckofpghy7wp3lpysji/UBER-Lil-Uzi-Vert-s-Road-to-the-Grammys-920304570.mp4?rlkey=tne62km27ceu1sivykfe6zw8n&raw=1","72383349":"https://www.dropbox.com/scl/fi/9n0m1s1hs927nh1kuks3n/Goal-Zero-Freedom-with-Alex-Honnold-72383349.mp4?rlkey=3l1s3xpoxjthaymtsu3s77g14&raw=1","81649466":"https://www.dropbox.com/scl/fi/xc12jy9slc2sdbqormdn4/Purina-Stephen-Puppi-Burma-81649466.mp4?rlkey=ba0ji4qpdh74jhbsuc2jrg16h&raw=1","75517408":"https://www.dropbox.com/scl/fi/ofgo4w75m2kz8tqhqt9y6/purina_-_pets_at_work_-_evan_v1.mp4?rlkey=dhi5jxfskomj2jv2mpd6md17f&raw=1","756460066":"https://www.dropbox.com/scl/fi/umrvk28f9venufck4qs8w/Forest-Stewardship-Council-Anthem-756460066.mp4?rlkey=k5w2belm5u8za9xh8et03s4gs&raw=1","77801760":"https://www.dropbox.com/scl/fi/8hlel5v9wxeae5d4pcte3/Assassins-Creed-III-Fan-Video-77801760.mp4?rlkey=wo2pitkuj5m7crsq0px59mozc&raw=1","41106764":"https://www.dropbox.com/scl/fi/h9siz0da0540ba4sfli6a/Powerbar-Anthem-756504945.mp4?rlkey=4ggpv1nawikj550lye1g0aud1&raw=1","756437594":"https://www.dropbox.com/scl/fi/eqtcu3gyle8by97kgj7u0/3M-Thinsulate-756437594.mp4?rlkey=k7czgbe97dwwjts5v13ood5d6&raw=1","1240465148":"https://www.dropbox.com/scl/fi/5f0lbcxvkqekqieflh0gp/How-Did-Rome-Maintain-Power-More-to-the-Story-1240465148.mp4?rlkey=ymu5upq7rz4psx16l9qy4ndf7&raw=1","998808760":"https://www.dropbox.com/scl/fi/pfiwnnti9wotjhj2aax6k/Royal-Caribbean-Safety-Film-Trailer-998808760.mp4?rlkey=hjbjyylmb38g569wcvszrswk2&raw=1","998756130":"https://www.dropbox.com/scl/fi/9tpwo4ou7c5iyczfiukm5/Hancock-Health-Network-998756130.mp4?rlkey=dx90s1o99fcfd84rvu1ngx9zb&raw=1","1030184426":"https://www.dropbox.com/scl/fi/jgacyqwbzn37xm371g28v/Mississippi-River-Styx-Trailer-1030184426.mp4?rlkey=gjmdrvoqwadyj30obf18ka9kw&raw=1","998835219":"https://www.dropbox.com/scl/fi/m6sivq4p855p7oqiu7saz/Hancock-Health-Mayo-Clinic-998835219.mp4?rlkey=hti8mpl6dx7o86f2od3igtnck&raw=1","803251278":"https://www.dropbox.com/scl/fi/u9mi8h7qz88fna83d8ihy/Nike-You-Got-Next-LEBRON-803251278.mp4?rlkey=3d9mskidod8qnziizdhdtczvi&raw=1","802890593":"https://www.dropbox.com/scl/fi/egnm35mzh6vvm96gt0cpp/AirTable-The-Launch-802890593.mp4?rlkey=cv2jvrrvgguc8kzqbdh0aedsg&raw=1","802890501":"https://www.dropbox.com/scl/fi/634fkixd6ph5o2mancjnp/AirTable-One-Good-Chair-802890501.mp4?rlkey=3ku2akanio0gwkyi26rhtfs7z&raw=1","802890453":"https://www.dropbox.com/scl/fi/ccwvoecu9kckhu5iczm0v/AirTable-Content-Powerhouse-802890453.mp4?rlkey=ke1e59xq4kwlopep7quq262jo&raw=1","803256201":"https://www.dropbox.com/scl/fi/7q4iz6sdtivix5ix3xv7k/Banfield-Love-at-First-Sight-803256201.mp4?rlkey=emwehu4k3p5h7qjkvk8qswhb6&raw=1","803253074":"https://www.dropbox.com/scl/fi/e79lzu14vk0fozs075h5g/RedBull-Leader-in-the-Lane-Teaser-803253074.mp4?rlkey=w9gkpqxguufm3vddktxvegieg&raw=1","803252869":"https://www.dropbox.com/scl/fi/rvo4t2bmr423ffrr8pa15/Purina-DogChow-Bubbles-803252869.mp4?rlkey=p93qyf0ukur6u0x1ft8pek07v&raw=1","884100386":"https://www.dropbox.com/scl/fi/ukrdi45bv8ygxekvckqkj/Social-Animals-Trailer-884100386.mp4?rlkey=4w44i926few6r21g1u60q3quo&raw=1","840215065":"https://www.dropbox.com/scl/fi/vgwsnxv5ixxwuo8pjvq32/Purina-Case-Study-840215065.mp4?rlkey=e910h9r6pjdcq773ff64xhsct&raw=1","803261256":"https://www.dropbox.com/scl/fi/8w1yzffxj8emdratz7xw2/Banfield-Therapy-803261256.mp4?rlkey=nn6kd8h9vzmjvbikqkoeb6dw3&raw=1","915712865":"https://www.dropbox.com/scl/fi/pbtw6lcw19dk73d8xxn8j/DICKWEED-Trailer-915712865.mp4?rlkey=xyun8g35zcup06e50vfqs1md6&raw=1","902791169":"https://www.dropbox.com/scl/fi/nieqc8235k8i9z1n3asi6/BITCONNED-Official-Trailer-902791169.mp4?rlkey=58hwayp3yuwm1o3vaxydmvcn4&raw=1","756506134":"https://www.dropbox.com/scl/fi/gyqh401xaenmxp85swr9j/Progresso-Hometown-ep.-05-756506134.mp4?rlkey=i4adt4bgsgy9u1xc4cua9g8q5&raw=1","756506004":"https://www.dropbox.com/scl/fi/evw5n1k5uytz3v8652qj4/Progresso-The-Clam-Catchers-Episode-04-756506004.mp4?rlkey=z92rsqpb0ba1x9vnljotbs6h2&raw=1","756508623":"https://www.dropbox.com/scl/fi/4bpct3naorvc2ultq4mjd/Purina-Healthy-Years-756508623.mp4?rlkey=6v5wfy86yp77b5ax2zlcs30wf&raw=1","756507833":"https://www.dropbox.com/scl/fi/5znpnkur32l8853oc572v/Purina-Aging-756507833.mp4?rlkey=vax9xwsqdh5prhptj8fage4g4&raw=1","756514677":"https://www.dropbox.com/scl/fi/3xtd24kix9r158k88jk94/Stanton-Optical-Book-Club-756514677.mp4?rlkey=3skg5wqeu6iogihhc4nyv3o4b&raw=1","756513931":"https://www.dropbox.com/scl/fi/xphv18bd84c4d6g7elh0m/Ride-Not-A-Phone-Booth-756513931.mp4?rlkey=z1okpuvo1jkggh12a12w16kuh&raw=1","756964338":"https://www.dropbox.com/scl/fi/6irzo4zzszsvydvznri3w/Purina-Petfinder.mov-756964338.mp4?rlkey=bp46hupbsw78s1sn2056ig97s&raw=1","149922867":"https://www.dropbox.com/scl/fi/4utae9fhpefqors8slppr/Stanton-Optical-Date-Night-149922867.mp4?rlkey=z4ufnoitqb4n6fzax1ph9cnur&raw=1","756505806":"https://www.dropbox.com/scl/fi/gybxpjqauvjd9f654dyeo/Progresso-The-Farm-ep.-03-756505806.mp4?rlkey=hvzpyo8qhx1q3i0azb6ld1zco&raw=1","756476489":"https://www.dropbox.com/scl/fi/18pwa5dmmoyvbprfkgo93/Nike-Pro-Designs-756476489.mp4?rlkey=r83020wfmcaz71u8lrj3mki6b&raw=1","756437973":"https://www.dropbox.com/scl/fi/5g1xqh044bmmhqoygyfor/AARP-Ace-Your-Retirement-Travel-756437973.mp4?rlkey=n6focvrx9q0rzyt6qo3ud28dm&raw=1","77843261":"https://www.dropbox.com/scl/fi/8d32kvnqxd9xpwir2uik9/Purina-Julian-Max-77843261.mp4?rlkey=sl611pvut2f0b27eurniciqip&raw=1","756437888":"https://www.dropbox.com/scl/fi/gl4a9bqmdkzet0m3s7on3/AARP-Ace-Your-Retirement-House-756437888.mp4?rlkey=rmtnmgjflpjsfmlup1drvwjl9&raw=1","755576988":"https://www.dropbox.com/scl/fi/shlzlg881waep5d5azbha/NIKE-Sarah-Reinertsen-My-Crazy-Dream-755576988.mp4?rlkey=nmcfpojun81ach9ga9sz32wjl&raw=1","756450173":"https://www.dropbox.com/scl/fi/nhj6khavipm1movpp320i/Brightcove-Play-756450173.mp4?rlkey=u3p0qfcxcue2uqpo4d2n37xmn&raw=1","756471529":"https://www.dropbox.com/scl/fi/r1uiyazxwrleb81hyihxn/Google-Buurtzorg-756471529.mp4?rlkey=61dr7ocioq9hwr7apnupzjtnv&raw=1","756476179":"https://www.dropbox.com/scl/fi/prtau7eaxjn0otg820bsi/Nike-Coach-Smith-756476179.mp4?rlkey=7j1ricwh3suc6mx6zlb7hagef&raw=1","756435121":"https://www.dropbox.com/scl/fi/x85rswbr3il6qj90guqal/Banfield-Late-Adopters-756435121.mp4?rlkey=aoagy85nk8dihxl8362y7rvsl&raw=1","756499635":"https://www.dropbox.com/scl/fi/50ny26vmzqezsjgddozlo/Panini-KD-756499635.mp4?rlkey=br3jbwr984y3ke9iddqfph1ci&raw=1","756503866":"https://www.dropbox.com/scl/fi/w2dkqxjkvsrh3anwwrtd7/PayPal-Daymond-John-756503866.mp4?rlkey=at6x41zydyvm4ya3noiy3m8sj&raw=1","756476332":"https://www.dropbox.com/scl/fi/a16t6x7imsmzrzoz6ltzn/Nike-Mamba-League-756476332.mp4?rlkey=lysor8r1iq07moe8kvzvfzs9e&raw=1","756499538":"https://www.dropbox.com/scl/fi/be8swldynq4gu0h5ekraw/Panini-Kobe-756499538.mp4?rlkey=1vhhfiqzk3ofuhm406fc3zino&raw=1","756515017":"https://www.dropbox.com/scl/fi/tnfxfqwrk3imxrr1a589d/Trifexis-Around-the-House-756515017.mp4?rlkey=ur2ngtbxoxelzuzhdn3h9cezi&raw=1","756514007":"https://www.dropbox.com/scl/fi/1i4cd75i8cpmmndf0v8rc/Ride-How-to-Properly-Shut-a-Door-756514007.mp4?rlkey=0pb7iy4628t2lkcpvl470pgix&raw=1"};
  try { var c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && typeof c === 'object') map = c; } catch (e) {}
  try {
    fetch('/api/site-videos').then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.map) { map = j.map; try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) {} }
    }).catch(function () {});
  } catch (e) {}

  var desc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
  if (!desc || !desc.set) return;
  function idOf(u) { var m = /player\.vimeo\.com\/video\/(\d+)/.exec(String(u || '')); return m && m[1]; }

  var css = document.createElement('style');
  css.textContent =
    '.vid video.vsh{position:absolute;top:50%;left:50%;width:max(100cqw,177.78cqh);height:max(56.25cqw,100cqh);transform:translate(-50%,-50%);border:0;pointer-events:none;object-fit:cover}' +
    '.player video.vsh,.a-media video.vsh{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;cursor:pointer}' +
    '.lb-frame video.vsh{width:100%;height:100%;border:0;background:#000}' +
    '.hs .vid video.vsh{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border:0;transform:scale(var(--zoom,1.15));transform-origin:center}' +
    '.home-alt .hs .vid video.vsh{transform:none}';
  (document.head || document.documentElement).appendChild(css);

  function emit(f, name, data) {
    var e = new Event('message');
    var msg = JSON.stringify(data === undefined ? { event: name } : { event: name, data: data });
    Object.defineProperty(e, 'data', { value: msg });
    Object.defineProperty(e, 'origin', { value: ORIGIN });
    Object.defineProperty(e, 'source', { value: f.__fake });
    window.dispatchEvent(e);
  }

  // Called when an iframe that would load a Vimeo video is given a src and a Dropbox file exists for it
  function emulate(f, src, id) {
    var q = {}; try { new URL(src, location.href).searchParams.forEach(function (v, k) { q[k] = v; }); } catch (e) {}
    var subs = {}, v = null, readyDone = false, dead = false;
    var fake = { postMessage: function (raw) {
      var m; try { m = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return; }
      if (!m || !m.method || !v) return;
      try {
        switch (m.method) {
          case 'play': var p = v.play(); if (p && p.catch) p.catch(function () { if (!v.muted) { v.muted = true; v.play().catch(function () {}); } }); break;
          case 'pause': v.pause(); break;
          case 'setVolume': v.volume = Math.max(0, Math.min(1, +m.value || 0)); if (+m.value === 0) v.muted = true; break;
          case 'setMuted': v.muted = !!m.value; break;
          case 'setCurrentTime': v.currentTime = +m.value || 0; break;
          case 'setLoop': v.loop = !!m.value; break;
          case 'addEventListener': subs[m.value] = true; break;
          case 'removeEventListener': delete subs[m.value]; break;
        }
      } catch (e) {}
    } };
    f.__fake = fake;
    try { Object.defineProperty(f, 'contentWindow', { configurable: true, get: function () { return fake; } }); } catch (e) {}

    var bg = q.background === '1' || q.muted === '1';
    v = document.createElement('video');
    v.className = 'vsh'; v.src = map[id]; v.preload = 'auto'; v.playsInline = true; v.setAttribute('playsinline', '');
    v.disablePictureInPicture = bg;
    if (bg || q.muted === '1') v.muted = true;
    if (q.loop === '1' || bg) v.loop = true;
    if (q.controls !== '0' && !bg) v.controls = true;
    if (f.title) v.title = f.title;
    if (f.getAttribute('aria-hidden')) v.setAttribute('aria-hidden', f.getAttribute('aria-hidden'));
    v.tabIndex = f.tabIndex;
    f.__video = v; f.__orig = src;

    v.addEventListener('loadedmetadata', function () {
      if (readyDone) return; readyDone = true;
      emit(f, 'ready'); f.dispatchEvent(new Event('load'));
      if (q.autoplay === '1') { var p = v.play(); if (p && p.catch) p.catch(function () { v.muted = true; v.play().catch(function () {}); }); }
    });
    function prog() { var d = v.duration || 0, t = v.currentTime || 0, data = { seconds: t, percent: d ? t / d : 0, duration: d };
      if (subs.timeupdate) emit(f, 'timeupdate', data); if (subs.playProgress) emit(f, 'playProgress', data); }
    v.addEventListener('timeupdate', prog);
    v.addEventListener('play', function () { if (subs.play) emit(f, 'play'); });
    v.addEventListener('pause', function () { if (subs.pause && !v.ended) emit(f, 'pause'); });
    v.addEventListener('ended', function () { if (subs.ended) emit(f, 'ended'); if (subs.finish) emit(f, 'finish'); });
    v.addEventListener('error', function () {   // Dropbox file unavailable: put the real Vimeo player back
      if (dead) return; dead = true;
      delete f.contentWindow; f.__video = null;
      var parent = v.parentNode;
      if (parent) { f.style.display = ''; parent.insertBefore(f, v); v.remove(); }
      desc.set.call(f, src);
    });
  }

  Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
    configurable: true, enumerable: true, get: desc.get,
    set: function (value) {
      var id = idOf(value);
      if (id && map[id] && !this.__video) { emulate(this, String(value), id); return; }
      desc.set.call(this, value);
    }
  });

  // An emulated iframe never loads: when it is placed in the page, its video takes its spot (and is stopped when removed)
  function place(f) { var v = f.__video; if (v && f.parentNode && !v.parentNode) { f.parentNode.insertBefore(v, f); f.style.display = 'none'; f.removeAttribute('src'); } }
  function sweep(n) {
    if (n.nodeType !== 1) return;
    if (n.tagName === 'IFRAME') place(n); else [].forEach.call(n.querySelectorAll ? n.querySelectorAll('iframe') : [], place);
  }
  function drop(n) {
    if (n.nodeType !== 1) return;
    var vs = n.tagName === 'VIDEO' && n.classList.contains('vsh') ? [n] : [].slice.call(n.querySelectorAll ? n.querySelectorAll('video.vsh') : []);
    vs.forEach(function (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} });
  }
  new MutationObserver(function (list) {
    list.forEach(function (m) {
      [].forEach.call(m.addedNodes, sweep);
      [].forEach.call(m.removedNodes, function (n) { if (!(n.tagName === 'VIDEO' && n.__replaced)) drop(n); });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
