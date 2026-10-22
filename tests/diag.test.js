// Diagnóstico: formulario, edición, migración de copias antiguas e informe (Chromium a 390 px).
const {chromium}=require('playwright');const path=require('path');const TMP=path.join(__dirname,'tmp')+path.sep;require('fs').mkdirSync(TMP,{recursive:true});const fs=require('fs');const [,,F,J]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];
const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const canon=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort()):v);
(async()=>{const b=await chromium.launch();
const mk=async(init)=>{const c=await b.newContext({viewport:{width:390,height:800},acceptDownloads:true,reducedMotion:'reduce'});// Estas series prueban la vista completa. La semilla solo actúa en la primera carga de la pestaña (marca en window.name):
// al recargar, localStorage.getItem puede devolver null un instante y la semilla pisaría los datos.
await c.addInitScript(()=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';try{if(!localStorage.getItem('islaBarraControlMVP_v1'))localStorage.setItem('islaBarraControlMVP_v1',JSON.stringify({settings:{mode:'full'}}))}catch(e){}});
if(init)await c.addInitScript(init);const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,100)));p.on('dialog',d=>{p.dl.push(d.message().slice(0,80));d.accept()});await p.goto(APP_URL);return p};
const imp=async(p,f)=>{await p.setInputFiles('#importFile',f);await p.click('#importYes');await p.waitForTimeout(150)};
const toastTxt=p=>p.evaluate(()=>document.getElementById('toast').textContent);
const fillDiag=async(p,o)=>{await p.evaluate(()=>{showPage('diagnosis');resetDiagForm()});for(const [k,x] of Object.entries(o)){if(['diagArea','diagStatus','diagPriority'].includes(k))await p.selectOption('#'+k,x);else await p.fill('#'+k,x)}await p.click('#diagForm button[type=submit]')};
const wide=p=>p.evaluate(()=>[document.documentElement.scrollWidth,window.innerWidth]);
// 1. Formulario
let p=await mk();
ok('formulario: tiene evidencia, responsable y resultado además de los campos anteriores',await p.evaluate(()=>['diagArea','diagStatus','diagFinding','diagEvidence','diagAction','diagCheck','diagPriority','diagDue','diagOwner','diagResult'].every(i=>!!document.getElementById(i))),null);
ok('formulario: los estados son Pendiente, En revisión, Verificado y Resuelto',(await p.evaluate(()=>[...document.getElementById('diagStatus').options].map(o=>o.value).join()))==='Pendiente,En revisión,Verificado,Resuelto',null);
await p.evaluate(()=>{showPage('diagnosis');document.getElementById('diagForm').noValidate=true});
await fillDiag(p,{diagFinding:'Sin medida estándar',diagAction:'Usar medidor'});
ok('sin evidencia no se guarda y se explica por qué',(await p.evaluate(()=>data.diagnostics.length))===0&&/evidencia/.test(await toastTxt(p)),await toastTxt(p));
await fillDiag(p,{diagStatus:'Verificado',diagFinding:'Sin medida estándar',diagEvidence:'Visto en la visita',diagAction:'Usar medidor'});
ok('«Verificado» sin resultado de la revisión no se guarda',(await p.evaluate(()=>data.diagnostics.length))===0&&/resultado de la revisión/.test(await toastTxt(p)),await toastTxt(p));
await fillDiag(p,{diagStatus:'Resuelto',diagFinding:'Sin medida estándar',diagEvidence:'Visto en la visita',diagAction:'Usar medidor'});
ok('«Resuelto» sin resultado de la revisión no se guarda',(await p.evaluate(()=>data.diagnostics.length))===0,null);
const full={diagArea:'Recetas y dosificación',diagStatus:'Pendiente',diagFinding:'Mojito sin medida estándar',diagEvidence:'Visita 14 oct: sin hoja de recetas ni medidor',diagAction:'Definir receta en ml y usar medidor 7 días',diagCheck:'Comparar ron por cada 100 mojitos antes y después',diagPriority:'Alta',diagDue:'2026-11-04',diagOwner:'Encargada de barra'};
await fillDiag(p,full);
const g=await p.evaluate(()=>data.diagnostics[0]);
ok('formulario completo: guarda los 10 campos tal cual (resultado vacío al crear)',g&&g.area==='Recetas y dosificación'&&g.status==='Pendiente'&&g.finding==='Mojito sin medida estándar'&&g.evidence==='Visita 14 oct: sin hoja de recetas ni medidor'&&g.action.startsWith('Definir')&&g.check.startsWith('Comparar')&&g.priority==='Alta'&&g.due==='2026-11-04'&&g.owner==='Encargada de barra'&&g.result===''&&/^[\w-]+$/.test(g.id),g);
ok('el formulario se limpia tras guardar',(await p.evaluate(()=>document.getElementById('diagId').value+document.getElementById('diagEvidence').value+document.getElementById('diagOwner').value))==='',null);
const li=await p.evaluate(()=>document.getElementById('diagList').innerText);
ok('lista: muestra evidencia, cómo comprobarla, responsable y «Sin revisar»',/Evidencia: Visita 14 oct/.test(li)&&/Cómo comprobarla: Comparar/.test(li)&&/Responsable: Encargada de barra/.test(li)&&/Resultado de la revisión: Sin revisar/.test(li),li);
// 2. Edición
await p.evaluate(()=>editDiag(data.diagnostics[0].id));
const form=await p.evaluate(()=>Object.fromEntries(['diagId','diagArea','diagStatus','diagFinding','diagEvidence','diagAction','diagCheck','diagPriority','diagDue','diagOwner','diagResult'].map(i=>[i,document.getElementById(i).value])));
ok('editar: el formulario se rellena con todos los campos',form.diagId===g.id&&Object.entries(full).every(([k,x])=>form[k]===x)&&form.diagResult==='',form);
await p.selectOption('#diagStatus','Verificado');await p.click('#diagForm button[type=submit]');
ok('editar: pasar a «Verificado» sin resultado se rechaza y no cambia el hallazgo',(await p.evaluate(()=>data.diagnostics[0].status))==='Pendiente'&&/resultado/.test(await toastTxt(p)),null);
await p.fill('#diagResult','Semana 21–27 oct: 4.900 ml de ron por 100 mojitos frente a 5.200 antes');await p.fill('#diagOwner','');await p.click('#diagForm button[type=submit]');
const e=await p.evaluate(()=>({n:data.diagnostics.length,g:data.diagnostics[0]}));
ok('editar: actualiza el mismo hallazgo (mismo id, sin duplicar) con estado, resultado y responsable vacío',e.n===1&&e.g.id===g.id&&e.g.status==='Verificado'&&/4\.900 ml/.test(e.g.result)&&e.g.owner===''&&e.g.evidence===full.diagEvidence,e);
ok('guardar y editar no crean variables globales (i, old, bad)',await p.evaluate(()=>!('i' in window)&&!('old' in window)&&!('bad' in window)),await p.evaluate(()=>['i','old','bad'].filter(k=>k in window)));
ok('editar: aviso «Hallazgo actualizado»',(await toastTxt(p))==='Hallazgo actualizado',await toastTxt(p));
await p.evaluate(()=>{data.diagnostics[0].extra='campo futuro';save()});await p.evaluate(()=>editDiag(data.diagnostics[0].id));await p.click('#diagForm button[type=submit]');
ok('editar: conserva campos que el formulario no conoce',(await p.evaluate(()=>data.diagnostics[0].extra))==='campo futuro',null);
await p.waitForTimeout(500);/* pausa breve antes de recargar, como haría una persona */await p.reload();
{const r=await p.evaluate(()=>({n:data.diagnostics.length,res:(data.diagnostics[0]||{}).result||''}));ok('los cambios persisten tras recargar',r.res.includes('4.900 ml'),{...r,dialogos:p.dl})}
// 3. Migración de copias antiguas
const legacy={business:{name:'Bar Legacy'},ingredients:[],drinks:[],stocks:[],diagnostics:[
 {id:'g1',area:'Stock e inventario',status:'Pendiente',finding:'f1',action:'a1',check:'c1',priority:'Alta',due:'2026-10-20'},
 {id:'g2',area:'Zona antigua',status:'Verificado',finding:'f2',action:'a2',priority:'Urgente',due:'20/10/2026'},
 {id:'g3',status:'Cerrado',finding:'f3',action:'a3',check:'c3',priority:'Baja'}]};
fs.writeFileSync(TMP+'diag_legacy.json',JSON.stringify(legacy));
let q=await mk();await imp(q,TMP+'diag_legacy.json');
const L=await q.evaluate(()=>({d:data.diagnostics,schema:data.schema,pend:pendingData()}));
ok('copia antigua: se importa con los 3 hallazgos y pasa al esquema 6',L.d.length===3&&L.schema===6&&q.errs.length===0,[L.d.length,L.schema,q.errs]);
ok('copia antigua: campos nuevos vacíos (evidencia, responsable, resultado) y los antiguos intactos',L.d.every(x=>x.evidence===''&&x.owner===''&&x.result==='')&&L.d[0].finding==='f1'&&L.d[0].check==='c1'&&L.d[0].due==='2026-10-20'&&L.d[0].priority==='Alta',L.d[0]);
ok('copia antigua: estado y prioridad desconocidos pasan a Pendiente / Media; fecha no ISO se descarta',L.d[1].status==='Verificado'&&L.d[1].priority==='Media'&&L.d[1].due===''&&L.d[2].status==='Pendiente'&&L.d[2].area===''&&L.d[2].check==='c3',L.d.slice(1));
{const dates={x1:'2026-13-45',x2:'2026-02-30',x3:'2026-00-10',x4:'2024-02-29',x5:'2026-10-20',x6:'2026-1-5'};fs.writeFileSync(TMP+'diag_dates.json',JSON.stringify({...legacy,diagnostics:Object.entries(dates).map(([id,due])=>({id,finding:'f',evidence:'e',action:'a',due}))}));
let z=await mk();await imp(z,TMP+'diag_dates.json');const Z=await z.evaluate(()=>Object.fromEntries(data.diagnostics.map(g=>[g.id,g.due])));
ok('fecha de revisión: se rechazan fechas imposibles (2026-13-45, 2026-02-30, mes 00) y se aceptan las reales (29-feb bisiesto)',Z.x1===''&&Z.x2===''&&Z.x3===''&&Z.x4==='2024-02-29'&&Z.x5==='2026-10-20'&&Z.x6==='',Z)}
ok('copia antigua: pendientes avisan de evidencia, método y «Verificado» sin resultado',L.pend.filter(x=>/sin evidencia/.test(x)).length===3&&L.pend.some(x=>/«f2».*falta definir cómo comprobar/.test(x))&&L.pend.some(x=>/«f2».*«Verificado» sin resultado/.test(x)),L.pend);
await q.evaluate(()=>editDiag('g2'));
ok('copia antigua: editar un área que ya no está en la lista la conserva',(await q.evaluate(()=>document.getElementById('diagArea').value))==='Zona antigua',null);
await q.evaluate(()=>resetDiagForm());
const qr=await q.evaluate(()=>{showPage('report');return document.getElementById('reportContent').innerText});
ok('copia antigua en el informe: «Sin evidencia registrada» y resultado no registrado del verificado, sin NaN/undefined',/Sin evidencia registrada/.test(qr)&&/No registrado \(dato pendiente de verificar\)/.test(qr)&&!/NaN|undefined|null/.test(qr),qr.slice(0,200));
let m=await mk(()=>{if(!sessionStorage.s){sessionStorage.s=1;localStorage.setItem('islaBarraControlMVP_v1',JSON.stringify({schema:2,business:{name:'Bar Esquema 2'},ingredients:[],drinks:[],stocks:[],sales:[],diagnostics:[{id:'g9',area:'Carta y precios',status:'En revisión',finding:'Chupito bajo margen',action:'Revisar precio',check:'Recalcular',priority:'Media',due:'2026-11-01'}]}))}});
const M=await m.evaluate(()=>({g:data.diagnostics[0],t:document.getElementById('diagList').innerText}));
ok('datos guardados con esquema 2 en el navegador: se leen y muestran sin errores',M.g.status==='En revisión'&&M.g.evidence===''&&/Sin evidencia registrada/.test(M.t)&&m.errs.length===0,[M,m.errs]);
// 4. Ida y vuelta de la copia con los campos nuevos

const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>exportBackup())]);const before=canon(await p.evaluate(()=>data));const exp=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
ok('exportar: incluye evidencia, responsable y resultado',exp.schema===6&&'evidence' in exp.diagnostics[0]&&'owner' in exp.diagnostics[0]&&'result' in exp.diagnostics[0],exp.diagnostics[0]);
let r=await mk();await imp(r,await dl.path());
ok('importar la copia exportada restituye exactamente el diagnóstico',canon(await r.evaluate(()=>data))===before,null);
// 5. Informe con el bar ficticio
let d=await mk();await imp(d,J);
const R=await d.evaluate(()=>{showPage('report');const el=document.getElementById('reportContent');return{txt:el.innerText,blocks:[...el.querySelectorAll('.diag-rep')].map(x=>x.innerText)}});
ok('informe: 5 hallazgos, cada uno con hallazgo, evidencia, recomendación, cómo comprobar, revisión y resultado en ese orden',R.blocks.length===5&&R.blocks.every(t=>{const k=['Hallazgo:','Evidencia (hecho):','Recomendación:','Cómo comprobar la mejora:','Revisión:','Resultado de la revisión:'].map(x=>t.indexOf(x));return k.every((x,i)=>x>=0&&(i===0||x>k[i-1]))}),R.blocks.map(t=>t.slice(0,60)));
const blk=n=>R.blocks.find(t=>t.includes(n))||'';
ok('informe: resultado registrado del hallazgo verificado (hoja de cierre) y responsable',/Resultado de la revisión: Hoja de cierre revisada en tres cierres/.test(blk('Invitaciones y degustaciones'))&&/Responsable: Encargado de barra/.test(blk('Invitaciones y degustaciones')),blk('Invitaciones y degustaciones'));
ok('informe: hallazgo en revisión con resultado parcial, sin dar la causa por comprobada',/Resultado de la revisión: Control 14–20 oct/.test(blk('Ron blanco'))&&/Causa sin determinar/.test(blk('Ron blanco'))&&!/Causa comprobada/.test(R.txt),blk('Ron blanco'));
ok('informe: sin medición todavía → «Pendiente de revisar» (3 hallazgos)',R.blocks.filter(t=>/Pendiente de revisar: todavía no hay medición/.test(t)).length===3,null);
ok('informe: la evidencia del chupito coincide con los cálculos de la app',await d.evaluate(()=>{const c=data.drinks.find(x=>x.id==='chupito-tequila'),t=data.diagnostics.find(x=>x.id==='g3').evidence;return t.includes(directCost(c).toFixed(2).replace('.',',')+' €')&&t.includes(netPrice(c).toFixed(2).replace('.',','))&&t.includes(margin(c).toFixed(1).replace('.',','))}),null);
ok('informe: explica que no se estiman ahorros antes de medir y no los promete',/No se estiman ahorros antes de medir/.test(R.txt)&&!/ahorrarás|ahorro garantizado|ahorro de \d/i.test(R.txt),null);
ok('informe: sin datos pendientes del diagnóstico en el bar ficticio (siguen 5 en total)',(await d.evaluate(()=>pendingData().filter(x=>/^Hallazgo/.test(x)).length))===0&&/Datos pendientes de verificar: 5/.test(R.txt),null);
ok('informe: próximos pasos con responsable cuando lo hay',/Repetir el recuento de botellas abiertas[^\n]*— Encargado de barra/.test(R.txt),null);
// 6. 390 px y textos largos o con HTML
const long='X'.repeat(300),html='<img src=x onerror=window.__xss=1>';
await d.evaluate(([l,h])=>{data.diagnostics.unshift({id:'gl',area:'Carta y precios',status:'Pendiente',finding:l,evidence:h+l,action:l,check:l,priority:'Alta',due:'',owner:l,result:''});save()},[long,html]);
for(const pg of ['diagnosis','report']){await d.evaluate(x=>showPage(x),pg);const w=await wide(d);ok('390 px sin desbordamiento horizontal con textos largos: '+pg,w[0]<=w[1]+1,w)}
await d.evaluate(()=>{showPage('diagnosis');editDiag('gl')});const w=await wide(d);ok('390 px sin desbordamiento horizontal: formulario en edición',w[0]<=w[1]+1,w);
ok('texto con HTML en evidencia se muestra como texto (sin inyección)',(await d.evaluate(()=>window.__xss))===undefined&&(await d.evaluate(()=>document.getElementById('diagList').innerText)).includes('<img src=x'),null);
await d.evaluate(()=>{showPage('diagnosis');window.scrollTo(0,0)});await d.screenshot({path:TMP+'s_diag.png',fullPage:true});
ok('sin errores de JavaScript en todo el recorrido',[p,q,m,r,d].every(x=>x.errs.length===0),[p,q,m,r,d].map(x=>x.errs));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO diagnóstico: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
