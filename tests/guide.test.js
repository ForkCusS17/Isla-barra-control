// Primer uso y orientación: emulación de móvil (390 y 360 px) y solo toques; no se llaman funciones de la app.
const {chromium,devices}=require('playwright');const path=require('path');const fs=require('fs');const TMP=path.join(__dirname,'tmp')+path.sep;fs.mkdirSync(TMP,{recursive:true});const [,,F,J]=process.argv;const T=[];
const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const KEY='islaBarraControlMVP_v1',DEMO=JSON.parse(fs.readFileSync(J,'utf8'));
const PHONE={...devices['iPhone 13'],acceptDownloads:true},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
(async()=>{const b=await chromium.launch();const pages=[];
const mk=async(dev=PHONE,seed)=>{const c=await b.newContext(dev);await c.clock.setFixedTime(new Date('2026-10-21T10:00:00Z'));await c.addInitScript(()=>{window.print=()=>{window.__prints=(window.__prints||0)+1}});if(seed)await c.addInitScript(([k,s])=>{if(!sessionStorage.seeded){sessionStorage.seeded=1;localStorage.setItem(k,s)}},[KEY,JSON.stringify(seed)]);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,120)));p.on('dialog',d=>{p.dl.push(d.type()+': '+d.message().slice(0,60));d.dismiss()});await p.goto('file://'+F);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error("toque en "+sel+": "+e.message.split("\n")[0])});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).first().innerText().then(t=>t.replace(/\s+/g,' ').trim());
const D=p=>p.evaluate(()=>JSON.parse(JSON.stringify(data)));
const stored=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
const wide=p=>p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);
const noOverflow=async p=>{const w=await wide(p);return w[0]<=w[1]+1};
const nav=(p,label)=>tap(p,`.mobile-nav button:has-text("${label}")`);
const importTap=async(p,sel,file)=>{const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:4000}),tap(p,sel)]);await fc.setFiles(file);await p.locator('#importConfirm').waitFor({state:'visible',timeout:3000});await tap(p,'#importYes');await p.waitForTimeout(150)};
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

// ── 2. Guía de inicio ────────────────────────────────────────────────────────
let g=await mk();await tap(g,'#wStart');await nav(g,'Resumen');
const gcount=async()=>text(g,'#guideCount');
ok('guía: empieza en «0 de 6» con barra de progreso y el primer paso destacado (Ficha)',(await gcount())==='0 de 6'&&(await g.locator('#guidePanel [role=progressbar]').getAttribute('aria-valuenow'))==='0'&&/Siguiente: Ficha completa/.test(await text(g,'#guideNext'))&&/Por qué:/.test(await text(g,'#guideNext')),await text(g,'#guidePanel'));
await tap(g,'#guideGo');ok('guía: «Continuar» lleva a la Ficha',await seen(g,'#page-business'),null);
await g.fill('#bName','Bar Guía');await tap(g,'#businessForm button:has-text("Guardar ficha")');await nav(g,'Resumen');
ok('guía: con nombre pero sin localidad ni periodo la ficha no cuenta y dice qué falta',(await gcount())==='0 de 6'&&/Falta: localidad, periodo analizado/.test(await text(g,'#guideNext')),await text(g,'#guideNext'));
await tap(g,'#guideGo');await g.fill('#bLocation','Arrecife');await g.fill('#bPeriod','1–7 nov');await tap(g,'#businessForm button:has-text("Guardar ficha")');await nav(g,'Resumen');
ok('guía: ficha completa → «1 de 6», chip «✓ Ficha completa» y siguiente: ingredientes',(await gcount())==='1 de 6'&&/✓ Ficha completa/.test(await text(g,'#guidePanel .chips'))&&/Siguiente: 5 ingredientes con precio/.test(await text(g,'#guideNext')),await text(g,'#guidePanel'));
await tap(g,'#guideGo');ok('guía: «Continuar» lleva a Ingredientes',await seen(g,'#page-ingredients'),null);
const addI=async(n,q,pr)=>{await g.fill('#iName',n);await g.selectOption('#iUnit','ml');await g.fill('#iPackQty',String(q));await g.fill('#iPackPrice',String(pr));await tap(g,'#ingredientForm button:has-text("Guardar ingrediente")')};
for(const [n,pr] of [['Ron',14],['Ginebra',16],['Vodka',12],['Tequila',18]])await addI(n,700,pr);await addI('Sirope',1000,0);
await nav(g,'Resumen');ok('guía: 4 con precio y 1 sin precio → sigue en ingredientes («Tienes 4 de 5»)',(await gcount())==='1 de 6'&&/Tienes 4 de 5/.test(await text(g,'#guideNext')),await text(g,'#guideNext'));
await nav(g,'Ingredientes');await addI('Zumo de lima',1000,4.5);await nav(g,'Resumen');
ok('guía: 5 ingredientes con precio → «2 de 6» y siguiente: bebidas',(await gcount())==='2 de 6'&&/Siguiente: 3 bebidas con receta/.test(await text(g,'#guideNext')),await text(g,'#guidePanel'));
await tap(g,'#guideHide');ok('guía: «Ocultar la guía» la oculta y deja un botón para mostrarla con el progreso',!(await seen(g,'#guideNext'))&&/Mostrar la guía de inicio \(2 de 6\)/.test(await text(g,'#guideShow')),null);
await g.reload();ok('guía: sigue oculta tras recargar',await seen(g,'#guideShow')&&!(await seen(g,'#guideCount')),null);
await tap(g,'#guideShow');ok('guía: «Mostrar» la vuelve a enseñar',(await gcount())==='2 de 6',null);
let gd=await mk();await tap(gd,'#wDemo');
ok('guía con el ejemplo: «5 de 6», falta revisar el informe',(await text(gd,'#guideCount'))==='5 de 6'&&/Siguiente: Informe revisado/.test(await text(gd,'#guideNext')),await text(gd,'#guidePanel'));
await tap(gd,'#guideGo');ok('guía: «Continuar» lleva al Informe',await seen(gd,'#page-report'),null);
await tap(gd,'#reportReviewed');ok('«He revisado el informe» lo anota con la fecha',/Marcado como revisado el \d{4}-\d{2}-\d{2}/.test(await text(gd,'#reportReviewedNote')),null);
await nav(gd,'Resumen');ok('guía completa: «6 de 6» y mensaje de guía completada',(await text(gd,'#guideCount'))==='6 de 6'&&/Guía completada/.test(await text(gd,'#guidePanel'))&&!(await seen(gd,'#guideGo')),null);
await nav(gd,'Ficha');await gd.fill('#bNotes','Nota nueva');await tap(gd,'#businessForm button:has-text("Guardar ficha")');
ok('guardar la ficha no borra la marca de informe revisado ni la de datos de ejemplo',(d=>d.business.reportReviewedAt&&d.business.isDemo)(await D(gd)),null);
for(const [dev,w] of [[PHONE,390],[SMALL,360]]){const q=await mk(dev);await tap(q,'#wDemo');ok(`guía sin desbordamiento a ${w} px`,await noOverflow(q),await wide(q))}

// ── 3. Qué mirar ahora ───────────────────────────────────────────────────────
let w=await mk();await tap(w,'#wDemo');
const looks=async p=>p.locator('#lookNow .look-item').allInnerTexts().then(a=>a.map(t=>t.replace(/\s+/g,' ').trim()));
let L3=await looks(w);
ok('«Qué mirar ahora» con el ejemplo: 3 señales como máximo, cada una con botón',L3.length===3&&(await w.locator('#lookNow .look-item button').count())===3,L3);
ok('incluye en lenguaje llano: «Chupito de tequila: te quedan 1,02 € de cada 2,06 € sin impuestos (49 %), por debajo de tu umbral de revisión (55 %)»',L3.some(t=>t.includes('«Chupito de tequila»: te quedan 1,02 € de cada 2,06 € sin impuestos (49 %), por debajo de tu umbral de revisión (55 %).')),L3);
ok('prioriza datos que faltan (control sin fechas, coste incompleto) antes que el margen por debajo del umbral',/Cerveza/.test(L3[0])&&/Faltan las fechas/.test(L3[0])&&/Gin-tonic/.test(L3[1])&&/coste está incompleto/.test(L3[1])&&/Chupito/.test(L3[2]),L3);
ok('sin juicios de «bueno/malo» y con aviso de que son señales, no conclusiones',!L3.some(t=>/\b(bueno|buena|malo|mala)\b/i.test(t))&&/señales para revisar/.test(await text(w,'#page-dashboard [aria-labelledby=lookNowTitle]')),null);
ok('acceso a los datos pendientes del informe (5)',/Datos pendientes de verificar: 5/.test(await text(w,'#lookNowPending')),null);
await tap(w,'#lookNow .look-item:has-text("Chupito") button');
ok('«Ver bebida» abre la bebida en Bebidas',await seen(w,'#page-drinks')&&(await w.inputValue('#dName'))==='Chupito de tequila',await w.inputValue('#dName'));
await nav(w,'Resumen');await tap(w,'#lookNow .look-item:has-text("Cerveza") button');
ok('«Ver control» abre el control en Stock',await seen(w,'#page-stock')&&/Faltan las fechas/.test(await text(w,'#stockResult')),null);
await nav(w,'Resumen');await tap(w,'#lookNowPending');ok('«Datos pendientes» abre el informe',await seen(w,'#page-report'),null);
// prioridades con un caso preparado (copia importada por toques)
const caso={app:'Isla & Barra Control',schema:4,settings:{marginMin:55},sales:[],business:{name:'Bar Prioridades',location:'X',period:'P'},
 ingredients:[{id:'i1',name:'Ron',unit:'ml',packQty:700,packPrice:70},{id:'i2',name:'Cola',unit:'ml',packQty:1000,packPrice:1}],
 drinks:[{id:'d1',name:'Copa cara',price:3,recipeItems:[{ingredientId:'i1',qty:50}]},{id:'d2',name:'Refresco',price:2,recipeItems:[{ingredientId:'i2',qty:200}]},{id:'d3',name:'Cubata',price:6,recipeItems:[{ingredientId:'i1',qty:50},{ingredientId:'i2',qty:150}]}],
 stocks:[{id:'s1',start:'2026-10-01',end:'2026-10-07',product:'Ron',unit:'ml',opening:7000,purchases:0,closing:1000,salesUse:5000,threshold:100,status:'Sin validar'}],
 diagnostics:[{id:'g1',area:'Carta y precios',status:'Pendiente',finding:'Precios sin revisar',evidence:'Carta de 2024',action:'Revisar',check:'Comparar',priority:'Alta',due:'2026-10-10'},{id:'g2',area:'Carta y precios',status:'Pendiente',finding:'Futuro',evidence:'e',action:'a',check:'c',priority:'Baja',due:'2026-12-01'}]};
fs.writeFileSync(TMP+'guide_prioridades.json',JSON.stringify(caso));
let pr=await mk();await importTap(pr,'#wRestore',TMP+'guide_prioridades.json');L3=await looks(pr);
ok('prioridad: margen negativo y desviación sobre el umbral primero; luego la revisión vencida',L3.length===3&&/«Copa cara»: preparar una copa cuesta 5,00 € y cobras 3,00 € sin impuestos/.test(L3[0])&&/«Ron»: han salido 1000 ml más de lo que explican/.test(L3[1])&&/tu umbral: 100 ml/.test(L3[1])&&/La revisión de «Precios sin revisar» era el 2026-10-10/.test(L3[2]),L3);
ok('prioridad: la señal de margen bajo (Cubata) y la próxima revisión quedan fuera del top 3',!L3.some(t=>/Cubata|Próxima revisión/.test(t)),L3);
await tap(pr,'#lookNow .look-item:has-text("Precios sin revisar") button');ok('«Abrir hallazgo» abre el hallazgo vencido',await seen(pr,'#page-diagnosis')&&(await pr.inputValue('#diagFinding'))==='Precios sin revisar',null);
let em=await mk();await tap(em,'#wStart');await nav(em,'Resumen');
ok('sin datos que revisar: «No hay señales nuevas» (sin inventar avisos)',/No hay señales nuevas/.test(await text(em,'#lookNow')),await text(em,'#lookNow'));

// FIN
ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO guía: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
