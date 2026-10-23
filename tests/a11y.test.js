// Accesibilidad automática con axe-core (WCAG 2.1 A y AA) en cada pantalla, a 390 y 360 px.
// Se navega por toques; axe se inyecta con bypassCSP (la CSP de la app no permite scripts ajenos, como debe ser).
const {chromium,devices,NAME}=require('./env');const path=require('path');
const [,,F]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const AXE=require.resolve('axe-core/axe.min.js');
const PHONE={...devices['iPhone 13'],reducedMotion:'reduce',bypassCSP:true},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
(async()=>{const b=await chromium.launch();
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0]+' | '+e.message.split('\n').filter(l=>/intercepts|not visible|not stable|outside of the viewport|not enabled|detached/.test(l)).slice(-2).join(' / ').slice(0,400))});
const MORE=['Ficha','Diagnóstico','Informe','Ajustes','Instalar la app','Acerca de'];
const nav=async(p,label)=>{if(label==='Ingredientes'){await tap(p,'.mobile-nav button:has-text("Mi barra")');await tap(p,'#barFullList');return}if(MORE.includes(label)){await tap(p,'.mobile-nav button:has-text("Más")');await tap(p,`#page-more button:has-text("${label}")`)}else await tap(p,`.mobile-nav button:has-text("${label}")`)};
const audit=async p=>{if(!(await p.evaluate(()=>!!window.axe)))await p.addScriptTag({path:AXE});
 return p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']});return r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,t:v.nodes.slice(0,3).map(x=>x.target.join(' '))}))})};
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const c=await b.newContext(dev);const p=await c.newPage();await p.goto(APP_URL);
 const check=async name=>{const v=await audit(p);ok(`[${wd}] ${name}: sin problemas de accesibilidad (axe, WCAG 2.1 AA)`,v.length===0,v)};
 await check('bienvenida');await tap(p,'#wDemo');await check('Resumen (bar de ejemplo)');
 for(const l of ['Carta','Mi barra','Ingredientes','Stock','Más','Ficha','Diagnóstico','Informe','Ajustes','Instalar la app','Acerca de']){await nav(p,l);if(l==='Acerca de')for(const id of ['#faqData','#legalPrivacy'])await tap(p,id+' summary');await check(l)}
 await nav(p,'Carta');await tap(p,'#libOpen');await check('Biblioteca');await tap(p,'label[for="lib_negroni"]');await tap(p,'#libNext');await check('Revisar con mi barra');
 await nav(p,'Carta');await tap(p,'#drinkList .carta-row:has-text("Mojito")');await check('Receta de la biblioteca');
 await nav(p,'Carta');await tap(p,'#drinkList .carta-row:has-text("Café solo")');await check('Receta propia (Mi carta)');await nav(p,'Carta');await tap(p,'#drinkAdd');await check('Mi carta › Añadir bebida');
 await nav(p,'Stock');await check('Stock con la barra de guía');
 await nav(p,'Mi barra');await tap(p,'#barPaste');await p.fill('#pasteText','Tanqueray 70 cl 15\nRon 1 L');await tap(p,'#pasteReview');await check('Pegar una lista');
 await nav(p,'Resumen');await tap(p,'#demoExit');await check('Confirmación dentro de la página');await c.close()}
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO accesibilidad (${NAME}): ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,400):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
