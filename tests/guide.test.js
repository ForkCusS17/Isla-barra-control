// Primer uso y orientación: emulación de móvil (390 y 360 px) y solo toques; no se llaman funciones de la app.
const {chromium,devices}=require('playwright');const path=require('path');const fs=require('fs');const TMP=path.join(__dirname,'tmp')+path.sep;fs.mkdirSync(TMP,{recursive:true});const [,,F,J]=process.argv;const T=[];
const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const KEY='islaBarraControlMVP_v1',DEMO=JSON.parse(fs.readFileSync(J,'utf8'));
const PHONE={...devices['iPhone 13'],acceptDownloads:true},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
(async()=>{const b=await chromium.launch();const pages=[];
const mk=async(dev=PHONE,seed)=>{const c=await b.newContext(dev);await c.addInitScript(()=>{window.print=()=>{window.__prints=(window.__prints||0)+1}});if(seed)await c.addInitScript(([k,s])=>{if(!sessionStorage.seeded){sessionStorage.seeded=1;localStorage.setItem(k,s)}},[KEY,JSON.stringify(seed)]);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,120)));p.on('dialog',d=>{p.dl.push(d.type()+': '+d.message().slice(0,60));d.dismiss()});await p.goto('file://'+F);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).first().innerText().then(t=>t.replace(/\s+/g,' ').trim());
const D=p=>p.evaluate(()=>JSON.parse(JSON.stringify(data)));
const stored=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
const wide=p=>p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);
const noOverflow=async p=>{const w=await wide(p);return w[0]<=w[1]+1};
const nav=(p,label)=>tap(p,`.mobile-nav button:has-text("${label}")`);
const box=async(p,sel)=>(await p.locator(sel).filter({visible:true}).first().boundingBox())||{width:0,height:0};

// ── 1. Primer uso y bar de ejemplo ───────────────────────────────────────────
let p=await mk();
ok('primer uso: se ve la bienvenida y no el panel normal',await seen(p,'#welcome')&&!(await seen(p,'#dashMain')),null);
ok('primer uso: tres opciones (ejemplo, mi bar, recuperar copia) con objetivo táctil ≥ 44 px',(await Promise.all(['#wDemo','#wStart','#wRestore'].map(s=>box(p,s)))).every(r=>r.height>=44&&r.width>=44),null);
for(const [dev,w] of [[PHONE,390],[SMALL,360]]){const q=dev===PHONE?p:await mk(SMALL);ok(`bienvenida sin desbordamiento a ${w} px`,await noOverflow(q),await wide(q))}
await tap(p,'#wDemo');
let d=await D(p);
ok('«Probar con un bar de ejemplo» carga el bar ficticio embebido (= data/isla_barra_demo_bar_atlantico.json)',d.business.isDemo===true&&d.drinks.length===DEMO.drinks.length&&d.ingredients.length===DEMO.ingredients.length&&d.stocks.length===DEMO.stocks.length&&d.business.name===DEMO.business.name,{n:d.drinks.length,demo:d.business.isDemo});
ok('con el ejemplo: «Datos de ejemplo» en la cabecera y aviso con «Empezar con mis datos»',(await seen(p,'header #demoBadge'))&&(await text(p,'#demoBadge'))==='Datos de ejemplo'&&(await seen(p,'#demoNotice'))&&(await seen(p,'#demoExit')),null);
ok('con el ejemplo: ningún diálogo del navegador',p.dl.length===0,p.dl);
for(const [dev,w] of [[PHONE,390],[SMALL,360]]){const q=dev===PHONE?p:await mk(SMALL);if(q!==p)await tap(q,'#wDemo');ok(`Resumen con el ejemplo sin desbordamiento a ${w} px`,await noOverflow(q),await wide(q))}
await tap(p,'#demoExit');
ok('«Empezar con mis datos» pide confirmación en la página (se empieza vacío)',await seen(p,'#appConfirm')&&/ficha vacía/.test(await text(p,'#appConfirmText')),await text(p,'#appConfirmText'));
await tap(p,'#appConfirmNo');
ok('«Cancelar» no borra el ejemplo',(await D(p)).business.isDemo===true&&!(await seen(p,'#appConfirm')),null);
await tap(p,'#demoExit');await tap(p,'#appConfirmYes');d=await D(p);
ok('confirmar borra el ejemplo: sin datos, sin «Datos de ejemplo» y abre la ficha',!d.business.isDemo&&d.drinks.length+d.ingredients.length+d.stocks.length+d.diagnostics.length+d.sales.length===0&&!d.business.name&&!(await seen(p,'#demoBadge'))&&await seen(p,'#page-business'),{demo:d.business.isDemo,n:d.drinks.length});
await nav(p,'Resumen');
ok('tras salir del ejemplo no vuelve la bienvenida (ya se empezó)',!(await seen(p,'#welcome'))&&await seen(p,'#dashMain'),null);
// con datos reales: el ejemplo exige confirmación y copia interna, y al salir vuelven los datos
let r=await mk();await tap(r,'#wStart');
ok('«Empezar con mi bar» abre la ficha',await seen(r,'#page-business'),null);
await r.fill('#bName','Bar Real');await tap(r,'#businessForm button:has-text("Guardar ficha")');
await nav(r,'Resumen');await tap(r,'#dashDemo');
ok('con datos reales, ver el ejemplo pide confirmación y menciona la copia interna',await seen(r,'#appConfirm')&&/copia interna/.test(await text(r,'#appConfirmText'))&&(await D(r)).business.name==='Bar Real',await text(r,'#appConfirmText'));
await tap(r,'#appConfirmYes');d=await D(r);const copy=JSON.parse(await stored(r,KEY+'_antes_del_ejemplo')||'null');
ok('al confirmar: copia interna con los datos reales y el ejemplo los sustituye por completo (sin mezclar)',copy&&copy.business.name==='Bar Real'&&d.business.isDemo&&d.business.name===DEMO.business.name&&d.drinks.length===DEMO.drinks.length,{copy:copy&&copy.business.name,now:d.business.name});
await tap(r,'#demoExit');
ok('al salir del ejemplo avisa de que vuelven tus datos',/Volverán tus datos/.test(await text(r,'#appConfirmText')),await text(r,'#appConfirmText'));
await tap(r,'#appConfirmYes');d=await D(r);
ok('salir del ejemplo restaura los datos reales y borra la copia interna',d.business.name==='Bar Real'&&!d.business.isDemo&&d.drinks.length===0&&(await stored(r,KEY+'_antes_del_ejemplo'))===null,{name:d.business.name,demo:d.business.isDemo});
await r.reload();ok('tras recargar siguen los datos reales sin rastro del ejemplo',(await D(r)).business.name==='Bar Real'&&!(await seen(r,'#demoBadge')),null);

// FIN
ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO guía: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
