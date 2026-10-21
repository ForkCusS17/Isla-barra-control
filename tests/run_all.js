// Ejecuta las 4 series de pruebas (Chromium con Playwright) y resume el resultado.
const {spawnSync}=require('child_process'),path=require('path');
const R=path.resolve(__dirname,'..'),app=path.join(R,'isla_barra_control_mvp.html'),demo=path.join(R,'data','isla_barra_demo_bar_atlantico.json'),exp=path.join(R,'data','expected.json'),tmp=path.join(__dirname,'tmp');
const suites=[['base.test.js',[app]],['demo.test.js',[app,demo,exp,path.join(tmp,'informe_demo.pdf')]],['sales.test.js',[app,demo,exp]],['cycle.test.js',[app,demo]]];
let bad=0;
for(const [f,a] of suites){const r=spawnSync(process.execPath,[path.join(__dirname,f),...a],{encoding:'utf8'});const out=(r.stdout||'')+(r.stderr||'');console.log('== '+f);console.log(out.split('\n').filter(l=>/RESULTADO|FALLA|FAIL|Error/.test(l)).join('\n')||out.slice(0,500));if(r.status!==0)bad++}
console.log(bad?`\n${bad} serie(s) con fallos`:'\nTodas las series superadas');process.exit(bad?1:0);
