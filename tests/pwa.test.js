// App instalable y sin conexión: manifiesto, iconos, service worker, aviso de versión nueva sin perder datos
// y guía «Añadir a pantalla de inicio» (iPhone y Android). Solo toques; sirve la app con su propio servidor
// para simular versiones nuevas sin tocar el disco.
const {chromium,devices,NAME}=require('./env');const {start}=require('./server');const {restamp}=require('../tools/stamp');const {noOverflow,wide,smallTargets,contrastFails}=require('./helpers');
const fs=require('fs'),path=require('path');const T=[];const ok=(n,c,x)=>{T.push([!!c,n,c?'':JSON.stringify(x)]);console.log('· '+(c?'ok ':'MAL ')+n)};/* progreso visible si la serie se corta */
const PHONE={...devices['iPhone 13'],reducedMotion:'reduce'},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}},ANDROID={...devices['Pixel 7'],reducedMotion:'reduce'};
// APP_ROOT=publicar: la misma serie, sirviendo solo la carpeta de publicación (como la recibiría el alojamiento).
const ROOT=process.env.APP_ROOT||'',DIR=path.join(__dirname,'..',ROOT),TAG=ROOT?' · '+ROOT+'/':'';
const HTML=fs.readFileSync(path.join(DIR,'isla_barra_control_mvp.html'),'utf8'),SW=fs.readFileSync(path.join(DIR,'sw.js'),'utf8');
const CUR=HTML.match(/APP_VERSION='([^']+)'/)[1];/* versión publicada; las pruebas simulan la siguiente */
const pngSize=b=>[b.readUInt32BE(16),b.readUInt32BE(20)];
(async()=>{const srv=await start({root:ROOT});const APP=srv.base+'isla_barra_control_mvp.html';const b=await chromium.launch();const pages=[];
const mk=async(dev=PHONE,init)=>{const c=await b.newContext(dev);if(init)await c.addInitScript(init);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,120)));p.on('dialog',d=>{p.dl.push(d.type());d.dismiss()});if(ROOT){p.on('console',m=>{if(m.type()==='error')p.errs.push('consola: '+m.text().slice(0,120))});p.on('response',r=>{if(r.status()>=400)p.errs.push(r.status()+' '+r.url())})}await p.goto(APP);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:8000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0]+' | '+e.message.split('\n').slice(-6).join(' / ').slice(0,700))});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').trim());
const D=p=>p.evaluate(()=>({i:data.ingredients.length,d:data.drinks.length,demo:!!data.business.isDemo}));
const swReady=p=>p.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
const nav=async(p,label)=>{if(['Instalar la app'].includes(label)){await tap(p,'.mobile-nav button:has-text("Más")');await tap(p,`#page-more button:has-text("${label}")`)}else await tap(p,`.mobile-nav button:has-text("${label}")`)};

// ── 1. Manifiesto e iconos ───────────────────────────────────────────────────
let p=await mk();
if(ROOT){const files=(d=>{const l=x=>fs.readdirSync(x,{withFileTypes:true}).flatMap(e=>e.isDirectory()?l(path.join(x,e.name)).map(y=>e.name+'/'+y):[e.name]);return l(d).sort()})(DIR);
 ok('publicar/ lleva solo lo necesario (index.html, la app, sw.js, manifiesto, iconos y _headers)',JSON.stringify(files)===JSON.stringify(['_headers','icons/apple-touch-icon.png','icons/favicon-32.png','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','index.html','isla_barra_control_mvp.html','manifest.webmanifest','sw.js']),files);
 const h=(await p.request.get(APP)).headers();ok('se aplican las cabeceras de _headers (CSP, nosniff, sin incrustar)',/frame-ancestors 'none'/.test(h['content-security-policy']||'')&&h['x-content-type-options']==='nosniff'&&h['x-frame-options']==='DENY',h);
 const r=await mk();await r.goto(srv.base);await r.waitForURL(/isla_barra_control_mvp\.html$/,{timeout:8000}).catch(()=>{});ok('la dirección raíz (index.html) abre la app',/isla_barra_control_mvp\.html$/.test(r.url())&&(await seen(r,'#welcome')),r.url())}
const man=await (await p.request.get(srv.base+'manifest.webmanifest')).json();
ok('el HTML enlaza el manifiesto, el icono de iPhone y el favicon',await p.evaluate(()=>!!document.querySelector('link[rel=manifest][href="manifest.webmanifest"]')&&!!document.querySelector('link[rel=apple-touch-icon]')&&!!document.querySelector('link[rel=icon]')),null);
ok('manifiesto: nombre, inicio en la app, pantalla completa y colores de la marca',man.name==='Isla & Barra Control'&&man.short_name==='Isla & Barra'&&new URL(man.start_url,srv.base).href===APP&&man.display==='standalone'&&man.theme_color==='#0E4A5A'&&man.background_color==='#F6F1E8'&&man.lang==='es',man);
const icons=[...man.icons.map(i=>[i.src,+i.sizes.split('x')[0]]),['icons/apple-touch-icon.png',180],['icons/favicon-32.png',32]];const isz=[];
for(const [src,n] of icons){const r=await p.request.get(srv.base+src);const s=pngSize(await r.body());isz.push([src,r.status(),r.headers()['content-type'],s.join('x'),n])}
ok('iconos 192, 512, «maskable» 512, iPhone 180 y favicon 32: existen, son PNG y tienen su tamaño',isz.every(([,st,ct,s,n])=>st===200&&ct==='image/png'&&s===n+'x'+n)&&man.icons.some(i=>i.purpose==='maskable'),isz);

// ── 2. Sin conexión ──────────────────────────────────────────────────────────
ok('se registra el service worker',await swReady(p),null);
await p.waitForTimeout(500);ok('primera visita: no aparece «Hay una versión nueva» (no hay nada nuevo)',!(await seen(p,'#updateBar')),null);
await tap(p,'#wDemo');const before=await D(p);
await p.reload();ok('tras recargar, la página la controla el service worker',await p.evaluate(()=>!!navigator.serviceWorker.controller),null);
await p.context().setOffline(true);srv.ctl.offline=true;await p.reload();
ok('sin conexión la app se abre con sus datos (bar de ejemplo)',(await seen(p,'#page-dashboard'))&&(await seen(p,'#demoBadge'))&&JSON.stringify(await D(p))===JSON.stringify(before),[await D(p),before]);
await tap(p,'.mobile-nav button:has-text("Carta")');ok('sin conexión se navega (Mi carta)',await seen(p,'#page-drinks'),null);
await p.context().setOffline(false);srv.ctl.offline=false;

// ── 3. Versión nueva del HTML ────────────────────────────────────────────────
{const r=restamp(HTML.replace(`APP_VERSION='${CUR}'`,"APP_VERSION='9.9.1'"));srv.override['isla_barra_control_mvp.html']={body:r.html,headers:{'Content-Security-Policy':r.csp}}}
await p.reload();
ok('al publicar una versión nueva se sigue abriendo la que hay en el dispositivo',(await p.evaluate(()=>APP_VERSION))===CUR,null);
await p.locator('#updateBar').waitFor({state:'visible',timeout:8000}).catch(()=>{});
ok('aviso «Hay una versión nueva» (y que los datos se conservan)',/Hay una versión nueva/.test(await text(p,'#updateBar'))&&/datos se conservan/.test(await text(p,'#updateBar')),null);
await Promise.all([p.waitForEvent('load'),tap(p,'#updateNow')]);
ok('«Actualizar» recarga con la versión nueva',(await p.evaluate(()=>APP_VERSION))==='9.9.1',null);
ok('…sin perder datos',JSON.stringify(await D(p))===JSON.stringify(before)&&(await seen(p,'#demoBadge')),await D(p));
ok('después de actualizar no vuelve a avisar',!(await seen(p,'#updateBar')),null);

// ── 4. Versión nueva del service worker ─────────────────────────────────────
srv.override['sw.js']=SW.replace(`const VERSION='${CUR}'`,"const VERSION='9.9.2'");
await p.reload();await p.locator('#updateBar').waitFor({state:'visible',timeout:10000}).catch(()=>{});
ok('service worker nuevo: también avisa «Hay una versión nueva»',await seen(p,'#updateBar'),null);
await Promise.all([p.waitForEvent('load',{timeout:10000}),tap(p,'#updateNow')]);
const keys=await p.evaluate(()=>caches.keys());
ok('«Actualizar» activa el nuevo y borra la caché anterior',keys.includes('isla-barra-app-9.9.2')&&!keys.includes('isla-barra-app-'+CUR),keys);
ok('…y los datos siguen ahí',JSON.stringify(await D(p))===JSON.stringify(before),await D(p));
delete srv.override['sw.js'];delete srv.override['isla_barra_control_mvp.html'];

// ── 4b. Dirección sin «.html» (Netlify puede servir la app en /isla_barra_control_mvp) ──
{const HT={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}/* sin caché HTTP: sin conexión solo puede responder el service worker */,app=(v)=>{if(!v)return{body:HTML,headers:HT};const r=restamp(HTML.replace(`APP_VERSION='${CUR}'`,`APP_VERSION='${v}'`));return{body:r.html,headers:{...HT,'Content-Security-Policy':r.csp}}};
 const BARE=srv.base+'isla_barra_control_mvp';
 const run=async(label,redirect)=>{
  srv.override['isla_barra_control_mvp']=app();if(redirect)srv.override['isla_barra_control_mvp.html']={status:301,headers:{Location:'/isla_barra_control_mvp'}};else delete srv.override['isla_barra_control_mvp.html'];
  const q=await mk();await q.goto(BARE);ok(`${label}: la app se abre en /isla_barra_control_mvp y registra el service worker`,(await seen(q,'#welcome'))&&(await swReady(q)),q.url());
  await tap(q,'#wDemo');const before=await D(q);await q.waitForTimeout(300);await q.reload();
  ok(`${label}: tras recargar, la controla el service worker`,await q.evaluate(()=>!!navigator.serviceWorker.controller),null);
  await q.context().setOffline(true);srv.ctl.offline=true;const off=await q.reload();
  ok(`${label}: sin conexión se abre desde la caché del service worker con sus datos`,!!off&&off.fromServiceWorker()&&(await seen(q,'#demoBadge'))&&JSON.stringify(await D(q))===JSON.stringify(before),[await D(q),before]);
  const offH=await q.goto(srv.base+'isla_barra_control_mvp.html');
  ok(`${label}: sin conexión también se abre la dirección con «.html» (la de inicio del manifiesto), con los mismos datos`,!!offH&&offH.fromServiceWorker()&&(await seen(q,'#demoBadge'))&&JSON.stringify(await D(q))===JSON.stringify(before),null);
  await q.goto(BARE);await q.context().setOffline(false);srv.ctl.offline=false;
  const nv=redirect?'9.9.4':'9.9.3';srv.override['isla_barra_control_mvp']=app(nv);if(!redirect)srv.override['isla_barra_control_mvp.html']=app(nv);
  await q.reload();await q.locator('#updateBar').waitFor({state:'visible',timeout:8000}).catch(()=>{});
  ok(`${label}: con una versión nueva sigue abriendo la guardada y avisa «Hay una versión nueva»`,(await q.evaluate(()=>APP_VERSION))===CUR&&(await seen(q,'#updateBar')),await q.evaluate(()=>APP_VERSION));
  await Promise.all([q.waitForEvent('load'),tap(q,'#updateNow')]);
  ok(`${label}: «Actualizar» carga la nueva sin perder datos`,(await q.evaluate(()=>APP_VERSION))===nv&&JSON.stringify(await D(q))===JSON.stringify(before),await q.evaluate(()=>APP_VERSION));
  ok(`${label}: sin errores de JavaScript`,q.errs.length===0,q.errs);
  delete srv.override['isla_barra_control_mvp'];delete srv.override['isla_barra_control_mvp.html']};
 await run('sin «.html»',false);
 await run('«.html» redirigida a la dirección sin «.html» (URL bonitas de Netlify)',true);
 const mf=await (await p.request.get(srv.base+'manifest.webmanifest')).json();ok('el manifiesto sigue empezando en la app (start_url e id con «.html», que el service worker reconoce)',/isla_barra_control_mvp\.html$/.test(mf.start_url)&&/isla_barra_control_mvp\.html$/.test(mf.id),mf.start_url)}

// ── 5. Guía «Añadir a pantalla de inicio»: iPhone ────────────────────────────
const t0=new Date('2026-10-21T10:00:00Z');
let i=await mk(PHONE,null);await i.context().clock.setFixedTime(t0);await i.reload();
ok('iPhone sin instalar: aviso en el Resumen con el motivo (7 días sin abrir en Safari)',(await seen(i,'#installCard'))&&/7 días/.test(await text(i,'#installCard'))&&/pantalla de inicio/.test(await text(i,'#installCard')),await text(i,'#installCard').catch(()=>''));
await tap(i,'#installHow');
ok('«Cómo instalarla» abre la guía con los pasos de iPhone primero («Tu dispositivo»)',(await seen(i,'#page-install'))&&/Tu dispositivo/.test(await text(i,'#installIos'))&&/Compartir/.test(await text(i,'#installIos'))&&/Añadir a pantalla de inicio/.test(await text(i,'#installIos'))&&(await i.locator('#installBody .install-os').first().getAttribute('id'))==='installIos',null);
ok('la guía también explica Android y por qué instalarla',/Instalar aplicación/.test(await text(i,'#installAndroid'))&&/7 días/.test(await text(i,'#installBody')),null);
await tap(i,'#installBack');await tap(i,'#installLater');
ok('«Ahora no» oculta el aviso',!(await seen(i,'#installCard')),null);
await i.reload();ok('…también al volver a abrir la app',!(await seen(i,'#installCard')),null);
await i.context().clock.setFixedTime(new Date(t0.getTime()+8*864e5));await i.reload();
ok('en iPhone vuelve a avisar pasada una semana',await seen(i,'#installCard'),null);
await nav(i,'Instalar la app');ok('la guía está siempre en Más › Instalar la app',await seen(i,'#page-install'),null);
let st=await mk(PHONE,()=>{Object.defineProperty(Navigator.prototype,'standalone',{get:()=>true})});
ok('instalada (abierta desde el icono): sin aviso',!(await seen(st,'#installCard')),null);
await nav(st,'Instalar la app');ok('…y la guía dice que ya está instalada',/Ya la estás usando instalada/.test(await text(st,'#installBody')),null);

// ── 6. Android ───────────────────────────────────────────────────────────────
let a=await mk(ANDROID);
ok('Android sin instalar: aviso sin el motivo de iPhone y con «Cómo instalarla»',(await seen(a,'#installCard'))&&/Instala la app en tu móvil/.test(await text(a,'#installCard'))&&!/7 días/.test(await text(a,'#installCard'))&&!(await seen(a,'#installNow')),await text(a,'#installCard').catch(()=>''));
await a.evaluate(()=>{const e=new Event('beforeinstallprompt');e.prompt=()=>{window.__prompted=(window.__prompted||0)+1};e.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(e)});
ok('cuando el navegador ofrece instalar, aparece el botón «Instalar»',await seen(a,'#installNow'),null);
await tap(a,'#installNow');await a.waitForTimeout(100);
ok('«Instalar» abre el diálogo de instalación del navegador',(await a.evaluate(()=>window.__prompted))===1&&/Instalando/.test(await text(a,'#toast')),null);
await nav(a,'Instalar la app');ok('Android: la guía muestra primero los pasos de Android',(await a.locator('#installBody .install-os').first().getAttribute('id'))==='installAndroid'&&/Tu dispositivo/.test(await text(a,'#installAndroid')),null);
let dk=await mk({viewport:{width:1280,height:900},reducedMotion:'reduce'});
ok('ordenador: sin aviso de instalación en el Resumen',!(await seen(dk,'#installCard')),null);

// ── 7. Móvil a 390 y 360 px ──────────────────────────────────────────────────
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const z=await mk(dev);await tap(z,'#wDemo');
 ok(`[${wd}] Resumen con aviso de instalación sin desbordamiento`,(await seen(z,'#installCard'))&&await noOverflow(z),await wide(z));
 let sm=await smallTargets(z,'#installCard');await z.evaluate(()=>showUpdate());sm=sm.concat(await smallTargets(z,'#updateBar'));
 ok(`[${wd}] aviso de versión sin desbordamiento`,await noOverflow(z),await wide(z));
 const cf=await contrastFails(z);await tap(z,'#updateLater');ok(`[${wd}] «Más tarde» cierra el aviso de versión`,!(await seen(z,'#updateBar')),null);
 await nav(z,'Instalar la app');sm=sm.concat(await smallTargets(z,'#page-install'));cf.push(...await contrastFails(z));
 ok(`[${wd}] guía de instalación sin desbordamiento`,await noOverflow(z),await wide(z));
 ok(`[${wd}] botones ≥ 44 px (aviso, versión nueva y guía)`,sm.length===0,sm);
 ok(`[${wd}] contraste ≥ 4,5:1`,cf.length===0,cf.slice(0,6))}

ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO instalable (${NAME}${TAG}): ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close();srv.server.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
