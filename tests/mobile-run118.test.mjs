import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const app=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style-v51.css',import.meta.url),'utf8');
const portrait=css.slice(css.indexOf('/* v118'));

test('ready feedback changes with touch layout, without changing desktop attack keys',()=>{
 const ctx={state:null,inRealm:p=>p?.id==='a',window:{matchMedia:()=>({matches:true})}};vm.createContext(ctx);
 vm.runInContext(app.slice(app.indexOf('function mobileRunInput'),app.indexOf('function monsterSpec')),ctx);
 assert.equal(vm.runInContext('attackReadyText()',ctx),'READY · Tap monster to attack');
 ctx.state={me:'a',players:[{id:'a'}],pvpArena:{type:'rival'}};
 assert.equal(vm.runInContext('attackReadyText()',ctx),'READY · Tap opponent to attack');
 ctx.window.matchMedia=()=>({matches:false});
 assert.equal(vm.runInContext('attackReadyText()',ctx),'HOLD ATTACK · abilities give a stronger weapon hit');
 assert.match(app,/if\(e.code==='Space'\)\{e.preventDefault\(\);attackAhead/);
});

test('portrait reserves a header, three-life health strip, full themed board and separate touch footer',()=>{
 assert.match(portrait,/orientation:portrait/);
 assert.match(portrait,/grid-template-rows:calc\(42px \+ env\(safe-area-inset-top\)\) 48px minmax\(0,1fr\)/);
 assert.match(portrait,/grid-template-rows:minmax\(0,1fr\) calc\(108px \+ env\(safe-area-inset-bottom\)\)/);
 assert.match(portrait,/background:var\(--theme-floor\) center \/ 100% 100% no-repeat/);
 assert.match(portrait,/\.run-floor-2 \{--portrait-accent/);
 assert.match(portrait,/\.run-floor-3 \{--portrait-accent/);
 assert.match(portrait,/\.exit-arch \{display:block!important/);
 assert.match(portrait,/\.run-board \.run-map/);
});

test('touch footer has direct targeting with only Ability and Dodge buttons and a readiness bar',()=>{
 assert.match(portrait,/\.combat-actions \.shoot,[\s\S]*display:none!important/);
 assert.match(portrait,/\.combat-actions button\.ability,[\s\S]*\.combat-actions button\.dodge/);
 assert.match(portrait,/\.attack-reload small \{display:block/);
 assert.match(app,/fill\.style\.width=\(100-percent\)/);
 assert.match(app,/querySelectorAll\('\[data-rival\]'\)/);
 assert.match(app,/t\.type==='player'&&t\.player\.id===rival\.dataset\.rival/);
 assert.match(app,/targetAction|attackTargetAction/);
});
