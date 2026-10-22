// Primer uso y orientación: emulación de móvil (390 y 360 px) y solo toques; no se llaman funciones de la app.
const {chromium,devices}=require('./env');const path=require('path');const fs=require('fs');const TMP=path.join(__dirname,'tmp')+path.sep;fs.mkdirSync(TMP,{recursive:true});const [,,F,J]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];
const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const KEY='islaBarraControlMVP_v1',DEMO=JSON.parse(fs.readFileSync(J,'utf8'));
const PHONE={...devices['iPhone 13'],acceptDownloads:true,reducedMotion:'reduce'},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
(async()=>{const b=await chromium.launch();const pages=[];
const mk=async(dev=PHONE,seed)=>{const c=await b.newContext(dev);await c.clock.setFixedTime(new Date('2026-10-21T10:00:00Z'));await c.addInitScript(()=>{window.print=()=>{window.__prints=(window.__prints||0)+1}});if(seed)await c.addInitScript(([k,s])=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem(k,s)},[KEY,JSON.stringify(seed)]);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,120)));p.on('dialog',d=>{p.dl.push(d.type()+': '+d.message().slice(0,60));d.dismiss()});await p.goto(APP_URL);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error("toque en "+sel+": "+e.message.split("\n")[0])});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).first().innerText().then(t=>t.replace(/\s+/g,' ').trim());
const D=p=>p.evaluate(()=>JSON.parse(JSON.stringify(data)));
const stored=(p,k)=>p.evaluate(k=>localStorage.getItem(k),k);
// En emulación móvil, si algo se sale, el navegador agranda innerWidth: se compara con el ancho del dispositivo.
const wide=async p=>[await p.evaluate(()=>document.documentElement.scrollWidth),p.viewportSize().width];
const noOverflow=async p=>{const w=await wide(p);return w[0]<=w[1]+1};
const MORE=['Ficha','Diagnóstico','Informe','Ajustes'];// en móvil se abren desde «Más»
const nav=async(p,label)=>{if(label==='Ingredientes'){await tap(p,'.mobile-nav button:has-text("Mi barra")');await tap(p,'#barFullList');return}/* la lista completa se abre desde «Mi barra» */if(MORE.includes(label)){await tap(p,'.mobile-nav button:has-text("Más")');await tap(p,`#page-more button:has-text("${label}")`)}else await tap(p,`.mobile-nav button:has-text("${label}")`)};
const importTap=async(p,sel,file)=>{const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:10000}),tap(p,sel)]);await fc.setFiles(file);await p.locator('#importConfirm').waitFor({state:'visible',timeout:3000});await tap(p,'#importYes');await p.waitForTimeout(150)};
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
ok('«Empezar con mi bar» pregunta el tipo de negocio',await seen(r,'#page-template'),null);await tap(r,'#tplSkip');ok('«Ahora no, verlo todo» abre la ficha',await seen(r,'#page-business'),null);
await r.fill('#bName','Bar Real');await tap(r,'#businessForm button:has-text("Guardar ficha")');
await nav(r,'Resumen');await tap(r,'#dashDemo');
ok('con datos reales, ver el ejemplo pide confirmación y menciona la copia interna',await seen(r,'#appConfirm')&&/copia interna/.test(await text(r,'#appConfirmText'))&&(await D(r)).business.name==='Bar Real',await text(r,'#appConfirmText'));
await tap(r,'#appConfirmYes');d=await D(r);const copy=JSON.parse(await stored(r,KEY+'_antes_del_ejemplo')||'null');
ok('al confirmar: copia interna con los datos reales y el ejemplo los sustituye por completo (sin mezclar)',copy&&copy.business.name==='Bar Real'&&d.business.isDemo&&d.business.name===DEMO.business.name&&d.drinks.length===DEMO.drinks.length,{copy:copy&&copy.business.name,now:d.business.name});
await tap(r,'#demoExit');
ok('al salir del ejemplo avisa de que vuelven tus datos',/Volverán tus datos/.test(await text(r,'#appConfirmText')),await text(r,'#appConfirmText'));
await tap(r,'#appConfirmYes');d=await D(r);
ok('salir del ejemplo restaura los datos reales y borra la copia interna',d.business.name==='Bar Real'&&!d.business.isDemo&&d.drinks.length===0&&(await stored(r,KEY+'_antes_del_ejemplo'))===null,{name:d.business.name,demo:d.business.isDemo});
await r.waitForTimeout(500);/* pausa breve antes de recargar, como haría una persona */await r.reload();ok('tras recargar siguen los datos reales sin rastro del ejemplo',(await D(r)).business.name==='Bar Real'&&!(await seen(r,'#demoBadge')),null);

// ── 2. Guía de inicio ────────────────────────────────────────────────────────
let g=await mk();await tap(g,'#wStart');await nav(g,'Resumen');
const gcount=async()=>text(g,'#guideCount');
ok('guía: empieza en «0 de 6» con barra de progreso y el primer paso destacado (Ficha)',(await gcount())==='0 de 6'&&(await g.locator('#guidePanel [role=progressbar]').getAttribute('aria-valuenow'))==='0'&&/Siguiente: Ficha completa/.test(await text(g,'#guideNext'))&&/Por qué:/.test(await text(g,'#guideNext')),await text(g,'#guidePanel'));
await tap(g,'#guideGo');ok('guía: «Continuar» lleva a la Ficha',await seen(g,'#page-business'),null);
await g.fill('#bName','Bar Guía');await tap(g,'#businessForm button:has-text("Guardar ficha")');await nav(g,'Resumen');
ok('guía: con nombre pero sin localidad ni periodo la ficha no cuenta y dice qué falta',(await gcount())==='0 de 6'&&/Falta: localidad, periodo analizado/.test(await text(g,'#guideNext')),await text(g,'#guideNext'));
await tap(g,'#guideGo');await g.fill('#bLocation','Arrecife');await g.fill('#bPeriod','1–7 nov');await tap(g,'#businessForm button:has-text("Guardar ficha")');await nav(g,'Resumen');
ok('guía: ficha completa → «1 de 6», chip «✓ Ficha completa» y siguiente: «Rellena tu barra»',(await gcount())==='1 de 6'&&/✓ Ficha completa/.test(await text(g,'#guidePanel .chips'))&&/Siguiente: Rellena tu barra/.test(await text(g,'#guideNext')),await text(g,'#guidePanel'));
await tap(g,'#guideGo');ok('guía: «Continuar» lleva a Mi barra',await seen(g,'#page-bar'),null);await tap(g,'#barFullList');
const addI=async(n,q,pr)=>{await g.fill('#iName',n);await g.selectOption('#iUnit','ml');await g.fill('#iPackQty',String(q));await g.fill('#iPackPrice',String(pr));await tap(g,'#ingredientForm button:has-text("Guardar ingrediente")')};
for(const [n,pr] of [['Ron',14],['Ginebra',16],['Vodka',12],['Tequila',18]])await addI(n,700,pr);await addI('Sirope',1000,0);
await nav(g,'Resumen');ok('guía: 4 con precio y 1 sin precio → sigue en «Rellena tu barra» («Con precio: 4 de 5 · Sin clasificar 4»)',(await gcount())==='1 de 6'&&/Con precio: 4 de 5 · Sin clasificar 4\./.test(await text(g,'#guideNext')),await text(g,'#guideNext'));
await nav(g,'Ingredientes');await addI('Zumo de lima',1000,4.5);await nav(g,'Resumen');
ok('guía: 5 ingredientes con precio → «2 de 6» y siguiente: bebidas',(await gcount())==='2 de 6'&&/Siguiente: 3 bebidas con receta/.test(await text(g,'#guideNext')),await text(g,'#guidePanel'));
await tap(g,'#guideHide');ok('guía: «Ocultar la guía» la oculta y deja un botón para mostrarla con el progreso',!(await seen(g,'#guideNext'))&&/Mostrar la guía de inicio \(2 de 6\)/.test(await text(g,'#guideShow')),null);
await g.waitForTimeout(500);/* pausa breve antes de recargar, como haría una persona */await g.reload();ok('guía: sigue oculta tras recargar',await seen(g,'#guideShow')&&!(await seen(g,'#guideCount')),null);
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
ok('prioriza datos que faltan (control sin fechas) antes que el margen por debajo del umbral',/Cerveza/.test(L3[0])&&/Faltan las fechas/.test(L3[0])&&/Chupito/.test(L3[1]),L3);
ok('sin juicios de «bueno/malo» y con aviso de que son señales, no conclusiones',!L3.some(t=>/\b(bueno|buena|malo|mala)\b/i.test(t))&&/señales para revisar/.test(await text(w,'#page-dashboard [aria-labelledby=lookNowTitle]')),null);
ok('acceso a los datos pendientes del informe (4)',/Datos pendientes de verificar: 4/.test(await text(w,'#lookNowPending')),null);
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

// ── 4. Ayudas «?» y contraste ────────────────────────────────────────────────
let h=await mk();await tap(h,'#wDemo');
const helpBtn=(p,term)=>`button.help[aria-label="Qué es: ${term}"]`;
const openHelp=async(p,term)=>{await tap(p,helpBtn(p,term));const btn=p.locator(helpBtn(p,term)).filter({visible:true}).first();const id=await btn.getAttribute('aria-controls');return{exp:await btn.getAttribute('aria-expanded'),note:await text(p,'#'+id),vis:await p.locator('#'+id).isVisible(),box:await btn.boundingBox()}};
let hm=await openHelp(h,'Margen bruto');
ok('«?» de margen bruto en el Resumen: se abre, aria-expanded=true y aclara que no es beneficio con un ejemplo',hm.exp==='true'&&hm.vis&&/No es beneficio/.test(hm.note)&&/Ejemplo: precio 9,00 € sin impuestos y coste 2,10 € → te quedan 6,90 € \(76,67 %\)/.test(hm.note),hm);
ok('«?» tiene objetivo táctil ≥ 44 × 44 px',hm.box.width>=44&&hm.box.height>=44,hm.box);
await tap(h,helpBtn(h,'Margen bruto'));ok('volver a tocar «?» cierra la ayuda',(await h.locator(helpBtn(h,'Margen bruto')).filter({visible:true}).first().getAttribute('aria-expanded'))==='false',null);
const want={drinks:{'Coste directo':/2,10 €/,'Margen bruto':/no es beneficio|No es beneficio/,'% de coste':/23,33 %/,'Umbral de margen':/55 %/},stock:{'Consumo teórico':/5800 ml/,'Desviación':/\+500 ml/,'Umbral de revisión':/300 ml/,'Conciliación':/6300 ml/}};
for(const [pg,terms] of Object.entries(want)){await nav(h,pg==='drinks'?'Bebidas':'Stock');if(pg==='drinks')await tap(h,'.adv-scope:has(#marginMin) .more-toggle');for(const [term,re] of Object.entries(terms)){const r=await openHelp(h,term);ok(`«?» de ${term} en ${pg==='drinks'?'Bebidas':'Stock'}: explicación con ejemplo numérico`,r.exp==='true'&&r.vis&&re.test(r.note)&&/Ejemplo:/.test(r.note),r.note)}
 for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){if(dev===SMALL){const q=await mk(SMALL);await tap(q,'#wDemo');await nav(q,pg==='drinks'?'Bebidas':'Stock');if(pg==='drinks')await tap(q,'.adv-scope:has(#marginMin) .more-toggle');for(const term of Object.keys(terms))await tap(q,helpBtn(q,term));ok(`${pg==='drinks'?'Bebidas':'Stock'} con todas las ayudas abiertas sin desbordamiento a 360 px`,await noOverflow(q),await wide(q))}else ok(`${pg==='drinks'?'Bebidas':'Stock'} con todas las ayudas abiertas sin desbordamiento a 390 px`,await noOverflow(h),await wide(h))}}
ok('cada «?» es un botón con nombre accesible y controla su nota',await h.evaluate(()=>[...document.querySelectorAll('button.help')].every(b=>b.getAttribute('aria-label').startsWith('Qué es: ')&&document.getElementById(b.getAttribute('aria-controls')))),null);
// contraste del texto visible (≥ 4,5:1) en cada pantalla con el ejemplo cargado
const contrastFails=p=>p.evaluate(()=>{const rgb=s=>{const m=s.match(/[\d.]+/g)||[0,0,0,0];return m.map(Number)};const lum=([r,g,b])=>{const f=x=>{x/=255;return x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
 const bgOf=el=>{for(let e=el;e;e=e.parentElement){const c=rgb(getComputedStyle(e).backgroundColor);if((c[3]===undefined||c[3]>0.5))return c}return[255,255,255]};const bad=[];
 document.querySelectorAll('body *').forEach(el=>{if(!el.offsetParent&&getComputedStyle(el).position!=='fixed')return;const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||Number(cs.opacity)<0.5)return;let op=1;for(let e=el;e;e=e.parentElement)op*=Number(getComputedStyle(e).opacity);if(op<0.95)return;const a=lum(rgb(cs.color)),b2=lum(bgOf(el)),r=(Math.max(a,b2)+.05)/(Math.min(a,b2)+.05);if(r<4.5)bad.push(el.tagName+'.'+el.className+' «'+el.textContent.trim().slice(0,30)+'» '+r.toFixed(2))});return bad});
let cf=[];for(const label of ['Resumen','Bebidas','Ingredientes','Stock','Diagnóstico','Ficha']){await nav(h,label);cf.push(...(await contrastFails(h)).map(x=>label+': '+x))}
ok('contraste ≥ 4,5:1 en todo el texto visible (Resumen, Ficha, Bebidas, Ingredientes, Stock, Diagnóstico)',cf.length===0,cf.slice(0,8));
{const wq=await mk();const f=await contrastFails(wq);ok('contraste ≥ 4,5:1 en la bienvenida',f.length===0,f)}

// ── 5. Vista sencilla / completa ─────────────────────────────────────────────
let m5=await mk();await tap(m5,'#wStart');
const vis=(p,sel)=>p.locator(sel).first().isVisible();
const advVisible=async p=>({tax:await vis(p,'#dTax'),other:await vis(p,'#dOtherCost'),marg:await vis(p,'#marginMin'),thr:await vis(p,'#sThreshold'),follow:await vis(p,'#sFollow'),cl:await p.locator('#iUnit option[value=cl]').count()});
const onPage=async(p,label,fn)=>{await nav(p,label);return fn()};
ok('quien empieza de cero arranca en vista sencilla',(await D(m5)).settings.mode==='simple',null);
let a5={tax:await onPage(m5,'Bebidas',()=>vis(m5,'#dTax')),other:await vis(m5,'#dOtherCost'),marg:await vis(m5,'#marginMin'),thr:await onPage(m5,'Stock',()=>vis(m5,'#sThreshold')),follow:await vis(m5,'#sFollow'),cl:await m5.locator('#iUnit option[value=cl]').count()};
ok('sencilla: ocultos impuesto incluido, otros costes, umbrales, seguimiento de la desviación y formato en cl',!a5.tax&&!a5.other&&!a5.marg&&!a5.thr&&!a5.follow&&a5.cl===0,a5);
await nav(m5,'Bebidas');await tap(m5,'#drinkForm .more-toggle');
ok('Bebidas › «Más opciones» muestra impuesto y otros costes (aria-expanded y «Menos opciones»)',(await vis(m5,'#dTax'))&&(await vis(m5,'#dOtherCost'))&&(await m5.locator('#drinkForm .more-toggle').getAttribute('aria-expanded'))==='true'&&(await text(m5,'#drinkForm .more-toggle'))==='Menos opciones',null);
await tap(m5,'#drinkForm .more-toggle');ok('«Menos opciones» los vuelve a ocultar',!(await vis(m5,'#dTax')),null);
await tap(m5,'.adv-scope:has(#marginMin) .more-toggle');ok('Bebidas › resumen › «Más opciones» muestra el umbral de margen',await vis(m5,'#marginMin'),null);
await nav(m5,'Stock');await tap(m5,'#stockForm .more-toggle');ok('Stock › «Más opciones» muestra umbral y seguimiento de la desviación',(await vis(m5,'#sThreshold'))&&(await vis(m5,'#sFollow')),null);
await nav(m5,'Ingredientes');await tap(m5,'#ingredientForm .more-toggle');ok('Ingredientes › «Más opciones» ofrece centilitros (cl)',(await m5.locator('#iUnit option[value=cl]').count())===1,null);
const box5=await box(m5,'#ingredientForm .more-toggle');ok('«Más opciones» con altura ≥ 44 px',box5.height>=44,box5);
await nav(m5,'Resumen');await tap(m5,'#dashSettings');ok('Resumen › «Ajustes» abre los ajustes con la vista actual marcada (Sencilla)',(await seen(m5,'#page-settings'))&&(await m5.isChecked('#modeSimple')),null);
await tap(m5,'label[for=modeFull]');a5=await D(m5);
ok('elegir «Completa» lo guarda en settings.mode',a5.settings.mode==='full'&&(await m5.isChecked('#modeFull')),a5.settings.mode);
await m5.waitForTimeout(500);/* pausa breve antes de recargar, como haría una persona */await m5.reload();a5={tax:await onPage(m5,'Bebidas',()=>vis(m5,'#dTax')),marg:await vis(m5,'#marginMin'),toggles:await m5.locator('.more-toggle').filter({visible:true}).count(),thr:await onPage(m5,'Stock',()=>vis(m5,'#sThreshold')),follow:await vis(m5,'#sFollow'),cl:await m5.locator('#iUnit option[value=cl]').count()};
ok('completa (tras recargar): todo a la vista y sin «Más opciones»',a5.tax&&a5.marg&&a5.thr&&a5.follow&&a5.cl===1&&a5.toggles===0,a5);
// quien ya tiene datos se queda en completa
const v3={schema:3,business:{name:'Bar Antiguo'},ingredients:[{id:'i1',name:'Ron',unit:'ml',packQty:700,packPrice:14}],drinks:[],stocks:[],diagnostics:[],sales:[],settings:{marginMin:60}};
let m6=await mk(PHONE,v3);ok('datos guardados por la versión anterior (sin modo): se quedan en vista completa',(await D(m6)).settings.mode==='full'&&!(await m6.evaluate(()=>document.body.classList.contains('mode-simple'))),null);
fs.writeFileSync(TMP+'guide_v3.json',JSON.stringify({...v3,app:'Isla & Barra Control'}));
let m7=await mk();await importTap(m7,'#wRestore',TMP+'guide_v3.json');ok('importar una copia antigua con datos: vista completa',(await D(m7)).settings.mode==='full',null);
let m8=await mk();await tap(m8,'#wDemo');ok('el bar de ejemplo cargado desde la bienvenida mantiene la vista sencilla',(await D(m8)).settings.mode==='simple',null);
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const q=await mk(dev);await tap(q,'#wDemo');for(const [lab,sel] of [['Bebidas','#drinkForm .more-toggle'],['Stock','#stockForm .more-toggle'],['Ingredientes','#ingredientForm .more-toggle']]){await nav(q,lab);await tap(q,sel)}await nav(q,'Resumen');await tap(q,'#dashSettings');ok(`modo sencillo con «Más opciones» abiertas y Ajustes sin desbordamiento a ${wd} px`,await noOverflow(q),await wide(q))}

// ── 6. Nueva bebida en vivo (vista sencilla) ─────────────────────────────────
let n6=await mk();await tap(n6,'#wStart');await nav(n6,'Ingredientes');
await n6.fill('#iName','Ron blanco');await n6.selectOption('#iUnit','ml');await n6.fill('#iPackQty','700');await n6.fill('#iPackPrice','14');await tap(n6,'#ingredientForm button:has-text("Guardar ingrediente")');
await nav(n6,'Bebidas');const live=()=>text(n6,'#drinkPreview');
ok('en vivo sin precio: pide el precio para ver cuánto queda',/Preparar una copa te cuesta 0,00 €/.test(await live())&&/Añade el precio de venta/.test(await live()),await live());
await n6.fill('#dName','Mojito');await tap(n6,'#drinkForm button:has-text("+ Añadir ingrediente")');await n6.locator('#recipeLines select').selectOption({index:1});await n6.locator('#recipeLines input[type=number]').pressSequentially('50');
ok('al teclear la cantidad: «Preparar una copa te cuesta 1,00 €» y desglose ingredientes + extras',/Preparar una copa te cuesta 1,00 €/.test(await live())&&/Ingredientes 1,00 € \+ extras 0,00 €/.test(await live()),await live());
await n6.locator('#dPrice').pressSequentially('9');
ok('al teclear el precio: «Te quedan 8,00 € de cada 9,00 € sin impuestos (88,89 %)»',/Te quedan 8,00 € de cada 9,00 € sin impuestos \(88,89 %\)/.test(await live()),await live());
ok('siempre aclara que es margen bruto, no beneficio',/Es margen bruto, no beneficio/.test(await live()),null);
await tap(n6,'#drinkForm .more-toggle');await n6.fill('#dOtherCost','');await n6.locator('#dOtherCost').pressSequentially('1.10');
ok('con 1,10 € de extras (ejemplo B): cuesta 2,10 € y te quedan 6,90 € de cada 9,00 € (76,67 %)',/Preparar una copa te cuesta 2,10 €/.test(await live())&&/Ingredientes 1,00 € \+ extras 1,10 €/.test(await live())&&/Te quedan 6,90 € de cada 9,00 € sin impuestos \(76,67 %\)/.test(await live()),await live());
await n6.fill('#dTax','');await n6.locator('#dTax').pressSequentially('10');
ok('con impuesto incluido del 10 %: «de cada 8,18 € sin impuestos»',/de cada 8,18 € sin impuestos/.test(await live()),await live());
await n6.fill('#dTax','0');await n6.fill('#dPrice','');await n6.locator('#dPrice').pressSequentially('2');
ok('si el coste supera el precio sin impuestos lo dice sin juicios («faltan 0,10 € para cubrir el coste»)',/Cobras 2,00 € sin impuestos y preparar la copa cuesta 2,10 €: faltan 0,10 € para cubrir el coste/.test(await live())&&!/\b(malo|mala|bueno|buena)\b/i.test(await live()),await live());
await n6.fill('#dPrice','9');await tap(n6,'#drinkForm button:has-text("Guardar bebida")');const d6=(await D(n6)).drinks[0];
ok('guardar desde la vista sencilla guarda lo mismo que se ve (coste 2,10 €, precio 9 €)',d6&&d6.name==='Mojito'&&d6.price===9&&Math.abs(d6.otherCost-1.1)<1e-9&&d6.recipeItems[0].qty===50,d6);
await nav(n6,'Resumen');await tap(n6,'#dashSettings');await tap(n6,'label[for=modeFull]');await nav(n6,'Bebidas');
ok('en vista completa se mantiene la vista previa detallada (precio sin impuestos, coste directo, margen bruto)',/Precio sin impuestos/.test(await live())&&/Margen bruto estimado/.test(await live()),await live());
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const q=await mk(dev);await tap(q,'#wDemo');await nav(q,'Bebidas');await q.locator('#dPrice').pressSequentially('12.5');ok(`bebida en vivo sin desbordamiento a ${wd} px`,await noOverflow(q),await wide(q))}

// ── 7. Arranque rápido ───────────────────────────────────────────────────────
let s7=await mk();await tap(s7,'#wStart');await nav(s7,'Ingredientes');
await tap(s7,'button[aria-label="Formato rápido: Botella 70 cl"]');
ok('formato rápido «Botella 70 cl»: 700 ml, formato escrito y el foco pasa al precio',(await s7.inputValue('#iUnit'))==='ml'&&(await s7.inputValue('#iPackQty'))==='700'&&(await s7.inputValue('#iFormat'))==='Botella 70 cl'&&(await s7.evaluate(()=>document.activeElement.id))==='iPackPrice'&&/700 ml/.test(await text(s7,'#ingredientPreview')),await text(s7,'#ingredientPreview'));
await tap(s7,'button[aria-label="Formato rápido: Caja 24 × 33 cl"]');ok('formato rápido «Caja 24 × 33 cl»: 7920 ml (24 × 330 ml)',(await s7.inputValue('#iUnit'))==='ml'&&(await s7.inputValue('#iPackQty'))==='7920'&&/7920 ml/.test(await text(s7,'#ingredientPreview')),await text(s7,'#ingredientPreview'));
await tap(s7,'button[aria-label="Formato rápido: Bolsa 1 kg"]');ok('formato rápido «Bolsa 1 kg»: 1000 g en unidad base',(await s7.inputValue('#iUnit'))==='kg'&&/1000 g/.test(await text(s7,'#ingredientPreview')),await text(s7,'#ingredientPreview'));
await s7.fill('#iName','Café');await s7.fill('#iPackPrice','14');await tap(s7,'#ingredientForm button:has-text("Guardar ingrediente")');
ok('guardar tras un formato rápido: café 1 kg a 14 € = 0,014 €/g',(i=>i&&i.packQty===1000&&i.unit==='g'&&Math.abs(i.unitCost-0.014)<1e-12&&i.format==='Bolsa 1 kg')((await D(s7)).ingredients[0]),(await D(s7)).ingredients[0]);
const qb=await s7.locator('#quickFormats button').evaluateAll(bs=>bs.map(b=>b.getBoundingClientRect().height));ok('botones de formato con altura ≥ 44 px',qb.length>=8&&qb.every(x=>x>=44),qb);
await tap(s7,'#starterAdd');let d7=await D(s7);
ok('catálogo inicial: añade 17 ingredientes habituales sin precio y editables',d7.ingredients.length===18&&d7.ingredients.slice(1).every(i=>i.packPrice===0&&i.packQty>0&&/Precio pendiente/.test(i.notes)),d7.ingredients.length);
ok('el catálogo sin precios no cuenta como «ingredientes con precio» en la guía',(await D(s7)).ingredients.filter(i=>i.packPrice>0).length===1,null);
await tap(s7,'#starterAdd');ok('volver a añadirlo no duplica nada',(await D(s7)).ingredients.length===18,null);
await nav(s7,'Bebidas');
// las recetas sugeridas del encargo anterior las sustituye la biblioteca de cócteles (bib.test.js)
ok('el formulario de bebida ya no ofrece recetas sugeridas y lleva a la biblioteca de cócteles',(await s7.locator('#dSuggest').count())===0&&(await seen(s7,'#libFromForm')),null);
await tap(s7,'#libFromForm');ok('«Añadir desde la biblioteca de cócteles» abre la biblioteca',await seen(s7,'#page-library'),null);
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const q=await mk(dev);await tap(q,'#wStart');await nav(q,'Ingredientes');ok(`Ingredientes con formatos rápidos y arranque rápido sin desbordamiento a ${wd} px`,await noOverflow(q),await wide(q));await nav(q,'Bebidas');ok(`Bebidas con recetas sugeridas sin desbordamiento a ${wd} px`,await noOverflow(q),await wide(q))}

// ── 8. Marca personalizable ──────────────────────────────────────────────────
{const g=await (await b.newContext()).newPage();const png=await g.evaluate(()=>{const c=document.createElement('canvas');c.width=1200;c.height=900;const x=c.getContext('2d'),im=x.createImageData(1200,900);for(let i=0;i<im.data.length;i++)im.data[i]=(i%4===3)?255:Math.random()*255;x.putImageData(im,0,0);x.fillStyle='#7a1f3d';x.font='bold 300px sans-serif';x.fillText('BN',300,600);return c.toDataURL('image/png').split(',')[1]});fs.writeFileSync(TMP+'logo_grande.png',Buffer.from(png,'base64'));await g.context().close()}
const logoKB=Math.round(fs.statSync(TMP+'logo_grande.png').size/1024);
let k8=await mk();await tap(k8,'#wDemo');
ok('marca por defecto: Isla & Barra en la cabecera y «Preparado por: Isla & Barra» en el informe',(await text(k8,'#brandTitle'))==='Isla & Barra Control'&&(await text(k8,'#brandLogo'))==='I&B'&&await (async()=>{await tap(k8,'#guideGo');const r=await text(k8,'#reportContent');return /Isla & Barra · Informe de trabajo/i.test(r)&&/Preparado por: Isla & Barra/.test(r)})(),null);
await nav(k8,'Resumen');await tap(k8,'#dashSettings');
await k8.fill('#brName','Barra Norte Consultoría');await k8.fill('#brFooter','Asesoría de barras · Lanzarote');
await k8.fill('#brColor','#f2c94c');
ok('color con poco contraste: avisa con la cifra y el mínimo 4,5:1',/Poco contraste: 1,\d+:1 \(mínimo 4,5:1\)/.test(await text(k8,'#brColorMsg')),await text(k8,'#brColorMsg'));
await k8.fill('#brColor','#7a1f3d');
ok('color con contraste suficiente: lo confirma',/suficiente/.test(await text(k8,'#brColorMsg')),await text(k8,'#brColorMsg'));
const [fc8]=await Promise.all([k8.waitForEvent('filechooser'),tap(k8,'#brLogoPick')]);await fc8.setFiles(TMP+'logo_grande.png');await k8.waitForFunction(()=>/Logo listo/.test(document.getElementById('brLogoMsg').textContent),null,{timeout:8000});
ok(`logo de ${logoKB} KB: se reduce a ≤ 100 KB antes de guardarlo`,logoKB>100&&/Logo listo \(\d+ KB\)/.test(await text(k8,'#brLogoMsg')),await text(k8,'#brLogoMsg'));
await tap(k8,'#brandForm button:has-text("Guardar marca")');let br=(await D(k8)).settings.brand;const logoBytes=br.logo?Math.floor((br.logo.length-br.logo.indexOf(',')-1)*3/4):0;
ok('«Guardar marca» guarda nombre, pie, color y logo (≤ 100 KB) en settings.brand',br.name==='Barra Norte Consultoría'&&br.footer==='Asesoría de barras · Lanzarote'&&br.color==='#7a1f3d'&&/^data:image\/(png|jpeg);base64,/.test(br.logo)&&logoBytes<=102400,{...br,logo:br.logo.slice(0,30),logoBytes});
ok('cabecera: nombre, logo con texto alternativo y color principal',(await text(k8,'#brandTitle'))==='Barra Norte Consultoría'&&(await k8.locator('#brandLogo img').getAttribute('alt'))==='Logo de Barra Norte Consultoría'&&(await k8.evaluate(()=>getComputedStyle(document.querySelector('.topbar')).backgroundColor))==='rgb(122, 31, 61)',null);
await nav(k8,'Resumen');await tap(k8,'#guideGo');const rep8=await text(k8,'#reportContent');
ok('informe: logo, «Barra Norte Consultoría · Informe de trabajo», «Preparado por» y texto de pie',(await k8.locator('#reportContent img.report-logo').count())===1&&/Barra Norte Consultoría · Informe de trabajo/i.test(rep8)&&/Preparado por: Barra Norte Consultoría/.test(rep8)&&/Preparado por Barra Norte Consultoría · Asesoría de barras · Lanzarote/.test(rep8),rep8.slice(0,160));
await nav(k8,'Resumen');await tap(k8,'#dashSettings');await k8.fill('#brColor','#f2c94c');await tap(k8,'#brandForm button:has-text("Guardar marca")');
ok('guardar con un color sin contraste no lo aplica (se conserva el anterior) y lo explica',(await D(k8)).settings.brand.color==='#7a1f3d'&&/sin el color nuevo/.test(await text(k8,'#toast')),await text(k8,'#toast'));
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const q=dev===PHONE?k8:await mk(SMALL);if(q!==k8){await tap(q,'#wDemo');await tap(q,'#dashSettings');await q.fill('#brName','Asesoría Integral de Hostelería del Atlántico Norte S.L.');await tap(q,'#brandForm button:has-text("Guardar marca")')}ok(`Ajustes y cabecera con marca propia sin desbordamiento a ${wd} px`,await noOverflow(q),await wide(q))}
{const cf8=await contrastFails(k8);ok('contraste ≥ 4,5:1 en Ajustes con la marca propia',cf8.length===0,cf8)}
// la marca viaja en la copia
await nav(k8,'Resumen');const [dl8]=await Promise.all([k8.waitForEvent('download'),tap(k8,'#dashExport')]);const ex8=JSON.parse(fs.readFileSync(await dl8.path(),'utf8'));fs.writeFileSync(TMP+'guide_marca.json',JSON.stringify(ex8));
ok('la copia exportada incluye la marca con el logo',ex8.settings.brand.name==='Barra Norte Consultoría'&&ex8.settings.brand.logo===br.logo,ex8.settings.brand.name);
let k9=await mk();await importTap(k9,'#wRestore',TMP+'guide_marca.json');
ok('al importar la copia en otro navegador se aplica la marca',(await text(k9,'#brandTitle'))==='Barra Norte Consultoría'&&(await k9.locator('#brandLogo img').count())===1,null);
fs.writeFileSync(TMP+'guide_marca_mala.json',JSON.stringify({...ex8,settings:{...ex8.settings,brand:{name:'X',color:'#ffff00',logo:'data:text/html;base64,PHNjcmlwdD4=',footer:'f'}}}));
let k10=await mk();await importTap(k10,'#wRestore',TMP+'guide_marca_mala.json');br=(await D(k10)).settings.brand;
ok('una copia con color sin contraste o logo no válido se corrige al importar (color por defecto, sin logo)',br.color==='#0E4A5A'&&br.logo===''&&br.name==='X',br);
await tap(k9,'#dashSettings');await tap(k9,'#brReset');await tap(k9,'#appConfirmYes');
ok('«Volver a Isla & Barra» restablece la marca (con confirmación)',(await text(k9,'#brandTitle'))==='Isla & Barra Control'&&(await D(k9)).settings.brand.logo==='',null);

// ── 9. Navegación de 5 y recordatorio de copia ───────────────────────────────
let n9=await mk();await tap(n9,'#wDemo');
const navTexts=(await n9.locator('.mobile-nav button').filter({visible:true}).allInnerTexts()).map(x=>x.replace(/^\W*\s*/,'').trim());
ok('barra inferior de 5: Resumen, Bebidas, Mi barra, Stock y Más',navTexts.join()==='Resumen,Bebidas,Mi barra,Stock,Más',navTexts);
const navBoxes=await n9.locator('.mobile-nav button').evaluateAll(bs=>bs.map(b=>[b.getBoundingClientRect().width,b.getBoundingClientRect().height]));ok('botones de la barra inferior ≥ 44 × 44 px',navBoxes.every(([w,h])=>w>=44&&h>=44),navBoxes);
await tap(n9,'.mobile-nav button:has-text("Más")');
ok('«Más» abre Ficha, Diagnóstico, Informe, Ajustes, Instalar la app y Acerca de',(await seen(n9,'#page-more'))&&(await n9.locator('#page-more .more-item').allInnerTexts()).map(t=>t.split('\n')[0]).join()==='Ficha del bar,Diagnóstico,Informe,Ajustes,Instalar la app,Acerca de',null);
for(const [lab,pg] of [['Ficha','business'],['Diagnóstico','diagnosis'],['Informe','report'],['Ajustes','settings']]){await nav(n9,lab);ok(`Más › ${lab}: abre la pantalla y «Más» queda marcado (aria-current)`,(await seen(n9,'#page-'+pg))&&(await n9.locator('.mobile-nav button:has-text("Más")').getAttribute('aria-current'))==='page',null)}
await nav(n9,'Bebidas');ok('en Bebidas, la marca pasa a «Bebidas»',(await n9.locator('.mobile-nav button:has-text("Bebidas")').getAttribute('aria-current'))==='page'&&!(await n9.locator('.mobile-nav button:has-text("Más")').getAttribute('aria-current')),null);
await nav(n9,'Resumen');
ok('sin copias: «Todavía no has exportado ninguna copia» con aviso',/Todavía no has exportado ninguna copia/.test(await text(n9,'#backupStatus'))&&/warn/.test(await n9.getAttribute('#backupStatus','class')),await text(n9,'#backupStatus'));
const [dl9]=await Promise.all([n9.waitForEvent('download'),tap(n9,'#dashExport')]);const ex9=JSON.parse(fs.readFileSync(await dl9.path(),'utf8'));
ok('al exportar: settings.lastBackupAt = fecha de la copia y «Última copia: hoy» sin aviso',ex9.settings.lastBackupAt===ex9.exportedAt&&(await D(n9)).settings.lastBackupAt===ex9.exportedAt&&/Última copia: hoy/.test(await text(n9,'#backupStatus'))&&!/warn/.test(await n9.getAttribute('#backupStatus','class')),[ex9.settings.lastBackupAt,ex9.exportedAt]);
await nav(n9,'Ajustes');ok('Ajustes también muestra la última copia y permite exportar e importar',/Última copia: hoy/.test(await text(n9,'#settingsBackup'))&&(await seen(n9,'#setExport'))&&(await seen(n9,'#setImport')),null);
const old=(d,days)=>({...ex9,exportedAt:new Date(Date.parse('2026-10-21T10:00:00Z')-days*864e5).toISOString(),settings:{...ex9.settings,lastBackupAt:''}});
fs.writeFileSync(TMP+'guide_copia10.json',JSON.stringify(old(ex9,10)));fs.writeFileSync(TMP+'guide_copia3.json',JSON.stringify(old(ex9,3)));
let b10=await mk();await importTap(b10,'#wRestore',TMP+'guide_copia10.json');
ok('copia de hace 10 días: «Última copia: hace 10 días» y aviso de exportar',/Última copia: hace 10 días\. Han pasado 10 días/.test(await text(b10,'#backupStatus'))&&/warn/.test(await b10.getAttribute('#backupStatus','class')),await text(b10,'#backupStatus'));
let b3=await mk();await importTap(b3,'#wRestore',TMP+'guide_copia3.json');
ok('copia de hace 3 días: «hace 3 días» sin aviso',/Última copia: hace 3 días\.$/.test(await text(b3,'#backupStatus'))&&!/warn/.test(await b3.getAttribute('#backupStatus','class')),await text(b3,'#backupStatus'));
await tap(b10,'#dashExport');await b10.waitForTimeout(200);ok('tras exportar de nuevo: «Última copia: hoy»',/Última copia: hoy/.test(await text(b10,'#backupStatus')),null);
// barrido final: todas las pantallas, 360 y 390 px, vista sencilla y completa
for(const [dev,wd] of [[PHONE,390],[SMALL,360]])for(const mode of ['simple','full']){const q=await mk(dev);await tap(q,'#wDemo');if(mode==='full'){await nav(q,'Ajustes');await tap(q,'label[for=modeFull]')}const over=[],small=[];
 for(const lab of ['Resumen','Bebidas','Mi barra','Ingredientes','Stock','Ficha','Diagnóstico','Informe','Ajustes']){await nav(q,lab);if(!(await noOverflow(q)))over.push(lab+' '+(await wide(q))[0]);
  const sm=await q.evaluate(()=>[...document.querySelectorAll('button,label[role=button],.mobile-nav button')].filter(b=>b.offsetParent&&getComputedStyle(b).visibility!=='hidden').map(b=>{const r=b.getBoundingClientRect();return[b.textContent.trim().slice(0,20)||b.getAttribute('aria-label'),Math.round(r.width),Math.round(r.height)]}).filter(([,w,h])=>w<44||h<44));small.push(...sm.map(x=>lab+': '+x.join(' ')))}
 ok(`${wd} px, vista ${mode==='simple'?'sencilla':'completa'}: ninguna pantalla se desborda`,over.length===0,over);
 ok(`${wd} px, vista ${mode==='simple'?'sencilla':'completa'}: todos los botones visibles ≥ 44 × 44 px`,small.length===0,small.slice(0,6))}
{const q=await mk();await tap(q,'#wDemo');const cf9=[];for(const lab of ['Más','Informe','Ajustes']){if(lab==='Más')await tap(q,'.mobile-nav button:has-text("Más")');else await nav(q,lab);cf9.push(...(await contrastFails(q)).map(x=>lab+': '+x))}ok('contraste ≥ 4,5:1 en Más, Informe y Ajustes',cf9.length===0,cf9.slice(0,6))}

// FIN
ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO guía: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
