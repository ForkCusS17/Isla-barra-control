// Ejecuta las series de pruebas (Playwright; navegador con BROWSER=chromium|firefox|webkit) y resume el resultado.
// La app se sirve por http://127.0.0.1 (como cuando esté publicada): con file://, el localStorage de los
// contextos efímeros de Playwright se vaciaba a veces al recargar y las pruebas fallaban de forma intermitente.
const {spawn}=require('child_process'),path=require('path'),http=require('http'),fs=require('fs');
const R=path.resolve(__dirname,'..'),demo=path.join(R,'data','isla_barra_demo_bar_atlantico.json'),exp=path.join(R,'data','expected.json'),tmp=path.join(__dirname,'tmp');
// Cada serie tiene un tiempo máximo (SUITE_TIMEOUT_MS, 8 min por defecto): si se cuelga se corta y se muestran
// sus últimas líneas, para saber dónde se quedó.
const LIMIT=+process.env.SUITE_TIMEOUT_MS||480000;
const show=(f,r)=>{console.log('== '+f+(r.timedOut?' (tiempo agotado: se corta)':''));console.log(r.timedOut?r.out.slice(-1500):(r.out.split('\n').filter(l=>/RESULTADO|FALLA|FAIL|Error|AVISO/.test(l)).join('\n')||r.out.slice(-800)||'(sin salida)'));if(r.code!==0){const prog=r.out.split('\n').filter(l=>l.startsWith('· '));if(prog.length)console.log('Últimos pasos: '+prog.slice(-4).join(' | '))}};
const run=(file,args)=>new Promise(ok=>{const c=spawn(process.execPath,[path.join(__dirname,file),...args]);let out='',timedOut=false;const t=setTimeout(()=>{timedOut=true;out+='\nFAIL tiempo agotado tras '+Math.round(LIMIT/1000)+' s';c.kill('SIGKILL')},LIMIT);c.stdout.on('data',d=>out+=d);c.stderr.on('data',d=>out+=d);c.on('close',code=>{clearTimeout(t);ok({code:timedOut?1:code,out,timedOut})})});
require('./server').start().then(async({server,base})=>{const app=base+'isla_barra_control_mvp.html';
 const suites=[['base.test.js',[app]],['demo.test.js',[app,demo,exp,path.join(tmp,'informe_demo.pdf')]],['sales.test.js',[app,demo,exp]],['cycle.test.js',[app,demo]],['diag.test.js',[app,demo]],['ui.test.js',[app,demo]],['guide.test.js',[app,demo]],['bar.test.js',[app,demo]],['bib.test.js',[app,demo]],['pwa.test.js',[]],['data.test.js',[app,demo]],['about.test.js',[app]],['sec.test.js',[app,demo]],['a11y.test.js',[app]],['perf.test.js',[app]]];
 // --parallel: varias series a la vez (JOBS, por defecto 4); cada una se muestra al terminar y al final un resumen.
 const par=process.argv.includes('--parallel'),jobs=par?Math.max(1,+process.env.JOBS||4):1,results=new Array(suites.length);let next=0,bad=0;
 console.log('Navegador: '+(process.env.BROWSER||'chromium')+(par?` · ${jobs} series a la vez`:''));
 await Promise.all(Array.from({length:jobs},async()=>{while(next<suites.length){const i=next++;results[i]=await run(...suites[i]);if(par)show(suites[i][0],results[i])}}));
 // RETRY_FAILED=1: las series que fallan se repiten una vez, de una en una (Firefox y WebKit dan a veces tiempos
 // de carga irregulares en el ejecutor). El resumen dice cuáles pasaron solo al repetir.
 const again=new Set();if(process.env.RETRY_FAILED==='1')for(let i=0;i<suites.length;i++)if(results[i].code!==0){const r=await run(...suites[i]);console.log('== repetición de '+suites[i][0]);show(suites[i][0],r);if(r.code===0){again.add(i);results[i]=r}}
 if(par||again.size)console.log('\n── Resumen ──');
 suites.forEach(([f],i)=>{const r=results[i];if(par||again.size)console.log((r.code===0?'OK    ':'FALLA ')+f+(again.has(i)?' (pasó al repetir)':''));else show(f,r);if(r.code!==0)bad++});
 server.close();console.log(bad?`\n${bad} serie(s) con fallos`:'\nTodas las series superadas');process.exit(bad?1:0)});
