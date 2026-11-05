// Stock casi automático e inventario de toda la barra (0.5.0): emulación de móvil (390 y 360 px) y solo toques.
// Lo que había sale del control anterior, lo vendido de las ventas guardadas de esas fechas (sumando varios periodos sin
// duplicarlos), lo que queda se puede contar en botellas, y el inventario hace el control de todos los productos a la vez.
const {chromium,devices}=require('./env');const [,,F]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];
const {noOverflow,wide,smallTargets,contrastFails}=require('./helpers');
const AXE=require.resolve('axe-core/axe.min.js');
const ok=(n,c,x)=>{T.push([!!c,n,c?'':JSON.stringify(x)]);console.log('· '+(c?'ok ':'MAL ')+n)};
const KEY='islaBarraControlMVP_v1';
const PHONE={...devices['iPhone 13'],reducedMotion:'reduce'},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
// Cifras de ejemplo: ron blanco 70 cl a 14 € (0,02 €/ml). Un control de septiembre acabó con 7000 ml; octubre tiene dos quincenas de ventas.
const R=(id,n,ing)=>({id,name:n,category:'Cóctel',price:8,taxRate:7,otherCost:0,recipeItems:[{ingredientId:ing,qty:50}],recipe:'',notes:''});
const ING=(id,n,sub)=>({id,name:n,category:'Destilados',subcategory:sub,supplier:'',format:'70 cl',unit:'ml',packUnit:'ml',packInput:700,packQty:700,packPrice:14,unitCost:0.02,notes:'',active:true});
const Q=(id,s,e,l)=>({id,label:id,start:s,end:e,lines:l});
const SEED={schema:8,settings:{mode:'full',started:true,guideHidden:true,lastBackupAt:'2026-10-30T09:00:00Z'},business:{name:'Bar Inventario',location:'Arrecife',period:'Octubre'},
 ingredients:[ING('ron','Ron blanco','Rones'),ING('are','Arehucas Oro','Rones'),ING('gin','Ginebra','Ginebras')],
 drinks:[R('d1','Mojito','ron'),R('d2','Cuba libre','ron'),R('d3','Daiquiri','ron'),R('d4','Arehucas cola','are')],
 sales:[Q('q1','2026-10-01','2026-10-15',[{drinkId:'d1',qty:20},{drinkId:'d2',qty:20},{drinkId:'d3',qty:10},{drinkId:'d4',qty:30}]),Q('q2','2026-10-16','2026-10-31',[{drinkId:'d1',qty:20},{drinkId:'d2',qty:20},{drinkId:'d3',qty:10},{drinkId:'d4',qty:30}])],
 stocks:[{id:'s0',date:'2026-09-30',start:'2026-09-01',end:'2026-09-30',product:'Ron blanco',unit:'ml',opening:5000,purchases:4200,closing:7000,salesUse:2000,tastings:0,comps:0,waste:0,otherOut:0,threshold:100,status:'Validados',salesId:'',hypothesis:'',causeState:'Sin analizar',cause:'',action:'',result:'',notes:''}],diagnostics:[]};
(async()=>{const b=await chromium.launch();const pages=[];
const mk=async(dev=PHONE,extra={})=>{const c=await b.newContext({...dev,...extra});await c.clock.setFixedTime(new Date('2026-10-31T12:00:00Z'));await c.addInitScript(([k,s])=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem(k,s)},[KEY,JSON.stringify(SEED)]);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,160)));p.on('dialog',d=>{p.dl.push(d.type()+': '+d.message().slice(0,60));d.dismiss()});await p.goto(APP_URL);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0])});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').replace(/ /g,' ').trim());
const D=p=>p.evaluate(()=>JSON.parse(JSON.stringify(data)));
const typeIn=async(p,sel,x)=>{await tap(p,sel);await p.fill(sel,String(x))};
const toStock=p=>tap(p,'.mobile-nav button:has-text("Stock")');

for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){
 // ── Control de un producto: casi automático ──
 let p=await mk(dev);await toStock(p);
 await typeIn(p,'#sStart','2026-10-01');await typeIn(p,'#sEnd','2026-10-31');await typeIn(p,'#sProduct','Ron blanco');
 ok(`[${wd}] lo que había se rellena con lo que quedaba en el control anterior (7000 ml, del 30-09)`,(await p.inputValue('#sOpening'))==='7000'&&/control del 30-09/.test(await text(p,'#sOpeningSrc')),[await p.inputValue('#sOpening'),await text(p,'#sOpeningSrc')]);
 ok(`[${wd}] lo comprado se busca solo en las facturas confirmadas y dice que no hay`,(await p.inputValue('#sPurchases'))==='0'&&/Sin facturas confirmadas/.test(await text(p,'#sPurchasesSrc')),await text(p,'#sPurchasesSrc'));
 ok(`[${wd}] lo vendido sale solo de las dos quincenas guardadas (40 + 40 + 20 bebidas → 5000 ml) y dice de dónde`,(await p.inputValue('#sold_d1'))==='40'&&(await p.inputValue('#sold_d3'))==='20'&&/2 periodos de ventas/.test(await text(p,'#sSoldSrc'))&&/5000 ml/.test(await text(p,'#sSoldSum')),[await text(p,'#sSoldSrc'),await text(p,'#sSoldSum')]);
 ok(`[${wd}] lo que queda se puede contar en botellas de 70 cl`,(await seen(p,'#sClosingBot'))&&/o en botellas de 70 cl/.test(await text(p,'#sClosingBotLabel')),null);
 await typeIn(p,'#sClosingBot','5');
 ok(`[${wd}] 5 botellas = 3500 ml`,(await p.inputValue('#sClosing'))==='3500'&&/≈ 5 envases de 70 cl/.test(await text(p,'#sClosingEq')),await p.inputValue('#sClosing'));
 await typeIn(p,'#sClosing','2800');
 ok(`[${wd}] y al revés: 2800 ml = 4 botellas`,(await p.inputValue('#sClosingBot'))==='4',await p.inputValue('#sClosingBot'));
 await typeIn(p,'#sClosing','3500');await typeIn(p,'#sPurchases','2800');await tap(p,'#sMore summary');await typeIn(p,'#sTastings','800');
 await typeIn(p,'#sEnd','2026-10-30');await typeIn(p,'#sEnd','2026-10-31');
 ok(`[${wd}] lo escrito a mano (2800 ml comprados) no se pisa al cambiar las fechas`,(await p.inputValue('#sPurchases'))==='2800',await p.inputValue('#sPurchases'));
 ok(`[${wd}] ejemplo C en la vista previa: 500 ml de más (≈ 0,7 botellas · ≈ 10,00 €)`,/^Revisa: se han gastado 500 ml de más \(≈ 0,7 botellas · ≈ 10,00 €, orientativo\)/.test(await text(p,'#stockResult')),await text(p,'#stockResult'));
 await tap(p,'#stockForm button:has-text("Calcular y guardar control")');
 let d=await D(p);const s=d.stocks.find(x=>x.start==='2026-10-01');
 ok(`[${wd}] guardado: 7000 + 2800 − 3500 = 6300 frente a 5000 + 800 = 5800 → +500 (los cálculos no cambian)`,s&&s.opening===7000&&s.actual===6300&&s.theoretical===5800&&s.variance===500,s);
 ok(`[${wd}] las ventas sumadas de dos periodos no se vuelven a guardar (siguen 2 periodos)`,d.sales.length===2&&s.salesId==='',d.sales.map(x=>x.id));
 await tap(p,'#stockForm button:has-text("Nuevo control")');await p.waitForTimeout(200);
 await tap(p,'#stockHistory tr:has-text("2026-10-01") button:has-text("Ver")');await tap(p,'#stockResult button:has-text("Editar y hacer seguimiento")');
 ok(`[${wd}] al editar un control guardado no se rellena nada solo: se conservan sus cifras`,(await p.inputValue('#sOpening'))==='7000'&&(await p.inputValue('#sPurchases'))==='2800'&&(await p.inputValue('#sSalesUse'))==='5000'&&(await text(p,'#sOpeningSrc').catch(()=>''))==='',null);

 // ── Inventario de toda la barra ──
 p=await mk(dev);await toStock(p);await tap(p,'#goInventory');
 ok(`[${wd}] «Inventario de toda la barra» se abre desde Stock con las fechas propuestas (01-10 → 31-10)`,(await p.evaluate(()=>!document.getElementById('page-inventory').classList.contains('hidden')))&&(await p.inputValue('#invStart'))==='2026-10-01'&&(await p.inputValue('#invEnd'))==='2026-10-31',[await p.inputValue('#invStart'),await p.inputValue('#invEnd')]);
 const list=await text(p,'#invList');
 ok(`[${wd}] un producto por fila, por secciones, con lo que había, lo comprado y lo vendido en botellas`,/Destilados › Ginebras/.test(list)&&/Destilados › Rones/.test(list)&&/Ron blanco 70 cl · había 10 · compraste 0 · vendido ≈ 7,1/.test(list)&&/Arehucas Oro 70 cl · sin control anterior · compraste 0 · vendido ≈ 4,3/.test(list),list);
 ok(`[${wd}] sin control anterior pide también «Había»; con control anterior, solo «Queda»`,(await seen(p,'#inv_o_are'))&&!(await seen(p,'#inv_o_ron'))&&(await seen(p,'#inv_c_ron')),null);
 await typeIn(p,'#inv_c_ron','5');await typeIn(p,'#inv_c_are','6');await tap(p,'#invCalc');
 ok(`[${wd}] sin «Había» no se calcula ese producto y lo dice`,/Arehucas Oro Falta lo que había/.test(await text(p,'#invResults'))&&!(await D(p)).stocks.some(x=>x.product==='Arehucas Oro'),await text(p,'#invResults'));
 await typeIn(p,'#inv_o_are','10');await tap(p,'#invCalc');
 d=await D(p);const ron=d.stocks.find(x=>x.product==='Ron blanco'&&x.start==='2026-10-01'),are=d.stocks.find(x=>x.product==='Arehucas Oro');
 ok(`[${wd}] Ron blanco: 7000 + 0 − 3500 = 3500 frente a 5000 → 1500 ml de menos`,ron&&ron.opening===7000&&ron.purchases===0&&ron.closing===3500&&ron.salesUse===5000&&ron.variance===-1500&&ron.status==='Sin validar',ron);
 ok(`[${wd}] Arehucas Oro: 7000 + 0 − 4200 = 2800 frente a 3000 → 200 ml de menos; la ginebra sin contar no se calcula`,are&&are.opening===7000&&are.closing===4200&&are.salesUse===3000&&are.variance===-200&&!d.stocks.some(x=>x.product==='Ginebra'),are);
 const res=await text(p,'#invResults');
 ok(`[${wd}] resultados de mayor a menor importe, en palabras y botellas`,/^Ron blanco 1500 ml de menos \(≈ 2,1 botellas\) · ≈ 30,00 € Ver Arehucas Oro 200 ml de menos \(≈ 0,3 botellas\) · ≈ 4,00 €/.test(res)&&/no pruebas de pérdida ni de robo/.test(await text(p,'#invResultsPanel')),res);
 await tap(p,'#invCalc');
 ok(`[${wd}] «Calcular todo» otra vez no duplica los controles`,(await D(p)).stocks.length===3,(await D(p)).stocks.length);
 ok(`[${wd}] Inventario: sin desbordamiento, botones y campos ≥ 44 px y contraste`,(await noOverflow(p))&&(await smallTargets(p,'#page-inventory')).length===0&&(await contrastFails(p)).length===0,[await wide(p),await smallTargets(p,'#page-inventory')]);
 await tap(p,'#invResults .resrow:has-text("Ron blanco") button:has-text("Ver")');
 ok(`[${wd}] «Ver» abre el control del producto en Stock`,(await p.evaluate(()=>!document.getElementById('page-stock').classList.contains('hidden')))&&/1500 ml de menos/.test(await text(p,'#stockResult')),await text(p,'#stockResult'));
}
// ── Accesibilidad (axe) del inventario con resultados ──
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const p=await mk(dev,{bypassCSP:true});await toStock(p);await tap(p,'#goInventory');await typeIn(p,'#inv_c_ron','5');await tap(p,'#invCalc');
 await p.addScriptTag({path:AXE});const v=await p.evaluate(async()=>{const r=await axe.run(document.getElementById('page-inventory'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']});return r.violations.map(x=>({id:x.id,n:x.nodes.length,t:x.nodes.slice(0,3).map(y=>y.target.join(' '))}))});
 ok(`[${wd}] axe (WCAG 2.1 AA) en el inventario con resultados: sin incumplimientos`,v.length===0,v)}

ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO inventario: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
