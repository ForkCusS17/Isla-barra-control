const {chromium}=require('./env');const path=require('path');const TMP=path.join(__dirname,'tmp')+path.sep,FIX=path.join(__dirname,'fixtures')+path.sep;require('fs').mkdirSync(TMP,{recursive:true});const fs=require('fs');
const [,,F,J,EX,OUTPDF]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const E=JSON.parse(fs.readFileSync(EX));const T=[];
const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);const n2=s=>String(s).replace(/\s/g,'');
const eur=n=>n2(new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n)),f2=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(n);
const near=(a,b)=>Math.abs(a-b)<1e-9;
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:800},acceptDownloads:true,reducedMotion:'reduce'});const p=await c.newPage();p.errs=[];p.dl=[];
p.on('pageerror',e=>p.errs.push(String(e).slice(0,100)));p.on('dialog',d=>{p.dl.push(d.message().slice(0,80));d.accept()});await p.goto(APP_URL);
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
ok('señales: «Revisar» (chupito); el gin-tonic de la biblioteca no cuenta la guarnición sin precio; el resto sin aviso',!S.dr['gin-tonic'].flag&&S.dr['chupito-tequila'].flag==='Revisar'&&Object.entries(S.dr).filter(([k,v])=>v.flag).length===1,Object.entries(S.dr).filter(([k,v])=>v.flag));
const dash=await p.evaluate(()=>({n:statDrinks.textContent,c:statCost.textContent,m:statMargin.textContent,v:statVariance.textContent}));
ok('panel: nº de bebidas, coste medio, margen medio y última desviación',dash.n==='11'&&n2(dash.c)===eur(E.avg.cost)&&n2(dash.m)===n2(f2(E.avg.m)+'%')&&n2(dash.v)==='+50ml',[dash,eur(E.avg.cost),f2(E.avg.m)]);
await p.evaluate(()=>showPage('drinks'));
const sum=n2(await p.evaluate(()=>drinkSummary.innerText));
ok('resumen de bebidas: coste %, margen %, 0 negativos, 1 a revisión, 5 categorías',sum.includes(n2(f2(E.avg.cp)+'%'))&&sum.includes(n2(f2(E.avg.m)+'%'))&&/Conmargennegativo0/.test(sum)&&/Requierenrevisión1/.test(sum)&&/Cóctel\(5\)/.test(sum)&&/Café\(2\)/.test(sum),sum.slice(0,400));
const rep=await p.evaluate(()=>{showPage('report');const tb=[...reportContent.querySelectorAll('table')];return{d:[...tb[0].querySelectorAll('tbody tr')].map(r=>[...r.cells].map(c=>c.textContent.trim())),s:[...tb[1].querySelectorAll('tbody tr')].map(r=>[...r.cells].map(c=>c.textContent.trim())),txt:reportContent.innerText}});
const names=Object.values(E.drinks);
ok('informe: las 11 filas de bebidas coinciden con el cálculo independiente',rep.d.length===11&&rep.d.every((r,i)=>r[0]===names[i].name&&n2(r[1])===eur(names[i].net)&&n2(r[2])===eur(names[i].cost)&&n2(r[3])===n2(f2(names[i].cp)+'%')&&n2(r[4])===eur(names[i].gross)&&n2(r[5])===n2(f2(names[i].m)+'%')),rep.d.slice(0,2));
const sk=E.stockList;
ok('informe: las 6 filas de stock coinciden (real, teórico, desviación)',rep.s.length===6&&sk.every((e,i)=>{const r=rep.s[i];const u=e.product.startsWith('Cerveza')?'ud':'ml';return r[0]===e.product&&n2(r[2])===n2(f2(e.a)+u)&&n2(r[3])===n2(f2(e.t)+u)&&n2(r[4])===n2((e.v>0?'+':'')+f2(e.v)+u)}),rep.s);
ok('informe: 4 datos pendientes (ingrediente sin precio y 3 controles) y sin NaN',/Datos pendientes de verificar: 4/.test(rep.txt)&&S.pend.length===4&&/Naranja deshidratada/.test(rep.txt)&&/Faltan las fechas/.test(rep.txt)&&!/NaN|undefined/.test(rep.txt),S.pend);
ok('informe: hallazgos ordenados por prioridad (Alta primero) con cómo comprobar la mejora',rep.txt.indexOf('prioridad alta')>0&&rep.txt.indexOf('prioridad alta')<rep.txt.indexOf('prioridad media')&&rep.txt.indexOf('prioridad media')<rep.txt.indexOf('prioridad baja')&&/Cómo comprobar la mejora/.test(rep.txt),null);
ok('informe: no afirma causas ni ahorros',!/pérdida demostrada|robo|ahorrarás/i.test(rep.txt)&&/Causa sin determinar/.test(rep.txt),null);
// umbral editable
await p.evaluate(()=>showPage('drinks'));await p.fill('#marginMin','45');await p.press('#marginMin','Tab');
const th=await p.evaluate(()=>({mm:data.settings.marginMin,flags:data.drinks.filter(d=>drinkFlag(d).cls).length,rev:/Requieren revisión\s*0/.test(drinkSummary.innerText.replace(/\n/g,' '))||drinkSummary.innerText.replace(/\s+/g,' ').includes('Requieren revisión 0')}));
ok('umbral de margen editable: con 45 % el chupito deja de marcarse (sin avisos)',th.mm===45&&th.flags===0&&th.rev,th);
await p.waitForTimeout(500);/* pausa breve antes de recargar, como haría una persona */await p.reload();ok('el umbral editado persiste tras recargar la página',(await p.evaluate(()=>data.settings.marginMin))===45&&(await p.evaluate(()=>data.drinks.length))===11,null);
await p.evaluate(()=>showPage('drinks'));await p.fill('#marginMin','55');await p.press('#marginMin','Tab');
// TXT
await p.evaluate(()=>showPage('report'));const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>downloadReport())]);const txt=fs.readFileSync(await dl.path(),'utf8');
ok('informe TXT descargable con ficha, tabla y datos pendientes',/Bar Atlántico/.test(txt)&&/Chupito de tequila/.test(txt)&&/Datos pendientes de verificar/.test(txt),txt.slice(0,80));
// Informe PDF que escribe la app (bar de ejemplo: varias páginas, tablas, tildes, ñ y €; el PDF se lee en latin1 = WinAnsi)
const {pdfCheck}=require('./helpers');const [dp]=await Promise.all([p.waitForEvent('download'),p.locator('#reportPdf').click()]);const pc=pdfCheck(fs.readFileSync(await dp.path()));
ok('informe PDF: archivo válido de varias páginas con «Página x de n» y el nombre del bar en el archivo',!pc.bad.length&&pc.pages>=3&&pc.s.includes(`P\xe1gina ${pc.pages} de ${pc.pages}`)&&/^informe-bar-atlantico-ejemplo-ficticio-\d{4}-\d{2}-\d{2}\.pdf$/.test(dp.suggestedFilename()),[pc.bad,pc.pages,dp.suggestedFilename()]);
ok('informe PDF: ficha, tabla de bebidas, stock y datos pendientes',/Bar Atl\xe1ntico \\\(ejemplo ficticio\\\)/.test(pc.s)&&/\(Chupito de tequila\)/.test(pc.s)&&/Conciliaci\xf3n de stock/.test(pc.s)&&/Datos pendientes de verificar/.test(pc.s),null);
ok('informe PDF: tildes, ñ y € codificados y ningún carácter sustituido por «?»',/Diagn\xf3stico de barra/.test(pc.s)&&/Ca\xf1a/.test(pc.s)&&/\x80/.test(pc.s)&&(pc.s.match(/\?/g)||[]).length===((await p.locator('#reportContent').innerText()).match(/\?/g)||[]).length,null);
// Con logo (PNG de 1 px): va al PDF como imagen JPEG; el logo no se guarda, solo se usa para este informe.
await p.evaluate(()=>{window.__logo=data.settings.brand.logo;data.settings.brand.logo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='});
const [dl2]=await Promise.all([p.waitForEvent('download'),p.locator('#reportPdf').click()]);const pl=pdfCheck(fs.readFileSync(await dl2.path()));await p.evaluate(()=>{data.settings.brand.logo=window.__logo;renderReport()});
ok('informe PDF con logo: válido y con la imagen JPEG del logo',!pl.bad.length&&/\/Subtype \/Image[^>]*\/Filter \/DCTDecode/.test(pl.s)&&/\/Im1 Do/.test(pl.s),pl.bad);
// PDF
/* page.pdf solo existe en Chromium */if(require('./env').NAME==='chromium'){await p.emulateMedia({media:'print'});await p.pdf({path:OUTPDF,format:'A4',printBackground:true,margin:{top:'14mm',bottom:'14mm',left:'12mm',right:'12mm'}});}
ok('sin errores de JavaScript en todo el recorrido',p.errs.length===0,p.errs);
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
