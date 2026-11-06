// Tiempo de preparación y mise en place en el escandallo (0.5.1): emulación de móvil (390 y 360 px) y solo toques.
// Coste del personal por hora (media del equipo), método y minutos de cada bebida, mise en place repartida por copa,
// coste total por copa con los dos márgenes brutos, informe y PDF. Sin tiempo, la bebida funciona como antes.
const fs=require('fs');const {chromium,devices}=require('./env');const [,,F]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];
const {noOverflow,wide,smallTargets,contrastFails,pdfCheck}=require('./helpers');
const AXE=require.resolve('axe-core/axe.min.js');
const ok=(n,c,x)=>{T.push([!!c,n,c?'':JSON.stringify(x)]);console.log('· '+(c?'ok ':'MAL ')+n)};
const KEY='islaBarraControlMVP_v1';
const PHONE={...devices['iPhone 13'],reducedMotion:'reduce'},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
// Cifras de ejemplo (iguales que en redes): mojito con 1,55 € de producto y 8,00 € sin impuestos → 6,45 € de margen bruto.
const ING=(id,n,cat,sub,fmt,unit,q,p)=>({id,name:n,category:cat,subcategory:sub,supplier:'',format:fmt,unit,packUnit:unit,packInput:q,packQty:q,packPrice:p,unitCost:p/q,notes:'',active:true});
const SEED={schema:8,settings:{mode:'full',started:true,guideHidden:true,lastBackupAt:'2026-11-05T09:00:00Z'},business:{name:'Bar Preparación',location:'Arrecife',period:'Noviembre'},
 ingredients:[ING('ron','Ron blanco','Destilados','Rones','70 cl','ml',700,14),ING('lim','Lima','Frutas y verduras','Frutas','1 ud','unit',1,0.30),ING('az','Azúcar moreno','Despensa','Azúcar','1 kg','g',1000,5),ING('hb','Hierbabuena','Frutas y verduras','Hierbas','100 g','g',100,1.875),ING('so','Soda','Refrescos','Sodas','1 L','ml',1000,0.8333),ING('co','Cola','Refrescos','Colas','1 L','ml',1000,1)],
 drinks:[{id:'mo',name:'Mojito',category:'Cóctel',price:8,taxRate:0,otherCost:0,recipeItems:[{ingredientId:'ron',qty:50},{ingredientId:'lim',qty:1},{ingredientId:'az',qty:10},{ingredientId:'hb',qty:8},{ingredientId:'so',qty:60}],recipe:'',notes:''},
  {id:'cu',name:'Cuba libre',category:'Cóctel',price:7,taxRate:0,otherCost:0,recipeItems:[{ingredientId:'ron',qty:50},{ingredientId:'co',qty:150}],recipe:'',notes:''}],sales:[],stocks:[],diagnostics:[]};
(async()=>{const b=await chromium.launch();const pages=[];
const mk=async(dev=PHONE,extra={},seed=SEED)=>{const c=await b.newContext({...dev,...extra,acceptDownloads:true});await c.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));await c.addInitScript(([k,s])=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem(k,s)},[KEY,JSON.stringify(seed)]);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,160)));p.on('dialog',d=>{p.dl.push(d.type()+': '+d.message().slice(0,60));d.dismiss()});await p.goto(APP_URL);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0])});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').replace(/ /g,' ').trim());
const D=p=>p.evaluate(()=>JSON.parse(JSON.stringify(data)));
const typeIn=async(p,sel,x)=>{await tap(p,sel);await p.fill(sel,String(x))};
const toCarta=p=>tap(p,'.mobile-nav button:has-text("Carta")');
const addMise=async(p,n,m,s)=>{await typeIn(p,'#mName',n);await typeIn(p,'#mMin',m);await typeIn(p,'#mServ',s);await tap(p,'#mSave')};

for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){
 // ── Datos de antes: nada cambia ──
 let p=await mk(dev);let d=await D(p);
 ok(`[${wd}] datos del esquema 8: pasan al 9 sin campos nuevos en las bebidas y con el mismo coste`,d.schema===9&&Array.isArray(d.mise)&&d.mise.length===0&&d.settings.laborHour===0&&d.drinks.every(x=>!('method' in x)&&!('prepMin' in x)&&!('miseIds' in x)),d.drinks[0]);
 await toCarta(p);await tap(p,'#cr_mo');
 ok(`[${wd}] sin tiempo: la receta es como antes (1,55 € y 6,45 € de margen bruto) y sin «Coste por copa»`,/Coste directo: 1,55 €/.test(await text(p,'#rcSummary'))&&/Margen bruto: 6,45 €/.test(await text(p,'#rcSummary'))&&!(await seen(p,'#rcPrep')),await text(p,'#rcSummary'));
 // ── Tiempo y mise en place ──
 await tap(p,'#rcBack');await tap(p,'#prepOpen');
 ok(`[${wd}] «Tiempo y mise en place» se abre desde Mi carta, con Carta marcado en la barra de abajo`,(await seen(p,'#page-prep'))&&/Escribe el coste por hora/.test(await text(p,'#laborNote'))&&(await p.locator('.mobile-nav button:has-text("Carta")').getAttribute('aria-current'))==='page',await text(p,'#laborNote'));
 await typeIn(p,'#laborHour','18');
 ok(`[${wd}] coste por hora 18 € → 0,30 € por minuto, sin nombres`,/18,00 €\/h = 0,30 € por minuto/.test(await text(p,'#laborNote'))&&(await D(p)).settings.laborHour===18,await text(p,'#laborNote'));
 await tap(p,'#mSave');
 ok(`[${wd}] preparación sin nombre: no se añade y lo explica`,(await D(p)).mise.length===0&&/Escribe qué preparación es/.test(await text(p,'#toast')),await text(p,'#toast'));
 await typeIn(p,'#mName','Cortar limas');await typeIn(p,'#mMin','20');await tap(p,'#mSave');
 ok(`[${wd}] sin copas: no se añade y lo explica`,(await D(p)).mise.length===0&&/para cuántas copas/.test(await text(p,'#toast')),await text(p,'#toast'));
 await typeIn(p,'#mServ','60');await tap(p,'#mSave');await addMise(p,'Picar hielo','10','60');await addMise(p,'cortar LIMAS','5','10');
 d=await D(p);
 ok(`[${wd}] dos preparaciones guardadas; el nombre repetido no se duplica`,d.mise.length===2&&d.mise[0].name==='Cortar limas'&&d.mise[0].minutes===20&&d.mise[0].servings===60&&/Ya hay una preparación/.test(await text(p,'#toast')),d.mise);
 ok(`[${wd}] cada una dice cuánto toca por copa: 0,33 min = 0,10 € y 0,17 min = 0,05 €`,/Cortar limas 20 min · para unas 60 copas → 0,33 min por copa = 0,10 € · sin bebidas todavía/.test(await text(p,'#miseList'))&&/Picar hielo 10 min · para unas 60 copas → 0,17 min por copa = 0,05 €/.test(await text(p,'#miseList')),await text(p,'#miseList'));
 ok(`[${wd}] Tiempo y mise en place: sin desbordamiento, botones y campos ≥ 44 px y contraste`,(await noOverflow(p))&&(await smallTargets(p,'#page-prep')).length===0&&(await contrastFails(p)).length===0,[await wide(p),await smallTargets(p,'#page-prep')]);
 // ── En la bebida: método, minutos y mise en place ──
 await tap(p,'#prepBack');await tap(p,'#cr_mo');await tap(p,'#rcEdit');
 ok(`[${wd}] el formulario trae el tiempo de preparación (opcional) con métodos y la mise en place`,(await p.locator('#dMethods .cat-chip').count())===5&&/Batido o majado · 2,5 min/.test(await text(p,'#dMethods'))&&(await p.locator('#dMiseBox .mise-chk').count())===2&&/solo el coste del producto/.test(await text(p,'#dPrepPreview')),await text(p,'#prepBox'));
 await tap(p,'#dMethods [data-m="batido"]');
 ok(`[${wd}] elegir «Batido o majado» propone 2,5 min`,(await p.inputValue('#dPrepMin'))==='2.5'&&(await p.getAttribute('#dMethods [data-m="batido"]','aria-pressed'))==='true',await p.inputValue('#dPrepMin'));
 await tap(p,'#dMethods [data-m="refrescado"]');const r1=await p.inputValue('#dPrepMin');await typeIn(p,'#dPrepMin','2.8');await tap(p,'#dMethods [data-m="construido"]');const r2=await p.inputValue('#dPrepMin');
 ok(`[${wd}] cambiar de método cambia el tiempo propuesto, pero no el que escribiste a mano`,r1==='1.5'&&r2==='2.8',[r1,r2]);
 await tap(p,'#dMethods [data-m="batido"]');await typeIn(p,'#dPrepMin','2.5');
 ok(`[${wd}] sin marcar mise en place: preparación 0,75 € → 2,30 € por copa`,/Preparación 0,75 € → coste total 2,30 € por copa/.test(await text(p,'#dPrepPreview')),await text(p,'#dPrepPreview'));
 await tap(p,'#dMiseBox .mise-chk:has-text("Cortar limas")');await tap(p,'#dMiseBox .mise-chk:has-text("Picar hielo")');
 ok(`[${wd}] con la mise en place: 0,75 € + 0,15 € → 2,45 € por copa`,/Preparación 0,75 € \+ mise en place 0,15 € → coste total 2,45 € por copa/.test(await text(p,'#dPrepPreview')),await text(p,'#dPrepPreview'));
 ok(`[${wd}] formulario de bebida: sin desbordamiento, botones y casillas ≥ 44 px y contraste`,(await noOverflow(p))&&(await smallTargets(p,'#prepBox')).length===0&&(await contrastFails(p)).length===0,[await wide(p),await smallTargets(p,'#prepBox')]);
 await tap(p,'#drinkForm button[type=submit]');d=await D(p);const mo=d.drinks.find(x=>x.id==='mo');
 ok(`[${wd}] al guardar: método, minutos y mise en place en la bebida; el producto no cambia`,mo.method==='batido'&&mo.prepMin===2.5&&mo.miseIds.length===2&&Math.abs(mo.ingredientCost-1.55)<1e-3&&!('method' in d.drinks.find(x=>x.id==='cu')),mo);
 ok(`[${wd}] Mi carta: la fila del mojito dice «Con preparación 2,45 €» y el coste del producto sigue en 1,55 €`,/Coste 1,55 €.*Con preparación 2,45 €/.test(await text(p,'#cr_mo'))&&!/Con preparación/.test(await text(p,'#cr_cu')),await text(p,'#cr_mo'));
 await tap(p,'#cr_mo');const rp=await text(p,'#rcPrep');
 ok(`[${wd}] receta: coste por copa desglosado (producto, preparación, mise en place y total)`,/Producto \(ingredientes de la receta\) 1,55 €/.test(rp)&&/Preparación · batido o majado, 2,5 min × 0,30 €\/min 0,75 €/.test(rp)&&/Mise en place · Cortar limas \(0,10 €\), Picar hielo \(0,05 €\) 0,15 €/.test(rp)&&/Coste total por copa 2,45 €/.test(rp),rp);
 ok(`[${wd}] receta: margen bruto sobre el producto (6,45 €) y sobre el total (5,55 €), sin «beneficio» como resultado`,/Margen bruto sobre el coste del producto 6,45 € \(80,63%\)/.test(rp)&&/Margen bruto sobre el coste total 5,55 € \(69,3\d%\)/.test(rp)&&/Es margen bruto, no beneficio/.test(rp)&&/orientativos/.test(rp),rp);
 ok(`[${wd}] receta con preparación: sin desbordamiento, botones ≥ 44 px y contraste`,(await noOverflow(p))&&(await smallTargets(p,'#page-recipe')).length===0&&(await contrastFails(p)).length===0,[await wide(p),await smallTargets(p,'#page-recipe')]);
 // ── Informe y PDF ──
 await tap(p,'.mobile-nav button:has-text("Más")');await tap(p,'#page-more button:has-text("Informe")');const rep=await text(p,'#reportContent');
 ok(`[${wd}] informe: tabla «Coste con preparación» con el mojito (1,55 · 0,75 · 0,15 · 2,45 · 5,55 €) y sin la cuba libre`,/Coste con preparación/.test(rep)&&/Mojito 1,55 € 0,75 € 0,15 € 2,45 € 5,55 € 69,3\d%/.test(rep)&&!/Cuba libre 1,\d\d € 0,00 €/.test(rep)&&/Sigue siendo margen bruto/.test(rep),rep.slice(rep.indexOf('Coste con'),rep.indexOf('Coste con')+400));
 if(wd===390){const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}),tap(p,'#page-report button:has-text("Descargar informe PDF")')]);const pf=pdfCheck(fs.readFileSync(await dl.path()));
  ok('informe PDF válido y con «Coste con preparación»',pf.bad.length===0&&/Coste con preparaci/.test(pf.s)&&/2,45/.test(pf.s),pf.bad)}
 // ── Persistencia, quitar el coste por hora y eliminar una preparación ──
 await p.reload();await toCarta(p);await tap(p,'#cr_mo');
 ok(`[${wd}] al recargar se conserva todo`,/Coste total por copa 2,45 €/.test(await text(p,'#rcPrep')),await text(p,'#rcPrep'));
 await tap(p,'#rcBack');await tap(p,'#prepOpen');await typeIn(p,'#laborHour','');await tap(p,'#prepBack');await tap(p,'#cr_mo');
 ok(`[${wd}] sin coste por hora: la receta avisa de que falta y el margen es el de siempre`,/falta el coste del personal por hora/.test(await text(p,'#rcPrep'))&&/Margen bruto: 6,45 €/.test(await text(p,'#rcSummary')),await text(p,'#rcPrep'));
 await tap(p,'#rcPrep button');await typeIn(p,'#laborHour','18');
 ok(`[${wd}] el aviso lleva a «Tiempo y mise en place»`,(await seen(p,'#page-prep'))&&(await D(p)).settings.laborHour===18,null);
 await tap(p,'#mi_'+d.mise[1].id+' button:has-text("Eliminar")');
 ok(`[${wd}] eliminar una preparación pide confirmación y dice en qué bebidas deja de sumar`,(await seen(p,'#appConfirm'))&&/Picar hielo.*Mojito/.test(await text(p,'#appConfirm')),await seen(p,'#appConfirm')&&await text(p,'#appConfirm'));
 await tap(p,'#appConfirmYes');d=await D(p);
 ok(`[${wd}] eliminada: la bebida deja de sumarla (2,40 € por copa)`,d.mise.length===1&&d.drinks.find(x=>x.id==='mo').miseIds.length===1&&(await p.evaluate(()=>totalCost(data.drinks.find(x=>x.id==='mo')))).toFixed(2)==='2.40',d.drinks.find(x=>x.id==='mo'));
 await tap(p,'#mi_'+d.mise[0].id+' button:has-text("Editar")');await typeIn(p,'#mMin','40');await tap(p,'#mSave');
 ok(`[${wd}] editar una preparación cambia lo que toca por copa (40 min / 60 = 0,20 €)`,(await D(p)).mise[0].minutes===40&&/0,67 min por copa = 0,20 € · Mojito/.test(await text(p,'#miseList')),await text(p,'#miseList'));
}
// ── Datos raros al cargar o importar: se limpian ──
{const bad={...SEED,schema:9,settings:{...SEED.settings,laborHour:'abc'},mise:[{id:'m1',name:'Limas',minutes:-5,servings:60},{id:'m2',name:'',minutes:5,servings:5},'x',{id:'m3',name:'Hielo',minutes:9999,servings:1e9}],drinks:[{...SEED.drinks[0],method:'volar',prepMin:999,miseIds:['m1','nada',5,'m1']}]};
 const p=await mk(PHONE,{},bad);const d=await D(p),mo=d.drinks[0];
 ok('datos raros: coste por hora no numérico = 0, preparaciones sin nombre fuera, minutos y copas acotados, método desconocido fuera, tiempo ≤ 120 min y solo preparaciones que existen',d.settings.laborHour===0&&d.mise.length===2&&d.mise[0].minutes===0&&d.mise[1].minutes===600&&d.mise[1].servings===10000&&!('method' in mo)&&mo.prepMin===120&&JSON.stringify(mo.miseIds)==='["m1"]',[d.settings.laborHour,d.mise,mo])}
// ── Accesibilidad (axe) ──
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const seed={...SEED,schema:9,settings:{...SEED.settings,laborHour:18},mise:[{id:'m1',name:'Cortar limas',minutes:20,servings:60}],drinks:[{...SEED.drinks[0],method:'batido',prepMin:2.5,miseIds:['m1']},SEED.drinks[1]]};
 const p=await mk(dev,{bypassCSP:true},seed);await toCarta(p);await tap(p,'#prepOpen');await p.addScriptTag({path:AXE});
 const run=sel=>p.evaluate(async s=>{const r=await axe.run(document.querySelector(s),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']});return r.violations.map(x=>({id:x.id,n:x.nodes.length,t:x.nodes.slice(0,3).map(y=>y.target.join(' '))}))},sel);
 const v1=await run('#page-prep');await tap(p,'#prepBack');await tap(p,'#cr_mo');const v2=await run('#page-recipe');await tap(p,'#rcEdit');const v3=await run('#drinkFormPanel');
 ok(`[${wd}] axe (WCAG 2.1 AA) en «Tiempo y mise en place», la receta y el formulario: sin incumplimientos`,!v1.length&&!v2.length&&!v3.length,[v1,v2,v3])}

ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO preparación: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
