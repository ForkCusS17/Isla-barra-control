// Seguridad: cabeceras del alojamiento y CSP (sin violaciones al usar la app), no se puede incrustar, el texto de
// los datos nunca se ejecuta como HTML e importaciones hostiles (tamaño, __proto__/constructor, tipos raros,
// anidamiento profundo, demasiados elementos). Emulación de iPhone a 390 px; solo toques.
const {chromium,devices,NAME}=require('./env');const {start}=require('./server');const {hashes}=require('../tools/stamp');
const path=require('path'),fs=require('fs');const ROOT=path.join(__dirname,'..'),TMP=path.join(__dirname,'tmp')+path.sep;fs.mkdirSync(TMP,{recursive:true});
const [,,F,J]=process.argv;const T=[];const ok=(n,c,x)=>{T.push([!!c,n,c?'':JSON.stringify(x)]);console.log('· '+(c?'ok ':'MAL ')+n)};/* progreso: si la serie se cuelga, se ve hasta dónde llegó */
// Espera con límite: en Firefox, evaluar en un marco bloqueado o esperar a algo que no llega puede no terminar nunca.
const within=(pr,ms,alt)=>Promise.race([pr,new Promise(r=>setTimeout(()=>r(alt),ms))]);
const PHONE={...devices['iPhone 13'],acceptDownloads:true,reducedMotion:'reduce'};
(async()=>{const srv=await start();const APP=srv.base+'isla_barra_control_mvp.html';const b=await chromium.launch();const pages=[];
const mk=async(init)=>{const c=await b.newContext(PHONE);await c.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+e.blockedURI));window.print=()=>{}});if(init)await c.addInitScript(init);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,120)));p.on('dialog',d=>{p.dl.push(d.type()+': '+d.message().slice(0,60));d.dismiss()});await p.goto(APP);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:6000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0]+' | '+e.message.split('\n').filter(l=>/intercepts|not visible|not stable|outside of the viewport|not enabled|detached/.test(l)).slice(-2).join(' / ').slice(0,400))});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').trim());
const MORE=['Ficha','Diagnóstico','Informe','Ajustes','Instalar la app','Acerca de'];
const nav=async(p,label)=>{if(label==='Ingredientes'){await tap(p,'.mobile-nav button:has-text("Mi barra")');await tap(p,'#barFullList');return}if(MORE.includes(label)){await tap(p,'.mobile-nav button:has-text("Más")');await tap(p,`#page-more button:has-text("${label}")`)}else await tap(p,`.mobile-nav button:has-text("${label}")`)};
const tour=async p=>{for(const l of ['Resumen','Carta','Mi barra','Ingredientes','Stock','Ficha','Diagnóstico','Informe','Ajustes','Instalar la app','Acerca de'])await nav(p,l)};
const importFile=async(p,file)=>{const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:4000}),tap(p,'#wRestore')]);await fc.setFiles(file);await p.waitForTimeout(250)};
const W=(name,o)=>{const f=TMP+name;fs.writeFileSync(f,typeof o==='string'?o:JSON.stringify(o));return f};

// ── 1. Cabeceras y CSP ───────────────────────────────────────────────────────
let p=await mk();const res=await p.request.get(APP);const H=res.headers(),csp=H['content-security-policy']||'';const html=fs.readFileSync(path.join(ROOT,'isla_barra_control_mvp.html'),'utf8'),h=hashes(html);
ok('cabecera CSP: nada por defecto, solo el script y el estilo de la app (por hash), sin incrustar',/default-src 'none'/.test(csp)&&csp.includes('script-src '+h.script+';')&&csp.includes('style-src '+h.style+';')&&/frame-ancestors 'none'/.test(csp)&&/object-src 'none'/.test(csp)&&/base-uri 'none'/.test(csp)&&!/unsafe-eval/.test(csp)&&!/script-src [^;]*unsafe-inline/.test(csp),csp);
ok('nosniff, referrer no-referrer, X-Frame-Options DENY',H['x-content-type-options']==='nosniff'&&H['referrer-policy']==='no-referrer'&&H['x-frame-options']==='DENY',H);
const meta=await p.evaluate(()=>(document.querySelector('meta[http-equiv="Content-Security-Policy"]')||{}).content||'');
ok('la misma CSP va en el <meta> del HTML (para alojamientos sin cabeceras), sin frame-ancestors',meta===csp.replace("; frame-ancestors 'none'",'')&&!/frame-ancestors/.test(meta),meta);
ok('el <meta> CSP va antes de cualquier estilo o script',/<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy"/.test(html)&&html.indexOf('http-equiv="Content-Security-Policy"')<html.indexOf('<style>'),null);
await tap(p,'#wDemo');await tour(p);await nav(p,'Carta');await tap(p,'#libOpen');await tap(p,'#libBack');await tap(p,'#drinkList .carta-row:has-text("Mojito")');
await nav(p,'Informe');await tap(p,'button:has-text("Imprimir / guardar PDF")');await Promise.all([p.waitForEvent('download'),tap(p,'button:has-text("Descargar informe TXT")')]);await nav(p,'Resumen');await Promise.all([p.waitForEvent('download'),tap(p,'#dashExport')]);
ok('recorrer toda la app (bar de ejemplo, biblioteca, receta, informe, descargas) sin ninguna violación de la CSP',(await p.evaluate(()=>window.__csp)).length===0,await p.evaluate(()=>window.__csp));
ok('…y el service worker se registra con la CSP',await within(p.evaluate(()=>navigator.serviceWorker.ready.then(()=>true)),8000,false),null);
const inj=await p.evaluate(()=>{const s=document.createElement('script');s.textContent='window.__inyectado=1';document.body.appendChild(s);return window.__inyectado===1});
const viol=await p.waitForFunction(()=>window.__csp.some(x=>/script-src/.test(x)),null,{timeout:5000}).then(()=>true,()=>false);/* el aviso de la CSP llega de forma asíncrona */
ok('un <script> inyectado en la página no se ejecuta (solo el de la app tiene permiso)',!inj&&viol,[inj,viol]);

// ── 2. No se puede incrustar en otra web ─────────────────────────────────────
{const other=await start({override:{'otra.html':`<iframe id="f" src="${APP}" style="width:390px;height:600px"></iframe><iframe id="g" src="${APP}?sin-cabeceras" style="width:390px;height:600px"></iframe>`}});/* otro puerto = otro origen */const c=await b.newContext(PHONE);const q=await c.newPage();await q.goto(other.base+'otra.html?sin-cabeceras');await q.waitForTimeout(1500);
 const st=async id=>{const fr=await (await q.$(id)).contentFrame();if(!fr)return 'bloqueado';try{return await within(fr.evaluate(()=>document.getElementById('page-dashboard')?'app':'vacío'),5000,'bloqueado')}catch(e){return 'bloqueado'}};const a=await st('#f'),g=await st('#g');
 ok('otra web no puede mostrar la app dentro de un marco (frame-ancestors)',a!=='app',[a,g]);ok('(control: el mismo marco sin las cabeceras sí cargaría)',g==='app',g);other.server.close()}

// ── 3. El texto de los datos nunca se ejecuta ───────────────────────────────
const XSS={app:'Isla & Barra Control',business:{name:'"><svg onload="window.__pwned=3">Bar'},settings:{mode:'full'},ingredients:[{id:'i1',name:'<img src=x onerror="window.__pwned=1">Ron',category:'Destilados',subcategory:'Rones',unit:'ml',packQty:700,packPrice:14,notes:'<script>window.__pwned=6</script>'}],
 drinks:[{id:'d1',name:'<script>window.__pwned=2</script>Mojito',category:'Cóctel',price:9,recipeItems:[{ingredientId:'i1',qty:50}],recipe:'<img src=x onerror=window.__pwned=7>'}],stocks:[{id:'s1',product:'<b onmouseover=window.__pwned=5>Ginebra</b>',unit:'ml',opening:10,closing:5,start:'2026-10-01',end:'2026-10-07'}],diagnostics:[{id:'g1',area:'Carta y precios',status:'Pendiente',finding:'<iframe src="javascript:window.__pwned=4"></iframe>Hallazgo',evidence:'e',action:'a'}],sales:[]};
let x=await mk();await importFile(x,W('xss.json',XSS));await tap(x,'#importYes');const ov=[];for(const l of ['Resumen','Carta','Mi barra','Ingredientes','Stock','Ficha','Diagnóstico','Informe']){await nav(x,l);const w=await x.evaluate(()=>document.documentElement.scrollWidth);if(w>391)ov.push(l+' '+w)}
ok('palabras largas sin espacios en los datos no desbordan ninguna pantalla',ov.length===0,ov);await tour(x);await nav(x,'Informe');await nav(x,'Ingredientes');
ok('textos con HTML o scripts se muestran como texto y no se ejecutan en ninguna pantalla ni en el informe',(await x.evaluate(()=>window.__pwned))===undefined&&(await x.evaluate(()=>document.body.innerText.includes('<img src=x onerror="window.__pwned=1">Ron'))),await x.evaluate(()=>window.__pwned));

// ── 4. Importaciones hostiles ────────────────────────────────────────────────
{const q=await mk();const big=W('enorme.json','{"app":"Isla & Barra Control","business":{"name":"'+'x'.repeat(6*1024*1024)+'"},"drinks":[],"stocks":[],"diagnostics":[]}');await importFile(q,big);
 ok('archivo de 6 MB: se rechaza antes de leerlo, con el tamaño y el máximo (5 MB)',/el máximo es 5 MB/.test(await text(q,'#toast'))&&/6 MB/.test(await text(q,'#toast'))&&!(await seen(q,'#importConfirm')),await text(q,'#toast'))}
{const q=await mk();await importFile(q,W('proto.json','{"app":"Isla & Barra Control","__proto__":{"polluted":"si"},"constructor":{"prototype":{"polluted":"si"}},"business":{"name":"P","__proto__":{"isAdmin":true}},"settings":{"__proto__":{"mode":"x"},"help":{"__proto__":{"x":1},"cost":"ok"},"brand":{"__proto__":{"color":"#000"}}},"ingredients":[{"__proto__":{"active":false},"name":"I","packQty":1,"packPrice":1}],"drinks":[{"constructor":{"prototype":{"polluted":"si"}},"name":"D","__proto__":{"isAdmin":true}}],"stocks":[],"diagnostics":[]}'));
 await tap(q,'#importYes');const r=await q.evaluate(()=>{const s=JSON.stringify(data);return{pol:({}).polluted,adm:data.drinks[0].isAdmin,biz:data.business.isAdmin,proto:Object.getPrototypeOf(data.business)===Object.prototype&&Object.getPrototypeOf(data.drinks[0])===Object.prototype,keys:/"__proto__"|"constructor"|"prototype"/.test(s),stored:/"__proto__"|"constructor"/.test(localStorage.getItem('islaBarraControlMVP_v1')),act:data.ingredients[0].active,n:data.drinks[0].name}});
 ok('claves __proto__, constructor y prototype: se descartan; ningún objeto cambia de prototipo ni se contamina',r.pol===undefined&&r.adm===undefined&&r.biz===undefined&&r.proto&&!r.keys&&!r.stored&&r.act===true&&r.n==='D',r)}
{const odd={app:'Isla & Barra Control',business:{name:123,notes:{a:1},date:[],contact:null,period:true},settings:{marginMin:'abc',taxonomy:'x',brand:[],units:{dash:-1,gota:'no'},help:5,mode:{},lastBackupAt:{}},
  ingredients:[null,5,'a',[],{name:{x:1},packQty:'abc',packPrice:-5,unit:'litros',category:7,subcategory:[],notes:{},supplier:['x'],id:{}},{name:'Ron',packQty:'1e400',packPrice:'14',unit:'ml'}],
  drinks:[{name:null,price:'9',taxRate:'x',recipeItems:'no',components:5,templateId:{},category:[],recipe:{}},{name:'B',recipeItems:[null,{ingredientId:{},qty:'x'}],templateId:'mojito',templateSnapshot:'x',components:[null,{tipo:5,unidad:'kg',cantidad:'x'}]}],
  stocks:[{opening:'x',closing:null,product:7,status:{},unit:5,start:{},notes:[]},5],diagnostics:[{finding:[],status:'Hackeado',priority:9,due:{}},'x'],sales:[{lines:'x',label:{}},{lines:[{drinkId:{},qty:'3'}]}]};
 const q=await mk();await importFile(q,W('raros.json',odd));await tap(q,'#importYes');await tour(q);await nav(q,'Informe');await nav(q,'Carta');await tap(q,'#libOpen');
 const r=await q.evaluate(()=>({biz:data.business.name,notes:data.business.notes,n:data.ingredients.length,ing:data.ingredients.map(i=>[typeof i.name,i.unit,i.packQty]),dr:data.drinks.map(d=>[typeof d.name,d.price,Array.isArray(d.recipeItems)]),st:data.stocks.map(s=>[s.status,s.unit,typeof s.product]),dg:data.diagnostics.map(g=>g.status),mm:data.settings.marginMin}));
 ok('tipos raros (números, objetos, listas, null, textos en campos numéricos): se importan saneados',r.biz==='123'&&r.notes===''&&r.n===2&&r.mm===55&&r.ing.every(([t])=>t==='string')&&r.ing[1][2]===0&&r.dr[0][1]===9&&r.dr.every(([t,,a])=>t==='string'&&a)&&r.st.length===1&&r.st[0][0]==='Sin validar'&&r.st[0][1]==='ml'&&r.st[0][2]==='string'&&r.dg.length===1,r);
 ok('…y la app funciona con ellos en todas las pantallas, la biblioteca y el informe (sin errores)',q.errs.length===0,q.errs)}
{const q=await mk();await importFile(q,W('profundo.json','{"app":"Isla & Barra Control","business":{},"drinks":[],"stocks":[],"diagnostics":[],"x":'+'['.repeat(100000)+']'.repeat(100000)+'}'));
 ok('JSON con 100 000 niveles de anidamiento: se rechaza sin colgarse',/no parece una copia válida/.test(await text(q,'#toast'))&&!(await seen(q,'#importConfirm'))&&q.errs.length===0,[await text(q,'#toast'),q.errs])}
{const q=await mk();await importFile(q,W('muchos.json',{app:'Isla & Barra Control',business:{},drinks:Array.from({length:2001},()=>({})),stocks:[],diagnostics:[]}));
 ok('demasiados elementos (2001 bebidas): se rechaza explicando por qué',/demasiados elementos \(drinks\)/.test(await text(q,'#toast'))&&!(await seen(q,'#importConfirm')),await text(q,'#toast'))}
{const q=await mk();await importFile(q,W('texto.json','esto no es json'));ok('archivo que no es JSON: «no parece una copia válida»',/no parece una copia válida/.test(await text(q,'#toast')),null)}
{const q=await mk();await importFile(q,W('otra-app.json',{app:'Otra app',business:{},drinks:[],stocks:[],diagnostics:[]}));ok('copia de otra aplicación: se rechaza',/no parece una copia válida/.test(await text(q,'#toast')),null)}
{const q=await mk(()=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem('islaBarraControlMVP_v1','{"__proto__":{"polluted":"si"},"business":{"name":"Guardado","constructor":{"prototype":{"x":1}}},"drinks":[],"stocks":[],"diagnostics":[]}')});
 ok('datos guardados con claves peligrosas: se leen sin contaminar nada',(await q.evaluate(()=>[({}).polluted,data.business.name,Object.getPrototypeOf(data)===Object.prototype]))+''===',Guardado,true',await q.evaluate(()=>[({}).polluted,data.business.name]))}

ok('sin errores de JavaScript ni diálogos del navegador',pages.every(z=>z.errs.length===0&&z.dl.length===0),pages.map(z=>[z.errs,z.dl]));
const pass=T.filter(z=>z[0]).length;console.log(`RESULTADO seguridad (${NAME}): ${pass}/${T.length}`);T.forEach(z=>console.log((z[0]?'OK   ':'FALLA ')+z[1]+(z[2]?'  → '+z[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close();srv.server.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
