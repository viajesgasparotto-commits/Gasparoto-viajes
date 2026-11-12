/* Carrusel de comentarios de Google: flechas, "Leer más" solo donde el texto se corta. */
(function(){
  document.querySelectorAll('[data-gvr]').forEach(function(w){
    var l=w.querySelector('.gvr-list'),p=w.querySelector('.gvr-prev'),n=w.querySelector('.gvr-next');if(!l)return;
    var nav=function(){var max=l.scrollWidth-l.clientWidth-2;p.hidden=l.scrollLeft<=2;n.hidden=l.scrollLeft>=max||max<=0};
    var more=function(){l.querySelectorAll('.gvr-card').forEach(function(c){
      var t=c.querySelector('.gvr-txt'),b=c.querySelector('.gvr-more');if(!t||!b||c.classList.contains('is-open'))return;
      b.hidden=!(t.scrollHeight>t.clientHeight+1)})};
    l.querySelectorAll('.gvr-more').forEach(function(b){b.addEventListener('click',function(){
      var c=b.closest('.gvr-card'),o=c.classList.toggle('is-open');b.textContent=o?'Leer menos':'Leer más';b.setAttribute('aria-expanded',o);
      if(!o)more();nav()})});
    var go=function(d){l.scrollBy({left:d*Math.max(l.clientWidth*.85,240),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})};
    p.addEventListener('click',function(){go(-1)});n.addEventListener('click',function(){go(1)});
    l.addEventListener('scroll',nav,{passive:true});
    var t;addEventListener('resize',function(){clearTimeout(t);t=setTimeout(function(){more();nav()},120)});
    more();nav();
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){more();nav()});
  });
})();
