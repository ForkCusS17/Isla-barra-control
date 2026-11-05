// Formulario de Control de stock por pasos (0.4.8): emulación de móvil (390 y 360 px) y solo toques.
// Elegir el producto de Mi barra o añadir uno nuevo, cantidades con equivalencia en envases, ventas de las bebidas que lo llevan,
// añadir una bebida o combinado a Mi carta, «Más detalles» plegado, guardar (ventas en su periodo), editar y controles antiguos.
const {chromium,devices}=require('./env');const [,,F]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];
const {noOverflow,wide,smallTargets,contrastFails}=require('./helpers');
const AXE=require.resolve('axe-core/axe.min.js');
const ok=(n,c,x)=>{T.push([!!c,n,c?'':JSON.stringify(x)]);console.log('· '+(c?'ok ':'MAL ')+n)};
const KEY='islaBarraControlMVP_v1';
const PHONE={...devices['iPhone 13'],reducedMotion:'reduce'},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
// Cifras de ejemplo: ron blanco 70 cl a 14 € (0,02 €/ml); Mojito, Cuba libre y Daiquiri con 50 ml; un gin-tonic sin ron; un control antiguo con un producto escrito a mano.
const R=(id,n,ing)=>({id,name:n,category:'Cóctel',price:8,taxRate:7,otherCost:0,recipeItems:[{ingredientId:ing,qty:50}],recipe:'',notes:''});
const SEED={schema:8,settings:{mode:'simple',started:true,guideHidden:true,lastBackupAt:'2026-10-30T09:00:00Z'},business:{name:'Bar Formulario',location:'Arrecife',period:'Octubre'},
 ingredients:[{id:'ron',name:'Ron blanco',category:'Destilados',subcategory:'Rones',supplier:'',format:'70 cl',unit:'ml',packUnit:'ml',packInput:700,packQty:700,packPrice:14,unitCost:0.02,notes:'',active:true},
  {id:'gin',name:'Ginebra',category:'Destilados',subcategory:'Ginebras',supplier:'',format:'70 cl',unit:'ml',packUnit:'ml',packInput:700,packQty:700,packPrice:14,unitCost:0.02,notes:'',active:true},
  {id:'cola',name:'Coca-Cola lata',category:'Refrescos y mixers',subcategory:'',supplier:'',format:'24 uds',unit:'unit',packUnit:'unit',packInput:24,packQty:24,packPrice:12,unitCost:0.5,notes:'',active:true}],
 drinks:[R('d1','Mojito','ron'),R('d2','Cuba libre','ron'),R('d3','Daiquiri','ron'),R('d4','Gin-tonic','gin')],sales:[],diagnostics:[],
 stocks:[{id:'old1',date:'2026-09-30',start:'2026-09-01',end:'2026-09-30',product:'Licor de la casa',unit:'ml',opening:1000,purchases:0,closing:400,salesUse:500,tastings:0,comps:0,waste:0,otherOut:0,threshold:100,status:'Sin validar',salesId:'',hypothesis:'',causeState:'Sin analizar',cause:'',action:'',result:'',notes:''}]};
(async()=>{const b=await chromium.launch();const pages=[];
const mk=async(dev=PHONE,extra={})=>{const c=await b.newContext({...dev,...extra});await c.clock.setFixedTime(new Date('2026-10-31T10:00:00Z'));await c.addInitScript(([k,s])=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem(k,s)},[KEY,JSON.stringify(SEED)]);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,160)));p.on('dialog',d=>{p.dl.push(d.type()+': '+d.message().slice(0,60));d.dismiss()});await p.goto(APP_URL);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0])});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').trim());
const D=p=>p.evaluate(()=>JSON.parse(JSON.stringify(data)));
const toStock=p=>tap(p,'.mobile-nav button:has-text("Stock")');
const typeIn=async(p,sel,x)=>{await tap(p,sel);await p.fill(sel,String(x))};
/* «Editar» desplaza hasta el formulario 60 ms después: se espera a que termine y se comprueba que «Nuevo control» vació el formulario */
const newControl=async p=>{await p.waitForTimeout(200);await tap(p,'#stockForm button:has-text("Nuevo control")');await p.waitForFunction(()=>document.getElementById('sProduct').value===''&&document.getElementById('sOpening').value==='0',null,{timeout:3000})};

for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const p=await mk(dev);await toStock(p);
 // ── Paso 1: el producto se busca en Mi barra ──
 ok(`[${wd}] cuatro pasos a la vista y «Más detalles (opcional)» cerrado al empezar`,(await p.locator('#page-stock .step-h').filter({visible:true}).count())===4&&!(await p.evaluate(()=>document.getElementById('sMore').open))&&!(await seen(p,'#sTastings')),null);
 await typeIn(p,'#sProduct','ron');
 ok(`[${wd}] buscar «ron»: propone Ron blanco de Mi barra (no la ginebra) y ofrece añadir uno nuevo`,/Ron blanco/.test(await text(p,'#sProdBox'))&&!/Ginebra/.test(await text(p,'#sProdBox'))&&(await seen(p,'#sAddProd')),await text(p,'#sProdBox'));
 await tap(p,'#sProdBox button:has-text("Ron blanco")');ok(`[${wd}] sin cantidades, el resultado no dice «Cuadra»: pide los datos`,/Introduce los datos/.test(await text(p,'#stockResult')),await text(p,'#stockResult'));
 ok(`[${wd}] tocar Ron blanco lo elige: nombre, sección, envase y coste; unidad ml`,(await p.inputValue('#sProduct'))==='Ron blanco'&&/Rones/.test(await text(p,'#sProdBox'))&&/0,02 €\/ml/.test(await text(p,'#sProdBox'))&&(await p.inputValue('#sUnit'))==='ml',await text(p,'#sProdBox'));
 // ── Paso 3: solo las bebidas que llevan el producto ──
 const sold=await text(p,'#sSold');
 ok(`[${wd}] lo que se vendió: Mojito, Cuba libre y Daiquiri (50 ml por bebida), sin el gin-tonic`,/Mojito/.test(sold)&&/Cuba libre/.test(sold)&&/Daiquiri/.test(sold)&&/50 ml por bebida/.test(sold)&&!/Gin-tonic/.test(sold),sold);
 // ── Ejemplo C: 7000 + 2800 − 3500 = 6300 frente a 5000 + 800 = 5800 → +500 ml ──
 await typeIn(p,'#sStart','2026-10-07');await typeIn(p,'#sEnd','2026-10-13');
 await typeIn(p,'#sOpening',7000);await typeIn(p,'#sPurchases',2800);await typeIn(p,'#sClosing',3500);
 ok(`[${wd}] equivalencias: 7000 ml ≈ 10 envases de 70 cl; 2800 ml ≈ 4`,/≈ 10 envases de 70 cl/.test(await text(p,'#sOpeningEq'))&&/≈ 4 envases/.test(await text(p,'#sPurchasesEq')),[await text(p,'#sOpeningEq'),await text(p,'#sPurchasesEq')]);
 await typeIn(p,'#sold_d1',40);await typeIn(p,'#sold_d2',40);await typeIn(p,'#sold_d3',20);
 ok(`[${wd}] escribir lo vendido no pierde el foco y suma 40 × 50 + 40 × 50 + 20 × 50 = 5000 ml`,(await p.evaluate(()=>document.activeElement&&document.activeElement.id))==='sold_d3'&&/se esperaba gastar 5000 ml/.test(await text(p,'#sSoldSum')),await text(p,'#sSoldSum'));
 await tap(p,'#sMore summary');await typeIn(p,'#sTastings',800);
 ok(`[${wd}] «Más detalles»: lo esperado por ventas se calcula solo (5000, no editable)`,(await p.inputValue('#sSalesUse'))==='5000'&&(await p.evaluate(()=>document.getElementById('sSalesUse').readOnly)),await p.inputValue('#sSalesUse'));
 ok(`[${wd}] vista previa: «Revisa: se ha gastado 500 ml más de lo esperado (≈ 10,00 €, orientativo)»`,/^Revisa: se ha gastado 500 ml más de lo esperado \(≈ 10,00 €, orientativo\)/.test((await text(p,'#stockResult')).replace(/ /g,' ')),await text(p,'#stockResult'));
 await tap(p,'#stockForm button:has-text("Calcular y guardar control")');
 let d=await D(p);const s=d.stocks.find(x=>x.product==='Ron blanco'),sp=s&&d.sales.find(x=>x.id===s.salesId);
 ok(`[${wd}] guardado: real 6300 · teórico 5800 · desviación +500 (los cálculos no cambian)`,s&&s.actual===6300&&s.theoretical===5800&&s.variance===500&&s.salesUse===5000,s);
 ok(`[${wd}] las ventas del paso 3 quedan en un periodo con las mismas fechas, enlazado al control`,sp&&sp.start==='2026-10-07'&&sp.end==='2026-10-13'&&sp.lines.length===3&&sp.lines.every(l=>l.qty===(l.drinkId==='d3'?20:40)),sp);
 // ── Editar: vuelven las vendidas y se conserva lo guardado ──
 await newControl(p);
 ok(`[${wd}] «Nuevo control» vacía los pasos y vuelve a cerrar «Más detalles»`,(await p.inputValue('#sProduct'))===''&&!(await seen(p,'[data-sold]'))&&!(await p.evaluate(()=>document.getElementById('sMore').open)),null);
 await tap(p,`#stockHistory tr:has-text("Ron blanco") button:has-text("Ver")`);await tap(p,'#stockResult button:has-text("Editar y hacer seguimiento")');
 ok(`[${wd}] editar el control: producto, vendidas (40) y «Más detalles» abierto con las degustaciones`,(await p.inputValue('#sProduct'))==='Ron blanco'&&(await p.inputValue('#sold_d1'))==='40'&&(await p.evaluate(()=>document.getElementById('sMore').open))&&(await p.inputValue('#sTastings'))==='800',null);
 await newControl(p);

 // ── Añadir un producto nuevo sin salir de la pantalla ──
 await typeIn(p,'#sProduct','Arehucas');
 ok(`[${wd}] «Arehucas» no está en Mi barra: lo dice y ofrece «+ Añadir producto nuevo»`,/no está en Mi barra/.test(await text(p,'#sProdBox'))&&(await seen(p,'#sAddProd')),await text(p,'#sProdBox'));
 await tap(p,'#sAddProd');
 ok(`[${wd}] la caja del producto nuevo trae el nombre buscado`,(await p.inputValue('#sNpName'))==='Arehucas',null);
 await typeIn(p,'#sNpName','Arehucas Oro');await typeIn(p,'#sNpFormat','botella grande');await tap(p,'#sNpSave');
 ok(`[${wd}] envase no reconocido: no se crea nada`,!(await D(p)).ingredients.some(i=>i.name==='Arehucas Oro')&&(await seen(p,'#sNewProd')),null);
 await tap(p,'#sNewProd button:has-text("70 cl")');await typeIn(p,'#sNpPrice','9,50');
 await p.locator('#sNpPrice').press('Enter');
 d=await D(p);const ar=d.ingredients.find(i=>i.name==='Arehucas Oro');
 ok(`[${wd}] «Añadir a Mi barra» (también con Intro): 70 cl = 700 ml a 9,50 €, activo; no se guarda ningún control`,ar&&ar.unit==='ml'&&ar.packQty===700&&ar.packPrice===9.5&&Math.abs(ar.unitCost-9.5/700)<1e-12&&ar.active!==false&&d.stocks.length===2,ar);
 ok(`[${wd}] queda elegido en el paso 1 y la caja se cierra`,(await p.inputValue('#sProduct'))==='Arehucas Oro'&&/Arehucas Oro/.test(await text(p,'#sProdBox'))&&!(await seen(p,'#sNewProd')),await text(p,'#sProdBox'));
 ok(`[${wd}] aparece en Mi barra (lista completa)`,await p.evaluate(()=>data.ingredients.filter(i=>i.name==='Arehucas Oro').length===1),null);
 ok(`[${wd}] paso 3 sin bebidas con Arehucas: lo explica y ofrece «+ Añadir bebida o combinado»`,/Todavía no hay ninguna bebida/.test(await text(p,'#sSold'))&&(await seen(p,'#sAddDrink')),await text(p,'#sSold'));
 // ── Añadir un combinado a Mi carta desde el paso 3 ──
 await tap(p,'#sAddDrink');
 ok(`[${wd}] combinado nuevo: 50 ml por bebida propuestos`,(await p.inputValue('#sNdQty'))==='50'&&/Arehucas Oro/.test(await text(p,'#sNdTitle')),null);
 await typeIn(p,'#sNdName','Arehucas Oro con Coca-Cola');await typeIn(p,'#sNdSold',60);await p.selectOption('#sNdMix','cola');await tap(p,'#sNdSave');
 ok(`[${wd}] con otro producto y sin cantidad: pide la cantidad y no crea la bebida`,!(await D(p)).drinks.some(x=>/Arehucas/.test(x.name)),null);
 await typeIn(p,'#sNdMixQty',1);await typeIn(p,'#sNdPrice','7');await tap(p,'#sNdSave');
 d=await D(p);const cb=d.drinks.find(x=>x.name==='Arehucas Oro con Coca-Cola');
 ok(`[${wd}] «Añadir a Mi carta»: receta 50 ml de Arehucas Oro + 1 Coca-Cola, 7 €, en Cócteles, medidas orientativas`,cb&&cb.category==='Cóctel'&&cb.price===7&&cb.recipeItems.length===2&&cb.recipeItems[0].ingredientId===ar.id&&cb.recipeItems[0].qty===50&&cb.recipeItems[1].ingredientId==='cola'&&cb.recipeItems[1].qty===1&&/orientativas/.test(cb.notes),cb);
 ok(`[${wd}] el combinado sale en el paso 3 con sus 60 vendidas: se esperaba gastar 3000 ml`,(await p.inputValue(`#sold_${cb.id}`))==='60'&&/3000 ml/.test(await text(p,'#sSoldSum')),await text(p,'#sSoldSum'));
 await tap(p,'#sAddDrink');await typeIn(p,'#sNdName','arehucas oro con coca-cola');await typeIn(p,'#sNdQty',50);await tap(p,'#sNdSave');
 ok(`[${wd}] el mismo nombre otra vez: no se duplica en Mi carta`,(await D(p)).drinks.filter(x=>/arehucas oro con coca-cola/i.test(x.name)).length===1,null);
 await tap(p,'#sNewDrink button:has-text("Cancelar")');
 await typeIn(p,'#sStart','2026-10-14');await typeIn(p,'#sEnd','2026-10-20');await typeIn(p,'#sOpening',2100);await typeIn(p,'#sClosing',0);
 await tap(p,'#stockForm button:has-text("Calcular y guardar control")');
 d=await D(p);const s2=d.stocks.find(x=>x.product==='Arehucas Oro'),sp2=s2&&d.sales.find(x=>x.id===s2.salesId);
 ok(`[${wd}] control de Arehucas Oro: 2100 gastados frente a 3000 esperados → −900 ml; ventas en su periodo`,s2&&s2.actual===2100&&s2.theoretical===3000&&s2.variance===-900&&sp2&&sp2.lines.length===1&&sp2.lines[0].qty===60,s2);
 await tap(p,'.mobile-nav button:has-text("Carta")');
 ok(`[${wd}] Mi carta muestra el combinado nuevo`,/Arehucas Oro con Coca-Cola/.test(await text(p,'#page-drinks')),null);
 await toStock(p);await newControl(p);

 // ── Controles antiguos con un producto escrito a mano ──
 await tap(p,`#stockHistory tr:has-text("Licor de la casa") button:has-text("Ver")`);await tap(p,'#stockResult button:has-text("Editar y hacer seguimiento")');
 ok(`[${wd}] control antiguo con un producto que no está en Mi barra: se abre con sus datos y lo esperado a mano (500)`,(await p.inputValue('#sProduct'))==='Licor de la casa'&&/no está en Mi barra/.test(await text(p,'#sProdBox'))&&(await p.inputValue('#sSalesUse'))==='500'&&!(await p.evaluate(()=>document.getElementById('sSalesUse').readOnly)),await text(p,'#sProdBox'));
 ok(`[${wd}] su resultado no cambia: 600 gastados frente a 500 → +100 ml`,/Cuadra: la diferencia \(\+100 ml\)/.test(await text(p,'#stockResult')),await text(p,'#stockResult'));
 await newControl(p);

 // ── Móvil: con las cajas abiertas, sin desbordamiento, botones ≥ 44 px y contraste ──
 await typeIn(p,'#sProduct','Tequila');await tap(p,'#sAddProd');await typeIn(p,'#sProduct','Ron blanco');await tap(p,'#sMore summary');await tap(p,'#sAddDrink');
 ok(`[${wd}] Stock con «Más detalles» y las cajas abiertas: sin desbordamiento`,await noOverflow(p),await wide(p));
 const st=await smallTargets(p,'#page-stock');ok(`[${wd}] Stock: botones y campos ≥ 44 px`,st.length===0,st);
 const cf=await contrastFails(p);ok(`[${wd}] Stock: contraste ≥ 4,5:1`,cf.length===0,cf);
}
// ── Accesibilidad (axe) con todo abierto ──
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const p=await mk(dev,{bypassCSP:true});await toStock(p);await typeIn(p,'#sProduct','Ron blanco');await tap(p,'#sMore summary');await tap(p,'#sAddDrink');await typeIn(p,'#sProduct','Arehucas');await tap(p,'#sAddProd');
 await p.addScriptTag({path:AXE});const v=await p.evaluate(async()=>{const r=await axe.run(document.getElementById('page-stock'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']});return r.violations.map(x=>({id:x.id,n:x.nodes.length,t:x.nodes.slice(0,3).map(y=>y.target.join(' '))}))});
 ok(`[${wd}] axe (WCAG 2.1 AA) en Control de stock con las cajas abiertas: sin incumplimientos`,v.length===0,v)}

ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO formulario de stock: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
