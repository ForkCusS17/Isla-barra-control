// Compras y facturas (0.4.0): factura con foto o PDF, líneas, cuadre, revisión línea a línea, confirmación (último precio
// con histórico, producto nuevo, alias por proveedor), borrador, duplicados, entradas del control de stock, copia y, con
// cuentas contra el Supabase simulado, subida de facturas y fotos, otro dispositivo, lector sin fotos y sin conexión.
// Emulación de móvil (390 y 360 px) y solo toques; no se llaman funciones de la app.
const {chromium,devices}=require('./env');const srv=require('./server');const sm=require('./supabase_mock');const {smallTargets,contrastFails}=require('./helpers');
const fs=require('fs'),path=require('path'),zlib=require('zlib');const [,,F]=process.argv;const APP_URL=/^https?:/.test(F)?F:'file://'+F;const T=[];
const TMP=path.join(__dirname,'tmp')+path.sep;fs.mkdirSync(TMP,{recursive:true});
const AXE=require.resolve('axe-core/axe.min.js');
const ok=(n,c,x)=>T.push([!!c,n,c?'':JSON.stringify(x)]);
const KEY='islaBarraControlMVP_v1';
const PHONE={...devices['iPhone 13'],reducedMotion:'reduce',acceptDownloads:true},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
// PNG de prueba de 2400 × 1600 (la app debe reducirlo a 1600 px de lado mayor y guardarlo en JPEG)
function png(w,h){const row=w*3+1,raw=Buffer.alloc(row*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=y*row+1+x*3;raw[o]=(x*7)&255;raw[o+1]=(y*5)&255;raw[o+2]=120}
 const ch=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(zlib.crc32(td)>>>0);return Buffer.concat([l,td,c])};
 const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ch('IHDR',ih),ch('IDAT',zlib.deflateSync(raw)),ch('IEND',Buffer.alloc(0))])}
const PHOTO={name:'factura.png',mimeType:'image/png',buffer:png(2400,1600)},PDF={name:'factura.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')},FAKE={name:'trampa.pdf',mimeType:'application/pdf',buffer:Buffer.from('<html><script>alert(1)</script></html>')};
const ing=(id,name,category,subcategory,qty,price,unit='ml')=>({id,name,category,subcategory,supplier:'',format:'Botella 70 cl',unit,packUnit:unit,packInput:qty,packQty:qty,packPrice:price,notes:'',active:true});
const SEED={schema:7,settings:{mode:'full',started:true,guideHidden:true},business:{name:'Bar Compras',location:'Arrecife',period:'Octubre'},ingredients:[ing('g1','Ginebra Beefeater','Destilados','Ginebras',700,16),ing('r1','Ron Carta Blanca','Destilados','Rones',700,14)],drinks:[],sales:[],stocks:[],diagnostics:[]};
(async()=>{const b=await chromium.launch();const pages=[];
const wire=p=>{p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,160)));p.on('dialog',d=>{p.dl.push(d.type());d.dismiss()});pages.push(p)};
const mk=async(dev=PHONE,seed=SEED,extra={},url=APP_URL)=>{const c=await b.newContext({...dev,...extra});await c.clock.setFixedTime(new Date('2026-10-30T10:00:00Z'));if(seed)await c.addInitScript(([k,s])=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem(k,s)},[KEY,JSON.stringify(seed)]);const p=await c.newPage();wire(p);await p.goto(url);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:8000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0])});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').trim()).catch(()=>'');
const D=p=>p.evaluate(()=>JSON.parse(JSON.stringify(data)));
const INVS=p=>p.evaluate(()=>JSON.parse(JSON.stringify(INV)));
const until=async(fn,ms=8000)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await fn())return true;await new Promise(r=>setTimeout(r,100))}return false};
const near=(a,b,e=1e-6)=>Math.abs(a-b)<e;
const G=(d,id)=>d.ingredients.find(i=>i.id===id);
const wide=async p=>[await p.evaluate(()=>document.documentElement.scrollWidth),p.viewportSize().width];
const screenOK=async(p,wd,label,scope)=>{ok(`[${wd}] ${label}: sin desbordamiento horizontal`,(w=>w[0]<=w[1]+1)(await wide(p)),await wide(p));const st=(await smallTargets(p,scope)).filter(x=>x[0]!=='purFile')/* campo de archivo oculto: se toca su etiqueta «Añadir foto o PDF» */;ok(`[${wd}] ${label}: objetivos táctiles ≥ 44 px`,st.length===0,st);const cf=await contrastFails(p);ok(`[${wd}] ${label}: contraste ≥ 4,5:1`,cf.length===0,cf)};
const toPurchases=async p=>{await tap(p,'.mobile-nav button:has-text("Mi barra")');await tap(p,'#barPurchases')};
const yes=p=>tap(p,'#appConfirmYes');
const line=async(p,i,o)=>{if(o.text!==undefined){await p.fill(`#pl_text_${i}`,o.text);await p.locator(`#pl_text_${i}`).dispatchEvent('change')}if(o.kind)await p.selectOption(`#pl_kind_${i}`,o.kind);if(o.ing)await p.selectOption(`#pl_ing_${i}`,o.ing);if(o.nn!==undefined)await p.fill(`#pl_nn_${i}`,o.nn);if(o.nf!==undefined)await p.fill(`#pl_nf_${i}`,o.nf);if(o.qty!==undefined)await p.fill(`#pl_qty_${i}`,o.qty);if(o.packs!==undefined)await p.fill(`#pl_packs_${i}`,o.packs);if(o.amount!==undefined)await p.fill(`#pl_amount_${i}`,o.amount);if(o.tax){await p.selectOption(`#pl_tax_${i}`,o.tax);if(o.rate!==undefined)await p.fill(`#pl_rate_${i}`,o.rate)}};

// ══ 1. Sin cuentas (todo en el dispositivo), a 390 y 360 px ══
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const p=await mk(dev);
 await toPurchases(p);
 ok(`[${wd}] Mi barra › «Compras y facturas» abre la pantalla vacía con «Nueva factura»`,(await seen(p,'#page-purchases'))&&(await seen(p,'#purNew'))&&/Todavía no hay facturas/.test(await text(p,'#purList')),await text(p,'#purList'));
 await tap(p,'#purNew');
 ok(`[${wd}] factura nueva: fecha de hoy y una línea vacía`,(await p.inputValue('#purDate'))==='2026-10-30'&&(await p.locator('.pur-line').count())===1,null);
 // Archivos
 await p.setInputFiles('#purFile',[PHOTO,PDF,FAKE]);await until(async()=>(await p.locator('.pur-file').count())>=2);
 let ed=await p.evaluate(()=>purEdit.files.map(f=>({t:f.type,s:f.size,n:f.name})));
 ok(`[${wd}] foto y PDF añadidos; un «PDF» que no lo es se rechaza y lo explica`,ed.length===2&&ed[0].t==='image/jpeg'&&ed[1].t==='application/pdf'&&/trampa\.pdf» no se ha añadido/.test(await text(p,'#toast')),[ed,await text(p,'#toast')]);
 const dim=await p.evaluate(()=>new Promise(ok=>{const im=document.querySelector('#purFiles img');const go=()=>ok([im.naturalWidth,im.naturalHeight]);if(im.complete&&im.naturalWidth)go();else im.onload=go}));
 ok(`[${wd}] la foto de 2400 × 1600 se reduce a 1600 × 1067 y se guarda en JPEG (más ligera que el original)`,dim[0]===1600&&dim[1]===1067&&ed[0].s<PHOTO.buffer.length,[dim,ed[0].s,PHOTO.buffer.length]);
 ok(`[${wd}] cada archivo tiene «Abrir» y «Quitar»`,(await p.locator('#purFiles a.linkbtn').count())===2&&(await p.locator('#purFiles button:has-text("Quitar")').count())===2,null);
 await p.setInputFiles('#purFile',[PDF,PDF,PDF,PDF]);await until(async()=>(await p.locator('.pur-file').count())>=5);
 ok(`[${wd}] máximo 5 archivos por factura`,(await p.locator('.pur-file').count())===5&&/Máximo 5 archivos/.test(await text(p,'#toast'))&&!(await seen(p,'#purFile')),await text(p,'#toast'));
 for(let k=0;k<3;k++)await tap(p,'#purFiles .pur-file:last-child button:has-text("Quitar")');
 ok(`[${wd}] «Quitar» quita archivos (quedan 2)`,(await p.locator('.pur-file').count())===2,null);
 // Cabecera y líneas
 await p.fill('#purSupplier','Distribuciones Lanzarote');await p.fill('#purNumber','F-101');await p.fill('#purTotal','130');
 await line(p,0,{text:'BEEFEATER 70CL',ing:'g1',qty:'1',packs:'6',amount:'90',tax:'IGIC',rate:'7'});
 const pv=await text(p,'#pl_prev_0');
 ok(`[${wd}] vista de la línea: 6 × Botella 70 cl = 4200 ml · 16,00 € → 15,00 € (−6,25 %)`,/6 × Botella 70 cl = 4200 ml/.test(pv)&&/16,00 € → 15,00 €/.test(pv)&&/-6,25 %/.test(pv),pv);
 await tap(p,'#purAddLine');
 await line(p,1,{text:'TONICA PREMIUM CAJA 24',ing:'__new',nn:'Tónica premium',nf:'24 x 20 cl',qty:'1',packs:'1',amount:'21,60',tax:'IGIC',rate:'7'});
 await tap(p,'#purAddLine');await line(p,2,{text:'PORTES',kind:'portes',amount:'5',tax:'IGIC',rate:'7'});
 await tap(p,'#purAddLine');await line(p,3,{text:'DTO PRONTO PAGO',kind:'descuento',amount:'3',tax:'IGIC',rate:'7'});
 let tot=await text(p,'#purTotals');
 ok(`[${wd}] totales: base 113,60 € (90 + 21,60 + 5 − 3), impuestos 7,95 €, total 121,55 €; con 130 € escrito «No cuadra» con la diferencia`,/Base \(sin impuestos\) 113,60 €/.test(tot)&&/Impuestos de las líneas 7,95 €/.test(tot)&&/Total calculado 121,55 €/.test(tot)&&/No cuadra: diferencia de -8,45 €/.test(tot)&&(await seen(p,'#purDiffBox')),tot);
 await p.fill('#purTotal','121,55');tot=await text(p,'#purTotals');
 ok(`[${wd}] con 121,55 € escrito: «✓ Cuadra»`,/✓ Cuadra/.test(tot)&&!(await seen(p,'#purDiffBox')),tot);
 ok(`[${wd}] el botón dice cuántas líneas faltan por revisar`,(await text(p,'#purConfirm'))==='Confirmar factura (faltan 4 por revisar)',await text(p,'#purConfirm'));
 await tap(p,'#purConfirm');
 ok(`[${wd}] sin revisar las líneas no se confirma y lo dice`,/Línea 1: márcala como revisada/.test(await text(p,'#toast'))&&near(G(await D(p),'g1').packPrice,16),await text(p,'#toast'));
 await p.fill('#pl_qty_0','');await tap(p,'#pl_rev_0');
 ok(`[${wd}] una línea con datos incompletos no se puede marcar como revisada`,/Línea 1: la cantidad debe ser mayor que 0/.test(await text(p,'#toast'))&&(await p.getAttribute('#pl_rev_0','aria-pressed'))==='false',await text(p,'#toast'));
 await p.fill('#pl_qty_0','1');for(let i=0;i<4;i++)await tap(p,`#pl_rev_${i}`);
 ok(`[${wd}] las 4 líneas revisadas: «Confirmar factura»`,(await text(p,'#purConfirm'))==='Confirmar factura'&&(await p.locator('.pur-line.done').count())===4,await text(p,'#purConfirm'));
 await p.fill('#pl_amount_3','2');
 ok(`[${wd}] cambiar una línea revisada la vuelve a dejar pendiente`,(await p.getAttribute('#pl_rev_3','aria-pressed'))==='false'&&/faltan 1/.test(await text(p,'#purConfirm')),null);
 await p.fill('#pl_amount_3','3');await tap(p,'#pl_rev_3');
 // Borrador
 await tap(p,'#purSave');let tSave='';await until(async()=>/Borrador guardado/.test(tSave=await text(p,'#toast')),3000);let d=await D(p),inv=await INVS(p);
 ok(`[${wd}] «Guardar borrador» guarda la factura y Mi barra no cambia (ginebra a 16 €, sin tónica nueva)`,inv.length===1&&inv[0].status==='borrador'&&near(G(d,'g1').packPrice,16)&&!d.ingredients.some(i=>i.name==='Tónica premium')&&/Borrador guardado/.test(tSave),[inv.length,inv[0]&&inv[0].status,G(d,'g1').packPrice,d.ingredients.map(i=>i.name),await text(p,'#toast')]);
 ok(`[${wd}] la lista muestra la factura en borrador con su total`,/Distribuciones Lanzarote · nº F-101/.test(await text(p,'#purList'))&&/121,55 €/.test(await text(p,'#purList'))&&/Borrador/.test(await text(p,'#purList')),await text(p,'#purList'));
 await screenOK(p,wd,'lista de compras','#page-purchases');
 // Confirmar
 await tap(p,'.pur-row:has-text("F-101")');
 ok(`[${wd}] el borrador se reabre con sus datos, sus archivos y las líneas revisadas`,(await p.inputValue('#purSupplier'))==='Distribuciones Lanzarote'&&(await p.locator('.pur-line.done').count())===4&&(await p.locator('.pur-file').count())===2,null);
 await screenOK(p,wd,'factura en edición','#page-purchases');
 await tap(p,'#purConfirm');
 const msg=await text(p,'#appConfirmText');
 ok(`[${wd}] confirmar pide confirmación dentro de la página: actualiza 2 precios (último precio) y crea 1 producto`,/Se actualizará el precio de 2 productos de Mi barra con el de esta compra \(último precio\)/.test(msg)&&/Se crearán 1 producto nuevo/.test(msg)&&/ya no se podrá editar/.test(msg),msg);
 await yes(p);await until(async()=>(await INVS(p))[0].status==='confirmada');d=await D(p);inv=await INVS(p);
 const g=G(d,'g1'),tn=d.ingredients.find(i=>i.name==='Tónica premium');
 ok(`[${wd}] confirmada: la ginebra pasa a 15 € (90 € ÷ 6), con IGIC 7 % aparte y escandallo sin impuesto (0,0214 €/ml)`,near(g.packPrice,15)&&g.taxType==='IGIC'&&g.taxRate===7&&!g.taxIncluded&&near(g.unitCost,15/700),g);
 ok(`[${wd}] histórico de precios de la ginebra: 16 € → 15 € con proveedor, fecha e id de la factura`,g.priceHistory.length===1&&g.priceHistory[0].prev===16&&g.priceHistory[0].packPrice===15&&g.priceHistory[0].supplier==='Distribuciones Lanzarote'&&g.priceHistory[0].date==='2026-10-30'&&g.priceHistory[0].invoiceId===inv[0].id,g.priceHistory);
 ok(`[${wd}] producto nuevo «Tónica premium»: 24 × 20 cl = 4800 ml a 21,60 € del proveedor`,tn&&tn.packQty===4800&&near(tn.packPrice,21.6)&&tn.supplier==='Distribuciones Lanzarote',tn);
 ok(`[${wd}] la factura guarda lo que entró: 4200 ml de ginebra y 4800 ml de tónica`,inv[0].lines[0].baseQty===4200&&inv[0].lines[1].baseQty===4800&&inv[0].lines[1].ingredientId===tn.id,inv[0].lines.map(l=>l.baseQty));
 ok(`[${wd}] alias guardados por proveedor (texto de la factura → producto y envases)`,d.purchaseAliases.some(a=>a.text==='beefeater 70cl'&&a.ingredientId==='g1'&&a.packs===6),d.purchaseAliases);
 ok(`[${wd}] la factura confirmada se ve sin campos para editar`,/Confirmada/.test(await text(p,'#purForm'))&&(await p.locator('#purForm input').count())===0&&/16,00 € → 15,00 €/.test(await text(p,'#purForm')),await text(p,'#purForm'));
 await tap(p,'#purClose');
 // Duplicado y alias
 await tap(p,'#purNew');await p.fill('#purSupplier','distribuciones lanzarote');await p.fill('#purNumber','F-101');await line(p,0,{text:'beefeater 70cl'});
 ok(`[${wd}] alias: el mismo texto del mismo proveedor propone la ginebra y 6 envases por unidad`,(await p.inputValue('#pl_ing_0'))==='g1'&&(await p.inputValue('#pl_packs_0'))==='6'&&/como la última vez/.test(await text(p,'#toast')),[await p.inputValue('#pl_ing_0'),await p.inputValue('#pl_packs_0')]);
 await tap(p,'#purSave');
 ok(`[${wd}] el mismo número del mismo proveedor no se guarda dos veces`,/Ya hay una factura nº F-101/.test(await text(p,'#toast'))&&(await INVS(p)).length===1,await text(p,'#toast'));
 await tap(p,'#purClose');
 // Stock
 await tap(p,'.mobile-nav button:has-text("Stock")');await p.fill('#sProduct','Ginebra Beefeater');await p.selectOption('#sUnit','ml');await p.fill('#sStart','2026-10-25');await p.fill('#sEnd','2026-10-31');
 await tap(p,'#sSumPurchases');
 ok(`[${wd}] control de stock: «Sumar compras del periodo» pone 4200 ml y dice de qué factura`,(await p.inputValue('#sPurchases'))==='4200'&&/Distribuciones Lanzarote nº F-101 \(2026-10-30\): 4200 ml/.test(await text(p,'#purchasesBreakdown')),[await p.inputValue('#sPurchases'),await text(p,'#purchasesBreakdown')]);
 await p.fill('#sEnd','2026-10-29');await tap(p,'#sSumPurchases');
 ok(`[${wd}] sin compras entre esas fechas: 0 y lo explica`,(await p.inputValue('#sPurchases'))==='0'&&/No hay facturas confirmadas/.test(await text(p,'#purchasesBreakdown')),null);
 // Histórico en la ficha del producto
 await tap(p,'.mobile-nav button:has-text("Mi barra")');await tap(p,'#barFullList');await tap(p,'#page-ingredients tr:has-text("Ginebra Beefeater") button:has-text("Editar")');
 ok(`[${wd}] al editar la ginebra se ven sus últimos precios de compra`,/Últimos precios de compra: 2026-10-30 Distribuciones Lanzarote: 16,00 € → 15,00 €/.test(await text(p,'#ingHistory')),await text(p,'#ingHistory'));
 await tap(p,'#ingredientForm button[type=submit]');
 ok(`[${wd}] guardar la ficha del producto conserva su histórico de precios`,(G(await D(p),'g1').priceHistory||[]).length===1,G(await D(p),'g1'));
 // Persistencia y copia
 await p.reload();await until(()=>p.evaluate(()=>invReady));
 ok(`[${wd}] tras recargar, la factura sigue (guardada en el dispositivo)`,(await INVS(p)).length===1&&(await INVS(p))[0].status==='confirmada',null);
 if(wd===390){await tap(p,'.mobile-nav button:has-text("Más")');await tap(p,'#page-more button:has-text("Ajustes")');const [dl]=await Promise.all([p.waitForEvent('download'),tap(p,'#page-settings button:has-text("Exportar copia")')]);const f=TMP+'copia_compras.json';await dl.saveAs(f);const js=JSON.parse(fs.readFileSync(f,'utf8'));
  ok('la copia exportada incluye las facturas (sin las fotos) y el esquema 8',js.schema===8&&Array.isArray(js.purchases)&&js.purchases.length===1&&js.purchases[0].lines.length===4&&!JSON.stringify(js.purchases).includes('blob')&&Array.isArray(js.purchaseAliases),[js.schema,js.purchases&&js.purchases.length]);
  const q=await mk(PHONE,{schema:7,ingredients:[],drinks:[],stocks:[],diagnostics:[],business:{}});await q.setInputFiles('#importFile',f);await q.locator('#importConfirm').waitFor({state:'visible',timeout:5000});
  ok('importar avisa de cuántas facturas trae (sin sus fotos)',/1 facturas sin sus fotos/.test(await text(q,'#importConfirmText')),await text(q,'#importConfirmText'));
  await q.click('#importYes');await until(async()=>(await INVS(q)).length===1);
  ok('al importar la copia se recuperan las facturas y sus líneas',(await INVS(q)).length===1&&(await INVS(q))[0].lines.length===4&&(await INVS(q))[0].files.length===0,await INVS(q))}
 // Eliminar
 await toPurchases(p);await tap(p,'.pur-row:has-text("F-101")');await tap(p,'#purDelete');
 ok(`[${wd}] eliminar una factura confirmada avisa de que los precios no vuelven atrás`,/no vuelven atrás/.test(await text(p,'#appConfirmText')),await text(p,'#appConfirmText'));
 await yes(p);await until(async()=>(await INVS(p)).length===0);
 ok(`[${wd}] eliminada: ya no está y la ginebra conserva 15 €`,(await INVS(p)).length===0&&near(G(await D(p),'g1').packPrice,15),null);
}
// ── Accesibilidad (axe) ──
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const p=await mk(dev,SEED,{bypassCSP:true});await toPurchases(p);await tap(p,'#purNew');await line(p,0,{text:'X',ing:'g1',tax:'IGIC'});
 await p.addScriptTag({path:AXE});const v=await p.evaluate(async()=>(await axe.run(document.getElementById('page-purchases'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']})).violations.map(x=>({id:x.id,n:x.nodes.length,t:x.nodes.slice(0,3).map(y=>y.target.join(' '))})));
 ok(`[${wd}] axe (WCAG 2.1 AA) en la factura: sin incumplimientos`,v.length===0,v)}

// ══ 2. Con cuentas contra el Supabase simulado ══
{const KEYV='clave-publica-de-prueba',m=await sm.start(KEYV),s=await srv.start({cloud:{url:m.base,key:KEYV}}),APP=s.base+'isla_barra_control_mvp.html';
 m.addUser('samuel@isla.es','secreto-admin-1');m.makeAdmin('samuel@isla.es');const bar=m.addBar('Bar Nube');m.addUser('encargado@bar.es','clave-encargado');m.addMember(bar.id,'encargado@bar.es','editor');m.addUser('socio@bar.es','clave-socio');m.addMember(bar.id,'socio@bar.es','lector');
 m.st.data.set(bar.id,{data:{schema:8,settings:{mode:'full',started:true,guideHidden:true},business:{name:'Bar Nube'},ingredients:[ing('g1','Ginebra Beefeater','Destilados','Ginebras',700,16)],drinks:[],sales:[],stocks:[],diagnostics:[]},version:1,updated_at:new Date().toISOString()});
 const login=async(email,pass)=>{const c=await b.newContext(PHONE);const p=await c.newPage();wire(p);await p.goto(APP);await p.fill('#loginEmail',email);await p.fill('#loginPass',pass);await Promise.all([p.waitForEvent('load',{timeout:10000}),tap(p,'#loginBtn')]);await until(()=>p.evaluate(()=>typeof invReady!=='undefined'&&invReady));return p};
 const e1=await login('encargado@bar.es','clave-encargado');
 await toPurchases(e1);await tap(e1,'#purNew');await e1.setInputFiles('#purFile',[PHOTO]);await until(async()=>(await e1.locator('.pur-file').count())===1);
 await e1.fill('#purSupplier','Distribuciones Lanzarote');await e1.fill('#purNumber','N-1');await line(e1,0,{text:'BEEFEATER 70CL',ing:'g1',qty:'2',packs:'6',amount:'180'});await tap(e1,'#pl_rev_0');await tap(e1,'#purConfirm');await yes(e1);
 const up=await until(()=>[...m.st.invoices.values()].some(r=>r.status==='confirmada')&&m.st.objects.size===1);const row=[...m.st.invoices.values()][0],obj=[...m.st.objects.entries()][0];
 ok('nube: el editor confirma una factura y se sube a purchase_invoices con su foto en «facturas/<bar>/<factura>/…» (JPEG)',up&&row.bar_id===bar.id&&row.status==='confirmada'&&row.number==='N-1'&&obj[0].startsWith(bar.id+'/'+row.id+'/')&&obj[1].type==='image/jpeg'&&row.data.files[0].path===obj[0],[up,row&&row.status,obj&&obj[0]]);
 ok('nube: el precio de Mi barra (15 €) se sube con los datos del bar',await until(()=>{const d=m.barData(bar.id).data;return d.ingredients&&near(d.ingredients[0].packPrice,15)}),m.barData(bar.id).data.ingredients);
 // Otro dispositivo del administrador
 const a1=await (async()=>{const c=await b.newContext(PHONE);const p=await c.newPage();wire(p);await p.goto(APP);await p.fill('#loginEmail','samuel@isla.es');await p.fill('#loginPass','secreto-admin-1');await tap(p,'#loginBtn');await until(()=>seen(p,'#barList'));await Promise.all([p.waitForEvent('load',{timeout:10000}),tap(p,'#barList .gate-item:has-text("Bar Nube") button:has-text("Abrir")')]);return p})();
 await until(()=>a1.evaluate(()=>INV.length===1));await toPurchases(a1);
 ok('nube: otro dispositivo (administrador) ve la factura confirmada',/Distribuciones Lanzarote · nº N-1/.test(await text(a1,'#purList'))&&/Confirmada/.test(await text(a1,'#purList')),await text(a1,'#purList'));
 await tap(a1,'.pur-row:has-text("N-1")');const loaded=await until(()=>a1.evaluate(()=>{const im=document.querySelector('#purFiles img');return !!im&&im.src.startsWith('blob:')&&im.naturalWidth===1600}));
 ok('nube: la foto se descarga del almacén con la sesión y se ve (blob:)',loaded,null);
 // Lector
 const l1=await login('socio@bar.es','clave-socio');await until(()=>l1.evaluate(()=>INV.length===1));await toPurchases(l1);
 ok('lector: ve la factura, pero no «Nueva factura» y se le explica que es solo lectura',/N-1/.test(await text(l1,'#purList'))&&!(await seen(l1,'#purNew'))&&(await seen(l1,'#purReadOnly')),null);
 await tap(l1,'.pur-row:has-text("N-1")');
 ok('lector: ve las líneas pero no las fotos ni «Eliminar»',/BEEFEATER 70CL/.test(await text(l1,'#purForm'))&&/Solo los ven el administrador y quien puede editar el bar/.test(await text(l1,'#purForm'))&&(await l1.locator('#purForm img').count())===0&&!(await seen(l1,'#purDelete')),await text(l1,'#purForm'));
 ok('lector: el almacén simulado le niega la foto (como en schema.sql)',await l1.evaluate(async p=>{try{await api('/storage/v1/object/authenticated/facturas/'+p,{blob:true});return false}catch(e){return true}},obj[0]),null);
 // Sin conexión
 await e1.context().setOffline(true);m.ctl.offline=true;await tap(e1,'#purClose');await tap(e1,'#purNew');await e1.fill('#purSupplier','Bebidas Sur');await e1.fill('#purNumber','S-7');await line(e1,0,{text:'RON',kind:'otro',amount:'10'});await tap(e1,'#purSave');
 ok('sin conexión: el borrador se guarda y queda «pendiente de subir»',/pendiente de subir/.test(await text(e1,'.pur-row:has-text("S-7")'))&&m.st.invoices.size===1,await text(e1,'#purList'));
 m.ctl.offline=false;await e1.context().setOffline(false);
 ok('al volver la conexión se sube solo',await until(()=>[...m.st.invoices.values()].some(r=>r.number==='S-7'))&&await until(async()=>!/pendiente de subir/.test(await text(e1,'.pur-row:has-text("S-7")'))),await text(e1,'#purList'));
 // Número repetido en la nube (creado desde otro dispositivo con la misma numeración)
 m.st.invoices.set('b0000000-0000-4000-8000-000000000001',{id:'b0000000-0000-4000-8000-000000000001',bar_id:bar.id,supplier:'Otro',number:'X-1',status:'borrador',data:{supplier:'Otro',number:'X-1',lines:[]}});
 await tap(e1,'#purNew');await e1.fill('#purSupplier','Otro');await e1.fill('#purNumber','X-1');await line(e1,0,{text:'algo',kind:'otro',amount:'1'});await tap(e1,'#purSave');
 ok('número repetido en la nube: la factura se queda en el dispositivo y lo dice',await until(async()=>/número de factura repetido en la nube/.test(await text(e1,'#purList'))),await text(e1,'#purList'));
 for(const p of [e1,a1,l1])ok('nube: sin violaciones de la CSP ni errores ('+(p===e1?'editor':p===a1?'administrador':'lector')+')',(await p.evaluate(()=>window.__csp?window.__csp.length:0))===0&&p.errs.length===0,p.errs);
 s.server.close();m.server.close()}

ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO compras: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
