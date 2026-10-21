const {chromium}=require('playwright');const path=require('path');const TMP=path.join(__dirname,'tmp')+path.sep,FIX=path.join(__dirname,'fixtures')+path.sep;require('fs').mkdirSync(TMP,{recursive:true});const fs=require('fs');
const [,,F,J,EX,OUTPDF]=process.argv;const E=JSON.parse(fs.readFileSync(EX));const T=[];
const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);const n2=s=>String(s).replace(/\s/g,'');
const eur=n=>n2(new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n)),f2=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(n);
const near=(a,b)=>Math.abs(a-b)<1e-9;
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:800},acceptDownloads:true,reducedMotion:'reduce'});const p=await c.newPage();p.errs=[];p.dl=[];
p.on('pageerror',e=>p.errs.push(String(e).slice(0,100)));p.on('dialog',d=>{p.dl.push(d.message().slice(0,80));d.accept()});await p.goto('file://'+F);
await p.setInputFiles('#importFile',J);await p.click('#importYes');await p.waitForTimeout(200);
const S=await p.evaluate(()=>({i:data.ingredients.length,d:data.drinks.length,s:data.stocks.length,g:data.diagnostics.length,biz:data.business.name,
 ing:Object.fromEntries(data.ingredients.map(x=>[x.id,x.unitCost])),
 dr:Object.fromEntries(data.drinks.map(d=>[d.id,{cost:directCost(d),net:netPrice(d),gross:gross(d),cp:costPct(d),m:margin(d),flag:drinkFlag(d).txt}])),
 st:data.stocks.map(s=>({p:s.product,s:s.start,a:s.actual,t:s.theoretical,v:s.variance})),pend:pendingData()}));
ok('importación sin errores y con todos los datos (19 ingredientes, 11 bebidas, 6 controles, 5 hallazgos)',S.i===19&&S.d===11&&S.s===6&&S.g===5&&p.errs.length===0,[S.i,S.d,S.s,S.g,p.errs]);
ok('costes unitarios de los 19 ingredientes = cálculo independiente',Object.entries(E.ing).every(([k,v])=>near(S.ing[k],v)),S.ing);
ok('11 bebidas: coste, precio neto, margen €, coste % y margen % = cálculo independiente',Object.entries(E.drinks).every(([k,e])=>['cost','net','gross','cp','m'].every(q=>near(S.dr[k][q===('cost')?'cost':q],e[q]))),S.dr);
ok('6 controles de stock: real, teórico y desviación = cálculo independiente',E.stockList.length===6&&E.stockList.every((e,i)=>S.st[i].p===e.product&&S.st[i].s===e.start&&S.st[i].a===e.a&&S.st[i].t===e.t&&S.st[i].v===e.v),S.st);
ok('ejemplo C dentro del caso: ron 6.300 / 5.800 / +500 ml',(r=>r.a===6300&&r.t===5800&&r.v===500)(S.st.find(x=>x.p==='Ron blanco'&&x.s==='2026-10-07')),S.st);
ok('señales: «Coste incompleto» (gin-tonic) y «Revisar» (chupito); el resto sin aviso',S.dr['gin-tonic'].flag==='Coste incompleto'&&S.dr['chupito-tequila'].flag==='Revisar'&&Object.entries(S.dr).filter(([k,v])=>v.flag).length===2,Object.entries(S.dr).filter(([k,v])=>v.flag));
const dash=await p.evaluate(()=>({n:statDrinks.textContent,c:statCost.textContent,m:statMargin.textContent,v:statVariance.textContent}));
ok('panel: nº de bebidas, coste medio, margen medio y última desviación',dash.n==='11'&&n2(dash.c)===eur(E.avg.cost)&&n2(dash.m)===n2(f2(E.avg.m)+'%')&&n2(dash.v)==='+50ml',[dash,eur(E.avg.cost),f2(E.avg.m)]);
await p.evaluate(()=>showPage('drinks'));
const sum=n2(await p.evaluate(()=>drinkSummary.innerText));
ok('resumen de bebidas: coste %, margen %, 0 negativos, 2 a revisión, 5 categorías',sum.includes(n2(f2(E.avg.cp)+'%'))&&sum.includes(n2(f2(E.avg.m)+'%'))&&/Conmargennegativo0/.test(sum)&&/Requierenrevisión2/.test(sum)&&/Cóctel\(5\)/.test(sum)&&/Café\(2\)/.test(sum),sum.slice(0,400));
const rep=await p.evaluate(()=>{showPage('report');const tb=[...reportContent.querySelectorAll('table')];return{d:[...tb[0].querySelectorAll('tbody tr')].map(r=>[...r.cells].map(c=>c.textContent.trim())),s:[...tb[1].querySelectorAll('tbody tr')].map(r=>[...r.cells].map(c=>c.textContent.trim())),txt:reportContent.innerText}});
const names=Object.values(E.drinks);
ok('informe: las 11 filas de bebidas coinciden con el cálculo independiente',rep.d.length===11&&rep.d.every((r,i)=>r[0]===names[i].name&&n2(r[1])===eur(names[i].net)&&n2(r[2])===eur(names[i].cost)&&n2(r[3])===n2(f2(names[i].cp)+'%')&&n2(r[4])===eur(names[i].gross)&&n2(r[5])===n2(f2(names[i].m)+'%')),rep.d.slice(0,2));
const sk=E.stockList;
ok('informe: las 6 filas de stock coinciden (real, teórico, desviación)',rep.s.length===6&&sk.every((e,i)=>{const r=rep.s[i];const u=e.product.startsWith('Cerveza')?'ud':'ml';return r[0]===e.product&&n2(r[2])===n2(f2(e.a)+u)&&n2(r[3])===n2(f2(e.t)+u)&&n2(r[4])===n2((e.v>0?'+':'')+f2(e.v)+u)}),rep.s);
ok('informe: 5 datos pendientes (ingrediente sin precio, gin-tonic incompleto, 3 controles) y sin NaN',/Datos pendientes de verificar: 5/.test(rep.txt)&&S.pend.length===5&&/Naranja deshidratada/.test(rep.txt)&&/Faltan las fechas/.test(rep.txt)&&!/NaN|undefined/.test(rep.txt),S.pend);
ok('informe: hallazgos ordenados por prioridad (Alta primero) con cómo comprobar la mejora',rep.txt.indexOf('prioridad alta')>0&&rep.txt.indexOf('prioridad alta')<rep.txt.indexOf('prioridad media')&&rep.txt.indexOf('prioridad media')<rep.txt.indexOf('prioridad baja')&&/Cómo comprobar la mejora/.test(rep.txt),null);
ok('informe: no afirma causas ni ahorros',!/pérdida demostrada|robo|ahorrarás/i.test(rep.txt)&&/Causa sin determinar/.test(rep.txt),null);
// umbral editable
await p.evaluate(()=>showPage('drinks'));await p.fill('#marginMin','45');await p.press('#marginMin','Tab');
const th=await p.evaluate(()=>({mm:data.settings.marginMin,flags:data.drinks.filter(d=>drinkFlag(d).cls).length,rev:/Requieren revisión\s*1/.test(drinkSummary.innerText.replace(/\n/g,' '))||drinkSummary.innerText.replace(/\s+/g,' ').includes('Requieren revisión 1')}));
ok('umbral de margen editable: con 45 % el chupito deja de marcarse (queda 1 aviso)',th.mm===45&&th.flags===1&&th.rev,th);
await p.reload();ok('el umbral editado persiste tras recargar la página',(await p.evaluate(()=>data.settings.marginMin))===45&&(await p.evaluate(()=>data.drinks.length))===11,null);
await p.evaluate(()=>showPage('drinks'));await p.fill('#marginMin','55');await p.press('#marginMin','Tab');
// TXT
await p.evaluate(()=>showPage('report'));const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>downloadReport())]);const txt=fs.readFileSync(await dl.path(),'utf8');
ok('informe TXT descargable con ficha, tabla y datos pendientes',/Bar Atlántico/.test(txt)&&/Chupito de tequila/.test(txt)&&/Datos pendientes de verificar/.test(txt),txt.slice(0,80));
// PDF
await p.emulateMedia({media:'print'});await p.pdf({path:OUTPDF,format:'A4',printBackground:true,margin:{top:'14mm',bottom:'14mm',left:'12mm',right:'12mm'}});
ok('sin errores de JavaScript en todo el recorrido',p.errs.length===0,p.errs);
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
