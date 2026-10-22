// Navegador de las pruebas: BROWSER=chromium (por defecto), firefox o webkit.
// Firefox no admite isMobile: se quita de los perfiles de dispositivo (el resto de la emulación se mantiene).
const pw=require('playwright');const NAME=process.env.BROWSER||'chromium';
if(!['chromium','firefox','webkit'].includes(NAME))throw new Error('BROWSER desconocido: '+NAME);
const adapt=d=>{const x={...d};delete x.defaultBrowserType;if(NAME==='firefox')delete x.isMobile;return x};
const devices=new Proxy(pw.devices,{get:(t,k)=>t[k]&&adapt(t[k])});
module.exports={chromium:{launch:o=>pw[NAME].launch(o)},devices,NAME};
