// Ejecuta las 7 series de pruebas (Chromium con Playwright) y resume el resultado.
// La app se sirve por http://127.0.0.1 (como cuando esté publicada): con file://, el localStorage de los
// contextos efímeros de Playwright se vaciaba a veces al recargar y las pruebas fallaban de forma intermitente.
const {spawn}=require('child_process'),path=require('path'),http=require('http'),fs=require('fs');
const R=path.resolve(__dirname,'..'),demo=path.join(R,'data','isla_barra_demo_bar_atlantico.json'),exp=path.join(R,'data','expected.json'),tmp=path.join(__dirname,'tmp');
const TYPES={'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript'};
// Servidor estático mínimo: solo lectura, solo 127.0.0.1 y solo archivos dentro del proyecto.
const server=http.createServer((req,res)=>{const f=path.join(R,decodeURIComponent(new URL(req.url,'http://x').pathname));if(!f.startsWith(R+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)});
const run=(file,args)=>new Promise(ok=>{const c=spawn(process.execPath,[path.join(__dirname,file),...args]);let out='';c.stdout.on('data',d=>out+=d);c.stderr.on('data',d=>out+=d);c.on('close',code=>ok({code,out}))});
server.listen(0,'127.0.0.1',async()=>{const app=`http://127.0.0.1:${server.address().port}/isla_barra_control_mvp.html`;
 const suites=[['base.test.js',[app]],['demo.test.js',[app,demo,exp,path.join(tmp,'informe_demo.pdf')]],['sales.test.js',[app,demo,exp]],['cycle.test.js',[app,demo]],['diag.test.js',[app,demo]],['ui.test.js',[app,demo]],['guide.test.js',[app,demo]]];
 let bad=0;
 for(const [f,a] of suites){const r=await run(f,a);console.log('== '+f);console.log(r.out.split('\n').filter(l=>/RESULTADO|FALLA|FAIL|Error/.test(l)).join('\n')||r.out.slice(0,500));if(r.code!==0)bad++}
 server.close();console.log(bad?`\n${bad} serie(s) con fallos`:'\nTodas las series superadas');process.exit(bad?1:0)});
