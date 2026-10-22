// Rendimiento con muchos datos: 500 ingredientes, 100 bebidas con receta, 2000 controles de stock, ventas y
// hallazgos. Se importa por toques y se mide cuánto tarda cada pantalla (iPhone a 390 px). Los límites son
// holgados para una máquina de integración continua; los tiempos medidos se imprimen siempre.
const {chromium,devices,NAME}=require('./env');const path=require('path'),fs=require('fs');const TMP=path.join(__dirname,'tmp')+path.sep;fs.mkdirSync(TMP,{recursive:true});
const [,,F]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const LIMIT=+process.env.PERF_LIMIT_MS||2500;
const SUBS=[['Destilados','Rones'],['Destilados','Ginebras'],['Destilados','Vodkas'],['Destilados','Whiskys'],['Vinos','Tintos'],['Vinos','Blancos'],['Cervezas','Botellín y lata'],['Refrescos y mixers','Tónicas'],['Frutas, hierbas y zumos','Zumos'],['Siropes y azúcares','Siropes']];
const ing=Array.from({length:500},(_,i)=>{const [c,s]=SUBS[i%SUBS.length];return{id:'i'+i,name:`${s} ${i}`,category:c,subcategory:s,supplier:'Proveedor '+(i%7),format:'70 cl',unit:'ml',packUnit:'cl',packInput:70,packQty:700,packPrice:i%25===0?0:8+i%20,notes:''}});
const drinks=Array.from({length:100},(_,i)=>({id:'d'+i,name:'Bebida '+i,category:['Cóctel','Vino','Cerveza','Destilado'][i%4],price:6+i%8,taxRate:7,otherCost:0.1,recipe:'',notes:'',recipeItems:Array.from({length:5},(_,k)=>({ingredientId:'i'+((i*5+k)%500),qty:10+k*5}))}));
const sales=Array.from({length:20},(_,w)=>({id:'v'+w,label:'Semana '+w,start:'2026-01-01',end:'2026-01-07',lines:drinks.slice(0,60).map(d=>({drinkId:d.id,qty:5+w%9}))}));
const stocks=Array.from({length:2000},(_,i)=>({id:'s'+i,date:'2026-0'+(1+i%9)+'-15',start:'2026-0'+(1+i%9)+'-01',end:'2026-0'+(1+i%9)+'-07',product:`${SUBS[i%10][1]} ${i%500}`,unit:'ml',opening:7000,purchases:2800,closing:3500+(i%11)*10,salesUse:5000,tastings:100,comps:100,waste:50,otherOut:0,threshold:300,status:i%3?'Validados':'Sin validar',salesId:'v'+(i%20),notes:'Control '+i}));
const diags=Array.from({length:60},(_,i)=>({id:'g'+i,area:'Stock e inventario',status:['Pendiente','En revisión','Verificado','Resuelto'][i%4],finding:'Hallazgo '+i,evidence:'Evidencia '+i,action:'Acción '+i,check:'Comprobar '+i,priority:['Alta','Media','Baja'][i%3],due:'2026-11-01',owner:'',result:i%4>1?'Resultado '+i:''}));
const BIG=TMP+'muchos_datos.json';fs.writeFileSync(BIG,JSON.stringify({app:'Isla & Barra Control',schema:6,exportedAt:'2026-10-21T10:00:00.000Z',settings:{mode:'full',marginMin:55},business:{name:'Bar grande',location:'Arrecife'},ingredients:ing,drinks,sales,stocks,diagnostics:diags}));
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13'],acceptDownloads:true,reducedMotion:'reduce'});const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,120)));p.on('dialog',d=>d.dismiss());await p.goto(APP_URL);
const tap=(sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:15000});
const MORE=['Ficha','Diagnóstico','Informe','Ajustes','Acerca de'];
const timed=async(label,fn,wait)=>{const t0=Date.now();await fn();if(wait)await p.locator(wait).filter({visible:true}).first().waitFor({timeout:20000});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0))));const ms=Date.now()-t0;times.push([label,ms]);return ms};
const times=[];
// Para los toques se mide lo que nota el usuario: desde el toque (pointerdown) hasta el primer fotograma pintado
// después de responder al clic. (El tiempo de reloj incluiría las esperas internas de Playwright.)
const LAT=()=>{window.__lat=[];let t0=0;document.addEventListener('pointerdown',()=>{t0=performance.now()},true);document.addEventListener('click',()=>{const s=t0;setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>window.__lat.push(performance.now()-s))),0)},false)};
await c.addInitScript(LAT);await p.evaluate(LAT);
const tapLat=async(label,sels,wait)=>{await p.evaluate(()=>{window.__lat=[]});for(const s of sels)await tap(s);if(wait)await p.locator(wait).filter({visible:true}).first().waitFor({timeout:20000});await p.waitForFunction(n=>window.__lat.length>=n,sels.length,{timeout:20000});const ms=Math.round((await p.evaluate(()=>window.__lat)).reduce((a,b)=>Math.max(a,b),0));times.push([label+' (respuesta al toque)',ms])};const kb=fs.statSync(BIG).size/1024;
const [fc]=await Promise.all([p.waitForEvent('filechooser'),tap('#wRestore')]);
await timed('leer y revisar la copia ('+Math.round(kb)+' KB)',()=>fc.setFiles(BIG),'#importYes');
await timed('importar y pintar el Resumen',()=>tap('#importYes'),'#page-dashboard');
const n=await p.evaluate(()=>[data.ingredients.length,data.drinks.length,data.stocks.length,data.sales.length,data.diagnostics.length]);
ok('se importan 500 ingredientes, 100 bebidas, 2000 controles, 20 ventas y 60 hallazgos',n.join()==='500,100,2000,20,60',n);
for(const l of ['Bebidas','Mi barra','Stock','Resumen'])await tapLat('abrir '+l,[`.mobile-nav button:has-text("${l}")`],'#page-'+{Bebidas:'drinks','Mi barra':'bar',Stock:'stock',Resumen:'dashboard'}[l]);
await tapLat('abrir la lista completa de ingredientes',['.mobile-nav button:has-text("Mi barra")','#barFullList'],'#page-ingredients');
for(const l of MORE)await tapLat('abrir '+l,['.mobile-nav button:has-text("Más")',`#page-more button:has-text("${l}")`],'#page-'+{Ficha:'business','Diagnóstico':'diagnosis',Informe:'report',Ajustes:'settings','Acerca de':'about'}[l]);
await tap('.mobile-nav button:has-text("Más")');await tap('#page-more button:has-text("Ficha")');await p.fill('#bName','Bar grande 2');
await tapLat('guardar un cambio (ficha) con todos los datos',['#businessForm button:has-text("Guardar ficha")']);
await tap('.mobile-nav button:has-text("Bebidas")');await tapLat('abrir la biblioteca',['#libOpen'],'#page-library');
await tap('.mobile-nav button:has-text("Stock")');await tapLat('ver todos los controles (2000)',['#stockAll']);
await timed('recargar la app con todos los datos',()=>p.reload(),'#page-dashboard');
await tap('.mobile-nav button:has-text("Resumen")');await timed('exportar la copia',()=>Promise.all([p.waitForEvent('download'),tap('#dashExport')]));
const used=await p.evaluate(()=>storageUsed()/LS_LIMIT*100);
ok(`con estos datos la app ocupa ${used.toFixed(0)} % del almacenamiento (por debajo del aviso del 70 %)`,used<70,used);
for(const [l,ms] of times)ok(`${l}: ${ms} ms (límite ${LIMIT} ms)`,ms<=LIMIT,ms);
ok('sin errores de JavaScript',p.errs.length===0,p.errs);
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO rendimiento (${NAME}): ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
