// Servidor estático mínimo para las pruebas: solo lectura, solo 127.0.0.1 y solo archivos dentro del proyecto.
// Aplica las cabeceras de _headers (como el alojamiento) y permite cambiar archivos al vuelo (override) para
// simular una versión nueva sin tocar el disco.
const http=require('http'),path=require('path'),fs=require('fs');
const R=path.resolve(__dirname,'..');
const TYPES={'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.css':'text/css','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
// _headers (formato de Netlify y Cloudflare Pages): una ruta sin sangría y debajo, con sangría, «Cabecera: valor».
function readHeaders(root=R){const f=path.join(root,'_headers');if(!fs.existsSync(f))return[];const rules=[];let cur=null;
 for(const line of fs.readFileSync(f,'utf8').split('\n')){if(!line.trim()||line.trim().startsWith('#'))continue;if(!/^\s/.test(line)){cur={pat:line.trim(),h:{}};rules.push(cur);continue}const i=line.indexOf(':');if(cur&&i>0)cur.h[line.slice(0,i).trim()]=line.slice(i+1).trim()}
 return rules}
const {restamp}=require('../tools/stamp');
// La app publicada usa la nube (const CLOUD con la dirección de Supabase). Las series la prueban sin cuentas, como
// siempre: se sirve con CLOUD vacío y la CSP recalculada. opts.cloud={url,key} la sirve apuntando a otra nube (simulada).
function withCloud(html,c){return restamp(html.replace(/const CLOUD=\{url:'[^']*',key:'[^']*'\};/,`const CLOUD={url:'${c?c.url:''}',key:'${c?c.key:''}'};`))}
const localHtml=html=>withCloud(html,null).html;
const matches=(pat,p)=>pat==='/*'||pat===p||(pat.endsWith('*')&&p.startsWith(pat.slice(0,-1)));
// opts.root: carpeta que se sirve (por defecto, el proyecto; «publicar» para probar la carpeta de publicación).
function start(opts={}){const override=opts.override||{},RT=opts.root?path.resolve(R,opts.root):R,H=readHeaders(RT),ctl={offline:false};
 // ctl.offline: el servidor corta toda conexión. Playwright no aplica setOffline a las peticiones del service
 // worker, así que para probar «sin conexión» de verdad hay que dejar también sin servidor.
 const server=http.createServer((req,res)=>{if(ctl.offline){req.socket.destroy();return}const u=new URL(req.url,'http://x'),pth=decodeURIComponent(u.pathname);
  // ?sin-cabeceras simula abrir el archivo tal cual (por ejemplo, en un visor integrado): sin las cabeceras de _headers.
  const bare=u.searchParams.has('sin-cabeceras');const rel=pth==='/'?'/index.html':pth;const f=path.join(RT,rel);
  if(!f.startsWith(RT+path.sep)){res.writeHead(404);res.end();return}
  const h={'Content-Type':TYPES[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'};if(!bare)for(const r of H)if(matches(r.pat,rel))Object.assign(h,r.h);
  const key=rel.slice(1);if(key in override){const o=typeof override[key]==='function'?override[key]():override[key];if(o.status){res.writeHead(o.status,{...h,...(o.headers||{})});res.end(o.body||'');return}/* redirección simulada (p. ej. 301 con Location) */const body=typeof o==='string'?o:o.body;if(o.headers)Object.assign(h,o.headers);res.writeHead(200,h);res.end(body);return}
  if(!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return}
  if(path.basename(f)==='isla_barra_control_mvp.html'){const r=withCloud(fs.readFileSync(f,'utf8'),opts.cloud);if(!bare)h['Content-Security-Policy']=r.csp;res.writeHead(200,h);res.end(r.html);return}
  res.writeHead(200,h);fs.createReadStream(f).pipe(res)});
 return new Promise(ok=>server.listen(opts.port||0,'127.0.0.1',()=>ok({server,base:`http://127.0.0.1:${server.address().port}/`,override,ctl})))}
module.exports={start,root:R,readHeaders,withCloud,localHtml};
