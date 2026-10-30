// Cuentas por bar y nube contra un Supabase simulado (tests/supabase_mock.js): inicio de sesión por invitación,
// «Mis bares», usuarios (editor y lector), guardado en la nube, sin conexión, conflictos entre dispositivos,
// enlaces de invitación y de contraseña olvidada, sesión caducada, cerrar sesión y subir datos anteriores.
// Emulación de móvil (390 y 360 px) y solo toques; no se llaman funciones de la app.
const {chromium,devices}=require('./env');const srv=require('./server');const sm=require('./supabase_mock');const {noOverflow,wide,smallTargets,contrastFails}=require('./helpers');
const fs=require('fs'),path=require('path');const T=[];const ok=(n,c,x)=>{T.push([!!c,n,c?'':JSON.stringify(x)]);console.log('· '+(c?'ok ':'MAL ')+n)};
const PHONE={...devices['iPhone 13'],reducedMotion:'reduce'},SMALL={...PHONE,viewport:{width:360,height:740},screen:{width:360,height:740}};
const AXE=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');const KEYV='clave-publica-de-prueba',BK='islaBarraControlMVP_v1';
(async()=>{const m=await sm.start(KEYV);const s=await srv.start({cloud:{url:m.base,key:KEYV}});const APP=s.base+'isla_barra_control_mvp.html';const b=await chromium.launch();const pages=[];
m.addUser('samuel@isla.es','secreto-admin-1');m.makeAdmin('samuel@isla.es');
const mk=async(dev=PHONE,seed)=>{const c=await b.newContext(dev);await c.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+e.blockedURI))});
 if(seed)await c.addInitScript(([k,v])=>{if(!/isla_barra_control_mvp\.html$/.test(location.pathname)||window.name==='semilla')return;window.name='semilla';localStorage.setItem(k,v)},seed);
 const p=await c.newPage();p.errs=[];p.dl=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,160)));p.on('dialog',d=>{p.dl.push(d.type());d.dismiss()});await p.goto(APP);pages.push(p);return p};
const tap=(p,sel)=>p.locator(sel).filter({visible:true}).first().tap({timeout:8000}).catch(e=>{throw new Error('toque en '+sel+': '+e.message.split('\n')[0])});
const seen=(p,sel)=>p.locator(sel).filter({visible:true}).count().then(n=>n>0);
const text=(p,sel)=>p.locator(sel).filter({visible:true}).first().innerText().then(t=>t.replace(/\s+/g,' ').trim()).catch(()=>'');
const D=p=>p.evaluate(()=>JSON.parse(JSON.stringify(data)));
const until=async(fn,ms=8000)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await fn())return true;await new Promise(r=>setTimeout(r,100))}return false};
const reloadTap=(p,sel)=>Promise.all([p.waitForEvent('load',{timeout:10000}),tap(p,sel)]);
const login=async(p,email,pass,reloads)=>{await p.fill('#loginEmail',email);await p.fill('#loginPass',pass);if(reloads)await reloadTap(p,'#loginBtn');else await tap(p,'#loginBtn')};
const openBar=(p,name)=>reloadTap(p,`#barList .gate-item:has-text("${name}") button:has-text("Abrir")`);
const nav=async(p,l)=>{if(['Cuenta y bares','Ajustes'].includes(l)){await tap(p,'.mobile-nav button:has-text("Más")');await tap(p,`#page-more button:has-text("${l}")`)}else await tap(p,`.mobile-nav button:has-text("${l}")`)};
const quick=async(p,sub,name,price)=>{await nav(p,'Mi barra');await tap(p,'#barCats .cat-chip:has-text("Destilados")');if(await p.locator(`.shelf[data-sub="${sub}"]`).getAttribute('open')===null)await tap(p,`#barSections .shelf[data-sub="${sub}"] summary`);await tap(p,`.shelf[data-sub="${sub}"] .add-to-shelf`);await p.locator('#qaName').pressSequentially(name);if(price)await p.locator('#qaPrice').pressSequentially(price);await tap(p,'#qaSave')};
const names=d=>(d.ingredients||[]).map(i=>i.name).sort().join('|');
const axe=async p=>{await p.addScriptTag({content:AXE});return p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>v.id+':'+v.nodes.length))};

// ── 0. La configuración publicada (proyecto real de Supabase) ───────────────
{const html=fs.readFileSync(path.join(__dirname,'..','isla_barra_control_mvp.html'),'utf8'),cm=html.match(/const CLOUD=\{url:'([^']*)',key:'([^']*)'\}/);
 const role=cm&&cm[2]?JSON.parse(Buffer.from(cm[2].split('.')[1]||'','base64url').toString()||'{}').role:'';
 ok('la app publicada apunta a un proyecto de Supabase con la clave pública «anon» (nunca la secreta)',!!cm&&/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(cm[1])&&role==='anon',[cm&&cm[1],role]);
 const r=await srv.start({cloud:{url:cm[1],key:cm[2]}});const c=await b.newContext(PHONE);const q=await c.newPage();const errs=[];q.on('pageerror',x=>errs.push(String(x)));await q.goto(r.base+'isla_barra_control_mvp.html');
 ok('con esa configuración, la app abre en «Inicia sesión», sin errores, y la CSP solo permite conectar con ese proyecto',(await seen(q,'#loginForm'))&&errs.length===0&&(await q.evaluate(()=>document.querySelector('meta[http-equiv="Content-Security-Policy"]').content)).includes("connect-src 'self' "+cm[1]),errs);
 await c.close();r.server.close()}

// ── 1. Sin sesión no se ve nada ──────────────────────────────────────────────
let a=await mk();
ok('sin sesión: pide iniciar sesión y no enseña la app ni sus botones',(await seen(a,'#loginForm'))&&!(await seen(a,'.layout'))&&!(await seen(a,'.mobile-nav'))&&!(await seen(a,'.top-actions')),await text(a,'#authGate'));
ok('acceso solo por invitación: no hay registro, solo «Entrar» y «He olvidado mi contraseña»',!(await seen(a,'#authGate :text-matches("regístrate|crear cuenta","i")'))&&/por invitación/.test(await text(a,'#authGate')),await text(a,'#authGate'));
ok('la CSP solo deja conectar con la propia app y con la nube',/connect-src 'self' http:\/\/127\.0\.0\.1:\d+/.test(await a.evaluate(()=>document.querySelector('meta[http-equiv="Content-Security-Policy"]').content)),null);
await login(a,'samuel@isla.es','otra');await until(async()=>/incorrectos/.test(await text(a,'#gateMsg')));
ok('contraseña incorrecta: «Correo o contraseña incorrectos» y sigue fuera',/Correo o contraseña incorrectos/.test(await text(a,'#gateMsg'))&&!(await seen(a,'.layout')),await text(a,'#gateMsg'));
await login(a,'samuel@isla.es','secreto-admin-1');await until(()=>seen(a,'#newBarForm'));
ok('administrador: «Mis bares», vacío, con «Crear bar» y «Cerrar sesión»',/Mis bares/.test(await text(a,'#authTitle'))&&/Aún no hay bares/.test(await text(a,'#barList'))&&(await seen(a,'#gateLogout')),await text(a,'#authGate'));
await a.fill('#newBarName','Bar Uno');await tap(a,'#newBarBtn');await until(async()=>/Bar Uno/.test(await text(a,'#barList')));
await a.fill('#newBarName','Bar Dos');await tap(a,'#newBarBtn');await until(async()=>/Bar Dos/.test(await text(a,'#barList')));
const B1=[...m.st.bars.values()].find(x=>x.name==='Bar Uno'),B2=[...m.st.bars.values()].find(x=>x.name==='Bar Dos');
ok('crear bares: aparecen en la lista con «Abrir» y «Usuarios»',!!B1&&!!B2&&(await a.locator('#barList .gate-item').count())===2&&(await seen(a,'#barList button:has-text("Usuarios")')),await text(a,'#barList'));
await openBar(a,'Bar Uno');
ok('abrir un bar: se ve la app, con el bar y «Guardado en la nube» arriba',!(await seen(a,'#authGate'))&&(await seen(a,'.layout'))&&/Bar Uno · Guardado en la nube/.test(await text(a,'#cloudStatus')),await text(a,'#cloudStatus'));
ok('con cuentas no se ofrece el bar de ejemplo (nunca se mezcla con datos reales que van a la nube)',!(await seen(a,'#wDemo')),null);
await tap(a,'#wStart');await tap(a,'#tplSkip');await quick(a,'Rones','Ron Uno','14');
ok('guardar sube el bar a la nube (versión nueva con el producto)',await until(()=>names(m.barData(B1.id).data)==='Ron Uno')&&/Guardado en la nube/.test(await text(a,'#cloudStatus')),[m.barData(B1.id).version,names(m.barData(B1.id).data)]);
await a.reload();ok('al volver a abrir la app sigue la sesión y el bar, con sus datos',!(await seen(a,'#authGate'))&&names(await D(a))==='Ron Uno',names(await D(a)));
await nav(a,'Cuenta y bares');
ok('Más › Cuenta y bares: usuario, bar, permiso y estado de la nube',/samuel@isla\.es/.test(await text(a,'#accountPanel'))&&/Bar Uno/.test(await text(a,'#accountPanel'))&&/Administrador/.test(await text(a,'#accountPanel'))&&/Guardado en la nube/.test(await text(a,'#accountPanel')),await text(a,'#accountPanel'));

// ── 2. Otro dispositivo, sin conexión y conflictos ───────────────────────────
let d2=await mk();await login(d2,'samuel@isla.es','secreto-admin-1');await until(()=>seen(d2,'#barList'));await openBar(d2,'Bar Uno');
ok('otro dispositivo: al abrir el bar descarga los datos de la nube',await until(async()=>names(await D(d2))==='Ron Uno'),names(await D(d2)));
await a.context().setOffline(true);m.ctl.offline=true;await quick(a,'Rones','Ron Dos','18');
ok('sin conexión: guarda en el dispositivo y avisa «se subirán al volver»',await until(async()=>/Sin conexión/.test(await text(a,'#cloudStatus')))&&names(await D(a))==='Ron Dos|Ron Uno'&&names(m.barData(B1.id).data)==='Ron Uno',[await text(a,'#cloudStatus')]);
m.ctl.offline=false;await a.context().setOffline(false);
ok('al recuperar la conexión, los cambios se suben solos',await until(()=>names(m.barData(B1.id).data)==='Ron Dos|Ron Uno',10000),[names(m.barData(B1.id).data)]);
await quick(d2,'Ginebras','Ginebra Dos','15');
ok('cambio en un dispositivo con datos viejos: avisa del conflicto en vez de pisar la nube',await until(()=>seen(d2,'#syncConflict'))&&names(m.barData(B1.id).data)==='Ron Dos|Ron Uno',await text(d2,'#syncConflict'));
await tap(d2,'#conflictCloud');
ok('«Usar los de la nube»: quedan los datos de la nube y los propios se guardan como copia interna',await until(async()=>names(await D(d2))==='Ron Dos|Ron Uno')&&!(await seen(d2,'#syncConflict'))&&await d2.evaluate(k=>!!localStorage.getItem(k+'_antes_de_nube'),BK+'_bar_'+B1.id),names(await D(d2)));
m.remoteSave(B1.id,{...m.barData(B1.id).data,ingredients:[...(m.barData(B1.id).data.ingredients||[]),{id:'x1',name:'Vodka Remoto',category:'Destilados',subcategory:'Vodkas',unit:'ml',packQty:700,packPrice:12,unitCost:12/700,active:true}]});
await quick(d2,'Ginebras','Ginebra Tres','16');await until(()=>seen(d2,'#syncConflict'));await tap(d2,'#conflictMine');
ok('«Mantener los míos y subirlos»: la nube queda con los del dispositivo',await until(()=>/Ginebra Tres/.test(names(m.barData(B1.id).data))&&!/Vodka Remoto/.test(names(m.barData(B1.id).data))),names(m.barData(B1.id).data));
await a.reload();ok('el primer dispositivo, al volver, recibe lo último de la nube',await until(async()=>/Ginebra Tres/.test(names(await D(a)))),names(await D(a)));

// ── 3. Usuarios de un bar (editor y lector) ─────────────────────────────────
await nav(a,'Cuenta y bares');await tap(a,'#switchBar');await until(()=>seen(a,'#barList'));
await tap(a,'#barList .gate-item:has-text("Bar Uno") button:has-text("Usuarios")');await until(()=>seen(a,'#memberForm'));
ok('Usuarios del bar: lista vacía y formulario «Dar acceso»',/Nadie más tiene acceso/.test(await text(a,'#memberList')),await text(a,'#memberList'));
await a.fill('#memberEmail','encargado@bar.es');await tap(a,'#memberAdd');
ok('dar acceso a un correo sin invitar: explica que antes hay que invitarlo en Supabase',await until(async()=>/aún no tiene cuenta/.test(await text(a,'#gateMsg'))),await text(a,'#gateMsg'));
m.addUser('encargado@bar.es','clave-encargado');m.addUser('socio@bar.es','clave-socio');
await tap(a,'#memberAdd');await until(async()=>/encargado@bar\.es/.test(await text(a,'#memberList')));
await a.fill('#memberEmail','socio@bar.es');await a.selectOption('#memberRole','lector');await tap(a,'#memberAdd');await until(async()=>/socio@bar\.es/.test(await text(a,'#memberList')));
ok('dar acceso: encargado «Puede editar» y socio «Solo lectura»',/encargado@bar\.es Puede editar/.test(await text(a,'#memberList'))&&/socio@bar\.es Solo lectura/.test(await text(a,'#memberList')),await text(a,'#memberList'));
let e1=await mk();await login(e1,'encargado@bar.es','clave-encargado',true);
ok('usuario de un solo bar: entra directo a su bar (sin «Mis bares» ni administración)',!(await seen(e1,'#authGate'))&&/Bar Uno/.test(await text(e1,'#cloudStatus'))&&names(await D(e1))===names(m.barData(B1.id).data),await text(e1,'#cloudStatus'));
await nav(e1,'Cuenta y bares');ok('…y en su cuenta pone «Puede editar» y «Cambiar de bar»',/Puede editar/.test(await text(e1,'#accountPanel'))&&(await text(e1,'#switchBar'))==='Cambiar de bar',await text(e1,'#accountPanel'));
await tap(e1,'#changePass');ok('«Cambiar mi contraseña» abre el formulario (con «Cancelar»)',/Cambiar mi contraseña/.test(await text(e1,'#authTitle'))&&(await seen(e1,'#passCancel')),await text(e1,'#authTitle'));
await tap(e1,'#passCancel');ok('«Cancelar» vuelve a la app sin cambiar nada',!(await seen(e1,'#authGate'))&&m.userBy('encargado@bar.es').password==='clave-encargado',null);
await nav(e1,'Cuenta y bares');await tap(e1,'#changePass');await e1.fill('#newPass','clave-encargado-2');await e1.fill('#newPass2','clave-encargado-2');await tap(e1,'#passBtn');
ok('…al guardarla vuelve a la app y la nueva contraseña queda en la nube',await until(async()=>!(await seen(e1,'#authGate')))&&m.userBy('encargado@bar.es').password==='clave-encargado-2',m.userBy('encargado@bar.es').password);
await nav(e1,'Cuenta y bares');
await tap(e1,'#switchBar');await until(()=>seen(e1,'#barList'));
ok('el usuario de un bar solo ve ese bar (no «Bar Dos») y no puede crear bares ni ver usuarios',(await e1.locator('#barList .gate-item').count())===1&&!/Bar Dos/.test(await text(e1,'#barList'))&&!(await seen(e1,'#newBarForm'))&&!(await seen(e1,'#barList button:has-text("Usuarios")')),await text(e1,'#barList'));
await openBar(e1,'Bar Uno');const v0=m.barData(B1.id).version;await quick(e1,'Vodkas','Vodka Encargado','11');
ok('el encargado (editor) guarda en la nube',await until(()=>/Vodka Encargado/.test(names(m.barData(B1.id).data))),names(m.barData(B1.id).data));
let l1=await mk();await login(l1,'socio@bar.es','clave-socio',true);
ok('usuario de solo lectura: lo indica arriba',/Solo lectura/.test(await text(l1,'#cloudStatus')),await text(l1,'#cloudStatus'));
const v1=m.barData(B1.id).version;await quick(l1,'Vodkas','Vodka Socio','9');await l1.waitForTimeout(2000);
ok('…y sus cambios no se suben a la nube',m.barData(B1.id).version===v1&&!/Vodka Socio/.test(names(m.barData(B1.id).data)),m.barData(B1.id).version);
await l1.reload();ok('…al volver a abrir, ve los datos de la nube',await until(async()=>!/Vodka Socio/.test(names(await D(l1)))&&/Vodka Encargado/.test(names(await D(l1)))),names(await D(l1)));
await a.goto(APP);await nav(a,'Cuenta y bares');await tap(a,'#switchBar');await until(()=>seen(a,'#barList'));await tap(a,'#barList .gate-item:has-text("Bar Uno") button:has-text("Usuarios")');await until(()=>seen(a,'#memberList .gate-item'));
await tap(a,'#memberList .gate-item:has-text("socio@bar.es") button:has-text("Quitar acceso")');ok('quitar acceso pide confirmación dentro de la página',await seen(a,'#appConfirm'),null);await tap(a,'#appConfirmYes');
ok('…y el socio desaparece de la lista',await until(async()=>!/socio@bar\.es/.test(await text(a,'#memberList'))),await text(a,'#memberList'));

// ── 4. Invitación, contraseña olvidada y enlaces caducados ──────────────────
m.addUser('nuevo@bar.es','temporal-'+Date.now());m.addMember(B2.id,'nuevo@bar.es','editor');
let n1=await mk();await n1.goto(APP+m.link('nuevo@bar.es','invite'));
ok('enlace de invitación: «Crea tu contraseña» con su correo, y la dirección queda limpia',await until(()=>seen(n1,'#passForm'))&&/Crea tu contraseña/.test(await text(n1,'#authTitle'))&&/nuevo@bar\.es/.test(await text(n1,'#authGate'))&&!/access_token/.test(n1.url()),[await text(n1,'#authGate'),n1.url()]);
await n1.fill('#newPass','corta');await n1.fill('#newPass2','corta');await tap(n1,'#passBtn');ok('contraseña de menos de 8 caracteres: lo explica',/al menos 8/.test(await text(n1,'#gateMsg')),await text(n1,'#gateMsg'));
await n1.fill('#newPass','larga-segura-1');await n1.fill('#newPass2','larga-segura-2');await tap(n1,'#passBtn');ok('contraseñas distintas: lo explica',/no coinciden/.test(await text(n1,'#gateMsg')),await text(n1,'#gateMsg'));
await n1.fill('#newPass2','larga-segura-1');await reloadTap(n1,'#passBtn');
ok('al guardarla entra en su bar (Bar Dos)',/Bar Dos/.test(await text(n1,'#cloudStatus'))&&m.userBy('nuevo@bar.es').password==='larga-segura-1',await text(n1,'#cloudStatus'));
let r1=await mk();await tap(r1,'#forgotBtn');ok('«He olvidado mi contraseña» sin correo: pide escribirlo',/Escribe tu correo/.test(await text(r1,'#gateMsg')),await text(r1,'#gateMsg'));
await r1.fill('#loginEmail','nuevo@bar.es');await tap(r1,'#forgotBtn');
ok('…con correo: pide el enlace a la nube y avisa sin revelar si la cuenta existe',await until(()=>m.st.recover.includes('nuevo@bar.es'))&&/Si ese correo tiene cuenta/.test(await text(r1,'#gateMsg')),await text(r1,'#gateMsg'));
await r1.goto(APP+m.link('nuevo@bar.es','recovery'));await until(()=>seen(r1,'#passForm'));
ok('enlace de contraseña olvidada: «Nueva contraseña»',/Nueva contraseña/.test(await text(r1,'#authTitle')),await text(r1,'#authTitle'));
await r1.goto(APP+'#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
ok('enlace caducado: lo explica en la pantalla de entrada',await until(async()=>/caducado/.test(await text(r1,'#gateMsg'))),await text(r1,'#gateMsg'));

// ── 5. Sesión caducada y cerrar sesión ──────────────────────────────────────
m.expireTokens();const calls0=m.st.calls.length;await quick(e1,'Vodkas','Vodka Tras Caducar','10');
ok('token caducado: se renueva solo y el cambio se sube',await until(()=>/Vodka Tras Caducar/.test(names(m.barData(B1.id).data)))&&m.st.calls.slice(calls0).some(c=>/grant_type=refresh_token/.test(c)),m.st.calls.slice(calls0));
m.expireTokens();m.st.refresh.clear();await quick(e1,'Vodkas','Vodka Sin Sesion','10');
ok('sesión revocada: vuelve a pedir el inicio de sesión y el cambio se queda en el dispositivo',await until(()=>seen(e1,'#loginForm'))&&/sesión ha caducado/.test(await text(e1,'#gateMsg'))&&/Vodka Sin Sesion/.test(names(await e1.evaluate(k=>JSON.parse(localStorage.getItem(k)),BK+'_bar_'+B1.id))),await text(e1,'#gateMsg'));
await login(e1,'encargado@bar.es','clave-encargado-2',true);
ok('al volver a entrar, el cambio pendiente se sube',await until(()=>/Vodka Sin Sesion/.test(names(m.barData(B1.id).data)),10000),names(m.barData(B1.id).data));
await nav(e1,'Cuenta y bares');await tap(e1,'#logoutBtn');ok('cerrar sesión pide confirmación',await seen(e1,'#appConfirm'),null);await reloadTap(e1,'#appConfirmYes');
const left=await e1.evaluate(bk=>Object.keys(localStorage).filter(k=>k.startsWith(bk+'_bar_')||k===bk+'_sesion'),BK);
ok('al cerrar sesión: vuelve a la entrada y borra del dispositivo la sesión y la copia de los bares',(await seen(e1,'#loginForm'))&&left.length===0,left);

// ── 6. Datos de antes de las cuentas ────────────────────────────────────────
const legacy=JSON.stringify({schema:6,business:{name:'Mi bar de antes'},ingredients:[{id:'l1',name:'Ron de Antes',category:'Destilados',subcategory:'Rones',unit:'ml',packQty:700,packPrice:14,unitCost:0.02,active:true}],drinks:[],stocks:[],diagnostics:[],sales:[],settings:{}});
m.addBar('Bar Tres');const B3=[...m.st.bars.values()].find(x=>x.name==='Bar Tres');
let g=await mk(PHONE,[BK,legacy]);await login(g,'samuel@isla.es','secreto-admin-1');await until(()=>seen(g,'#barList'));await openBar(g,'Bar Tres');
ok('bar vacío y datos de antes en el dispositivo: ofrece subirlos',await until(()=>seen(g,'#appConfirm'))&&/Mi bar de antes/.test(await text(g,'#appConfirmText')),await text(g,'#appConfirmText'));
await tap(g,'#appConfirmYes');ok('…y al aceptar quedan en la nube de ese bar',await until(()=>names(m.barData(B3.id).data)==='Ron de Antes'),names(m.barData(B3.id).data));

// ── 7. Móvil a 390 y 360 px ─────────────────────────────────────────────────
/* axe se inyecta con bypassCSP: la CSP de la app no permite scripts ajenos, como debe ser */
for(const [dev,wd] of [[PHONE,390],[SMALL,360]]){const z=await mk({...dev,bypassCSP:true});const st=[];
 const chk=async lab=>{ok(`[${wd}] ${lab}: sin desbordamiento`,await noOverflow(z),await wide(z));st.push(...(await smallTargets(z,'#authGate')).map(x=>lab+': '+x));const cf=await contrastFails(z);ok(`[${wd}] ${lab}: contraste ≥ 4,5:1`,cf.length===0,cf.slice(0,5));if(wd===390){const v=await axe(z);ok(`[390] ${lab}: sin problemas de accesibilidad (axe)`,v.length===0,v)}};
 await chk('entrada');await login(z,'samuel@isla.es','secreto-admin-1');await until(()=>seen(z,'#barList'));await chk('Mis bares');
 await tap(z,'#barList .gate-item:has-text("Bar Uno") button:has-text("Usuarios")');await until(()=>seen(z,'#memberList .gate-item'));await chk('usuarios');
 ok(`[${wd}] botones de la entrada, Mis bares y usuarios ≥ 44 px`,st.length===0,st.slice(0,6));
 await tap(z,'#membersBack');await openBar(z,'Bar Uno');await nav(z,'Cuenta y bares');ok(`[${wd}] Cuenta y bares sin desbordamiento`,await noOverflow(z),await wide(z));
 const sm2=await smallTargets(z,'#page-account');ok(`[${wd}] botones de Cuenta y bares ≥ 44 px`,sm2.length===0,sm2)}

ok('sin violaciones de la CSP en ninguna pantalla',(await Promise.all(pages.filter(p=>!p.isClosed()).map(p=>p.evaluate(()=>window.__csp).catch(()=>[])))).flat().length===0,(await Promise.all(pages.filter(p=>!p.isClosed()).map(p=>p.evaluate(()=>window.__csp).catch(()=>[])))).flat().slice(0,5));
ok('sin errores de JavaScript ni diálogos del navegador',pages.every(x=>x.errs.length===0&&x.dl.length===0),pages.map(x=>[x.errs,x.dl]).filter(x=>x[0].length||x[1].length));
const pass=T.filter(x=>x[0]).length;console.log(`RESULTADO cuentas: ${pass}/${T.length}`);T.forEach(x=>console.log((x[0]?'OK   ':'FALLA ')+x[1]+(x[2]?'  → '+x[2].slice(0,300):'')));if(pass<T.length)process.exitCode=1;await b.close();s.server.close();m.server.close()})().catch(e=>{console.log('FAIL',e.message,'· última comprobación:',T.length?T[T.length-1][1]:'ninguna');process.exit(1)});
