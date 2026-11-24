// Archive project pages: each video block becomes a cover that opens the same black full-screen player (sound, time bar, play/pause) used across the Paragraph site.
(function(){
  var T={"41106764":{"t":"/img/vt/41106764.jpg","d":61},"72383349":{"t":"/img/vt/72383349.jpg","d":30},"75517408":{"t":"/img/vt/75517408.jpg","d":56},"77801760":{"t":"/img/vt/77801760.jpg","d":120},"77843261":{"t":"/img/vt/77843261.jpg","d":60},"81649466":{"t":"/img/vt/81649466.jpg","d":159},"149922867":{"t":"/img/vt/149922867.jpg","d":30},"755576988":{"t":"/img/vt/755576988.jpg","d":123},"756435121":{"t":"/img/vt/756435121.jpg","d":31},"756437594":{"t":"/img/vt/756437594.jpg","d":36},"756437888":{"t":"/img/vt/756437888.jpg","d":30},"756437973":{"t":"/img/vt/756437973.jpg","d":30},"756450173":{"t":"/img/vt/756450173.jpg","d":92},"756460066":{"t":"/img/vt/756460066.jpg","d":74},"756471529":{"t":"/img/vt/756471529.jpg","d":128},"756476179":{"t":"/img/vt/756476179.jpg","d":70},"756476332":{"t":"/img/vt/756476332.jpg","d":117},"756476489":{"t":"/img/vt/756476489.jpg","d":85},"756499538":{"t":"/img/vt/756499538.jpg","d":53},"756499635":{"t":"/img/vt/756499635.jpg","d":106},"756503866":{"t":"/img/vt/756503866.jpg","d":60},"756505806":{"t":"https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731527144738-OJ367GD6K7O8Q56QBTEW/Progresso_hometown.jpg?format=750w","d":0},"756506004":{"t":"/img/vt/756506004.jpg","d":118},"756506134":{"t":"/img/vt/756506134.jpg","d":106},"756507833":{"t":"/img/vt/756507833.jpg","d":14},"756508623":{"t":"/img/vt/756508623.jpg","d":14},"756513931":{"t":"/img/vt/756513931.jpg","d":39},"756514007":{"t":"/img/vt/756514007.jpg","d":50},"756514677":{"t":"/img/vt/756514677.jpg","d":30},"756515017":{"t":"/img/vt/756515017.jpg","d":65},"756515469":{"t":"/img/vt/756515469.jpg","d":75},"756515491":{"t":"/img/vt/756515491.jpg","d":6},"756515532":{"t":"/img/vt/756515532.jpg","d":6},"756516382":{"t":"/img/vt/756516382.jpg","d":22},"756516463":{"t":"/img/vt/756516463.jpg","d":29},"756516488":{"t":"/img/vt/756516488.jpg","d":30},"756516594":{"t":"/img/vt/756516594.jpg","d":60},"756964338":{"t":"/img/vt/756964338.jpg","d":14},"802890453":{"t":"/img/vt/802890453.jpg","d":15},"802890501":{"t":"/img/vt/802890501.jpg","d":15},"802890593":{"t":"/img/vt/802890593.jpg","d":15},"803251278":{"t":"/img/vt/803251278.jpg","d":301},"803252869":{"t":"/img/vt/803252869.jpg","d":15},"803253074":{"t":"/img/vt/803253074.jpg","d":31},"803256201":{"t":"/img/vt/803256201.jpg","d":30},"803261256":{"t":"/img/vt/803261256.jpg","d":30},"840215065":{"t":"/img/vt/840215065.jpg","d":113},"920304570":{"t":"/img/vt/920304570.jpg","d":62},"998756130":{"t":"/img/vt/998756130.jpg","d":30},"998808760":{"t":"/img/vt/998808760.jpg","d":67},"998835219":{"t":"/img/vt/998835219.jpg","d":29},"1240465146":{"t":"/img/vt/1240465146.jpg","d":251},"1240465147":{"t":"/img/vt/1240465147.jpg","d":202},"1240465148":{"t":"/img/vt/1240465148.jpg","d":268}};
  function fix(w){
    var raw=w.getAttribute('data-html')||'';var d=new DOMParser().parseFromString(raw,'text/html');var f=d.querySelector('iframe');
    if(!f){f=w.querySelector('iframe');} if(!f)return; var src=f.getAttribute('src');if(!src)return;
    var m=src.match(/\/video\/(\d+)/),t=m&&T[m[1]],title=f.getAttribute('title')||'Video';
    src=src.replace(/&amp;/g,'&').replace(/([?&])(app_id|muted|autopause)=[^&]*/g,'').replace(/\?&/,'?').replace(/&&/g,'&');
    w.setAttribute('data-vc','1');
    function build(){
      [].forEach.call(w.children,function(c){if(!c.classList||!c.classList.contains('vc'))c.remove();});
      if(w.querySelector('.vc'))return;
      var b=document.createElement('button');b.type='button';b.className='vc';b.setAttribute('data-lb','');b.setAttribute('data-src',src);b.setAttribute('data-title',title);b.setAttribute('aria-label','Play '+title);
      var mm=src.match(/\/video\/(\d+)/),ct=window.__pgThumbs&&mm&&window.__pgThumbs[mm[1]];b.innerHTML=(ct||t?'<img src="'+(ct||t.t)+'" alt="">':'')+'<span class="vc-icon" aria-hidden="true"><svg viewBox="0 0 66 98"><polygon points="1.5,1.5 64.5,49 1.5,96.5" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>';
      w.appendChild(b);
    }
    build();
    new MutationObserver(function(){ if(w.querySelector('iframe')||!w.querySelector('.vc'))build(); }).observe(w,{childList:true});
  }
  [].forEach.call(document.querySelectorAll('.sqs-video-wrapper[data-provider-name="Vimeo"]'),fix);
  // a thumbnail chosen in the portal replaces the default still
  fetch('/api/site-videos').then(function(r){return r.json();}).then(function(j){
    if(!j||!j.thumbs)return; window.__pgThumbs=j.thumbs;
    [].forEach.call(document.querySelectorAll('.vc[data-src]'),function(b){var m=b.getAttribute('data-src').match(/\/video\/(\d+)/),u=m&&j.thumbs[m[1]],im=b.querySelector('img');if(u&&im)im.src=u;});
  }).catch(function(){});
})();
