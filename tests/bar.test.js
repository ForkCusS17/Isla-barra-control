// «Mi barra»: taxonomía, secciones, alta rápida, pegar una lista, plantillas y migración.
// Emulación de móvil (390 y 360 px) y solo toques; no se llaman funciones de la app.
const {chromium,devices}=require('playwright');const path=require('path');const fs=require('fs');const TMP=path.join(__dirname,'tmp')+path.sep;fs.mkdirSync(TMP,{recursive:true});const [,,F,J]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];
const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const PHONE={...devices['iPhone 13'],acceptDownloads:true,reducedMotion:'reduce'},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
(async()=>{const b=await chromium.launch();const pages=[];
const mk=async(dev=PHONE)=>{const c=await b.newContext(dev);await c.clock.setFixedTime(new Date('2026-10-21T10:00:00Z'));const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,120)));p.on('dialog',d=>{p.dl.push(d.type()+': '+d.message().slice(0,60));d.dismiss()});await p.goto(APP_URL);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0])});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').trim());
const D=p=>p.evaluate(()=>JSON.parse(JSON.stringify(data)));
// En emulación móvil innerWidth crece si algo se sale: se compara con el ancho del dispositivo.
const wide=async p=>[await p.evaluate(()=>document.documentElement.scrollWidth),p.viewportSize().width];
const noOverflow=async p=>{const w=await wide(p);return w[0]<=w[1]+1};
const MORE=['Ficha','Diagnóstico','Informe','Ajustes'];
const nav=async(p,label)=>{if(label==='Ingredientes'){await tap(p,'.mobile-nav button:has-text("Mi barra")');await tap(p,'#barFullList');return}/* la lista completa se abre desde «Mi barra» */if(MORE.includes(label)){await tap(p,'.mobile-nav button:has-text("Más")');await tap(p,`#page-more button:has-text("${label}")`)}else await tap(p,`.mobile-nav button:has-text("${label}")`)};
const importTap=async(p,sel,file)=>{const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:4000}),tap(p,sel)]);await fc.setFiles(file);await p.locator('#importConfirm').waitFor({state:'visible',timeout:3000});await tap(p,'#importYes');await p.waitForTimeout(150)};
const ing=(d,name)=>d.ingredients.find(i=>i.name===name);
const openManage=async p=>{if(await p.locator('#barManage').getAttribute('open')===null)await tap(p,'#barManage summary')};/* tocar el resumen de un <details> abierto lo cierra */

// ── 1. Modelo: subcategorías, taxonomía y migración desde el esquema 4 ─────────
const v4={app:'Isla & Barra Control',schema:4,settings:{marginMin:55,mode:'full'},business:{name:'Bar Esquema 4'},sales:[],drinks:[],stocks:[],diagnostics:[],
 ingredients:[{id:'a',name:'Ron añejo',category:'Destilado',unit:'ml',packQty:700,packPrice:21},{id:'b',name:'Cerveza botellín',category:'Vino / cerveza',unit:'unit',packQty:24,packPrice:21.6},{id:'c',name:'Vino tinto Rioja',category:'Vino / cerveza',unit:'ml',packQty:750,packPrice:6},{id:'d',name:'Leche',category:'Lácteo',unit:'ml',packQty:1000,packPrice:1.05},{id:'e',name:'Limas',category:'Fruta / verdura',unit:'g',packQty:1000,packPrice:3}]};
fs.writeFileSync(TMP+'bar_v4.json',JSON.stringify(v4));
let m=await mk();await importTap(m,'#wRestore',TMP+'bar_v4.json');let d=await D(m);
ok('copia del esquema 4: se importa y pasa al esquema 5',d.schema===5&&d.ingredients.length===5&&m.errs.length===0,[d.schema,m.errs]);
ok('migración: los ingredientes quedan con subcategoría vacía',d.ingredients.every(i=>i.subcategory===''),d.ingredients.map(i=>i.subcategory));
ok('migración: categorías antiguas → nuevas (Destilado → Destilados; Vino / cerveza → Cervezas o Vinos por el nombre; Lácteo → Otros; Fruta / verdura → Frutas, hierbas y zumos)',ing(d,'Ron añejo').category==='Destilados'&&ing(d,'Cerveza botellín').category==='Cervezas'&&ing(d,'Vino tinto Rioja').category==='Vinos'&&ing(d,'Leche').category==='Otros'&&ing(d,'Limas').category==='Frutas, hierbas y zumos',d.ingredients.map(i=>i.category));
ok('migración: no cambia cantidades, precios ni coste unitario',ing(d,'Ron añejo').unitCost===0.03&&ing(d,'Cerveza botellín').packQty===24&&Math.abs(ing(d,'Cerveza botellín').unitCost-0.9)<1e-12,null);
const tx=d.settings.taxonomy;
ok('taxonomía por defecto: 8 categorías en orden',tx.map(c=>c.name).join('|')==='Destilados|Vinos|Cervezas|Refrescos y mixers|Frutas, hierbas y zumos|Siropes y azúcares|Café e infusiones|Otros',tx.map(c=>c.name));
ok('Destilados: Ginebras, Rones, Whiskys, Vodkas, Tequilas y mezcales, Brandis, Licores y amargos',tx[0].subs.map(s=>s.name).join('|')==='Ginebras|Rones|Whiskys|Vodkas|Tequilas y mezcales|Brandis|Licores y amargos',tx[0].subs.map(s=>s.name));
ok('cada categoría trae formatos y cada subcategoría su nombre en singular (editables)',tx.every(c=>c.formats.length>0&&c.subs.length>0&&c.subs.every(s=>s.one))&&tx[0].formats.join('|')==='70 cl|1 L|50 cl|3 L',tx[0].formats);
// formulario completo: categoría y subcategoría según la taxonomía
await tap(m,'#dashSettings');await tap(m,'label[for=modeFull]');await nav(m,'Ingredientes');
ok('lista completa: el selector de categoría usa la taxonomía',(await m.locator('#iCategory option').allInnerTexts()).join('|')===tx.map(c=>c.name).join('|'),null);
await m.selectOption('#iCategory','Destilados');
ok('la subcategoría ofrece las de la categoría elegida («Sin clasificar» + 7)',(await m.locator('#iSubcategory option').count())===8&&(await m.locator('#iSubcategory option').nth(1).innerText())==='Ginebras',null);
await m.selectOption('#iCategory','Cervezas');ok('al cambiar de categoría cambian las subcategorías',(await m.locator('#iSubcategory option').allInnerTexts()).slice(1).join('|')==='Botellín y lata|Barril|Sin alcohol',null);
await m.selectOption('#iCategory','Destilados');await m.selectOption('#iSubcategory','Ginebras');await m.fill('#iName','Ginebra Nordés');await m.fill('#iPackQty','700');await m.fill('#iPackPrice','24.5');await tap(m,'#ingredientForm button:has-text("Guardar ingrediente")');
d=await D(m);ok('guardar desde la lista completa guarda categoría y subcategoría',(i=>i&&i.category==='Destilados'&&i.subcategory==='Ginebras'&&i.unitCost===0.035)(ing(d,'Ginebra Nordés')),ing(d,'Ginebra Nordés'));
const [dl1]=await Promise.all([m.waitForEvent('download'),(async()=>{await nav(m,'Resumen');await tap(m,'#dashExport')})()]);const ex1=JSON.parse(fs.readFileSync(await dl1.path(),'utf8'));fs.writeFileSync(TMP+'bar_v5.json',JSON.stringify(ex1));
let m2=await mk();await importTap(m2,'#wRestore',TMP+'bar_v5.json');
ok('exportar e importar conserva subcategorías y taxonomía',JSON.stringify((await D(m2)).settings.taxonomy)===JSON.stringify(ex1.settings.taxonomy)&&ing(await D(m2),'Ginebra Nordés').subcategory==='Ginebras',null);
fs.writeFileSync(TMP+'bar_tax_mala.json',JSON.stringify({...ex1,settings:{...ex1.settings,taxonomy:'no es una lista'}}));
let m3=await mk();await importTap(m3,'#wRestore',TMP+'bar_tax_mala.json');ok('una taxonomía dañada en la copia se sustituye por la de por defecto',(await D(m3)).settings.taxonomy.length===8,null);
let m4=await mk();await tap(m4,'#wDemo');d=await D(m4);
ok('bar de ejemplo: todos sus ingredientes tienen categoría y subcategoría de la taxonomía',d.ingredients.every(i=>{const c=d.settings.taxonomy.find(x=>x.name===i.category);return c&&c.subs.some(s=>s.name===i.subcategory)}),d.ingredients.filter(i=>!i.subcategory).map(i=>i.name));

// ── 2. Pantalla «Mi barra» ───────────────────────────────────────────────────
let q=await mk();await tap(q,'#wDemo');await nav(q,'Mi barra');
const secs=async p=>p.locator('#barSections .shelf').evaluateAll(ds=>ds.map(d=>{const s=d.querySelector('summary');return{name:s.children[0].textContent,n:Number(s.querySelector('.sec-count').textContent),noPrice:(s.querySelector('.pill')||{}).textContent||''}}));
ok('«Mi barra» en la barra inferior abre la pantalla con 8 chips de categoría (Destilados marcado)',(await seen(q,'#page-bar'))&&(await q.locator('#barCats .cat-chip').count())===8&&(await q.locator('#barCats .cat-chip[aria-pressed=true]').innerText()).startsWith('Destilados'),null);
let S2=await secs(q);
ok('Destilados: 7 secciones con recuento (Ginebras 1, Rones 2, Whiskys 0…)',S2.map(s=>s.name).join('|')==='Ginebras|Rones|Whiskys|Vodkas|Tequilas y mezcales|Brandis|Licores y amargos'&&S2.find(s=>s.name==='Rones').n===2&&S2.find(s=>s.name==='Ginebras').n===1&&S2.find(s=>s.name==='Whiskys').n===0,S2);
ok('las secciones empiezan plegadas',(await q.locator('#barSections .shelf[open]').count())===0,null);
await tap(q,'#barSections .shelf[data-sub="Whiskys"] summary');
ok('sección vacía: invita a añadir el primero con «Añadir whisky»',/Todavía no hay nada en whiskys\. Añade el primero/.test(await text(q,'#barSections .shelf[data-sub="Whiskys"]'))&&(await text(q,'#barSections .shelf[data-sub="Whiskys"] .add-to-shelf'))==='Añadir whisky',null);
await tap(q,'#barSections .shelf[data-sub="Rones"] summary');
ok('sección con productos: nombre, formato, precio y coste por ml',/Ron blanco/.test(await text(q,'.shelf[data-sub="Rones"]'))&&/Botella · 700 ml · 14,00 € · 0,02 €\/ml/.test(await text(q,'.shelf[data-sub="Rones"]'))&&(await text(q,'.shelf[data-sub="Rones"] .add-to-shelf'))==='Añadir ron',await text(q,'.shelf[data-sub="Rones"]'));
await tap(q,'#barCats .cat-chip:has-text("Otros")');S2=await secs(q);
ok('chip «Otros»: Hielo 1, Lácteos 1, Guarniciones 1 con «1 sin precio», Varios 0',(await q.locator('#barCats .cat-chip[aria-pressed=true]').innerText()).startsWith('Otros')&&S2.map(s=>s.name+':'+s.n).join('|')==='Hielo:1|Lácteos:1|Guarniciones:1|Varios:0'&&S2.find(s=>s.name==='Guarniciones').noPrice==='1 sin precio',S2);
const chipH=await q.locator('#barCats .cat-chip').evaluateAll(cs=>cs.map(c=>c.getBoundingClientRect().height));ok('chips con altura ≥ 44 px',chipH.every(h=>h>=44),chipH);
// editar secciones: renombrar, ocultar, mostrar y añadir
await tap(q,'#barManage summary');
ok('«Editar las secciones de Otros» lista sus 4 secciones',(await text(q,'#barManageCat'))==='Otros'&&(await q.locator('#barManageBody input[data-old]').count())===4,null);
await q.locator('#barManageBody input[data-old="Guarniciones"]').fill('Decoración');await tap(q,'#subNew');
let d2=await D(q);ok('renombrar «Guarniciones» → «Decoración»: cambia la sección y sus productos',d2.settings.taxonomy.find(c=>c.name==='Otros').subs.some(s=>s.name==='Decoración')&&ing(d2,'Naranja deshidratada (guarnición)').subcategory==='Decoración'&&(await secs(q)).some(s=>s.name==='Decoración'&&s.n===1),null);
await tap(q,'#barManageBody .manage-row:has(input[data-old="Lácteos"]) button:has-text("Ocultar")');
ok('ocultar «Lácteos»: desaparece la sección y se avisa de que sus productos siguen en la lista completa',!(await secs(q)).some(s=>s.name==='Lácteos')&&/1 producto\(s\) en secciones ocultas/.test(await text(q,'#barManageBody')),null);
await tap(q,'#barManageBody .manage-row:has(input[data-old="Lácteos"]) button:has-text("Mostrar")');ok('«Mostrar» la recupera',(await secs(q)).some(s=>s.name==='Lácteos'),null);
await q.fill('#subNew','Hielo');await tap(q,'#subAdd');ok('no deja duplicar el nombre de una sección',/Ya hay una sección con ese nombre/.test(await text(q,'#toast'))&&(await secs(q)).filter(s=>s.name==='Hielo').length===1,null);
await tap(q,'#barCats .cat-chip:has-text("Destilados")');await q.fill('#subNew','Ginebras premium');await tap(q,'#subAdd');
ok('añadir la sección «Ginebras premium» en Destilados (vacía y abierta, con «Añadir ginebras premium»)',(await secs(q)).some(s=>s.name==='Ginebras premium'&&s.n===0)&&(await seen(q,'.shelf[data-sub="Ginebras premium"][open] .add-to-shelf')),null);
await q.waitForTimeout(500);await q.reload();await nav(q,'Mi barra');ok('los cambios de secciones persisten tras recargar',(await secs(q)).some(s=>s.name==='Ginebras premium'),null);
// lista completa y vuelta
await tap(q,'#barFullList');ok('«Lista completa» abre buscar y filtrar, y «Mi barra» sigue marcada abajo',(await seen(q,'#page-ingredients'))&&(await seen(q,'#iSearch'))&&(await q.locator('.mobile-nav button:has-text("Mi barra")').getAttribute('aria-current'))==='page',null);
await tap(q,'#backToBar');ok('«← Mi barra» vuelve a los estantes',await seen(q,'#page-bar'),null);
// ingredientes sin clasificar (copia antigua)
let u2=await mk();await importTap(u2,'#wRestore',TMP+'bar_v4.json');await nav(u2,'Mi barra');
ok('copia antigua: los productos sin subcategoría salen en «Sin clasificar» dentro de su categoría',(await secs(u2)).some(s=>s.name==='Sin clasificar'&&s.n===1),await secs(u2));
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const z=await mk(dev);await tap(z,'#wDemo');await nav(z,'Mi barra');for(const sub of ['Ginebras','Rones','Licores y amargos'])await tap(z,`#barSections .shelf[data-sub="${sub}"] summary`);await tap(z,'#barManage summary');ok(`Mi barra con secciones abiertas sin desbordamiento a ${wd} px`,await noOverflow(z),await wide(z))}

// ── 3. Alta rápida dentro de cada sección ────────────────────────────────────
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){
let a=await mk(dev);await tap(a,'#wStart');await nav(a,'Mi barra');
await tap(a,'#barSections .shelf[data-sub="Ginebras"] summary');await tap(a,'.shelf[data-sub="Ginebras"] .add-to-shelf');
const fmts=await a.locator('#qaForm .qa-fmt').allInnerTexts();
ok(`[${wd}] «Añadir ginebra» abre el alta rápida en la sección, con el foco en «Marca o nombre»`,(await seen(a,'.shelf[data-sub="Ginebras"] #qaForm'))&&(await a.evaluate(()=>document.activeElement.id))==='qaName'&&(await text(a,'#qaForm .qa-title'))==='Añadir ginebra',null);
ok(`[${wd}] formatos de destilados: 70 cl, 1 L, 50 cl, 3 L y Otro (70 cl marcado)`,fmts.join('|')==='70 cl|1 L|50 cl|3 L|Otro'&&(await a.locator('#qaForm .qa-fmt[aria-pressed=true]').innerText())==='70 cl',fmts);
const fh=await a.locator('#qaForm .qa-fmt').evaluateAll(bs=>bs.map(x=>x.getBoundingClientRect().height));ok(`[${wd}] botones de formato ≥ 44 px`,fh.every(h=>h>=44),fh);
await a.locator('#qaName').pressSequentially('Tanqueray');await a.locator('#qaPrice').pressSequentially('15,90');
ok(`[${wd}] 70 cl → 700 ml y coste por ml con precio con coma (15,90 € → 0,0227 €/ml)`,/70 cl = 700 ml · 15,90 € → 0,0227 €\/ml/.test(await text(a,'#qaPreview')),await text(a,'#qaPreview'));
await tap(a,'#qaSaveMore');let d3=await D(a);let t=ing(d3,'Tanqueray');
ok(`[${wd}] «Guardar y añadir otra»: guarda Tanqueray (Destilados › Ginebras, 700 ml, 15,90 €) y deja el formulario vacío con el foco en el primer campo`,t&&t.category==='Destilados'&&t.subcategory==='Ginebras'&&t.packQty===700&&t.unit==='ml'&&t.packPrice===15.9&&Math.abs(t.unitCost-15.9/700)<1e-12&&t.format==='70 cl'&&(await a.inputValue('#qaName'))===''&&(await a.inputValue('#qaPrice'))===''&&(await a.evaluate(()=>document.activeElement.id))==='qaName',t);
await a.locator('#qaName').pressSequentially('Beefeater');await tap(a,'#qaForm .qa-fmt:has-text("1 L")');await a.locator('#qaPrice').pressSequentially('18');
ok(`[${wd}] 1 L → 1000 ml (0,018 €/ml)`,/1 L = 1000 ml · 18,00 € → 0,018 €\/ml/.test(await text(a,'#qaPreview')),await text(a,'#qaPreview'));
await tap(a,'#qaSave');d3=await D(a);
ok(`[${wd}] «Guardar» guarda y cierra el formulario; la sección cuenta 2`,ing(d3,'Beefeater').packQty===1000&&!(await seen(a,'#qaForm'))&&/Ginebras 2/.test(await text(a,'.shelf[data-sub="Ginebras"] summary')),await text(a,'.shelf[data-sub="Ginebras"] summary'));
await tap(a,'.shelf[data-sub="Ginebras"] .add-to-shelf');await tap(a,'#qaSave');ok(`[${wd}] sin nombre no se guarda y lo explica`,/Escribe la marca o el nombre/.test(await text(a,'#toast'))&&(await D(a)).ingredients.length===2,null);
await a.locator('#qaName').pressSequentially('Tanqueray');ok(`[${wd}] avisa si el nombre ya está en tu barra`,/Ya tienes «Tanqueray» en tu barra/.test(await text(a,'#qaPreview')),null);
await a.fill('#qaName','');await a.locator('#qaName').pressSequentially('Gin Mare');await a.locator('#qaPrice').pressSequentially('doce');await tap(a,'#qaSave');
ok(`[${wd}] precio no válido: no se guarda y lo explica`,/Revisa el precio/.test(await text(a,'#toast'))&&(await D(a)).ingredients.length===2,null);
await tap(a,'#qaCancel');
// sin precio
await tap(a,'#barSections .shelf[data-sub="Rones"] summary');await tap(a,'.shelf[data-sub="Rones"] .add-to-shelf');await a.locator('#qaName').pressSequentially('Bacardí Carta Blanca');
ok(`[${wd}] sin precio: la vista previa avisa de que se guardará «Sin precio»`,/Sin precio: se guardará marcado «Sin precio»/.test(await text(a,'#qaPreview')),null);
await tap(a,'#qaSave');d3=await D(a);
ok(`[${wd}] se puede guardar sin precio: queda marcado «Sin precio» y la sección dice «1 sin precio»`,ing(d3,'Bacardí Carta Blanca').packPrice===0&&/Sin precio/.test(await text(a,'.shelf[data-sub="Rones"]'))&&/1 sin precio/.test(await text(a,'.shelf[data-sub="Rones"] summary')),null);
// otro formato
await tap(a,'#barSections .shelf[data-sub="Vodkas"] summary');await tap(a,'.shelf[data-sub="Vodkas"] .add-to-shelf');await a.locator('#qaName').pressSequentially('Absolut');await tap(a,'#qaForm .qa-fmt:has-text("Otro")');
ok(`[${wd}] «Otro» muestra el campo de formato libre con el foco`,(await seen(a,'#qaOther'))&&(await a.evaluate(()=>document.activeElement.id))==='qaOther',null);
await a.locator('#qaOther').pressSequentially('botella');ok(`[${wd}] formato libre no reconocido: lo dice`,/No reconozco el formato/.test(await text(a,'#qaPreview')),null);
await tap(a,'#qaSave');ok(`[${wd}] con formato no reconocido no se guarda`,/Revisa el formato/.test(await text(a,'#toast'))&&!ing(await D(a),'Absolut'),null);
await a.fill('#qaOther','');await a.locator('#qaOther').pressSequentially('0,7 L');await a.locator('#qaPrice').pressSequentially('13.5');
ok(`[${wd}] «0,7 L» → 700 ml (precio con punto)`,/0,7 L = 700 ml · 13,50 €/.test(await text(a,'#qaPreview')),await text(a,'#qaPreview'));
await tap(a,'#qaSave');ok(`[${wd}] guardado con formato libre: Absolut 700 ml a 13,50 €`,(i=>i&&i.packQty===700&&i.packPrice===13.5&&i.format==='0,7 L')(ing(await D(a),'Absolut')),ing(await D(a),'Absolut'));
// cervezas: 24 × 33 cl
await tap(a,'#barCats .cat-chip:has-text("Cervezas")');await tap(a,'#barSections .shelf[data-sub="Botellín y lata"] summary');await tap(a,'.shelf[data-sub="Botellín y lata"] .add-to-shelf');
ok(`[${wd}] cervezas: «Añadir cerveza» con formatos de caja (Caja 24 × 33 cl primero)`,(await text(a,'#qaForm .qa-title'))==='Añadir cerveza'&&(await a.locator('#qaForm .qa-fmt').first().innerText())==='Caja 24 × 33 cl',null);
await a.locator('#qaName').pressSequentially('Estrella Galicia');await a.locator('#qaPrice').pressSequentially('21,60 €');
ok(`[${wd}] 24 × 33 cl → 7920 ml`,/Caja 24 × 33 cl = 7920 ml · 21,60 €/.test(await text(a,'#qaPreview')),await text(a,'#qaPreview'));
await tap(a,'#qaSave');ok(`[${wd}] guardada: 7920 ml, Cervezas › Botellín y lata`,(i=>i&&i.packQty===7920&&i.unit==='ml'&&i.category==='Cervezas'&&i.subcategory==='Botellín y lata')(ing(await D(a),'Estrella Galicia')),ing(await D(a),'Estrella Galicia'));
// editar los botones de formato
await tap(a,'#barCats .cat-chip:has-text("Destilados")');await tap(a,'.shelf[data-sub="Whiskys"] summary');await tap(a,'.shelf[data-sub="Whiskys"] .add-to-shelf');await tap(a,'#qaForm .qa-formats-edit summary');
await a.fill('#qaFormatsText','70 cl; botella grande');await tap(a,'#qaFormatsSave');ok(`[${wd}] formatos editables: rechaza los que no reconoce`,/No reconozco: botella grande/.test(await text(a,'#toast'))&&(await D(a)).settings.taxonomy[0].formats.length===4,null);
await a.fill('#qaFormatsText','70 cl; 1 L; 20 cl');await tap(a,'#qaFormatsSave');
ok(`[${wd}] formatos editables: «70 cl; 1 L; 20 cl» cambia los botones de los destilados`,(await a.locator('#qaForm .qa-fmt').allInnerTexts()).join('|')==='70 cl|1 L|20 cl|Otro'&&(await D(a)).settings.taxonomy[0].formats.join('|')==='70 cl|1 L|20 cl',null);
ok(`[${wd}] Mi barra con el alta rápida abierta sin desbordamiento`,await noOverflow(a),await wide(a));
{const n=await a.evaluate(()=>[...document.querySelectorAll('#page-bar button,#page-bar label[role=button],#page-bar summary')].filter(x=>x.offsetParent).map(x=>[x.textContent.trim().slice(0,20),Math.round(x.getBoundingClientRect().height)]).filter(([,h])=>h<44));ok(`[${wd}] Mi barra: botones y cabeceras de sección ≥ 44 px`,n.length===0,n)}
}

// ── 4. Pegar una lista ───────────────────────────────────────────────────────
const LISTA=['nombre;formato;precio','Tanqueray;70cl;15,90','Ron Bacardí, 1 L, 14.5 €','','Vodka Absolut\t0,7 L\t13,50','Cerveza Estrella Galicia 24x33cl 21,60€','Tónica Schweppes caja 24 x 20 cl 12','Licor misterioso botella 9,90','Hierbabuena 100 g','   ','Tanqueray;70cl;15,90','Ron Havana;70cl;doce'].join('\n');
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){
let c=await mk(dev);await tap(c,'#wStart');await nav(c,'Mi barra');await tap(c,'#barPaste');
ok(`[${wd}] «Pegar una lista» abre el panel con el foco en el texto`,(await seen(c,'#pastePanel'))&&(await c.evaluate(()=>document.activeElement.id))==='pasteText'&&(await c.getAttribute('#barPaste','aria-expanded'))==='true',null);
await c.fill('#pasteText',LISTA);await tap(c,'#pasteReview');
const rows=()=>c.locator('.paste-row').evaluateAll(rs=>rs.map(r=>({name:r.querySelector('[id$=name]').value,fmt:r.querySelector('[id$=fmt]').value,price:r.querySelector('[id$=price]').value,sub:r.querySelector('select').value,add:r.querySelector('input[type=checkbox]').checked,dis:r.querySelector('input[type=checkbox]').disabled,warn:r.querySelector('.row-warn').innerText.replace(/\s+/g,' ')})));
let R=await rows();
ok(`[${wd}] vista previa: 9 filas (se omiten la cabecera y las líneas vacías)`,R.length===9,R.map(r=>r.name));
ok(`[${wd}] separadores «;», coma y tabulador, y texto libre`,R[0].name==='Tanqueray'&&R[0].fmt==='70cl'&&R[1].name==='Ron Bacardí'&&R[1].fmt==='1 L'&&R[2].name==='Vodka Absolut'&&R[2].fmt==='0,7 L'&&R[3].name==='Cerveza Estrella Galicia'&&R[3].fmt==='24x33cl',R.slice(0,4));
ok(`[${wd}] precios con coma, punto y €`,R[0].price==='15,90'&&R[1].price==='14.5'&&R[2].price==='13,50'&&R[3].price==='21,60'&&R[4].price==='12',R.map(r=>r.price));
ok(`[${wd}] conversión en la vista previa: 70cl = 700 ml, 1 L = 1000 ml, 0,7 L = 700 ml, 24x33cl = 7920 ml, 24 x 20 cl = 4800 ml`,/70cl = 700 ml/.test(R[0].warn)&&/1 L = 1000 ml/.test(R[1].warn)&&/0,7 L = 700 ml/.test(R[2].warn)&&/24x33cl = 7920 ml/.test(R[3].warn)&&/24 x 20 cl = 4800 ml/.test(R[4].warn),R.map(r=>r.warn).slice(0,5));
ok(`[${wd}] subcategoría sugerida por palabras clave (Ginebras, Rones, Vodkas, Botellín y lata, Tónicas, Licores y amargos, Hierbas)`,['Destilados|Ginebras','Destilados|Rones','Destilados|Vodkas','Cervezas|Botellín y lata','Refrescos y mixers|Tónicas','Destilados|Licores y amargos','Frutas, hierbas y zumos|Hierbas'].every((s,i)=>R[i].sub===s),R.map(r=>r.sub));
ok(`[${wd}] fila con formato no reconocido: error y no se puede marcar`,/Falta el formato/.test(R[5].warn)&&R[5].dis&&!R[5].add,R[5]);
ok(`[${wd}] fila sin precio: aviso y se añadirá «Sin precio»`,/Sin precio: se añadirá marcado «Sin precio»/.test(R[6].warn)&&R[6].add,R[6]);
ok(`[${wd}] posible duplicado (repetido en la lista): aviso y desmarcado`,/Posible duplicado: está repetido más arriba/.test(R[7].warn)&&!R[7].add&&!R[7].dis,R[7]);
ok(`[${wd}] precio no válido («doce»): error`,/Precio no válido \(«doce»\)/.test(R[8].warn)&&R[8].dis,R[8]);
ok(`[${wd}] «Añadir 6 productos» y resumen; todavía no se ha guardado nada`,(await text(c,'#pasteAdd'))==='Añadir 6 productos'&&/9 líneas leídas · 6 para añadir · 2 con error/.test(await text(c,'#pasteSummary'))&&(await D(c)).ingredients.length===0,await text(c,'#pasteSummary'));
// corregir en la vista previa
await c.locator('#pr5fmt').pressSequentially('70 cl');R=await rows();
ok(`[${wd}] corregir el formato de una fila con error la marca para añadir (7)`,R[5].add&&!R[5].dis&&(await text(c,'#pasteAdd'))==='Añadir 7 productos',R[5]);
await c.fill('#pr8price','');await c.locator('#pr8price').pressSequentially('16,40');await c.selectOption('#pr4sub','Refrescos y mixers|Refrescos');
ok(`[${wd}] corregir el precio la añade (8) y se puede cambiar la subcategoría sugerida`,(await text(c,'#pasteAdd'))==='Añadir 8 productos',null);
ok(`[${wd}] la vista previa sigue sin guardar nada`,(await D(c)).ingredients.length===0,null);
ok(`[${wd}] vista previa sin desbordamiento`,await noOverflow(c),await wide(c));
await tap(c,'#pasteAdd');let d4=await D(c);
const g=n=>ing(d4,n);
ok(`[${wd}] «Añadir 8 productos» guarda 8 (sin el duplicado desmarcado)`,d4.ingredients.length===8&&d4.ingredients.filter(i=>i.name==='Tanqueray').length===1,d4.ingredients.map(i=>i.name));
ok(`[${wd}] guardados con cantidades y precios correctos`,g('Tanqueray').packQty===700&&g('Tanqueray').packPrice===15.9&&g('Ron Bacardí').packQty===1000&&g('Ron Bacardí').packPrice===14.5&&g('Vodka Absolut').packQty===700&&g('Cerveza Estrella Galicia').packQty===7920&&g('Cerveza Estrella Galicia').packPrice===21.6&&g('Licor misterioso botella').packQty===700&&g('Ron Havana').packPrice===16.4,null);
ok(`[${wd}] guardados con la subcategoría elegida y «Sin precio» donde faltaba`,g('Tanqueray').subcategory==='Ginebras'&&g('Tónica Schweppes caja').subcategory==='Refrescos'&&g('Hierbabuena').category==='Frutas, hierbas y zumos'&&g('Hierbabuena').packPrice===0,null);
ok(`[${wd}] tras añadir: el panel se cierra y los estantes se actualizan`,!(await seen(c,'#pastePanel'))&&/Ginebras 1/.test(await text(c,'.shelf[data-sub="Ginebras"] summary'))&&/Rones 2/.test(await text(c,'.shelf[data-sub="Rones"] summary')),null);
await tap(c,'#barPaste');await c.fill('#pasteText','Tanqueray 70 cl 15\nsolo texto');await tap(c,'#pasteReview');R=await rows();
ok(`[${wd}] duplicado de algo que ya está en tu barra: aviso y desmarcado; sin filas válidas el botón queda desactivado`,/ya tienes «Tanqueray» en tu barra/.test(R[0].warn)&&!R[0].add&&R[1].dis&&(await c.locator('#pasteAdd').isDisabled())&&(await text(c,'#pasteAdd'))==='Añadir 0 productos',R);
await tap(c,'#pastePreview button:has-text("Cancelar")');ok(`[${wd}] «Cancelar» cierra sin guardar`,(await D(c)).ingredients.length===8&&!(await seen(c,'#pastePanel')),null);
}

// ── 5. Plantillas por tipo de negocio y asistente de clasificación ───────────
const chips=p=>p.locator('#barCats .cat-chip').allInnerTexts().then(a=>a.map(x=>x.replace(/\s*\d+$/,'').trim()));
const secNames=p=>p.locator('#barSections .shelf summary span:first-child').allInnerTexts();
let t5=await mk();await tap(t5,'#wStart');
ok('«Empezar con mi bar» pregunta el tipo de negocio: coctelería, bar, cafetería, restaurante y hotel, más «Ahora no»',(await seen(t5,'#page-template'))&&(await t5.locator('#tplList .tpl-opt b').allInnerTexts()).join('|')==='Coctelería|Bar|Cafetería|Restaurante|Hotel'&&(await seen(t5,'#tplSkip')),null);
await tap(t5,'#tplList .tpl-opt:has-text("Cafetería")');let d5=await D(t5);
ok('elegir «Cafetería»: abre la ficha, guarda el tipo de negocio y la plantilla, y no crea productos ni precios',(await seen(t5,'#page-business'))&&d5.business.type==='Cafetería'&&(await t5.inputValue('#bType'))==='Cafetería'&&d5.settings.template==='cafeteria'&&d5.ingredients.length===0&&d5.drinks.length===0,[d5.business.type,d5.settings.template]);
await nav(t5,'Mi barra');
ok('cafetería: no aparece la categoría Vinos y sí Café e infusiones',!(await chips(t5)).includes('Vinos')&&(await chips(t5)).includes('Café e infusiones'),await chips(t5));
ok('cafetería: en Destilados solo Brandis y Licores y amargos',(await secNames(t5)).join('|')==='Brandis|Licores y amargos',await secNames(t5));
await openManage(t5);await tap(t5,'#barManageBody .manage-row:has(input[data-old="Ginebras"]) button:has-text("Mostrar")');
ok('todo editable: «Mostrar» Ginebras la añade a la cafetería',(await secNames(t5)).join('|')==='Ginebras|Brandis|Licores y amargos',await secNames(t5));
let t6=await mk();await tap(t6,'#wStart');await tap(t6,'#tplList .tpl-opt:has-text("Coctelería")');await nav(t6,'Mi barra');
ok('coctelería: 7 secciones de destilados y sin Café e infusiones',(await secNames(t6)).length===7&&!(await chips(t6)).includes('Café e infusiones'),[await secNames(t6),await chips(t6)]);
let t7=await mk();await tap(t7,'#wStart');await tap(t7,'#tplSkip');await nav(t7,'Mi barra');
ok('«Ahora no, verlo todo»: las 8 categorías',(await chips(t7)).length===8&&(await D(t7)).settings.template==='',await chips(t7));
// volver a aplicar desde Ajustes (con confirmación)
await nav(t5,'Ajustes');ok('Ajustes muestra la plantilla actual',/Plantilla actual: Cafetería/.test(await text(t5,'#tplCurrent')),null);
await tap(t5,'#tplSettings button:has-text("Hotel")');ok('aplicar otra plantilla desde Ajustes pide confirmación y explica que no toca productos ni precios',(await seen(t5,'#appConfirm'))&&/no cambian/.test(await text(t5,'#appConfirmText')),null);
await tap(t5,'#appConfirmYes');await nav(t5,'Mi barra');ok('plantilla «Hotel»: se ven todas las categorías',(await chips(t5)).length===8&&(await D(t5)).settings.template==='hotel',await chips(t5));
// la plantilla no oculta secciones creadas por el usuario
await openManage(t5);await t5.fill('#subNew','Ginebras de la casa');await tap(t5,'#subAdd');await nav(t5,'Ajustes');await tap(t5,'#tplSettings button:has-text("Cafetería")');await tap(t5,'#appConfirmYes');await nav(t5,'Mi barra');
ok('volver a «Cafetería» no oculta la sección propia «Ginebras de la casa»',(await secNames(t5)).includes('Ginebras de la casa'),await secNames(t5));
// asistente «Clasificar mis ingredientes»
let w5=await mk();await importTap(w5,'#wRestore',TMP+'bar_v4.json');await nav(w5,'Mi barra');await tap(w5,'#barClassify');
const cls=()=>w5.locator('#classifyBody .paste-row').evaluateAll(rs=>rs.map(r=>({name:r.querySelector('label').textContent,sub:r.querySelector('select').value,on:r.querySelector('input').checked})));
let C=await cls();
ok('asistente: lista los 5 ingredientes sin clasificar con una sugerencia por nombre',C.length===5&&C.find(x=>x.name==='Ron añejo').sub==='Destilados|Rones'&&C.find(x=>x.name==='Cerveza botellín').sub==='Cervezas|Botellín y lata'&&C.find(x=>x.name==='Vino tinto Rioja').sub==='Vinos|Tintos'&&C.find(x=>x.name==='Leche').sub==='Otros|Lácteos'&&C.find(x=>x.name==='Limas').sub==='Frutas, hierbas y zumos|Frutas',C);
ok('asistente: «Aplicar 5 cambios» y aviso de que no ha cambiado nada todavía',(await text(w5,'#classifyApply'))==='Aplicar 5 cambios'&&/No se ha cambiado nada todavía/.test(await text(w5,'#classifySummary'))&&(await D(w5)).ingredients.every(i=>i.subcategory===''),null);
await tap(w5,'#classifyBody .paste-row:has-text("Leche") input[type=checkbox]');await w5.selectOption('#classifyBody .paste-row:has-text("Limas") select','Frutas, hierbas y zumos|Zumos');
ok('desmarcar una sugerencia y cambiar otra → «Aplicar 4 cambios»; sigue sin aplicar nada',(await text(w5,'#classifyApply'))==='Aplicar 4 cambios'&&(await D(w5)).ingredients.every(i=>i.subcategory===''),null);
await tap(w5,'#classifyApply');let d6=await D(w5);
ok('al confirmar: aplica solo los 4 marcados (con la elección del usuario) y Leche sigue sin clasificar',ing(d6,'Ron añejo').subcategory==='Rones'&&ing(d6,'Cerveza botellín').subcategory==='Botellín y lata'&&ing(d6,'Vino tinto Rioja').subcategory==='Tintos'&&ing(d6,'Limas').subcategory==='Zumos'&&ing(d6,'Leche').subcategory===''&&!(await seen(w5,'#classifyPanel')),d6.ingredients.map(i=>i.name+':'+i.subcategory));
await tap(w5,'#barClassify');ok('al volver a abrirlo queda 1 sin clasificar',(await cls()).length===1,null);
await tap(w5,'#classifyBody button:has-text("Cancelar")');ok('«Cancelar» cierra sin cambiar nada',ing(await D(w5),'Leche').subcategory===''&&!(await seen(w5,'#classifyPanel')),null);
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const z=await mk(dev);await tap(z,'#wStart');ok(`[${wd}] elegir tipo de negocio sin desbordamiento`,await noOverflow(z),await wide(z));await tap(z,'#tplSkip');const z2=await mk(dev);await importTap(z2,'#wRestore',TMP+'bar_v4.json');await nav(z2,'Mi barra');await tap(z2,'#barClassify');ok(`[${wd}] asistente de clasificación sin desbordamiento`,await noOverflow(z2),await wide(z2))}

// ── 6. Guía: «Rellena tu barra» ──────────────────────────────────────────────
let g6=await mk();await tap(g6,'#wStart');await tap(g6,'#tplSkip');await g6.fill('#bName','Bar Estantes');await g6.fill('#bLocation','Arrecife');await g6.fill('#bPeriod','Noviembre');await tap(g6,'#businessForm button:has-text("Guardar ficha")');await nav(g6,'Resumen');await tap(g6,'#guideHide');await tap(g6,'#guideShow');
ok('la guía dice «Rellena tu barra» y cuenta productos con precio (0 de 5)',/Rellena tu barra/.test(await text(g6,'#guidePanel'))&&/Con precio: 0 de 5\./.test(await text(g6,'#guidePanel')),await text(g6,'#guidePanel'));
await nav(g6,'Mi barra');
const quick=async(sub,name,price,fmtLabel)=>{await tap(g6,`.shelf[data-sub="${sub}"] .add-to-shelf`);await g6.locator('#qaName').pressSequentially(name);if(fmtLabel)await tap(g6,`#qaForm .qa-fmt:has-text("${fmtLabel}")`);if(price)await g6.locator('#qaPrice').pressSequentially(price);await tap(g6,'#qaSave')};
for(const s of ['Ginebras','Rones'])await tap(g6,`#barSections .shelf[data-sub="${s}"] summary`);
await quick('Ginebras','Tanqueray','15,90');await quick('Ginebras','Beefeater','13');await quick('Rones','Bacardí','');await quick('Rones','Havana 3','12,50');
await nav(g6,'Resumen');
ok('por subcategoría: «Con precio: 3 de 5 · Ginebras 2 · Rones 1» (el producto sin precio no cuenta)',/Con precio: 3 de 5 · Ginebras 2 · Rones 1\./.test(await text(g6,'#guideNext')),await text(g6,'#guideNext'));
await tap(g6,'#guideGo');ok('«Continuar» lleva a Mi barra',await seen(g6,'#page-bar'),null);
await tap(g6,'#barCats .cat-chip:has-text("Cervezas")');await tap(g6,'#barSections .shelf[data-sub="Botellín y lata"] summary');await tap(g6,'.shelf[data-sub="Botellín y lata"] .add-to-shelf');await g6.locator('#qaName').pressSequentially('Estrella Galicia');await g6.locator('#qaPrice').pressSequentially('21,60');await tap(g6,'#qaSaveMore');await g6.locator('#qaName').pressSequentially('Mahou');await g6.locator('#qaPrice').pressSequentially('19');await tap(g6,'#qaSave');
await nav(g6,'Resumen');
ok('con 5 productos con precio el paso queda hecho: chip «✓ Rellena tu barra» y siguiente paso',/✓ Rellena tu barra/.test(await text(g6,'#guidePanel .chips'))&&!/Siguiente: Rellena tu barra/.test(await text(g6,'#guidePanel')),await text(g6,'#guidePanel'));

// ── 7. Editables: palabras para sugerir, texto del botón y textos de ayuda ───
let e7=await mk();await tap(e7,'#wStart');await tap(e7,'#tplSkip');await nav(e7,'Mi barra');await openManage(e7);
ok('cada sección muestra su botón y sus palabras para sugerir, editables',(await e7.inputValue('#subOne1'))==='ron'&&/bacardi/.test(await e7.inputValue('#subKw1')),null);
await e7.fill('#subOne1','ron o cachaça');await tap(e7,'#subKw0');await tap(e7,'#barSections .shelf[data-sub="Rones"] summary');
ok('cambiar el texto del botón: «Añadir ron o cachaça»',(await D(e7)).settings.taxonomy[0].subs[1].one==='ron o cachaça'&&(await text(e7,'.shelf[data-sub="Rones"] .add-to-shelf'))==='Añadir ron o cachaça',null);
await e7.fill('#subKw0','ginebra, gin, xoriguer, gin de la casa');await tap(e7,'#subNew');
ok('cambiar las palabras para sugerir de Ginebras',(await D(e7)).settings.taxonomy[0].subs[0].keywords.join('|')==='ginebra|gin|xoriguer|gin de la casa',null);
await tap(e7,'#barPaste');await e7.fill('#pasteText','Xoriguer 70cl 17\nCachaça 51 1 L 9');await tap(e7,'#pasteReview');
ok('las sugerencias usan las palabras nuevas (Xoriguer → Ginebras)',(await e7.inputValue('#pr0sub'))==='Destilados|Ginebras',await e7.inputValue('#pr0sub'));
ok('lo que no reconoce queda sin subcategoría sugerida y lo avisa',/Sin subcategoría sugerida/.test(await text(e7,'#pr1warn')),await text(e7,'#pr1warn'));
await tap(e7,'#pastePreview button:has-text("Cancelar")');
ok('las claves de las ayudas «?» coinciden con la lista que valida la copia',await e7.evaluate(()=>JSON.stringify(Object.keys(HELP))===JSON.stringify(HELP_KEYS)),null);
await nav(e7,'Ajustes');await tap(e7,'#helpPanel summary');
ok('Ajustes › Textos de ayuda: explicación y ejemplo de cada ayuda',(await e7.locator('#helpEditor fieldset').count())===8&&/No es beneficio/.test(await e7.inputValue('#he_margin_t')),null);
await e7.fill('#he_margin_t','Lo que queda tras pagar la copia. No es beneficio: faltan sueldos y local.');await e7.fill('#he_margin_e','Ejemplo de la casa: 9 € − 2,10 € = 6,90 €.');await tap(e7,'#helpSave');
await nav(e7,'Bebidas');await tap(e7,'#drinkForm button.help[aria-label="Qué es: Margen bruto"]');
ok('la ayuda «?» muestra el texto editado',/Lo que queda tras pagar la copia/.test(await text(e7,'#drinkForm .help-note:not(.hidden)'))&&/Ejemplo de la casa/.test(await text(e7,'#drinkForm .help-note:not(.hidden)')),await text(e7,'#drinkForm .help-note:not(.hidden)'));
await nav(e7,'Ajustes');await e7.fill('#he_cost_t','');await tap(e7,'#helpSave');ok('una ayuda sin explicación no se guarda',/Cada ayuda necesita explicación y ejemplo/.test(await text(e7,'#toast')),null);
await tap(e7,'#helpReset');await tap(e7,'#appConfirmYes');await nav(e7,'Bebidas');
ok('«Volver a los textos originales» restablece las ayudas',/Lo que te queda del precio sin impuestos/.test(await text(e7,'#drinkForm .help-note:not(.hidden)'))&&JSON.stringify((await D(e7)).settings.help)==='{}',await text(e7,'#drinkForm .help-note:not(.hidden)'));
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const z=await mk(dev);await tap(z,'#wDemo');await nav(z,'Mi barra');await openManage(z);ok(`[${wd}] editar secciones sin desbordamiento`,await noOverflow(z),await wide(z));await nav(z,'Ajustes');await tap(z,'#helpPanel summary');ok(`[${wd}] Ajustes con los textos de ayuda abiertos sin desbordamiento`,await noOverflow(z),await wide(z))}

// FIN
ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO barra: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
