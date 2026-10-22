// Biblioteca de cócteles: integridad, tipos de ingrediente, unidades, añadir desde la biblioteca, cambiar ingrediente y restaurar.
// Emulación de móvil (390 y 360 px) y solo toques; no se llaman funciones de la app.
const {chromium,devices}=require('./env');const path=require('path');const fs=require('fs');const TMP=path.join(__dirname,'tmp')+path.sep;fs.mkdirSync(TMP,{recursive:true});const [,,F,J]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];
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
ok('35 cócteles con id, nombre, base, componentes, método, versión y revisada:false',L.cocteles.length===35&&L.cocteles.every(c=>c.id&&c.nombre&&c.base&&Array.isArray(c.componentes)&&c.componentes.length>0&&typeof c.metodo==='string'&&c.metodo.length>10&&Number.isInteger(c.version)&&c.version>=1&&c.revisada===false),null);
ok('ids únicos',new Set(L.cocteles.map(c=>c.id)).size===35,null);
const PEDIDOS=['Mojito','Daiquiri','Margarita','Cosmopolitan','Negroni','Old fashioned','Manhattan','Dry martini','Whisky sour','Tom Collins','Moscow mule','Caipirinha','Piña colada','Cuba libre','Bloody Mary','Espresso martini','Mai Tai','Paloma','Sidecar','Bellini'];
ok('incluye los 20 clásicos pedidos',PEDIDOS.every(n=>L.cocteles.some(c=>c.nombre.toLowerCase()===n.toLowerCase())),PEDIDOS.filter(n=>!L.cocteles.some(c=>c.nombre.toLowerCase()===n.toLowerCase())));
ok('incluye los 5 añadidos (Long Island Iced Tea, Sex on the Beach, Mint Julep, Kir Royal, Dark \'n\' Stormy), sin revisar',['Long Island Iced Tea','Sex on the Beach','Mint Julep','Kir Royal',"Dark 'n' Stormy"].every(n=>L.cocteles.some(c=>c.nombre===n&&c.revisada===false&&c.version===1)),L.cocteles.slice(30).map(c=>c.nombre));
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

// ── 3. Unidades no estándar ──────────────────────────────────────────────────
let u3=await mk();await tap(u3,'#wStart');await tap(u3,'#tplSkip');await nav(u3,'Ajustes');
ok('Ajustes › Equivalencias (aprox.): 1 golpe = 0,8 ml, 1 gota = 0,05 ml, 1 cucharada de bar = 5 ml, rellenar = 100 ml',(await u3.inputValue('#un_dash'))==='0,8'&&(await u3.inputValue('#un_gota'))==='0,05'&&(await u3.inputValue('#un_cucharada'))==='5'&&(await u3.inputValue('#un_rellenar'))==='100'&&/aprox\./.test(await text(u3,'#unitsPanel h3')),null);
const conv=k=>u3.evaluate(x=>compQty(x),k);
let r3=await conv({tipo:'amargo-aromatico',cantidad:2,unidad:'dash'});ok('2 golpes de amargo ≈ 1,6 ml (aprox.)',r3.qty===1.6&&r3.approx&&r3.label==='2 golpes ≈ 1,6 ml (aprox.)',r3);
r3=await conv({tipo:'amargo-aromatico',cantidad:3,unidad:'gota'});ok('3 gotas ≈ 0,15 ml (aprox.)',r3.qty===0.15&&r3.approx,r3);
r3=await conv({tipo:'sirope-simple',cantidad:1,unidad:'cucharada'});ok('1 cucharada de bar de sirope ≈ 5 ml (aprox.)',r3.qty===5&&r3.label==='1 cucharada de bar ≈ 5 ml (aprox.)',r3);
r3=await conv({tipo:'soda',cantidad:null,unidad:'rellenar'});ok('«rellenar con» soda ≈ 100 ml (aprox.)',r3.qty===100&&r3.approx&&/rellenar ≈ 100 ml \(aprox\.\)/.test(r3.label),r3);
r3=await conv({tipo:'sal-pimienta',cantidad:null,unidad:'al_gusto'});ok('«al gusto» cuesta 0 y se muestra como tal',r3.qty===0&&r3.label==='al gusto (0 €)',r3);
r3=await conv({tipo:'guarnicion',cantidad:1,unidad:'unidad',opcional:true});ok('la guarnición no cuenta en la receta (solo si le pones coste)',r3.qty===0&&/solo cuesta si le pones coste/.test(r3.label),r3);
r3=await conv({tipo:'ron-blanco',cantidad:50,unidad:'ml'});ok('las medidas en ml son exactas (sin «aprox.»)',r3.qty===50&&!r3.approx&&r3.label==='50 ml',r3);
await u3.fill('#un_dash','1');await u3.fill('#un_rellenar','120');await tap(u3,'#unitsSave');
ok('editar equivalencias: 1 golpe = 1 ml y rellenar = 120 ml se guardan',(d=>d.settings.units.dash===1&&d.settings.units.rellenar===120)(await D(u3)),(await D(u3)).settings.units);
r3=await conv({tipo:'amargo-aromatico',cantidad:2,unidad:'dash'});ok('las conversiones usan las equivalencias nuevas (2 golpes ≈ 2 ml)',r3.qty===2,r3);
await u3.fill('#un_gota','0');await tap(u3,'#unitsSave');ok('una equivalencia de 0 no se guarda y lo explica',/mayor que 0/.test(await text(u3,'#toast'))&&(await D(u3)).settings.units.gota===0.05,null);
await tap(u3,'#unitsReset');ok('«Valores por defecto» las restablece',JSON.stringify((await D(u3)).settings.units)===JSON.stringify({dash:0.8,gota:0.05,cucharada:5,rellenar:100}),null);
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const z=await mk(dev);await tap(z,'#wDemo');await nav(z,'Ajustes');ok(`[${wd}] Ajustes con equivalencias sin desbordamiento`,await noOverflow(z),await wide(z))}

const contrastFails=p=>p.evaluate(()=>{const rgb=s=>{const m=s.match(/[\d.]+/g)||[0,0,0,0];return m.map(Number)};const lum=([r,g,b])=>{const f=x=>{x/=255;return x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
 const bgOf=el=>{for(let e=el;e;e=e.parentElement){const c=rgb(getComputedStyle(e).backgroundColor);if((c[3]===undefined||c[3]>0.5))return c}return[255,255,255]};const bad=[];
 document.querySelectorAll('body *').forEach(el=>{if(!el.offsetParent&&getComputedStyle(el).position!=='fixed')return;const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||Number(cs.opacity)<0.5)return;let op=1;for(let e=el;e;e=e.parentElement)op*=Number(getComputedStyle(e).opacity);if(op<0.95)return;const a=lum(rgb(cs.color)),b2=lum(bgOf(el)),r=(Math.max(a,b2)+.05)/(Math.min(a,b2)+.05);if(r<4.5)bad.push(el.tagName+'.'+el.className+' «'+el.textContent.trim().slice(0,30)+'» '+r.toFixed(2))});return bad});
const cands=(p,tipo)=>p.evaluate(t=>libCandidates(t).map(i=>i.name),tipo);
// ── 4. Añadir desde la biblioteca ────────────────────────────────────────────
const quick=async(p,cat,sub,name,price,fmtLabel)=>{await nav(p,'Mi barra');await tap(p,`#barCats .cat-chip:has-text("${cat}")`);if(await p.locator(`.shelf[data-sub="${sub}"]`).getAttribute('open')===null)await tap(p,`#barSections .shelf[data-sub="${sub}"] summary`);await tap(p,`.shelf[data-sub="${sub}"] .add-to-shelf`);await p.locator('#qaName').pressSequentially(name);if(fmtLabel)await tap(p,`#qaForm .qa-fmt:has-text("${fmtLabel}")`);if(price)await p.locator('#qaPrice').pressSequentially(price);await tap(p,'#qaSave')};
let f=await mk();await tap(f,'#wStart');await tap(f,'#tplSkip');
await quick(f,'Destilados','Rones','Ron Carta Blanca','14');await quick(f,'Destilados','Rones','Ron Reserva 7 años','21');
await nav(f,'Bebidas');await tap(f,'#libOpen');
ok('Bebidas › «Añadir desde la biblioteca» abre la biblioteca con la nota de medidas orientativas',(await seen(f,'#page-library'))&&/orientativas/.test(await text(f,'#libNote'))&&/Ninguna es un estándar oficial/.test(await text(f,'#libNote')),await text(f,'#libNote'));
const items=p=>p.locator('#libList .lib-item b').allInnerTexts();
ok('lista de 35 cócteles con contador',(await items(f)).length===35&&/35 de 35 cócteles · 0 elegidos/.test(await text(f,'#libCount')),await text(f,'#libCount'));
await f.locator('#libSearch').pressSequentially('mojito');ok('buscar «mojito»: Mojito y Mojito sin alcohol',(await items(f)).join('|')==='Mojito|Mojito sin alcohol',await items(f));
await f.fill('#libSearch','');await f.locator('#libSearch').pressSequentially('tomate');ok('buscar por ingrediente («tomate» → Bloody Mary)',(await items(f)).join('|')==='Bloody Mary',await items(f));
await f.fill('#libSearch','');await f.locator('#libSearch').press('Backspace');await tap(f,'#libBases .cat-chip[data-base="ron"]');
ok('filtro por base «Ron»: 6 cócteles',(await items(f)).length===6&&(await items(f)).includes('Mai Tai')&&(await items(f)).includes("Dark 'n' Stormy"),await items(f));
for(const c of ['mojito','daiquiri','mai-tai'])await tap(f,`label[for="lib_${c}"]`);
ok('marcar 3 cócteles → «Revisar con mi barra (3)»',(await text(f,'#libNext'))==='Revisar con mi barra (3)',null);
await tap(f,'#libNext');
const group=t=>f.locator(`#lg_${t}`);
const opts=async t=>group(t).locator('.lib-opt span').allInnerTexts();
ok('revisar: un grupo por tipo de ingrediente (ron blanco aparece una vez para los 3 cócteles)',(await seen(f,'#libReviewTitle'))&&(await f.locator('#lg_ron-blanco').count())===1&&/En: Mojito, Daiquiri, Mai Tai/.test(await text(f,'#lg_ron-blanco')),await text(f,'#lg_ron-blanco'));
ok('con dos rones en la barra pregunta cuál usar (ninguno marcado) y los propone por parecido',/Tienes varios: elige cuál usar/.test(await text(f,'#lg_ron-blanco'))&&(await group('ron-blanco').locator('input:checked').count())===0&&(await opts('ron-blanco'))[0].startsWith('Ron Carta Blanca')&&(await opts('ron-anejo'))[0].startsWith('Ron Reserva 7 años'),[await opts('ron-blanco'),await opts('ron-anejo')]);
ok('ingrediente que no está en la barra: «No lo tengo» marcado (crear sin precio)',(await group('zumo-lima').locator('input[value="__new"]').isChecked())&&/No lo tengo: crear «Zumo de lima» en Mi barra/.test(await text(f,'#lg_zumo-lima')),null);
await tap(f,'#libCreate');ok('sin elegir los rones no crea nada y dice qué falta',/Elige un producto para: Ron blanco, Ron añejo/.test(await text(f,'#toast'))&&(await D(f)).drinks.length===0,await text(f,'#toast'));
await tap(f,'#lg_ron-blanco .lib-opt:has-text("Ron Carta Blanca")');await tap(f,'#lg_ron-anejo .lib-opt:has-text("Ron Reserva 7 años")');
await f.locator('#lg_mojito').pressSequentially('0,20');
ok('la guarnición es opcional y solo con coste si se indica',(await seen(f,'#lg_mojito'))&&(await seen(f,'#lg_daiquiri'))===false,null);
await tap(f,'#libCreate');let d4=await D(f);
const drink=n=>d4.drinks.find(x=>x.name===n),ingN=n=>d4.ingredients.find(i=>i.name===n),line=(dr,n)=>dr.recipeItems.find(l=>l.ingredientId===ingN(n).id);
ok('crea 3 bebidas con su plantilla (templateId y templateVersion)',d4.drinks.length===3&&['Mojito','Daiquiri','Mai Tai'].every(n=>drink(n)&&drink(n).templateVersion===1)&&drink('Mai Tai').templateId==='mai-tai',d4.drinks.map(x=>x.name));
ok('dos rones distintos: Mai Tai lleva 40 ml de Ron Reserva 7 años y 20 ml de Ron Carta Blanca',line(drink('Mai Tai'),'Ron Reserva 7 años').qty===40&&line(drink('Mai Tai'),'Ron Carta Blanca').qty===20&&line(drink('Mojito'),'Ron Carta Blanca').qty===50,null);
ok('«No lo tengo» crea cada ingrediente una vez en Mi barra, «Sin precio» y en su sección',['Zumo de lima','Sirope simple','Hierbabuena','Soda','Licor de naranja','Sirope de almendra'].every(n=>d4.ingredients.filter(i=>i.name===n).length===1&&ingN(n).packPrice===0)&&ingN('Zumo de lima').subcategory==='Zumos'&&ingN('Hierbabuena').unit==='g'&&ingN('Soda').packQty===4800,d4.ingredients.map(i=>i.name+':'+i.packPrice));
ok('medidas: rellenar con soda ≈ 100 ml; hierbabuena 8 g; hielo y guarnición sin coste',line(drink('Mojito'),'Soda').qty===100&&line(drink('Mojito'),'Hierbabuena').qty===8&&drink('Mojito').recipeItems.length===5&&drink('Mojito').otherCost===0.2,drink('Mojito').recipeItems);
ok('coste calculado con los precios que hay (Daiquiri: 60 ml × 0,02 €/ml = 1,20 €; el resto, sin precio)',Math.abs(drink('Daiquiri').ingredientCost-1.2)<1e-9,drink('Daiquiri').ingredientCost);
const res=await text(f,'#libStep3');
ok('al terminar muestra las bebidas con sus avisos (falta el precio, coste incompleto)',/3 bebidas creadas/.test(res)&&/Aviso: Falta el precio/.test(res)&&/Coste incompleto: Zumo de lima sin precio válido/.test(res)&&/Coste directo: 1,20 € \(con 0,20 € de guarnición\)/.test(res),res.slice(0,400));
await nav(f,'Mi barra');await tap(f,'#barCats .cat-chip:has-text("Frutas, hierbas y zumos")');ok('el ingrediente creado aparece en su estante con «Sin precio»',/Zumos 1/.test(await text(f,'.shelf[data-sub="Zumos"] summary'))&&/1 sin precio/.test(await text(f,'.shelf[data-sub="Zumos"] summary')),null);
// no duplicar
await nav(f,'Bebidas');await tap(f,'#libOpen');
ok('si el cóctel ya está en la carta lo avisa («Ya en tu carta») y no se puede marcar',/Ya en tu carta/.test(await text(f,'.lib-item:has(#lib_mojito)'))&&(await f.locator('#lib_mojito').isDisabled()),null);
await tap(f,'#libBack');await f.fill('#dName','Negroni');await f.fill('#dPrice','10');await tap(f,'#drinkForm button:has-text("Guardar bebida")');await tap(f,'#libOpen');
ok('también reconoce por el nombre una bebida creada a mano (Negroni)',(await f.locator('#lib_negroni').isDisabled())&&/Ya en tu carta/.test(await text(f,'.lib-item:has(#lib_negroni)')),null);
// opcionales, al gusto y medidas aprox.
for(const c of ['cuba-libre','margarita','old-fashioned'])await tap(f,`label[for="lib_${c}"]`);await tap(f,'#libNext');
ok('los opcionales vienen desmarcados (Cuba libre: zumo de lima)',(await seen(f,'#lo_cuba-libre_2'))&&!(await f.isChecked('#lo_cuba-libre_2')),null);
ok('«al gusto» se lista sin coste (sal y pimienta, hielo)',/Al gusto, sin coste/.test(await text(f,'#libStep2'))&&/Sal y pimienta/.test(await text(f,'#libStep2')),null);
ok('sección compartida: el licor de naranja no se propone como amargo aromático (queda «No lo tengo»)',(await f.locator('#lg_amargo-aromatico .lib-opt').count())===1&&(await f.locator('#lg_amargo-aromatico input[value="__new"]').isChecked()),await text(f,'#lg_amargo-aromatico'));
ok('el sirope de almendra no se propone como sirope simple',JSON.stringify(await cands(f,'sirope-simple'))==='["Sirope simple"]'&&JSON.stringify(await cands(f,'amargo-aromatico'))==='[]',[await cands(f,'sirope-simple'),await cands(f,'amargo-aromatico')]);
ok('cada producto ya en la barra queda elegido (un solo candidato)',(await f.locator('#lg_zumo-lima input:checked').inputValue())===ingN('Zumo de lima').id,null);
await tap(f,'#lg_ron-blanco .lib-opt:has-text("Ron Carta Blanca")');await tap(f,'#libCreate');d4=await D(f);
const of=drink('Old fashioned');
ok('Old fashioned: 2 golpes de amargo ≈ 1,6 ml y 1 cucharada de bar de sirope ≈ 5 ml (aprox.)',(k=>k.qty===1.6&&k.approx)(of.components.find(k=>k.tipo==='amargo-aromatico'))&&(k=>k.qty===5&&k.approx)(of.components.find(k=>k.tipo==='sirope-simple')),of.components.filter(k=>k.approx));
ok('Margarita: la sal «al gusto» no suma coste ni crea ingrediente',(k=>k.qty===0&&!k.ingredientId)(drink('Margarita').components.find(k=>k.tipo==='sal-pimienta'))&&!d4.ingredients.some(i=>i.name==='Sal y pimienta'),null);
ok('Cuba libre sin el opcional: sin zumo de lima en la receta',!drink('Cuba libre').recipeItems.some(l=>l.ingredientId===ingN('Zumo de lima').id),null);
// desde la guía
let g4=await mk();await tap(g4,'#wDemo');await nav(g4,'Resumen');await tap(g4,'#guideHide');await tap(g4,'#guideShow');
await nav(g4,'Ficha');await tap(g4,'#businessForm button:has-text("Guardar ficha")');
let gx=await mk();await tap(gx,'#wStart');await tap(gx,'#tplSkip');await gx.fill('#bName','B');await gx.fill('#bLocation','L');await gx.fill('#bPeriod','P');await tap(gx,'#businessForm button:has-text("Guardar ficha")');for(const [n,pr] of [['Ron A','10'],['Ron B','11'],['Ron C','12'],['Ron D','13'],['Ron E','14']])await quick(gx,'Destilados','Rones',n,pr);
await nav(gx,'Resumen');ok('guía: el paso «3 bebidas con receta» invita a la biblioteca',/biblioteca de cócteles clásicos/.test(await text(gx,'#guideNext')),await text(gx,'#guideNext'));
await tap(gx,'#guideGo');ok('guía › «Continuar» abre la biblioteca',await seen(gx,'#page-library'),null);
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const z=await mk(dev);await tap(z,'#wDemo');await nav(z,'Bebidas');await tap(z,'#libOpen');ok(`[${wd}] biblioteca sin desbordamiento`,await noOverflow(z),await wide(z));for(const c of ['bloody-mary','pisco-sour','espresso-martini'])await tap(z,`label[for="lib_${c}"]`);await tap(z,'#libNext');ok(`[${wd}] revisar con mi barra sin desbordamiento`,await noOverflow(z),await wide(z));
 for(const t of await z.locator('#libStep2 fieldset.need').evaluateAll(fs=>fs.map(x=>x.id.slice(3))))await tap(z,`#lg_${t} .lib-opt`);await tap(z,'#libCreate');ok(`[${wd}] resultado sin desbordamiento`,(await seen(z,'#libResultTitle'))&&await noOverflow(z),await wide(z));
 const small=await z.evaluate(()=>[...document.querySelectorAll('#page-library button,#page-library label.lib-opt,#page-library .lib-item')].filter(x=>x.offsetParent).map(x=>[x.textContent.trim().slice(0,20),Math.round(x.getBoundingClientRect().height)]).filter(([,h])=>h<44));ok(`[${wd}] biblioteca: objetivos táctiles ≥ 44 px`,small.length===0,small)}
{const z=await mk();await tap(z,'#wDemo');await nav(z,'Bebidas');await tap(z,'#libOpen');const cf=await contrastFails(z);for(const c of ['negroni','spritz'])await tap(z,`label[for="lib_${c}"]`);await tap(z,'#libNext');cf.push(...await contrastFails(z));ok('biblioteca y revisión: contraste ≥ 4,5:1',cf.length===0,cf.slice(0,6))}

// ── 5. Cambiar un ingrediente y restaurar medidas ────────────────────────────
let s=await mk();await tap(s,'#wStart');await tap(s,'#tplSkip');
await quick(s,'Destilados','Rones','Ron Carta Blanca','14');await quick(s,'Destilados','Rones','Ron Reserva 7 años','21');
await nav(s,'Bebidas');await tap(s,'#libOpen');await tap(s,'label[for="lib_daiquiri"]');await tap(s,'#libNext');await tap(s,'#lg_ron-blanco .lib-opt:has-text("Ron Carta Blanca")');await tap(s,'#libCreate');await tap(s,'#libGoDrinks');
await tap(s,'#drinkList tr:has-text("Daiquiri") button:has-text("Editar")');
ok('al editar una bebida de la biblioteca se ofrece «Ver receta» en vez del editor de líneas',(await seen(s,'#rcFromForm'))&&!(await seen(s,'#recipeEditor')),null);
await s.fill('#dPrice','9');await tap(s,'#drinkForm button:has-text("Guardar bebida")');
let d5=await D(s);const dq=()=>d5.drinks.find(x=>x.name==='Daiquiri'),ron=()=>dq().components.findIndex(k=>k.tipo==='ron-blanco'),lima=()=>dq().components.findIndex(k=>k.tipo==='zumo-lima'),ing5=n=>d5.ingredients.find(i=>i.name===n).id;
ok('guardar el precio conserva la receta de la biblioteca (componentes y plantilla)',dq().price===9&&dq().components.length===4&&dq().templateId==='daiquiri'&&dq().recipeItems.length===3,dq());
ok('Bebidas: las bebidas de la biblioteca tienen el botón «Receta»',(await seen(s,'#drinkList tr:has-text("Daiquiri") button:has-text("Receta")')),null);
await tap(s,'#drinkList tr:has-text("Daiquiri") button:has-text("Receta")');
const R=ron(),Li=lima();
ok('«Receta» abre la receta con coste y margen (1,20 € de coste; margen 7,80 €, 86,67 %; aclara que no es beneficio)',(await seen(s,'#page-recipe'))&&(await text(s,'#rcTitle'))==='Daiquiri'&&/Coste directo: 1,20 €/.test(await text(s,'#rcSummary'))&&/Margen bruto: 7,80 € \(86,67 ?%\)/.test(await text(s,'#rcSummary'))&&/no beneficio/.test(await text(s,'#rcSummary')),await text(s,'#rcSummary'));
ok('la pestaña Bebidas sigue marcada en la receta',(await s.locator('.mobile-nav button[aria-current="page"]').innerText()).includes('Bebidas'),null);
const optTexts=await s.locator(`#rcIng_${R} option`).allInnerTexts();
ok('para el ron solo se ofrecen productos de la misma sección (Rones)',optTexts.length===2&&optTexts[0].startsWith('Ron Carta Blanca')&&optTexts[1].startsWith('Ron Reserva 7 años'),optTexts);
ok('el zumo de lima no tiene alternativa y lo dice; muestra «Sin precio»',(await s.locator(`#rcIng_${Li} option`).count())===1&&/No hay otro producto en «Zumos»/.test(await text(s,`#rc_${Li}`))&&/Sin precio/.test(await text(s,`#rc_${Li}`)),await text(s,`#rc_${Li}`));
await s.selectOption(`#rcIng_${R}`,{label:(optTexts[1])});d5=await D(s);
ok('cambiar el ron: mantiene 60 ml, usa el Ron Reserva y recalcula al instante (1,80 €; margen 7,20 €, 80 %)',dq().components[R].ingredientId===ing5('Ron Reserva 7 años')&&dq().components[R].qty===60&&dq().recipeItems.find(l=>l.ingredientId===ing5('Ron Reserva 7 años')).qty===60&&!dq().recipeItems.some(l=>l.ingredientId===ing5('Ron Carta Blanca'))&&Math.abs(dq().ingredientCost-1.8)<1e-9&&/Coste directo: 1,80 €/.test(await text(s,'#rcSummary'))&&/Margen bruto: 7,20 € \(80 ?%\)/.test(await text(s,'#rcSummary'))&&/1,80 €/.test(await text(s,`#rcCost_${R}`)),[dq().components[R],await text(s,'#rcSummary')]);
ok('la plantilla guardada no cambia al cambiar el producto',dq().templateSnapshot[R].cantidad===60&&!('ingredientId' in dq().templateSnapshot[R]),dq().templateSnapshot[R]);
await s.fill(`#rcQty_${R}`,'45');await tap(s,'#rcTitle');d5=await D(s);
ok('cambiar la medida a 45 ml: 1,35 € y aviso «Medida cambiada (estándar: 60 ml)»',dq().components[R].qty===45&&Math.abs(dq().ingredientCost-1.35)<1e-9&&/Medida cambiada \(estándar: 60 ml\)/.test(await text(s,`#rc_${R}`))&&/Coste directo: 1,35 €/.test(await text(s,'#rcSummary')),[dq().components[R],await text(s,`#rc_${R}`)]);
await s.fill(`#rcQty_${R}`,'0');await tap(s,'#rcTitle');d5=await D(s);
ok('una cantidad 0 se rechaza y no se guarda',/mayor que 0/.test(await text(s,'#toast'))&&dq().components[R].qty===45&&(await s.inputValue(`#rcQty_${R}`))==='45',dq().components[R]);
await s.fill(`#rcQty_${R}`,'52,5');await tap(s,'#rcTitle');d5=await D(s);ok('acepta coma decimal (52,5 ml)',dq().components[R].qty===52.5,dq().components[R]);
await nav(s,'Bebidas');ok('la lista de Bebidas refleja el nuevo coste',/1,58 €/.test(await text(s,'#drinkList tr:has-text("Daiquiri")')),await text(s,'#drinkList tr:has-text("Daiquiri")'));
await tap(s,'#drinkList tr:has-text("Daiquiri") button:has-text("Receta")');await tap(s,'#rcRestore');
ok('«Restaurar medidas estándar» pide confirmación dentro de la página',(await seen(s,'#appConfirm'))&&/versión 1/.test(await text(s,'#appConfirmText')),null);
await tap(s,'#appConfirmYes');d5=await D(s);
ok('restaurar: vuelve a 60 ml y mantiene el producto elegido (1,80 €)',dq().components[R].qty===60&&dq().components[R].ingredientId===ing5('Ron Reserva 7 años')&&Math.abs(dq().ingredientCost-1.8)<1e-9&&/Tiene las medidas estándar/.test(await text(s,'#rcBody'))&&!/Medida cambiada/.test(await text(s,'#rcBody')),dq().components[R]);
{const backup=JSON.parse(JSON.stringify(await D(s)));backup.exportedAt='2026-10-21T10:00:00.000Z';
 const daq=backup.drinks.find(x=>x.name==='Daiquiri');daq.components[R].qty=55;fs.writeFileSync(TMP+'bib_v6.json',JSON.stringify(backup));
 const c=await b.newContext(PHONE);await c.clock.setFixedTime(new Date('2026-10-21T10:00:00Z'));
 await c.route(/isla_barra_control_mvp\.html/,async r=>{const resp=await r.fetch();let h=await resp.text();h=h.replace('"id":"daiquiri","nombre":"Daiquiri","base":"ron","componentes":[{"tipo":"ron-blanco","cantidad":60','"id":"daiquiri","nombre":"Daiquiri","base":"ron","componentes":[{"tipo":"ron-blanco","cantidad":70');h=h.replace(/("id":"daiquiri"[^\]]*\][^}]*"version":)1/,'$12');await r.fulfill({response:resp,body:h})});
 const u=await c.newPage();u.errs=[];u.dl=[];u.on('pageerror',e=>u.errs.push(String(e).slice(0,120)));u.on('dialog',d=>{u.dl.push(d.type());d.dismiss()});await u.goto(APP_URL);pages.push(u);
 const lib=await libOf(u),ld=lib.cocteles.find(x=>x.id==='daiquiri');
 ok('(simulación) la biblioteca actualizada trae el Daiquiri v2 con 70 ml de ron',ld.version===2&&ld.componentes[0].cantidad===70,[ld.version,ld.componentes[0]]);
 await importTap(u,'#wRestore',TMP+'bib_v6.json');let du=await D(u),q=du.drinks.find(x=>x.name==='Daiquiri');
 ok('una actualización de la biblioteca no toca la receta guardada (sigue 55 ml, versión 1)',q.components[R].qty===55&&q.templateVersion===1&&q.templateSnapshot[R].cantidad===60,[q.components[R],q.templateVersion]);
 await nav(u,'Bebidas');await tap(u,'#drinkList tr:has-text("Daiquiri") button:has-text("Receta")');await tap(u,'#rcRestore');await tap(u,'#appConfirmYes');du=await D(u);q=du.drinks.find(x=>x.name==='Daiquiri');
 ok('restaurar usa la receta original guardada (60 ml, versión 1), no la nueva de la biblioteca',q.components[R].qty===60&&q.templateVersion===1,q.components[R])}
{const v5={schema:5,app:'Isla & Barra Control',settings:{marginMin:65,mode:'full'},business:{name:'Bar v5'},sales:[],stocks:[],diagnostics:[],ingredients:[{id:'r1',name:'Ron',category:'Destilados',subcategory:'Rones',unit:'ml',packQty:700,packPrice:14,unitCost:0.02,active:true}],drinks:[{id:'d1',name:'Ron con hielo',category:'Cóctel',price:6,taxRate:0,otherCost:0,ingredientCost:1,recipeItems:[{ingredientId:'r1',qty:50}]}]};
 fs.writeFileSync(TMP+'bib_v5.json',JSON.stringify(v5));const m=await mk();await importTap(m,'#wRestore',TMP+'bib_v5.json');const dm=await D(m);
 ok('migración desde el esquema 5: esquema 6, la bebida conserva su receta y no tiene plantilla',dm.schema===6&&dm.drinks[0].recipeItems[0].qty===50&&!('templateId' in dm.drinks[0])&&!('components' in dm.drinks[0]),dm.drinks[0]);
 await nav(m,'Bebidas');ok('migración: sin botón «Receta» y con el editor de líneas de siempre',!(await seen(m,'#drinkList button:has-text("Receta")'))&&(await tap(m,'#drinkList button:has-text("Editar")'),await seen(m,'#recipeEditor')),null)}
{const z=await mk();await tap(z,'#wDemo');const dz=await D(z),FL=['mojito','cuba-libre','gin-tonic','margarita'];
 ok('bar de ejemplo: sus 4 cócteles salen de la biblioteca (plantilla, versión y componentes)',FL.every(id=>(x=>x&&x.templateId===id&&x.templateVersion===1&&x.components.length===LIBFILE.cocteles.find(c=>c.id===id).componentes.length)(dz.drinks.find(d=>d.id===id))),dz.drinks.map(d=>[d.id,d.templateId]));
 ok('bar de ejemplo: Mojito con «rellenar» soda ≈ 100 ml y Cuba libre con la lima opcional incluida',dz.drinks.find(d=>d.id==='mojito').recipeItems.find(l=>l.ingredientId==='soda').qty===100&&dz.drinks.find(d=>d.id==='cuba-libre').recipeItems.some(l=>l.ingredientId==='lima-zumo'),null);
 await nav(z,'Bebidas');await tap(z,'#libOpen');ok('bar de ejemplo: la biblioteca marca sus cócteles «Ya en tu carta»',(await z.locator('#lib_gin-tonic').isDisabled())&&(await z.locator('#lib_margarita').isDisabled()),null);
 await tap(z,'#libBack');await tap(z,'#drinkList tr:has-text("Gin-tonic") button:has-text("Receta")');ok('bar de ejemplo: la receta del gin-tonic se abre (50 ml de ginebra, tónica aprox.)',(await z.inputValue('#rcQty_0'))==='50'&&/Tónica \(aprox\.\)/.test(await text(z,'#rcBody')),await text(z,'#rcBody'))}
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const z=await mk(dev);await tap(z,'#wStart');await tap(z,'#tplSkip');await quick(z,'Destilados','Rones','Ron Carta Blanca','14');await nav(z,'Bebidas');await tap(z,'#libOpen');for(const c of ['old-fashioned','mojito','margarita'])await tap(z,`label[for="lib_${c}"]`);await tap(z,'#libNext');await tap(z,'#libCreate');await tap(z,'#libGoDrinks');
 for(const n of ['Old fashioned','Mojito','Margarita']){await tap(z,`#drinkList tr:has-text("${n}") button:has-text("Receta")`);ok(`[${wd}] receta de ${n} sin desbordamiento`,await noOverflow(z),await wide(z));
  const small=await z.evaluate(()=>[...document.querySelectorAll('#page-recipe button,#page-recipe select,#page-recipe input')].filter(x=>x.offsetParent).map(x=>[x.id||x.textContent.trim().slice(0,20),Math.round(x.getBoundingClientRect().height)]).filter(([,h])=>h<44));ok(`[${wd}] receta de ${n}: objetivos táctiles ≥ 44 px`,small.length===0,small);await tap(z,'#rcBack')}
 if(wd===390){await tap(z,'#drinkList tr:has-text("Old fashioned") button:has-text("Receta")');ok('Old fashioned: los golpes y la cucharada se marcan «aprox.»; el hielo, al gusto',(await z.locator('#page-recipe h4:has-text("aprox.")').count())===2&&/al gusto \(0 €\)/.test(await text(z,'#rcBody')),await text(z,'#rcBody'));const cf=await contrastFails(z);ok('receta: contraste ≥ 4,5:1',cf.length===0,cf.slice(0,6))}}

// ── 6. Palabras genéricas y palabra fuerte (clasificar y proponer productos) ──
{const c=await mk();await tap(c,'#wStart');await tap(c,'#tplSkip');await nav(c,'Mi barra');await tap(c,'#barPaste');
 await c.fill('#pasteText','Ron blanco 70 cl 14\nRon blanco 1 L 18\nVino blanco 75 cl 6\nTequila blanco 70 cl 18\nBlanco 70 cl 9\nWhisky reserva 70 cl 25\nVino reserva 75 cl 8\nCava brut 75 cl 7');await tap(c,'#pasteReview');
 const R=await c.locator('.paste-row').evaluateAll(rs=>rs.map(r=>[r.querySelector('[id$=name]').value,r.querySelector('select').value]));const S=Object.fromEntries(R);
 ok('clasificar: «Ron blanco» y «Ron blanco 1 L» → Rones (no Vinos › Blancos)',S['Ron blanco']==='Destilados|Rones'&&R[1][0]==='Ron blanco'&&R[1][1]==='Destilados|Rones',R);
 ok('clasificar: «Vino blanco» → Vinos › Blancos; «Tequila blanco» → Tequilas y mezcales',S['Vino blanco']==='Vinos|Blancos'&&S['Tequila blanco']==='Destilados|Tequilas y mezcales',R);
 ok('clasificar: una palabra genérica sola no clasifica («Blanco» no va a Vinos › Blancos)',S['Blanco']!=='Vinos|Blancos',R);
 ok('clasificar: manda la palabra fuerte («Whisky reserva» → Whiskys; «Vino reserva» → Tintos; «Cava brut» → Espumosos)',S['Whisky reserva']==='Destilados|Whiskys'&&S['Vino reserva']==='Vinos|Tintos'&&S['Cava brut']==='Vinos|Espumosos',R);
 const dupRow=c.locator('.paste-row').nth(1);ok('«Ron blanco 1 L» repite nombre: aviso de posible duplicado (se marca a mano)',/Posible duplicado/.test(await dupRow.locator('.row-warn').innerText()),null);if(!(await dupRow.locator('input[type=checkbox]').isChecked()))await dupRow.locator('input[type=checkbox]').tap();
 if(await c.locator('.paste-row').nth(4).locator('input[type=checkbox]').isChecked())await c.locator('.paste-row').nth(4).locator('input[type=checkbox]').tap();
 await tap(c,'#pasteAdd');const dc=await D(c);
 ok('se guardan en su sección (Ron blanco ×2 en Rones, Tequila blanco en Tequilas, Vino blanco en Blancos)',dc.ingredients.filter(i=>i.name==='Ron blanco'&&i.subcategory==='Rones').length===2&&dc.ingredients.find(i=>i.name==='Tequila blanco').subcategory==='Tequilas y mezcales'&&dc.ingredients.find(i=>i.name==='Vino blanco').subcategory==='Blancos',dc.ingredients.map(i=>i.name+':'+i.subcategory));
 await nav(c,'Bebidas');await tap(c,'#libOpen');for(const x of ['margarita','daiquiri'])await tap(c,`label[for="lib_${x}"]`);await tap(c,'#libNext');
 const o=async t=>(await c.locator(`#lg_${t} .lib-opt span`).allInnerTexts()).map(x=>x.replace(/\s+/g,' '));const oT=await o('tequila'),oR=await o('ron-blanco');
 ok('biblioteca: los candidatos del tequila no incluyen ron ni vino',oT.some(x=>/^Tequila blanco/.test(x))&&!oT.some(x=>/^(Ron|Vino)/.test(x)),oT);
 ok('biblioteca: los candidatos del ron blanco no incluyen tequila ni vino (los dos rones blancos sí)',oR.filter(x=>/^Ron blanco/.test(x)).length===2&&!oR.some(x=>/^(Tequila|Vino|Whisky)/.test(x)),oR)}
{const ings=[['u1','Ron blanco','Destilados'],['u2','Ron Carta Blanca','Destilados'],['u3','Tequila blanco','Destilados'],['u4','Tequila plata','Destilados'],['u5','Vino blanco','Vinos'],['u6','Blanco','Otros'],['u7','Vodka silver','Destilados'],['u8','Ginger beer','Refrescos y mixers']].map(([id,name,category])=>({id,name,category,subcategory:'',supplier:'',format:'70 cl',unit:'ml',packUnit:'cl',packInput:70,packQty:700,packPrice:14,unitCost:0.02,notes:'',active:true}));
 fs.writeFileSync(TMP+'bib_sin_clasificar.json',JSON.stringify({app:'Isla & Barra Control',schema:6,exportedAt:'2026-10-21T10:00:00.000Z',settings:{marginMin:65,mode:'full'},business:{name:'Bar sin clasificar'},sales:[],stocks:[],diagnostics:[],ingredients:ings,drinks:[]}));
 const c=await mk();await importTap(c,'#wRestore',TMP+'bib_sin_clasificar.json');await nav(c,'Bebidas');await tap(c,'#libOpen');for(const x of ['margarita','daiquiri','moscow-mule','gin-tonic'])await tap(c,`label[for="lib_${x}"]`);await tap(c,'#libNext');
 const o=async t=>(await c.locator(`#lg_${t} .lib-opt span`).allInnerTexts()).map(x=>x.replace(/\s+/g,' ').split(' · ')[0]);
 const oT=await o('tequila'),oR=await o('ron-blanco'),oV=await o('vodka'),oG=await o('ginebra');
 ok('sin clasificar: tequila → solo los tequilas (ni ron, ni vino, ni «Blanco» suelto)',oT.filter(x=>!/^No lo tengo/.test(x)).join('|')==='Tequila blanco|Tequila plata',oT);
 ok('sin clasificar: ron blanco → solo los rones (ni tequila, ni vino, ni «Blanco» suelto)',oR.filter(x=>!/^No lo tengo/.test(x)).join('|')==='Ron Carta Blanca|Ron blanco',oR);
 ok('sin clasificar: «Vodka silver» se propone para vodka; «Ginger beer» no es candidato a ginebra',oV.filter(x=>!/^No lo tengo/.test(x)).join('|')==='Vodka silver'&&oG.filter(x=>!/^No lo tengo/.test(x)).length===0,[oV,oG])}

// FIN
ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO biblioteca: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
