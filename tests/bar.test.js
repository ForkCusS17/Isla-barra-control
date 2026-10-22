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
const nav=async(p,label)=>{if(MORE.includes(label)){await tap(p,'.mobile-nav button:has-text("Más")');await tap(p,`#page-more button:has-text("${label}")`)}else await tap(p,`.mobile-nav button:has-text("${label}")`)};
const importTap=async(p,sel,file)=>{const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:4000}),tap(p,sel)]);await fc.setFiles(file);await p.locator('#importConfirm').waitFor({state:'visible',timeout:3000});await tap(p,'#importYes');await p.waitForTimeout(150)};
const ing=(d,name)=>d.ingredients.find(i=>i.name===name);

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

// FIN
ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO barra: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
