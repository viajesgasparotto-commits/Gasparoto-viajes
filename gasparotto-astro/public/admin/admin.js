const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const strip=h=>(new DOMParser().parseFromString(h||'','text/html').body.textContent||'').replace(/\s+/g,' ').trim();
const slugify=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
const PREFIX={posts:'/blog/',packages:'/paquetes/'};
const tipoOf=r=>{try{const k=JSON.parse(r.meta||'{}').kind;return k==='paquete'||k==='servicio'?k:''}catch{return ''}};
const agesOf=r=>String(r.child_ages||'').split(',').filter(x=>/^\d+$/.test(x.trim())).map(Number);
const paxTxt=r=>r.children>0?`${r.adults} adulto${r.adults===1?'':'s'} + ${r.children} niño${r.children===1?'':'s'}${agesOf(r).length?` (${agesOf(r).join(', ')} años)`:''}`:`${r.pax} pers.`;
const tipoLbl=r=>({paquete:'Paquete',servicio:'Servicio'})[tipoOf(r)]||'';
const IC={spark:'<path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',refresh:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1L2 12v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-7l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',receipt:'<path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',pen:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',box:'<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/>',tag:'<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 12V3h9l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',dollar:'<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',chart:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',ext:'<path d="M14 3h7v7M10 14L21 3M21 14v7H3V3h7"/>',logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',alert:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',x:'<path d="M18 6L6 18M6 6l12 12"/>',plus:'<path d="M12 5v14M5 12h14"/>',edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',eye:'<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',back:'<path d="M19 12H5M12 19l-7-7 7-7"/>',users:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.4-3.4 2.9-5.5 6-5.5s5.6 2.1 6 5.5"/><path d="M16 5.6a3.1 3.1 0 0 1 0 5.8M18 14.9c1.9.6 3.1 2.4 3.4 5.1"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',up:'<path d="M12 19V5M5 12l7-7 7 7"/>',down:'<path d="M12 5v14M19 12l-7 7-7-7"/>',star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'};
const ic=n=>`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n]||''}</svg>`;

let LIST_TIPO='';
let OPEN_ID=null,BR={brand:'',logo:'/assets/logo.png'},CATS={},SUBS={},ME={},tab=(location.hash||'#home').slice(1),DATA={posts:null,packages:null,categories:null},_d=false;
// Colores de marca (BRAND_* del servidor): se aplican como variables CSS; el CSS trae un respaldo por si la API no responde.
const applyBrand=b=>{const c=b&&b.colors;if(!c)return;const st=document.documentElement.style;[['primary','--gv-primary'],['accent','--gv-accent'],['cta','--gv-cta']].forEach(([k,v])=>{if(/^#[0-9a-f]{3,8}$/i.test(c[k]||''))st.setProperty(v,c[k])})};
Object.defineProperty(window,'dirty',{get(){return _d},set(v){_d=v;const e=document.getElementById('dirty');if(e)e.hidden=!v}});
const toast=(t,type='ok',ms=3800)=>{const m=$('#msg');m.className=type;m.innerHTML=ic(type==='err'?'x':'check')+'<span>'+t+'</span>';m.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>m.style.display='none',ms)};
function modal({title,body='',ok='Aceptar',cancel='Cancelar',danger=false,fields=[]}){return new Promise(res=>{
  const o=document.createElement('div');o.className='ov';
  o.innerHTML=`<div class="md" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h3>${esc(title)}</h3>${body}${fields.map(([k,l,v,ph,t])=>`<label>${esc(l)}${Array.isArray(t)?`<select data-f="${k}">${t.map(([o,ol])=>`<option value="${esc(o)}"${o===v?' selected':''}>${esc(ol)}</option>`).join('')}</select>`:t==='textarea'?`<textarea data-f="${k}" rows="4" placeholder="${esc(ph||'')}">${esc(v)}</textarea>`:`<input data-f="${k}" type="${t==='password'?'password':t==='email'?'email':t==='date'?'date':'text'}" value="${esc(v)}" placeholder="${esc(ph||'')}"${t==='password'?' autocomplete="new-password"':t==='email'?' autocomplete="off"':''}>`}</label>`).join('')}<div class="row" style="justify-content:flex-end;margin-top:14px">${cancel?`<button type="button" class="s" data-n>${cancel}</button>`:''}<button type="button" class="p ${danger?'dg':''}" data-y>${ok}</button></div></div>`;
  document.body.appendChild(o);($('input',o)||$('[data-y]',o)).focus();
  const val=()=>Object.fromEntries($$('[data-f]',o).map(i=>[i.dataset.f,i.value]));
  const done=v=>{o.remove();document.removeEventListener('keydown',kd);res(v)};
  const kd=e=>{if(e.key==='Escape')done(null);else if(e.key==='Enter'&&e.target.tagName==='INPUT')done(val())};
  document.addEventListener('keydown',kd);
  o.onclick=e=>{if(e.target===o||e.target.closest('[data-n]'))done(null);else if(e.target.closest('[data-y]'))done(val())}})}
const confirmBox=(title,msg,ok='Confirmar',danger)=>modal({title,body:`<p class="muted">${msg}</p>`,ok,danger}).then(v=>v!==null);
addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
const leave=async()=>!dirty||await confirmBox('Cambios sin guardar','Tenés cambios sin guardar. Si salís ahora se pierden.','Salir sin guardar',true);

async function api(path,method='GET',body){
  const r=await fetch('/api/'+path,{method,headers:{'content-type':'application/json'},body:body&&JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(r.status===401&&path!=='login'){login();throw 0}
  if(!r.ok){if(path!=='login')toast(esc(d.error||'Error'),'err');throw d}
  return d}
const load=async(k,force)=>{if(force||!DATA[k])DATA[k]=await api(k);return DATA[k]};
// Categorías: CATS[kind][slug] = fila (kind: 'posts' | 'packages'), en el orden definido en el panel
const refreshCats=async()=>{const rows=await load('categories',true);CATS={posts:{},packages:{}};SUBS={};rows.forEach(c=>{CATS[c.kind][c.slug]=c;if(c.kind==='packages')SUBS[c.slug]=c.subs||[]});return rows};
// Subcategorías de una categoría de paquetes (para el formulario): "Sin subcategoría" + las de esa categoría, en su orden.
const subOpts=(cat,cur)=>`<option value="">Sin subcategoría</option>`+(SUBS[cat]||[]).map(x=>`<option value="${esc(x.slug)}" ${x.slug===cur?'selected':''}>${esc(x.label)}</option>`).join('');
// Opciones con precio guardadas en meta.options: [nombre, precio, precio anterior, detalle]
// Políticas guardadas en meta.policies: [tipo, texto, opción a la que aplica ("" = todas), título propio (solo tipo "otra")]
const POLT=[['menores','Menores'],['cancelacion','Cancelación'],['documentacion','Documentación'],['pagos','Pagos'],['otra','Otra']];
const POLPH={menores:'Ej: Menores de 3 años sin butaca no pagan. Menores de 18 deben viajar con un adulto responsable y DNI o pasaporte.',cancelacion:'Ej: Cancelación sin cargo hasta 48 h antes. Después se cobra el 50 %.',documentacion:'Ej: Llevar pasaporte o DNI vigente. Los menores que viajan sin sus padres necesitan autorización.',pagos:'Ej: Seña del 30 % para confirmar; el saldo se paga el día del servicio.',otra:'Escribí la condición tal como la tiene que leer el cliente.'};
const polsOf=r=>{try{const o=JSON.parse(r.meta||'{}').policies;return Array.isArray(o)?o:[]}catch{return []}};
const optsOf=r=>{try{const o=JSON.parse(r.meta||'{}').options;return Array.isArray(o)?o:[]}catch{return []}};
// "R$ 1.234,50" → 1234.5 (misma regla que el servidor) para mostrar la opción más barata
const priceNum=t=>{const m=String(t||'').match(/\d[\d.,]*/);if(!m)return NaN;let n=m[0];if(/,\d{1,2}$/.test(n))n=n.replace(/\./g,'').replace(',','.');else if(!/^\d+\.\d{1,2}$/.test(n))n=n.replace(/[.,]/g,'');return Number(n)};
const catUrl=(kind,c)=>c.listing||(kind==='posts'?'/blog/categoria/':'/paquetes/categoria/')+c.slug+'/';
const catOpts=(kind,cur)=>{const l=Object.values(CATS[kind]||{}),def=cur||(kind==='posts'&&CATS.posts?.blog?'blog':l[0]?.slug);return l.map(c=>`<option value="${esc(c.slug)}" ${c.slug===def?'selected':''}>${esc(c.label)}</option>`).join('')};

/* ---------- SEO: reglas de revisión ---------- */
const full=t=>{const k=(BR.brand||'').split(/\s+/)[0].toLowerCase();return !k||t.toLowerCase().includes(k)?t:`${t} | ${BR.brand}`};
function issues(k,r){const o=[],add=(l,m)=>o.push({l,m});
  const t=full(r.seo_title||r.title||''),d=r.seo_description||strip(r.excerpt),body=strip(r.content);
  if(t.length>62)add('warn',`Título de Google largo (${t.length}/60): se corta`);
  if(!d)add('bad','Sin descripción para Google');else if(d.length<70)add('warn',`Descripción corta (${d.length}/70–160)`);else if(d.length>160)add('warn',`Descripción larga (${d.length}/160)`);
  if(!r.image)add('warn','Sin imagen');else if(!r.image_alt)add('warn','Imagen sin texto alternativo');
  if(k==='posts'&&body.length<300)add('warn','Contenido muy corto (menos de 300 caracteres)');
  if(k==='packages'&&!body&&!strip(r.excerpt))add('warn','Sin descripción del paquete');
  if(k==='packages'&&!r.price)add('warn','Sin precio (no se publica oferta en Google)');
  if((r.slug||'').length>60)add('warn','Dirección web larga');
  return o}
const level=is=>is.some(i=>i.l==='bad')?'bad':is.length?'warn':'ok';

/* ---------- login estilo terminal / shell ---------- */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let booting=false;
function term(){const t=$('#tm');return{
  clear(){t.innerHTML=''},
  line(h,c=''){const d=document.createElement('div');d.className='l '+c;d.innerHTML=h;t.appendChild(d);return d},
  async step(txt,fn,min=350){const d=this.line(`<span class="st wt bl">…</span> ${esc(txt)}`);let ok=true,out='';
    try{const r=await Promise.all([fn?fn():'',sleep(min)]);out=r[0]||''}catch(e){ok=false;out=(e&&e.message)||'error'}
    d.innerHTML=`<span class="st ${ok?'ok':'ko'}">${ok?'✓':'✕'}</span> ${esc(txt)}${out?` <span class="${ok?'m':'ko'}">· ${esc(out)}</span>`:''}`;return{ok,out}}}}
async function login(msg){
  if(booting)return;booting=true;dirty=false;
  try{const b=await (await fetch('/api/brand')).json();if(b&&b.brand)BR=b;applyBrand(b);document.title='Panel · '+BR.brand}catch{}
  app.innerHTML=`<div class="lg"><main class="lgc" id="lgb">
    <img class="lgl" src="${esc(BR.logo)}" alt="${esc(BR.brand)}">
    <h1>Panel de administración</h1>
    <p class="lgs">Acceso para el equipo${BR.brand?` de ${esc(BR.brand)}`:''}</p>
    <div class="tm" id="tm" aria-hidden="true"></div>
    <form id="lf" class="lgform" hidden>
      <label for="em">Email</label>
      <input id="em" name="email" type="email" autocomplete="username" placeholder="tu@email.com" spellcheck="false" style="margin-bottom:10px">
      <small class="muted" style="display:block;margin:-4px 0 10px">Si usás la clave general del sitio, dejalo vacío.</small>
      <label for="pw">Clave de acceso</label>
      <div class="pwr"><input id="pw" name="password" type="password" autocomplete="current-password" placeholder="Ingresá tu clave" spellcheck="false" aria-describedby="le"><button type="button" id="eye" class="pwb" aria-label="Mostrar u ocultar la clave" aria-pressed="false">Mostrar</button></div>
      <div class="lerr" id="le" role="alert"></div>
      <button class="p lgb" id="go" type="submit">Ingresar</button>
    </form>
    <p class="lgf"><span>Conexión protegida · la sesión dura 30 días</span><span class="lgpw">Powered by <b>Alex Villalon</b></span></p>
  </main></div>`;
  const T=term(),t0=Date.now();let me=null;
  T.line('<span class="c">$</span> iniciando panel…');
  if(msg)T.line(esc(msg),'wt');
  await T.step('Cargando módulos del panel',null,0);
  const c1=await T.step('Conectando con el servidor (/api/me)',async()=>{const x=await fetch('/api/me',{cache:'no-store'});
    if(x.ok){me=await x.json().catch(()=>null);return 'HTTP 200'}
    if(x.status===401)return 'HTTP 401';
    const d=await x.json().catch(()=>({}));throw new Error(d.error||'HTTP '+x.status)},0);
  await T.step('Verificando sesión (cookie gv_admin)',async()=>me?'sesión válida':'sin sesión activa',0);
  await T.step('Comprobando base D1 y almacenamiento R2',async()=>me?`D1 ${me.db?'conectada':'sin conectar'} · R2 ${me.r2?'activo':'desactivado'}`:'requiere autenticación',0);
  if(!c1.ok){T.line('No se pudo iniciar. Revisá la configuración y recargá la página.','ko');booting=false;return}
  const enter=async m=>{T.line('<span class="ok">✓ Sesión iniciada.</span> Abriendo panel…');
    await T.step('Cargando entradas y paquetes (D1)',async()=>{try{const[x,y]=await Promise.all([load('posts',true),load('packages',true)]);return `${x.length} entradas · ${y.length} paquetes`}catch{return 'sin datos todavía'}},0);
    ME=m;applyBrand(m);if(m.brand)BR={brand:m.brand,logo:m.logo||BR.logo};try{await refreshCats()}catch{}booting=false;await sleep(250);
    try{shell()}catch(e){T.line('Error al abrir el panel: '+esc(e.message),'ko')}};
  if(me)return enter(me);
  const f=$('#lf'),em=$('#em'),pw=$('#pw'),go=$('#go'),le=$('#le');
  try{em.value=localStorage.getItem('gv_email')||''}catch{}
  f.hidden=false;(em.value?pw:em).focus();booting=false;
  $('#eye').onclick=()=>{const h=pw.type==='password';pw.type=h?'text':'password';$('#eye').textContent=h?'Ocultar':'Mostrar';$('#eye').setAttribute('aria-pressed',String(h));pw.focus()};
  f.onsubmit=async e=>{e.preventDefault();const val=pw.value;
    if(!val.trim()){le.textContent='Ingresá la clave.';pw.focus();return}
    le.textContent='';pw.readOnly=true;go.disabled=true;go.textContent='Verificando…';T.clear();
    const fail=m=>{T.line('✕ Acceso denegado','ko');le.textContent=m||'Clave incorrecta. Revisá e intentá de nuevo.';pw.readOnly=false;go.disabled=false;go.textContent='Ingresar';
      const b=$('#lgb');b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');pw.focus();pw.select()};
    const r1=await T.step('Enviando credenciales (POST /api/login)',async()=>{const x=await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:em.value.trim(),password:val})});
      const d=await x.json().catch(()=>({}));if(!x.ok)throw new Error(d.error||'HTTP '+x.status);return 'HTTP 200'},0);
    if(!r1.ok)return fail(r1.out==='Clave incorrecta'?'':r1.out);
    try{localStorage.setItem('gv_email',em.value.trim())}catch{}
    await T.step('Verificando clave (HMAC-SHA256)',null,0);
    await T.step('Firmando sesión · vence en 30 días',null,0);
    let m=null;const r2=await T.step('Leyendo perfil del panel (/api/me)',async()=>{const x=await fetch('/api/me',{cache:'no-store'});
      if(x.status===401)throw new Error('el navegador no guardó la sesión (¿cookies bloqueadas?)');if(!x.ok)throw new Error('HTTP '+x.status);m=await x.json();return 'HTTP 200'},0);
    if(!r2.ok)return fail(r2.out);
    enter(m)}}

const NAV=[['Operación',[['home','Inicio','home'],['leads','Consultas','inbox'],['ia','Asistente IA','chat'],['bookings','Reservas','receipt'],['avail','Disponibilidad','calendar'],['tasks','Actividades','check']]],['Contenido',[['posts','Blog','pen'],['packages','Paquetes y servicios','box'],['translations','Traducciones','globe'],['favs','Favoritos de la portada','star'],['categories','Categorías','tag'],['prices','Precios','dollar'],['claude','Conectar Claude','spark']]],['Crecimiento',[['stats','Medición','chart'],['heat','Mapa de calor','eye'],['seo','SEO','search']]],['Cuenta',[['profile','Mi perfil','users']]],['Equipo',[['team','Rendimiento','chart'],['actrep','Reporte de actividades','check'],['history','Historial','clock'],['users','Usuarios','users']]]];
const isAdmin=()=>!ME.user||ME.user.role==='admin';
const MENU_SVG='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const navBadge=k=>k==='seo'?'<span class="n" id="nb" hidden></span>':k==='bookings'?'<span class="n" id="nr" hidden></span>':k==='leads'?'<span class="n" id="nl" hidden></span>':k==='tasks'?'<span class="n" id="nt" hidden></span>':k==='ia'?'<span class="n" id="ni" hidden></span>':'';
// Enlace directo a una nota o paquete: #posts/123 abre su formulario (lo usa el conector de Claude al terminar).
{const m=tab.match(/^(posts|packages)\/(\d+)$/);if(m){tab=m[1];OPEN_ID=Number(m[2])}}
const visibleNav=()=>NAV.filter(([sec])=>sec!=='Equipo'||isAdmin()).map(([sec,it])=>[sec,it.filter(([k])=>k!=='claude'||isAdmin())]);
const initials=n=>String(n||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'•';

// Búsqueda rápida de secciones (Ctrl/⌘ + K)
function cmdk(){
  if($('#cmdk-o'))return;
  const items=visibleNav().flatMap(([s,it])=>it.map(([k,l,i])=>({k,l,s,i})));
  const o=document.createElement('div');o.id='cmdk-o';o.className='ov cmdk-ov';
  o.innerHTML=`<div class="cmdk" role="dialog" aria-modal="true" aria-label="Ir a una sección"><div class="cmdk-in">${ic('search')}<input id="cmdk-q" placeholder="Ir a una sección…" aria-label="Buscar sección" autocomplete="off"></div><div id="cmdk-l" class="cmdk-l"></div><div class="cmdk-f"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> cerrar</span></div></div>`;
  document.body.appendChild(o);
  let sel=0,list=[];
  const close=()=>o.remove();
  const go=async k=>{close();if(!(await leave()))return;dirty=false;tab=k;location.hash=tab;shell()};
  const draw=()=>{const q=$('#cmdk-q').value.trim().toLowerCase();list=items.filter(x=>!q||(x.l+' '+x.s).toLowerCase().includes(q));sel=Math.min(sel,Math.max(list.length-1,0));
    $('#cmdk-l').innerHTML=list.map((x,j)=>`<button type="button" class="cmdk-i${j===sel?' on':''}" data-k="${x.k}">${ic(x.i)}<span>${x.l}</span><small>${x.s}</small></button>`).join('')||'<p class="muted cmdk-none">Nada coincide.</p>'};
  $('#cmdk-q').oninput=()=>{sel=0;draw()};
  o.onclick=e=>{if(e.target===o)return close();const b=e.target.closest('[data-k]');if(b)go(b.dataset.k)};
  o.onkeydown=e=>{if(e.key==='Escape'){close();return}
    if(e.key==='ArrowDown'){sel=Math.min(sel+1,list.length-1);draw();e.preventDefault()}
    if(e.key==='ArrowUp'){sel=Math.max(sel-1,0);draw();e.preventDefault()}
    if(e.key==='Enter'&&list[sel]){e.preventDefault();go(list[sel].k)}};
  draw();$('#cmdk-q').focus();
}
if(!window._cmdkBound){window._cmdkBound=1;document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();cmdk()}})}

function shell(skip){
  const sec=(NAV.find(([,it])=>it.some(([k])=>k===tab))||['',[]])[0],label=(NAV.flatMap(([,it])=>it).find(([k])=>k===tab)||[0,''])[1];
  const u=ME.user||{},who=u.name||u.email||'Clave general',role=!ME.user?'Clave general':u.role==='admin'?'Administrador':'Editor';
  app.innerHTML=`<div class="app2" id="app2">
    <aside class="rail" aria-label="Navegación">
      <div class="brand"><img src="${esc(BR.logo)}" alt=""><div><b>${esc(BR.brand)}</b><small>Panel de administración</small></div></div>
      <nav class="navg">${visibleNav().map(([s,items])=>`<h4>${esc(s)}</h4>`+items.map(([k,l,i])=>`<button type="button" data-t="${k}" class="nv${tab===k?' on':''}"${tab===k?' aria-current="page"':''}>${ic(i)}<span>${l}</span>${navBadge(k)}</button>`).join('')).join('')}</nav>
      <div class="rail-foot">
        <a class="nv" href="/" target="_blank" rel="noopener">${ic('ext')}<span>Ver sitio</span></a>
        <div class="me"><span class="av" aria-hidden="true">${esc(initials(who))}</span><div><b>${esc(who)}</b><small>${esc(role)}</small></div><button id="out" class="ghost" type="button" title="Salir" aria-label="Salir">${ic('logout')}</button></div>
      </div>
    </aside>
    <div class="main2">
      <header class="tbar">
        <button type="button" class="ghost menu-btn" id="menu" aria-label="Abrir menú" aria-controls="app2">${MENU_SVG}</button>
        <nav class="crumb" aria-label="Ubicación">${sec?`<span>${esc(sec)}</span><span class="sep">/</span>`:''}<b>${esc(label)}</b></nav>
        <button type="button" class="sbtn" id="cmdk-b" aria-label="Buscar sección">${ic('search')}<span>Buscar</span><kbd>Ctrl K</kbd></button>
        <div class="tb-end">
          <div class="bwrap"><button type="button" id="bell" class="ibtn" aria-label="Avisos" aria-expanded="false" aria-controls="bellp">${ic('bell')}<span class="bn" id="bn" hidden></span></button><div id="bellp" class="bellp" role="region" aria-label="Avisos" hidden></div></div>
        </div>
      </header>
      <div class="content"><div id="warn"></div><div id="v"></div></div>
    </div>
  </div>`;
  $('#warn').innerHTML=[!ME.db&&'Falta conectar la base D1 (binding DB).',!ME.r2&&'Subida de imágenes desactivada (falta bucket R2 IMAGES): pegá URLs https de imagen.',!ME.whatsapp&&'Falta WHATSAPP_NUMBER: los botones Reservar de los paquetes nuevos irán a /reservas.',...(ME.security||[])].filter(Boolean).map(t=>`<div class="notice">${ic('alert')}<span>${t}</span></div>`).join('');
  $$('[data-t]').forEach(b=>b.onclick=async()=>{if(!(await leave()))return;dirty=false;tab=b.dataset.t;location.hash=tab;$('#app2').classList.remove('open');shell()});
  $('#menu').onclick=()=>$('#app2').classList.toggle('open');
  $('#cmdk-b').onclick=cmdk;
  paintBell();$('#bell').onclick=e=>{e.stopPropagation();const o=$('#bellp').hidden;$('#bellp').hidden=!o;$('#bell').setAttribute('aria-expanded',o)};
  $('#out').onclick=async()=>{await api('logout','POST');DATA={posts:null,packages:null,categories:null};login()};
  if(!skip)({home,leads,bookings,stats,posts:list,packages:list,translations,profile,avail,categories:cats,prices,seo,users,team,history,tasks,actrep,favs,heat,claude,ia})[tab]?.();
  loadAlerts();
  refreshTaskBadge();
  fetch('/api/ia?count=1',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{const e=$('#ni');if(e&&d&&d.pending){e.textContent=d.pending;e.hidden=false}}).catch(()=>{});
  fetch('/api/bookings?count=1',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{const e=$('#nr');if(e&&d&&d.pending){e.textContent=d.pending;e.hidden=false}}).catch(()=>{});
  Promise.all([load('posts'),load('packages')]).then(([a,b])=>{const n=[...a.map(r=>['posts',r]),...b.map(r=>['packages',r])].filter(([k,r])=>r.published&&issues(k,r).length).length;const e=$('#nb');if(e&&n){e.textContent=n;e.hidden=false}}).catch(()=>{})}

/* ---------- inicio (resumen) ---------- */
// Helpers compartidos: fechas UTC de la base ("YYYY-MM-DD HH:MM:SS") y teléfonos.
const parseUTC=s=>Date.parse(String(s||'').replace(' ','T')+'Z');
const onlyDigits=t=>String(t||'').replace(/\D/g,'');
const ago=s=>{const t=parseUTC(s);if(!t)return '';const m=Math.round((Date.now()-t)/60000);return m<1?'recién':m<60?`hace ${m} min`:m<1440?`hace ${Math.round(m/60)} h`:`hace ${Math.round(m/1440)} d`};
async function home(){const v=$('#v');v.innerHTML='<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
  const[po,pk]=await Promise.all([load('posts',true),load('packages',true)]);
  const all=[...po.map(r=>['posts',r]),...pk.map(r=>['packages',r])],pub=all.filter(([,r])=>r.published),obs=pub.filter(([k,r])=>issues(k,r).length);
  const rec=[...all].sort((x,y)=>String(y[1].updated_at||y[1].created_at).localeCompare(String(x[1].updated_at||x[1].created_at))).slice(0,6);
  const h=new Date().getHours(),sal=h<6?'Buenas noches':h<13?'Buen día':h<20?'Buenas tardes':'Buenas noches';
  const nop=pk.filter(r=>r.published&&!r.price).length;
  const nombre=(ME.user&&(ME.user.name||'').split(' ')[0])||'';
  const fechaHoy=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
  const kpi=(tab,n,l,tone,id)=>`<button type="button" class="kpi ${tone||''}" data-go="${tab}"><span class="kpi-n" ${id?`id="${id}"`:''}>${n}</span><span class="kpi-l">${l}</span><span class="kpi-go" aria-hidden="true">${ic('down')}</span></button>`;
  const qa=(tab,label,icon,extra='')=>`<button type="button" class="qa" data-go="${tab}" ${extra}><span class="qa-i">${ic(icon)}</span><span>${label}</span></button>`;
  v.innerHTML=`<header class="hero"><div><p class="hero-d">${esc(fechaHoy)}</p><h2>${sal}${nombre?', '+esc(nombre):''}</h2><p class="muted">Así está ${esc(BR.brand)} hoy.</p></div><div class="hero-act"><button class="p" data-go="posts" data-new="1">${ic('plus')}Nueva entrada</button><button class="s" data-go="packages" data-new="paquete">${ic('plus')}Nuevo paquete</button></div></header>
  <section class="kpis" aria-label="Indicadores">
    ${kpi('posts',po.filter(r=>r.published).length,'entradas publicadas')}
    ${kpi('packages',pk.filter(r=>r.published).length,'paquetes publicados')}
    ${kpi('bookings','…','reservas pendientes','',"kpi-res")}
    ${kpi('seo',obs.length,'con observaciones SEO',obs.length?'warn':'ok')}
  </section>
  <div id="home-al"></div>
  <div class="home-grid">
    <section class="card"><div class="cardhead"><h3>Últimas modificaciones</h3><button class="link" data-go="posts">Ver blog</button></div>
      ${rec.map(([k,r])=>`<button type="button" class="recent" data-k="${k}" data-id="${r.id}">${r.image?`<img class="th" src="${esc(r.image)}" alt="" loading="lazy">`:`<span class="th">${ic('image')}</span>`}<span class="grow"><b>${esc(r.title)}</b> ${r.published?'':'<span class="tag">borrador</span>'}<small>${k==='posts'?'Blog':(tipoLbl(r)||'Producto')} · ${esc(ago(r.updated_at||r.created_at))}</small></span>${ic('edit')}</button>`).join('')||'<p class="muted">Todavía no hay contenido. Creá la primera entrada o paquete.</p>'}
    </section>
    <div class="home-side">
      <section class="card"><h3>Accesos rápidos</h3><div class="qa-grid">
        ${qa('leads','Consultas','inbox')}${qa('bookings','Reservas','receipt')}${qa('avail','Disponibilidad','calendar')}${qa('tasks','Actividades','check')}${qa('seo','SEO','search')}${qa('prices','Precios','dollar')}
      </div></section>
      <section class="card"><h3>Estado del sistema</h3>
        <ul class="sys"><li><span class="dot ${ME.db?'ok':'bad'}"></span>Base de datos${ME.db?'':' <small>(falta el binding D1)</small>'}</li><li><span class="dot ${ME.r2?'ok':'warn'}"></span>Imágenes${ME.r2?'':' <small>(sin bucket R2)</small>'}</li><li><span class="dot ${ME.whatsapp?'ok':'warn'}"></span>WhatsApp${ME.whatsapp?'':' <small>(sin número)</small>'}</li></ul>
        ${nop?`<p class="sysnote"><span class="chip warn">${nop} paquete${nop>1?'s':''} sin precio</span> <button class="link" data-go="prices">Cargar precios</button></p>`:''}
        <small class="muted">Sitio: <b>${esc((ME.site||'').replace(/^https?:\/\//,''))}</b> · Atajo: Ctrl/⌘ + S guarda al editar</small>
      </section>
    </div>
  </div>`;
  // Reseñas de Google: todo sale de la API de Google Places (calificación, comentarios y fotos). Acá solo se ve el estado y se prueba la conexión.
  { const gc=document.createElement('section');gc.className='card';gc.id='gr-card';
    gc.innerHTML=`<h3>Reseñas de Google</h3><small class="muted">La calificación, los comentarios y las fotos se toman solos de tu ficha de Google, una vez por día. No hace falta cargar nada.</small><div id="gr-api"><p class="muted">Cargando…</p></div>`;
    const apiBox=p=>{const el=$('#gr-api');if(!el)return;
      if(!p){el.innerHTML='';return}
      if(!p.configured){el.innerHTML='<p class="gr-err">API de Google sin configurar: falta el secreto GOOGLE_PLACES_API_KEY o GOOGLE_PLACE_ID en wrangler.jsonc. Mientras tanto la web muestra solo los botones para ver y dejar reseñas.</p>';return}
      const when=p.lastOk?new Date(p.lastOk).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'}):'';
      const sum=p.lastOk?`<ul class="gr-sum"><li><b>${p.rating?String(p.rating.toFixed(1)).replace('.',','):'–'}</b><span>calificación</span></li><li><b>${(p.count||0).toLocaleString('es-AR')}</b><span>opiniones</span></li><li><b>${p.reviews}</b><span>comentarios</span></li><li><b>${p.photos}</b><span>fotos</span></li></ul><small class="muted">Última consulta correcta: ${esc(when)}. Google entrega como máximo 5 comentarios y 10 fotos, y elige cuáles.</small>${p.old||(p.count>0&&!p.reviews&&!p.photos)?`<p class="gr-err">${p.old?'Los datos guardados son de una versión anterior (sin comentarios ni fotos). Tocá <b>Actualizar ahora</b> para traerlos.':'Google devolvió la calificación pero ningún comentario ni foto. Tocá <b>Actualizar ahora</b>; si sigue igual, revisá que la clave tenga habilitada <b>Places API (New)</b> sin restricción de campos.'}</p>`:''}${p.diag?`<small class="muted" style="display:block;margin-top:6px">Diagnóstico de la última respuesta de Google${p.diag.place?' («'+esc(p.diag.place)+'»)':''}: campos ${esc((p.diag.fields||[]).join(', ')||'—')} · ${p.diag.reviews} comentarios · ${p.diag.photos} fotos${p.diag.retried?' · se reintentó sin idioma':''}.</small>`:''}`:'';
      el.innerHTML=`<div class="gr-api ${p.connected?'ok':'ko'}"><b>${p.connected?'✓ Conectada con Google':'✕ Sin conexión con Google'}</b>${p.error?`<p class="gr-err">${esc(p.hint)}<br><small>${esc(p.error)}</small></p>`:''}</div>${sum}<div class="gr-b"><button class="s" id="gr-test" type="button">Actualizar ahora</button></div>`;
      $('#gr-test').onclick=async()=>{try{const r=await api('google-reviews','PUT',{refresh:true});apiBox(r.places);toast(r.places.connected?'Reseñas actualizadas desde Google':'Google respondió con error. Mirá el detalle en Reseñas de Google',r.places.connected?'ok':'err')}catch{}};
    };
    $('.home-side')?.appendChild(gc);
    api('google-reviews').then(d=>apiBox(d.places)).catch(()=>apiBox(null)); }
  paintHomeAlerts();
  fetch('/api/bookings?count=1',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{const e=$('#kpi-res');if(e&&d)e.textContent=d.pending||0}).catch(()=>{});
  $$('[data-go]').forEach(b=>b.onclick=e=>{e.preventDefault();const g=b.dataset.go;tab=g;location.hash=g;shell(true);
    if(g==='posts'&&b.dataset.new)form({published:1});else if(g==='packages'&&b.dataset.new)form({published:1,meta:JSON.stringify({kind:'paquete'})});
    else if(g==='prices')prices();else if(g==='leads')leads();else if(g==='bookings')bookings();else if(g==='avail')avail();else if(g==='tasks')tasks();else if(g==='seo')seo();else if(g==='posts')list();else if(g==='packages')list()});
  $$('[data-id]',v).forEach(b=>b.onclick=()=>{tab=b.dataset.k;location.hash=tab;shell(true);form(DATA[tab].find(r=>r.id==b.dataset.id))})}

/* ---------- medición (vistas y clics de WhatsApp) ---------- */
const MIN_V=100;
async function stats(days=30){const v=$('#v');v.innerHTML='<div class="sk"></div><div class="sk"></div>';
  let d;try{d=await api('stats?days='+days)}catch{v.innerHTML='<div class="card muted">No se pudo cargar la medición.</div>';return}
  const pct=(c,n)=>n>=20?((c/n)*100).toFixed(1).replace('.',',')+'%':'—';
  const pkRows=[...d.packages].sort((a,b)=>b.views-a.views||b.wa-a.wa);
  const postRows=[...d.posts].sort((a,b)=>b.wa-a.wa||b.views-a.views);
  const A=d.ab.find(x=>x.variant==='a')||{views:0,clicks:0},B=d.ab.find(x=>x.variant==='b')||{views:0,clicks:0};
  const lowData=A.views<MIN_V||B.views<MIN_V;
  const rA=A.views?A.clicks/A.views:0,rB=B.views?B.clicks/B.views:0,diff=Math.abs(rA-rB)*100;
  const verdict=lowData?{tone:'wait',t:`Todavía hay pocas visitas: necesitás al menos ${MIN_V} por variante antes de decidir.`}:diff<0.5?{tone:'wait',t:'Sin diferencia clara todavía: no cambies nada.'}:{tone:'win',t:`La variante ${rB>rA?'B':'A'} convierte ${diff.toFixed(1).replace('.',',')} puntos más. Sostenela unas semanas más antes de cerrar la prueba.`};
  const abCard=(x,name,desc,best)=>`<div class="card ab-card ${best?'is-best':''}"><div class="ab-h"><b>${name}</b>${best?'<span class="chip ok">Va ganando</span>':''}</div><p class="muted" style="margin:2px 0 10px">${desc}</p><div class="ab-n">${pct(x.clicks,x.views)}</div><small class="muted">${x.clicks} clics · ${x.views} visitas</small></div>`;
  const tbl=(head,rows)=>`<div class="card tbl-card"><table class="tb2"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  v.innerHTML=`<div class="pagehead"><div><h2>Medición</h2><p class="muted">Vistas y clics de WhatsApp de los últimos ${d.days} días. Las vistas de bots no se cuentan. Los clics son intención de compra; las ventas se confirman en Consultas.</p></div>
  <div class="toolbar" style="margin:0">${segCtl([['7','7 días'],['30','30 días'],['90','90 días']],String(days),'mper','Período')}</div></div>

  <section class="msec"><h3>Clics en WhatsApp</h3>
  ${statRow([[d.totals.whatsappClicks,'clics en WhatsApp (todos los botones)'],[d.floating.clicks,'toques en el botón flotante'],[d.totals.formRequests,'consultas enviadas por formulario']])}
  ${d.floating.pages.length?tbl(['Página donde se tocó el botón flotante','Toques'],d.floating.pages.map(r=>`<tr><td>${esc(r.page||'—')}</td><td>${r.n}</td></tr>`)):emptyBox('Todavía no hay toques en el botón flotante en este período.')}
  </section>

  <section class="msec"><h3>Prueba A/B del botón principal de la portada</h3>
  <p class="muted" style="margin:0 0 12px">A: “Consultar por WhatsApp” (actual) · B: “Armar mi viaje por WhatsApp”. Cada persona ve siempre la misma variante.</p>
  <div class="ab-grid">${abCard(A,'Variante A','Consultar por WhatsApp (actual)',!lowData&&diff>=0.5&&rA>=rB)}${abCard(B,'Variante B','Armar mi viaje por WhatsApp',!lowData&&diff>=0.5&&rB>rA)}</div>
  <div class="verdict ${verdict.tone}">${ic(verdict.tone==='win'?'check':'alert')}<span>${verdict.t}</span></div>
  </section>

  <section class="msec"><h3>Paquetes</h3>
  ${pkRows.length?tbl(['Paquete','Vistas','Clics WhatsApp','Consultas (formulario)','% de visitas con clic'],pkRows.map(r=>`<tr><td><b>${esc(r.title)}</b>${r.featured?' <span class="tag">En inicio</span>':''}</td><td>${r.views}</td><td>${r.wa}</td><td>${r.form}</td><td>${pct(r.wa,r.views)}</td></tr>`)):emptyBox('No hay paquetes publicados.')}
  </section>

  <section class="msec"><h3>Blog</h3>
  <p class="muted" style="margin:0 0 10px">Una entrada funciona mejor cuando genera más clics de WhatsApp desde su propia página, en proporción a sus visitas.</p>
  ${postRows.length?tbl(['Entrada','Vistas','Clics WhatsApp desde la entrada','% de visitas con clic'],postRows.map(r=>`<tr><td><b>${esc(r.title)}</b></td><td>${r.views}</td><td>${r.wa}</td><td>${pct(r.wa,r.views)}</td></tr>`)):emptyBox('No hay entradas publicadas.')}
  </section>`;
  $$('[data-mper]').forEach(b=>b.onclick=()=>stats(Number(b.dataset.mper)))}

/* ---------- consultas (leads) ---------- */
const HERO_LBL={'hero-a':'Botón de portada (variante A)','hero-b':'Botón de portada (variante B)','flotante':'Botón flotante de WhatsApp'};
const LST=[['nuevo','Nuevo'],['contactado','Contactado'],['vendido','Vendido'],['perdido','Perdido']];
/* ---------- piezas compartidas de Consultas y Reservas ---------- */
const emptyBox=(t,hint='')=>`<div class="empty">${ic('inbox')}<p>${esc(t)}</p>${hint?`<small class="muted">${esc(hint)}</small>`:''}</div>`;
const segCtl=(items,cur,attr,label)=>`<div class="seg" role="group" aria-label="${esc(label)}">${items.map(([k,l,n])=>`<button type="button" class="seg-b" data-${attr}="${esc(k)}" aria-pressed="${cur===k}">${esc(l)}${n!=null?`<span class="seg-n">${n}</span>`:''}</button>`).join('')}</div>`;
const kpRow=items=>`<div class="kp-row">${items.map(([n,l,s,t])=>`<div class="kp ${t||''}"><b>${n}</b><span>${l}</span>${s?`<small>${s}</small>`:''}</div>`).join('')}</div>`;
const statRow=items=>`<div class="stats">${items.map(([n,l,t])=>`<div class="card stat ${t||''}"><b>${n}</b><span>${l}</span></div>`).join('')}</div>`;

/* ---------- consultas: qué pidió cada persona y en qué estado va ---------- */
let LEAD_F='';
const LEAD_SEL=new Set();
async function leads(){const v=$('#v');v.innerHTML='<div class=\"sk\"></div><div class=\"sk\"></div>';
  let d;try{d=await api('leads')}catch{v.innerHTML='<div class=\"card muted\">No se pudieron cargar las consultas.</div>';return}
  // Quita de la selección las consultas que ya no existen (borradas desde otra pestaña o sesión).
  for(const id of [...LEAD_SEL]) if(!d.leads.some(r=>r.id===id)) LEAD_SEL.delete(id);
  const cnt=k=>(d.stats.find(x=>x.status===k)||{n:0}).n,tot=d.leads.length,wa=d.leads.filter(r=>r.source==='whatsapp').length,fm=tot-wa;
  const nb=$('#nl');if(nb){nb.textContent=cnt('nuevo');nb.hidden=!cnt('nuevo')}
  const digits=onlyDigits;
  const visible=()=>d.leads.filter(r=>!LEAD_F||r.status===LEAD_F);
  // Barra de selección y casilla de "todas": se actualizan sin redibujar la tabla, así no se pierde el foco del teclado.
  const syncSel=()=>{const vis=visible().map(r=>r.id),on=vis.filter(id=>LEAD_SEL.has(id)).length,all=$('#l-all');
    if(all){all.checked=vis.length>0&&on===vis.length;all.indeterminate=on>0&&on<vis.length}
    const bar=$('#l-bar');if(!bar)return;
    const n=LEAD_SEL.size;
    bar.className=n?'toolbar':'';
    bar.innerHTML=n?`<span><b>${n}</b> seleccionada${n===1?'':'s'}</span><span class=\"grow\"></span><button type=\"button\" class=\"s\" id=\"l-clr\">Quitar selección</button><button type=\"button\" class=\"s d\" id=\"l-del\">${ic('trash')}Eliminar seleccionadas</button>`:'';
    const clr=$('#l-clr');if(clr)clr.onclick=()=>{LEAD_SEL.clear();$$('[data-sel]').forEach(c=>c.checked=false);syncSel()};
    const del=$('#l-del');if(del)del.onclick=async()=>{const ids=[...LEAD_SEL];if(!await confirmBox(`Eliminar ${ids.length} consulta${ids.length===1?'':'s'}`,'Se quitan de la lista. Esto no se puede deshacer.','Eliminar',true))return;
      try{const r=await api('leads/borrar','POST',{ids});LEAD_SEL.clear();toast(`${r.deleted} consulta${r.deleted===1?'':'s'} eliminada${r.deleted===1?'':'s'}`);leads()}catch{}};
  };
  const draw=()=>{const rows=visible();
    $('#ll').innerHTML=rows.length?`<div style=\"overflow-x:auto\"><table class=\"tb2\"><thead><tr><th style=\"width:2.5rem\"><input type=\"checkbox\" id=\"l-all\" aria-label=\"Seleccionar todas las consultas visibles\"></th><th>Cuándo</th><th>Cliente</th><th>Interés</th><th>Estado</th><th><span class=\"sr\">Acciones</span></th></tr></thead><tbody>${rows.map(r=>`<tr data-id=\"${r.id}\">\n      <td><input type=\"checkbox\" data-sel=\"${r.id}\" aria-label=\"Seleccionar consulta de ${esc(r.name||'sin nombre')}\"${LEAD_SEL.has(r.id)?' checked':''}></td>\n      <td><small>${esc(ago(r.created_at))}</small><br><span class=\"src ${r.source==='whatsapp'||r.source==='ia'?'wa':'form'}\">${r.source==='ia'?'Asistente IA':r.source==='whatsapp'?'Clic en WhatsApp':'Formulario'}</span></td>\n      <td>${r.name?`<b>${esc(r.name)}</b>`:'<span class=\"muted\">Sin datos (clic en WhatsApp)</span>'}${r.phone?`<br><a href=\"https://wa.me/${digits(r.phone)}\" target=\"_blank\" rel=\"noopener\">${esc(r.phone)}</a>`:''}</td>\n      <td>${esc(HERO_LBL[r.package_title]||r.package_title||r.page||'—')}${r.travel_date||r.pax?`<br><small class=\"muted\">${r.travel_date?esc(r.travel_date):''}${r.pax?` · ${r.pax} pers.`:''}</small>`:''}</td>\n      <td><label class=\"sr\" for=\"lst-${r.id}\">Estado de la consulta</label><select id=\"lst-${r.id}\" data-st style=\"margin:0;min-width:130px\">${LST.map(([k,l])=>`<option value=\"${k}\" ${r.status===k?'selected':''}>${l}</option>`).join('')}</select></td>\n      <td><button class=\"s d\" data-del aria-label=\"Borrar consulta de ${esc(r.name||'sin nombre')}\" title=\"Borrar\">${ic('x')}</button></td></tr>`).join('')}</tbody></table></div>`:emptyBox(LEAD_F?'No hay consultas en este estado.':'Todavía no llegó ninguna consulta.','Aparecen acá cuando alguien completa el formulario o hace clic en WhatsApp.');
    $$('[data-sel]').forEach(c=>c.onchange=()=>{const id=Number(c.dataset.sel);c.checked?LEAD_SEL.add(id):LEAD_SEL.delete(id);syncSel()});
    $('#l-all')?.addEventListener('change',e=>{visible().forEach(r=>e.target.checked?LEAD_SEL.add(r.id):LEAD_SEL.delete(r.id));$$('[data-sel]').forEach(c=>c.checked=e.target.checked);syncSel()});
    $$('[data-st]').forEach(sel=>sel.onchange=async()=>{const id=sel.closest('tr').dataset.id,r=d.leads.find(x=>x.id==id);try{await api('leads/'+id,'PUT',{status:sel.value});r.status=sel.value;toast('Estado actualizado');leads()}catch{sel.value=r.status}});
    $$('[data-del]').forEach(b=>b.onclick=async()=>{const id=b.closest('tr').dataset.id;if(await confirmBox('Borrar consulta','Se elimina de la lista.','Borrar',true)){LEAD_SEL.delete(Number(id));await api('leads/'+id,'DELETE');leads()}});
    syncSel()};
  v.innerHTML=`<div class=\"pagehead\"><div><h2>Consultas</h2><p class=\"muted\">Cada persona que pide información desde el sitio, por formulario o por WhatsApp. Marcá en qué estado va cada una para saber cuántas terminan en venta.</p></div></div>
  ${statRow([[cnt('nuevo'),'nuevas','is-warn'],[cnt('contactado'),'contactadas'],[cnt('vendido'),'vendidas','is-ok'],[tot?Math.round(cnt('vendido')/tot*100)+'%':'—','de consultas vendidas']])}
  <div class=\"toolbar\">${segCtl([['','Todas',tot],...LST.map(([k,l])=>[k,l,cnt(k)])],LEAD_F,'leadf','Filtrar por estado')}<span class=\"grow\"></span><span class=\"muted small\">${fm} formularios · ${wa} clics en WhatsApp</span></div>
  <div id=\"l-bar\"></div>
  <div class=\"card\" id=\"ll\"></div>`;
  $$('[data-leadf]').forEach(b=>b.onclick=()=>{LEAD_F=b.dataset.leadf;LEAD_SEL.clear();leads()});draw()}

/* ---------- reservas: lo que hay que atender hoy, agrupado por fecha de salida ---------- */
const BK_ST={pendiente:['Pendiente','warn'],pagada:['Pagada','ok'],cancelada:['Cancelada','bad'],vencida:['Vencida','']};
const bkMoney=(n,c)=>{if(!n)return '<span class="muted">A confirmar</span>';const cur=c||'BRL';try{return new Intl.NumberFormat(cur==='BRL'?'pt-BR':'es-AR',{style:'currency',currency:cur,minimumFractionDigits:n%100?2:0,maximumFractionDigits:2}).format(n/100)}catch{return cur+' '+(n/100)}};
const bkToday=()=>new Date(Date.now()-108e5).toISOString().slice(0,10);
const bkDiff=(day,from=bkToday())=>Math.round((Date.parse(day+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/864e5);
const bkLong=day=>new Date(day+'T00:00:00Z').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
let BKF='activas',BKQ='',BKO='fecha';
// Envía al cliente el voucher por WhatsApp, con el mensaje formateado (negritas y saltos de línea).
async function sendVoucherWa(id){
  let d;try{d=await fetch('/api/bookings?link='+id,{cache:'no-store'}).then(r=>r.json())}catch{toast('No se pudo preparar el voucher','err');return}
  if(!d||!d.url){toast((d&&d.error)||'No se pudo preparar el voucher','err');return}
  const dig=String(d.phone||'').replace(/\D/g,'');
  if(!dig){toast('La reserva no tiene WhatsApp del cliente','err');return}
  const fecha=new Date(d.day+'T00:00:00Z').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
  const msg=`*¡Tu reserva está confirmada!* \u{2705}\n\n\u{1F4E6} *${d.pkg||'Tu experiencia'}*\n\u{1F4C5} ${fecha}${d.time?' · '+d.time+' h':''}\n\u{1F465} ${d.pax} persona${d.pax==1?'':'s'}\n\u{1F464} ${d.name}\n\n\u{1F3AB} *Voucher:* ${d.url}\n\nPresentalo el día de la salida. ¡Te esperamos!`;
  window.open('https://wa.me/'+dig+'?text='+encodeURIComponent(msg),'_blank','noopener');
}
// Cambia la fecha u horario de una reserva activa. El cupo se revisa en el servidor; el voucher sale de la reserva, así que queda actualizado.
async function reagendar(r){
  let d;try{d=await api(`slots?package_id=${r.package_id}&month=${r.day.slice(0,7)}`)}catch{return}
  const byT=!!d.config.by_time,times=d.config.times||[];
  const fields=[['day','Nueva fecha',r.day,'','date']];
  if(byT)fields.push(['time','Nuevo horario',r.time||times[0],'',times.map(t=>[t,t+' h'])]);
  const m=await modal({title:'Cambiar fecha u horario · #'+r.id,body:'<p class="muted">El cupo se revisa antes de guardar. El voucher se actualiza solo.</p>',ok:'Guardar cambio',fields});
  if(!m)return;
  if(m.day===r.day&&(!byT||m.time===r.time))return;
  try{await api('bookings/'+r.id,'PUT',{day:m.day,time:byT?m.time:undefined})}catch{return}
  toast('Reserva actualizada');
  if(await confirmBox('Enviar el voucher actualizado','El cliente recibe la nueva fecha y horario por WhatsApp.','Enviar por WhatsApp'))await sendVoucherWa(String(r.id));
  bookings();
}
async function bookings(){const v=$('#v');v.innerHTML='<div class="sk"></div><div class="sk"></div>';
  let d;try{d=await api('bookings')}catch{v.innerHTML='<div class="card muted">No se pudieron cargar las reservas.</div>';return}
  const all=d.bookings,today=bkToday(),cnt=k=>(d.stats.find(x=>x.status===k)||{n:0}).n,digits=onlyDigits;
  const nb=$('#nr');if(nb){nb.textContent=cnt('pendiente');nb.hidden=!cnt('pendiente')}
  // Vencida "sin confirmar": el cliente reservó (calendario + WhatsApp) y nadie la marcó a tiempo. Si la salida todavía no pasó, sigue en Activas
  // hasta que alguien la atienda (Pagada, Reactivar o Cancelar): antes desaparecía a los 20 minutos y parecía que la reserva no había entrado.
  const unc=r=>r.status==='vencida'&&r.day>=today;
  const live=all.filter(r=>r.status==='pendiente'||r.status==='pagada'||unc(r)),soon=live.filter(r=>{const x=bkDiff(r.day,today);return x>=0&&x<=7}),
    cash={};all.filter(r=>r.status==='pagada'&&r.total).forEach(r=>cash[r.currency||'BRL']=(cash[r.currency||'BRL']||0)+r.total);
  const cashTxt=Object.keys(cash).length?Object.entries(cash).map(([c,n])=>bkMoney(n,c)).join(' · '):'—';
  const ab=(ac,l,cls='s',extra='')=>`<button type="button" class="${cls} bk-b" data-ac="${ac}" ${extra}>${l}</button>`;
  const ib=(ac,i,l,cls='s')=>`<button type="button" class="${cls} bk-b bk-ib" data-ac="${ac}" aria-label="${l}" title="${l}">${ic(i)}</button>`;
  const del=r=>ib('del','trash','Borrar reserva #'+r.id,'s d');
  const acts=r=>r.status==='pendiente'?ab('pagada',ic('check')+'Pagada','p')+ib('reagendar','calendar','Cambiar fecha u horario')+ib('pendiente','refresh','Renovar la retención del cupo')+ib('cancelada','x','Cancelar reserva','s d')
    :r.status==='pagada'?ab('voucher',ic('receipt')+'Voucher')+ib('editar','edit','Corregir el titular del voucher')+ib('reagendar','calendar','Cambiar fecha u horario')+ib('vwa','chat','Enviar voucher por WhatsApp')+ib('cancelada','x','Cancelar reserva','s d')
    :r.status==='vencida'?ab('pagada',ic('check')+'Pagada','p')+ib('pendiente','refresh','Reactivar (vuelve a retener el cupo)')+ib('reagendar','calendar','Cambiar fecha u horario')+ib('cancelada','x','Cancelar reserva','s d')+(unc(r)?'':del(r))
    :ab('pendiente',ic('refresh')+'Reactivar')+del(r);
  const matches=r=>{const q=BKQ.trim().toLowerCase().replace(/^#/,'');if(!q)return true;const dq=digits(q);return [r.id,r.name,r.phone,r.package_title,r.option_name,r.message].join(' ').toLowerCase().includes(q)||(dq.length>=3&&digits(r.phone).includes(dq))};
  const inFilter=r=>BKF==='todas'||(BKF==='activas'?(r.status==='pendiente'||r.status==='pagada'||unc(r)):r.status===BKF);
  const row=r=>{const [l,c]=BK_ST[r.status]||[r.status,''],dt=new Date(r.day+'T00:00:00Z'),
      wd=dt.toLocaleDateString('es-AR',{weekday:'short',timeZone:'UTC'}).replace('.',''),mo=dt.toLocaleDateString('es-AR',{month:'short',timeZone:'UTC'}).replace('.',''),
      left=r.status==='pendiente'?Math.max(1,Math.ceil((r.hold_left||0)/60)):0,ages=agesOf(r),
      pax=r.children>0?`${r.adults} adulto${r.adults===1?'':'s'} · ${r.children} niño${r.children===1?'':'s'}`:`${r.pax} persona${r.pax===1?'':'s'}`;
    return `<tr class="bk-row ${r.status}${r.day<today?' is-past':''}" data-id="${r.id}">
      <td class="bk-c-date"><b>${dt.getUTCDate()} ${esc(mo)}</b><small>${esc(wd)}</small>${r.time?`<small><b>${esc(r.time)} h</b></small>`:''}</td>
      <td><b>${esc(r.package_title)}</b>${r.option_name?`<span class="chip neutral bk-opt">${esc(r.option_name)}</span>`:''}${(r.itin||[]).length?`<ol class="bk-itin" aria-label="Itinerario">${r.itin.map(x=>`<li><span>${esc(x.day.slice(8,10)+'/'+x.day.slice(5,7))}${x.time?' '+esc(x.time):''}</span>${esc(x.title)}${x.option?' · '+esc(x.option):''}</li>`).join('')}</ol>`:''}<small class="muted">#${r.id} · ${esc(ago(r.created_at))}</small>${r.message?`<small class="bk-msg">“${esc(r.message)}”</small>`:''}</td>
      <td><b>${esc(r.name||'Sin nombre')}</b>${r.phone?`<br><a class="bk-wa" href="https://wa.me/${digits(r.phone)}" target="_blank" rel="noopener" aria-label="Escribir por WhatsApp a ${esc(r.name||r.phone)}">${ic('chat')}${esc(r.phone)}</a>`:''}</td>
      <td class="num">${esc(pax)}${ages.length?`<small class="muted">${ages.map(a=>a+' a.').join(', ')}</small>`:''}</td>
      <td><span class="chip ${unc(r)?'warn':(c||'neutral')}">${unc(r)?'Sin confirmar':l}</span>${unc(r)?'<small class="bk-unc">Venció la retención. ¿Confirmó por WhatsApp? Marcala <b>Pagada</b>; si no, cancelala.</small>':''}${left?`<small class="bk-hold">${ic('clock')}retiene ${left} min</small>`:''}${r.pix?`<small class="bk-pix${r.paid_at?' paid':''}">${ic(r.paid_at?'check':'clock')}${r.paid_at?'Pagó con Pix':'Pix generado'}</small>`:''}</td>
      <td class="num">${bkMoney(r.total,r.currency)}</td>
      <td class="bk-c-act"><div class="bk-act">${acts(r)}</div></td></tr>`};
  const sub=rows=>`${rows.length} reserva${rows.length===1?'':'s'} · ${rows.reduce((a,r)=>a+(r.pax||0),0)} personas`;
  const dayTitle=day=>{const n=bkDiff(day,today);return n===0?'Hoy · '+bkLong(day):n===1?'Mañana · '+bkLong(day):bkLong(day)};
  const head='<thead><tr><th>Salida</th><th>Experiencia</th><th>Cliente</th><th class="num">Personas</th><th>Estado</th><th class="num">Total</th><th class="bk-c-act"><span class="sr">Acciones</span></th></tr></thead>';
  const draw=()=>{const rows=all.filter(r=>inFilter(r)&&matches(r));
    if(!rows.length){$('#bl').innerHTML=emptyBox(BKQ?'Ninguna reserva coincide con la búsqueda.':BKF==='activas'?'No hay reservas activas.':'No hay reservas en este estado.','Aparecen cuando un cliente confirma desde la ficha de un paquete con calendario.');return}
    let body='';
    if(BKO==='recientes')body=[...rows].sort((a,b)=>b.id-a.id).map(row).join('');
    else{const up=rows.filter(r=>r.day>=today).sort((a,b)=>a.day.localeCompare(b.day)||(a.time||'').localeCompare(b.time||'')||a.id-b.id),past=rows.filter(r=>r.day<today).sort((a,b)=>b.day.localeCompare(a.day)||b.id-a.id),by={};
      up.forEach(r=>(by[r.day]=by[r.day]||[]).push(r));
      body=Object.keys(by).map(day=>`<tr class="bk-day${bkDiff(day,today)===0?' today':''}"><th colspan="7"><span>${esc(dayTitle(day))}</span><span class="muted">${esc(sub(by[day]))}</span></th></tr>`+by[day].map(row).join('')).join('');
      if(past.length)body+=`<tr class="bk-day past"><th colspan="7"><span>Salidas pasadas</span><span class="muted">${past.length} reserva${past.length===1?'':'s'}</span></th></tr>`+past.map(row).join('')}
    $('#bl').innerHTML=`<div class="bk-wrap"><table class="tb2 bk-tb">${head}<tbody>${body}</tbody></table></div>`;
    $$('[data-ac]',$('#bl')).forEach(b=>b.onclick=async()=>{const id=b.closest('[data-id]').dataset.id,r=all.find(x=>x.id==id),ac=b.dataset.ac;
      if(ac==='voucher'){window.open('/api/bookings?voucher='+id,'_blank','noopener');return}
      if(ac==='editar'){const m=await modal({title:'Titular de la reserva #'+id,body:'<p class="muted">Es el nombre que aparece en el voucher. Si lo corregís, el voucher se actualiza cada vez que se abre o se envía de nuevo.</p>',ok:'Guardar',fields:[['name','Nombre y apellido',r.name||'','Nombre del titular','text']]});if(!m)return;const name=(m.name||'').trim();if(!name){toast('Escribí el nombre del titular','err');return}try{await api('bookings/'+id,'PUT',{name});toast('Titular actualizado');bookings()}catch{}return}
      if(ac==='reagendar'){await reagendar(r);return}
      if(ac==='vwa'){await sendVoucherWa(id);return}
      if(ac==='del'){if(!(await confirmBox('Borrar reserva','Se elimina de la lista. Esto no se puede deshacer.','Borrar',true)))return;try{await api('bookings/'+id,'DELETE');toast('Reserva borrada');bookings()}catch{}return}
      if(ac==='cancelada'&&!(await confirmBox('Cancelar reserva #'+id,r.status==='pagada'?'Está marcada como pagada. Al cancelarla se libera el cupo; el reembolso, si corresponde, se hace por fuera del panel.':'Se libera el cupo de ese día.','Cancelar reserva',true)))return;
      if(ac==='pagada'&&!(await confirmBox('Marcar como pagada','Confirmá que ya recibiste el pago de la reserva #'+id+'. El lugar queda confirmado.','Sí, está pagada')))return;
      try{await api('bookings/'+id,'PUT',{status:ac});toast(ac==='pagada'?'Reserva pagada':ac==='cancelada'?'Reserva cancelada':'Retención de '+d.hold_minutes+' min activa');if(ac==='pagada'&&await confirmBox('Generar voucher','Ya podés abrir el voucher para guardarlo como PDF o enviarlo al cliente por WhatsApp.','Abrir voucher'))window.open('/api/bookings?voucher='+id,'_blank','noopener');bookings()}catch{}})};
  v.innerHTML=`<div class="pagehead"><div><h2>Reservas</h2><p class="muted">Ordenadas por fecha de salida. Una reserva <b>pendiente</b> retiene el cupo ${d.hold_minutes} minutos; si no se confirma pasa a <b>sin confirmar</b>: el lugar se libera, pero la reserva queda en Activas hasta que la marques Pagada, la reactives o la canceles.</p></div><button class="s" id="bk-r">${ic('calendar')}Actualizar</button></div>
  ${kpRow([[cnt('pendiente')+all.filter(unc).length,'por confirmar',cnt('pendiente')||all.filter(unc).length?`${cnt('pendiente')} retienen cupo · ${all.filter(unc).length} sin confirmar`:'nada pendiente','warn'],[soon.length,'salen en 7 días',`${soon.reduce((a,r)=>a+(r.pax||0),0)} personas`],[cnt('pagada'),'pagadas',`${all.filter(r=>r.status==='pagada').reduce((a,r)=>a+(r.pax||0),0)} personas`,'ok'],[cashTxt,'cobrado','en reservas pagadas']])}
  <div class="toolbar bk-bar"><div class="bk-search">${ic('search')}<input id="bk-q" type="search" placeholder="Buscar por nombre, teléfono, paquete o #" value="${esc(BKQ)}" aria-label="Buscar reservas"></div>
    ${segCtl([['activas','Activas',live.length],['pendiente','Pendientes',cnt('pendiente')],['pagada','Pagadas',cnt('pagada')],['cancelada','Canceladas',cnt('cancelada')],['vencida','Vencidas',cnt('vencida')],['todas','Todas',all.length]],BKF,'bkf','Filtrar por estado')}
    <span class="grow"></span>${segCtl([['fecha','Por salida'],['recientes','Más recientes']],BKO,'bko','Orden')}</div>
  <div id="bl"></div>`;
  $$('[data-bkf]').forEach(b=>b.onclick=()=>{BKF=b.dataset.bkf;bookings()});$$('[data-bko]').forEach(b=>b.onclick=()=>{BKO=b.dataset.bko;bookings()});$('#bk-r').onclick=()=>bookings();
  $('#bk-q').oninput=e=>{BKQ=e.target.value;draw()};draw()}

/* ---------- disponibilidad: reglas de reserva por paquete + calendario de cupos ---------- */
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],WK=[[1,'Lun'],[2,'Mar'],[3,'Mié'],[4,'Jue'],[5,'Vie'],[6,'Sáb'],[0,'Dom']];
const AV={pid:null,month:'',sel:new Set()};
const avShift=(m,n)=>{const d=new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7)-1+n,1));return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')};
async function avail(){
  const v=$('#v');v.innerHTML='<div class="sk"></div><div class="sk"></div>';
  const pk=await load('packages',true);
  if(!pk.length){v.innerHTML='<div class="card muted">Primero creá un paquete en la sección Paquetes.</div>';return}
  if(!pk.some(p=>p.id==AV.pid)){AV.pid=pk[0].id;AV.sel.clear()}
  if(!/^\d{4}-\d{2}$/.test(AV.month))AV.month=new Date(Date.now()-108e5).toISOString().slice(0,7);
  const key=AV.pid+'|'+AV.month;let d;if(AV.cache&&AV.cache.key===key)d=AV.cache.d;else{try{d=await api(`slots?package_id=${AV.pid}&month=${AV.month}`)}catch{v.innerHTML='<div class="card muted">No se pudo cargar la disponibilidad.</div>';return}AV.cache={key,d}}
  const c=d.config,pkg=pk.find(p=>p.id==AV.pid),[yy,mm]=AV.month.split('-').map(Number),lead=(new Date(Date.UTC(yy,mm-1,1)).getUTCDay()+6)%7;
  const digits=onlyDigits,rs=d.res||[],paid=rs.filter(r=>r.status==='pagada'),pend=rs.filter(r=>r.status==='pendiente'),sell=d.days.filter(x=>x.st==='open'||x.st==='full'),
    capT=sell.reduce((a,x)=>a+x.cap,0),bkT=sell.reduce((a,x)=>a+x.booked,0),occ=capT?Math.round(bkT*100/capT):0,
    modeTxt=!c.enabled?'WhatsApp directo':c.pay==='pix'?'Calendario + Pix':'Calendario + WhatsApp',
    wdTxt=c.weekdays.length===7?'todos los días':WK.filter(([k])=>c.weekdays.includes(k)).map(([,l])=>l).join(', ')||'ninguno',
    dayName=x=>new Date(x+'T00:00:00Z').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}),
    one=AV.sel.size===1?[...AV.sel][0]:'',oneD=one&&d.days.find(x=>x.day===one),oneR=one?rs.filter(r=>r.day===one):[];
  const num=(k,l,val,mn,mx)=>`<label class="av-f">${l}<input type="number" data-cf="${k}" value="${val}" min="${mn}" max="${mx}" inputmode="numeric"></label>`;
  const cell=x=>{const n=+x.day.slice(8),on=AV.sel.has(x.day),past=x.st==='past';
    const t=x.st==='closed'?'Cerrado':x.st==='full'?'Completo':x.st==='open'?`${x.left}<span class="av-u"> libres</span>`:x.st==='past'?'':'—';
    const tip=[ST_AV[x.st],x.booked?`${x.booked} reservadas`:'',x.custom?'cupo propio':'',...(x.slots||[]).map(s=>s.t+': '+(s.st==='closed'?'cerrado':s.left?s.left+' libres':'sin lugar'))].filter(Boolean).join(' · ');
    const bar=(x.st==='open'||x.st==='full')?`<em class="av-o"><u style="width:${Math.min(100,Math.round(x.booked*100/Math.max(1,x.cap)))}%"></u></em>`:'';
    return `<button type="button" class="av-d ${x.st}${x.day===bkToday()?' today':''}${x.st==='open'&&x.left<=x.cap*.15?' tight':''}" data-day="${x.day}" aria-pressed="${on}" ${past?'disabled':''} title="${esc(tip)}" aria-label="${esc(dayName(x.day)+'. '+tip)}"><b>${n}</b><small>${t}</small>${bar}${x.ex?'<i></i>':''}</button>`};
  const stat=(n,l,s,tone='')=>`<div class="av-k ${tone}"><b>${n}</b><span>${l}</span>${s?`<small>${s}</small>`:''}</div>`;
  const detail=oneD?`<section class="card av-side-card"><div class="av-dh"><div><small class="muted">Día elegido</small><h3 class="cap">${esc(dayName(one))}</h3></div><span class="chip neutral">${esc(ST_AV[oneD.st].split(' (')[0])}</span></div>
    <p class="muted av-dtxt">${oneD.st==='open'||oneD.st==='full'?`${oneD.booked} de ${oneD.cap} lugares ocupados · quedan ${oneD.left}${oneD.custom?' · cupo propio':''}`:'Este día no está a la venta con las reglas actuales.'}</p>
    ${(oneD&&(oneD.st==='open'||oneD.st==='full')&&oneD.slots&&oneD.slots.length)?`<div class="av-slots"><small class="muted">Cupo por horario · cerrar un horario no cancela las reservas que ya tiene</small>${oneD.slots.map(s=>`<div class="av-r"><div class="grow"><b>${esc(s.t)} h</b><small class="muted">${s.booked} de ${oneD.cap} ocupados</small></div><span class="chip ${s.st==='closed'?'neutral':s.left?'ok':'bad'}">${s.st==='past'?'Pasado':s.st==='closed'?'Cerrado':s.left?s.left+' libres':'Sin lugar'}</span>${s.st==='past'?'':`<button type="button" class="s" data-slot-ac="${s.st==='closed'?'open_time':'close_time'}" data-t="${esc(s.t)}">${s.st==='closed'?'Abrir':'Cerrar'}</button>`}</div>`).join('')}</div>`:''}
    <div class="av-dr-list">${oneR.length?oneR.map(r=>{const [l,cl]=BK_ST[r.status]||[r.status,''];return `<div class="av-r"><div class="grow"><b>${esc(r.name||'—')}</b><small class="muted">${paxTxt(r)}${r.time?' · '+esc(r.time)+' h':''} · #${r.parent_id||r.id}${r.via?' · paquete “'+esc(r.via)+'”':''}</small></div><span class="chip ${cl}">${l}</span>${r.phone?`<a class="bk-wa" href="https://wa.me/${digits(r.phone)}" target="_blank" rel="noopener">${ic('chat')}${esc(r.phone)}</a>`:''}</div>`}).join(''):'<p class="muted av-none">Sin reservas ese día.</p>'}</div>
    ${oneR.length?'<div class="av-dfoot"><button class="s" id="av-goto">Ver en Reservas →</button></div>':''}</section>`:'';
  const selD=d.days.filter(x=>AV.sel.has(x.day)),multiCard=AV.sel.size>1?`<section class="card av-side-card"><div class="av-dh"><div><small class="muted">Selección</small><h3 class="cap">${AV.sel.size} días elegidos</h3></div></div><p class="muted av-dtxt">${selD.reduce((a,x)=>a+x.booked,0)} personas reservadas de ${selD.reduce((a,x)=>a+x.cap,0)} lugares · ${selD.filter(x=>x.st==='closed').length} cerrados · ${selD.filter(x=>x.st==='full').length} completos</p></section>`:'';
  const hint=!detail&&!multiCard?`<section class="card av-side-card av-hint"><b>Elegí un día</b><p class="muted av-dtxt">Tocá un día para ver sus reservas. Shift + clic elige un rango y Ctrl/⌘ + clic suma días sueltos.</p></section>`:'';
  const hasT=(c.times||[]).length>0; // horarios cargados (estado inicial; después manda el editor de horarios)
  const modeOpts=[['wa','Directo por WhatsApp',!c.enabled],['cal','Calendario + WhatsApp',c.enabled&&c.pay!=='pix'],['pix','Calendario + Pix',c.enabled&&c.pay==='pix']];
  v.innerHTML=`<div class="pagehead"><div><h2>Disponibilidad</h2><p class="muted">Elegí cómo reserva el cliente y qué días tienen lugar.</p></div><div class="row av-head-r"><span class="chip ${c.enabled?'ok':'neutral'}">${modeTxt}</span>${pkg.published?`<a class="s" href="/paquetes/${esc(pkg.slug)}/" target="_blank" rel="noopener">${ic('eye')}Ver ficha</a>`:''}</div></div>
  <section class="card av-top">
    <div class="av-top-f">
      <label class="av-f">Paquete<select id="av-pk">${pk.map(p=>`<option value="${p.id}" ${p.id==AV.pid?'selected':''}>${esc(p.title)}${p.published?'':' (borrador)'}</option>`).join('')}</select></label>
      <label class="av-f">Cómo reserva el cliente<select id="av-mode">${modeOpts.map(([k,l,on])=>`<option value="${k}" ${on?'selected':''}>${l}</option>`).join('')}</select></label>
    </div>
    <small class="muted av-mh" id="av-mode-h"></small>
    <div id="av-pixwarn" class="notice" hidden>${ic('alert')}<span>Falta conectar Mercado Pago (secret MP_ACCESS_TOKEN): hasta entonces los clientes confirman por WhatsApp. Ver ADMIN.md › Cobro con Pix.</span></div>
  </section>
  ${c.enabled?'':`<div class="notice">${ic('alert')}<span>Este paquete está en modo <b>WhatsApp directo</b>: los clientes no ven calendario ni cupos. Elegí otro modo arriba para usarlos.</span></div>`}
  <div class="av-kpis">${stat(sell.filter(x=>x.st==='open').length,'días con lugar',`${sell.length} a la venta`,'ok')}${stat(paid.length,'reservas pagadas',`${paid.reduce((a,r)=>a+r.pax,0)} personas`)}${stat(pend.length,'pendientes',pend.length?'retienen cupo':'sin pendientes','warn')}${stat(occ+'%','ocupación del mes',`${bkT} de ${capT} lugares`)}</div>
  <div class="av-grid">
    <section class="card av-cal-card">
      <div class="av-calh"><div class="av-nav"><button type="button" class="s av-nb" id="av-prev" aria-label="Mes anterior">‹</button><h3 class="cap">${MESES[mm-1]} ${yy}</h3><button type="button" class="s av-nb" id="av-next" aria-label="Mes siguiente">›</button></div>
        <div class="row" style="gap:6px"><button class="s" id="av-today">Hoy</button><button class="s" data-ac="allopen" title="Elige todos los días con salida de este mes">Elegir días con salida</button></div></div>
      <div class="av-cal">${WK.map(([k,l])=>`<button type="button" class="av-wd" data-wdsel="${k}" title="Seleccionar todos los ${l}">${l}</button>`).join('')}${'<span class="av-empty"></span>'.repeat(lead)}${d.days.map(cell).join('')}</div>
      <div class="av-leg"><span class="o">Abierto · lugares libres</span><span class="t">Quedan pocos</span><span class="f">Completo</span><span class="c">Cerrado</span><span class="x">Sin salida o fuera de plazo</span><span class="e">Cambiado a mano</span></div>
    </section>
    <div class="av-side">
      ${detail||multiCard||hint}
      <section class="card av-rules-card">
        <div class="av-dh"><div><h3 style="margin:0">Reglas de venta y horarios</h3><small class="muted">${c.min_pax}–${c.max_pax} pers. · cupo ${c.capacity}${c.by_time?' por horario':'/día'} · ${esc(wdTxt)}${(c.times||[]).length?' · '+c.times.length+' horario'+(c.times.length>1?'s':''):''}</small></div></div>
        <div class="av-cfg">${num('min_pax','Mín. personas',c.min_pax,1,99)}${num('max_pax','Máx. personas',c.max_pax,1,99)}${num('daily_capacity',c.by_time?'Cupo por horario':'Cupo por día',c.capacity,1,9999)}${num('min_advance_days','Anticipación (días)',c.advance,0,365)}${num('horizon_days','Se vende hasta (días)',c.horizon,1,730)}</div>
        <small class="muted av-rh">${c.by_time?'Cupo por horario = personas que entran en cada salida; con la reserva por horario el cupo por día no se usa. ':'Cupo por día = personas que entran ese día. '}Anticipación 0 = se puede reservar para hoy. “Se vende hasta” = días hacia adelante que se abren.</small>
        <section class="av-times" aria-labelledby="av-th"><div class="av-times-h"><div><span class="av-lbl" id="av-th" style="margin:0">Horarios de salida</span> <small class="muted" id="av-tcount" aria-live="polite"></small></div><label class="av-sw"><input type="checkbox" id="av-time" ${c.time_flag?'checked':''}><span class="av-sw-t" aria-hidden="true"></span><span class="av-sw-l"><b>Reservar por horario</b><small class="muted">cada horario tiene su propio cupo</small></span></label></div>
        <small class="muted av-rh" style="margin:6px 0 10px">Opcional. Cargá las horas a las que sale el paquete: se muestran en la ficha y, con “Reservar por horario” prendido, el cliente elige día y horario (el cupo por día deja de usarse).</small>
        <div id="av-time-warn" class="notice" ${(c.time_flag&&!hasT)?'':'hidden'}>${ic('alert')}<span>Para reservar por horario cargá al menos un horario de salida. Hasta entonces se reserva por día.</span></div>
        <div id="av-trows"></div><div id="av-terr" class="av-terr" role="alert" hidden></div>
        <div class="av-tbar"><button type="button" class="s" id="av-tadd">+ Agregar horario</button><button type="button" class="s" id="av-tgen" aria-expanded="false">Generar serie…</button><span class="av-tsug" id="av-tsug"></span></div>
        <div class="av-gen" id="av-gen" hidden><label>Desde<input type="time" id="av-g1" value="09:00" step="300"></label><label>Hasta<input type="time" id="av-g2" value="17:00" step="300"></label><label>Cada<select id="av-g3"><option value="30">30 min</option><option value="45">45 min</option><option value="60" selected>1 hora</option><option value="90">1 h 30</option><option value="120">2 horas</option><option value="180">3 horas</option></select></label><button type="button" class="p" id="av-gok">Agregar</button><button type="button" class="s" id="av-gno">Cancelar</button></div>
        <div class="av-prev" id="av-tprev" aria-live="polite" hidden></div></section>
        <span class="av-lbl">Días de la semana con salida</span><div class="av-wdays">${WK.map(([k,l])=>`<label class="av-wdo"><input type="checkbox" data-wd="${k}" ${c.weekdays.includes(k)?'checked':''}><span>${l}</span></label>`).join('')}</div>
        <div class="av-savebar"><span class="av-dirty" id="av-dirty" hidden>● Cambios sin guardar</span><button class="p av-save" id="av-save">Guardar cambios</button></div>
      </section>
    </div>
  </div>
  <div class="av-dock" id="av-dock" ${AV.sel.size?'':'hidden'}><b id="av-n">${AV.sel.size} día${AV.sel.size>1?'s':''} elegido${AV.sel.size>1?'s':''}</b><span class="grow"></span>
    <button class="s" data-ac="close">Cerrar</button><button class="s" data-ac="open">Abrir</button><button class="s" data-ac="capacity">Cupo…</button><button class="s" data-ac="clear" title="Vuelve a las reglas del paquete">Restaurar regla</button><button class="s" data-ac="none">Limpiar</button></div>`;
  if(AV.focus){const fb=v.querySelector(`[data-day="${AV.focus}"]`);AV.focus=null;if(fb)fb.focus()}
  $('#av-pk').onchange=e=>{AV.pid=+e.target.value;AV.sel.clear();AV.anchor=null;avail()};
  const MODE_H={wa:'La ficha muestra fecha libre y el botón abre WhatsApp con los datos. No hay cupos ni cobro.',cal:'El cliente elige un día libre, se le guarda el lugar unos minutos y confirma con la agencia por WhatsApp. Vos marcás “Pagada” en Reservas.',pix:'El cliente elige un día libre, se le guarda el lugar y paga con Pix (QR o copia e cola). La reserva pasa sola a Pagada. Solo cobra en reales (R$).'};
  const modeUi=()=>{const m=$('#av-mode').value;$('#av-mode-h').textContent=MODE_H[m];$('#av-pixwarn').hidden=!(m==='pix'&&!ME.pix);$$('.av-cfg,.av-wdays').forEach(e=>e.style.opacity=m==='wa'?'.45':'1')};
  $('#av-mode').onchange=modeUi;modeUi();
  // Editor de horarios de salida: filas hora + nota. Se guardan junto con las reglas (PUT booking-config → meta.times).
  const TSUG=['09:00','10:00','14:00','16:00'];
  let trs=(c.time_rows||[]).map(r=>[r[0],r[1]||'']);
  const trRead=()=>$$('.av-tr').map(row=>[row.querySelector('.av-ti').value,row.querySelector('.av-tn').value.trim()]);
  const cmpT=(x,y)=>!x?(!y?0:1):!y?-1:x.localeCompare(y);
  const trSort=a=>a.slice().sort((x,y)=>cmpT(x[0],y[0]));
  const hasNow=()=>$$('.av-ti').some(i=>i.value);
  const timeWarn=()=>{$('#av-time-warn').hidden=!($('#av-time').checked&&!hasNow())};
  const toMin=t=>(+t.slice(0,2))*60+(+t.slice(3,5)),fromMin=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  // Validación en la misma lista: marca los repetidos (siempre) y los vacíos (al guardar); devuelve el primer campo con problema.
  const trCheck=showEmpty=>{
    const rows=$$('.av-tr'),seen={},msgs=[];let first=null;
    rows.forEach(r=>{const v=r.querySelector('.av-ti').value;if(v)seen[v]=(seen[v]||0)+1});
    rows.forEach(r=>{const i=r.querySelector('.av-ti'),bad=(i.value&&seen[i.value]>1)||(showEmpty&&!i.value);r.classList.toggle('bad',!!bad);i.setAttribute('aria-invalid',bad?'true':'false');if(bad&&!first)first=i});
    const dups=Object.keys(seen).filter(k=>seen[k]>1);
    if(dups.length)msgs.push('Horario repetido: '+dups.join(', ')+'. Dejá uno solo por hora.');
    if(showEmpty&&rows.some(r=>!r.querySelector('.av-ti').value))msgs.push('Completá la hora de cada fila o quitá la que esté vacía.');
    const e=$('#av-terr');e.hidden=!msgs.length;e.textContent=msgs.join(' ');
    return first;
  };
  // Vista previa: cómo queda la lista para el cliente (ordenada, sin repetidos).
  const trPrev=()=>{
    const seen=new Set(),ok=trSort(trRead().filter(r=>r[0])).filter(r=>!seen.has(r[0])&&seen.add(r[0])),p=$('#av-tprev');
    p.hidden=!ok.length;
    if(ok.length)p.innerHTML='<small class="muted">Así lo ve el cliente · '+ok.length+' salida'+(ok.length>1?'s':'')+'</small><div class="av-chips">'+ok.map(r=>`<span class="av-chip"${r[1]?' title="'+esc(r[1])+'"':''}>${esc(r[0])}${r[1]?'<i>'+esc(r[1])+'</i>':''}</span>`).join('')+'</div><small class="muted">'+($('#av-time').checked?'Elige uno al reservar y cada horario tiene su cupo.':'Solo informativo en la ficha: se reserva por día.')+'</small>';
  };
  const trAfter=()=>{timeWarn();trCheck(false);trPrev();upd()};
  const trDraw=foc=>{
    trs=trSort(trs);
    const used=new Set(trs.map(r=>r[0]));
    $('#av-trows').innerHTML=trs.length?trs.map((r,i)=>`<div class="av-tr"><input type="time" class="av-ti" value="${esc(r[0])}" step="300" required aria-label="Hora de salida ${i+1}"><input type="text" class="av-tn" value="${esc(r[1])}" maxlength="80" placeholder="Nota (opcional): salida desde el hotel" aria-label="Nota del horario ${i+1}"><button type="button" class="s d av-td" data-tdel aria-label="Quitar el horario ${i+1}" title="Quitar">${ic('x')}</button></div>`).join(''):'<p class="muted av-tempty">Todavía no cargaste horarios: el paquete se reserva por día. Agregá uno, generá una serie (por ejemplo, de 09:00 a 17:00 cada 2 horas) o tocá un horario rápido.</p>';
    $('#av-tsug').innerHTML=TSUG.filter(t=>!used.has(t)).map(t=>`<button type="button" class="s" data-tsug="${t}">+ ${t}</button>`).join('');
    $('#av-tcount').textContent=trs.length?'· '+trs.length+' horario'+(trs.length>1?'s':''):'';
    $('#av-tadd').disabled=trs.length>=24;
    $('#av-tgen').disabled=trs.length>=24;
    $$('[data-tdel]').forEach(b=>b.onclick=()=>{
      const i=$$('.av-tr').indexOf(b.closest('.av-tr'));trs=trRead();trs.splice(i,1);trDraw();trAfter();
      const rows=$$('.av-ti');(rows[Math.min(i,rows.length-1)]||$('#av-tadd')).focus();
    });
    $$('[data-tsug]').forEach(b=>b.onclick=()=>{trs=trRead();if(trs.length<24)trs.push([b.dataset.tsug,'']);trDraw({v:b.dataset.tsug,f:'.av-tn'});trAfter()});
    if(foc){const row=$$('.av-tr').find(r=>r.querySelector('.av-ti').value===foc.v);if(row)row.querySelector(foc.f).focus()}
  };
  $('#av-tadd').onclick=()=>{trs=trRead();const last=trs.map(r=>r[0]).filter(Boolean).sort().pop(),h=last?Math.min(23,+last.slice(0,2)+1):9,t=String(h).padStart(2,'0')+':'+(last?last.slice(3,5):'00');trs.push([t,'']);trDraw({v:t,f:'.av-ti'});trAfter()};
  // Generar una serie de salidas (desde, hasta, cada N minutos); no repite las que ya están.
  const genClose=()=>{$('#av-gen').hidden=true;$('#av-tgen').setAttribute('aria-expanded','false')};
  $('#av-tgen').onclick=()=>{const g=$('#av-gen');g.hidden=!g.hidden;$('#av-tgen').setAttribute('aria-expanded',String(!g.hidden));if(!g.hidden)$('#av-g1').focus()};
  $('#av-gno').onclick=()=>{genClose();$('#av-tgen').focus()};
  $('#av-gok').onclick=()=>{
    const a=$('#av-g1').value,z=$('#av-g2').value,st=+$('#av-g3').value;
    if(!a||!z){toast('Completá “Desde” y “Hasta”','err');return}
    if(toMin(a)>toMin(z)){toast('“Desde” no puede ser después de “Hasta”','err');return}
    trs=trRead();const have=new Set(trs.map(r=>r[0]));let add=0,over=false;
    for(let m=toMin(a);m<=toMin(z);m+=st){const t=fromMin(m);if(have.has(t))continue;if(trs.length>=24){over=true;break}trs.push([t,'']);have.add(t);add++}
    trDraw();trAfter();genClose();
    toast(over?'Se llegó al máximo de 24 horarios':add?add+' horario'+(add>1?'s':'')+' agregado'+(add>1?'s':''):'Esos horarios ya estaban cargados',over?'err':'ok');
  };
  const rowsBox=$('#av-trows');
  rowsBox.addEventListener('input',()=>{timeWarn();trCheck(false);trPrev();upd()});
  // Cuando el foco sale de la fila, las filas se acomodan en orden (no mientras se escribe: el campo de hora dispara "change" en cada tramo).
  rowsBox.addEventListener('focusout',e=>{
    const row=e.target.closest('.av-tr');if(!row||(e.relatedTarget&&row.contains(e.relatedTarget)))return;
    setTimeout(()=>{
      const rows=$$('.av-tr'),cur=rows.map(r=>r.querySelector('.av-ti').value),want=cur.slice().sort(cmpT);
      if(JSON.stringify(cur)===JSON.stringify(want))return;
      const act=document.activeElement;
      rows.slice().sort((x,y)=>cmpT(x.querySelector('.av-ti').value,y.querySelector('.av-ti').value)).forEach(r=>rowsBox.appendChild(r));
      $$('.av-tr').forEach((r,i)=>{r.querySelector('.av-ti').setAttribute('aria-label','Hora de salida '+(i+1));r.querySelector('.av-tn').setAttribute('aria-label','Nota del horario '+(i+1));r.querySelector('.av-td').setAttribute('aria-label','Quitar el horario '+(i+1))});
      if(act&&act!==document.body&&rowsBox.contains(act))act.focus();
      trPrev();upd();
    },0);
  });
  // Enter en la nota: pasa a la fila siguiente o crea una nueva si era la última.
  rowsBox.addEventListener('keydown',e=>{
    if(e.key!=='Enter'||!e.target.classList.contains('av-tn'))return;
    e.preventDefault();const rows=$$('.av-tr'),i=rows.indexOf(e.target.closest('.av-tr'));
    if(i<rows.length-1)rows[i+1].querySelector('.av-ti').focus();else if(rows.length<24)$('#av-tadd').click();
  });
  trDraw();trPrev();$('#av-time').onchange=()=>{timeWarn();trPrev()};timeWarn();
  // Borrador: si se toca un día del calendario, se cambia de mes o se vuelve a esta pantalla, lo que se estaba editando no se pierde.
  const snap=()=>JSON.stringify({r:trRead(),c:$$('[data-cf]').map(i=>i.value),w:$$('[data-wd]:checked').map(i=>i.dataset.wd),t:$('#av-time').checked,m:$('#av-mode').value});
  const base0=snap();
  const upd=()=>{const s=snap(),dirty=s!==base0;AV.draft=dirty?{pid:AV.pid,s:JSON.parse(s)}:null;$('#av-dirty').hidden=!dirty};
  const card=document.querySelector('.av-rules-card');
  card.addEventListener('input',upd);card.addEventListener('change',upd);
  $('#av-mode').addEventListener('change',upd);
  if(AV.draft&&AV.draft.pid===AV.pid){
    const dr=AV.draft.s;trs=dr.r;trDraw();
    $$('[data-cf]').forEach((i,k)=>{if(dr.c[k]!=null)i.value=dr.c[k]});
    $$('[data-wd]').forEach(i=>{i.checked=dr.w.includes(i.dataset.wd)});
    $('#av-time').checked=dr.t;$('#av-mode').value=dr.m;modeUi();
    trAfter();
  }
  $('#av-pk').onchange=async e=>{
    if(AV.draft&&!(await confirmBox('Hay cambios sin guardar','Si cambiás de paquete se pierden los cambios de horarios y reglas que no guardaste.','Descartar cambios'))){e.target.value=AV.pid;return}
    AV.draft=null;AV.pid=+e.target.value;AV.sel.clear();AV.anchor=null;avail();
  };
  $('#av-prev').onclick=()=>{AV.month=avShift(AV.month,-1);avail()};$('#av-next').onclick=()=>{AV.month=avShift(AV.month,1);avail()};$('#av-today').onclick=()=>{AV.month=d.today.slice(0,7);avail()};
  $('#av-save').onclick=async()=>{
    const bad=trCheck(true);
    if(bad){toast('Revisá los horarios marcados en rojo','err');bad.focus();return}
    const rows=trSort(trRead()),sb=$('#av-save');
    if($('#av-time').checked&&!rows.length){toast('Cargá al menos un horario para reservar por horario','err');$('#av-tadd').focus();return}
    const g=k=>Number($(`[data-cf=${k}]`).value),body={times:rows,booking_enabled:$('#av-mode').value==='wa'?0:1,pay_mode:$('#av-mode').value==='pix'?'pix':'whatsapp',min_pax:g('min_pax'),max_pax:g('max_pax'),daily_capacity:g('daily_capacity'),min_advance_days:g('min_advance_days'),horizon_days:g('horizon_days'),weekdays:$$('[data-wd]:checked').map(i=>+i.dataset.wd),time_booking:$('#av-time').checked?1:0};
    sb.disabled=true;sb.textContent='Guardando…';try{const r=await api('booking-config/'+AV.pid,'PUT',body);AV.draft=null;DATA.packages=null;AV.cache=null;const o=(r&&r.orphans)||0;
      toast(o?`Guardado. Ojo: ${o} reserva${o>1?'s':''} futura${o>1?'s':''} quedó en un horario que ya no existe; revisalas en Reservas.`:'Cambios guardados',o?'err':'ok',o?9000:undefined);avail()}catch{sb.disabled=false;sb.textContent='Guardar cambios'}};
  const pick=(day,range)=>{const all=d.days.map(x=>x.day);if(range&&AV.anchor&&all.includes(AV.anchor)){const a=all.indexOf(AV.anchor),b=all.indexOf(day),lo=Math.min(a,b),hi=Math.max(a,b);for(let i=lo;i<=hi;i++)if(d.days[i].st!=='past')AV.sel.add(d.days[i].day)}else{AV.sel.has(day)?AV.sel.delete(day):AV.sel.add(day);AV.anchor=day}AV.focus=day;avail()};
  $$('[data-day]').forEach(b=>b.onclick=e=>{if(!b.disabled)pick(b.dataset.day,e.shiftKey)});
  // Teclado en el calendario: flechas para moverse entre días (saltea los pasados); Enter/Espacio eligen.
  const grid=$('.av-cal');grid?.addEventListener('keydown',e=>{const t=e.target;if(!t.dataset||!t.dataset.day)return;const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];if(!step)return;e.preventDefault();const i0=d.days.findIndex(x=>x.day===t.dataset.day);let i=i0+step;while(i>=0&&i<d.days.length&&d.days[i].st==='past')i+=step;if(i<0||i>=d.days.length)return;const b=grid.querySelector(`[data-day="${d.days[i].day}"]`);if(b)b.focus()});
  $$('[data-wdsel]').forEach(b=>b.onclick=()=>{const k=+b.dataset.wdsel,ds=d.days.filter(x=>x.st!=='past'&&new Date(x.day+'T00:00:00Z').getUTCDay()===k).map(x=>x.day),all=ds.every(x=>AV.sel.has(x));ds.forEach(x=>all?AV.sel.delete(x):AV.sel.add(x));avail()});
  $('#av-goto')?.addEventListener('click',()=>{tab='bookings';location.hash=tab;shell()});
  $$('[data-slot-ac]').forEach(b=>b.onclick=async()=>{try{await api('slots','PUT',{package_id:AV.pid,dates:[oneD.day],action:b.dataset.slotAc,time:b.dataset.t});AV.cache=null;toast(b.dataset.slotAc==='close_time'?'Horario cerrado':'Horario abierto');avail()}catch{}});
  $$('[data-ac]').forEach(b=>b.onclick=async()=>{const ac=b.dataset.ac;if(ac==='none'){AV.sel.clear();avail();return}if(ac==='allopen'){d.days.filter(x=>x.st==='open'||x.st==='full').forEach(x=>AV.sel.add(x.day));avail();return}
    let cap;if(ac==='capacity'){if(!AV.sel.size){toast('Elegí al menos un día','err');return}const m=await modal({title:'Cupo para '+AV.sel.size+' día(s)',body:`<p class="muted">${c.by_time?'Cantidad de personas por horario en esos días (reemplaza el cupo por horario del paquete). Con 0, ese horario figura sin lugar.':'Cantidad de personas que entran esos días (reemplaza el cupo por día del paquete). Con 0 el día figura como completo.'}</p>`,fields:[['cap','Cupo (personas)',c.capacity,'']],ok:'Aplicar'});if(!m)return;cap=Number(m.cap);if(!Number.isInteger(cap)||cap<0||cap>9999){toast('El cupo debe ser un número entre 0 y 9999','err');return}}
    try{const r=await api('slots','PUT',{package_id:AV.pid,dates:[...AV.sel],action:ac,capacity:cap});AV.sel.clear();AV.cache=null;toast(`Listo · ${r.n} día${r.n>1?'s':''} actualizado${r.n>1?'s':''}`);avail()}catch{}})}

const ST_AV={open:'Abierto',full:'Completo (no alcanza el mínimo de personas)',closed:'Cerrado a mano',off:'Día sin salida',late:'Fuera de la anticipación mínima',beyond:'Todavía no se vende (fuera del horizonte)',past:'Pasado'};

/* ---------- listados ---------- */
let LIST_ST='all';
async function list(){
  const k=tab,isP=k==='posts',v=$('#v');v.innerHTML=SK;v.dataset.k=k;const rows=await load(k,true);
  const catList=Object.entries(CATS[k]||{}),today=new Date().toISOString().slice(0,10);
  const stOf=r=>!r.published?'draft':(isP&&r.publish_date>today)?'sched':'pub';
  const cnt=s=>rows.filter(r=>stOf(r)===s).length;
  const seoBad=rows.filter(r=>r.published&&issues(k,r).length).length;
  const noPrice=rows.filter(r=>r.published&&!r.price).length;
  const tipoSeg=isP?'':segCtl([['','Todos',rows.length],['paquete','Paquetes',rows.filter(r=>tipoOf(r)==='paquete').length],['servicio','Servicios',rows.filter(r=>tipoOf(r)==='servicio').length]],LIST_TIPO,'tipo','Tipo de producto');
  const stSeg=segCtl([['all','Todos',rows.length],['pub','Publicados',cnt('pub')],['draft','Borradores',cnt('draft')],...(isP?[['sched','Programadas',cnt('sched')]]:[])],LIST_ST,'lst','Estado');
  const stats=isP
    ?[[rows.length,'entradas en total'],[cnt('pub'),'publicadas','ok'],[cnt('sched'),'programadas'],[seoBad,'con observaciones SEO',seoBad?'warn':'ok']]
    :[[rows.length,'en total'],[cnt('pub'),'publicados','ok'],[noPrice,'sin precio',noPrice?'warn':'ok'],[seoBad,'con observaciones SEO',seoBad?'warn':'ok']];
  v.innerHTML=`<div class="pagehead"><div><h2>${isP?'Blog':'Paquetes y servicios'}</h2><p class="muted">${isP?'Notas que atraen visitas y responden las dudas de los viajeros. Programá publicaciones con fecha.':'Lo que se vende en el sitio: precio, fotos, disponibilidad y SEO. Un paquete combina servicios; un servicio se vende solo.'}</p></div>
    <div class="row" style="flex-wrap:nowrap">${isP?'':`<button class="s" id="new-s">${ic('plus')}Nuevo servicio</button>`}<button class="p" id="new">${ic('plus')}${isP?'Nueva entrada':'Nuevo paquete'}</button></div></div>
  ${isP?statRow(stats):kpRow(stats.map(([n,l,t])=>[n,l,'',t]))}
  <div class="toolbar lt-bar">${tipoSeg}${stSeg}</div>
  <div class="toolbar lt-bar lt-bar2"><div class="bk-search">${ic('search')}<input id="q" type="search" placeholder="Buscar por título o dirección…" aria-label="Buscar"></div>
    <select id="ca" class="lt-sel" aria-label="Categoría"><option value="">Todas las categorías</option>${catList.map(([c,o])=>`<option value="${esc(c)}">${esc(o.label)}</option>`).join('')}</select>
    <select id="so" class="lt-sel" aria-label="Orden"><option value="n">Más recientes</option><option value="a">Título (A–Z)</option><option value="s">Más observaciones SEO</option></select>
    <span class="grow"></span><small class="muted" id="ct"></small></div>
  <div id="rows"></div>`;
  const row=r=>{const is=issues(k,r),st=stOf(r),u=PREFIX[k]+esc(r.slug)+'/',cat=CATS[k]?.[r.category];
    const [stl,stc]={pub:['Publicado','ok'],draft:['Borrador','neutral'],sched:['Programada','info']}[st];
    const tipoBadge=!isP&&tipoLbl(r)?`<span class="tag tipo-${tipoOf(r)}">${tipoLbl(r)}</span>`:'';
    return `<tr class="lt-row${st==='draft'?' is-draft':''}" data-id="${r.id}">
      <td class="lt-img">${r.image?`<img src="${esc(r.image)}" alt="" loading="lazy">`:`<span class="lt-ph">${ic('image')}</span>`}</td>
      <td class="lt-t"><b>${esc(r.title)}</b>${tipoBadge||r.featured?`<span class="lt-badges">${tipoBadge}${r.featured?'<span class="tag tag-home">En inicio</span>':''}</span>`:''}<small class="muted">${u}</small></td>
      <td>${cat?esc(cat.label):'<span class="muted">Sin categoría</span>'}${r.subcategory&&(SUBS[r.category]||[]).find(x=>x.slug===r.subcategory)?`<small class="muted">› ${esc((SUBS[r.category]||[]).find(x=>x.slug===r.subcategory).label)}</small>`:''}</td>
      <td><span class="chip ${stc}">${stl}</span>${st==='sched'?`<small class="muted">${esc(r.publish_date)}</small>`:''}</td>
      <td><span class="seo-pill ${level(is)}" title="${esc(is.map(i=>i.m).join('\n')||'SEO en orden')}">${is.length?`${is.length} obs.`:'SEO ok'}</span></td>
      ${isP?'':`<td class="num">${r.price?`<b>${esc(r.price)}</b>`:'<span class="chip warn">sin precio</span>'}${optsOf(r).length?`<small class="muted">${optsOf(r).length} opciones · desde</small>`:''}</td>`}
      <td class="num muted">${esc((r.updated_at||r.created_at||'').slice(0,10))}</td>
      <td class="lt-act"><div class="lt-acts">${r.published?`<a class="s" href="${u}" target="_blank" rel="noopener" title="Ver en el sitio" aria-label="Ver ${esc(r.title)}">${ic('eye')}</a>`:''}${isP?'':`<button class="s" data-pr="${r.id}" title="Cambiar precio" aria-label="Cambiar precio de ${esc(r.title)}">${ic('dollar')}</button>`}<button class="s" data-e="${r.id}">${ic('edit')}Editar</button><button class="s" data-c="${r.id}" title="Duplicar" aria-label="Duplicar ${esc(r.title)}">${ic('copy')}</button><button class="s d" data-x="${r.id}" title="Borrar" aria-label="Borrar ${esc(r.title)}">${ic('trash')}</button></div></td></tr>`};
  const draw=()=>{const q=$('#q').value.toLowerCase(),ca=$('#ca').value,so=$('#so').value;
    let f=rows.filter(r=>(LIST_ST==='all'||stOf(r)===LIST_ST)&&(!ca||r.category===ca)&&(!LIST_TIPO||isP||tipoOf(r)===LIST_TIPO)&&(!q||(r.title+' '+r.slug).toLowerCase().includes(q)));
    if(so==='a')f=[...f].sort((x,y)=>x.title.localeCompare(y.title,'es'));else if(so==='s')f=[...f].sort((x,y)=>issues(k,y).length-issues(k,x).length);
    $('#ct').textContent=`${f.length} de ${rows.length}`;
    $('#rows').innerHTML=f.length?`<div class="lt-wrap"><table class="tb2 lt-tb"><thead><tr><th><span class="sr">Imagen</span></th><th>Título</th><th>Categoría</th><th>Estado</th><th>SEO</th>${isP?'':'<th class="num">Precio</th>'}<th class="num">Actualizado</th><th class="lt-act"><span class="sr">Acciones</span></th></tr></thead><tbody>${f.map(row).join('')}</tbody></table></div>`
      :emptyBox(rows.length?'Ninguna coincide con los filtros.':(isP?'Todavía no hay entradas en el blog.':'Todavía no hay paquetes ni servicios.'),rows.length?'Probá con otra búsqueda o quitá algún filtro.':'Creá el primero con el botón de arriba.');};
  $$('[data-tipo]').forEach(b=>b.onclick=()=>{LIST_TIPO=b.dataset.tipo;list()});
  $$('[data-lst]').forEach(b=>b.onclick=()=>{LIST_ST=b.dataset.lst;list()});
  draw();['q','ca','so'].forEach(i=>{const e=$('#'+i);e.oninput=draw;e.onchange=draw});
  if(OPEN_ID){const id=OPEN_ID;OPEN_ID=null;const r=rows.find(x=>x.id==id);if(r)form(r);else toast('No encontré esa entrada','err')}
  $('#new').onclick=()=>form(isP?{published:1}:{published:1,meta:JSON.stringify({kind:'paquete'})});
  if($('#new-s'))$('#new-s').onclick=()=>form({published:1,meta:JSON.stringify({kind:'servicio'})});
  $('#rows').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.e||b.dataset.c||b.dataset.x||b.dataset.pr,r=rows.find(x=>x.id==id);
    if(b.dataset.e)form(r);
    else if(b.dataset.c){const f=await api(`${tab}/${r.id}`).catch(()=>null);if(f)form({...f,id:undefined,slug:'',title:f.title+' (copia)',published:0,legacy_id:''})}
    else if(b.dataset.pr&&optsOf(r).length){if(await confirmBox('Precio por opciones','“'+esc(r.title)+'” tiene '+optsOf(r).length+' opciones con precio. Se cambian en el formulario, en <b>Opciones y precios</b>.','Abrir formulario'))form(r)}
    else if(b.dataset.pr){const m=await modal({title:'Precio · '+r.title,fields:[['price_old','Precio anterior (opcional)',r.price_old,'$ 615'],['price','Precio',r.price,'$ 445']],ok:'Guardar'});
      if(m){await api(`packages/${r.id}`,'PUT',{...r,price:m.price.trim(),price_old:m.price_old.trim()});toast('Precio actualizado');list()}}
    else if(b.dataset.x&&await confirmBox('Borrar "'+esc(r.title)+'"','Esta acción no se puede deshacer.','Borrar',true)){await api(`${k}/${id}`,'DELETE');toast('Borrado');list()}}
  document.onkeydown=e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();$('#q').focus()}}}


/* ---------- traducciones al español y al inglés (estados: borrador → revisión → publicada) ---------- */
const TR_ST={borrador:['Borrador','neutral'],revision:['En revisión','info'],publicada:['Publicada','ok']};
let TR_F='all',TR_K='',TR_L='es';
const TR_LANG={es:{n:'español',N:'Español',of:'en español',g:'Google (español)'},en:{n:'inglés',N:'Inglés',of:'en inglés',g:'Google (inglés)'}};
const trSlug=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
const trUrl=(kind,slug,lang='es')=>'/'+lang+'/'+(kind==='posts'?'blog':'paquetes')+'/'+slug+'/';
async function translations(){
  const v=$('#v');v.innerHTML=SK;let d,po,pk;
  try{[d,po,pk]=await Promise.all([api('translations'),load('posts',true),load('packages',true)])}catch{return}
  const L=TR_L,LT=TR_LANG[L];if(L==='en'&&TR_K==='packages')TR_K='';if(L==='en')pk=[];
  const by=new Map(d.items.filter(i=>(i.lang||'es')===L).map(i=>[i.kind+':'+i.ref_id,i]));
  const all=[...po.map(r=>['posts',r]),...pk.map(r=>['packages',r])].map(([kind,r])=>({kind,r,t:by.get(kind+':'+r.id)||null}));
  const stOf=x=>x.t?x.t.status:'none',cnt=s=>all.filter(x=>stOf(x)===s).length;
  const seg=segCtl([['all','Todos',all.length],['none','Sin traducir',cnt('none')],['borrador','Borrador',cnt('borrador')],['revision','En revisión',cnt('revision')],['publicada','Publicadas',cnt('publicada')]],TR_F,'trf','Estado de la traducción');
  const idioma=segCtl([['es','Español'],['en','Inglés (blog)']],TR_L,'trl','Idioma de la traducción');
  const tipo=L==='en'?'':segCtl([['','Todo',all.length],['posts','Blog',po.length],['packages','Paquetes y servicios',pk.length]],TR_K,'trk','Tipo de contenido');
  v.innerHTML=`<div class="pagehead"><div><h2>Traducciones</h2><p class="muted">Versión ${LT.of} de ${L==='en'?'cada nota del blog':'cada nota, paquete y servicio'}. Solo las traducciones <b>publicadas</b> aparecen en el sitio (<code>/${L}/…</code>), en el hreflang y en el sitemap.${L==='en'?' El inglés es solo para el blog.':''}</p></div></div>
  ${kpRow([[cnt('none'),'sin traducir','',cnt('none')?'warn':'ok'],[cnt('borrador'),'en borrador'],[cnt('revision'),'en revisión'],[cnt('publicada'),'publicadas','','ok']])}
  <div class="toolbar lt-bar">${idioma}${tipo}${seg}</div>
  <div class="toolbar lt-bar lt-bar2"><div class="bk-search">${ic('search')}<input id="q" type="search" placeholder="Buscar por título…" aria-label="Buscar"></div><span class="grow"></span><small class="muted" id="ct"></small></div><div id="rows"></div>`;
  const row=x=>{const [l,c]=x.t?TR_ST[x.t.status]||['—','neutral']:['Sin traducir','warn'],kind=x.kind,tl=kind==='posts'?'Blog':(tipoLbl(x.r)||'Paquete');
    return `<tr class="lt-row" data-id="${x.r.id}"><td class="lt-t"><b>${esc(x.r.title)}</b><small class="muted">${esc(PREFIX[kind]+x.r.slug)}/</small></td><td>${esc(tl)}</td>
    <td><span class="chip ${c}">${l}</span></td><td class="lt-t">${x.t?`<small class="muted">${esc(trUrl(kind,x.t.slug,L))}</small>`:'<span class="muted">—</span>'}</td>
    <td class="num muted">${x.t?esc((x.t.updated_at||'').slice(0,10))+(x.t.updated_by?`<br><small>${esc(x.t.updated_by)}</small>`:''):''}</td>
    <td class="lt-act"><div class="lt-acts">${x.t&&x.t.status==='publicada'?`<a class="s" href="${esc(trUrl(kind,x.t.slug,L))}" target="_blank" rel="noopener" aria-label="Ver en el sitio">${ic('eye')}</a>`:''}<button class="s" data-k="${kind}" data-id="${x.r.id}">${ic('edit')}${x.t?'Editar':'Traducir'}</button></div></td></tr>`};
  const draw=()=>{const q=$('#q').value.toLowerCase(),f=all.filter(x=>(TR_F==='all'||stOf(x)===TR_F)&&(!TR_K||x.kind===TR_K)&&(!q||(x.r.title+' '+x.r.slug).toLowerCase().includes(q)));
    $('#ct').textContent=`${f.length} de ${all.length}`;
    $('#rows').innerHTML=f.length?`<div class="lt-wrap"><table class="tb2 lt-tb"><thead><tr><th>Contenido original</th><th>Tipo</th><th>${LT.N}</th><th>Dirección</th><th class="num">Actualizado</th><th class="lt-act"><span class="sr">Acciones</span></th></tr></thead><tbody>${f.map(row).join('')}</tbody></table></div>`:emptyBox(all.length?'Ninguno coincide con los filtros.':'Todavía no hay contenido para traducir.')};
  $$('[data-trf]').forEach(b=>b.onclick=()=>{TR_F=b.dataset.trf;translations()});
  $$('[data-trk]').forEach(b=>b.onclick=()=>{TR_K=b.dataset.trk;translations()});
  $$('[data-trl]').forEach(b=>b.onclick=()=>{TR_L=b.dataset.trl;translations()});
  draw();$('#q').oninput=draw;
  $('#rows').onclick=e=>{const b=e.target.closest('button[data-k]');if(b)trEdit(b.dataset.k,+b.dataset.id,L)}}

async function trEdit(kind,id,lang=TR_L){
  const v=$('#v');v.innerHTML=SK;let base,cur;const LT=TR_LANG[lang]||TR_LANG.es;
  try{[base,cur]=await Promise.all([api(`${kind}/${id}`),api(`translations?kind=${kind}&ref=${id}&lang=${lang}`)])}catch{return}
  const isP=kind==='posts',t=cur.tr||cur.es,dt=t?t.data:{},val=k=>t?(dt[k]??''):'',isNew=!t;let slugTouched=!!(t&&t.slug);dirty=false;
  const cur0=t?t.status:'borrador',canPub=isAdmin()||cur0==='publicada';
  const btm=(()=>{try{const m=typeof base.meta==='string'?JSON.parse(base.meta||'{}'):(base.meta||{});return (m.times||[]).map(r=>r[0]+(r[1]?' | '+r[1]:'')).join('\n')}catch{return ''}})();
  const orig=k=>base[k]?`<small class="muted" style="display:block;margin:-4px 0 10px">Original: ${esc(String(base[k]).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,160))}</small>`:'';
  const fi=(k,l,ph='')=>`<label for="t-${k}">${l}</label><input id="t-${k}" data-f="${k}" value="${esc(val(k))}" placeholder="${esc(ph)}">${orig(k)}`;
  const ft=(k,l,rows,ph='')=>`<label for="t-${k}">${l}</label><textarea id="t-${k}" data-f="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(val(k))}</textarea>${orig(k)}`;
  v.innerHTML=`<div class="pagehead form-head"><div><button class="s" id="back">${ic('back')}Volver a traducciones</button><h2 style="margin-top:10px">${isNew?'Traducir':'Traducción'}: ${esc(base.title)}</h2><p class="muted" style="margin:4px 0 0">Original en portugués · <code>${esc(PREFIX[kind]+base.slug)}/</code></p></div></div>
  <div class="grid fm-grid"><div>
   <div class="card">${fi('title','Título '+LT.of)}
    <label for="t-slug">Dirección web ${LT.of} <small>${esc(trUrl(kind,'',lang))}<b id="slugv"></b>/</small></label><input id="t-slug" value="${esc(t?t.slug:'')}" placeholder="se genera desde el título"><div class="err" id="slugn"></div>
    ${isP?'':`<div class="row"><div class="grow">${fi('price_old','Precio anterior (opcional)')}</div><div class="grow">${fi('price','Precio')}</div></div>`}
    ${ft('excerpt','Resumen corto',3)}${isP?ft('times','Notas de los horarios (una línea por horario: 09:00 | nota)',4,btm||'09:00 | Salida desde el hotel'):ft('details','Qué incluye / detalles (una línea por ítem)',4)}</div>
   <div class="card"><label>Contenido</label><div class="row" style="margin:4px 0 8px"><button type="button" class="s" id="copyorig">Copiar el original como punto de partida</button><small class="muted">Útil para conservar títulos y listas; reemplazá todo el texto por la traducción.</small></div>
    <div class="ed" id="ed" contenteditable aria-label="Contenido ${LT.of}" data-ph="Escribí o pegá la traducción…">${t?(dt.content||''):''}</div></div>
   <div class="card"><h3>${LT.g}</h3>${fi('seo_title','Título para Google','Si lo dejás vacío se usa el título')}${ft('seo_description','Descripción para Google',3,'Si la dejás vacía se usa el resumen corto')}${fi('image_alt','Texto alternativo de la imagen')}
    <small>Ideal: título hasta 60 caracteres, descripción entre 70 y 160.</small></div>
  </div><div>
   <div class="card stk"><h3>Estado editorial</h3>
    <label for="t-status">Estado</label><select id="t-status"><option value="borrador"${cur0==='borrador'?' selected':''}>Borrador · no se ve en el sitio</option><option value="revision"${cur0==='revision'?' selected':''}>En revisión · lista para que la revisen</option><option value="publicada"${cur0==='publicada'?' selected':''}${canPub?'':' disabled'}>Publicada · visible en /${lang}/, hreflang y sitemap</option></select>
    <small class="muted">${canPub?'Publicá solo después de revisar el texto, los precios y las expresiones.':'Solo un administrador puede publicar. Dejala en revisión cuando esté lista.'}</small><br><br>
    <div class="row"><button class="p" id="save">${ic('check')}Guardar</button>${isNew?'':`<button class="s d" id="del" aria-label="Borrar la traducción" title="Borrar la traducción">${ic('trash')}</button>`}</div>
    <span class="tag" id="dirty" hidden>● Sin guardar</span>
    ${t?`<small class="muted" style="display:block;margin-top:8px">Última edición: ${esc((t.updated_at||'').slice(0,16))}${t.updated_by?' · '+esc(t.updated_by):''}</small>`:''}
    ${t&&t.status==='publicada'?`<p><a href="${esc(trUrl(kind,t.slug,lang))}" target="_blank" rel="noopener">Ver en el sitio ↗</a></p>`:''}</div>
   <details class="card"><summary><b>Original en portugués</b></summary><br><h4 style="margin:0 0 6px">${esc(base.title)}</h4><div class="muted" style="max-height:340px;overflow:auto">${esc(String(base.content||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,1800))}…</div></details>
  </div></div>`;
  const mark=()=>{dirty=true;$('#dirty').hidden=false},setSlug=()=>{$('#slugv').textContent=$('#t-slug').value||'…'};setSlug();
  $$('[data-f]').forEach(i=>i.addEventListener('input',mark));$('#ed').addEventListener('input',mark);$('#t-status').onchange=mark;
  $('#t-title').addEventListener('input',()=>{if(!slugTouched){$('#t-slug').value=trSlug($('#t-title').value);setSlug()}});
  $('#t-slug').addEventListener('input',()=>{slugTouched=true;setSlug();mark()});
  $('#back').onclick=async()=>{if(await leave()){dirty=false;translations()}};
  $('#copyorig').onclick=async()=>{if($('#ed').textContent.trim()&&!(await confirmBox('Reemplazar el contenido','Se pierde lo que escribiste en el editor.','Reemplazar',true)))return;$('#ed').innerHTML=base.content||'';mark()};
  $('#save').onclick=async()=>{
    const data={};$$('[data-f]').forEach(i=>data[i.dataset.f]=i.value.trim());data.content=$('#ed').innerHTML.trim();
    const slug=$('#t-slug').value.trim()||trSlug(data.title);
    if(!data.title){toast('Falta el título '+LT.of,'err');return}
    try{await api('translations','PUT',{kind,ref_id:id,lang,slug,data,status:$('#t-status').value})}catch(e){if(e&&e.error&&/slug/i.test(e.error))$('#slugn').textContent=e.error;return}
    dirty=false;toast('Traducción guardada');trEdit(kind,id,lang)};
  if($('#del'))$('#del').onclick=async()=>{if(await confirmBox('Borrar la traducción','Se borra la versión '+LT.of+' de este contenido y deja de aparecer en el sitio. No se puede deshacer.','Borrar',true)){try{await api(`translations?kind=${kind}&ref=${id}&lang=${lang}`,'DELETE')}catch{return}dirty=false;toast('Traducción borrada');translations()}}}


/* ---------- autoría: perfil del autor y tarjeta del editor del blog ---------- */
let AUTH=null;
const srcLines=raw=>{try{return JSON.parse(raw||'[]').map(x=>x.label+' | '+x.url).join('\n')}catch{return String(raw||'')}};
function authCard(r){
  if(!AUTH)return '';
  const A=AUTH.authors||[],me=AUTH.me||0,cur=r.id?r.author_id:(r.author_id??me);
  const opt=(sel,none)=>`<option value="">${none}</option>`+A.filter(a=>a.active||a.id==sel).map(a=>`<option value="${a.id}" ${a.id==sel?'selected':''}>${esc(a.name)}${a.headline?' · '+esc(a.headline):''}${a.profile_public?'':' (perfil privado)'}</option>`).join('');
  return `<div class="card"><h3>Autoría</h3><label for="f-author_id">Autor</label><select id="f-author_id" data-k="author_id">${opt(cur,'Equipo de la agencia')}</select>
  <label for="f-reviewer_id" style="margin-top:10px">Revisor editorial <small>(otra persona que verifica el contenido)</small></label><select id="f-reviewer_id" data-k="reviewer_id">${opt(r.reviewer_id,'Sin revisor')}</select>
  <label for="f-sources" style="margin-top:10px">Fuentes y referencias <small>(una por línea: Nombre | https://…)</small></label><textarea id="f-sources" data-k="sources" rows="4" placeholder="Turismo BA | https://turismo.buenosaires.gob.ar">${esc(srcLines(r.sources))}</textarea>
  <small class="muted">Aparecen al final del artículo y se declaran a Google. Hasta 8. La firma enlaza al perfil del autor si lo hizo público en <b>Mi perfil</b>.</small></div>`}

async function profile(uid){
  const v=$('#v');v.innerHTML=SK;
  if(!uid&&!(ME.user&&ME.user.id)){v.innerHTML=`<div class="notice">${ic('alert')}<span>Estás usando la clave general del sitio, que no tiene perfil. Entrá con tu email para completar el tuyo.</span></div>`;return}
  let d;try{d=await api(uid?`authors/${uid}`:'profile')}catch{return}
  dirty=false;const own=!uid,links=(d.links||[]).map(l=>l.label+' | '+l.url).join('\n');
  const fi=(k,l,ph='',max=0)=>`<label for="p-${k}">${l}</label><input id="p-${k}" data-p="${k}" value="${esc(d[k]||'')}" placeholder="${esc(ph)}"${max?` maxlength="${max}"`:''}>`;
  const ft=(k,l,rows,ph='',val=d[k])=>`<label for="p-${k}">${l}</label><textarea id="p-${k}" data-p="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(val||'')}</textarea>`;
  v.innerHTML=`<div class="pagehead form-head"><div>${own?'':`<button class="s" id="back">${ic('back')}Volver a usuarios</button>`}<h2 style="margin-top:${own?0:10}px">${own?'Mi perfil':'Perfil de '+esc(d.name||d.email)}</h2><p class="muted" style="margin:4px 0 0">Es lo que ven los lectores y Google de quien firma los artículos: nombre, foto, descripción profesional, biografía y experiencia.</p></div></div>
  <div class="grid fm-grid"><div>
   <div class="card">${fi('name','Nombre','Ej: María Pérez',80)}${fi('headline','Descripción profesional','Ej: Guía de turismo en Buenos Aires desde 2012',120)}
    ${ft('bio','Biografía',6,'Quién sos, qué te apasiona de Buenos Aires y por qué podés recomendar lo que escribís.')}<small class="muted">Hasta 1.500 caracteres. Una línea en blanco separa los párrafos.</small>
    ${ft('experience','Experiencia',5,'Años en el rubro, idiomas, certificaciones, zonas que conocés…')}
    ${ft('links','Enlaces <small>(uno por línea: Nombre | https://…; hasta 8)</small>',3,'Instagram | https://instagram.com/tuusuario',links)}</div>
  </div><div>
   <div class="card stk"><h3>Foto</h3><img class="thumb" id="p-th" src="${esc(d.avatar||'')}" alt="" ${d.avatar?'':'hidden'}>
    <input id="p-avatar" data-p="avatar" value="${esc(d.avatar||'')}" placeholder="https://… o subí un archivo"><input type="file" id="p-file" accept="image/*" style="margin:0 0 10px"><small>Se achica y convierte a WebP antes de subir. Mejor una foto cuadrada y de cerca.</small>
    <h3 style="margin-top:14px">Perfil público</h3><label style="display:flex;gap:8px;align-items:flex-start;font-weight:normal"><input type="checkbox" id="p-pub" ${d.profile_public?'checked':''} style="margin-top:3px"><span><b>Mostrar mi página de autor</b><br><small class="muted">Tu firma en los artículos enlaza a <code>/autor/${esc(d.slug||'tu-nombre')}/</code> con tu biografía, experiencia y artículos. Sin esto, solo se muestra tu nombre.</small></span></label>
    ${d.slug&&d.profile_public?`<p><a href="/autor/${esc(d.slug)}/" target="_blank" rel="noopener">Ver mi página ↗</a></p>`:''}
    <div class="row" style="margin-top:12px"><button class="p" id="save">${ic('check')}Guardar</button></div><span class="tag" id="dirty" hidden>● Sin guardar</span></div>
  </div></div>`;
  const mark=()=>{dirty=true;$('#dirty').hidden=false};
  $$('[data-p]').forEach(i=>i.addEventListener('input',mark));$('#p-pub').onchange=mark;
  if($('#back'))$('#back').onclick=async()=>{if(await leave()){dirty=false;users()}};
  $('#p-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const u=await upload(f);$('#p-avatar').value=u;$('#p-th').src=u;$('#p-th').hidden=false;mark()}catch{}};
  $('#save').onclick=async()=>{
    const b={profile_public:$('#p-pub').checked?1:0};$$('[data-p]').forEach(i=>b[i.dataset.p]=i.value.trim());
    if(!b.name){toast('Escribí tu nombre','err');return}
    let r;try{r=await api(uid?`authors/${uid}`:'profile','PUT',b)}catch{return}
    if(own&&ME.user)ME.user.name=b.name;dirty=false;toast('Perfil guardado');profile(uid)}}

/* ---------- formulario ---------- */
/* ---------- formato automático del texto del blog ---------- */
function autoFmt(text,o={}){
  const E=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inl=t=>E(t).replace(/\*\*(.+?)\*\*|__(.+?)__/g,(m,a,b)=>`<strong>${a||b}</strong>`).replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g,'$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2">$1</a>').replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g,'$1<a href="$2">$2</a>');
  const lines=String(text||'').replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ').split('\n').map(x=>x.trim());
  const hasBlank=lines.some((x,i)=>!x&&i>0&&i<lines.length-1);
  const isLi=x=>/^([-*•–·]\s+|\d+[.)]\s+)\S/.test(x);
  const nextNonEmpty=i=>{for(let k=i+1;k<lines.length;k++)if(lines[k])return lines[k];return ''};
  const out=[];let title='',list=null,para=[],first=true;
  const flushP=()=>{if(para.length){out.push(`<p>${inl(para.join(' '))}</p>`);para=[]}};
  const flushL=()=>{if(list){out.push(`<${list.t}>${list.i.map(x=>`<li>${inl(x)}</li>`).join('')}</${list.t}>`);list=null}};
  const flush=()=>{flushP();flushL()};
  for(let i=0;i<lines.length;i++){const l=lines[i];
    if(!l){flush();continue}
    let m;
    if(first){first=false;
      if((m=l.match(/^#\s+(.+)$/))){if(o.title)title=m[1].replace(/\*\*/g,'');continue}
      if(o.title&&l.length<=100&&!/[.;:]$/.test(l)&&!isLi(l)&&nextNonEmpty(i)){title=l.replace(/^#+\s*/,'').replace(/\*\*/g,'');continue}}
    if((m=l.match(/^#{1,2}\s+(.+)$/))){flush();out.push(`<h2>${inl(m[1].replace(/\*\*/g,''))}</h2>`);continue}
    if((m=l.match(/^#{3,6}\s+(.+)$/))){flush();out.push(`<h3>${inl(m[1].replace(/\*\*/g,''))}</h3>`);continue}
    if((m=l.match(/^\*\*([^*]{2,80})\*\*:?$/))){flush();out.push(`<h2>${inl(m[1])}</h2>`);continue}
    if((m=l.match(/^(consejo|tip|recomendaci[oó]n)\s*:\s*(.+)$/i))){flush();out.push(`<div class="gvb-tip"><strong>Consejo</strong><p>${inl(m[2])}</p></div>`);continue}
    if((m=l.match(/^(dato clave|dato|importante|sab[ií]as que)\s*:\s*(.+)$/i))){flush();out.push(`<div class="gvb-dato"><strong>Dato clave</strong><p>${inl(m[2])}</p></div>`);continue}
    if((m=l.match(/^>\s?(.+)$/))){flush();out.push(`<blockquote><p>${inl(m[1])}</p></blockquote>`);continue}
    if((m=l.match(/^[-*•–·]\s+(.+)$/))){flushP();if(!list||list.t!=='ul'){flushL();list={t:'ul',i:[]}}list.i.push(m[1]);continue}
    if((m=l.match(/^\d+[.)]\s+(.+)$/))){flushP();if(!list||list.t!=='ol'){flushL();list={t:'ol',i:[]}}list.i.push(m[1]);continue}
    const nx=nextNonEmpty(i),words=l.split(/\s+/).length;
    if(!para.length&&!list&&l.length<=70&&words>=2&&words<=10&&!/[.,;]$/.test(l)&&nx&&!isLi(nx)&&(nx.length>l.length||isLi(nx))&&(hasBlank?!lines[i+1]:true)&&(!/:$/.test(l)||!isLi(nx))){flush();out.push(`<h2>${inl(l.replace(/:$/,''))}</h2>`);continue}
    if(!para.length&&l.length<=70&&/:$/.test(l)&&isLi(nx)){flush();out.push(`<h3>${inl(l.replace(/:$/,''))}</h3>`);continue}
    flushL();
    if(hasBlank)para.push(l);else{out.push(`<p>${inl(l)}</p>`)}
  }
  flush();
  return{html:out.join(''),title}}

async function compress(file){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type))return file;
  try{const bmp=await createImageBitmap(file),sc=Math.min(1,1600/Math.max(bmp.width,bmp.height));
    const c=document.createElement('canvas');c.width=Math.round(bmp.width*sc);c.height=Math.round(bmp.height*sc);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
    const blob=await new Promise(r=>c.toBlob(r,'image/webp',.82));return blob&&blob.size<file.size?blob:file}catch{return file}}
async function upload(file){
  const isV=/^video\//.test(file.type)||/\.(mp4|m4v|webm|mov)$/i.test(file.name);
  if(isV&&file.size>50*1024*1024){toast('El video pesa '+(file.size/1048576).toFixed(0)+' MB y el máximo es 50 MB. Comprimilo (HandBrake o CapCut, 1080p) y volvé a subirlo.','err');throw new Error('big')}
  if(isV)toast('Subiendo video… puede tardar un poco');
  const f=isV?file:await compress(file);
  const ct=f.type||({mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',mov:'video/quicktime',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'})[(f.name.split('.').pop()||'').toLowerCase()]||'';
  const r=await fetch('/api/upload',{method:'POST',headers:{'content-type':ct},body:f}),d=await r.json().catch(()=>({}));
  if(!d.url){toast(esc(d.error||'No se pudo subir'),'err');throw d}
  if(f!==file)toast(`Imagen optimizada: ${(file.size/1024).toFixed(0)} KB → ${(f.size/1024).toFixed(0)} KB`);
  return d.url}

const DET=['Traslado incluido','Desayuno','Almuerzo','Cena','Open bar','Guía en portugués','Guía en español','Entradas incluidas','Impuestos incluidos'];
const ART_TPL='<p>Escribí una introducción corta: qué va a encontrar el lector y por qué le interesa.</p><h2>Primera sección</h2><p>Desarrollá la idea principal con ejemplos concretos.</p><h2>Segunda sección</h2><p>Sumá detalles útiles: horarios, qué llevar, cuánto tiempo lleva.</p><div class="gvb-tip"><strong>Consejo</strong><p>Una recomendación práctica para el viajero.</p></div><h2>Tercera sección</h2><p>Cerrá contando cómo puede vivirlo con la agencia.</p>';
const E_P=t=>`<p>${esc(t)}</p>`;
// El listado no trae el contenido (es pesado): al abrir una ficha para editar se pide completa.
async function form(r){
  if(r&&r.id&&r.content===undefined){try{r=await api(`${tab}/${r.id}`)}catch{return}}
  AUTH=tab==='posts'?await api('authors').catch(()=>null):null;
  formView(r);
}
function formView(r){
  const k=tab,isP=k==='posts',v=$('#v'),isNew=!r.id,origSlug=r.slug||'';let slugTouched=!!r.slug;dirty=false;const MB=(()=>{try{return JSON.parse(r.meta||'{}')||{}}catch{return{}}})();
  const inp=(key,label,ph='',extra='')=>`<label for="f-${key}">${label}</label><input id="f-${key}" data-k="${key}" value="${esc(r[key])}" placeholder="${esc(ph)}" ${extra}>`;
  const SLUGH=`<label for="f-slug">Dirección web <small>${PREFIX[k]}<b id="slugv"></b>/</small></label><input id="f-slug" data-k="slug" value="${esc(r.slug)}" placeholder="se genera desde el título"><div class="err" id="slugn" style="color:#8a6500"></div>`,EXCH=`<label for="f-excerpt">Resumen corto <span class="cnt" id="c-ex"></span></label><textarea id="f-excerpt" data-k="excerpt" rows="3">${esc(r.excerpt)}</textarea>${isP?'<button type="button" class="s" id="auto-ex" style="margin-top:6px">Generar resumen desde el contenido</button>':''}`,PUBRELH=`<label for="f-publish_date">Fecha de publicación (opcional)</label><input type="date" id="f-publish_date" data-k="publish_date" value="${esc(r.publish_date||'')}"><small>Vacía = se publica al guardar. Con una fecha futura, la entrada queda programada y se muestra ese día (desde las 00:00 de Buenos Aires).</small>
    <label>Entradas relacionadas <small>(hasta 3; si no marcás ninguna, se muestran las de la misma categoría)</small></label><div class="row" style="flex-wrap:wrap;gap:8px 16px">${(DATA.posts||[]).filter(x=>x.id!==r.id).slice(0,60).map(x=>`<label style="font-weight:normal;margin:0"><input type="checkbox" data-rel="${x.id}" ${String(r.related_ids||'').split(',').includes(String(x.id))?'checked':''}> ${esc(x.title)}</label>`).join('')||'<small class="muted">Todavía no hay otras entradas.</small>'}</div>`,FEATH=`<label><input type="checkbox" id="feat" ${r.featured?'checked':''}> Destacado en el inicio</label><small>${isP?'Aparece en la página de inicio, en la sección del blog.':'Aparece en la página de inicio, en la sección de paquetes.'}</small>`,ALTH=`${inp('image_alt','Texto alternativo (describe la imagen)','Ej: Show de tango en Puerto Madero')}`,GOOGLEH=`<h3>Cómo se ve en Google</h3>
    <div class="serp"><div class="u" id="sp-u"></div><div class="t" id="sp-t"></div><div class="ds" id="sp-d"></div></div><br>
    <label for="f-seo_title">Título para Google <span class="cnt" id="c-t"></span></label><input id="f-seo_title" data-k="seo_title" value="${esc(r.seo_title)}" placeholder="Si lo dejás vacío se usa el título">
    <label for="f-seo_description">Descripción para Google <span class="cnt" id="c-d"></span></label><textarea id="f-seo_description" data-k="seo_description" rows="3" placeholder="Si la dejás vacía se usa el resumen corto">${esc(r.seo_description)}</textarea>
    <small>Ideal: título hasta 60 caracteres, descripción entre 70 y 160, con la palabra clave y el beneficio.</small>`,LEGH=`${inp('legacy_id','ID viejo de WordPress (opcional)','Ej: 13149')}<small>Si este post existía en el sitio anterior como <code>/?p=13149</code>, los enlaces viejos apuntarán acá.</small>`;
  const ADV=isP?`<details class="card"><summary><b>Opciones avanzadas</b> <small class="muted">· se completan solas; tocá solo si querés cambiar algo</small></summary><br>${SLUGH}${EXCH}${PUBRELH}<br>${FEATH}<br><br>${ALTH}<br>${GOOGLEH}<br>${LEGH}</details>`:'';
  v.innerHTML=`<div class="pagehead form-head"><div><button class="s" id="back">${ic('back')}Volver a ${isP?'el blog':'paquetes y servicios'}</button><h2 style="margin-top:10px">${isNew?(isP?'Nueva entrada':tipoOf(r)==='servicio'?'Nuevo servicio':'Nuevo paquete'):(r.title?esc(r.title):(isP?'Editar entrada':tipoOf(r)==='servicio'?'Editar servicio':'Editar paquete'))}</h2><p class="muted" style="margin:4px 0 0"><span class="status ${r.published===0?'draft':'live'}">${r.published===0?'Borrador':'Publicado'}</span>${isNew?'':` · última edición ${esc((r.updated_at||r.created_at||'').slice(0,10))}`}</p></div></div>
  <div class="grid fm-grid"><div>
   <div class="card">${inp('title','Título')}
    ${isP?'':SLUGH}
    <label for="f-category">Categoría <small>(se administran en la sección Categorías)</small></label><div class="row" style="flex-wrap:nowrap"><select id="f-category" class="grow" data-k="category" style="margin:4px 0 10px">${catOpts(k,r.category)}</select><button type="button" class="s" id="newcat" style="margin:0 0 6px">+ Nueva</button></div>
    ${isP?'':`<label for="f-subcategory">Subcategoría <small>(opcional · ej. dentro de Tangos: Con cena, Solo show)</small></label><div class="row" style="flex-wrap:nowrap"><select id="f-subcategory" class="grow" data-k="subcategory" style="margin:4px 0 10px">${subOpts(r.category,r.subcategory||'')}</select><button type="button" class="s" id="newsub" style="margin:0 0 6px">+ Nueva</button></div>
    <div class="optbox"><div class="optbox-h"><h4>Opciones y precios</h4><p class="muted">Usalo cuando el mismo servicio tiene variantes que solo cambian el precio (ej. tango: <b>Solo show</b>, <b>Con cena</b>, <b>Platea VIP</b>). Comparten fecha, horario y cupo; el cliente elige la opción al reservar. Si no tiene variantes, dejalo vacío y cargá un solo precio abajo.</p></div>
     <div id="optrows"></div><div class="row" style="gap:6px"><button type="button" class="s" id="optadd">${ic('plus')}Agregar opción</button></div>
     <div class="polbox"><h4>Políticas <small class="muted">(opcional · si aplica)</small></h4><p class="muted">Condiciones que el cliente tiene que saber antes de reservar: menores, cancelación, documentación, pagos u otra. Se muestran en la ficha en la sección <b>Políticas</b>; si una vale solo para una opción, elegila en “Aplica a”.</p><div id="polauto"></div>
      <div id="polrows"></div><div class="row pol-add" style="gap:6px">${POLT.map(([k,l])=>`<button type="button" class="s" data-poladd="${k}">${ic('plus')}${k==='otra'?'Otra política':l}</button>`).join('')}</div></div></div>
    <div id="pricebox"><div class="row"><div class="grow">${inp('price_old','Precio anterior (opcional)','$ 615')}</div><div class="grow">${inp('price','Precio','$ 445')}</div></div></div><p id="optnote" class="optnote" hidden></p><label style="display:flex;gap:8px;align-items:flex-start;font-weight:normal;margin:6px 0 4px"><input type="checkbox" id="f-kids" style="margin-top:3px" ${r.accepts_children?'checked':''}><span><b>Acepta niños</b><br><small class="muted">Si lo marcás, al reservar el cliente elige cuántos adultos y cuántos niños viajan. Si no, se pide solo la cantidad de personas.</small></span></label>
    <div class="kidbox" style="margin:10px 0"><label style="display:flex;gap:8px;align-items:flex-start;font-weight:normal;margin:0"><input type="checkbox" id="f-best" style="margin-top:3px" ${MB.best?'checked':''}><span><b>Mejor precio del mercado</b><br><small class="muted">Muestra el sello “Melhor preço” en la ficha y en las tarjetas, y la IA lo usa para vender. Marcalo solo si es verdad.</small></span></label><div style="margin-top:8px">${'<label>Precio en la boletería del lugar <small class="muted">(opcional · lo mismo comprado directo en el lugar. Si tiene varias opciones, poné el precio de boletería como “precio anterior” de cada opción)</small><input id="f-box" value="'+esc(MB.box||'')+'" placeholder="R$ 600"></label>'}</div><div style="margin-top:8px"><label>⚡ Oferta relámpago en la portada hasta <small class="muted">(opcional · fecha y hora de Buenos Aires. Mientras dure, el producto sale en la portada con cuenta regresiva real y se cobran los precios que cargues ahora. Al terminar vuelven solos los precios de antes. Poné un precio anterior para que se vea el descuento)</small><input id="f-flash" type="datetime-local" value="'+esc(MB.flash||'')+'"></label>'+(MB.snap&&MB.flash?'<small class="muted" style="display:block;margin-top:4px">↩︎ Cuando termine vuelve a: '+esc([MB.snap.price&&('precio '+MB.snap.price+(MB.snap.price_old?' (antes '+MB.snap.price_old+')':'')),(MB.snap.options||[]).length&&('opciones: '+MB.snap.options.map(o=>o[0]+' '+o[1]).join(', ')),(MB.snap.qty||[]).length?'su tabla por cantidad de antes':'sin tabla por cantidad'].filter(Boolean).join(' · '))+'. Si borrás la fecha, la oferta termina ya y vuelve a esto.</small>':'<small class="muted" style="display:block;margin-top:4px">Cargá el precio de oferta y la fecha y guardá: cuando venza (o si borrás la fecha) vuelven solos los precios que tenía antes.</small>')+'</div><div style="margin-top:14px;display:grid;gap:6px"><label style="margin:0">Precio según la cantidad de personas <small class="muted">(opcional · ej. 2x1. Una línea por cantidad: <code>2 = R$ 400</code>. Si el producto tiene opciones, podés poner una tabla por opción: <code>Somente Show | 3 = R$ 800</code>. Las líneas sin opción valen para todas las que no tengan tabla propia. El sitio, la reserva y la IA cobran el total que pongas, sin multiplicar. Una cantidad que no esté en la tabla tiene que consultarse)</small></label><textarea id="f-qty" rows="6" placeholder="1 = R$ 400\n2 = R$ 400\n3 = R$ 800\n4 = R$ 800">'+esc((MB.qty||[]).map(r=>(r[2]?r[2]+' | ':'')+r[0]+' = '+r[1]).join('\n'))+'</textarea><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button type="button" class="btn ghost sm" id="f-qty-2x1" style="flex:none;white-space:nowrap;width:auto;height:auto">Completar como 2x1 (hasta 10)</button><small class="muted" style="flex:1;min-width:200px">Toma el “Precio” (o el de cada opción) como precio de cada par. Después ajustás los números a mano.</small></div><label style="margin:8px 0 0">Texto junto al precio en la web <small class="muted">(opcional · ej. “por 2 pessoas”. Vacío = “por pessoa”)</small></label><input id="f-unit" value="'+esc(MB.unit_lbl||'')+'" placeholder="por pessoa"></div></div><div id="kidauto" class="kidbox" hidden></div><div id="kidbox" class="kidbox" ${r.accepts_children?'':'hidden'}><h4>Precio de los niños</h4><p class="muted" style="margin:0 0 10px">Definí por edad cuánto paga cada niño. Cuando reservan, el cliente indica la edad de cada uno y el total se calcula solo. Desde la edad siguiente al último tramo pagan como adulto.</p>
     <div class="row" style="gap:6px;margin-bottom:10px" id="ktpre"></div><div id="kttiers"></div><button type="button" class="s" id="ktadd">+ Agregar tramo</button>
     <div class="kt-prev" id="ktprev" aria-live="polite"></div><small class="muted" style="display:block;margin-top:8px">Los niños que entran gratis igual ocupan un lugar en el cupo del día.</small>
     <input type="hidden" id="f-kids_policy" data-k="kids_policy" value="${esc(r.kids_policy||'')}"></div>`}
    ${isP?'':EXCH}
    ${isP?'':`<label>Qué incluye / detalles <small>(tocá para agregar o quitar, una línea por ítem)</small></label><div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:6px">${DET.map(x=>`<button type="button" class="s" data-chip="${esc(x)}" aria-pressed="false">${esc(x)}</button>`).join('')}</div><textarea id="f-details" data-k="details" rows="4" placeholder="Ej: Traslado ida y vuelta desde hotel">${esc(r.details||'')}</textarea>`}</div>${isP?'':(()=>{const m=(()=>{try{return JSON.parse(r.meta||'{}')}catch{return{}}})(),L=(x,f)=>esc((x||[]).map(f).join('\n')),ta=(k,lab,h,ph,val)=>`<label for="f-${k}">${lab} <small>${h}</small></label><textarea id="f-${k}" data-k="${k}" rows="4" placeholder="${esc(ph)}">${val}</textarea>`;return `<div class="card"><h3 style="margin-top:0">Datos de la ficha</h3><small class="muted">Se muestran ordenados en la página del paquete o servicio. Todo es opcional.</small>`+`<label for="f-m_kind">Tipo de producto <small>(un paquete combina varios servicios; los servicios también se venden solos)</small></label><select id="f-m_kind" data-k="m_kind" style="margin:4px 0 10px">${!m.kind&&!isNew?'<option value="" selected>Servicio (sin etiquetar)</option>':''}<option value="servicio" ${m.kind==='servicio'?'selected':''}>Servicio o experiencia (se vende solo)</option><option value="paquete" ${m.kind==='paquete'||(!m.kind&&isNew&&!r.meta)?'selected':''}>Paquete (combina varios servicios)</option></select><div id="partsbox" ${m.kind==='paquete'||(!m.kind&&isNew&&!r.meta)?'':'hidden'}><label>Servicios que incluye este paquete <small>(marcá los que lo componen; cada uno se muestra con su precio y también se puede consultar por separado)</small></label><div class="row" style="flex-wrap:wrap;gap:8px 16px;margin-bottom:10px">${(DATA.packages||[]).filter(x=>x.id!==r.id&&((m.parts||[]).includes(x.slug)||!(()=>{try{return JSON.parse(x.meta||'{}').kind==='paquete'}catch{return false}})())).map(x=>`<label style="font-weight:normal;margin:0"><input type="checkbox" data-part="${esc(x.slug)}" ${(m.parts||[]).includes(x.slug)?'checked':''}> ${esc(x.title)}</label>`).join('')||'<small class="muted">Primero cargá los servicios sueltos (hotel, traslado, excursión…) y después armá el paquete.</small>'}</div><div class="row" style="gap:8px;align-items:center;margin:-2px 0 12px"><button type="button" class="s" id="fillparts">${ic('plus')}Completar con los servicios</button><small class="muted">Llena lo que esté vacío: título, resumen, qué incluye, foto y datos clave.</small></div>
<div class="itbox" id="itbox"><div class="it-h"><h4>Itinerario y precio</h4><p class="muted">Ordená los servicios y elegí qué día del paquete va cada uno. Al reservar, el cliente elige la fecha de inicio y se descuenta el cupo de cada servicio en su día.</p></div>
 <div class="it-mode" role="radiogroup" aria-label="Cómo se arma el itinerario"><label><input type="radio" name="it-mode" value="fijo" ${m.pmode!=='libre'?'checked':''}><span><b>Itinerario fijo</b><small>Vos decidís el día de cada servicio. El cliente solo elige cuándo empieza.</small></span></label><label><input type="radio" name="it-mode" value="libre" ${m.pmode==='libre'?'checked':''}><span><b>El cliente elige los días</b><small>Cada servicio se reserva en la fecha que el cliente quiera, mientras tenga lugar. Tu día queda como recomendado.</small></span></label></div>
 <label class="it-win" id="it-win-box" ${m.pmode==='libre'?'':'hidden'}>El cliente puede repartir los servicios en <span><input type="number" id="it-win" min="1" max="60" step="1" value="${Number(m.win)||''}" placeholder="30" inputmode="numeric"> días desde la fecha de inicio</span><small class="muted" style="display:block">Vacío = 30 días: el cliente puede poner cada servicio en cualquier fecha con lugar dentro de los 30 días siguientes a la que elige en el calendario. Tu día del itinerario le aparece como “Recomendado”. En la web toca “Elegir fecha” en cada servicio y elige el día (y el horario) en una ventana.</small></label>
 <div id="itrows"></div>
 <div class="it-price"><label class="it-auto"><input type="checkbox" id="it-auto" ${m.auto===1||m.auto===undefined?'checked':''}><span><b>Precio automático</b><small>El precio del paquete es la suma de los servicios y se actualiza solo si cambia el precio de alguno.</small></span></label><label class="it-disc">Descuento del paquete <span><input type="number" id="it-disc" min="0" max="90" step="1" value="${Number(m.disc)||0}" inputmode="numeric"> %</span></label></div>
 <div id="itsum" class="it-sum" aria-live="polite"></div><ul id="itwarn" class="it-warn"></ul></div></div>`+
ta('m_facts','Datos clave','(una línea por dato: Etiqueta: valor)','Duración: 4 horas\nHorario: AM 8:30 · PM 14:30\nTransporte: Van',L(m.facts,r=>r[0]+': '+r[1]))+
ta('m_times','Horarios de salida','(una línea por horario: 09:00 | nota opcional; se ordenan solos). Más fácil: cargalos en Disponibilidad','09:00 | Salida desde el hotel\n14:30',L(m.times,r=>r[0]+(r[1]?' | '+r[1]:'')))+
ta('m_exc','Qué no incluye','(una línea por ítem)','Comidas y bebidas',L(m.exc,x=>x))+
ta('m_stops','Paradas del recorrido','(una por línea, en orden)','Obelisco',L(m.stops,x=>x))+
ta('m_var','Tabla comparativa (opcional, solo informativa)','(no cambia el precio: para eso usá Opciones y precios. Primera línea = encabezados; separá las columnas con |)','Opción | Precio | Incluye\nPlatea | Consultar | Cena 3 pasos',L(m.table,r=>r.join(' | ')))+
ta('m_faq','Preguntas frecuentes','(una por línea: Pregunta | Respuesta)','¿Te buscan en el hotel? | Sí, la salida es desde tu hotel.',L(m.faq,r=>r[0]+' | '+r[1]))+
ta('m_gal','Galería de imágenes','(una foto por línea. Podés poner "dirección | descripción de la foto" para el texto alternativo; sin descripción se genera solo. Podés subir archivos con el botón de abajo)','/media/foto.webp | Vista del Obelisco',L(m.gallery,x=>x))+`<input type="file" id="gfile" multiple accept="image/*,video/mp4,video/webm,video/quicktime" style="margin:0 0 10px"><small>Subí fotos o videos (varios a la vez, hasta 12 en total en la galería). Se agregan solos a la lista; acordate de guardar.</small></div>`})()}
   <div class="card"><label>Contenido</label><small id="rt" class="muted"></small><small class="muted" style="display:block;margin:4px 0 8px">${isP?'Pegá o escribí tu texto como lo tengas: los títulos, listas, negritas y consejos se ordenan solos. El índice, el tiempo de lectura y el botón de reservar también se generan solos.':'El índice de secciones, el tiempo de lectura y el llamado a reservar se generan solos. Escribí las secciones con los títulos H2.'}</small>${isP?'<button type="button" class="p" id="autofmt" style="margin-bottom:8px">Dar formato automático</button>':''}${isP?'<details class="tbx"><summary>Herramientas de formato (opcional)</summary>':''}<div class="tb">${[['bold','<b>B</b>'],['italic','<i>I</i>'],['formatBlock:h2','H2'],['formatBlock:h3','H3'],['insertUnorderedList','• Lista'],['insertOrderedList','1. Lista'],['formatBlock:blockquote','“ Cita'],['createLink','Link'],['unlink','Sin link'],['removeFormat','Limpiar'],['img','Imagen'],...(isP?[['blk:dato','＋ Dato clave'],['blk:tip','＋ Consejo'],['blk:quote','＋ Cita destacada']]:[]),...(isP&&isNew?[['tpl','Estructura de artículo']]:[])].map(([c,l])=>`<button type="button" class="s" data-c="${c}">${l}</button>`).join('')}<input type="file" id="cfile" accept="image/*" hidden></div>${isP?'</details>':''}
    <div class="ed" id="ed" contenteditable aria-label="Contenido" data-ph="Pegá acá tu texto…">${r.content||''}</div></div>${isP?ADV:''}
  </div><div>
   <div class="card stk"><h3>Publicación</h3><label><input type="checkbox" id="pub" ${r.published===0?'':'checked'}> Publicado</label><small>Desmarcalo para guardar como borrador (no se ve ni entra al sitemap).</small><br>
    ${isP?'':FEATH}<br><br>
    <div class="row"><button class="p" id="save">${ic('check')}Guardar</button><button class="s" id="saveb">Guardar y volver</button></div><small>Ctrl/⌘ + S también guarda.</small> <span class="tag" id="dirty" hidden>● Sin guardar</span><div id="after"></div></div>
   ${isP?authCard(r):''}
   <div class="card"><h3>Imagen</h3>${r.image?`<img class="thumb" id="thumb" src="${esc(r.image)}" alt="">`:'<img class="thumb" id="thumb" hidden alt="">'}
    ${inp('image','URL de la imagen','https://… o subí un archivo')}<input type="file" id="file" accept="image/*" style="margin:0 0 10px"><small>Se achica y convierte a WebP antes de subir.</small>
    ${isP?'':ALTH}</div>
   <div class="card"><h3>Video <small>(opcional)</small></h3><video id="vthumb" class="thumb" controls preload="metadata" playsinline ${/^\/media\//.test(r.video||'')?`src="${esc(r.video)}"`:'hidden'}></video>
    ${inp('video','URL del video','https://… (MP4/WebM) o subí un archivo')}<input type="file" id="vfile" accept="video/mp4,video/webm,video/quicktime" style="margin:0 0 10px"><small>MP4, WebM o MOV, hasta 50 MB. Aparece en la página, debajo de la imagen. <a href="#" id="vclear">Quitar video</a></small></div>
   ${isP?'':`<div class="card"><h3>Cómo se ve en Google</h3>
    <div class="serp"><div class="u" id="sp-u"></div><div class="t" id="sp-t"></div><div class="ds" id="sp-d"></div></div><br>
    <label for="f-seo_title">Título para Google <span class="cnt" id="c-t"></span></label><input id="f-seo_title" data-k="seo_title" value="${esc(r.seo_title)}" placeholder="Si lo dejás vacío se usa el título">
    <label for="f-seo_description">Descripción para Google <span class="cnt" id="c-d"></span></label><textarea id="f-seo_description" data-k="seo_description" rows="3" placeholder="Si la dejás vacía se usa el resumen corto">${esc(r.seo_description)}</textarea>
    <small>Ideal: título hasta 60 caracteres, descripción entre 70 y 160, con la palabra clave y el beneficio.</small></div>`}
   
  </div></div>`;
  { const side=$('.grid')?.children[1];if(side){const box=document.createElement('div');box.className='card seo-card';box.id='seo-live';side.insertBefore(box,side.children[1]||null)} }
  // Barra de guardado fija abajo: se MUEVEN los botones existentes (mismos ids y manejadores) en lugar de copiarlos.
  { const sv=$('#save'),row=sv&&sv.parentElement,dt=$('#dirty'),bar=document.createElement('div');bar.className='savebar';if(dt)bar.append(dt);if(row)bar.append(row);v.appendChild(bar);$$('.stk br').forEach(b=>b.remove()) }
  const g=key=>($(`[data-k=${key}]`).value||'').trim(),ed=$('#ed');
  const cnt=(el,n,lo,hi)=>{el.textContent=`${n}/${hi}`;el.className='cnt '+(n===0?'bad':n<lo?'warn':n>hi?'warn':'ok')};
  // Checklist SEO en vivo: se recalcula con lo que hay escrito (sin guardar).
  const seoRows=()=>{const t=full(g('seo_title')||g('title')||''),d=g('seo_description')||strip(g('excerpt')),words=strip(ed.innerHTML).split(' ').filter(Boolean).length,
    h2=ed.querySelectorAll('h2').length,
    internal=[...ed.querySelectorAll('a[href]')].filter(a=>{const h=a.getAttribute('href')||'';return h.startsWith('/')||h.includes(location.host)}).length,
    external=[...ed.querySelectorAll('a[href^="http"]')].filter(a=>!a.href.includes(location.host)).length,
    others=(DATA[k]||[]).filter(x=>x.id!==r.id),
    tdup=!!t&&others.some(x=>full(x.seo_title||x.title||'').toLowerCase()===t.toLowerCase()),
    ddup=!!d&&others.some(x=>(x.seo_description||'').trim().toLowerCase()===d.toLowerCase()),
    slug=g('slug')||slugify(g('title')||''),minW=isP?600:150;
    return [
      [t.length>=30&&t.length<=60?'ok':t.length>60?'warn':'bad','Título',t.length?`${t.length}/60 caracteres${t.length>60?' · Google lo corta':t.length<30?' · conviene llegar a 30 o más':''}`:'Falta el título para Google'],
      [d.length>=70&&d.length<=160?'ok':d.length>160?'warn':'bad','Descripción',d.length?`${d.length}/160 caracteres${d.length<70?' · conviene 70 o más':d.length>160?' · Google la corta':''}`:'Falta la descripción para Google'],
      [words>=minW?'ok':words>=minW/2?'warn':'bad','Contenido',`${words} palabras · ~${Math.max(1,Math.ceil(words/200))} min de lectura${words<minW?` · ideal ${minW} o más`:''}`],
      [h2>=2?'ok':h2===1?'warn':'bad','Secciones (H2)',`${h2} sección${h2===1?'':'es'}${h2<2?' · dividí el texto con títulos H2':''}`],
      [internal>=2?'ok':internal===1?'warn':'bad','Enlaces internos',`${internal} · ${internal<2?'sumá links a otras entradas o paquetes':'bien conectado con el sitio'}`],
      [external?'ok':'warn','Enlaces externos',external?`${external} a sitios externos`:'Sin fuentes externas (opcional)'],
      [g('image')?(g('image_alt')?'ok':'warn'):'bad','Imagen',g('image')?(g('image_alt')?'Con texto alternativo':'Falta el texto alternativo (alt)'):'Sin imagen destacada'],
      [slug.length<=60?'ok':'warn','Dirección web',slug?`/${slug}/${slug.length>60?' · muy larga':''}`:'Se genera al escribir el título'],
      [tdup?'bad':'ok','Título único',tdup?'Otra entrada tiene el mismo título para Google':'Sin títulos repetidos'],
      [ddup?'warn':'ok','Descripción única',ddup?'Otra entrada usa la misma descripción':'Sin descripciones repetidas'],
    ];};
  const renderSeo=()=>{const el=$('#seo-live');if(!el)return;const rs=seoRows(),okN=rs.filter(x=>x[0]==='ok').length,pct=Math.round(okN*100/rs.length);
    el.innerHTML=`<div class="seo-head"><h3>Checklist SEO</h3><span class="seo-score ${pct>=80?'ok':pct>=50?'warn':'bad'}">${okN}/${rs.length}</span></div><div class="seo-meter" aria-hidden="true"><i style="width:${pct}%"></i></div><ul class="seo-list">${rs.map(([st,l,h])=>`<li class="${st}"><span class="seo-ic" aria-hidden="true">${st==='ok'?'✓':st==='warn'?'!':'✕'}</span><div><b>${esc(l)}</b><small>${esc(h)}</small></div></li>`).join('')}</ul>`;};
  const upd=()=>{const slug=g('slug')||slugify(g('title'))||'…',t=full(g('seo_title')||g('title')||'Título'),d=g('seo_description')||strip(g('excerpt'));
    $('#slugv').textContent=slug;$('#sp-u').textContent=`${(ME.site||location.origin).replace(/^https?:\/\//,'')} › ${PREFIX[k].replace(/\//g,'')} › ${slug}`;
    $('#sp-t').textContent=t.length>60?t.slice(0,58)+'…':t;$('#sp-d').textContent=d.length>160?d.slice(0,158)+'…':d||'Sin descripción: Google elegirá un fragmento al azar del contenido.';
    if($('#rt')){const w=strip(ed.innerHTML).split(' ').filter(Boolean).length;$('#rt').textContent=`~${Math.max(1,Math.ceil(w/200))} min de lectura · ${w} palabras`}
    cnt($('#c-t'),t.length,30,60);cnt($('#c-d'),d.length,70,160);cnt($('#c-ex'),g('excerpt').length,70,160);
    $('#slugn').textContent=(!isNew&&origSlug&&slug!==origSlug)?'Al cambiar la dirección, la anterior redirigirá automáticamente a la nueva (301).':'';
    const im=$('#thumb'),u=g('image');if(u){im.src=u;im.hidden=false}else im.hidden=true;renderSeo()};
  $$('[data-k]').forEach(i=>i.addEventListener('input',()=>{dirty=true;if(i.dataset.k==='slug')slugTouched=true;if(i.dataset.k==='title'&&isNew&&!slugTouched)$('#f-slug').value=slugify(i.value);upd()}));
  ed.addEventListener('input',()=>{dirty=true;upd()});
  const ax=$('#auto-ex');if(ax)ax.onclick=()=>{const t=strip(ed.innerHTML);$('#f-excerpt').value=(t.length>155?t.slice(0,155).replace(/\s\S*$/,'')+'…':t);dirty=true;upd()};
  const syncChips=()=>{const t=$('#f-details');if(!t)return;const L=t.value.split('\n').map(x=>x.trim());$$('[data-chip]').forEach(b=>{const on=L.includes(b.dataset.chip);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})};
  $$('[data-chip]').forEach(b=>b.onclick=()=>{const t=$('#f-details'),lines=t.value.split('\n').map(x=>x.trim()).filter(Boolean),i=lines.indexOf(b.dataset.chip);if(i>=0)lines.splice(i,1);else lines.push(b.dataset.chip);t.value=lines.join('\n');dirty=true;syncChips()});
  if($('#f-details')){$('#f-details').addEventListener('input',syncChips);syncChips()}
  ed.addEventListener('paste',e=>{e.preventDefault();const t=e.clipboardData.getData('text/plain');
    if(!isP){document.execCommand('insertText',false,t);return}
    const x=autoFmt(t,{title:!ed.textContent.trim()&&!g('title')});
    if(x.title){const ti=$('#f-title');ti.value=x.title;ti.dispatchEvent(new Event('input',{bubbles:true}))}
    document.execCommand('insertHTML',false,x.html||E_P(t));dirty=true;upd()});
  const af=$('#autofmt');if(af)af.onclick=()=>{if(ed.querySelector('h2,h3,ul,ol,blockquote,img,.gvb-dato,.gvb-tip')){toast('El texto ya tiene formato','err');return}
    const t=ed.innerText;if(!t.trim())return;const x=autoFmt(t,{title:!g('title')});if(x.title){const ti=$('#f-title');ti.value=x.title;ti.dispatchEvent(new Event('input',{bubbles:true}))}
    ed.innerHTML=x.html;dirty=true;upd();toast('Formato aplicado')};
  // Precio de niños por edad: tramos "de X a Y años paga Z %". Se guarda como JSON en el campo oculto kids_policy (el servidor lo valida y normaliza).
  const kidsUi=()=>{const cb=$('#f-kids');if(!cb)return;
    // Cada tramo: mode "pct" (val = % del precio adulto) o "amt" (val = precio fijo del niño, se guarda en centavos como amt).
    let KT=[];try{KT=(JSON.parse(r.kids_policy||'{}').tiers||[]).map(t=>t.amt!=null?{from:t.from,to:t.to,mode:'amt',val:t.amt/100}:{from:t.from,to:t.to,mode:'pct',val:t.pct})}catch{}
    const curPre=()=>(String(($('#f-price')||{}).value||'').trim().match(/^[^\d]*/)||[''])[0].trim()||'R$';
    const box=$('#kidbox'),hid=$('#f-kids_policy'),W=$('#kttiers'),PRE=[['Gratis hasta 5 años',[[0,5,0]]],['Gratis hasta 5 · mitad de 6 a 11',[[0,5,0],[6,11,50]]],['Mitad de precio hasta 11',[[0,11,50]]],['Sin descuento',[]]];
    const money=(txt,pct)=>{const t=String(txt||'').trim(),pre=(t.match(/^[^\d]*/)||[''])[0].trim();let n=t.replace(/[^\d.,]/g,'');if(!n)return '';n=n.includes(',')?n.replace(/\./g,'').replace(',','.'):/\.\d{3}$/.test(n)?n.replace(/\./g,''):n;const v=parseFloat(n);if(!Number.isFinite(v))return '';const x=Math.round(v*pct)/100;return (pre?pre+' ':'')+x.toLocaleString('es-AR',{minimumFractionDigits:x%1?2:0,maximumFractionDigits:2})};
    const save=()=>{hid.value=cb.checked&&KT.length?JSON.stringify({tiers:KT.map(t=>t.mode==='amt'?{from:+t.from,to:+t.to,amt:t.val===''?'':Math.round(+t.val*100)}:{from:+t.from,to:+t.to,pct:t.val===''?'':+t.val})}):'';dirty=true;if(typeof polAuto==='function')polAuto()};
    const prev=()=>{const pr=($('#f-price')||{}).value||'',el=$('#ktprev');
      if(!KT.length){el.innerHTML='<p class="muted" style="margin:0">Sin tramos: los niños pagan lo mismo que un adulto. Elegí una opción de arriba o agregá un tramo para darles descuento o entrada gratis.</p>';return}
      const fmt=v=>curPre()+' '+(+v).toLocaleString('es-AR',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2});
      const rows=[...KT].sort((a,b)=>a.from-b.from).map(t=>{const a=+t.from,b=+t.to,yr=a===b?a+(a===1?' año':' años'):a+' a '+b+' años';
        if(t.mode==='amt'){const v=+t.val;return `<li><b>${yr}</b><span>${t.val===''?'<em>Falta el precio</em>':v===0?'<em class="ok">Gratis</em>':'Precio fijo · '+esc(fmt(v))}</span></li>`}
        const pct=+t.val,amt=money(pr,pct);return `<li><b>${yr}</b><span>${pct===0?'<em class="ok">Gratis</em>':pct===100?'Precio completo':pct+'% del adulto'}${pct>0&&pct<100&&amt?` · ${esc(amt)}`:''}</span></li>`});
      const last=Math.max(...KT.map(t=>+t.to));if(last<17)rows.push(`<li><b>Desde ${last+1} años</b><span>Precio de adulto${pr?` · ${esc(pr)}`:''}</span></li>`);
      el.innerHTML=`<p class="muted" style="margin:0 0 4px">Así lo ve el cliente al reservar:</p><ul>${rows.join('')}</ul>`};
    const draw=()=>{W.innerHTML=KT.map((t,i)=>`<div class="kt-row" data-i="${i}"><span>De</span><input type="number" inputmode="numeric" min="0" max="17" data-kt="from" value="${esc(t.from)}" aria-label="Edad desde" style="width:64px;margin:0;flex:0 0 auto"><span>a</span><input type="number" inputmode="numeric" min="0" max="17" data-kt="to" value="${esc(t.to)}" aria-label="Edad hasta" style="width:64px;margin:0;flex:0 0 auto"><span>años paga</span><input type="number" inputmode="decimal" min="0" ${t.mode==='amt'?'step="0.01" style="width:96px;margin:0;flex:0 0 auto"':'max="100" style="width:64px;margin:0;flex:0 0 auto"'} data-kt="val" value="${esc(t.val)}" aria-label="${t.mode==='amt'?'Precio fijo del niño':'Porcentaje del precio de adulto'}"><select data-kt="mode" aria-label="Porcentaje o precio fijo" style="width:auto;margin:0;flex:0 0 auto;padding:8px"><option value="pct" ${t.mode!=='amt'?'selected':''}>% del adulto</option><option value="amt" ${t.mode==='amt'?'selected':''}>${esc(curPre())} (precio fijo)</option></select><button type="button" class="s d" data-ktdel aria-label="Quitar tramo">${ic('x')}</button></div>`).join('');
      $$('[data-kt]',W).forEach(i=>{if(i.dataset.kt==='mode'){i.onchange=()=>{const ix=+i.closest('.kt-row').dataset.i,t=KT[ix];t.mode=i.value;t.val=i.value==='amt'?'':50;save();draw();W.querySelectorAll('[data-kt="val"]')[ix]?.focus()};return}
        i.oninput=()=>{const row=i.closest('.kt-row');KT[+row.dataset.i][i.dataset.kt]=i.value===''?'':Number(i.value);save();prev()}});
      $$('[data-ktdel]',W).forEach(b=>b.onclick=()=>{KT.splice(+b.closest('.kt-row').dataset.i,1);save();draw()});
      $('#ktadd').hidden=KT.length>=4;prev()};
    $('#ktpre').innerHTML=PRE.map(([l],i)=>`<button type="button" class="s" data-pre="${i}">${l}</button>`).join('');
    $$('[data-pre]').forEach(b=>b.onclick=()=>{KT=PRE[+b.dataset.pre][1].map(([from,to,pct])=>({from,to,mode:'pct',val:pct}));save();draw()});
    $('#ktadd').onclick=()=>{const last=KT.length?Math.max(...KT.map(t=>+t.to))+1:0;KT.push({from:Math.min(last,17),to:Math.min(last+5,17),mode:'pct',val:50});save();draw()};
    cb.onchange=()=>{box.hidden=!cb.checked;save()};
    const pe=$('#f-price');if(pe)pe.addEventListener('input',prev);
    draw()};
  // Opciones con precio: filas Nombre | Precio | Precio anterior | Detalle. Con al menos una opción con precio, el precio del producto
  // se calcula solo (la más barata) y los campos de precio quedan bloqueados para no cargar lo mismo dos veces.
  let ITAUTO=()=>{};
  let OPT=isP?[]:optsOf(r).map(o=>({name:o[0]||'',price:o[1]||'',old:o[2]||'',note:o[3]||''}));window.__gvOPT=()=>OPT; // lo usa “Completar como 2x1”
  const optsUi=()=>{const W=$('#optrows');if(!W)return;
    const note=()=>{const ok=OPT.filter(o=>o.name.trim()&&Number.isFinite(priceNum(o.price))&&priceNum(o.price)>0),pb=$('#pricebox'),n=$('#optnote');
      if(!ok.length){pb.hidden=false;$$('input',pb).forEach(i=>i.disabled=false);n.hidden=true;ITAUTO();return}
      const b=ok.reduce((a,x)=>priceNum(x.price)<priceNum(a.price)?x:a);pb.hidden=true;$$('input',pb).forEach(i=>i.disabled=true);
      $('#f-price').value=b.price;$('#f-price_old').value=b.old;n.hidden=false;
      n.innerHTML=`${ic('check')}<span>Precio “a partir de”: <b>${esc(b.price)}</b> (${esc(b.name)}). Se toma solo de la opción más barata.${OPT.some(o=>o.name.trim()&&!(priceNum(o.price)>0))?' <em>Hay opciones sin precio numérico: no se muestran.</em>':''}</span>`};
    const draw=()=>{W.innerHTML=OPT.map((o,i)=>`<div class="opt-row" data-i="${i}"><span class="opt-n" aria-hidden="true">${i+1}</span>
      <input data-o="name" value="${esc(o.name)}" placeholder="Nombre · ej. Platea VIP" aria-label="Nombre de la opción ${i+1}" maxlength="60">
      <input data-o="price" value="${esc(o.price)}" placeholder="Precio · R$ 450" aria-label="Precio de la opción ${i+1}" maxlength="40" inputmode="decimal">
      <input data-o="old" value="${esc(o.old)}" placeholder="Antes (opc.)" aria-label="Precio anterior de la opción ${i+1}" maxlength="40" inputmode="decimal">
      <span class="opt-act"><button type="button" class="s" data-om="-1" aria-label="Subir" title="Subir" ${i?'':'disabled'}>${ic('up')}</button><button type="button" class="s" data-om="1" aria-label="Bajar" title="Bajar" ${i<OPT.length-1?'':'disabled'}>${ic('down')}</button><button type="button" class="s d" data-odel aria-label="Quitar opción" title="Quitar">${ic('x')}</button></span>
      <input data-o="note" class="opt-note" value="${esc(o.note)}" placeholder="Qué incluye esta opción (opcional) · ej. Cena 3 pasos + vino" aria-label="Detalle de la opción ${i+1}" maxlength="140"></div>`).join('')||'<p class="muted opt-empty">Sin opciones: se usa un solo precio.</p>';
      $$('[data-o]',W).forEach(x=>x.oninput=()=>{const o=OPT[+x.closest('.opt-row').dataset.i];if(x.dataset.o==='name')POL.forEach(p=>{if(p.opt&&p.opt===o.name.trim())p.opt=x.value.trim()});o[x.dataset.o]=x.value;dirty=true;note()});
      $$('[data-o="name"]',W).forEach(x=>x.onchange=()=>polUi());
      $$('[data-odel]',W).forEach(b=>b.onclick=()=>{const o=OPT[+b.closest('.opt-row').dataset.i];POL.forEach(p=>{if(p.opt===o.name.trim())p.opt=''});OPT.splice(+b.closest('.opt-row').dataset.i,1);dirty=true;draw();polUi()});
      $$('[data-om]',W).forEach(b=>b.onclick=()=>{const i=+b.closest('.opt-row').dataset.i,j=i+ +b.dataset.om;[OPT[i],OPT[j]]=[OPT[j],OPT[i]];dirty=true;draw()});
      $('#optadd').disabled=OPT.length>=12;note()};
    $('#optadd').onclick=()=>{if(!OPT.length&&g('price'))OPT.push({name:'',price:g('price'),old:g('price_old'),note:''});OPT.push({name:'',price:'',old:'',note:''});dirty=true;draw();const l=$$('#optrows [data-o="name"]');(l.find(x=>!x.value)||l[l.length-1])?.focus()};
    draw()};
  // Itinerario y precio de un paquete que combina servicios. IT.rows = [{slug, day, time, option}] en el orden del itinerario.
  // Precio automático = suma de los servicios (la opción elegida o la más barata) − descuento %. El servidor recalcula lo mismo al guardar.
  const SV=Object.fromEntries((DATA.packages||[]).map(x=>{let mm={};try{mm=JSON.parse(x.meta||'{}')}catch{}const times=(mm.times||[]).map(t=>t[0]).filter(Boolean),opts=(mm.options||[]).filter(o=>o[0]&&priceNum(o[1])>0);return [x.slug,{title:x.title,price:x.price,times,opts,byTime:+x.time_booking===1&&times.length>0,book:+x.booking_enabled===1}]}));
  const m0=isP?{}:(()=>{try{return JSON.parse(r.meta||'{}')}catch{return{}}})();
  const IT={rows:(isP?[]:(m0.parts||[]).map(slug=>{const p=(m0.plan||[]).find(x=>x[0]===slug)||[];return {slug,day:Math.max(1,+p[1]||1),time:p[2]||'',option:p[3]||''}}))};
  const curP=t=>(String(t||'').match(/^[^\d]*/)||[''])[0].trim();
  const fmtM=(cur,c)=>{const n=c/100;return (cur?cur+' ':'')+(Number.isInteger(n)?n.toLocaleString('es-AR'):n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}))};
  const unitOf=row=>{const v=SV[row.slug];if(!v)return null;const o=row.option&&v.opts.find(x=>x[0].toLowerCase()===row.option.toLowerCase());if(o)return {c:Math.round(priceNum(o[1])*100),t:o[1]};if(v.opts.length){const b=v.opts.reduce((a,x)=>priceNum(x[1])<priceNum(a[1])?x:a);return {c:Math.round(priceNum(b[1])*100),t:b[1],cheap:b[0]}}const n=priceNum(v.price);return n>0?{c:Math.round(n*100),t:v.price}:null};
  const itQuote=()=>{const L=IT.rows.map(x=>({x,u:unitOf(x)})),miss=L.filter(z=>!z.u).map(z=>SV[z.x.slug]?.title||z.x.slug),curs=[...new Set(L.filter(z=>z.u).map(z=>curP(z.u.t)))],sum=L.reduce((a,z)=>a+(z.u?z.u.c:0),0),disc=Math.min(90,Math.max(0,Math.round(+($('#it-disc')?.value)||0))),raw=sum*(100-disc)/100,unit=sum%100===0?Math.round(raw/100)*100:Math.round(raw);return {ok:L.length>0&&!miss.length&&curs.length===1,miss,mixed:curs.length>1,sum,disc,unit,cur:curs[0]||''}};
  const itUi=()=>{const W=$('#itrows');if(!W)return;
    const checked=$$('[data-part]:checked').map(i=>i.dataset.part);
    IT.rows=IT.rows.filter(x=>checked.includes(x.slug));checked.forEach(sl=>{if(!IT.rows.some(x=>x.slug===sl))IT.rows.push({slug:sl,day:Math.max(1,...IT.rows.map(x=>x.day),1),time:'',option:''})});
    const libre=$('[name="it-mode"]:checked')?.value==='libre',span=Math.max(1,...IT.rows.map(x=>x.day));
    W.innerHTML=IT.rows.length?IT.rows.map((x,i)=>{const v=SV[x.slug]||{title:x.slug,times:[],opts:[]},u=unitOf(x),dayOpts=Array.from({length:Math.min(14,span+1)},(_,k)=>k+1);
      return `<div class="it-row" data-i="${i}"><span class="opt-n" aria-hidden="true">${i+1}</span><b class="it-t">${esc(v.title)}</b>
      <span class="it-p">${u?esc(fmtM(curP(u.t),u.c))+(v.opts.length&&!x.option?'<small class="muted" style="display:block;font-weight:400;font-size:11px">'+esc(u.cheap||'')+'</small>':''):'<span class="chip warn">sin precio</span>'}</span>
      <span class="opt-act"><button type="button" class="s" data-im="-1" aria-label="Subir ${esc(v.title)}" title="Subir" ${i?'':'disabled'}>${ic('up')}</button><button type="button" class="s" data-im="1" aria-label="Bajar ${esc(v.title)}" title="Bajar" ${i<IT.rows.length-1?'':'disabled'}>${ic('down')}</button></span>
      <span class="it-fs"><label class="it-f">Día<select data-it="day" aria-label="Día de ${esc(v.title)}">${dayOpts.map(d=>`<option value="${d}" ${d===x.day?'selected':''}>Día ${d}</option>`).join('')}</select></label>
      ${v.byTime?`<label class="it-f">Horario<select data-it="time" aria-label="Horario de ${esc(v.title)}"><option value="">Lo elige el cliente</option>${v.times.map(t=>`<option value="${esc(t)}" ${t===x.time?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`:'<span class="it-f it-na"></span>'}
      ${v.opts.length?`<label class="it-f">Opción<select data-it="option" aria-label="Opción de ${esc(v.title)}"><option value="">La más barata</option>${v.opts.map(o=>`<option value="${esc(o[0])}" ${o[0]===x.option?'selected':''}>${esc(o[0])} · ${esc(o[1])}</option>`).join('')}</select></label>`:'<span class="it-f it-na"></span>'}</span></div>`}).join(''):'<p class="muted opt-empty">Marcá arriba los servicios que incluye el paquete.</p>';
    $$('[data-it]',W).forEach(el=>el.onchange=()=>{const x=IT.rows[+el.closest('.it-row').dataset.i];x[el.dataset.it]=el.dataset.it==='day'?+el.value:el.value;dirty=true;itUi()});
    $$('[data-im]',W).forEach(b=>b.onclick=()=>{const i=+b.closest('.it-row').dataset.i,j=i+ +b.dataset.im;[IT.rows[i],IT.rows[j]]=[IT.rows[j],IT.rows[i]];dirty=true;itUi()});
    // Resumen del precio y avisos
    const q=itQuote(),auto=$('#it-auto').checked,sm=$('#itsum'),wn=$('#itwarn');$('#it-disc').disabled=!auto;
    sm.innerHTML=IT.rows.length?(q.ok?`<span>Suma de los servicios <b>${esc(fmtM(q.cur,q.sum))}</b></span>${q.disc?`<span>Descuento ${q.disc} % <b>−${esc(fmtM(q.cur,q.sum-q.unit))}</b></span>`:''}<span class="it-tot">Precio del paquete por persona <b>${esc(fmtM(q.cur,q.unit))}</b></span>${auto?'':'<span class="muted">Precio automático apagado: se usa el precio que escribas abajo.</span>'}`:`<span class="muted">${q.mixed?'Los servicios tienen precios en monedas distintas: el precio automático no se puede calcular.':'Falta el precio de: <b>'+esc(q.miss.join(', '))+'</b>. Cargalo en el servicio para calcular el precio automático.'}</span>`):'';
    const W2=[];IT.rows.forEach(x=>{const v=SV[x.slug];if(!v)return;if(!v.book)W2.push(`<b>${esc(v.title)}</b> no se reserva por fecha: aparece en el itinerario, pero no descuenta cupo.`);else if(v.byTime&&!x.time)W2.push(`<b>${esc(v.title)}</b> se reserva por horario y no fijaste uno: el cliente lo elige al reservar.`)});
    if(r.id&&+r.booking_enabled!==1&&IT.rows.length)W2.push('El paquete todavía no se reserva por fecha: activalo en <b>Disponibilidad</b> para que el cliente elija el inicio y se descuente el cupo.');
    {const wb=$('#it-win-box');if(wb)wb.hidden=!libre}
    wn.innerHTML=W2.map(t=>`<li>${t}</li>`).join('');wn.hidden=!W2.length;
    ITAUTO();polAuto();kidsAuto();if(isNew)fillParts(true)};
  // Precio automático: con el resumen OK, el precio del producto se llena solo y no se edita a mano (como con las opciones).
  ITAUTO=()=>{const pb=$('#pricebox'),n=$('#optnote');if(!pb||!$('#it-auto')||$('#f-m_kind')?.value!=='paquete'||!IT.rows.length)return;
    if(OPT.some(o=>o.name.trim()&&priceNum(o.price)>0))return;
    const q=itQuote(),on=$('#it-auto').checked&&q.ok;$$('input',pb).forEach(i=>i.disabled=on);pb.hidden=on;
    if(on){$('#f-price').value=fmtM(q.cur,q.unit);$('#f-price_old').value=q.disc?fmtM(q.cur,q.sum):'';n.hidden=false;n.innerHTML=`${ic('check')}<span>Precio automático: <b>${esc(fmtM(q.cur,q.unit))}</b> por persona${q.disc?` (suma ${esc(fmtM(q.cur,q.sum))} − ${q.disc} %)`:''}. Se calcula con los servicios del itinerario.</span>`}
    else n.hidden=true};
  if($('#itbox')){$$('[data-part]').forEach(c=>c.addEventListener('change',()=>{dirty=true;itUi()}));$$('[name="it-mode"]').forEach(c=>c.onchange=()=>{dirty=true;itUi()});if($('#it-win'))$('#it-win').oninput=()=>{dirty=true;itUi()};
    $('#it-auto').onchange=()=>{dirty=true;itUi();if(!$('#it-auto').checked){const pb=$('#pricebox');pb.hidden=false;$$('input',pb).forEach(i=>i.disabled=false);$('#optnote').hidden=true}};$('#it-disc').oninput=()=>{dirty=true;itUi()};}
  // Políticas (menores, cancelación…): filas Tipo | Aplica a | Texto. "Aplica a" lista las opciones con nombre; vacío = todo el producto.
  let POL=isP?[]:polsOf(r).map(x=>({type:POLT.some(t=>t[0]===x[0])?x[0]:'otra',text:x[1]||'',opt:x[2]||'',title:x[3]||''}));
  const polUi=()=>{const W=$('#polrows');if(!W)return;const names=[...new Set(OPT.map(o=>o.name.trim()).filter(Boolean))];
    W.innerHTML=POL.map((p,i)=>`<div class="pol-row" data-i="${i}"><div class="pol-top">
      <select data-p="type" aria-label="Tipo de política ${i+1}">${POLT.map(([k,l])=>`<option value="${k}" ${k===p.type?'selected':''}>${l}</option>`).join('')}</select>
      ${p.type==='otra'?`<input data-p="title" value="${esc(p.title)}" maxlength="60" placeholder="Título · ej. Mascotas" aria-label="Título de la política ${i+1}">`:''}
      ${names.length?`<label class="pol-for">Aplica a<select data-p="opt" aria-label="A qué opción aplica la política ${i+1}"><option value="">Todas las opciones</option>${names.map(n=>`<option value="${esc(n)}" ${n===p.opt?'selected':''}>Solo ${esc(n)}</option>`).join('')}</select></label>`:''}
      <button type="button" class="s d" data-pdel aria-label="Quitar la política ${i+1}" title="Quitar">${ic('x')}</button></div>
      <textarea data-p="text" rows="3" maxlength="800" placeholder="${esc(POLPH[p.type])}" aria-label="Texto de la política ${i+1}">${esc(p.text)}</textarea></div>`).join('')||'<p class="muted opt-empty">Sin políticas: no se muestra la sección.</p>';
    $$('[data-p]',W).forEach(x=>{const ev=x.tagName==='SELECT'?'onchange':'oninput';x[ev]=()=>{POL[+x.closest('.pol-row').dataset.i][x.dataset.p]=x.value;dirty=true;if(x.dataset.p==='type')polUi()}});
    $$('[data-pdel]',W).forEach(b=>b.onclick=()=>{POL.splice(+b.closest('.pol-row').dataset.i,1);dirty=true;polUi()});
    $$('[data-poladd]').forEach(b=>b.disabled=POL.length>=10);polAuto()};
  // ---- Automático (misma regla que el servidor, bundle.js): políticas que no escribiste, niños de los paquetes y "Completar con los servicios" ----
  const KMAX=17,PT=Object.fromEntries(POLT),partRow=sl=>(DATA.packages||[]).find(x=>x.slug===sl);
  const kTiers=v=>{try{return (JSON.parse(v||'{}').tiers||[]).filter(t=>t.amt!==''&&t.pct!=='').map(t=>t.amt!=null?{from:+t.from,to:+t.to,amt:+t.amt,pct:+t.amt?100:0}:{from:+t.from,to:+t.to,pct:+t.pct}).sort((a,b)=>a.from-b.from)}catch{return []}};
  const kText=(T,cur)=>{const y=(a,b)=>a===b?`${a} ${a===1?'año':'años'}`:`${a} a ${b} años`,o=T.map(t=>`${y(t.from,t.to)}: ${t.amt!=null&&t.amt>0?'pagan '+fmtM(cur||'',t.amt):t.pct===0?'gratis':t.pct===100?'precio de adulto':'pagan '+t.pct+'%'}`),l=T.length?T[T.length-1].to:-1;if(l<KMAX)o.push(`desde ${l+1} años: precio de adulto`);return o.join(' · ')};
  const kPct=(T,age,unitC)=>{const t=T.find(x=>age>=x.from&&age<=x.to);if(!t)return 100;if(t.amt!=null)return unitC>0?Math.min(100,t.amt*100/unitC):100;return t.pct};
  const isBund=()=>!isP&&$('#f-m_kind')?.value==='paquete'&&IT.rows.length>0;
  function autoPols(){const have=new Set(POL.filter(p=>!p.opt&&p.text.trim()).map(p=>p.type)),out=[];
    if(isBund()){for(const [type] of POLT){if(type==='otra'||have.has(type))continue;const lines=[];
      for(const x of IT.rows){const sv=partRow(x.slug);if(!sv)continue;const sp=polsOf(sv).filter(q=>(POLT.some(t=>t[0]===q[0])?q[0]:'otra')===type&&q[1]&&!q[2]);
        if(sp.length){lines.push([sv.title,sp.map(q=>String(q[1]).replace(/\s*\n+\s*/g,' ')).join(' ')]);continue}
        if(type==='menores'&&+sv.accepts_children===1){const t=kTiers(sv.kids_policy);if(t.length)lines.push([sv.title,kText(t,curP(sv.price))])}}
      if(lines.length)out.push({type,lines})}}
    else if(!isP&&!have.has('menores')&&$('#f-kids')?.checked){const t=kTiers($('#f-kids_policy')?.value);if(t.length)out.push({type:'menores',lines:[['',kText(t,curP($('#f-price')?.value))]]})}
    return out}
  function polAuto(){const W=$('#polauto');if(!W)return;const A=autoPols(),em=$('#polrows .opt-empty');if(em)em.hidden=A.length>0;
    W.innerHTML=A.length?`<p class="optnote" style="margin:0 0 8px">${ic('check')}<span><b>Se completan solas</b> ${isBund()?'con las políticas de cada servicio':'con la tabla de precios de los niños'} y se actualizan si cambiás algo. No hace falta escribirlas: tocá <b>Editar</b> solo si querés cambiar el texto.</span></p>`+A.map((a,i)=>`<div class="pol-row" style="background:transparent"><div class="pol-top"><b style="flex:1">${esc(PT[a.type])} <small class="muted" style="font-weight:400">· automática</small></b><button type="button" class="s" data-pauto="${i}">Editar</button></div><div class="muted" style="font-size:13px;line-height:1.5">${a.lines.map(([t,x])=>(t?`<b>${esc(t)}:</b> `:'')+esc(x)).join('<br>')}</div></div>`).join(''):'';
    $$('[data-pauto]',W).forEach(b=>b.onclick=()=>{const a=A[+b.dataset.pauto];POL.push({type:a.type,text:a.lines.map(([t,x])=>(t?t+': ':'')+x).join('\n'),opt:'',title:''});dirty=true;polUi();$$('#polrows textarea').pop()?.focus()})}
  // Niños en un paquete: se aceptan si algún servicio los acepta y cada niño paga según la tabla de cada servicio (no se cargan tramos acá).
  function kidsAuto(){const cb=$('#f-kids'),ka=$('#kidauto'),box=$('#kidbox');if(!cb||!ka)return;
    if(!isBund()){cb.disabled=false;ka.hidden=true;box.hidden=!cb.checked;return}
    const P=IT.rows.map(x=>({x,s:partRow(x.slug),u:unitOf(x)})).filter(z=>z.s),acc=P.filter(z=>+z.s.accepts_children===1);
    if(cb.checked!==(acc.length>0)){cb.checked=acc.length>0;dirty=true}cb.disabled=true;box.hidden=true;ka.hidden=false;
    if(!acc.length){ka.innerHTML='<p class="muted" style="margin:0">Ningún servicio del paquete acepta niños: se pide solo la cantidad de personas. Si querés que acepte, marcá “Acepta niños” en algún servicio.</p>';return}
    const T=P.map(z=>+z.s.accepts_children===1?kTiers(z.s.kids_policy):[]),ok=P.every(z=>z.u),sum=P.reduce((a,z)=>a+(z.u?z.u.c:0),0),q=itQuote();
    let tab='';if(ok&&sum){const pct=Array.from({length:KMAX+1},(_,age)=>P.reduce((a,z,k)=>a+z.u.c*kPct(T[k],age,z.u.c),0)/sum),G=[];
      pct.forEach((v,age)=>{const g=G[G.length-1];if(g&&g.v===v)g.to=age;else G.push({from:age,to:age,v})});
      tab=`<ul>${G.map(g=>`<li><b>${g.from===g.to?g.from+(g.from===1?' año':' años'):g.from+' a '+g.to+' años'}</b><span>${g.v===0?'<em class="ok">Gratis</em>':g.v===100?'Precio de adulto':Math.round(g.v)+'% del adulto'}${q.ok&&g.v>0&&g.v<100?' · '+esc(fmtM(q.cur,Math.round(q.unit*g.v/100))):''}</span></li>`).join('')}</ul>`}
    ka.innerHTML=`<h4>Niños <small class="muted" style="font-weight:400">· automático</small></h4><p class="muted" style="margin:0 0 8px">Cada niño paga según la tabla de cada servicio. Para cambiarlo, editá el precio de los niños en el servicio.</p><p class="muted" style="margin:0 0 8px;font-size:13px;line-height:1.5">${P.map((z,k)=>`<b>${esc(z.s.title)}:</b> ${+z.s.accepts_children===1?esc(T[k].length?kText(T[k],curP(z.u?z.u.t:z.s.price)):'precio de adulto'):'no acepta niños (pagan como adulto)'}`).join('<br>')}</p>${tab?`<div class="kt-prev"><p class="muted" style="margin:0 0 4px">Así lo ve el cliente en el paquete:</p>${tab}</div>`:''}`}
  // Completa lo vacío con los servicios. Lo que se completó solo se sigue actualizando mientras no lo edites.
  const AF={};
  function fillParts(quiet){if(!IT.rows.length){if(!quiet)toast('Marcá primero los servicios del paquete');return}
    const P=IT.rows.map(x=>partRow(x.slug)).filter(Boolean),N=P.map(x=>x.title),span=Math.max(1,...IT.rows.map(x=>x.day));let n=0;
    const set=(id,v)=>{const e=$('#'+id);if(!e||!v)return;const cur=e.value.trim();if(cur&&cur!==AF[id])return;if(cur===v)return;e.value=v;AF[id]=v;e.dispatchEvent(new Event('input',{bubbles:true}));n++};
    const lista=N.length>1?N.slice(0,-1).join(', ')+' e '+N[N.length-1]:N[0];
    set('f-title',N.join(' + '));
    set('f-excerpt',`Pacote com ${lista}: tudo em uma única reserva${itQuote().disc?`, com ${itQuote().disc}% de desconto`:''}.`);
    set('f-details',[...new Set(P.flatMap(x=>String(x.details||'').split('\n').map(l=>l.trim()).filter(Boolean)))].join('\n'));
    set('f-image',(P.find(x=>x.image)||{}).image||'');
    set('f-m_facts',[`Inclui: ${N.join(' + ')}`,span>1?`Duração: ${span} dias`:''].filter(Boolean).join('\n'));
    if(n){dirty=true;syncChips()}
    if(!quiet)toast(n?`Listo: completé ${n} ${n===1?'campo':'campos'} con los servicios`:'No había campos vacíos para completar')}
  $$('[data-poladd]').forEach(b=>b.onclick=()=>{POL.push({type:b.dataset.poladd,text:'',opt:'',title:''});dirty=true;polUi();$$('#polrows textarea').pop()?.focus()});
  // Subcategoría: depende de la categoría elegida (si se cambia la categoría, se vuelve a "Sin subcategoría").
  if($('#f-subcategory')){$('#f-category').addEventListener('change',e=>{$('#f-subcategory').innerHTML=subOpts(e.target.value,'')});
    $('#newsub').onclick=async()=>{const cat=$('#f-category').value,cl=CATS.packages?.[cat]?.label||cat;
      const m=await modal({title:'Nueva subcategoría en “'+cl+'”',body:'<p class="muted">Sirve para ordenar los productos dentro de la categoría (ej. Con cena, Solo show). En el sitio aparece como filtro en la página de la categoría.</p>',fields:[['label','Nombre','','Ej: Con cena']],ok:'Crear'});
      if(!m||!m.label.trim())return;try{const res=await api('subcategories','POST',{parent:cat,label:m.label.trim()});await refreshCats();$('#f-subcategory').innerHTML=subOpts(cat,res.slug);dirty=true;toast('Subcategoría creada')}catch{}}}
  if($('#fillparts'))$('#fillparts').onclick=()=>fillParts(false);
  $('#pub').onchange=()=>dirty=true;$('#feat').onchange=()=>dirty=true;kidsUi();optsUi();polUi();itUi();upd();
  // Crear una categoría sin salir del formulario
  if($('#f-m_kind'))$('#f-m_kind').onchange=e=>{$('#partsbox').hidden=e.target.value!=='paquete';if(e.target.value!=='paquete'){const pb=$('#pricebox');pb.hidden=false;$$('input',pb).forEach(i=>i.disabled=false);$('#optnote').hidden=true;optsUi();polAuto();kidsAuto()}else itUi()};
  $('#newcat').onclick=async()=>{const m=await modal({title:'Nueva categoría',body:'<p class="muted">Se crea para '+(isP?'el blog':'los paquetes')+' y queda elegida en este formulario.</p>',fields:[['label','Nombre','','Ej: Cruceros']],ok:'Crear'});
    if(!m||!m.label.trim())return;try{const res=await api('categories','POST',{kind:k,label:m.label.trim()});await refreshCats();$('#f-category').innerHTML=catOpts(k,res.slug);dirty=true;toast('Categoría creada')}catch{}};
  let lr=null;const rec=()=>{const g=getSelection();if(g.rangeCount&&ed.contains(g.anchorNode))lr=g.getRangeAt(0).cloneRange()};['keyup','mouseup','input'].forEach(v=>ed.addEventListener(v,rec));
  const back=()=>{ed.focus();if(lr){const g=getSelection();g.removeAllRanges();g.addRange(lr)}};
  $$('[data-c]').forEach(b=>b.onmousedown=async e=>{e.preventDefault();const c=b.dataset.c;
    if(c==='img'){$('#cfile').click();return}
    if(c.startsWith('blk:')){const B={dato:'<div class="gvb-dato"><strong>Dato clave</strong><p>Escribí acá un dato útil para el viajero.</p></div><p><br></p>',tip:'<div class="gvb-tip"><strong>Consejo</strong><p>Escribí acá tu recomendación práctica.</p></div><p><br></p>',quote:'<blockquote><p>Escribí una frase destacada.</p></blockquote><p><br></p>'};back();document.execCommand('insertHTML',false,B[c.slice(4)]);dirty=true;upd();return}
    if(c==='tpl'){if(ed.textContent.trim()&&!(await confirmBox('Reemplazar el contenido','Se reemplaza lo que escribiste por la estructura.','Reemplazar',true)))return;ed.innerHTML=ART_TPL;dirty=true;upd();ed.focus();return}
    const[cmd,arg]=c.split(':');let a=arg;
    if(cmd==='createLink'){rec();const m=await modal({title:'Insertar enlace',fields:[['u','Dirección (URL)','','https://…']],ok:'Insertar'});if(!m||!m.u.trim())return;a=m.u.trim();back()}
    document.execCommand(cmd,false,a);dirty=true});
  $('#cfile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const u=await upload(f),m=await modal({title:'Texto alternativo',body:'<p class="muted">Describí la imagen en una frase (mejora el SEO y la accesibilidad).</p>',fields:[['alt','Descripción','','Ej: Show de tango en Puerto Madero']],ok:'Insertar'});back();document.execCommand('insertHTML',false,`<img src="${esc(u)}" alt="${esc(m?m.alt:'')}">`);dirty=true}catch{}e.target.value=''};
  $('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{$('#f-image').value=await upload(f);dirty=true;upd()}catch{}};
  const vsync=()=>{const v=$('#vthumb'),u=g('video');if(/^\/media\//.test(u)){v.src=u;v.hidden=false}else{v.removeAttribute('src');v.hidden=true}};
  $('#vfile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{$('#f-video').value=await upload(f);dirty=true;vsync();toast('Video subido. Acordate de guardar.')}catch{}};
  $('#f-video').addEventListener('input',vsync);
  if($('#gfile'))$('#gfile').onchange=async e=>{const fs=[...e.target.files];if(!fs.length)return;const ta=$('#f-m_gal');let n=0;
    for(const f of fs){try{const u=await upload(f),cur=ta.value.split('\n').map(x=>x.trim()).filter(Boolean);if(cur.length>=12){toast('La galería admite hasta 12 archivos','err');break}ta.value=cur.concat(u).join('\n');n++}catch{}}
    e.target.value='';if(n){dirty=true;toast(n+(n===1?' archivo agregado':' archivos agregados')+' a la galería. Acordate de guardar.')}};
  $('#vclear').onclick=e=>{e.preventDefault();$('#f-video').value='';$('#vfile').value='';dirty=true;vsync()};
  $('#back').onclick=async()=>{if(await leave()){dirty=false;list()}};
  const save=async back=>{
    if(isP&&ed.textContent.trim()&&!ed.querySelector('h2,h3,ul,ol,blockquote,img,.gvb-dato,.gvb-tip')){const x=autoFmt(ed.innerText,{title:!g('title')});if(x.title){const ti=$('#f-title');ti.value=x.title;ti.dispatchEvent(new Event('input',{bubbles:true}))}if(x.html)ed.innerHTML=x.html}
    if(!g('title')){toast('Escribí un título','err');return}
    const d={};$$('[data-k]').forEach(i=>d[i.dataset.k]=i.value);d.content=ed.innerHTML;if(!isP){const ln=k=>(d[k]||'').split('\n').map(x=>x.trim()).filter(Boolean),sp=(x,c)=>{const i=x.indexOf(c);return i<0?[x,'']:[x.slice(0,i).trim(),x.slice(i+1).trim()]};d.meta=JSON.stringify({facts:ln('m_facts').map(x=>sp(x,':')),exc:ln('m_exc'),stops:ln('m_stops'),times:ln('m_times').map(x=>sp(x,'|')),table:ln('m_var').map(x=>x.split('|').map(c=>c.trim())),faq:ln('m_faq').map(x=>sp(x,'|')),gallery:ln('m_gal'),kind:d.m_kind||'',parts:IT.rows.map(x=>x.slug),plan:IT.rows.map(x=>[x.slug,x.day,x.time,x.option]),pmode:$('[name="it-mode"]:checked')?.value||'fijo',win:Math.min(60,Math.max(0,Math.round(+($('#it-win')?.value)||0))),auto:$('#it-auto')?.checked?1:0,disc:+($('#it-disc')?.value)||0,best:$('#f-best')?.checked?1:0,box:($('#f-box')?.value||'').trim(),flash:($('#f-flash')?.value||'').slice(0,16),qty:($('#f-qty')?.value||'').split('\n').map(l=>l.match(/^\s*(?:(.+?)\s*\|\s*)?(\d+)\s*[=:→]+\s*(.+?)\s*$/)).filter(Boolean).map(m=>[+m[2],m[3],(m[1]||'').trim()]),unit_lbl:($('#f-unit')?.value||'').trim(),options:OPT.filter(o=>o.name.trim()&&o.price.trim()).map(o=>[o.name.trim(),o.price.trim(),o.old.trim(),o.note.trim()]),policies:POL.filter(p=>p.text.trim()).map(p=>[p.type,p.text.trim(),p.opt,p.type==='otra'?p.title.trim():''])})}d.published=$('#pub').checked?1:0;d.featured=$('#feat').checked?1:0;if(!isP)d.accepts_children=$('#f-kids')&&$('#f-kids').checked?1:0;if(isP)d.related_ids=$$('[data-rel]:checked').slice(0,3).map(i=>i.dataset.rel).join(',');
    const res=await api(r.id?`${k}/${r.id}`:k,r.id?'PUT':'POST',d);dirty=false;DATA[k]=null;
    if(back){toast('Guardado');list();return}
    Object.assign(r,d,{id:res.id||r.id,slug:res.slug});$('#f-slug').value=res.slug;upd();
    $('#after').innerHTML=d.published?`<br><a href="${esc(res.url)}" target="_blank">Ver publicado ↗</a>`:'';toast(`Guardado${d.published?` · <a href="${esc(res.url)}" target="_blank">ver</a>`:''}`)};
  $('#save').onclick=()=>save(false).catch(()=>{});$('#saveb').onclick=()=>save(true).catch(()=>{});
  document.onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='s'&&$('#save')){e.preventDefault();$('#save').click()}}}

/* ---------- categorías ---------- */
async function cats(){const v=$('#v');v.innerHTML='<div class="sk"></div><div class="sk"></div>';
  const rows=await refreshCats();
  // Subcategorías: fila de pastillas debajo de cada categoría de paquetes (nombre, cantidad, ordenar, renombrar y quitar).
  const subRow=c=>{const L=c.subs||[];return `<div class="sub-wrap"><span class="sub-lbl">Subcategorías</span>${L.map((x,i)=>`<span class="sub-chip"><b>${esc(x.label)}</b><small>${x.n}</small><button type="button" data-smv="up" data-sid="${x.id}" aria-label="Mover ${esc(x.label)} antes" title="Antes" ${i?'':'disabled'}>‹</button><button type="button" data-smv="down" data-sid="${x.id}" aria-label="Mover ${esc(x.label)} después" title="Después" ${i<L.length-1?'':'disabled'}>›</button><button type="button" data-sed="${x.id}" aria-label="Renombrar ${esc(x.label)}" title="Renombrar">${ic('edit')}</button><button type="button" data-srm="${x.id}" aria-label="Quitar ${esc(x.label)}" title="Quitar" class="d">${ic('x')}</button></span>`).join('')}<button type="button" class="s sub-add" data-sadd="${esc(c.slug)}">${ic('plus')}Subcategoría</button></div>`};
  const sec=(kind,title,sub,unit)=>{const L=rows.filter(c=>c.kind===kind);
    return `<section class="card cat-sec"><div class="cat-head"><div><h3>${title} <span class="chip neutral">${L.length}</span></h3><p class="muted">${sub}</p></div><button class="p" data-add="${kind}">${ic('plus')}Nueva categoría</button></div>
    ${L.map((c,i)=>`<div class="cat-row"><div class="cat-main"><div class="cat-t"><b>${esc(c.label)}</b>${c.listing?'<span class="chip neutral" title="Tiene una página propia en el sitio">página fija</span>':''}${c.fixed?'<span class="chip neutral" title="La enlazan las fotos de la portada: se puede renombrar, no borrar">fija · portada</span>':''}${c.n?'':`<span class="chip warn">sin ${unit}: no se muestra en el sitio</span>`}</div><small class="muted">${c.n} ${c.n===1?({paquetes:'paquete',entradas:'entrada'})[unit]||unit:unit} · ${esc(catUrl(kind,c))}${c.description?' · '+esc(c.description):''}</small></div>
      <div class="cat-act"><span class="cat-mv"><button class="s" data-mv="up" data-id="${c.id}" aria-label="Subir ${esc(c.label)}" title="Subir" ${i?'':'disabled'}>${ic('up')}</button><button class="s" data-mv="down" data-id="${c.id}" aria-label="Bajar ${esc(c.label)}" title="Bajar" ${i<L.length-1?'':'disabled'}>${ic('down')}</button></span><button class="s" data-ed="${c.id}">${ic('edit')}Editar</button><button class="s d" data-rm="${c.id}" aria-label="Borrar ${esc(c.label)}" title="Borrar">${ic('trash')}</button></div>${kind==='packages'?subRow(c):''}</div>`).join('')||emptyBox(`Todavía no hay categorías de ${kind==='posts'?'blog':'paquetes'}.`,'Creá la primera con el botón de arriba.')}</section>`};
  v.innerHTML=`<div class="pagehead"><div><h2>Categorías</h2><p class="muted">Los cambios se ven en el sitio al instante. El orden de acá es el orden en que se muestran.</p></div></div>
  ${sec('packages','Paquetes','Cada categoría de paquetes tiene su página y aparece como botón entre las categorías del sitio.','paquetes')}
  ${sec('posts','Blog','Se muestran en la barra de filtros del blog y en cada entrada.','entradas')}`;
  const done=m=>{DATA.posts=DATA.packages=null;if(m)toast(m);cats()};
  v.onclick=async e=>{const b=e.target.closest('button');if(!b)return;
    const c=rows.find(x=>x.id==(b.dataset.id||b.dataset.ed||b.dataset.rm)),kind=b.dataset.add||c?.kind;
    const sx=b.dataset.sid||b.dataset.sed||b.dataset.srm?rows.flatMap(x=>x.subs||[]).find(x=>x.id==(b.dataset.sid||b.dataset.sed||b.dataset.srm)):null;
    try{
    if(b.dataset.sadd){const pc=rows.find(x=>x.kind==='packages'&&x.slug===b.dataset.sadd);const m=await modal({title:'Nueva subcategoría en “'+pc.label+'”',body:'<p class="muted">Ordena los productos dentro de la categoría (ej. Con cena, Solo show). En el sitio aparece como filtro en la página de la categoría, solo si tiene algo publicado.</p>',fields:[['label','Nombre','','Ej: Con cena']],ok:'Crear'});
      if(m&&m.label.trim()){await api('subcategories','POST',{parent:pc.slug,label:m.label.trim()});done('Subcategoría creada')}return}
    if(b.dataset.smv){await api('subcategories/'+sx.id,'PUT',{move:b.dataset.smv});done();return}
    if(b.dataset.sed){const m=await modal({title:'Renombrar subcategoría',fields:[['label','Nombre',sx.label,'']],ok:'Guardar'});if(m&&m.label.trim()){await api('subcategories/'+sx.id,'PUT',{label:m.label.trim()});done('Subcategoría guardada')}return}
    if(b.dataset.srm){if(await confirmBox('Quitar “'+esc(sx.label)+'”',sx.n?'Sus '+sx.n+' producto(s) no se borran: quedan en la categoría, sin subcategoría.':'No tiene productos.','Quitar',true)){const r=await api('subcategories/'+sx.id,'DELETE');done('Subcategoría quitada'+(r.freed?' · '+r.freed+' producto(s) quedaron sin subcategoría':''))}return}
    if(b.dataset.add){const m=await modal({title:'Nueva categoría de '+(kind==='posts'?'blog':'paquetes'),fields:[['label','Nombre','','Ej: Cruceros'],['description','Descripción (opcional, la ven los buscadores)','','']],ok:'Crear'});
      if(m&&m.label.trim()){await api('categories','POST',{kind,label:m.label.trim(),description:m.description.trim()});done('Categoría creada')}}
    else if(b.dataset.mv){await api('categories/'+c.id,'PUT',{move:b.dataset.mv});done()}
    else if(b.dataset.ed){const f=[['label','Nombre',c.label,''],['description','Descripción',c.description||'','']];if(!c.listing&&!c.fixed)f.push(['slug','Dirección (avanzado)',c.slug,'']);
      const m=await modal({title:'Editar categoría',body:c.listing?'<p class="muted">Esta categoría tiene una página fija del sitio, por eso su dirección no cambia.</p>':'<p class="muted">Si cambiás la dirección, la anterior redirige a la nueva.</p>',fields:f,ok:'Guardar'});
      if(m&&m.label.trim()){await api('categories/'+c.id,'PUT',{label:m.label.trim(),description:m.description.trim(),slug:m.slug});done('Categoría guardada')}}
    else if(b.dataset.rm){
      if(c.fixed){await modal({title:'No se puede borrar',body:'<p>“'+esc(c.label)+'” está enlazada desde las fotos de la portada. Podés cambiarle el nombre con <b>Editar</b>, pero no borrarla.</p>',ok:'Entendido',cancel:null});return}
      if(c.listing){await modal({title:'No se puede borrar',body:'<p>“'+esc(c.label)+'” está ligada a una página fija del sitio ('+esc(c.listing)+'). Podés renombrarla con <b>Editar</b>.</p>',ok:'Entendido',cancel:null});return}
      const others=rows.filter(x=>x.kind===kind&&x.id!==c.id);
      if(!others.length){toast('Tiene que quedar al menos una categoría','err');return}
      if(c.n){const m=await modal({title:'Borrar “'+c.label+'”',body:'<p>Tiene <b>'+c.n+'</b> '+(kind==='posts'?'entrada(s)':'paquete(s)')+'. Elegí a qué categoría pasan'+((c.subs||[]).length?' (sus '+c.subs.length+' subcategorías pasan con ellos)':'')+':</p><label>Mover a<select data-f="move">'+others.map(x=>'<option value="'+esc(x.slug)+'">'+esc(x.label)+'</option>').join('')+'</select></label>',ok:'Mover y borrar',danger:true});
        if(m){const r=await api('categories/'+c.id+'?move_to='+encodeURIComponent(m.move),'DELETE');done('Categoría borrada · '+r.moved+' movido(s)')}}
      else if(await confirmBox('Borrar “'+esc(c.label)+'”','Esta acción no se puede deshacer.','Borrar',true)){await api('categories/'+c.id,'DELETE');done('Categoría borrada')}}
    }catch{}}}

/* ---------- precios ---------- */
function prices(){const v=$('#v');
  v.innerHTML=`<div class="pagehead"><div><h2>Precios</h2><p class="muted">Cambiá el precio de tus paquetes sin abrir cada ficha. El cambio se ve en el sitio al guardar.</p></div></div>
  <div class="card" id="pkwrap"><div id="pk"><div class="sk"></div></div></div>`;
  const loadPk=async()=>{const rows=await load('packages',true);
    $('#pk').innerHTML=rows.length?`<div class="pr-wrap"><table class="tb2 pr-tb"><thead><tr><th>Paquete</th><th>Precio anterior</th><th>Precio</th><th><span class="sr">Guardar</span></th></tr></thead><tbody>${rows.map(r=>`<tr class="pr-row${r.published&&!r.price?' is-empty':''}" data-id="${r.id}"><td><div class="pr-t">${r.image?`<img src="${esc(r.image)}" alt="" loading="lazy">`:`<span class="pr-ph">${ic('image')}</span>`}<div><b>${esc(r.title)}</b>${r.published?'':'<span class="chip neutral">borrador</span>'}<small class="muted">${esc(CATS.packages[r.category]?.label||r.category)}</small></div></div></td>${optsOf(r).length?`<td colspan="2"><small class="muted">${optsOf(r).length} opciones · desde <b>${esc(r.price||'—')}</b>. Se cambian en el formulario (Opciones y precios).</small></td>`:`<td><input data-p="price_old" value="${esc(r.price_old)}" placeholder="Ej: R$ 615" aria-label="Precio anterior de ${esc(r.title)}"></td><td><input data-p="price" value="${esc(r.price)}" placeholder="Ej: R$ 445" aria-label="Precio de ${esc(r.title)}"></td>`}<td class="pr-go"><button class="p" data-sv disabled>${ic('check')}Guardar</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Todavía no creaste paquetes. Cuando crees uno en la sección Paquetes, vas a poder cambiarle el precio desde acá.</p>';
    $$('.pr-row').forEach(tr=>{const r=rows.find(x=>x.id==tr.dataset.id);if(!$('[data-p=price]',tr))return;const chg=()=>{$('[data-sv]',tr).disabled=$('[data-p=price]',tr).value.trim()===(r.price||'')&&$('[data-p=price_old]',tr).value.trim()===(r.price_old||'')};$$('input',tr).forEach(i=>i.oninput=chg)});
    $$('[data-sv]').forEach(b=>b.onclick=async()=>{const tr=b.closest('tr'),r=rows.find(x=>x.id==tr.dataset.id),n={price:$('[data-p=price]',tr).value.trim(),price_old:$('[data-p=price_old]',tr).value.trim()};
      b.disabled=true;try{await api(`packages/${r.id}`,'PUT',{...r,...n});Object.assign(r,n);DATA.packages=null;tr.classList.toggle('is-empty',!!(r.published&&!r.price));toast(`Precio de “${esc(r.title)}” actualizado`);return}catch{}b.disabled=false})};
  loadPk().catch(()=>{$('#pk').innerHTML='<p class="muted">No se pudieron cargar los paquetes.</p>'});}
/* ---------- auditoría SEO ---------- */
async function seo(){const v=$('#v');const [po,pk]=await Promise.all([load('posts',true),load('packages',true)]);
  const all=[...po.map(r=>['posts',r]),...pk.map(r=>['packages',r])],pubd=all.filter(([,r])=>r.published),rows=pubd.map(([k,r])=>[k,r,issues(k,r)]).filter(x=>x[2].length).sort((a,b)=>b[2].filter(i=>i.l==='bad').length-a[2].filter(i=>i.l==='bad').length||b[2].length-a[2].length);
  const other=location.origin!==ME.site;
  v.innerHTML=`<div class="pagehead"><div><h2>Estado SEO</h2><p class="muted">Revisión de títulos, descripciones, imágenes y precios de cada página publicada.</p></div></div>
  ${other?`<div class="notice">${ic('alert')}<span>Estás viendo el sitio en <b>${esc(location.origin)}</b>, pero los canonical y el sitemap apuntan a <b>${esc(ME.site)}</b> (variable <code>SITE_URL</code>). Si ese dominio todavía no está conectado, cambiá <code>SITE_URL</code> en <code>wrangler.jsonc</code>. En este dominio se pide a Google que no indexe.</span></div>`:''}
  ${statRow([[pubd.length,'publicadas'],[rows.length,'con observaciones','is-warn'],[all.length-pubd.length,'borradores']])}
  <section class="card"><h3>Entradas para revisar</h3>${rows.map(([k,r,is])=>`<div class="seo-row"><div class="grow"><b>${esc(r.title)}</b> <small class="muted">${k==='posts'?'Blog':(tipoLbl(r)||'Producto')}</small><div class="seo-chips">${is.map(i=>`<span class="chip ${i.l}">${esc(i.m)}</span>`).join('')}</div></div><button class="s" data-k="${k}" data-id="${r.id}">${ic('edit')}Editar</button></div>`).join('')||emptyBox('Todo en orden.','Ninguna página publicada tiene observaciones SEO.')}</section>
  <section class="card"><h3>Sitio completo</h3><p><a href="/sitemap.xml" target="_blank">sitemap.xml</a> y <a href="/robots.txt" target="_blank">robots.txt</a> se generan solos: cada entrada publicada entra al sitemap y cada borrador sale.</p>
  <p class="muted">Después de lanzar: en Google Search Console agregá <b>${esc(ME.site)}</b> y enviá <code>${esc(ME.site)}/sitemap.xml</code>.</p></section>`;
  $$('[data-id]').forEach(b=>b.onclick=()=>{tab=b.dataset.k;location.hash=tab;shell(true);form(DATA[tab].find(r=>r.id==b.dataset.id))})}

/* ---------- usuarios del panel (solo administradores) ---------- */
async function users(){const v=$('#v');v.innerHTML='<div class="sk"></div><div class="sk"></div>';
  if(!isAdmin()){v.innerHTML=`<div class="notice">${ic('alert')}<span>Solo los administradores pueden gestionar usuarios.</span></div>`;return}
  let d;try{d=await api('users')}catch{return}
  const ROLES=[['editor','Editor · usa el panel, sin gestionar usuarios'],['admin','Administrador · todo, incluye usuarios']],RL={admin:'Administrador',editor:'Editor'};
  const L=d.users,me=d.self;
  v.innerHTML=`<div class="pagehead"><div><h2>Usuarios</h2><p class="muted">Cada persona del equipo entra con su email y su clave. La clave general del sitio sigue funcionando como acceso de administrador, sin email.</p></div><button class="p" data-add>${ic('plus')}Nuevo usuario</button></div>
  <section class="card cat-sec">${L.map(u=>`<div class="cat-row"><div class="cat-main"><b>${esc(u.name||u.email)}</b> <span class="tag" style="background:${u.role==='admin'?'var(--gv-primary,#0066a9)':'#6b7390'}">${RL[u.role]||esc(u.role)}</span>${u.active?'':' <span class="chip warn">desactivado</span>'}${u.id===me?' <span class="chip ok">vos</span>':''}<small class="muted">${esc(u.email)} · ${u.last_login?'último ingreso '+esc(ago(u.last_login)):'todavía no ingresó'}</small></div>
    <div class="cat-act"><button class="s" data-pf="${u.id}">Perfil</button><button class="s" data-ed="${u.id}">${ic('edit')}Editar</button><button class="s" data-pw="${u.id}">Cambiar clave</button><button class="s" data-tg="${u.id}" ${u.id===me?'disabled':''}>${u.active?'Desactivar':'Activar'}</button><button class="s d" data-rm="${u.id}" ${u.id===me?'disabled':''} aria-label="Borrar ${esc(u.name||u.email)}" title="Borrar">${ic('trash')}</button></div></div>`).join('')||emptyBox('Todavía no creaste usuarios.','Entrás con la clave general. Creá un usuario por cada persona del equipo.')}</section>`;
  const done=m=>{if(m)toast(m);users()};
  v.onclick=async e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.pf){profile(+b.dataset.pf);return}
    const u=L.find(x=>x.id==(b.dataset.ed||b.dataset.pw||b.dataset.tg||b.dataset.rm));
    try{
    if('add' in b.dataset){const m=await modal({title:'Nuevo usuario',body:'<p class="muted">La clave tiene que tener al menos 8 caracteres. Pasásela a la persona por un canal privado; después puede cambiarla un administrador.</p>',fields:[['name','Nombre','','Ej: María Pérez'],['email','Email','','maria@agencia.com','email'],['password','Clave inicial','','','password'],['role','Rol','editor','',ROLES]],ok:'Crear usuario'});
      if(!m)return;if(!m.name.trim()||!m.email.trim()||!m.password){toast('Completá nombre, email y clave','err');return}
      await api('users','POST',{name:m.name.trim(),email:m.email.trim(),password:m.password,role:m.role});done('Usuario creado')}
    else if(b.dataset.ed){const m=await modal({title:'Editar usuario',fields:[['name','Nombre',u.name||'','','text'],['email','Email',u.email,'','email'],['role','Rol',u.role,'',u.id===me?[['admin','Administrador']]:ROLES]],ok:'Guardar'});
      if(m&&m.name.trim()&&m.email.trim()){await api('users/'+u.id,'PUT',{name:m.name.trim(),email:m.email.trim(),role:m.role});done('Usuario guardado')}}
    else if(b.dataset.pw){const m=await modal({title:'Nueva clave para '+(u.name||u.email),body:'<p class="muted">Si cambiás la clave, se cierran las sesiones que esa persona tenga abiertas.</p>',fields:[['password','Clave nueva','','Mínimo 8 caracteres','password']],ok:'Cambiar clave'});
      if(m&&m.password){await api('users/'+u.id,'PUT',{password:m.password});done('Clave cambiada')}}
    else if(b.dataset.tg){const on=!u.active;if(on||await confirmBox('Desactivar a '+esc(u.name||u.email),'No va a poder entrar al panel hasta que lo actives de nuevo.','Desactivar',true)){await api('users/'+u.id,'PUT',{active:on});done(on?'Usuario activado':'Usuario desactivado')}}
    else if(b.dataset.rm){if(await confirmBox('Borrar a '+esc(u.name||u.email),'Se borra el usuario y pierde el acceso. Esta acción no se puede deshacer.','Borrar',true)){await api('users/'+u.id,'DELETE');done('Usuario borrado')}}
    }catch{}}}

/* ---------- equipo: rendimiento, historial, actividades, favoritos y mapa de calor ---------- */
const num=n=>Number(n||0).toLocaleString('es-AR');
const when=s=>{const t=parseUTC(s);return t?new Date(t).toLocaleString('es-AR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—'};
const perBar=(cur,more='')=>`<div class="tb" data-per>${[7,30,90].map(n=>`<button class="${n===cur?'p':'s'}" data-d="${n}">${n} días</button>`).join('')}${more}</div>`;
const meter=(n,max,c='var(--gv-primary,#0066a9)')=>`<span style="background:#eef0f6;border-radius:4px;height:8px;width:100px;display:inline-block;vertical-align:middle"><i style="display:block;height:8px;border-radius:4px;background:${c};width:${max?Math.round(n/max*100):0}%"></i></span>`;
const FQ={once:'Una sola vez',daily:'Todos los días',weekly:'Cada semana',monthly:'Cada mes'};
const SK='<div class="sk"></div><div class="sk"></div>';
const adminOnlyBox=t=>`<div class="notice">${ic('alert')}<span>${t}</span></div>`;

/* Rendimiento */
async function team(days=30){const v=$('#v');v.innerHTML=SK;
  if(!isAdmin()){v.innerHTML=adminOnlyBox('Solo los administradores ven el rendimiento del equipo.');return}
  let d;try{d=await api('team?days='+days)}catch{return}
  const P=[...d.people].sort((a,b)=>b.total-a.total),max=Math.max(1,...P.map(p=>p.total)),tot=k=>P.reduce((s,p)=>s+(p[k]||0),0),maxV=Math.max(1,...d.authors.map(a=>a.views));
  v.innerHTML=`<div class="pagehead"><div><h2>Rendimiento del equipo</h2><p class="muted">Qué hizo cada persona en el panel y cómo rinden los artículos que publica. Últimos ${d.days} días.</p></div>${perBar(days)}</div>
  ${statRow([[num(tot('total')),'movimientos'],[num(tot('posts_pub')+tot('pk_pub')),'publicaciones'],[num(tot('posts_edit')+tot('pk_edit')),'actualizaciones'],[P.filter(p=>p.total).length,'personas activas']])}
  <section class="card"><h3>Productividad por persona</h3>${P.length?`<div style="overflow-x:auto"><table class="tb2"><thead><tr><th>Persona</th><th>Publicó entradas</th><th>Publicó paquetes</th><th>Actualizó</th><th>Movimientos</th><th>Días activos</th><th>Actividades</th><th>Último movimiento</th></tr></thead><tbody>${P.map(p=>`<tr><td><b>${esc(p.name||p.email)}</b>${p.active===0?' <span class="chip warn">desactivado</span>':''}<br><small class="muted">${p.role==='admin'?'Administrador':'Editor'}</small></td><td>${p.posts_pub}</td><td>${p.pk_pub}</td><td>${p.posts_edit+p.pk_edit}</td><td>${meter(p.total,max)} <b>${p.total}</b></td><td>${p.active_days}</td><td>${p.tasks.total?`${p.tasks.done} de ${p.tasks.total}`:'—'}</td><td>${p.last_at?esc(when(p.last_at)):'—'}</td></tr>`).join('')}</tbody></table></div>`:emptyBox('Todavía no hay usuarios.','Creá usuarios en Equipo → Usuarios.')}
  <p class="muted" style="margin:8px 0 0"><small>"Publicó" cuenta cada vez que una entrada o paquete pasó a estar publicado; "Actualizó", cada edición posterior. Se empieza a contar desde que se usa esta versión.</small></p></section>
  <section class="card"><h3>Rendimiento de blogs por autor</h3>${d.authors.length?`<div style="overflow-x:auto"><table class="tb2"><thead><tr><th>Autor</th><th>Entradas publicadas</th><th>Visitas</th><th>Promedio por entrada</th><th>Clics WhatsApp</th><th>Su mejor entrada</th></tr></thead><tbody>${d.authors.map(a=>`<tr><td><b>${esc(a.name)}</b></td><td>${a.posts}</td><td>${meter(a.views,maxV)} <b>${num(a.views)}</b></td><td>${num(a.avg)}</td><td>${a.wa}</td><td>${a.best&&a.best.views?`${esc(a.best.title)} <small class="muted">(${num(a.best.views)})</small>`:'—'}</td></tr>`).join('')}</tbody></table></div>`:emptyBox('No hay entradas publicadas.')}
  <p class="muted" style="margin:8px 0 0"><small>Las entradas anteriores a esta versión figuran como “Sin autor asignado”: cada entrada nueva o editada de ahora en más queda a nombre de quien la crea.</small></p></section>
  <section class="card"><h3>Entradas que mejor funcionan</h3>${d.top.length?`<div style="overflow-x:auto"><table class="tb2"><thead><tr><th>#</th><th>Entrada</th><th>Autor</th><th>Visitas</th><th>Clics WhatsApp</th></tr></thead><tbody>${d.top.map((p,i)=>`<tr><td>${i+1}</td><td><b>${esc(p.title)}</b></td><td>${esc(p.author)}</td><td>${num(p.views)}</td><td>${p.wa}</td></tr>`).join('')}</tbody></table></div>`:emptyBox('Todavía no hay visitas registradas.')}</section>`;
  $('[data-per]').onclick=e=>{const b=e.target.closest('[data-d]');if(b)team(+b.dataset.d)}}

/* Historial de movimientos */
let HS={days:30,user:'',rows:[]};
async function history(more){const v=$('#v');
  if(!isAdmin()){v.innerHTML=adminOnlyBox('Solo los administradores ven el historial.');return}
  if(!more){HS.rows=[];v.innerHTML=SK}
  let us,d;try{[us,d]=await Promise.all([api('users'),api(`activity?days=${HS.days}&limit=100${HS.user!==''?'&user='+HS.user:''}${more&&HS.rows.length?'&before='+HS.rows[HS.rows.length-1].id:''}`)])}catch{return}
  HS.rows=HS.rows.concat(d.rows);
  const tone=a=>a==='borró'?'bad':a==='creó'||a==='publicó'||a==='completó'?'ok':'neutral';
  v.innerHTML=`<div class="pagehead"><div><h2>Historial de movimientos</h2><p class="muted">Qué hizo cada persona dentro del panel: altas, ediciones, borrados, cambios de estado e ingresos.</p></div></div>
  <div class="row" style="margin-bottom:12px"><label style="margin:0">Persona <select id="hu"><option value="">Todo el equipo</option>${us.users.map(u=>`<option value="${u.id}" ${String(u.id)===String(HS.user)?'selected':''}>${esc(u.name||u.email)}</option>`).join('')}<option value="0" ${HS.user==='0'?'selected':''}>Clave general</option></select></label>
  <label style="margin:0">Período <select id="hd">${[7,30,90,365].map(n=>`<option value="${n}" ${n===HS.days?'selected':''}>Últimos ${n} días</option>`).join('')}</select></label></div>
  <section class="card">${HS.rows.length?`<div style="overflow-x:auto"><table class="tb2"><thead><tr><th>Cuándo</th><th>Quién</th><th>Qué hizo</th><th>Sobre</th><th>Detalle</th></tr></thead><tbody>${HS.rows.map(r=>`<tr><td>${esc(when(r.at))}</td><td><b>${esc(r.user_name||(r.user_id?'Usuario eliminado':'Clave general'))}</b></td><td><span class="chip ${tone(r.action)}">${esc(r.action)}</span> ${esc(r.entity)}</td><td>${esc(r.title)||'—'}</td><td><small class="muted">${esc(r.detail)}</small></td></tr>`).join('')}</tbody></table></div>${d.more?'<div style="text-align:center;margin-top:10px"><button class="s" id="hm">Ver más</button></div>':''}`:emptyBox('Sin movimientos en este período.','Cada cambio que se haga desde el panel va a quedar registrado acá.')}</section>`;
  $('#hu').onchange=e=>{HS.user=e.target.value;history()};$('#hd').onchange=e=>{HS.days=+e.target.value;history()};if($('#hm'))$('#hm').onclick=()=>history(true)}

/* Actividades obligatorias */
function refreshTaskBadge(){if(!(ME.user&&ME.user.id))return;fetch('/api/tasks',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{const n=d?d.mine.filter(t=>!t.done).length:0,e=$('#nt');if(e){e.textContent=n;e.hidden=!n}}).catch(()=>{})}

async function tasks(){const v=$('#v');v.innerHTML=SK;
  let d;try{d=await api('tasks')}catch{return}
  const fq=t=>FQ[t.frequency]+(t.frequency==='once'&&t.due_day?' · vence '+t.due_day:'');
  const mineAll=d.mine||[];
  const doneN=mineAll.filter(t=>t.done).length;
  const late=mineAll.filter(t=>t.overdue&&!t.done).length;
  const redoN=mineAll.filter(t=>t.done&&t.review==='redo').length;
  const pct=mineAll.length?Math.round(doneN*100/mineAll.length):0;
  const summary=mineAll.length?`<div class="tk-sum"><span class="chip ${doneN===mineAll.length?'ok':'neutral'}">${doneN} de ${mineAll.length} hechas</span>${late?`<span class="chip bad">${late} vencida${late>1?'s':''}</span>`:''}${redoN?`<span class="chip bad">${redoN} para corregir</span>`:''}</div><div class="tk-prog" role="progressbar" aria-label="Avance de tus actividades" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>`:'';
  const sorted=[...mineAll].sort((a,b)=>(a.done===b.done?0:a.done?1:-1));
  const item=t=>`<div class="tk-item${t.done?' is-done':''}"><input type="checkbox" class="tk-ck" data-do="${t.id}" aria-label="Marcar ${esc(t.title)}" ${t.done?'checked':''}><div class="grow"><div class="tk-t"><b>${esc(t.title)}</b>${t.overdue&&!t.done?'<span class="chip bad">vencida</span>':''}${t.done&&t.review==='ok'?'<span class="chip ok">Aprobada</span>':''}${t.done&&t.review==='redo'?'<span class="chip bad">Para corregir</span>':''}</div><small class="muted">${esc(fq(t))}${t.detail?' · '+esc(t.detail):''}</small>${linkChips(t.links)}${t.done&&(t.note||t.link||t.review_note)?`<div class="tk-proof">${t.note||t.link?'<span class="tk-lbl">Constancia</span>':''}${t.note?`<p>${esc(t.note)}</p>`:''}${t.review==='redo'&&t.review_note?`<p class="tk-fix"><b>Corrección:</b> ${esc(t.review_note)}</p>`:''}${linkChips(t.link?[{label:'Ver constancia',url:t.link}]:[])}</div>`:''}${t.done?`<div class="tk-acts"><button type="button" class="s" data-note="${t.id}">${t.note||t.link?'Editar constancia':'Agregar constancia'}</button>${t.review==='redo'?`<button type="button" class="p" data-redo="${t.id}">Entregar de nuevo</button>`:''}</div>`:''}</div></div>`;
  const mineList=(()=>{let o='',sep=false;const pn=sorted.filter(t=>!t.done).length;sorted.forEach(t=>{if(t.done&&pn&&!sep){o+='<div class="tk-sep">Hechas</div>';sep=true}o+=item(t)});return o})();
  const mine=d.me?`<section class="card tk-card"><div class="tk-h"><h3>Mis actividades</h3></div>${summary}${sorted.length?mineList:'<p class="muted">No tenés actividades asignadas por ahora.</p>'}</section>`
    :d.admin?`<div class="notice">${ic('alert')}<span>Estás con la clave general: para marcar actividades propias entrá con tu usuario.</span></div>`:'';

  // Para revisar: entregas del período actual con constancia que el admin todavía no revisó
  const pend=d.admin?d.tasks.flatMap(t=>t.status.filter(s=>s.done&&(s.note||s.link)&&!s.review).map(s=>({t,s}))):[];
  const review=pend.length?`<section class="card tk-card tk-review"><div class="tk-h"><h3>Para revisar</h3><span class="chip warn">${pend.length}</span></div><p class="muted tk-sub">Entregas del período actual que tienen constancia y todavía no revisaste.</p>${pend.map((x,i)=>`<div class="tk-rv"><div class="grow"><b>${esc(x.t.title)}</b><span class="muted"> · ${esc(x.s.name)}</span><p class="tk-quote">${esc(x.s.note||'Sin nota')}</p>${x.s.link&&/^https?:\/\//i.test(x.s.link)?`<a class="lk" href="${esc(x.s.link)}" target="_blank" rel="noopener noreferrer">${ic('ext')}Abrir evidencia</a>`:''}</div><div class="tk-acts"><button type="button" class="s" data-rv2="${i}">Pedir corrección</button><button type="button" class="p" data-ok2="${i}">Aprobar</button></div></div>`).join('')}</section>`:'';

  const adm=d.admin?`<section class="card tk-card tk-team"><div class="tk-h tk-h-wide"><div><h3>Cumplimiento del equipo</h3><p class="muted tk-sub">Cada actividad se reinicia según su frecuencia. Las de “todo el equipo” las completa cada persona por su cuenta.</p></div><span class="row tk-top"><button class="s" data-rep>${ic('chart')}Ver reporte</button><button class="p" data-new>${ic('plus')}Nueva actividad</button></span></div>
    ${d.tasks.map(t=>`<div class="tk-row${t.active?'':' is-off'}"><div class="cat-main"><div class="tk-t"><b>${esc(t.title)}</b><span class="chip neutral">${esc(FQ[t.frequency])}</span>${t.active?'':'<span class="chip warn">en pausa</span>'}${t.overdue&&t.pending?'<span class="chip bad">vencida</span>':''}</div><small class="muted">${t.assigned_to?'Asignada a una persona':'Todo el equipo'}${t.due_day?' · vence '+esc(t.due_day):''}${t.detail?' · '+esc(t.detail):''}</small>${linkChips(t.links)}
      <span class="tk-who">${t.status.map(s=>`<span class="chip ${s.done?'ok':'warn'}">${ic(s.done?'check':'clock')}${esc(s.name)}</span>`).join('')||'<small class="muted">Sin personas asignadas</small>'}</span></div>
      <div class="cat-act"><button class="s" data-ed="${t.id}">${ic('edit')}Editar</button><button class="s" data-tg="${t.id}">${t.active?'Pausar':'Activar'}</button><button class="s d" data-rm="${t.id}" aria-label="Borrar" title="Borrar">${ic('trash')}</button></div></div>`).join('')||emptyBox('Todavía no hay actividades.','Creá la primera: por ejemplo “Publicar una entrada de blog” cada semana.')}</section>`:'';

  v.innerHTML=`<div class="pagehead"><div><h2>Actividades</h2><p class="muted">Tareas que cada integrante tiene que completar.</p></div></div>${review}${mine}${adm}`;

  // Tildar completa al instante (sin modal). La constancia es una acción aparte.
  $$('[data-do]').forEach(c=>c.onchange=async()=>{const id=c.dataset.do,t=mineAll.find(x=>String(x.id)===id);
    try{
      if(c.checked){await api(`tasks/${id}/done`,'POST',{done:true,note:'',link:''});toast('Actividad completada')}
      else{
        if(t&&(t.note||t.link)&&!await confirmBox('Desmarcar “'+t.title+'”','Se borra la constancia (nota y link) que dejaste.','Desmarcar',true)){c.checked=true;return}
        await api(`tasks/${id}/done`,'POST',{done:false});toast('Actividad desmarcada')}
      tasks();refreshTaskBadge()
    }catch{c.checked=!c.checked}});
  $$('[data-note]').forEach(b=>b.onclick=async()=>{const t=mineAll.find(x=>String(x.id)===b.dataset.note);if(!t)return;const ev=await askDone(t);if(!ev)return;
    try{await api(`tasks/${t.id}/done`,'POST',{done:true,...ev});toast('Constancia guardada');tasks()}catch{}});
  $$('[data-redo]').forEach(b=>b.onclick=async()=>{const t=mineAll.find(x=>String(x.id)===b.dataset.redo);if(!t)return;const ev=await askDone(t);if(!ev)return;
    try{await api(`tasks/${t.id}/done`,'POST',{done:true,...ev});toast('Entrega actualizada');tasks()}catch{}});
  $$('[data-ok2]').forEach(b=>b.onclick=async()=>{const x=pend[+b.dataset.ok2];if(!x)return;
    try{await api(`tasks/${x.t.id}/review`,'PUT',{user_id:x.s.user_id,period:x.t.period,status:'ok',review_note:''});toast('Entrega aprobada');tasks()}catch{}});
  $$('[data-rv2]').forEach(b=>b.onclick=async()=>{const x=pend[+b.dataset.rv2];if(!x)return;
    const m=await modal({title:'Pedir corrección',body:`<p class="muted">${esc(x.s.name)} · ${esc(x.t.title)}. Explicá qué hay que cambiar.</p>`,fields:[['note','Qué corregir','','Ej: falta el link a la guía','textarea']],ok:'Pedir corrección'});
    if(!m||!m.note.trim()){if(m)toast('Escribí qué corregir','err');return}
    try{await api(`tasks/${x.t.id}/review`,'PUT',{user_id:x.s.user_id,period:x.t.period,status:'redo',review_note:m.note.trim()});toast('Corrección pedida');tasks()}catch{}});

  if(!d.admin)return;
  const who=[['0','Todo el equipo'],...d.team.map(u=>[String(u.id),u.name||u.email])],FR=Object.entries(FQ);
  const ask=async t=>{const m=await modal({title:t?'Editar actividad':'Nueva actividad',fields:[['title','Actividad',t?.title||'','Ej: Publicar una entrada de blog'],['detail','Detalle (opcional)',t?.detail||'',''],['frequency','Frecuencia',t?.frequency||'weekly','',FR],['assigned_to','Asignada a',String(t?.assigned_to||0),'',who],['due_day','Vence el (solo si es una sola vez)',t?.due_day||'','','date'],['links','Links útiles (uno por línea: Nombre | https://…)',linksText(t?.links),'Guía | https://…\nhttps://…','textarea']],ok:t?'Guardar':'Crear actividad'});
    if(!m)return;if(!m.title.trim()){toast('Escribí la actividad','err');return}
    const body={title:m.title.trim(),detail:m.detail.trim(),frequency:m.frequency,assigned_to:+m.assigned_to,due_day:m.due_day,links:m.links,active:t?t.active:1};
    await api(t?'tasks/'+t.id:'tasks',t?'PUT':'POST',body);toast(t?'Actividad guardada':'Actividad creada');tasks()};
  v.onclick=async e=>{const b=e.target.closest('button');if(!b)return;const t=d.tasks.find(x=>x.id==(b.dataset.ed||b.dataset.tg||b.dataset.rm));
    try{if('rep' in b.dataset){tab='actrep';location.hash=tab;shell();return}if('new' in b.dataset)await ask();else if(b.dataset.ed)await ask(t);
      else if(b.dataset.tg){await api('tasks/'+t.id,'PUT',{title:t.title,detail:t.detail,frequency:t.frequency,assigned_to:t.assigned_to,due_day:t.due_day,active:t.active?0:1});tasks()}
      else if(b.dataset.rm&&await confirmBox('Borrar “'+t.title+'”','Se borra la actividad y su historial de cumplimiento.','Borrar',true)){await api('tasks/'+t.id,'DELETE');toast('Actividad borrada');tasks()}}catch{}}}

/* Links adjuntos de las actividades */
const linksText=L=>(L||[]).map(l=>l.label+' | '+l.url).join('\n');
const linkChips=L=>{const a=(L||[]).filter(l=>/^https?:\/\//i.test(l.url));return a.length?`<span class="lk-row">${a.map(l=>`<a class="lk" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" title="${esc(l.url)}">${ic('ext')}${esc(l.label)}</a>`).join('')}</span>`:''};

// Constancia de una actividad hecha (nota y link opcionales). Si ya existe, viene precargada.
const askDone=async t=>{const m=await modal({title:t?.note||t?.link?'Editar constancia':'Agregar constancia',body:'<p class="muted">Si querés, dejá una nota o un link como constancia (es opcional).</p>',fields:[['note','Nota',t?.note||'','Ej: Publicada, ya está en el blog','textarea'],['link','Link (opcional)',t?.link||'','https://…']],ok:'Guardar'});return m?{note:m.note.trim(),link:m.link.trim()}:null};
const revChip=r=>r.review==='ok'?'<span class="chip ok">Aprobada</span>':r.review==='redo'?'<span class="chip bad">Pedir corrección</span>':'';

/* Reporte de actividades */
async function actrep(days=30){const v=$('#v');v.innerHTML=SK;
  if(!isAdmin()){v.innerHTML=adminOnlyBox('Solo los administradores ven el reporte de actividades.');return}
  let d;try{d=await api('tasks/report?days='+days)}catch{return}
  const T=d.totals,rt=r=>r==null?'—':r+'%',tn=r=>r==null?'':r>=80?'ok':r>=50?'warn':'bad';
  const bar=r=>`<span class="rp-bar"><i class="${tn(r)}" style="width:${r||0}%"></i></span>`;
  const fd=s=>s?s.split('-').reverse().slice(0,2).join('/'):'—';
  const P=[...d.people].sort((a,b)=>(a.rate??101)-(b.rate??101));
  v.innerHTML=`<div class="pagehead"><div><h2>Reporte de actividades</h2><p class="muted">Cumplimiento del ${esc(fd(d.from))} al ${esc(fd(d.to))}. Solo cuentan los períodos que ya terminaron; el de hoy figura “en curso”.</p></div>${perBar(days,'<button class="s" id="rp-csv">Descargar CSV</button>')}</div>
  ${statRow([[rt(T.rate),'cumplimiento',tn(T.rate)],[T.done,'hechas'],[T.missed,'no hechas',T.missed?'bad':''],[T.open,'en curso']])}
  ${d.tasks.length?`<section class="card"><h3>Por persona</h3><div style="overflow-x:auto"><table class="tb2"><thead><tr><th>Persona</th><th>Hechas</th><th>No hechas</th><th>En curso</th><th>Cumplimiento</th></tr></thead><tbody>${P.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${p.done}</td><td>${p.missed?`<span class="chip bad">${p.missed}</span>`:'0'}</td><td>${p.open}</td><td>${bar(p.rate)} <b>${rt(p.rate)}</b></td></tr>`).join('')||`<tr><td colspan="5" class="muted">Sin personas asignadas.</td></tr>`}</tbody></table></div></section>
  <section class="card"><h3>Por actividad</h3>${d.tasks.map(t=>`<div class="cat-row"><div class="cat-main"><b>${esc(t.title)}</b> <span class="tag" style="background:#6b7390">${esc(FQ[t.frequency])}</span> <span class="chip ${tn(t.rate)||''}">${rt(t.rate)}</span><small class="muted">${t.done} hechas · ${t.missed} no hechas · ${t.open} en curso</small>${linkChips(t.links)}<span style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${t.people.map(p=>`<span class="chip ${p.missed?(p.done?'warn':'bad'):p.done?'ok':'warn'}">${esc(p.name)}: ${p.done} de ${p.done+p.missed}${p.open?' (+1 en curso)':''}</span>`).join('')||'<small class="muted">Sin personas asignadas</small>'}</span></div></div>`).join('')}</section>
  <section class="card"><h3>Lo que quedó sin hacer</h3>${d.missed.length?`<div style="overflow-x:auto"><table class="tb2"><thead><tr><th>Actividad</th><th>Persona</th><th>Período cerrado el</th></tr></thead><tbody>${d.missed.map(m=>`<tr><td>${esc(m.title)}</td><td>${esc(m.name)}</td><td>${esc(fd(m.end))}</td></tr>`).join('')}</tbody></table></div>`:emptyBox('No quedó nada sin hacer en este período.')}</section>
  <section class="card"><h3>Entregas recientes</h3>${d.recent.length?`<div style="overflow-x:auto"><table class="tb2"><thead><tr><th>Cuándo</th><th>Actividad</th><th>Persona</th><th>Nota</th><th>Link</th><th>Revisión</th></tr></thead><tbody>${d.recent.map((r,i)=>`<tr><td>${esc(when(r.done_at))}</td><td>${esc(r.title)}</td><td>${esc(r.name)}</td><td>${esc(r.note)||'—'}</td><td>${r.link&&/^https?:\/\//i.test(r.link)?`<a href="${esc(r.link)}" target="_blank" rel="noopener noreferrer">Abrir</a>`:'—'}</td><td>${revChip(r)}${r.review_note?` <small class="muted">${esc(r.review_note)}</small>`:''}<br><button type="button" class="s" data-rv="${i}">${r.review?'Cambiar':'Revisar'}</button></td></tr>`).join('')}</tbody></table></div>`:emptyBox('Todavía no hay entregas en este período.','Cuando alguien marque una actividad como hecha aparece acá, con su nota y su link si dejó.')}</section>
  <p class="muted"><small>Una actividad cuenta desde el día en que se creó. Las pausadas no entran. Hay que haberla marcado dentro de su período (día, semana de lunes a domingo o mes) para que cuente como hecha.</small></p>`:emptyBox('Todavía no hay actividades activas.','Creá actividades en Operación → Actividades para ver su cumplimiento.')}`;
  $('[data-per]').onclick=e=>{const b=e.target.closest('[data-d]');if(b)actrep(+b.dataset.d)};
  $$('[data-rv]').forEach(b=>b.onclick=async()=>{const r=d.recent[+b.dataset.rv],m=await modal({title:'Revisar entrega',body:`<p class="muted">${esc(r.name)} · ${esc(r.title)}</p>`,fields:[['status','Resultado',r.review||'ok','',[['ok','Aprobada'],['redo','Pedir corrección'],['','Quitar revisión']]],['note','Comentario',r.review_note||'','Si pedís corrección, explicá qué hay que cambiar','textarea']],ok:'Guardar revisión'});if(!m)return;try{await api(`tasks/${r.task_id}/review`,'PUT',{user_id:r.user_id,period:r.period,status:m.status,review_note:m.note.trim()});toast('Revisión guardada');actrep(days);loadAlerts()}catch{}});
  $('#rp-csv').onclick=()=>{const q=x=>{let t=String(x??'');if(/^[=+\-@\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"'};
    const rows=[['Actividad','Frecuencia','Persona','Hechas','No hechas','En curso','Cumplimiento %'],...d.tasks.flatMap(t=>t.people.map(p=>[t.title,FQ[t.frequency],p.name,p.done,p.missed,p.open,p.rate==null?'':p.rate]))];
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));a.download=`reporte-actividades-${d.to}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}}

/* Avisos: lo que falta hacer o revisar (campana y resumen de Inicio) */
let AL={alerts:[],counts:{bad:0,warn:0,info:0}},_alBusy=false;
const ALL={bad:'Urgente',warn:'Atención',info:'Pendiente'};
async function loadAlerts(){if(_alBusy)return;_alBusy=true;try{const r=await fetch('/api/alerts',{cache:'no-store'});if(r.ok){AL=await r.json();paintBell();paintHomeAlerts()}}catch{}finally{_alBusy=false}}
const alItem=a=>`<button type="button" class="al al-${a.level}" data-al="${esc(a.tab)}"><span class="al-dot" aria-hidden="true"></span><span class="grow"><small class="al-lv">${ALL[a.level]}</small><br>${esc(a.text)}</span></button>`;
function paintBell(){const b=$('#bn'),p=$('#bellp');if(!b||!p)return;const c=AL.counts,n=c.bad+c.warn;b.textContent=n;b.hidden=!n;b.className='bn'+(c.bad?' bad':'');
  p.innerHTML=AL.alerts.length?`<h4>Avisos</h4>${AL.alerts.map(alItem).join('')}`:`<h4>Avisos</h4><p class="muted" style="margin:6px 4px">Todo al día. No hay nada pendiente.</p>`}
function paintHomeAlerts(){const e=$('#home-al');if(!e)return;const L=AL.alerts.filter(a=>a.level!=='info').slice(0,5);e.innerHTML=L.length?`<section class="card al-card"><h3 style="margin-top:0">Para revisar hoy</h3>${L.map(alItem).join('')}</section>`:''}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-al]');
  if(b){if(!(await leave()))return;dirty=false;tab=b.dataset.al;location.hash=tab;shell();return}
  const p=$('#bellp');if(p&&!p.hidden&&!e.target.closest('#bellp')&&!e.target.closest('#bell')){p.hidden=true;$('#bell')?.setAttribute('aria-expanded','false')}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const p=$('#bellp');if(p&&!p.hidden){p.hidden=true;$('#bell')?.focus()}}});
setInterval(()=>{if(document.visibilityState==='visible'&&$('#bell'))loadAlerts()},300000);

/* Favoritos de la portada */
let FV=null;
/* ---------- conectar Claude (conector MCP del blog) ---------- */
// Cada conexión es una clave privada: Claude la usa para crear y editar notas del blog, paquetes y servicios. La dirección completa se muestra una sola vez.
async function claude(){const v=$('#v');v.innerHTML=SK;let d;try{d=await api('claude-keys')}catch{v.innerHTML=emptyBox('Solo un administrador puede conectar Claude.','Pedile a un administrador que cree la conexión.');return}
  const act=d.keys.filter(k=>!k.revoked),old=d.keys.filter(k=>k.revoked);
  const row=k=>`<div class="ck-row${k.revoked?' is-off':''}"><div class="grow"><b>${esc(k.name)}</b> <span class="chip ${k.revoked?'neutral':k.can_publish?'warn':'ok'}">${k.revoked?'revocada':k.can_publish?'puede publicar':'solo borradores'}</span><small class="muted">Clave ${esc(k.prefix)}… · creada ${esc(ago(k.created_at))}${k.by_name?' por '+esc(k.by_name):''} · ${k.last_used?'último uso '+esc(ago(k.last_used))+' · '+k.uses+' acción'+(k.uses===1?'':'es'):'todavía sin usar'}</small></div>${k.revoked?'':`<button class="s d" data-rv="${k.id}">${ic('x')}Revocar</button>`}</div>`;
  v.innerHTML=`<div class="pagehead"><div><h2>Conectar Claude</h2><p class="muted">Conectá tu cuenta de Claude para pedirle desde el chat notas del blog y paquetes o servicios nuevos: los arma, elige la categoría, carga precios, opciones y qué incluye, y los deja guardados acá. No toca reservas, disponibilidad ni usuarios, y nunca borra nada.</p></div><button class="p" id="ck-new">${ic('plus')}Nueva conexión</button></div>
  <div class="grid ck-grid"><section class="card"><h3>Cómo conectarlo</h3><ol class="ck-steps">
    <li><b>Creá una conexión</b> con el botón de arriba y copiá la dirección que aparece (se muestra una sola vez).</li>
    <li>En <b>claude.ai</b> (o la app de Claude) andá a <b>Personalizar › Conectores</b> y tocá <b>Agregar conector personalizado</b>.</li>
    <li>Nombre: <i>Blog ${esc(BR.brand||'')}</i>. Pegá la dirección en <b>URL del servidor MCP</b>. En autenticación elegí <b>Sin inicio de sesión</b> y tocá <b>Agregar</b>.</li>
    <li>En un chat, tocá <b>+ › Conectores</b>, activá el del blog y pedile, por ejemplo: <i>“Escribí una nota para el blog sobre qué hacer en Buenos Aires en 3 días, con enlaces a nuestros paquetes”</i> o <i>“Creá el servicio Tango Show Platea: solo show R$ 210, con cena R$ 475, traslado incluido, salida 20:30”</i>.</li>
    <li>La nota aparece en <b>Blog</b> como borrador: revisala, agregale la foto si falta y publicala.</li></ol>
    <p class="muted ck-note">En planes Team o Enterprise, el conector lo agrega un propietario de la organización (Configuración de la organización › Conectores). En el plan gratuito se puede agregar un solo conector personalizado.</p></section>
   <section class="card"><h3>Conexiones activas <span class="chip neutral">${act.length}</span></h3>${act.map(row).join('')||'<p class="muted">Todavía no hay ninguna. Creá la primera con <b>Nueva conexión</b>.</p>'}
    ${old.length?`<details class="ck-old"><summary>Revocadas (${old.length})</summary>${old.map(row).join('')}</details>`:''}
    <p class="muted ck-note">La dirección funciona como una contraseña: no la compartas. Si se filtra o ya no la usás, revocala y creá otra.</p></section></div>`;
  $('#ck-new').onclick=async()=>{const m=await modal({title:'Nueva conexión de Claude',body:'<p class="muted">Con <b>solo borradores</b>, Claude crea y edita borradores, y vos publicás desde el panel. Con <b>puede publicar</b>, Claude publica solo si se lo pedís en el chat.</p>',fields:[['name','Nombre (para reconocerla)',ME.user?.name?'Claude de '+ME.user.name:'Claude','Ej: Claude de Mario'],['perm','Permiso','0','',[['0','Solo borradores (recomendado)'],['1','Puede publicar']]]],ok:'Crear conexión'});
    if(!m)return;try{const r=await api('claude-keys','POST',{name:m.name.trim(),can_publish:m.perm==='1'});
      await modal({title:'Copiá la dirección del conector',body:`<p>Pegala en claude.ai › Personalizar › Conectores › <b>Agregar conector personalizado</b>, con autenticación <b>Sin inicio de sesión</b>.</p><div class="ck-url"><input id="ck-u" readonly value="${esc(r.url)}" aria-label="Dirección del conector"><button type="button" class="p" id="ck-cp">${ic('copy')}Copiar</button></div><p class="muted" style="margin-top:10px"><b>Se muestra una sola vez.</b> Si la perdés, revocá esta conexión y creá otra.</p>`,ok:'Listo',cancel:null});
      claude()}catch{}};
  if(!window.__ckcp)window.__ckcp=1,document.addEventListener('click',function cp(e){const b=e.target.closest('#ck-cp');if(!b)return;const i=$('#ck-u');i.select();(navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.reject()).then(()=>toast('Dirección copiada'),()=>{try{document.execCommand('copy');toast('Dirección copiada')}catch{}})});
  $$('[data-rv]').forEach(b=>b.onclick=async()=>{const k=d.keys.find(x=>x.id==b.dataset.rv);if(await confirmBox('Revocar “'+esc(k.name)+'”','Claude deja de tener acceso con esta dirección. Lo que ya creó no se toca.','Revocar',true)){try{await api('claude-keys/'+k.id,'DELETE');toast('Conexión revocada');claude()}catch{}}})}
/* ---------- asistente IA (WhatsApp) ---------- */
// La IA contesta todo; el equipo solo la detiene (en todo el sitio o en una charla). IA_T = charla de prueba (no se guarda).
let IA_T=[],IA_OPEN=0,IA_F='todas',IA_Q='',IA_D=null;
const iaWho={user:'Cliente',assistant:'Gaspi (asistente)',agent:'Equipo'};
const iaTxt=t=>esc(t).replace(/\*([^*\n]+)\*/g,'<b>$1</b>').replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g,'<br>');
const iaBub=m=>`<div class="ia-b ${m.role==='user'?'u':m.role==='agent'?'g':'a'}"><small>${iaWho[m.role]||''}${m.at?' · '+esc(ago(m.at)):''}</small><div>${iaTxt(m.text)}</div></div>`;
const iaOrigin=o=>!o?'':`<span class="chip ${/^Anuncio|^Publicaci/.test(o)?'warn':/^Promo/.test(o)?'warn':/^Web/.test(o)?'ok':'neutral'}" title="${esc(o)}">${esc(/^Anuncio/.test(o)?'Anuncio':/^Publicaci/.test(o)?'Publicación':/^Promo/.test(o)?'Promoción':/^Web/.test(o)?'Desde la web':'Directo')}</span>`;
const iaFlags=c=>`${c.pay_check?'<span class="chip warn">Verificar pago</span>':''}${c.handoff?'<span class="chip bad">Mirar charla</span>':''}${c.paused?'<span class="chip neutral">IA detenida</span>':''}`;
async function ia(){const v=$('#v');if(!IA_D)v.innerHTML=SK;let d;try{d=await api('ia')}catch{return}IA_D=d;
  const I=d.ia,W=d.whatsapp,S=d.stats,prov=I.provider==='claude'?'Claude':'Gemini',on=I.envActiva&&!I.detenida;
  const kpi=(n,l,tone,f)=>`<button type="button" class="kpi ${tone||''}" ${f?`data-iaf="${f}"`:''}><span class="kpi-n">${n}</span><span class="kpi-l">${l}</span></button>`;
  v.innerHTML=`<div class="pagehead"><div><h2>Asistente IA</h2><p class="muted">Atiende el WhatsApp con los paquetes, el blog y las reseñas de la web. Responde todo; vos solo lo detenés cuando querés.</p></div></div>
  <section class="card ia-hero ${on?'is-on':'is-off'}"><span class="ia-dot" aria-hidden="true"></span><div class="grow"><b>${on?'La IA está respondiendo':'Respuestas detenidas'}</b><small class="muted">${on?`${prov} · ${S.respuestas} respuestas en las últimas 24 h (tope ${I.tope})`:!I.envActiva?'Está apagada desde Cloudflare (IA_ACTIVA=0).':'Los mensajes se siguen guardando acá, pero nadie les contesta automáticamente.'}</small></div>
   ${I.envActiva&&d.puedeEditar?`<button type="button" class="${on?'d':'p'}" id="ia-tg">${on?'Detener respuestas':'Reanudar respuestas'}</button>`:''}</section>
  <section class="kpis ia-kpis" aria-label="Indicadores">${kpi(S.charlasHoy,'charlas hoy')}${kpi(S.nuevas7,'clientes nuevos (7 días)')}${kpi(S.persona,'para mirar',S.persona?'warn':'ok','revisar')}${kpi(S.pago,'pagos a verificar',S.pago?'warn':'ok','revisar')}</section>
  <section class="card ia-inbox"><div class="ia-list-col"><div class="ia-tools"><div class="seg" role="group" aria-label="Filtro">${[['todas','Todas'],['revisar','Para revisar',d.pending],['detenidas','Detenidas']].map(([k,l,n])=>`<button type="button" class="seg-b" data-iaf="${k}" aria-pressed="${IA_F===k}">${l}${n?`<span class="seg-n">${n}</span>`:''}</button>`).join('')}</div><input id="ia-s" type="search" placeholder="Buscar nombre o número" value="${esc(IA_Q)}" aria-label="Buscar conversación"></div><div class="ia-list" id="ia-l"></div></div>
   <div class="ia-det-col" id="ia-det"><div class="ia-empty-det">${ic('chat')}<p class="muted">Elegí una conversación para verla, responder o detener la IA en esa charla.</p></div></div></section>
  <div class="grid ia-top">
   <section class="card"><h3>Probar el asistente</h3><p class="muted" style="margin-top:0">Escribí como un cliente. Usa los mismos datos y reglas que en WhatsApp, pero no se guarda ni se envía.</p>
    <div class="ia-tools"><label class="muted" for="ia-or" style="margin:0">Llega por</label><select id="ia-or"><option value="">Contacto directo</option><option value="anuncio">Un anuncio</option><option value="promo">Una promoción</option><option value="web">La web</option></select></div>
    <div class="ia-chat" id="ia-t">${IA_T.map(iaBub).join('')||'<p class="muted ia-empty">Ej.: “Oi! Vi a promoção no Instagram, somos 4 pessoas”</p>'}</div>
    <form id="ia-f" class="ia-send"><input id="ia-q" placeholder="Mensaje del cliente…" autocomplete="off" aria-label="Mensaje de prueba"><button class="p" id="ia-go">Enviar</button><button type="button" class="s" id="ia-rs" title="Empezar de nuevo" aria-label="Empezar de nuevo">${ic('refresh')}</button></form></section>
   <section class="card"><h3>Indicaciones para el asistente</h3><p class="muted" style="margin-top:0">Lo que tiene que saber o priorizar además de la web: qué recomendar primero, extras, promociones vigentes, horarios del equipo, tono. ${d.puedeEditar?'':'Solo un administrador puede cambiarlas.'}</p>
    <textarea id="ia-ins" rows="8" aria-label="Indicaciones para el asistente" ${d.puedeEditar?'':'disabled'} placeholder="Ej.: El servicio principal es el City Tour de Zona Sur (4 h). Ofrecé como extra el City Fotográfico Privado. Promoción vigente: … El equipo atiende de 9 a 20 h.">${esc(d.instrucciones)}</textarea>
    <label class="ia-chk"><input type="checkbox" id="ia-pc" ${d.pausaCelular?'checked':''} ${d.puedeEditar?'':'disabled'}> Detener la IA en una charla cuando alguien responde desde el celular</label>
    <label class="ia-chk"><input type="checkbox" id="ia-sg" ${d.seguimiento?'checked':''} ${d.puedeEditar?'':'disabled'}> Seguimiento automático: si el cliente deja de responder, escribirle a las <select id="ia-sgh" ${d.puedeEditar?'':'disabled'}>${[1,2,3,4,6,8,12].map(h=>`<option value="${h}" ${(d.seguimiento||3)===h?'selected':''}>${h} h</option>`).join('')}</select></label>
    <p class="muted ck-note" style="margin-top:4px">Un mensaje por silencio, entre 9 y 21 h, dentro de las 24 h que permite WhatsApp y nunca si ya pagó. ${d.cronListo?`Enviados en 7 días: ${d.seguimientos7}.`:'<b>Falta conectar el aviso programado (IA_CRON_KEY).</b>'}</p>
    ${d.puedeEditar?'<div style="margin-top:10px"><button class="p" id="ia-sv">Guardar</button></div>':''}</section>
  </div>
  <details class="card ia-cx"><summary><b>Conexión</b> <span class="muted">${I.ready?prov+' conectado':'Falta la clave de '+prov} · WhatsApp ${W.missing.length?'sin configurar':'conectado'}</span></summary>
   <div class="ia-st"><span>IA</span><div>${I.ready?'<span class="chip ok">'+prov+' conectado</span>':'<span class="chip warn">Falta la clave de '+prov+'</span>'} <small class="muted">modelo ${esc(I.model)}</small></div></div>
   <div class="ia-st"><span>WhatsApp</span><div>${W.missing.length?`<span class="chip warn">Falta configurar</span> <small class="muted">Faltan: ${W.missing.map(esc).join(', ')}</small>`:'<span class="chip ok">Conectado</span>'}</div></div>
   <label style="margin-top:12px;display:block">Dirección del webhook (para Meta)</label><div class="ck-url"><input id="ia-wh" readonly value="${esc(W.webhook)}" aria-label="Dirección del webhook"><button type="button" class="s" id="ia-whc">${ic('copy')}Copiar</button></div>
   <p class="muted ck-note">Para pasar de Gemini a Claude: cargá <b>ANTHROPIC_API_KEY</b> y poné <b>IA_PROVEEDOR</b> en <b>claude</b> en Cloudflare.</p></details>`;
  const paintL=()=>{const q=IA_Q.toLowerCase(),list=d.chats.filter(c=>(IA_F==='todas'||(IA_F==='revisar'&&(c.handoff||c.pay_check))||(IA_F==='detenidas'&&c.paused))&&(!q||(c.name||'').toLowerCase().includes(q)||c.contact.includes(q.replace(/\D/g,'')||'§')));
    $('#ia-l').innerHTML=list.length?list.map(c=>`<button type="button" class="ia-row${c.handoff||c.pay_check?' is-hot':''}${IA_OPEN===c.id?' on':''}" data-chat="${c.id}"><div class="grow"><b>${esc(c.name||'+'+c.contact)}</b> ${iaOrigin(c.origin)}${iaFlags(c)}<small class="muted">${esc((c.last_text||'').replace(/\*/g,'').slice(0,110))}</small></div><small class="muted">${esc(ago(c.updated_at))}</small></button>`).join(''):emptyBox(d.chats.length?'No hay conversaciones con ese filtro.':'Todavía no hay conversaciones.',d.chats.length?'':'Aparecen acá cuando un cliente escribe al WhatsApp.');
    $$('[data-chat]').forEach(b=>b.onclick=()=>{IA_OPEN=+b.dataset.chat;$$('[data-chat]').forEach(x=>x.classList.toggle('on',x===b));iaChat(IA_OPEN)})};
  paintL();
  $$('[data-iaf]').forEach(b=>b.onclick=()=>{IA_F=b.dataset.iaf;$$('.ia-tools [data-iaf]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.iaf===IA_F));paintL();$('#ia-l').scrollIntoView({block:'nearest'})});
  $('#ia-s').oninput=e=>{IA_Q=e.target.value;paintL()};
  if($('#ia-tg'))$('#ia-tg').onclick=async()=>{try{await api('ia/config','PUT',{detenida:on});toast(on?'Respuestas detenidas':'La IA vuelve a responder');ia()}catch{}};
  $('#ia-whc').onclick=()=>{const i=$('#ia-wh');i.select();(navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.reject()).then(()=>toast('Dirección copiada'),()=>{try{document.execCommand('copy');toast('Dirección copiada')}catch{}})};
  const paintT=()=>{const t=$('#ia-t');t.innerHTML=IA_T.map(iaBub).join('');t.scrollTop=t.scrollHeight};
  $('#ia-rs').onclick=()=>{IA_T=[];paintT();$('#ia-t').innerHTML='<p class="muted ia-empty">Charla nueva.</p>'};
  $('#ia-f').onsubmit=async e=>{e.preventDefault();const q=$('#ia-q').value.trim();if(!q)return;IA_T.push({role:'user',text:q});$('#ia-q').value='';paintT();$('#ia-go').disabled=true;
    try{const r=await api('ia/probar','POST',{messages:IA_T,origen:$('#ia-or').value});IA_T.push({role:'assistant',text:r.reply+(r.handoff?'\n\n[En WhatsApp, esta charla quedaría marcada para que la mire una persona]':'')+(r.pago?'\n\n[En WhatsApp, quedaría marcada para verificar el pago]':'')})}catch{IA_T.pop()}
    $('#ia-go').disabled=false;paintT();$('#ia-q').focus()};
  if($('#ia-sv'))$('#ia-sv').onclick=async()=>{try{await api('ia/config','PUT',{instrucciones:$('#ia-ins').value,pausaCelular:$('#ia-pc').checked,seguimiento:$('#ia-sg').checked?+$('#ia-sgh').value:0});toast('Guardado')}catch{}};
  if(IA_OPEN)iaChat(IA_OPEN)}
async function iaChat(id){const box=$('#ia-det');if(!box)return;let d;try{d=await api('ia/'+id)}catch{return}
  const c=d.chat;
  box.innerHTML=`<div class="ia-dh"><div><b>${esc(c.name||'+'+c.contact)}</b> <a href="https://wa.me/${esc(c.contact)}" target="_blank" rel="noopener">+${esc(c.contact)}</a> ${iaFlags(c)}
      ${c.origin?`<small class="muted">Origen: ${esc(c.origin)}</small>`:''}${(()=>{let f={};try{f=JSON.parse(c.datos||'{}')||{}}catch{}const L={fechas:'Fechas',personas:'Personas',primera_vez:'Primera vez',intereses:'Le interesa',paseo_elegido:'Eligió',hotel:'Hotel',presupuesto:'Presupuesto',otros:'Otros'};const e=Object.entries(f).filter(([,v])=>v);return e.length?`<small class="muted">Ficha: ${e.map(([k,v])=>`<b>${esc(L[k]||k)}</b> ${esc(v)}`).join(' · ')}</small>`:''})()}${c.handoff_reason?`<small class="muted">Aviso: ${esc(c.handoff_reason)}</small>`:''}</div>
    <div class="ia-acts">${c.pay_check?`<button type="button" class="p" id="ia-pv">${ic('check')}Pago verificado</button>`:''}${c.handoff?`<button type="button" class="s" id="ia-at">${ic('check')}Ya la miré</button>`:''}<button type="button" class="${c.paused?'p':'d'}" id="ia-pz">${c.paused?'Reanudar IA':'Detener IA en esta charla'}</button></div></div>
    ${c.pay_check?`<div class="notice">${ic('alert')}<span>El cliente dice que pagó${c.pay_since?' ('+esc(ago(c.pay_since))+')':''}. Verificá el ingreso, marcá la reserva como pagada en <b>Reservas</b> y tocá <b>Pago verificado</b>.</span></div>`:''}
    <div class="ia-chat tall" id="ia-m">${d.messages.map(iaBub).join('')}</div>
    <form id="ia-r" class="ia-send"><input id="ia-rt" placeholder="Responder como ${esc(BR.brand||'la agencia')}…" autocomplete="off" aria-label="Respuesta"><button class="p">Enviar</button></form>
    <p class="muted ck-note">${c.paused?'La IA está detenida en esta charla: solo responde el equipo.':'La IA sigue respondiendo en esta charla. Para atenderla solo vos, tocá “Detener IA en esta charla”.'} WhatsApp deja escribir texto libre hasta 24 h después del último mensaje del cliente.</p>`;
  const m=$('#ia-m');m.scrollTop=m.scrollHeight;
  const put=async(body,msg)=>{try{await api('ia/'+id,'PUT',body);toast(msg);ia()}catch{}};
  if($('#ia-pv'))$('#ia-pv').onclick=()=>put({pay_check:false},'Pago verificado');
  if($('#ia-at'))$('#ia-at').onclick=()=>put({atendida:true},'Listo');
  $('#ia-pz').onclick=()=>put({paused:!c.paused},c.paused?'La IA vuelve a responder en esta charla':'IA detenida en esta charla');
  $('#ia-r').onsubmit=async e=>{e.preventDefault();const t=$('#ia-rt').value.trim();if(!t)return;try{await api('ia/'+id,'POST',{text:t});toast('Enviado');ia()}catch{}}}
async function favs(){const v=$('#v');v.innerHTML=SK;let d;try{d=await api('favorites')}catch{return}
  FV={all:d.packages,posts:d.posts,slots:d.home_slots,pk:d.packages.filter(p=>p.featured).map(p=>p.id),po:d.posts.filter(p=>p.featured).map(p=>p.id),q:''};dirty=false;paintFavs()}
function paintFavs(){const v=$('#v'),by=new Map(FV.all.map(p=>[p.id,p])),sel=FV.pk.map(i=>by.get(i)).filter(Boolean),q=FV.q.toLowerCase();
  const rest=FV.all.filter(p=>!FV.pk.includes(p.id)&&(!q||p.title.toLowerCase().includes(q)));
  const th=p=>p.image?`<img class="th" src="${esc(p.image)}" alt="" loading="lazy">`:`<div class="th">${ic('image')}</div>`;
  const sub=p=>`${tipoLbl(p)||'Producto'} · ${esc(CATS.packages[p.category]?.label||p.category)}`;
  const cut=FV.slots>0&&sel.length>FV.slots;
  v.innerHTML=`<div class="pagehead"><div><h2>Favoritos de la portada</h2><p class="muted">Elegí qué paquetes, servicios y entradas se destacan en la página principal. En la portada se muestran los primeros ${FV.slots} favoritos, en este orden; los demás quedan de reserva.</p></div><button class="p" id="fsv" ${dirty?'':'disabled'}>${ic('check')}Guardar favoritos</button></div>
  <section class="card fv-card"><div class="fv-h"><h3>Paquetes y servicios en la portada</h3><span class="chip neutral">${Math.min(sel.length,FV.slots)} de ${FV.slots} lugares</span></div>${sel.map((p,i)=>`${cut&&i===FV.slots?'<div class="fv-cut" role="separator"><span>Desde acá quedan de reserva: no se ven en la portada</span></div>':''}<div class="fv-row${i>=FV.slots?' is-spare':''}"><span class="fv-n" aria-label="Lugar ${i+1}">${i+1}</span>${th(p)}<div class="grow"><b>${esc(p.title)}</b><small class="muted">${sub(p)}</small></div><div class="fv-act"><button class="s" data-up="${p.id}" ${i?'':'disabled'} aria-label="Subir ${esc(p.title)}" title="Subir">${ic('up')}</button><button class="s" data-dn="${p.id}" ${i<sel.length-1?'':'disabled'} aria-label="Bajar ${esc(p.title)}" title="Bajar">${ic('down')}</button><button class="s d" data-rm="${p.id}" aria-label="Quitar ${esc(p.title)} de favoritos" title="Quitar">${ic('x')}</button></div></div>`).join('')||emptyBox('Todavía no elegiste favoritos.','Agregalos desde la lista de abajo: la portada los muestra primero.')}</section>
  <section class="card fv-card"><div class="fv-h"><h3>Agregar a favoritos</h3></div><div class="bk-search fv-search">${ic('search')}<input id="fq" type="search" placeholder="Buscar por nombre…" aria-label="Buscar por nombre" value="${esc(FV.q)}"></div>${rest.map(p=>`<div class="fv-row">${th(p)}<div class="grow"><b>${esc(p.title)}</b><small class="muted">${sub(p)}</small></div><button class="s" data-add="${p.id}">${ic('star')}Agregar</button></div>`).join('')||'<p class="muted">No hay más paquetes publicados.</p>'}</section>
  <section class="card fv-card"><div class="fv-h"><h3>Entradas de blog destacadas</h3></div><p class="muted fv-sub">Las destacadas se muestran primero; después van las últimas publicadas.</p>${FV.posts.map(p=>`<div class="fv-row">${th(p)}<div class="grow"><b>${esc(p.title)}</b>${FV.po.includes(p.id)?'<span class="chip ok">Destacada</span>':''}<small class="muted">${esc(CATS.posts[p.category]?.label||p.category)}</small></div><button class="s${FV.po.includes(p.id)?'':' fv-on'}" data-po="${p.id}">${FV.po.includes(p.id)?'Quitar':'Destacar'}</button></div>`).join('')||'<p class="muted">No hay entradas publicadas.</p>'}</section>`;
  const ch=()=>{dirty=true;paintFavs()},mv=(id,dx)=>{const i=FV.pk.indexOf(id),j=i+dx;if(j<0||j>=FV.pk.length)return;[FV.pk[i],FV.pk[j]]=[FV.pk[j],FV.pk[i]];ch()};
  $('#fq').oninput=e=>{FV.q=e.target.value;const p=e.target.selectionStart;paintFavs();const n=$('#fq');n.focus();n.setSelectionRange(p,p)};
  v.onclick=async e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const D=b.dataset;
    if(D.up)mv(+D.up,-1);else if(D.dn)mv(+D.dn,1);else if(D.rm){FV.pk=FV.pk.filter(i=>i!==+D.rm);ch()}else if(D.add){FV.pk.push(+D.add);ch()}
    else if(D.po){const i=+D.po;FV.po=FV.po.includes(i)?FV.po.filter(x=>x!==i):[...FV.po,i];ch()}
    else if(b.id==='fsv'){try{await api('favorites','PUT',{packages:FV.pk,posts:FV.po});DATA.packages=DATA.posts=null;dirty=false;toast('Favoritos guardados: ya se ven en la portada');paintFavs()}catch{}}}}

/* Mapa de calor */
let HT={days:30,dev:'',path:''};
async function heat(){const v=$('#v');v.innerHTML=SK;let d;try{d=await api(`heat?days=${HT.days}${HT.dev?'&dev='+HT.dev:''}${HT.path?'&path='+encodeURIComponent(HT.path):''}`)}catch{return}
  const lab=p=>p==='/'?'Portada':p,devBtn=(k,t)=>`<button class="${HT.dev===k?'p':'s'}" data-dev="${k}">${t}</button>`;
  const head=`<div class="pagehead"><div><h2>Mapa de calor</h2><p class="muted">Hasta dónde baja la gente en cada página y en qué hace clic. Sirve para ver dónde se pierde el interés y qué secciones funcionan.</p></div></div>`;
  if(!d.pages.length){v.innerHTML=head+`<section class="card">${emptyBox('Todavía no hay datos.','La medición arranca con esta versión del sitio: en unas horas aparecen las primeras visitas.')}</section>`;return}
  if(!HT.path||!d.pages.some(p=>p.path===HT.path)){HT.path=d.pages[0].path;return heat()}
  const n=d.visits,S=[1,...d.reach.map(x=>n?x/n:0)],drops=S.slice(1).map((x,i)=>S[i]-x),mi=drops.indexOf(Math.max(...drops)),r=i=>Math.round(S[i]*100);
  const bars=d.reach.map((x,i)=>{const q=n?x/n:0,c=`hsl(${Math.round(q*120)},65%,46%)`;return `<div class="row" style="gap:10px;align-items:center;margin:3px 0;flex-wrap:nowrap"><span class="muted" style="width:44px;text-align:right;flex:none">${(i+1)*10}%</span><span style="flex:none;width:22px;height:22px;border-radius:5px;background:${c}"></span><div style="flex:1;background:#eef0f6;border-radius:5px;height:22px"><i style="display:block;height:22px;border-radius:5px;background:${c};width:${Math.round(q*100)}%;opacity:.85"></i></div><b style="width:46px;flex:none">${Math.round(q*100)}%</b></div>`}).join('');
  v.innerHTML=head+`<div class="row" style="margin-bottom:12px;align-items:center"><label style="margin:0">Página <select id="hp">${d.pages.map(p=>`<option value="${esc(p.path)}" ${p.path===HT.path?'selected':''}>${esc(lab(p.path))} (${num(p.visits)})</option>`).join('')}</select></label><div class="tb" data-devs>${devBtn('','Todos')}${devBtn('m','Celular')}${devBtn('d','Escritorio')}</div>${perBar(HT.days)}</div>
  ${statRow([[num(n),'visitas medidas'],[Math.round(S[5]*100)+'%','llegan a la mitad de la página'],[Math.round(S[10]*100)+'%','llegan hasta el final'],[Math.round(d.mobile_share*100)+'%','entran desde el celular']])}
  ${n<30?`<div class="notice">${ic('alert')}<span>Hay pocas visitas medidas (${n}): tomá estos números como orientativos hasta juntar más.</span></div>`:''}
  <section class="card"><h3>¿Hasta dónde llegan?</h3><p class="muted" style="margin:0 0 8px">Porcentaje de visitas que llegaron hasta cada punto de la página (verde = casi todos, rojo = casi nadie). ${S[mi]-S[mi+1]>0.05?`<b>Donde más gente se va: entre el ${mi*10}% y el ${(mi+1)*10}% de la página</b> (${r(mi)}% → ${r(mi+1)}%).`:'No hay una caída marcada: el interés se sostiene.'}</p>${bars}</section>
  <section class="card"><h3>En qué hacen clic</h3>${d.clicks.length?`<div style="overflow-x:auto"><table class="tb2"><thead><tr><th>Elemento (sección › tipo: texto)</th><th>Clics</th><th>% de las visitas</th></tr></thead><tbody>${d.clicks.map(c=>`<tr><td>${esc(c.target)}</td><td>${num(c.n)}</td><td>${n?(c.n/n*100).toFixed(1).replace('.',','):'—'}%</td></tr>`).join('')}</tbody></table></div>`:emptyBox('Todavía no hay clics registrados en esta página.')}
  <p class="muted" style="margin:8px 0 0"><small>Se mide un envío por visita, sin cookies ni datos personales. Quedan excluidos los bots y quienes tienen activada la opción “No rastrear”.</small></p></section>`;
  $('#hp').onchange=e=>{HT.path=e.target.value;heat()};
  $('[data-devs]').onclick=e=>{const b=e.target.closest('[data-dev]');if(b){HT.dev=b.dataset.dev;heat()}};
  $('[data-per]').onclick=e=>{const b=e.target.closest('[data-d]');if(b){HT.days=+b.dataset.d;heat()}}}

login();
addEventListener("error",e=>{if(!$("#tm"))toast("Error: "+esc(e.message))});

// Precio por cantidad: "Completar como 2x1" arma 1 a 10 personas con el Precio como precio de cada par (después se ajusta a mano).
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#f-qty-2x1');if(!b)return;
  const pr=($('[data-k="price"]')?.value||'').trim(),cur=(pr.match(/^[^\d]*/)||[''])[0].trim()||'R$',n=parseFloat(pr.replace(/[^\d,.]/g,'').replace(/\.(?=\d{3}\b)/g,'').replace(',','.'))||0;
  if(!n&&!((window.__gvOPT?window.__gvOPT():[]).some(o=>o.name.trim()&&o.price.trim()))){toast('Cargá primero el Precio (el de cada par de entradas) o las opciones con su precio.','err');return}
  const t=$('#f-qty'),num=x=>parseFloat(String(x||'').replace(/[^\d,.]/g,'').replace(/\.(?=\d{3}\b)/g,'').replace(',','.'))||0,rows=(c,v,o)=>Array.from({length:10},(_,i)=>(o?o+' | ':'')+(i+1)+' = '+c+' '+Math.round(Math.ceil((i+1)/2)*v).toLocaleString('es-AR'));
  // Con opciones: una tabla por opción, con el precio de cada una.
  const ops=(window.__gvOPT?window.__gvOPT():[]).filter(o=>o.name.trim()&&num(o.price));
  t.value=(ops.length?ops.flatMap(o=>rows((o.price.match(/^[^\d]*/)||[''])[0].trim()||cur,num(o.price),o.name.trim())):rows(cur,n,'')).join('\n');t.dispatchEvent(new Event('input',{bubbles:true}))});
