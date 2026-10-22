// Servidor estático mínimo para las pruebas: solo lectura, solo 127.0.0.1 y solo archivos dentro del proyecto.
// Aplica las cabeceras de _headers (como el alojamiento) y permite cambiar archivos al vuelo (override) para
// simular una versión nueva sin tocar el disco.
const http=require('http'),path=require('path'),fs=require('fs');
const R=path.resolve(__dirname,'..');
const TYPES={'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.css':'text/css'};
// _headers (formato de Netlify y Cloudflare Pages): una ruta sin sangría y debajo, con sangría, «Cabecera: valor».
function readHeaders(){const f=path.join(R,'_headers');if(!fs.existsSync(f))return[];const rules=[];let cur=null;
 for(const line of fs.readFileSync(f,'utf8').split('\n')){if(!line.trim()||line.trim().startsWith('#'))continue;if(!/^\s/.test(line)){cur={pat:line.trim(),h:{}};rules.push(cur);continue}const i=line.indexOf(':');if(cur&&i>0)cur.h[line.slice(0,i).trim()]=line.slice(i+1).trim()}
 return rules}
const matches=(pat,p)=>pat==='/*'||pat===p||(pat.endsWith('*')&&p.startsWith(pat.slice(0,-1)));
function start(opts={}){const override=opts.override||{};const rules=readHeaders();
 const server=http.createServer((req,res)=>{const pth=decodeURIComponent(new URL(req.url,'http://x').pathname);const rel=pth==='/'?'/index.html':pth;const f=path.join(R,rel);
  if(!f.startsWith(R+path.sep)){res.writeHead(404);res.end();return}
  const h={'Content-Type':TYPES[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'};for(const r of rules)if(matches(r.pat,rel))Object.assign(h,r.h);
  const key=rel.slice(1);if(key in override){const body=typeof override[key]==='function'?override[key]():override[key];res.writeHead(200,h);res.end(body);return}
  if(!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return}
  res.writeHead(200,h);fs.createReadStream(f).pipe(res)});
 return new Promise(ok=>server.listen(opts.port||0,'127.0.0.1',()=>ok({server,base:`http://127.0.0.1:${server.address().port}/`,override})))}
module.exports={start,root:R,readHeaders};
