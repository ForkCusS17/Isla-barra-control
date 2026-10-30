// Service worker de Isla & Barra Control: guarda la app para abrirla sin conexión.
// Los datos del usuario NO pasan por aquí: viven en el localStorage del navegador y no se tocan al actualizar.
// La app se sirve desde la caché y se comprueba en segundo plano si hay una versión nueva; si la hay, se guarda
// y se avisa a la página («Hay una versión nueva»). Al tocar «Actualizar», la página se recarga con ella.
const VERSION='0.4.0';
const CACHE='isla-barra-app-'+VERSION;
const APP='isla_barra_control_mvp.html';
const SHELL=[APP,'manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png','icons/favicon-32.png','fonts/montserrat.woff2','fonts/playfair-display.woff2'];

// Una respuesta que llegó tras una redirección (Netlify puede llevar «…mvp.html» a «…mvp») no se puede entregar a
// una navegación: se guarda una copia limpia con el mismo cuerpo y las mismas cabeceras.
async function clean(res){return res.redirected?new Response(await res.blob(),{status:res.status,statusText:res.statusText,headers:res.headers}):res}
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(async u=>{const r=await fetch(new Request(u,{cache:'reload'}));if(!r.ok)throw new Error(u+' '+r.status);await c.put(u,await clean(r))}))))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('isla-barra-app-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// Qué versión (huella del HTML) se ha servido a cada pestaña y cuál es la última guardada: así una pestaña que
// pregunta al cargar («check») sabe si hay otra más nueva aunque el aviso se enviara antes de que existiera.
const served=new Map();let current='';
async function digest(t){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
self.addEventListener('message',e=>{const t=e.data&&e.data.type;if(t==='skipWaiting')self.skipWaiting();
 if(t==='check'&&e.source){const h=served.get(e.source.id);if(h&&current&&h!==current)e.source.postMessage({type:'update-available'})}});

// La app se reconoce con y sin «.html» (Netlify puede servirla en «/isla_barra_control_mvp»): las dos direcciones
// se sirven desde la misma copia guardada, con el mismo aviso de versión nueva y el mismo modo sin conexión.
const BARE=APP.replace(/\.html$/,'');
const isApp=url=>{if(url.origin!==self.location.origin)return false;const p=url.pathname,s=new URL(self.registration.scope).pathname;return p===s+APP||p===s+BARE||p.endsWith('/'+APP)||p.endsWith('/'+BARE)};
const notify=()=>self.clients.matchAll({type:'window'}).then(cs=>cs.forEach(c=>{if(served.get(c.id)!==current)c.postMessage({type:'update-available'})}));

// Comprueba la app en la red; si ha cambiado, la guarda y avisa. Sin conexión no hace nada.
// (Se vuelve a leer de la caché: la respuesta ya entregada a la página no se puede leer otra vez.)
async function refreshApp(req){
 try{const res=await clean(await fetch(req,{cache:'no-cache'}));if(!res.ok)return;const cache=await caches.open(CACHE),old=await cache.match(APP);
  if(!old){await cache.put(APP,res);return}
  const [a,b]=await Promise.all([old.text(),res.clone().text()]);
  if(!current)current=await digest(a);
  if(a!==b){await cache.put(APP,res);current=await digest(b);await notify()}}catch(e){}
}

self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 if(isApp(url)){e.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(APP);
  const fresh=new Request(APP,{credentials:'same-origin'});
  if(cached){const id=e.resultingClientId;e.waitUntil(cached.clone().text().then(digest).then(h=>{if(id)served.set(id,h);if(!current)current=h}).then(()=>refreshApp(fresh)));return cached}
  await refreshApp(fresh);return (await cache.match(APP))||fetch(req)})());return}
 e.respondWith(caches.match(req,{ignoreSearch:true}).then(r=>r||fetch(req)))});
