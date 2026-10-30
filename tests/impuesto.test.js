// Impuesto por producto (esquema 7) y precios con separador de miles: emulación de móvil (390 y 360 px) y solo toques.
const {chromium,devices}=require('./env');const [,,F]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];
const {smallTargets,contrastFails}=require('./helpers');
const AXE=require.resolve('axe-core/axe.min.js');
const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const KEY='islaBarraControlMVP_v1';
const PHONE={...devices['iPhone 13'],reducedMotion:'reduce'},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
// Datos del esquema 6 (antes del impuesto por producto), con valores raros para comprobar la limpieza
const SEED={schema:6,settings:{mode:'full',started:true,guideHidden:true},business:{name:'Bar Impuesto',location:'Arrecife',period:'Octubre'},
 ingredients:[
  {id:'g1',name:'Ginebra',category:'Destilados',subcategory:'Ginebras',supplier:'',format:'Botella',unit:'ml',packUnit:'ml',packInput:700,packQty:700,packPrice:14,unitCost:0.02,notes:'',active:true},
  {id:'x1',name:'Licor raro',category:'Licores',subcategory:'',unit:'ml',packUnit:'ml',packInput:700,packQty:700,packPrice:7,taxType:'XYZ',taxRate:'abc',taxIncluded:'yes',taxIsCost:1,active:true},
  {id:'x2',name:'Licor caro',category:'Licores',subcategory:'',unit:'ml',packUnit:'ml',packInput:700,packQty:700,packPrice:7,taxType:'IGIC',taxRate:250,taxIncluded:true,taxIsCost:true,active:true},
  {id:'x3',name:'Licor negativo',category:'Licores',subcategory:'',unit:'ml',packUnit:'ml',packInput:700,packQty:700,packPrice:7,taxType:'IVA',taxRate:-5,taxIncluded:false,taxIsCost:true,active:true}],
 drinks:[{id:'d1',name:'Gin-tonic',category:'Cóctel',price:9,taxRate:7,otherCost:0,recipeItems:[{ingredientId:'g1',qty:50}],recipe:'',notes:''}],
 sales:[],stocks:[],diagnostics:[]};
(async()=>{const b=await chromium.launch();const pages=[];
const mk=async(dev=PHONE,seed=SEED,extra={})=>{const c=await b.newContext({...dev,...extra});await c.clock.setFixedTime(new Date('2026-10-30T10:00:00Z'));if(seed)await c.addInitScript(([k,s])=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem(k,s)},[KEY,JSON.stringify(seed)]);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,120)));p.on('dialog',d=>{p.dl.push(d.type()+': '+d.message().slice(0,60));d.dismiss()});await p.goto(APP_URL);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0])});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').trim());
const D=p=>p.evaluate(()=>JSON.parse(JSON.stringify(data)));
const ING=(d,id)=>d.ingredients.find(x=>x.id===id);
const near=(a,b)=>Math.abs(a-b)<1e-9;
const wide=async p=>[await p.evaluate(()=>document.documentElement.scrollWidth),p.viewportSize().width];
const toIngredients=async p=>{await tap(p,'.mobile-nav button:has-text("Mi barra")');await tap(p,'#barFullList')};
const editGin=async p=>{await toIngredients(p);await tap(p,'#page-ingredients tr:has-text("Ginebra") button:has-text("Editar")')};
const save=p=>tap(p,'#ingredientForm button[type=submit]');
const ginCost=async p=>{await tap(p,'.mobile-nav button:has-text("Carta")');return text(p,'#page-drinks [data-on-click^="openDrink"]:has-text("Gin-tonic")')};

for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const p=await mk(dev);
 // ── Migración desde el esquema 6 ──
 let d=await D(p);const g=ING(d,'g1');
 ok(`[${wd}] migración: esquema actual (8) y los productos antiguos quedan «Sin indicar» con el mismo coste (0,02 €/ml)`,d.schema===8&&g.taxType===''&&g.taxRate===0&&g.taxIncluded===false&&g.taxIsCost===false&&near(g.unitCost,0.02),g);
 ok(`[${wd}] migración: valores raros se limpian (tipo desconocido → sin indicar; 250 % → 100 %; −5 % → 0 %)`,ING(d,'x1').taxType===''&&ING(d,'x1').taxIncluded===false&&ING(d,'x1').taxIsCost===false&&near(ING(d,'x1').unitCost,0.01)&&ING(d,'x2').taxRate===100&&near(ING(d,'x2').unitCost,0.01)&&ING(d,'x3').taxRate===0&&near(ING(d,'x3').unitCost,0.01),[ING(d,'x1'),ING(d,'x2'),ING(d,'x3')]);
 ok(`[${wd}] Mi carta: el gin-tonic sigue costando 1,00 € tras migrar`,/Coste 1,00 €/.test(await ginCost(p)),await ginCost(p));
 // ── Formulario: sin indicar → campos ocultos ──
 await editGin(p);
 ok(`[${wd}] editar: «Impuesto: Sin indicar» y los campos del tipo ocultos`,(await p.inputValue('#iTaxType'))===''&&!(await seen(p,'#iTaxRate'))&&!(await seen(p,'#iTaxIncl'))&&!(await seen(p,'#iTaxCost')),null);
 await p.selectOption('#iTaxType','IGIC');
 ok(`[${wd}] elegir IGIC muestra tipo, «El precio escrito» y «El escandallo usa»`,(await seen(p,'#iTaxRate'))&&(await seen(p,'#iTaxIncl'))&&(await seen(p,'#iTaxCost')),null);
 await p.fill('#iTaxRate','7');await p.selectOption('#iTaxIncl','1');
 const pv=await text(p,'#ingredientPreview');
 ok(`[${wd}] vista previa: 14 € con IGIC 7 % incluido → sin impuesto 13,08 €, con impuesto 14,00 €, escandallo sin impuesto (0,0187 €/ml)`,/Envase sin impuesto: 13,08 €/.test(pv)&&/con IGIC \(7 %\): 14,00 €/.test(pv)&&/usa el coste sin impuesto/.test(pv)&&/0,0187/.test(pv),pv);
 await save(p);d=await D(p);
 ok(`[${wd}] guardar: IGIC 7 % incluido, escandallo sin impuesto → 14 / 1,07 / 700 €/ml`,ING(d,'g1').taxType==='IGIC'&&ING(d,'g1').taxRate===7&&ING(d,'g1').taxIncluded===true&&ING(d,'g1').taxIsCost===false&&near(ING(d,'g1').unitCost,14/1.07/700)&&ING(d,'g1').packPrice===14,ING(d,'g1'));
 ok(`[${wd}] la lista completa muestra «IGIC 7 % incluido»`,/IGIC 7 % incluido/.test(await text(p,'#page-ingredients tr:has-text("Ginebra")')),await text(p,'#page-ingredients tr:has-text("Ginebra")'));
 ok(`[${wd}] Mi carta recalcula el gin-tonic: 50 ml → 0,93 €`,/Coste 0,93 €/.test(await ginCost(p)),await ginCost(p));
 // ── Impuesto como coste ──
 await editGin(p);
 ok(`[${wd}] al editar se recuperan IGIC, 7 % e «Incluye el impuesto»`,(await p.inputValue('#iTaxType'))==='IGIC'&&(await p.inputValue('#iTaxRate'))==='7'&&(await p.inputValue('#iTaxIncl'))==='1'&&(await p.inputValue('#iTaxCost'))==='0',null);
 await p.selectOption('#iTaxCost','1');await save(p);d=await D(p);
 ok(`[${wd}] «Coste con impuesto» con precio que lo incluye → 14 / 700 = 0,02 €/ml`,near(ING(d,'g1').unitCost,0.02)&&ING(d,'g1').taxIsCost===true,ING(d,'g1'));
 await editGin(p);await p.selectOption('#iTaxIncl','0');
 ok(`[${wd}] precio sin impuesto y escandallo con impuesto: vista previa con 14,98 € y 0,0214 €/ml`,/con IGIC \(7 %\): 14,98 €/.test(await text(p,'#ingredientPreview'))&&/0,0214/.test(await text(p,'#ingredientPreview')),await text(p,'#ingredientPreview'));
 await save(p);d=await D(p);
 ok(`[${wd}] guardado: 14 × 1,07 / 700 €/ml`,near(ING(d,'g1').unitCost,14*1.07/700),ING(d,'g1'));
 // ── IVA y sin impuesto ──
 await editGin(p);await p.selectOption('#iTaxType','IVA');await p.fill('#iTaxRate','21');await p.selectOption('#iTaxCost','0');await save(p);d=await D(p);
 ok(`[${wd}] IVA 21 % aparte, escandallo sin impuesto → 0,02 €/ml (el precio escrito ya es sin impuesto)`,ING(d,'g1').taxType==='IVA'&&ING(d,'g1').taxRate===21&&near(ING(d,'g1').unitCost,0.02),ING(d,'g1'));
 await editGin(p);await p.selectOption('#iTaxType','none');
 ok(`[${wd}] «Sin impuesto» oculta los campos del tipo y lo dice en la vista previa`,!(await seen(p,'#iTaxRate'))&&/Producto sin impuesto/.test(await text(p,'#ingredientPreview')),null);
 await save(p);d=await D(p);
 ok(`[${wd}] guardado «Sin impuesto»: sin tipo, 0,02 €/ml y etiqueta en la lista`,ING(d,'g1').taxType==='none'&&ING(d,'g1').taxRate===0&&ING(d,'g1').taxIsCost===false&&near(ING(d,'g1').unitCost,0.02)&&/Sin impuesto/.test(await text(p,'#page-ingredients tr:has-text("Ginebra")')),ING(d,'g1'));
 // ── Validación: tipo fuera de rango no se guarda ──
 await editGin(p);await p.selectOption('#iTaxType','IGIC');await p.fill('#iTaxRate','150');await save(p);d=await D(p);
 ok(`[${wd}] un tipo de 150 % no se guarda (el campo lo rechaza)`,ING(d,'g1').taxType==='none',ING(d,'g1'));
 await p.fill('#iTaxRate','7');await p.selectOption('#iTaxIncl','1');await save(p);
 // ── Persistencia ──
 await p.reload();d=await D(p);
 ok(`[${wd}] tras recargar se conservan IGIC 7 % incluido y el coste`,ING(d,'g1').taxType==='IGIC'&&ING(d,'g1').taxRate===7&&ING(d,'g1').taxIncluded===true&&near(ING(d,'g1').unitCost,14/1.07/700),ING(d,'g1'));
 // ── Nuevo ingrediente desde el formulario con impuesto ──
 await toIngredients(p);await p.fill('#iName','Vermut prueba');await p.fill('#iPackQty','1000');await p.fill('#iPackPrice','10,70'.replace(',','.'));await p.selectOption('#iTaxType','IGIC');await p.fill('#iTaxRate','7');await p.selectOption('#iTaxIncl','1');await save(p);d=await D(p);
 const vm=d.ingredients.find(x=>x.name==='Vermut prueba');
 ok(`[${wd}] alta nueva: 10,70 € con IGIC 7 % incluido en 1 L → 0,01 €/ml sin impuesto`,vm&&vm.taxType==='IGIC'&&near(vm.unitCost,0.01),vm);
 ok(`[${wd}] tras guardar, el formulario vuelve a «Sin indicar» con los campos ocultos`,(await p.inputValue('#iTaxType'))===''&&!(await seen(p,'#iTaxRate')),null);
 // ── Pegar una lista con miles ──
 await tap(p,'#backToBar');await tap(p,'#barPaste');
 await p.fill('#pasteText',['Ron Mil;70cl;1.234,50','Vodka Mil;70cl;1,234.50','Gin Millón;70cl;1.234.567','Licor Corto;70cl;1.234','Ron Texto;70cl;doce'].join('\n'));await tap(p,'#pasteReview');
 const sum=await text(p,'#pasteSummary');
 ok(`[${wd}] pegar: «1.234,50», «1,234.50», «1.234.567» y «1.234» son válidos; «doce» sigue siendo error`,/5 líneas leídas · 4 para añadir · 1 con error/.test(sum),sum);
 await tap(p,'#pasteAdd');d=await D(p);const P=n=>(d.ingredients.find(x=>x.name===n)||{}).packPrice;
 ok(`[${wd}] precios guardados: 1234,5 · 1234,5 · 1234567 · 1,234 (sin separador de miles sigue siendo decimal)`,P('Ron Mil')===1234.5&&P('Vodka Mil')===1234.5&&P('Gin Millón')===1234567&&P('Licor Corto')===1.234&&P('Ron Texto')===undefined,[P('Ron Mil'),P('Vodka Mil'),P('Gin Millón'),P('Licor Corto')]);
 // ── Pantalla: desbordamiento, botones, contraste ──
 await toIngredients(p);await tap(p,'#page-ingredients tr:has-text("Ginebra") button:has-text("Editar")');
 ok(`[${wd}] formulario con impuesto: sin desbordamiento horizontal`,(w=>w[0]<=w[1]+1)(await wide(p)),await wide(p));
 const st=await smallTargets(p,'#ingredientForm');ok(`[${wd}] formulario con impuesto: objetivos táctiles ≥ 44 px`,st.length===0,st);
 const cf=await contrastFails(p);ok(`[${wd}] formulario con impuesto: contraste ≥ 4,5:1`,cf.length===0,cf);
}
// ── Accesibilidad (axe) del formulario con los campos del impuesto a la vista ──
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const p=await mk(dev,SEED,{bypassCSP:true});await editGin(p);await p.selectOption('#iTaxType','IGIC');
 await p.addScriptTag({path:AXE});const v=await p.evaluate(async()=>{const r=await axe.run(document.getElementById('page-ingredients'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']});return r.violations.map(x=>({id:x.id,n:x.nodes.length,t:x.nodes.slice(0,3).map(y=>y.target.join(' '))}))});
 ok(`[${wd}] axe (WCAG 2.1 AA) en Ingredientes con IGIC: sin incumplimientos`,v.length===0,v)}

ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO impuesto: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
