// Iconos de la app (marca Isla & Barra): azul atlántico, monograma «I&B» en crema y una ola en arena.
// Escribe icons/*.png con Chromium (Playwright). Ejecutar: node tools/make_icons.js
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
const OUT=path.join(__dirname,'..','icons');fs.mkdirSync(OUT,{recursive:true});
// safe: fracción del lado donde cabe el dibujo (los iconos «maskable» se recortan en círculo: zona segura del 80 %).
const svg=(size,safe,round)=>{const s=size*safe,o=(size-s)/2;return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" rx="${round?size*0.22:0}" fill="#0E4A5A"/>
<text x="${size/2}" y="${o+s*0.6}" text-anchor="middle" font-family="Georgia, 'DejaVu Serif', serif" font-weight="700" font-size="${s*0.42}" fill="#F6F1E8">I&amp;B</text>
<path d="M ${o+s*0.16} ${o+s*0.76} q ${s*0.085} ${-s*0.07} ${s*0.17} 0 t ${s*0.17} 0 t ${s*0.17} 0 t ${s*0.17} 0" fill="none" stroke="#D9B382" stroke-width="${s*0.045}" stroke-linecap="round"/>
</svg>`};
const ICONS=[['icon-192.png',192,0.86,true],['icon-512.png',512,0.86,true],['maskable-512.png',512,0.72,false],['apple-touch-icon.png',180,0.8,false],['favicon-32.png',32,1,true]];
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 for(const [f,size,safe,round] of ICONS){await p.setViewportSize({width:size,height:size});await p.setContent(`<html><body style="margin:0;background:transparent">${svg(size,safe,round)}</body></html>`);await p.screenshot({path:path.join(OUT,f),omitBackground:true,clip:{x:0,y:0,width:size,height:size}});console.log(f,size)}
 await b.close()})();
