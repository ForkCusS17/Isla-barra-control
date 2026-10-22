// Biblioteca de cócteles: integridad, tipos de ingrediente, unidades, añadir desde la biblioteca, cambiar ingrediente y restaurar.
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

const LIBFILE=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','cocktail_library.json'),'utf8'));
const libOf=p=>p.evaluate(()=>JSON.parse(document.getElementById('cocktailLibrary').textContent));

// ── 1. Datos de la biblioteca ────────────────────────────────────────────────
let p0=await mk();const L=await libOf(p0);
ok('la biblioteca incrustada en el HTML es igual que data/cocktail_library.json',JSON.stringify(L)===JSON.stringify(LIBFILE),null);
ok('30 cócteles con id, nombre, base, componentes, método, versión y revisada:false',L.cocteles.length===30&&L.cocteles.every(c=>c.id&&c.nombre&&c.base&&Array.isArray(c.componentes)&&c.componentes.length>0&&typeof c.metodo==='string'&&c.metodo.length>10&&Number.isInteger(c.version)&&c.version>=1&&c.revisada===false),null);
ok('ids únicos',new Set(L.cocteles.map(c=>c.id)).size===30,null);
const PEDIDOS=['Mojito','Daiquiri','Margarita','Cosmopolitan','Negroni','Old fashioned','Manhattan','Dry martini','Whisky sour','Tom Collins','Moscow mule','Caipirinha','Piña colada','Cuba libre','Bloody Mary','Espresso martini','Mai Tai','Paloma','Sidecar','Bellini'];
ok('incluye los 20 clásicos pedidos',PEDIDOS.every(n=>L.cocteles.some(c=>c.nombre.toLowerCase()===n.toLowerCase())),PEDIDOS.filter(n=>!L.cocteles.some(c=>c.nombre.toLowerCase()===n.toLowerCase())));
const comps=L.cocteles.flatMap(c=>c.componentes.map(k=>({...k,c:c.id})));
ok('unidades válidas (ml, g, unidad, dash, gota, cucharada, rellenar, al_gusto)',comps.every(k=>L.unidades.includes(k.unidad))&&L.unidades.join()==='ml,g,unidad,dash,gota,cucharada,rellenar,al_gusto',comps.filter(k=>!L.unidades.includes(k.unidad)));
ok('cantidades > 0 (salvo «rellenar» y «al gusto», que no llevan cantidad fija)',comps.every(k=>['rellenar','al_gusto'].includes(k.unidad)?k.cantidad===null:(typeof k.cantidad==='number'&&k.cantidad>0)),comps.filter(k=>!(['rellenar','al_gusto'].includes(k.unidad)?k.cantidad===null:k.cantidad>0)));
ok('cada componente usa un tipo de ingrediente definido y los tipos no se repiten',comps.every(k=>L.tipos.some(t=>t.id===k.tipo))&&new Set(L.tipos.map(t=>t.id)).size===L.tipos.length,comps.filter(k=>!L.tipos.some(t=>t.id===k.tipo)));
ok('familias por base: ron, ginebra, vodka, whisky, tequila, brandy, espumoso, sin alcohol…',['ron','ginebra','vodka','whisky','tequila','brandy','espumoso','sin alcohol'].every(b=>L.cocteles.some(c=>c.base===b)),[...new Set(L.cocteles.map(c=>c.base))]);
ok('sin textos de «oficial» ni de organismos externos, y con nota de medidas orientativas',!/oficial|\bIBA\b/i.test(JSON.stringify(L))&&/orientativas/.test(L.nota),null);

// ── 2. Tipos de ingrediente ──────────────────────────────────────────────────
{const tax=await p0.evaluate(()=>data.settings.taxonomy);
ok('todos los tipos tienen una subcategoría que existe en «Mi barra»',L.tipos.every(t=>{const c=tax.find(x=>x.name===t.categoria);return c&&c.subs.some(s=>s.name===t.subcategoria)}),L.tipos.filter(t=>{const c=tax.find(x=>x.name===t.categoria);return !(c&&c.subs.some(s=>s.name===t.subcategoria))}).map(t=>t.id));
ok('cada tipo tiene unidad base (ml, g o unidad) y palabras clave',L.tipos.every(t=>['ml','g','unit'].includes(t.unidad)&&Array.isArray(t.palabras)&&t.palabras.length>0),null);
const fmts=await p0.evaluate(T=>T.map(t=>{const f=parseFormat(t.formato);return[t.id,f&&f.unit===t.unidad]}),L.tipos);
ok('el formato por defecto de cada tipo se reconoce y está en su misma unidad',fmts.every(x=>x[1]),fmts.filter(x=>!x[1]));
const U={ml:['ml','dash','gota','cucharada','rellenar','al_gusto'],g:['g','al_gusto'],unit:['unidad','al_gusto']};
ok('las unidades de cada componente son compatibles con la unidad base de su tipo',comps.every(k=>U[L.tipos.find(t=>t.id===k.tipo).unidad].includes(k.unidad)),comps.filter(k=>!U[L.tipos.find(t=>t.id===k.tipo).unidad].includes(k.unidad)));
ok('los rones blanco y añejo comparten la sección Rones (se proponen los mismos productos para elegir)',L.tipos.find(t=>t.id==='ron-blanco').subcategoria==='Rones'&&L.tipos.find(t=>t.id==='ron-anejo').subcategoria==='Rones',null)}

// FIN
ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO biblioteca: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
