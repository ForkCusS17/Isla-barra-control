// «Acerca de»: versión y fecha, novedades, «Enviar comentario» (sin datos del usuario), preguntas frecuentes y
// avisos legales provisionales. Emulación de iPhone a 390 y 360 px; solo toques.
const {chromium,devices,NAME}=require('./env');const {noOverflow,wide,smallTargets,contrastFails}=require('./helpers');
const path=require('path'),fs=require('fs');const ROOT=path.join(__dirname,'..');
const [,,F]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const PHONE={...devices['iPhone 13'],reducedMotion:'reduce'},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
const PKG=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).version,SWV=(fs.readFileSync(path.join(ROOT,'sw.js'),'utf8').match(/const VERSION='([^']+)'/)||[])[1];
(async()=>{const b=await chromium.launch();const pages=[];
const mk=async(dev=PHONE)=>{const c=await b.newContext(dev);await c.clock.setFixedTime(new Date('2026-10-21T10:00:00Z'));const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,120)));p.on('dialog',d=>{p.dl.push(d.type());d.dismiss()});await p.goto(APP_URL);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0]+' | '+e.message.split('\n').filter(l=>/intercepts|not visible|not stable|outside of the viewport|not enabled|detached/.test(l)).slice(-2).join(' / ').slice(0,400))});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').trim());
const openD=async(p,id)=>{if(await p.locator(id).getAttribute('open')===null)await tap(p,id+' summary')};

let p=await mk();await tap(p,'#wDemo');
const V=await p.evaluate(()=>[APP_VERSION,APP_DATE]);
ok('una sola versión: la app, package.json y el service worker dicen lo mismo',V[0]===PKG&&V[0]===SWV,[V[0],PKG,SWV]);
await tap(p,'#footAbout');ok('el pie del Resumen enlaza a «Acerca de» con la versión',(await seen(p,'#page-about')),null);
await tap(p,'.mobile-nav button:has-text("Resumen")');await tap(p,'.mobile-nav button:has-text("Más")');await tap(p,'#page-more button:has-text("Acerca de")');
ok('Más › Acerca de: versión y fecha visibles',(await seen(p,'#page-about'))&&new RegExp('Versión '+V[0].replace(/\./g,'\\.')+' \\(beta\\) · 23 de octubre de 2026').test(await text(p,'#aboutVersion')),await text(p,'#aboutVersion'));
ok('la pestaña «Más» queda marcada',(await p.locator('.mobile-nav button[aria-current="page"]').innerText()).includes('Más'),null);
ok('novedades de la versión actual',/0\.2\.0 · 23 de octubre de 2026/.test(await text(p,'#aboutNews'))&&(await p.locator('#aboutNews li').count())>=3,await text(p,'#aboutNews'));
const href=await p.getAttribute('#feedbackBtn','href');const q=new URL(href);const body=decodeURIComponent(href.split('body=')[1]||'');const ua=await p.evaluate(()=>navigator.userAgent);
ok('«Enviar comentario» abre un correo con asunto, versión y navegador',q.protocol==='mailto:'&&new RegExp('Isla & Barra Control '+V[0].replace(/\./g,'\\.')).test(decodeURIComponent(href.split('subject=')[1].split('&')[0]))&&body.includes('Versión: '+V[0])&&body.includes('Navegador: '+ua)&&/Instalada: no/.test(body),body);
const D=await p.evaluate(()=>[data.business.name,...data.ingredients.slice(0,5).map(i=>i.name),...data.drinks.slice(0,5).map(d=>d.name)]);
ok('…sin ningún dato del usuario (ni el bar ni sus productos ni bebidas)',D.every(x=>!decodeURIComponent(href).includes(x)),D.filter(x=>decodeURIComponent(href).includes(x)));
ok('sin destinatario configurado, lo dice',/Escribe la dirección de destino/.test(await text(p,'#feedbackTo')),null);
for(const [id,re] of [['#faqData',/Solo en este dispositivo/],['#faqBackup',/Exportar copia/],['#faqMove',/Importar/],['#faqOffline',/sin conexión|versión nueva/]]){await openD(p,id);ok(`pregunta frecuente ${id}: se abre con un toque y responde`,re.test(await text(p,id)),await text(p,id))}
for(const id of ['#legalNotice','#legalPrivacy','#legalTerms']){await openD(p,id);ok(`aviso ${id}: texto provisional marcado como pendiente de revisión`,/Texto provisional · pendiente de revisión/.test(await text(p,id)),null)}
ok('privacidad: sin cuentas, servidor, cookies ni analítica',/no tiene cuentas, ni servidor propio, ni cookies, ni analítica/.test(await text(p,'#legalPrivacy')),null);
ok('condiciones: margen bruto no es beneficio y la desviación no demuestra pérdidas',/no son beneficio/.test(await text(p,'#legalTerms'))&&/no demuestra pérdidas/.test(await text(p,'#legalTerms')),null);
{const d=await mk({viewport:{width:1280,height:900},reducedMotion:'reduce'});await d.locator('#sideNav button:has-text("Acerca de")').click();ok('ordenador: «Acerca de» en el menú lateral',await seen(d,'#page-about'),null)}
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const z=await mk(dev);await tap(z,'.mobile-nav button:has-text("Más")');await tap(z,'#page-more button:has-text("Acerca de")');for(const id of ['#faqData','#faqMove','#legalPrivacy','#legalTerms'])await openD(z,id);
 ok(`[${wd}] Acerca de sin desbordamiento`,await noOverflow(z),await wide(z));const sm=await smallTargets(z,'#page-about');ok(`[${wd}] botones y preguntas ≥ 44 px`,sm.length===0,sm);const cf=await contrastFails(z);ok(`[${wd}] contraste ≥ 4,5:1`,cf.length===0,cf.slice(0,6))}
ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO acerca de (${NAME}): ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
