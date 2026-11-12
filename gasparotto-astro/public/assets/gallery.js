/* Galería de fichas: visor a pantalla completa con flechas, teclado, deslizar, miniaturas y video. */
(function(){
  if(window.__gvg)return;window.__gvg=1;
  var G=document.querySelectorAll('[data-gvg]');if(!G.length)return;
  var lang=(document.documentElement.lang||'es').slice(0,2);
  var T={es:{close:'Cerrar galería',prev:'Foto anterior',next:'Foto siguiente',of:' de ',go:'Ir a la foto '},
         pt:{close:'Fechar galeria',prev:'Foto anterior',next:'Próxima foto',of:' de ',go:'Ir para a foto '},
         en:{close:'Close gallery',prev:'Previous photo',next:'Next photo',of:' of ',go:'Go to photo '}}[lang]||null;
  if(!T)T={close:'Close gallery',prev:'Previous photo',next:'Next photo',of:' of ',go:'Go to photo '};
  var P={x:'<path d="M6 6l12 12M18 6L6 18"/>',l:'<path d="M15 5l-7 7 7 7"/>',r:'<path d="M9 5l7 7-7 7"/>',p:'<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>'};
  var ico=function(k){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+P[k]+'</svg>'};
  var dlg,stage,cnt,th,prev,next,items=[],cur=0,opener=null,title='';
  var isVid=function(u){return /\.(mp4|webm|mov)(\?|$)/i.test(u)};

  function build(){
    dlg=document.createElement('dialog');dlg.className='gvl';dlg.setAttribute('aria-label',title||'Galería');
    dlg.innerHTML='<div class="gvl-top"><span class="gvl-cnt" aria-live="polite"></span><button type="button" class="gvl-b gvl-x" aria-label="'+T.close+'">'+ico('x')+'</button></div>'
      +'<div class="gvl-stage"><button type="button" class="gvl-b gvl-nav gvl-prev" aria-label="'+T.prev+'">'+ico('l')+'</button><button type="button" class="gvl-b gvl-nav gvl-next" aria-label="'+T.next+'">'+ico('r')+'</button></div>'
      +'<div class="gvl-th" role="tablist"></div>';
    document.body.appendChild(dlg);
    stage=dlg.querySelector('.gvl-stage');cnt=dlg.querySelector('.gvl-cnt');th=dlg.querySelector('.gvl-th');
    prev=dlg.querySelector('.gvl-prev');next=dlg.querySelector('.gvl-next');
    dlg.querySelector('.gvl-x').onclick=close;prev.onclick=function(){go(cur-1)};next.onclick=function(){go(cur+1)};
    dlg.addEventListener('click',function(e){if(e.target===dlg||e.target===stage)close()});
    dlg.addEventListener('cancel',function(e){e.preventDefault();close()});
    dlg.addEventListener('keydown',function(e){
      if(e.key==='ArrowLeft'){e.preventDefault();go(cur-1)}else if(e.key==='ArrowRight'){e.preventDefault();go(cur+1)}
      else if(e.key==='Home'){e.preventDefault();go(0)}else if(e.key==='End'){e.preventDefault();go(items.length-1)}});
    // deslizar con el dedo o el mouse
    var x0=null,y0=0;
    stage.addEventListener('pointerdown',function(e){if(e.target.closest('button,video'))return;x0=e.clientX;y0=e.clientY});
    stage.addEventListener('pointerup',function(e){if(x0===null)return;var dx=e.clientX-x0,dy=e.clientY-y0;x0=null;
      if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3)go(cur+(dx<0?1:-1))});
    stage.addEventListener('pointercancel',function(){x0=null});
  }

  function media(i){
    var it=items[i],el;
    if(it.v){el=document.createElement('video');el.controls=true;el.playsInline=true;el.autoplay=true;el.src=it.u;el.setAttribute('aria-label',it.alt)}
    else{el=document.createElement('img');el.src=it.u;el.alt=it.alt;el.draggable=false}
    return el;
  }
  function go(i){
    var n=items.length;if(!n)return;cur=(i%n+n)%n;
    var old=stage.querySelector('img,video');if(old){if(old.pause)old.pause();old.remove()}
    stage.appendChild(media(cur));
    cnt.textContent=(cur+1)+T.of+n;
    prev.hidden=next.hidden=n<2;
    [].forEach.call(th.children,function(b,k){var on=k===cur;b.setAttribute('aria-current',on?'true':'false');b.setAttribute('aria-selected',on?'true':'false');if(on)b.scrollIntoView({block:'nearest',inline:'center'})});
    // precarga de las vecinas
    [cur-1,cur+1].forEach(function(k){var j=(k%n+n)%n,it=items[j];if(!it.v&&j!==cur){var im=new Image();im.src=it.u}});
  }
  function open(list,i,t){
    title=t;items=list;if(!dlg)build();dlg.setAttribute('aria-label',title||'Galería');
    th.innerHTML='';
    items.forEach(function(it,k){var b=document.createElement('button');b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-label',T.go+(k+1));
      b.innerHTML=it.v?'<span class="gvl-vt">'+ico('p')+'</span>':'<img src="'+it.u.replace(/"/g,'&quot;')+'" alt="" loading="lazy" decoding="async">';
      b.onclick=function(){go(k)};th.appendChild(b)});
    th.hidden=items.length<2;
    opener=document.activeElement;
    if(!dlg.open)dlg.showModal();document.body.classList.add('gvl-lock');go(i);
    dlg.querySelector('.gvl-x').focus();
  }
  function close(){
    if(!dlg||!dlg.open)return;var v=stage.querySelector('video');if(v)v.pause();
    dlg.close();document.body.classList.remove('gvl-lock');
    if(opener&&opener.focus)opener.focus();
  }

  [].forEach.call(G,function(g){
    var tiles=[].slice.call(g.querySelectorAll('[data-gvi]')),title=g.getAttribute('data-title')||'';
    var list=tiles.map(function(a){return{u:a.getAttribute('href'),v:a.hasAttribute('data-video'),alt:title}});
    tiles.forEach(function(a,k){a.addEventListener('click',function(e){
      if(e.metaKey||e.ctrlKey||e.shiftKey||e.button===1)return;
      if(typeof HTMLDialogElement==='undefined')return; // sin soporte: abre la foto en otra vista
      e.preventDefault();open(list,k,title)})});
  });
})();
