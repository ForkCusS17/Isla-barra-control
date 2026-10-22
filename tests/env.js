// Navegador de las pruebas: BROWSER=chromium (por defecto), firefox o webkit.
// Firefox no admite isMobile: se quita de los perfiles de dispositivo (el resto de la emulación se mantiene).
// Diagnóstico: si una serie termina con error, se muestran las peticiones que quedaron sin terminar (por ejemplo,
// lo que impide que una página llegue a «load»).
const pw=require('playwright');const NAME=process.env.BROWSER||'chromium';
if(!['chromium','firefox','webkit'].includes(NAME))throw new Error('BROWSER desconocido: '+NAME);
const adapt=d=>{const x={...d};delete x.defaultBrowserType;if(NAME==='firefox')delete x.isMobile;return x};
const devices=new Proxy(pw.devices,{get:(t,k)=>t[k]&&adapt(t[k])});
const pending=new Map();let seq=0;
const watch=page=>{page.on('request',r=>pending.set(r,{n:++seq,t:Date.now(),u:r.url().slice(0,120),k:r.resourceType(),sw:!!r.serviceWorker()}));const done=r=>pending.delete(r);page.on('requestfinished',done);page.on('requestfailed',done)};
process.on('exit',code=>{if(!code&&!process.exitCode)return;const now=Date.now(),open=[...pending.values()].filter(x=>now-x.t>5000).slice(-8);if(open.length)console.log('Error (diagnóstico): peticiones sin terminar → '+open.map(x=>`${x.k} ${x.u} (${Math.round((now-x.t)/1000)} s${x.sw?', service worker':''})`).join(' | '))});
async function launch(o){const b=await pw[NAME].launch(o);const nc=b.newContext.bind(b);b.newContext=async(...a)=>{const c=await nc(...a);c.on('page',watch);return c};const np=b.newPage.bind(b);b.newPage=async(...a)=>{const p=await np(...a);watch(p);return p};return b}
module.exports={chromium:{launch},devices,NAME};
