// Prepara la carpeta publicar/ con solo lo necesario para un alojamiento estático (Netlify, Cloudflare Pages…)
// y el archivo publicar.zip para arrastrarlo a Netlify Drop. No publica nada.
//   node tools/publicar.js          → crea publicar/ y publicar.zip (los archivos van en la raíz del zip)
//   node tools/publicar.js --check  → comprueba que publicar/ es idéntica a los archivos del proyecto
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const R=path.resolve(__dirname,'..'),OUT=path.join(R,'publicar'),ZIP=path.join(R,'publicar.zip');
const FILES=['index.html','isla_barra_control_mvp.html','sw.js','manifest.webmanifest','_headers',...fs.readdirSync(path.join(R,'icons')).filter(f=>f.endsWith('.png')).sort().map(f=>'icons/'+f),...fs.readdirSync(path.join(R,'fonts')).filter(f=>/\.(woff2|txt)$/.test(f)).sort().map(f=>'fonts/'+f)];
const list=d=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.join(d,e.name)).map(x=>e.name+'/'+x):[e.name]):[];

function check(){const have=list(OUT).sort(),want=[...FILES].sort(),bad=[];
 if(JSON.stringify(have)!==JSON.stringify(want))bad.push('archivos distintos: '+JSON.stringify({sobran:have.filter(f=>!want.includes(f)),faltan:want.filter(f=>!have.includes(f))}));
 for(const f of want)if(have.includes(f)&&!fs.readFileSync(path.join(R,f)).equals(fs.readFileSync(path.join(OUT,f))))bad.push(f+' no está al día');
 return bad}

// ZIP mínimo (deflate) sin dependencias; fecha fija para que el resultado no cambie si no cambian los archivos.
function zip(entries){const parts=[],cen=[];let off=0;const T=0,D=((2026-1980)<<9)|(1<<5)|1;
 for(const [name,data] of entries){const n=Buffer.from(name,'utf8'),z=zlib.deflateRawSync(data,{level:9}),crc=zlib.crc32(data);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(T,10);h.writeUInt16LE(D,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(z.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(n.length,26);h.writeUInt16LE(0,28);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(T,12);c.writeUInt16LE(D,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(z.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(0o100644<<16>>>0,38);c.writeUInt32LE(off,42);
  parts.push(h,n,z);cen.push(c,n);off+=30+n.length+z.length}
 const cd=Buffer.concat(cen),e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50,0);e.writeUInt16LE(entries.length,8);e.writeUInt16LE(entries.length,10);e.writeUInt32LE(cd.length,12);e.writeUInt32LE(off,16);
 return Buffer.concat([...parts,cd,e])}

if(process.argv.includes('--check')){const bad=check();if(bad.length){console.log('publicar/ no está al día ('+bad.join('; ')+'). Ejecuta: npm run publicar');process.exit(1)}console.log('publicar/ al día');process.exit(0)}
fs.rmSync(OUT,{recursive:true,force:true});
for(const f of FILES){fs.mkdirSync(path.dirname(path.join(OUT,f)),{recursive:true});fs.copyFileSync(path.join(R,f),path.join(OUT,f))}
fs.writeFileSync(ZIP,zip(FILES.map(f=>[f,fs.readFileSync(path.join(OUT,f))])));
const v=(fs.readFileSync(path.join(R,'isla_barra_control_mvp.html'),'utf8').match(/APP_VERSION='([^']+)'/)||[])[1];
console.log(`publicar/ (${FILES.length} archivos) y publicar.zip (${Math.round(fs.statSync(ZIP).size/1024)} KB) listos · versión ${v}`);
