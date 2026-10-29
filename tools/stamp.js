// Seguridad del alojamiento: calcula el hash SHA-256 del <script> y del <style> de la app y escribe
//  - la política CSP en una etiqueta <meta> del HTML (sirve también donde no se pueden poner cabeceras, como
//    GitHub Pages; ahí no vale frame-ancestors) y
//  - _headers (formato de Netlify y Cloudflare Pages) con la CSP completa y el resto de cabeceras.
// Hay que ejecutarlo tras cada cambio del script o del estilo: node tools/stamp.js
// node tools/stamp.js --check no escribe nada y falla si algo está desactualizado (lo usa npm test).
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.join(__dirname,'..'),HTML=path.join(ROOT,'isla_barra_control_mvp.html'),HEADERS=path.join(ROOT,'_headers');
const sha=t=>"'sha256-"+crypto.createHash('sha256').update(t,'utf8').digest('base64')+"'";
function hashes(html){const s=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)],st=[...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];
 if(s.length!==1||st.length!==1)throw new Error(`se esperaba un <script> y un <style> sin atributos (hay ${s.length} y ${st.length})`);return{script:sha(s[0][1]),style:sha(st[0][1])}}
// script-src-attr y style-src-attr 'unsafe-inline': la app usa atributos onclick/style en el HTML que genera.
// El hash impide ejecutar cualquier <script> que no sea el de la app (inyectado, externo o modificado).
function policy(h,meta){return[`default-src 'none'`,`script-src ${h.script}`,`script-src-attr 'unsafe-inline'`,`style-src ${h.style}`,`style-src-attr 'unsafe-inline'`,`img-src 'self' data: blob:`,`font-src 'self'`,`manifest-src 'self'`,`worker-src 'self'`,`connect-src 'self'`,`base-uri 'none'`,`form-action 'none'`,`object-src 'none'`,...(meta?[]:[`frame-ancestors 'none'`])].join('; ')}
function restamp(html){const h=hashes(html),tag=`<meta http-equiv="Content-Security-Policy" content="${policy(h,true)}">`;
 const out=/<meta http-equiv="Content-Security-Policy"[^>]*>/.test(html)?html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/,tag):html.replace('<meta charset="utf-8">\n','<meta charset="utf-8">\n'+tag+'\n');
 return{html:out,csp:policy(h,false)}}
function headersFile(csp){return `# Cabeceras de seguridad para el alojamiento (Netlify o Cloudflare Pages). Lo escribe tools/stamp.js: no editar a mano.
# X-Robots-Tag y <meta name="robots">: la beta no debe aparecer en buscadores; quitar ambos al lanzar.
# GitHub Pages no admite cabeceras propias: allí solo actúa la CSP del <meta> del HTML (sin frame-ancestors ni nosniff).
/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  X-Robots-Tag: noindex
/isla_barra_control_mvp.html
  Cache-Control: no-cache
/isla_barra_control_mvp
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
`}
module.exports={restamp,policy,hashes};
if(require.main===module){const html=fs.readFileSync(HTML,'utf8'),r=restamp(html),hf=headersFile(r.csp),cur=fs.existsSync(HEADERS)?fs.readFileSync(HEADERS,'utf8'):'';
 if(process.argv.includes('--check')){const bad=[];if(r.html!==html)bad.push('la CSP del <meta> del HTML');if(hf!==cur)bad.push('_headers');if(bad.length){console.log('Desactualizado: '+bad.join(' y ')+'. Ejecuta: node tools/stamp.js');process.exit(1)}console.log('CSP al día');}
 else{fs.writeFileSync(HTML,r.html);fs.writeFileSync(HEADERS,hf);console.log('CSP escrita en el HTML y en _headers')}}
