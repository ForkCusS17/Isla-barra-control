// Guía paso a paso y «Mi carta»: emulación de móvil (390 y 360 px) y solo toques; no se llaman funciones de la app.
const {chromium,devices}=require('./env');const path=require('path');const fs=require('fs');const TMP=path.join(__dirname,'tmp')+path.sep;fs.mkdirSync(TMP,{recursive:true});const [,,F]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];
const {smallTargets,contrastFails}=require('./helpers');
const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const KEY='islaBarraControlMVP_v1';
const PHONE={...devices['iPhone 13'],acceptDownloads:true,reducedMotion:'reduce'},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
(async()=>{const b=await chromium.launch();const pages=[];
const mk=async(dev=PHONE,seed)=>{const c=await b.newContext(dev);await c.clock.setFixedTime(new Date('2026-10-21T10:00:00Z'));if(seed)await c.addInitScript(([k,s])=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem(k,s)},[KEY,JSON.stringify(seed)]);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,120)));p.on('dialog',d=>{p.dl.push(d.type()+': '+d.message().slice(0,60));d.dismiss()});await p.goto(APP_URL);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0])});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').trim());
const D=p=>p.evaluate(()=>JSON.parse(JSON.stringify(data)));
// En emulación móvil innerWidth crece si algo se sale: se compara con el ancho del dispositivo.
const wide=async p=>[await p.evaluate(()=>document.documentElement.scrollWidth),p.viewportSize().width];
const noOverflow=async p=>{const w=await wide(p);return w[0]<=w[1]+1};
const MORE=['Ficha','Diagnóstico','Informe','Ajustes'];
const nav=async(p,label)=>{if(MORE.includes(label)){await tap(p,'.mobile-nav button:has-text("Más")');await tap(p,`#page-more button:has-text("${label}")`)}else await tap(p,`.mobile-nav button:has-text("${label}")`)};
const quick=async(p,cat,sub,name,price)=>{await nav(p,'Mi barra');await tap(p,`#barCats .cat-chip:has-text("${cat}")`);if(await p.locator(`.shelf[data-sub="${sub}"]`).getAttribute('open')===null)await tap(p,`#barSections .shelf[data-sub="${sub}"] summary`);await tap(p,`.shelf[data-sub="${sub}"] .add-to-shelf`);await p.locator('#qaName').pressSequentially(name);if(price)await p.locator('#qaPrice').pressSequentially(price);await tap(p,'#qaSave')};
const sb=(p,pg)=>text(p,'#sb_'+pg);
// Página visible con su contenido cargado
const shown=async(p,pg)=>p.locator('#page-'+pg).isVisible();
// Elige el primer producto en los grupos de la biblioteca que piden elegir
const libPick=async(p,ids)=>{for(const c of ids)await tap(p,`label[for="lib_${c}"]`);await tap(p,'#libNext');for(let i=0;i<10;i++){const n=p.locator('#libStep2 fieldset.need');if(!(await n.count()))break;await n.first().locator('.lib-opt').first().tap()}await tap(p,'#libCreate')};
const checkScreen=async(p,wd,label)=>{ok(`[${wd}] ${label}: sin desbordamiento horizontal`,await noOverflow(p),await wide(p));const s=await smallTargets(p,'.page:not(.hidden)');ok(`[${wd}] ${label}: objetivos táctiles ≥ 44 px`,s.length===0,s.slice(0,5))};

// ── 1. Guía: cada paso, de principio a fin, a 390 y 360 px ──────────────────
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const g=await mk(dev);await tap(g,'#wStart');await tap(g,'#tplSkip');await nav(g,'Resumen');
 // Paso 1: ficha
 await tap(g,'#guideGo');
 ok(`[${wd}] paso 1 · «Continuar» abre la Ficha con su formulario`,(await shown(g,'business'))&&(await seen(g,'#businessForm #bName')),null);
 ok(`[${wd}] paso 1 · barra de guía «Paso 1 de 6 · Ficha completa · Datos necesarios: 0 de 3» y qué falta`,/^Paso 1 de 6 · Ficha completa · Datos necesarios: 0 de 3/.test(await sb(g,'business'))&&/Falta: nombre, localidad, periodo analizado/.test(await sb(g,'business'))&&!(await seen(g,'#sb_business .stepbar-next')),await sb(g,'business'));
 ok(`[${wd}] ficha: nombre, localidad y periodo dicen «Necesario para la guía y el informe»`,(await g.locator('#page-business small:has-text("Necesario para la guía y el informe")').count())===3&&(await g.getAttribute('#bPeriod','aria-describedby'))==='bPeriodReq',null);
 await checkScreen(g,wd,'Ficha con barra de guía');
 await g.fill('#bName','Bar Prueba');await g.fill('#bLocation','Teguise');await tap(g,'#businessForm button:has-text("Guardar ficha")');
 ok(`[${wd}] ficha sin periodo: al guardar dice en la ficha «Falta: periodo analizado»`,(await seen(g,'#businessMissing'))&&/^Falta: periodo analizado\./.test(await text(g,'#businessMissing')),await text(g,'#businessMissing').catch(()=>''));
 ok(`[${wd}] el progreso se actualiza en vivo: «Datos necesarios: 2 de 3» · «Falta: periodo analizado»`,/Datos necesarios: 2 de 3/.test(await sb(g,'business'))&&/Falta: periodo analizado\./.test(await sb(g,'business')),await sb(g,'business'));
 await g.fill('#bPeriod','1–7 octubre');await tap(g,'#businessForm button:has-text("Guardar ficha")');
 ok(`[${wd}] ficha completa: desaparece el aviso y la barra dice «✓ Paso completado»`,!(await seen(g,'#businessMissing'))&&/✓ Paso completado/.test(await sb(g,'business'))&&/Datos necesarios: 3 de 3/.test(await sb(g,'business')),await sb(g,'business'));
 ok(`[${wd}] «Siguiente paso: Rellena tu barra»`,(await text(g,'#sb_business .stepbar-next'))==='Siguiente paso: Rellena tu barra',null);
 await tap(g,'#sb_business .stepbar-next');
 // Paso 2: barra
 ok(`[${wd}] paso 2 · «Siguiente paso» abre Mi barra con sus estantes`,(await shown(g,'bar'))&&(await g.locator('#barSections .shelf').filter({visible:true}).count())>0,null);
 ok(`[${wd}] paso 2 · «Paso 2 de 6 · Rellena tu barra · Con precio: 0 de 5» y cuántos faltan`,/^Paso 2 de 6 · Rellena tu barra · Con precio: 0 de 5/.test(await sb(g,'bar'))&&/Faltan 5 productos con formato y precio de compra/.test(await sb(g,'bar')),await sb(g,'bar'));
 await nav(g,'Resumen');await tap(g,'#guideGo');ok(`[${wd}] paso 2 · «Continuar» del Resumen lleva al mismo sitio (Mi barra)`,await shown(g,'bar'),null);
 await quick(g,'Destilados','Rones','Ron Carta Blanca','14');
 ok(`[${wd}] el progreso del paso 2 se actualiza al guardar: «Con precio: 1 de 5»`,/Con precio: 1 de 5/.test(await sb(g,'bar'))&&/Faltan 4 productos/.test(await sb(g,'bar')),await sb(g,'bar'));
 await quick(g,'Destilados','Ginebras','Ginebra London','15');await quick(g,'Destilados','Vodkas','Vodka Norte','12');await quick(g,'Destilados','Rones','Ron Oscuro','16');await quick(g,'Destilados','Ginebras','Ginebra Sin Precio','');
 ok(`[${wd}] productos sin precio: la barra dice cuántos son y ofrece «Poner precios (1)»`,/Tienes 1 producto sin precio/.test(await sb(g,'bar'))&&(await text(g,'#sb_bar .stepbar-unpriced'))==='Poner precios (1)',await sb(g,'bar'));
 await nav(g,'Resumen');
 ok(`[${wd}] también en la guía del Resumen: «Tienes 1 producto sin precio» y su botón`,/Tienes 1 producto sin precio/.test(await text(g,'#guideUnpricedText'))&&(await text(g,'#guideUnpriced'))==='Poner precios (1)',await text(g,'#guideNext'));
 await tap(g,'#guideUnpriced');
 ok(`[${wd}] «Poner precios» abre la lista completa filtrada por «Sin precio válido» con ese producto`,(await shown(g,'ingredients'))&&(await g.inputValue('#iFilter'))==='__invalid'&&/^1 de 5$/.test(await text(g,'#ingredientListCount'))&&/Ginebra Sin Precio/.test(await text(g,'#ingredientList')),[await text(g,'#ingredientListCount'),await g.inputValue('#iFilter')]);
 ok(`[${wd}] la lista completa también lleva la barra del paso 2`,/^Paso 2 de 6 · Rellena tu barra · Con precio: 4 de 5/.test(await sb(g,'ingredients')),await sb(g,'ingredients'));
 await quick(g,'Destilados','Vodkas','Vodka Sur','11');
 ok(`[${wd}] paso 2 completado: «✓ Paso completado» y «Siguiente paso: Mi carta: 3 bebidas con receta»`,/✓ Paso completado/.test(await sb(g,'bar'))&&(await text(g,'#sb_bar .stepbar-next'))==='Siguiente paso: Mi carta: 3 bebidas con receta',await sb(g,'bar'));
 await tap(g,'#sb_bar .stepbar-next');
 // Paso 3: Mi carta (biblioteca inicializada)
 ok(`[${wd}] paso 3 · «Siguiente paso» abre la biblioteca ya cargada (35 cócteles, filtros y contador)`,(await shown(g,'library'))&&(await g.locator('#libList .lib-item').count())===35&&(await g.locator('#libBases .cat-chip').count())>1&&/35 de 35 cócteles · 0 elegidos/.test(await text(g,'#libCount')),await text(g,'#libCount').catch(()=>''));
 ok(`[${wd}] paso 3 · «Paso 3 de 6 · Mi carta: 3 bebidas con receta · Con receta: 0 de 3»`,/^Paso 3 de 6 · Mi carta: 3 bebidas con receta · Con receta: 0 de 3/.test(await sb(g,'library'))&&/Faltan 3 bebidas con receta/.test(await sb(g,'library')),await sb(g,'library'));
 await checkScreen(g,wd,'biblioteca con barra de guía');
 await nav(g,'Resumen');await tap(g,'#guideGo');
 ok(`[${wd}] paso 3 · «Continuar» del Resumen abre la biblioteca inicializada (no vacía)`,(await shown(g,'library'))&&(await g.locator('#libList .lib-item').count())===35&&(await g.locator('#libNext').isVisible()),await g.locator('#libList .lib-item').count());
 await libPick(g,['daiquiri','gin-tonic']);
 ok(`[${wd}] paso 3 · el progreso se actualiza: «Con receta: 2 de 3»`,/Con receta: 2 de 3/.test(await sb(g,'library'))&&/Falta 1 bebida con receta/.test(await sb(g,'library')),await sb(g,'library'));
 await tap(g,'#libMore');await libPick(g,['moscow-mule']);
 ok(`[${wd}] paso 3 completado en la biblioteca: «✓ Paso completado» y «Siguiente paso: Ventas y un control de stock»`,/✓ Paso completado/.test(await sb(g,'library'))&&/Con receta: 3 de 3/.test(await sb(g,'library'))&&(await text(g,'#sb_library .stepbar-next'))==='Siguiente paso: Ventas y un control de stock',await sb(g,'library'));
 await nav(g,'Carta');ok(`[${wd}] Mi carta también muestra el paso 3 completado`,/^Paso 3 de 6 · Mi carta: 3 bebidas con receta · Con receta: 3 de 3/.test(await sb(g,'drinks'))&&/✓ Paso completado/.test(await sb(g,'drinks')),await sb(g,'drinks'));
 await tap(g,'#sb_drinks .stepbar-next');
 // Paso 4: ventas y control
 ok(`[${wd}] paso 4 · «Siguiente paso» abre Stock con ventas y control`,(await shown(g,'stock'))&&(await seen(g,'#salesForm'))&&(await seen(g,'#stockForm'))&&(await g.locator('#salesLines input').count())===3,null);
 ok(`[${wd}] paso 4 · qué falta: ventas y un control`,/^Paso 4 de 6 · Ventas y un control de stock · Ventas: no · Controles: 0/.test(await sb(g,'stock'))&&/Falta: anotar las ventas del periodo .* y guardar un control de stock/.test(await sb(g,'stock')),await sb(g,'stock'));
 await nav(g,'Resumen');await tap(g,'#guideGo');ok(`[${wd}] paso 4 · «Continuar» del Resumen abre Stock`,await shown(g,'stock'),null);
 await g.fill('#vStart','2026-10-01');await g.fill('#vEnd','2026-10-07');await g.locator('#salesLines input').first().fill('10');await tap(g,'#salesForm button:has-text("Guardar ventas")');
 ok(`[${wd}] paso 4 · al guardar ventas: «Ventas: sí · Controles: 0» y solo falta el control`,/Ventas: sí · Controles: 0/.test(await sb(g,'stock'))&&/^.*Falta: guardar un control de stock/.test(await sb(g,'stock'))&&!/anotar las ventas/.test(await sb(g,'stock')),await sb(g,'stock'));
 for(const [k,x] of Object.entries({sProduct:'Ron Carta Blanca',sStart:'2026-10-01',sEnd:'2026-10-07',sOpening:'7000',sPurchases:'2800',sClosing:'3500',sSalesUse:'5000',sTastings:'800'}))await g.fill('#'+k,x);
 await tap(g,'#stockForm button:has-text("Calcular y guardar control")');
 ok(`[${wd}] paso 4 completado: «Siguiente paso: Un hallazgo con evidencia»`,/✓ Paso completado/.test(await sb(g,'stock'))&&(await text(g,'#sb_stock .stepbar-next'))==='Siguiente paso: Un hallazgo con evidencia',await sb(g,'stock'));
 await tap(g,'#sb_stock .stepbar-next');
 // Paso 5: hallazgo
 ok(`[${wd}] paso 5 · abre Diagnóstico con su formulario y dice qué falta`,(await shown(g,'diagnosis'))&&(await seen(g,'#diagForm #diagFinding'))&&/^Paso 5 de 6 · Un hallazgo con evidencia · Con evidencia: 0 de 1/.test(await sb(g,'diagnosis'))&&/Falta: guardar un hallazgo con su evidencia/.test(await sb(g,'diagnosis')),await sb(g,'diagnosis'));
 await nav(g,'Resumen');await tap(g,'#guideGo');ok(`[${wd}] paso 5 · «Continuar» del Resumen abre Diagnóstico`,await shown(g,'diagnosis'),null);
 await g.fill('#diagFinding','Sin medidor en barra');await g.fill('#diagEvidence','Control 1–7 oct: +500 ml');await g.fill('#diagAction','Usar medidor 7 días');await tap(g,'#diagForm button:has-text("Guardar hallazgo")');
 ok(`[${wd}] paso 5 completado: «Siguiente paso: Informe revisado»`,/Con evidencia: 1 de 1/.test(await sb(g,'diagnosis'))&&/✓ Paso completado/.test(await sb(g,'diagnosis'))&&(await text(g,'#sb_diagnosis .stepbar-next'))==='Siguiente paso: Informe revisado',await sb(g,'diagnosis'));
 await tap(g,'#sb_diagnosis .stepbar-next');
 // Paso 6: informe
 ok(`[${wd}] paso 6 · abre el Informe ya generado y dice qué falta`,(await shown(g,'report'))&&/Bar Prueba/.test(await text(g,'#reportContent'))&&/^Paso 6 de 6 · Informe revisado · Revisado: no/.test(await sb(g,'report'))&&/He revisado el informe/.test(await sb(g,'report')),await sb(g,'report'));
 ok(`[${wd}] la barra de guía no se imprime (no-print)`,await g.locator('#sb_report').evaluate(e=>e.classList.contains('no-print')),null);
 await checkScreen(g,wd,'Informe con barra de guía');
 await nav(g,'Resumen');await tap(g,'#guideGo');ok(`[${wd}] paso 6 · «Continuar» del Resumen abre el Informe`,(await shown(g,'report'))&&/Bar Prueba/.test(await text(g,'#reportContent')),null);
 await tap(g,'#reportReviewed');
 ok(`[${wd}] paso 6 completado: «✓ Paso completado · Guía completada», sin «Siguiente paso»`,/✓ Paso completado · Guía completada/.test(await sb(g,'report'))&&/Revisado: sí/.test(await sb(g,'report'))&&!(await seen(g,'#sb_report .stepbar-next')),await sb(g,'report'));
 const sbBtn=await g.locator('#sb_report .stepbar-home').evaluate(e=>e.getBoundingClientRect().height);ok(`[${wd}] botones de la barra de guía ≥ 44 px`,sbBtn>=44,sbBtn);
 await tap(g,'#sb_report .stepbar-home');
 ok(`[${wd}] «← Resumen» vuelve al Resumen, con la guía completada`,(await shown(g,'dashboard'))&&/Guía completada/.test(await text(g,'#guidePanel')),null);
}
// La barra de guía no aparece si la guía está oculta
{const h=await mk();await tap(h,'#wStart');await tap(h,'#tplSkip');await nav(h,'Resumen');await tap(h,'#guideHide');await nav(h,'Stock');
 ok('con la guía oculta no se muestra la barra de paso',!(await seen(h,'#sb_stock')),null);
 await nav(h,'Resumen');await tap(h,'#guideShow');await nav(h,'Stock');ok('al mostrar la guía vuelve la barra de paso',await seen(h,'#sb_stock'),null)}

// ── 2. Mi carta ─────────────────────────────────────────────────────────────
// Datos antiguos (esquema 5): categorías de siempre y una desconocida; no se migran.
const OLD={schema:5,app:'Isla & Barra Control',settings:{marginMin:65,mode:'full'},business:{name:'Bar Antiguo'},sales:[],stocks:[],diagnostics:[],
 ingredients:[{id:'r1',name:'Ron',category:'Destilados',subcategory:'Rones',unit:'ml',packQty:700,packPrice:14,unitCost:0.02,active:true},{id:'g1',name:'Ginebra',category:'Destilados',subcategory:'Ginebras',unit:'ml',packQty:700,packPrice:21,unitCost:0.03,active:true},{id:'t1',name:'Tónica',category:'Refrescos y mezcladores',subcategory:'',unit:'ml',packQty:200,packPrice:0,unitCost:0,active:true}],
 drinks:[{id:'d1',name:'Ron con hielo',category:'Cóctel',price:6,taxRate:0,otherCost:0,recipeItems:[{ingredientId:'r1',qty:50}]},
  {id:'d2',name:'Gin-tonic de la casa',category:'Cóctel',price:9,taxRate:0,otherCost:0,recipeItems:[{ingredientId:'g1',qty:50},{ingredientId:'t1',qty:200}]},
  {id:'d3',name:'Albariño copa',category:'Vino',price:3.5,taxRate:0,otherCost:0,recipeItems:[{ingredientId:'r1',qty:75}]},
  {id:'d4',name:'Caña',category:'Cerveza',price:0,taxRate:0,otherCost:0.6,recipeItems:[]},
  {id:'d5',name:'Café solo',category:'Café',price:1.4,taxRate:0,otherCost:0.1,recipeItems:[]},
  {id:'d6',name:'Agua',category:'Otro',price:1.5,taxRate:0,otherCost:0.2,recipeItems:[]},
  {id:'d7',name:'Licor de hierbas',category:'Licor',price:3,taxRate:0,otherCost:2.5,recipeItems:[]}]};
const formDiag=p=>p.evaluate(()=>{const f=document.getElementById('drinkForm');return{visible:!!(f&&f.offsetParent),valid:f?f.checkValidity():null,invalid:f?[...f.elements].filter(e=>e.willValidate&&!e.checkValidity()).map(e=>e.id+'='+e.value+' ('+e.validationMessage+')'):[],active:document.activeElement&&(document.activeElement.id||document.activeElement.tagName),drinks:data.drinks.length,ev:(window.__ev||[]).slice(-8)}}).catch(e=>String(e));
const watchForm=p=>p.evaluate(()=>{window.__ev=[];if(window.__evOn)return;window.__evOn=1;['pointerdown','touchstart','touchend','mousedown','click','submit','invalid'].forEach(t=>document.addEventListener(t,e=>window.__ev.push(t+':'+(e.target.id||e.target.tagName+'«'+(e.target.textContent||'').trim().slice(0,14)+'»')),true))});
const rowNames=p=>p.locator('#drinkList .carta-row .cr-name').allInnerTexts();
const rowCosts=async p=>(await p.locator('#drinkList .carta-row .cr-nums').allInnerTexts()).map(t=>{const m=t.replace(/\s+/g,' ').match(/Coste ([\d.,]+) €/);return m?Number(m[1].replace(/\./g,'').replace(',','.')):NaN});
const rowMargins=async p=>(await p.locator('#drinkList .carta-row .cr-nums').allInnerTexts()).map(t=>{const m=t.replace(/\s+/g,' ').match(/Margen ([-\d.,]+) ?%/);return m?Number(m[1].replace(/\./g,'').replace(',','.')):null});
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const c=await mk(dev,OLD);await nav(c,'Carta');
 if(wd===390){const dc=await D(c);ok('datos antiguos: las bebidas conservan su categoría tal cual (también «Licor») y nada cambia',JSON.stringify(dc.drinks.map(d=>[d.id,d.name,d.category,d.price]))===JSON.stringify(OLD.drinks.map(d=>[d.id,d.name,d.category,d.price])),dc.drinks.map(d=>d.category))}
 ok(`[${wd}] Mi carta muestra primero la lista, no el formulario`,(await seen(c,'#drinkList .carta-row'))&&!(await seen(c,'#drinkForm')),null);
 ok(`[${wd}] título «Mi carta» y pestaña «Carta» marcada`,(await text(c,'#page-drinks .page-title'))==='Mi carta'&&(await c.locator('.mobile-nav button:has-text("Carta")').getAttribute('aria-current'))==='page',null);
 const chips=(await c.locator('#cartaCats .cat-chip').allInnerTexts()).map(t=>t.replace(/\s+/g,' ').trim());
 ok(`[${wd}] chips con recuento, solo los que tienen bebidas: Todas 7 · Cócteles 2 · Vinos 1 · Cervezas 1 · Cafés 1 · Otras 2`,chips.join('|')==='Todas 7|Cócteles 2|Vinos 1|Cervezas 1|Cafés 1|Otras 2',chips);
 ok(`[${wd}] «Todas» marcada al empezar`,(await c.locator('#cartaCats .cat-chip[aria-pressed=true]').innerText()).startsWith('Todas'),null);
 await tap(c,'#cartaCats .cat-chip:has-text("Cócteles")');
 ok(`[${wd}] chip «Cócteles» filtra (2) y queda marcado`,(await rowNames(c)).join('|')==='Gin-tonic de la casa|Ron con hielo'&&(await c.locator('#cartaCats .cat-chip:has-text("Cócteles")').getAttribute('aria-pressed'))==='true'&&/2 de 7 bebidas/.test(await text(c,'#drinkCount')),await rowNames(c));
 await tap(c,'#cartaCats .cat-chip:has-text("Otras")');
 ok(`[${wd}] «Otras» reúne «Otro» y categorías desconocidas`,(await rowNames(c)).join('|')==='Agua|Licor de hierbas',await rowNames(c));
 await tap(c,'#cartaCats .cat-chip:has-text("Todas")');
 ok(`[${wd}] orden por nombre (A-Z) por defecto`,(await rowNames(c)).join('|')==='Agua|Albariño copa|Café solo|Caña|Gin-tonic de la casa|Licor de hierbas|Ron con hielo',await rowNames(c));
 const row=await text(c,'#drinkList .carta-row:has-text("Ron con hielo")');
 ok(`[${wd}] cada fila: nombre, categoría, precio de venta, coste directo y margen % (Ron con hielo: 6,00 €, 1,00 €, 83,33 %)`,/Ron con hielo/.test(row)&&/Cóctel/.test(row)&&/Precio 6,00 €/.test(row)&&/Coste 1,00 €/.test(row)&&/Margen 83,33 ?%/.test(row),row);
 ok(`[${wd}] etiquetas de aviso: «Falta el precio», «Coste incompleto» y «Revisar»`,/Falta el precio/.test(await text(c,'#drinkList .carta-row:has-text("Caña")'))&&/Coste incompleto/.test(await text(c,'#drinkList .carta-row:has-text("Gin-tonic")'))&&/Revisar/.test(await text(c,'#drinkList .carta-row:has-text("Albariño")')),[await text(c,'#drinkList .carta-row:has-text("Caña")'),await text(c,'#drinkList .carta-row:has-text("Gin-tonic")')]);
 await c.selectOption('#cartaSort','cost');const cs=await rowCosts(c);
 ok(`[${wd}] ordenar por coste: de mayor a menor`,cs.length===7&&cs.every((x,i)=>i===0||cs[i-1]>=x)&&(await rowNames(c))[0]==='Licor de hierbas',[await rowNames(c),cs]);
 await c.selectOption('#cartaSort','margin');const ms=await rowMargins(c),known=ms.filter(x=>x!==null);
 ok(`[${wd}] ordenar por margen: de menor a mayor y sin precio al final`,known.every((x,i)=>i===0||known[i-1]<=x)&&ms[ms.length-1]===null&&(await rowNames(c))[6]==='Caña',[await rowNames(c),ms]);
 await c.selectOption('#cartaSort','name');
 await c.locator('#cartaSearch').pressSequentially('gin');
 ok(`[${wd}] buscador por nombre («gin»)`,(await rowNames(c)).join('|')==='Gin-tonic de la casa'&&/1 de 7 bebidas/.test(await text(c,'#drinkCount')),await rowNames(c));
 await c.fill('#cartaSearch','zzz');ok(`[${wd}] búsqueda sin resultados lo dice`,/Ninguna bebida coincide/.test(await text(c,'#drinkList')),null);
 await c.fill('#cartaSearch','');await c.locator('#cartaSearch').dispatchEvent('input');
 await checkScreen(c,wd,'Mi carta (lista)');
 // abrir una bebida propia: receta con editar y eliminar
 await tap(c,'#drinkList .carta-row:has-text("Ron con hielo")');
 ok(`[${wd}] tocar una fila abre su receta (ingredientes y coste), con «Editar» y «Eliminar»`,(await shown(c,'recipe'))&&(await text(c,'#rcTitle'))==='Ron con hielo'&&/Ron/.test(await text(c,'#rcLines'))&&/50 ml/.test(await text(c,'#rcLines'))&&/Coste directo: 1,00 €/.test(await text(c,'#rcSummary'))&&(await seen(c,'#rcEdit'))&&(await seen(c,'#rcDelete')),await text(c,'#rcBody'));
 await checkScreen(c,wd,'receta propia');
 await tap(c,'#rcEdit');
 ok(`[${wd}] «Editar» abre el formulario con la bebida`,(await seen(c,'#drinkForm'))&&(await c.inputValue('#dName'))==='Ron con hielo'&&(await text(c,'#drinkFormTitle'))==='Editar bebida',null);
 await c.fill('#dPrice','7');await watchForm(c);await tap(c,'#drinkForm button:has-text("Guardar bebida")');
 ok(`[${wd}] al guardar se cierra el formulario y la fila muestra el precio nuevo`,!(await seen(c,'#drinkForm'))&&/Precio 7,00 €/.test(await text(c,'#drinkList .carta-row:has-text("Ron con hielo")')),[await text(c,'#drinkList .carta-row:has-text("Ron con hielo")'),await formDiag(c)]);
 await tap(c,'#drinkList .carta-row:has-text("Agua")');await tap(c,'#rcDelete');
 ok(`[${wd}] «Eliminar» pide confirmación dentro de la página`,(await seen(c,'#appConfirm'))&&/Agua/.test(await text(c,'#appConfirmText')),null);
 await tap(c,'#appConfirmYes');
 ok(`[${wd}] eliminada: vuelve a Mi carta, ya no está y «Otras» baja a 1`,(await shown(c,'drinks'))&&!(await rowNames(c)).includes('Agua')&&/Otras ?1/.test((await c.locator('#cartaCats .cat-chip:has-text("Otras")').innerText()).replace(/\s+/g,' ')),await rowNames(c));
 // añadir bebida a mano
 await tap(c,'#drinkAdd');
 ok(`[${wd}] «Añadir bebida» abre el formulario vacío`,(await seen(c,'#drinkForm'))&&(await c.inputValue('#dName'))===''&&(await c.locator('#drinkAdd').getAttribute('aria-expanded'))==='true',null);
 await checkScreen(c,wd,'Mi carta con el formulario');
 await c.fill('#dName','Refresco de cola');await c.selectOption('#dCategory','Refresco');await c.fill('#dPrice','2.5');await watchForm(c);await tap(c,'#drinkForm button:has-text("Guardar bebida")');
 ok(`[${wd}] la bebida nueva aparece en la lista y crea el chip «Refrescos 1»`,(await rowNames(c)).includes('Refresco de cola')&&(await c.locator('#cartaCats .cat-chip').allInnerTexts()).map(t=>t.replace(/\s+/g,' ').trim()).includes('Refrescos 1'),[await c.locator('#cartaCats .cat-chip').allInnerTexts(),await formDiag(c)]);
 ok(`[${wd}] el resumen de la carta queda debajo de la lista`,await c.evaluate(()=>{const l=document.getElementById('cartaPanel'),s=document.getElementById('drinkSummaryPanel');return!!(l.compareDocumentPosition(s)&Node.DOCUMENT_POSITION_FOLLOWING)&&/Coste directo medio/.test(s.innerText)}),null);
 ok(`[${wd}] el resumen de la carta incluye cada categoría`,/Cóctel \(2\)/.test(await text(c,'#drinkSummary'))&&/Refresco \(1\)/.test(await text(c,'#drinkSummary')),await text(c,'#drinkSummary'));
 // estado vacío y biblioteca
 const e=await mk(dev);await tap(e,'#wStart');await tap(e,'#tplSkip');await nav(e,'Carta');
 ok(`[${wd}] estado vacío: «Aún no tienes bebidas en tu carta» con «Añadir bebida» y «Añadir desde la biblioteca»`,/Aún no tienes bebidas en tu carta/.test(await text(e,'#cartaEmpty'))&&(await seen(e,'#drinkAdd'))&&(await seen(e,'#libOpen'))&&!(await seen(e,'#cartaPanel')),null);
 await checkScreen(e,wd,'Mi carta vacía');
 await tap(e,'#libOpen');await libPick(e,['negroni','gin-tonic']);await tap(e,'#libGoDrinks');
 ok(`[${wd}] los cócteles de la biblioteca aparecen enseguida en «Cócteles»`,(await shown(e,'drinks'))&&(await e.locator('#cartaCats .cat-chip[aria-pressed=true]').innerText()).replace(/\s+/g,' ').trim()==='Cócteles 2'&&(await rowNames(e)).join('|')==='Gin-tonic|Negroni',[await rowNames(e)]);
 await tap(e,'#libOpen');
 ok(`[${wd}] en la biblioteca los que ya están en la carta dicen «Ya en tu carta» y enlazan a Mi carta`,/Ya en tu carta/.test(await text(e,'.lib-item:has(#lib_negroni)'))&&(await seen(e,'.lib-item:has(#lib_negroni) .lib-see'))&&!(await seen(e,'.lib-item:has(#lib_mojito) .lib-see')),null);
 await checkScreen(e,wd,'biblioteca con «Ver en Mi carta»');
 await tap(e,'.lib-item:has(#lib_negroni) .lib-see');await e.waitForFunction(()=>document.activeElement&&document.activeElement.classList.contains('carta-row'),null,{timeout:3000}).catch(()=>{});
 ok(`[${wd}] «Ver en Mi carta» abre Mi carta en «Cócteles» con el Negroni a la vista`,(await shown(e,'drinks'))&&(await e.locator('#cartaCats .cat-chip[aria-pressed=true]').innerText()).startsWith('Cócteles')&&(await e.evaluate(()=>{const r=[...document.querySelectorAll('#drinkList .carta-row')].find(x=>/Negroni/.test(x.innerText));if(!r)return false;const b=r.getBoundingClientRect();return document.activeElement===r&&b.top>=0&&b.bottom<=innerHeight})),null);
 await tap(e,'#drinkList .carta-row:has-text("Negroni")');
 ok(`[${wd}] el cóctel de la biblioteca abre su receta (cambiar producto y medida), con «Eliminar»`,(await shown(e,'recipe'))&&(await seen(e,'#rcRestore'))&&(await seen(e,'#rcDelete')),null);
 if(wd===390){const cf=await contrastFails(e);await nav(e,'Carta');cf.push(...await contrastFails(e));ok('contraste ≥ 4,5:1 en Mi carta y en la receta',cf.length===0,cf.slice(0,6))}
}

// FIN
ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO guía y Mi carta: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,1200):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
