// Filtro de listados: buscador + duración. Mejora progresiva: sin JS se ven todas las tarjetas.
(function(){var b=document.querySelector("[data-gv-filter]");if(!b)return;
var cs=[].slice.call(document.querySelectorAll("[data-dur]")),q=b.querySelector("[data-q]"),d=b.querySelector("[data-d]"),n=b.querySelector("[data-n]");
var norm=function(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")};
function run(){var t=norm(q.value.trim()),r=d.value,c=0;cs.forEach(function(e){var h=+e.dataset.dur,ok=(!t||norm(e.textContent).indexOf(t)>-1)&&(!r||(r==="s"&&h>0&&h<=4)||(r==="m"&&h>=5&&h<=7)||(r==="l"&&h>=24));e.hidden=!ok;if(ok)c++});
n.textContent=(t||r)?c+(c===1?(n.getAttribute("data-one")||" experiencia"):(n.getAttribute("data-many")||" experiencias")):"";}
q.addEventListener("input",run);d.addEventListener("change",run);})();
