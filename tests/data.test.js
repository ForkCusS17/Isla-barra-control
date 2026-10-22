// Datos en el dispositivo: recordatorio de copia, espacio usado y aviso al 70 %, almacenamiento persistente,
// copias internas (restaurar, borrar, descargar), dos pestañas a la vez y aviso de iPhone sin instalar.
// Emulación de iPhone a 390 y 360 px; solo toques.
const {chromium,devices,NAME}=require('./env');const {noOverflow,wide,smallTargets,contrastFails}=require('./helpers');
const path=require('path'),fs=require('fs');const TMP=path.join(__dirname,'tmp')+path.sep;fs.mkdirSync(TMP,{recursive:true});
const [,,F,J]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const KEY='islaBarraControlMVP_v1';
const PHONE={...devices['iPhone 13'],acceptDownloads:true,reducedMotion:'reduce'},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
(async()=>{const b=await chromium.launch();const pages=[];
const watch=p=>{p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,120)));p.on('dialog',d=>{p.dl.push(d.type()+': '+d.message().slice(0,60));d.dismiss()});pages.push(p);return p};
const mk=async(dev=PHONE,init,arg)=>{const c=await b.newContext(dev);await c.clock.setFixedTime(new Date('2026-10-21T10:00:00Z'));if(init)await c.addInitScript(init,arg);const p=watch(await c.newPage());await p.goto(APP_URL);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0])});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').trim());
const MORE=['Ficha','Diagnóstico','Informe','Ajustes','Instalar la app'];
const nav=async(p,label)=>{if(MORE.includes(label)){await tap(p,'.mobile-nav button:has-text("Más")');await tap(p,`#page-more button:has-text("${label}")`)}else await tap(p,`.mobile-nav button:has-text("${label}")`)};
const ficha=async(p,name)=>{await nav(p,'Ficha');await p.fill('#bName',name);await tap(p,'#businessForm button:has-text("Guardar ficha")')};
const stored=p=>p.evaluate(k=>{try{return JSON.parse(localStorage.getItem(k)).business.name}catch(e){return null}},KEY);
const importTap=async(p,sel,file)=>{const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:4000}),tap(p,sel)]);await fc.setFiles(file);await p.locator('#importConfirm').waitFor({state:'visible',timeout:3000});await tap(p,'#importYes');await p.waitForTimeout(150)};
// Simula el navegador: persist() y persisted() con un resultado fijo y cuenta las peticiones.
const fakePersist=(granted)=>{if(!navigator.storage)return;window.__persistCalls=0;navigator.storage.persist=()=>{window.__persistCalls++;return Promise.resolve(granted)};navigator.storage.persisted=()=>Promise.resolve(granted)};

// ── 1. Recordatorio de copia ─────────────────────────────────────────────────
let p=await mk(PHONE,fakePersist,false);await tap(p,'#wStart');await tap(p,'#tplSkip');
ok('sin datos todavía: sin recordatorio de copia',!(await seen(p,'#backupNag')),null);
await ficha(p,'Bar Real');await nav(p,'Resumen');
ok('con datos y sin ninguna copia: recordatorio arriba del Resumen con «Exportar copia»',(await seen(p,'#backupNag'))&&/Haz una copia de seguridad/.test(await text(p,'#backupNag'))&&/Aún no has exportado ninguna/.test(await text(p,'#backupNag'))&&(await p.evaluate(()=>document.getElementById('backupNag').getBoundingClientRect().top<document.getElementById('dashMain').getBoundingClientRect().top)),null);
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}),tap(p,'#nagExport')]);
ok('«Exportar copia» desde el recordatorio descarga la copia y el aviso desaparece',/isla-barra-copia-2026-10-21\.json/.test(dl.suggestedFilename())&&!(await seen(p,'#backupNag')),dl.suggestedFilename());
{const q=await mk();await tap(q,'#wDemo');ok('con el bar de ejemplo no se pide copia',!(await seen(q,'#backupNag')),null)}

// ── 2. Almacenamiento persistente ────────────────────────────────────────────
ok('se pide almacenamiento persistente una vez, al guardar los primeros datos',(await p.evaluate(()=>window.__persistCalls))===1&&(await p.evaluate(k=>JSON.parse(localStorage.getItem(k+'_dispositivo')).persistAsked,KEY))===true,await p.evaluate(()=>window.__persistCalls));
await ficha(p,'Bar Real 2');ok('…y no se vuelve a pedir en cada guardado',(await p.evaluate(()=>window.__persistCalls))===1,null);
await nav(p,'Ajustes');
ok('Ajustes › Datos: «no concedido», explicado, con «Pedir almacenamiento persistente»',/no concedido/.test(await text(p,'#persistLine'))&&(await seen(p,'#persistAsk')),await text(p,'#persistLine'));
await tap(p,'#persistAsk');await p.waitForTimeout(100);
ok('el botón lo vuelve a pedir y explica la respuesta',(await p.evaluate(()=>window.__persistCalls))===2&&/no lo ha concedido/.test(await text(p,'#toast')),await text(p,'#toast'));
ok('iPhone sin instalar: Ajustes recuerda instalar la app (7 días de Safari)',/En iPhone, instala la app/.test(await text(p,'#persistLine'))&&/7 días/.test(await text(p,'#persistLine')),null);
{const q=await mk(PHONE,fakePersist,true);await tap(q,'#wStart');await tap(q,'#tplSkip');await nav(q,'Ajustes');ok('concedido: «Almacenamiento persistente: concedido» y sin botón',/concedido\./.test(await text(q,'#persistLine'))&&!/no concedido/.test(await text(q,'#persistLine'))&&!(await seen(q,'#persistAsk')),await text(q,'#persistLine'))}
{const q=await mk(PHONE,()=>{Object.defineProperty(Navigator.prototype,'storage',{get:()=>undefined})});await tap(q,'#wStart');await tap(q,'#tplSkip');await ficha(q,'X');await nav(q,'Ajustes');ok('navegador sin la función: lo dice y no falla',/no permite pedir almacenamiento persistente/.test(await text(q,'#persistLine'))&&!(await seen(q,'#persistAsk')),await text(q,'#persistLine'))}
{const q=await mk(PHONE,()=>{Object.defineProperty(Navigator.prototype,'standalone',{get:()=>true})});await tap(q,'#wStart');await tap(q,'#tplSkip');await nav(q,'Ajustes');ok('iPhone con la app instalada: sin ese aviso',!/En iPhone, instala la app/.test(await text(q,'#persistLine')),null)}

// ── 3. Espacio usado y aviso al 70 % ─────────────────────────────────────────
ok('Ajustes muestra cuánto ocupan los datos y el porcentaje (aprox. ~5 MB)',/Los datos de la app ocupan unos \d+ KB de los ~5 MB/.test(await text(p,'#storageUse'))&&/\(\d+ %\)/.test(await text(p,'#storageUse'))&&!/bad/.test(await p.getAttribute('#storageUse','class')),await text(p,'#storageUse'));
const big=JSON.stringify({business:{name:'Copia grande',notes:'x'.repeat(3700000)},drinks:[],stocks:[],diagnostics:[],ingredients:[]});
let g=await mk(PHONE,([k,v])=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem(k+'_antes_de_importar',v);localStorage.setItem(k,JSON.stringify({business:{name:'Bar lleno'},settings:{lastBackupAt:'2026-10-21T09:00:00Z'}}))},[KEY,big]);
ok('al pasar del 70 %: aviso en el Resumen con «Liberar espacio»',(await seen(g,'#storageNag'))&&/Queda poco espacio/.test(await text(g,'#storageNag'))&&/7\d %/.test(await text(g,'#storageNag')),await text(g,'#storageNag').catch(()=>''));
await tap(g,'#storageNagGo');
ok('«Liberar espacio» lleva a Ajustes › Datos, que lo marca y explica qué hacer',(await seen(g,'#storagePanel'))&&/bad/.test(await g.getAttribute('#storageUse','class'))&&/borra las copias internas/.test(await text(g,'#storageUse')),null);
await tap(g,'#copy_antes_de_importar button:has-text("Borrar")');await tap(g,'#appConfirmYes');
ok('borrar la copia interna grande libera espacio y quita el aviso; los datos no cambian',!(await seen(g,'#copy_antes_de_importar'))&&!/bad/.test(await g.getAttribute('#storageUse','class'))&&(await stored(g))==='Bar lleno',null);
await nav(g,'Resumen');ok('…y el Resumen ya no avisa',!(await seen(g,'#storageNag')),null);

// ── 4. Restaurar la copia interna ────────────────────────────────────────────
await nav(p,'Ajustes');ok('sin copias internas: lo dice',/No hay copias internas/.test(await text(p,'#internalCopies')),await text(p,'#internalCopies'));
await importTap(p,'#setImport',J);
ok('importar guarda antes una copia interna (fecha y contenido)',(await seen(p,'#copy_antes_de_importar'))&&/Antes de la última importación/.test(await text(p,'#copy_antes_de_importar'))&&/Guardada el 21\/10\/26/.test(await text(p,'#copy_antes_de_importar'))&&/0 ingredientes, 0 bebidas/.test(await text(p,'#copy_antes_de_importar')),await text(p,'#internalCopies'));
await tap(p,'#copy_antes_de_importar button:has-text("Restaurar")');
ok('«Restaurar» pide confirmación dentro de la página con lo que se sustituye',(await seen(p,'#appConfirm'))&&/Antes de la última importación/.test(await text(p,'#appConfirmText'))&&/19 ingredientes/.test(await text(p,'#appConfirmText')),await text(p,'#appConfirmText'));
await tap(p,'#appConfirmYes');
ok('restaurada: vuelven los datos de antes de importar',(await stored(p))==='Bar Real 2'&&(await p.evaluate(()=>data.ingredients.length))===0,await stored(p));
ok('lo que había (el bar importado) queda como «Antes de la última restauración»',/Antes de la última restauración/.test(await text(p,'#copy_antes_de_restaurar'))&&/19 ingredientes/.test(await text(p,'#copy_antes_de_restaurar')),await text(p,'#internalCopies'));
await tap(p,'#copy_antes_de_restaurar button:has-text("Restaurar")');await tap(p,'#appConfirmYes');
ok('…y se puede deshacer restaurando esa copia',(await p.evaluate(()=>data.ingredients.length))===19,null);
{const q=await mk(PHONE,k=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem(k+'_corrupta','{esto no es json');localStorage.setItem(k,JSON.stringify({business:{name:'Bar'}}))},KEY);await nav(q,'Ajustes');
 ok('datos dañados: se listan para descargar o borrar, sin «Restaurar»',/Datos dañados/.test(await text(q,'#copy_corrupta'))&&!(await seen(q,'#copy_corrupta button:has-text("Restaurar")'))&&(await seen(q,'#copy_corrupta button:has-text("Descargar")')),await text(q,'#internalCopies'));
 const [d2]=await Promise.all([q.waitForEvent('download',{timeout:5000}),tap(q,'#copy_corrupta button:has-text("Descargar")')]);const f2=TMP+'corrupta.json';await d2.saveAs(f2);
 ok('«Descargar» guarda el contenido tal cual',fs.readFileSync(f2,'utf8')==='{esto no es json',null)}

// ── 5. Dos pestañas a la vez ─────────────────────────────────────────────────
const c2=await b.newContext(PHONE);const a1=watch(await c2.newPage());await a1.goto(APP_URL);await tap(a1,'#wStart');await tap(a1,'#tplSkip');await ficha(a1,'A');
ok('con una sola pestaña no hay aviso',!(await seen(a1,'#tabWarn')),null);
const a2=watch(await c2.newPage());await a2.goto(APP_URL);await a2.waitForTimeout(300);
ok('dos pestañas: las dos avisan «La app está abierta en otra pestaña»',(await seen(a1,'#tabWarn'))&&(await seen(a2,'#tabWarn'))&&/otra pestaña o ventana/.test(await text(a2,'#tabWarn')),null);
await ficha(a1,'A2');await a2.waitForTimeout(300);
ok('si la otra pestaña guarda, esta avisa de que los datos han cambiado',(await seen(a2,'#tabConflict'))&&/han cambiado en otra pestaña/.test(await text(a2,'#tabConflict')),null);
await ficha(a2,'B');
ok('guardar en la pestaña desactualizada no pisa los datos: «Este cambio no se ha guardado»',/Este cambio no se ha guardado/.test(await text(a2,'#tabConflict'))&&(await stored(a2))==='A2',await stored(a2));
await Promise.all([a2.waitForEvent('load'),tap(a2,'#tabReload')]);
ok('«Cargar los datos más recientes» recarga con lo de la otra pestaña',(await a2.evaluate(()=>data.business.name))==='A2'&&!(await seen(a2,'#tabConflict')),null);
await ficha(a2,'C');ok('después ya guarda con normalidad',(await stored(a2))==='C',null);
await a1.waitForTimeout(300);await ficha(a1,'D');
ok('la primera pestaña tampoco pisa: avisa',/Este cambio no se ha guardado/.test(await text(a1,'#tabConflict'))&&(await stored(a1))==='C',null);
await tap(a1,'#tabKeep');ok('«Guardar lo de esta pestaña» pide confirmación',(await seen(a1,'#appConfirm'))&&/se sustituirán/.test(await text(a1,'#appConfirmText')),null);
await tap(a1,'#appConfirmYes');ok('…y guarda lo de esta pestaña',(await stored(a1))==='D'&&!(await seen(a1,'#tabConflict')),await stored(a1));
await a2.close();await a1.waitForTimeout(300);ok('al cerrar la otra pestaña desaparece el aviso',!(await seen(a1,'#tabWarn')),null);

// ── 6. Móvil a 390 y 360 px ──────────────────────────────────────────────────
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const z=await mk(dev,([k,v])=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem(k+'_antes_de_importar',v);localStorage.setItem(k+'_corrupta','{x');localStorage.setItem(k,JSON.stringify({business:{name:'Bar lleno'}}))},[KEY,big]);
 ok(`[${wd}] Resumen con recordatorio de copia y aviso de espacio sin desbordamiento`,(await seen(z,'#backupNag'))&&(await seen(z,'#storageNag'))&&await noOverflow(z),await wide(z));
 let sm=await smallTargets(z,'#backupNag,#storageNag');const cf=await contrastFails(z);
 await nav(z,'Ajustes');ok(`[${wd}] Ajustes › Datos sin desbordamiento`,await noOverflow(z),await wide(z));sm=sm.concat(await smallTargets(z,'#storagePanel'));cf.push(...await contrastFails(z));
 ok(`[${wd}] botones ≥ 44 px`,sm.length===0,sm);ok(`[${wd}] contraste ≥ 4,5:1`,cf.length===0,cf.slice(0,6))}

ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO datos (${NAME}): ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
