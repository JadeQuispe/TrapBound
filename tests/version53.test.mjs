import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style-v51.css',import.meta.url),'utf8');

test('mobile Build places the dungeon in the flexible first row and tool tray at the bottom',()=>{
  assert.match(css,/\.build-layout\{height:100%;min-height:0;grid-template-columns:minmax\(0,1fr\);grid-template-rows:minmax\(0,1fr\) calc\(50px \+ env\(safe-area-inset-bottom\)\);/);
  assert.match(css,/\.build-board\{order:0;min-height:0;min-width:0;grid-row:1;grid-column:1/);
  assert.match(css,/\.build-tools\{order:1;grid-row:2;grid-column:1/);
  assert.match(css,/\.build-board \.maze\{width:min\(100%,calc\(var\(--tb-vh,100dvh\) - 96px\)\)!important/);
});

test('Run Attack button finds a valid target and visible monster taps target that exact monster',()=>{
  assert.match(client,/hasAttack=attackTargets\(me,1-me\.team\)\.length>0/);
  assert.match(client,/data-fp-attack \$\{canAct&&\(hasAttack\|\|me\.character==='wisp'\|\|arena&&state\.floor<=3\)\?/);
  assert.match(client,/querySelectorAll\('\[data-monster\]'\)[\s\S]*attackTargets\(player,1-player\.team\)\.find\(t=>t\.type==='monster'&&t\.x===x&&t\.y===y\)/);
  assert.match(client,/OUT OF RANGE · Move closer or clear a line of sight/);
  assert.match(client,/function attackTargetAction[\s\S]*type:'shoot',cell:\[target\.x,target\.y\],facing:target\.facing/);
  assert.match(client,/if\(attack\)attack\.disabled=me\.escaped\|\|me\.eliminated\|\|state\.announcement\?\.until>Date\.now\(\)\|\|attackTargets\(me,1-me\.team\)\.length===0/);
});

test('targeted attacks find a facing and reject a wall-blocked line',()=>{
  const directions=[[0,-1],[1,0],[0,1],[-1,0]];
  const context={DIRECTIONS:directions,WEAPONS:{arrow:{range:3}},inRealm:()=>false,facingOf:p=>p.facing,state:{phase:'run',mazes:[{}, {'1,4':'monster'}],players:[]}};
  vm.createContext(context);
  vm.runInContext(client.slice(client.indexOf('function attackGeometry'),client.indexOf('function firstPersonView')),context);
  const aim=vm.runInContext("attackGeometry({x:3,y:3,facing:0,weapon:'arrow'},1,4,1)",context);
  assert.equal(aim.facing,3);
  assert.equal(aim.distance,2);
  context.state.mazes[1]['2,4']='wall';
  assert.equal(vm.runInContext("attackGeometry({x:3,y:3,facing:0,weapon:'arrow'},1,4,1)",context),null);
});

test('landscape Run gives the square dungeon the full available stage height',()=>{
  assert.match(css,/\.topdown-raid\{grid-template-rows:calc\(29px \+ env\(safe-area-inset-top\)\) 34px minmax\(0,1fr\)\}/);
  assert.match(css,/\.run-board \.maze\{width:min\(100%,calc\(var\(--tb-vh,100dvh\) - 117px\)\)!important;height:min\(100%,calc\(var\(--tb-vh,100dvh\) - 117px\)\)!important/);
  assert.match(client,/stick\.setPointerCapture\(e\.pointerId\)/);
});

test('compact landscape keeps a readable horizontal dungeon and reserves left/right touch controls',()=>{
  assert.match(css,/v68: compact landscape run layout/);
  assert.match(css,/--cam-zoom:1\.04!important;width:min\(94%,calc\(var\(--tb-vh,100dvh\) - 150px\)\)!important;height:min\(94%,calc\(var\(--tb-vh,100dvh\) - 150px\)\)!important/);
  assert.match(css,/\.run-controls\{height:calc\(49px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css,/\.touch-joystick\{width:44px;height:44px;flex-basis:44px\}/);
  assert.match(css,/\.combat-actions\{max-width:min\(42vw,360px\);flex-basis:42vw/);
  assert.match(css,/\.run-map\{top:max\(3px,env\(safe-area-inset-top\)\);right:max\(3px,env\(safe-area-inset-right\)\);width:42px/);
  assert.match(css,/\.team-pings button\{min-height:23px;padding:1px 5px;font-size:9px\}/);
  assert.match(client,/addEventListener\('orientationchange',refreshViewport/);
  assert.match(client,/window\.visualViewport\?\.addEventListener\('resize',refreshViewport/);
  assert.match(client,/function setViewportUnit\(\)\{const h=window\.visualViewport\?\.height\|\|window\.innerHeight/);
});

test('static rules close is local and records no tutorial suppression',()=>{
  const session=new Map(),sessionStorage={setItem:(k,v)=>session.set(k,v),getItem:k=>session.get(k)||null};
  const closes=[{}],opens=[{}],app={querySelectorAll:()=>closes};
  const ctx={sessionStorage,app,document:{querySelectorAll:()=>opens,addEventListener(){}},state:{phase:'lobby',code:'ROOM1',me:'a'},render(){ctx.renders=(ctx.renders||0)+1}};
  vm.createContext(ctx);
  vm.runInContext(client.slice(client.indexOf('let howReturnFocus='),client.indexOf('function entryDialog')),ctx);
  vm.runInContext('wireHow()',ctx);
  closes[0].onclick();
  assert.equal(session.size,0);assert.equal(ctx.renders,1);
  assert.doesNotMatch(client,/data-how-never|Don't show again|trapboundHowSeen/);
});
