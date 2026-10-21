// Interfaz en móvil: emulación de teléfono (390 px, táctil) y solo toques; sin llamar a funciones de la app.
const {chromium,devices}=require('playwright');const path=require('path');const TMP=path.join(__dirname,'tmp')+path.sep;require('fs').mkdirSync(TMP,{recursive:true});const fs=require('fs');const [,,F,J]=process.argv;const T=[];
const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const canon=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort()):v);
const PHONE={...devices['iPhone 13'],acceptDownloads:true};
(async()=>{const b=await chromium.launch();
const mk=async()=>{const c=await b.newContext(PHONE);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,100)));p.on('dialog',d=>{p.dl.push(d.message().slice(0,80));d.accept()});await p.goto('file://'+F);return p};
// Toca un elemento visible; falla si no existe, no se ve o queda tapado (Playwright comprueba que el toque le llega).
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:4000});
const visibleIn=async(p,sel)=>{const l=p.locator(sel).filter({visible:true}).first();if(!await l.count())return null;const r=await l.boundingBox();return r&&r.width>0&&r.height>0&&r.x>=0&&r.x+r.width<=390+1?r:null};
const importByTap=async(p,sel,file)=>{const [fc]=await Promise.all([p.waitForEvent('filechooser'),tap(p,sel)]);await fc.setFiles(file);await p.waitForTimeout(400)};
const downloadByTap=async(p,sel)=>{const [dl]=await Promise.all([p.waitForEvent('download',{timeout:4000}),tap(p,sel)]);return{name:dl.suggestedFilename(),text:fs.readFileSync(await dl.path(),'utf8')}};
// 1. Exportar copia en móvil
let p=await mk();
ok('emulación móvil: 390 px de ancho y pantalla táctil',(await p.evaluate(()=>[innerWidth,matchMedia('(pointer:coarse)').matches,'ontouchstart' in window]))+''==='390,true,true',await p.evaluate(()=>[innerWidth,matchMedia('(pointer:coarse)').matches]));
await importByTap(p,'.top-actions button:has-text("Importar")',J);
ok('Importar (barra superior) por toque carga el bar ficticio',(await p.evaluate(()=>data.drinks.length))===11&&p.dl.some(m=>/sustituirá/.test(m)),p.dl);
const box=await visibleIn(p,'#page-dashboard button:has-text("Exportar copia")');
ok('Resumen: «Exportar copia» se ve dentro de los 390 px',!!box,box);
ok('Resumen: «Exportar copia» e «Importar» juntos y con altura cómoda (≥ 40 px)',!!box&&box.height>=40&&!!(await visibleIn(p,'#backupPanel button:has-text("Importar")')),box);
const before=canon(await p.evaluate(()=>data));
const ex=await downloadByTap(p,'#page-dashboard button:has-text("Exportar copia")');
let js=null;try{js=JSON.parse(ex.text)}catch(e){}
ok('tocar «Exportar copia» descarga un JSON válido de la app',!!js&&js.app==='Isla & Barra Control'&&js.schema===3&&/^isla-barra-copia-\d{4}-\d{2}-\d{2}\.json$/.test(ex.name)&&js.drinks.length===11&&js.diagnostics.length===5,ex.name);
fs.writeFileSync(TMP+'ui_copia.json',ex.text);
let q=await mk();await importByTap(q,'#backupPanel button:has-text("Importar")',TMP+'ui_copia.json');
ok('ese JSON se importa de nuevo por toque (Resumen › Importar) y restituye los mismos datos',canon(await q.evaluate(()=>data))===before,null);
const w=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);ok('Resumen sin desbordamiento horizontal',w[0]<=w[1]+1,w);
ok('sin errores de JavaScript',[p,q].every(x=>x.errs.length===0),[p.errs,q.errs]);
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO interfaz móvil: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
