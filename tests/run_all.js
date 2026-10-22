// Ejecuta las series de pruebas (Playwright; navegador con BROWSER=chromium|firefox|webkit) y resume el resultado.
// La app se sirve por http://127.0.0.1 (como cuando esté publicada): con file://, el localStorage de los
// contextos efímeros de Playwright se vaciaba a veces al recargar y las pruebas fallaban de forma intermitente.
const {spawn}=require('child_process'),path=require('path'),http=require('http'),fs=require('fs');
const R=path.resolve(__dirname,'..'),demo=path.join(R,'data','isla_barra_demo_bar_atlantico.json'),exp=path.join(R,'data','expected.json'),tmp=path.join(__dirname,'tmp');
const run=(file,args)=>new Promise(ok=>{const c=spawn(process.execPath,[path.join(__dirname,file),...args]);let out='';c.stdout.on('data',d=>out+=d);c.stderr.on('data',d=>out+=d);c.on('close',code=>ok({code,out}))});
require('./server').start().then(async({server,base})=>{const app=base+'isla_barra_control_mvp.html';
 const suites=[['base.test.js',[app]],['demo.test.js',[app,demo,exp,path.join(tmp,'informe_demo.pdf')]],['sales.test.js',[app,demo,exp]],['cycle.test.js',[app,demo]],['diag.test.js',[app,demo]],['ui.test.js',[app,demo]],['guide.test.js',[app,demo]],['bar.test.js',[app,demo]],['bib.test.js',[app,demo]],['pwa.test.js',[]],['data.test.js',[app,demo]],['about.test.js',[app]],['sec.test.js',[app,demo]]];
 let bad=0;
 for(const [f,a] of suites){const r=await run(f,a);console.log('== '+f);console.log(r.out.split('\n').filter(l=>/RESULTADO|FALLA|FAIL|Error/.test(l)).join('\n')||r.out.slice(0,500));if(r.code!==0)bad++}
 server.close();console.log(bad?`\n${bad} serie(s) con fallos`:'\nTodas las series superadas');process.exit(bad?1:0)});
