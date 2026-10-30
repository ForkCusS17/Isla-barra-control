// Biblioteca con los productos de tu barra: elegir cualquier producto (o crear uno nuevo con nombre, formato y precio) al
// añadir cócteles, y «Revisar cócteles con mi barra» para los ya creados. Emulación de móvil (390 y 360 px) y solo toques.
const {chromium,devices}=require('./env');const [,,F]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];
const {smallTargets,contrastFails}=require('./helpers');
const AXE=require.resolve('axe-core/axe.min.js');
const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const KEY='islaBarraControlMVP_v1';
const PHONE={...devices['iPhone 13'],reducedMotion:'reduce'},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
const ing=(id,name,category,subcategory,qty,price,unit='ml')=>({id,name,category,subcategory,supplier:'',format:'Botella',unit,packUnit:unit,packInput:qty,packQty:qty,packPrice:price,notes:'',active:true});
const SEED={schema:7,settings:{mode:'full',started:true,guideHidden:true},business:{name:'Bar Barra',location:'Arrecife',period:'Octubre'},
 ingredients:[ing('r1','Ron Carta Blanca','Destilados','Rones',700,14),ing('r2','Ron Diplomático','Destilados','Rones',700,30),ing('g1','Ginebra Beefeater','Destilados','Ginebras',700,16),ing('v1','Vodka Absolut','Destilados','Vodkas',700,13),ing('s1','Sirope de agave','Siropes y azúcares','Siropes',700,8)],
 drinks:[],sales:[],stocks:[],diagnostics:[]};
(async()=>{const b=await chromium.launch();const pages=[];
const mk=async(dev=PHONE,seed=SEED,extra={})=>{const c=await b.newContext({...dev,...extra});await c.clock.setFixedTime(new Date('2026-10-30T10:00:00Z'));if(seed)await c.addInitScript(([k,s])=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem(k,s)},[KEY,JSON.stringify(seed)]);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,120)));p.on('dialog',d=>{p.dl.push(d.type()+': '+d.message().slice(0,60));d.dismiss()});await p.goto(APP_URL);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0])});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').trim());
const D=p=>p.evaluate(()=>JSON.parse(JSON.stringify(data)));
const near=(a,b)=>Math.abs(a-b)<1e-9;
const wide=async p=>[await p.evaluate(()=>document.documentElement.scrollWidth),p.viewportSize().width];
const screenOK=async(p,wd,label,scope)=>{ok(`[${wd}] ${label}: sin desbordamiento horizontal`,(w=>w[0]<=w[1]+1)(await wide(p)),await wide(p));const st=await smallTargets(p,scope);ok(`[${wd}] ${label}: objetivos táctiles ≥ 44 px`,st.length===0,st);const cf=await contrastFails(p);ok(`[${wd}] ${label}: contraste ≥ 4,5:1`,cf.length===0,cf)};
const drink=(d,n)=>d.drinks.find(x=>x.name===n);
const compIng=(d,dn,tipo)=>(drink(d,dn).components.find(k=>k.tipo===tipo)||{}).ingredientId;
const byName=(d,n)=>d.ingredients.find(i=>i.name===n);

for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const p=await mk(dev);
 await tap(p,'.mobile-nav button:has-text("Carta")');
 ok(`[${wd}] sin cócteles de la biblioteca no se ofrece «Revisar cócteles con mi barra»`,!(await seen(p,'#libReviewAll')),null);
 // ── Añadir Mojito y Daiquiri ──
 await tap(p,'#libOpen');await tap(p,'label[for="lib_mojito"]');await tap(p,'label[for="lib_daiquiri"]');await tap(p,'#libNext');
 const ronOpts=(await p.locator('#lg_ron-blanco .lib-opt span').allInnerTexts()).map(x=>x.split(' · ')[0].trim());
 ok(`[${wd}] ron blanco: tus dos rones como opciones y «No lo tengo»`,ronOpts.some(x=>x==='Ron Carta Blanca')&&ronOpts.some(x=>x==='Ron Diplomático')&&ronOpts.some(x=>/^No lo tengo/.test(x)),ronOpts);
 const other=await p.locator('#lib_ot_ron-blanco optgroup').evaluateAll(g=>g.map(x=>x.label+': '+[...x.querySelectorAll('option')].map(o=>o.textContent).join(', ')));
 ok(`[${wd}] «Otro producto de tu barra» ofrece el resto de productos en ml, agrupados (ginebra, vodka, sirope…)`,other.some(x=>/Otros de Destilados: .*Ginebra Beefeater.*Vodka Absolut/.test(x))&&other.some(x=>/Siropes y azúcares: Sirope de agave/.test(x)),other);
 const sir=await p.locator('#lib_ot_sirope-simple optgroup').evaluateAll(g=>g.map(x=>x.label));
 ok(`[${wd}] sirope simple: el sirope de agave aparece primero, en «En Siropes»`,sir[0]==='En Siropes',sir);
 ok(`[${wd}] lo que no tienes queda en «No lo tengo» con nombre, formato y precio editables`,(await p.locator('#lg_zumo-lima input[value="__new"]').isChecked())&&(await seen(p,'#lib_nn_zumo-lima'))&&(await p.inputValue('#lib_nn_zumo-lima'))==='Zumo de lima'&&(await p.inputValue('#lib_nf_zumo-lima'))==='1 L'&&(await p.inputValue('#lib_np_zumo-lima'))==='',null);
 await tap(p,'#lg_ron-blanco .lib-opt:has-text("Ron Diplomático")');
 await p.selectOption('#lib_ot_sirope-simple','s1');
 ok(`[${wd}] elegir otro producto en la lista desmarca «No lo tengo» y oculta sus campos`,!(await p.locator('#lg_sirope-simple input[value="__new"]').isChecked())&&!(await seen(p,'#lib_nn_sirope-simple')),null);
 await p.fill('#lib_nn_zumo-lima','Zumo de lima natural');await p.fill('#lib_np_zumo-lima','3,20');
 await p.fill('#lib_nf_hierbabuena','70 cl');
 await tap(p,'#libCreate');
 ok(`[${wd}] un formato que no es en gramos para la hierbabuena no se acepta y no se crea nada`,/debe ir en g/.test(await text(p,'#toast'))&&(await D(p)).drinks.length===0&&(await D(p)).ingredients.length===5,await text(p,'#toast'));
 await p.fill('#lib_nf_hierbabuena','250 g');await tap(p,'#libCreate');
 let d=await D(p);
 ok(`[${wd}] creados Mojito y Daiquiri con Ron Diplomático y el sirope de agave`,drink(d,'Mojito')&&drink(d,'Daiquiri')&&compIng(d,'Mojito','ron-blanco')==='r2'&&compIng(d,'Daiquiri','ron-blanco')==='r2'&&compIng(d,'Mojito','sirope-simple')==='s1',d.drinks.map(x=>[x.name,x.components.map(k=>k.tipo+':'+k.ingredientId)]));
 const lima=byName(d,'Zumo de lima natural'),hb=byName(d,'Hierbabuena'),so=byName(d,'Soda');
 ok(`[${wd}] producto nuevo con los datos escritos: «Zumo de lima natural», 1 L a 3,20 € → 0,0032 €/ml, en Zumos`,lima&&lima.packQty===1000&&lima.packPrice===3.2&&near(lima.unitCost,0.0032)&&lima.subcategory==='Zumos'&&compIng(d,'Mojito','zumo-lima')===lima.id&&compIng(d,'Daiquiri','zumo-lima')===lima.id,lima);
 ok(`[${wd}] sin precio queda «Sin precio»: hierbabuena 250 g y soda con su formato por defecto (24 × 20 cl = 4800 ml)`,hb&&hb.packQty===250&&hb.unit==='g'&&hb.packPrice===0&&so&&so.packQty===4800&&so.packPrice===0,[hb,so]);
 ok(`[${wd}] cada producto nuevo se crea una sola vez (8 en Mi barra)`,d.ingredients.length===8&&d.ingredients.filter(i=>i.name==='Zumo de lima natural').length===1,d.ingredients.map(i=>i.name));
 // ── Revisar los cócteles ya creados ──
 await tap(p,'#libGoDrinks');
 ok(`[${wd}] Mi carta ofrece «Revisar cócteles con mi barra»`,await seen(p,'#libReviewAll'),null);
 await tap(p,'#libReviewAll');
 const sum=await text(p,'#revSummary');
 ok(`[${wd}] resumen: 5 ingredientes en 2 cócteles · 2 con aviso (hierbabuena y soda sin precio)`,/5 ingredientes en 2 cócteles · 2 con aviso/.test(sum),sum);
 const firstTwo=await p.locator('#libStep4 fieldset.lib-group h4').evaluateAll(h=>h.slice(0,2).map(x=>x.textContent).sort().join('|'));
 ok(`[${wd}] los ingredientes con aviso van primero`,firstTwo==='Hierbabuena|Soda',firstTwo);
 const ron=await text(p,'#rg_ron-blanco');
 ok(`[${wd}] ron blanco: dice qué usa ahora y en qué cócteles, y que tienes otro`,/Ahora: Ron Diplomático en Mojito, Daiquiri|Ahora: Ron Diplomático en Daiquiri, Mojito/.test(ron)&&/tienes otro en tu barra: Ron Carta Blanca/.test(ron)&&(await p.locator('#rg_ron-blanco input[value="__keep"]').isChecked()),ron);
 ok(`[${wd}] «Aplicar cambios» desactivado mientras todo quede como está`,await p.locator('#revApply').isDisabled(),null);
 await tap(p,'#rg_ron-blanco .lib-opt:has-text("Ron Carta Blanca")');
 const did=drink(d,'Daiquiri').id;await tap(p,`label:has(#rvd_ron-blanco_${did})`);
 ok(`[${wd}] elegir Ron Carta Blanca y quitar el Daiquiri: «Aplicar cambios (1)» y todavía no ha cambiado nada`,(await text(p,'#revApply'))==='Aplicar cambios (1)'&&compIng(await D(p),'Mojito','ron-blanco')==='r2',null);
 await tap(p,'#rg_soda .lib-opt:has-text("No lo tengo")');await p.fill('#rev_nn_soda','Soda Schweppes');await p.fill('#rev_nf_soda','24 x 20 cl');await p.fill('#rev_np_soda','9,60');
 await p.fill('#rev_nf_soda','doce');await tap(p,'#revApply');
 ok(`[${wd}] un formato no reconocido en el producto nuevo se explica y no se aplica nada`,/No reconozco el formato/.test(await text(p,'#toast'))&&compIng(await D(p),'Mojito','ron-blanco')==='r2',await text(p,'#toast'));
 await p.fill('#rev_nf_soda','24 x 20 cl');await tap(p,'#revApply');d=await D(p);
 const sch=byName(d,'Soda Schweppes');
 ok(`[${wd}] aplicado: el Mojito usa Ron Carta Blanca y el Daiquiri sigue con Ron Diplomático`,compIng(d,'Mojito','ron-blanco')==='r1'&&compIng(d,'Daiquiri','ron-blanco')==='r2',null);
 ok(`[${wd}] aplicado: soda nueva «Soda Schweppes» 9,60 € / 4800 ml en el Mojito, con la misma medida (rellenar)`,sch&&near(sch.unitCost,0.002)&&compIng(d,'Mojito','soda')===sch.id&&drink(d,'Mojito').components.find(k=>k.tipo==='soda').qty===100,sch);
 ok(`[${wd}] el coste del Mojito se recalcula con los productos nuevos (50 ml × 0,02 + 100 ml × 0,002 + …)`,drink(d,'Mojito').recipeItems.some(x=>x.ingredientId==='r1'&&x.qty===50)&&drink(d,'Mojito').recipeItems.some(x=>x.ingredientId===sch.id&&x.qty===100)&&near(drink(d,'Mojito').ingredientCost,50*0.02+20*0.0032+15*8/700+100*0.002),[drink(d,'Mojito').ingredientCost,drink(d,'Mojito').recipeItems]);
 ok(`[${wd}] tras aplicar, la revisión se vuelve a mostrar actualizada (1 con aviso: hierbabuena)`,/· 1 con aviso/.test(await text(p,'#revSummary')),await text(p,'#revSummary'));
 await screenOK(p,wd,'revisar cócteles','#libStep4');
 await p.reload();d=await D(p);
 ok(`[${wd}] tras recargar se conservan los cambios`,compIng(d,'Mojito','ron-blanco')==='r1'&&compIng(d,'Mojito','soda')===byName(d,'Soda Schweppes').id,null);
 // ── Paso de revisión al añadir: pantalla ──
 await tap(p,'.mobile-nav button:has-text("Carta")');await tap(p,'#libOpen');await tap(p,'label[for="lib_gin-tonic"]');await tap(p,'#libNext');
 await screenOK(p,wd,'revisar con mi barra (añadir)','#libStep2');
 await tap(p,'#libBackList');
}
// ── Accesibilidad (axe) de los dos pasos ──
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const p=await mk(dev,SEED,{bypassCSP:true});await tap(p,'.mobile-nav button:has-text("Carta")');await tap(p,'#libOpen');await tap(p,'label[for="lib_mojito"]');await tap(p,'#libNext');
 const run=()=>p.evaluate(async()=>{const r=await axe.run(document.getElementById('page-library'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']});return r.violations.map(x=>({id:x.id,n:x.nodes.length,t:x.nodes.slice(0,3).map(y=>y.target.join(' '))}))});
 await p.addScriptTag({path:AXE});let v=await run();ok(`[${wd}] axe en «Revisar con mi barra»: sin incumplimientos`,v.length===0,v);
 await tap(p,'#lg_ron-blanco .lib-opt:has-text("Ron Carta Blanca")');await tap(p,'#libCreate');await tap(p,'#libGoDrinks');await tap(p,'#libReviewAll');
 if(!(await p.evaluate(()=>!!window.axe)))await p.addScriptTag({path:AXE});v=await run();ok(`[${wd}] axe en «Revisar cócteles con mi barra»: sin incumplimientos`,v.length===0,v)}

ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO revisar cócteles: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
