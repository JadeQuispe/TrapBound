import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style.css',import.meta.url),'utf8');
const activeCss=await readFile(new URL('../public/style-v51.css',import.meta.url),'utf8');
const pressurePlate=await readFile(new URL('../public/assets/traps/rune-spike-pressure-plate.png',import.meta.url));
function renderer(kind='wall'){
 const state={me:'a',phase:'build',floor:1,pieces:14,players:[{id:'a',team:0,x:0,y:0,name:'Jade',character:'witch',weapon:'wand'}],mazes:[{},{}],monsterHp:[{},{}],monsterTypes:[{},{}],trapTypes:[{},{}],decor:[{},{}]};
 const sandbox={state,buildTool:kind,window:{innerWidth:1280,innerHeight:800},spectateFocus:p=>p,frontTarget:()=>null,inRealm:()=>false,floorTheme:()=>({roster:['ember-imp']}),monsterSpec:()=>({hp:105,name:'Gobbler'}),monsterSprite:()=>'<span class="monster-sprite"></span>',monsterMotion:()=> 'idle'};vm.createContext(sandbox);
 vm.runInContext(client.slice(0,client.indexOf('const MONSTERS='))+client.slice(client.indexOf('const DIRECTIONS='),client.indexOf('function relativeCell'))+client.slice(client.indexOf('function loadoutEditor'),client.indexOf('function lobbyLore')),sandbox);
 // The declarations above initialize state/buildTool; supply fixtures after evaluation.
 sandbox.fixture=state;vm.runInContext(`state=fixture;buildTool='${kind}'`,sandbox);
 return {state,sandbox,render:()=>vm.runInContext('board(0,true)',sandbox),valid:(x,y,k)=>vm.runInContext(`placementAllowed(state.mazes[0],${x},${y},'${k}',0)`,sandbox)};
}
test('all sixteen wall connection combinations are derived from unchanged collision cells',()=>{const r=renderer();for(let mask=0;mask<16;mask++){let cells={'3,3':'wall'};[[3,2,'n'],[4,3,'e'],[3,4,'s'],[2,3,'w']].forEach(([x,y],i)=>{if(mask&(1<<i))cells[`${x},${y}`]='wall'});r.sandbox.cells=cells;let result=vm.runInContext('wallConnections(cells,3,3)',r.sandbox);assert.equal(result.split(' ').filter(Boolean).length,mask.toString(2).replaceAll('0','').length);assert.equal(cells['3,3'],'wall');}});
test('build validation mirrors hazard spacing, entrance protection and exit reachability',()=>{let r=renderer();assert.equal(r.valid(0,0,'wall'),false);assert.equal(r.valid(1,1,'monster'),false);r.state.mazes[0]['3,3']='monster';assert.equal(r.valid(4,4,'portal'),false);assert.equal(r.valid(5,3,'trap'),true);r.state.mazes[0]['1,0']='wall';assert.equal(r.valid(0,1,'wall'),false);assert.equal(r.valid(2,4,'decor'),false);});
test('dungeon renders heroes during build, connected walls, portal energy, exit door and no debug labels',()=>{let r=renderer();r.state.mazes[0]={'2,2':'wall','3,2':'wall','4,4':'trap','5,2':'monster'};r.state.trapTypes[0]['4,4']='rift';r.state.monsterHp[0]['5,2']=105;let html=r.render();for(const marker of ['dungeon-field','join-e','join-w','dungeon-portal','start-tile','exit-tile','reference-scene','dungeon-runner','avatar-sprite'])assert.ok(html.includes(marker),marker);for(const debug of ['IDLE','CHASE','UNKNOWN','ai-state','avatar-wearable'])assert.ok(!html.includes(debug));assert.equal((html.match(/data-cell=/g)||[]).length,49);});
test('responsive sprite rules retain character bodies and size floor actors relative to their cell',()=>{assert.ok(!css.includes('.hero-portrait>span{display:none}'));assert.ok(!css.includes('.character-carousel button span:last-child{display:none}'));assert.ok(css.includes('.hero-portrait>.avatar-chip{display:inline-block!important'));assert.ok(css.includes('.dungeon-field .tile-runners .avatar-chip'));assert.ok(css.includes('width:100%!important;height:100%!important'));assert.ok(css.includes('(orientation:landscape)'));assert.ok(css.includes('grid-template-columns:repeat(6,minmax(0,1fr))'));});

test('desktop Build uses the matching 7x7 scene art while Build and Run keep one logical START/EXIT',()=>{let r=renderer();for(const [floor,name,scene,grid] of [[1,'volcanic-ruins','volcanic','--grid-left:28.91%;--grid-top:10.77%;--grid-width:51.14%;--grid-height:73.44%'],[2,'crystal-cavern','crystal','--grid-left:26.04%;--grid-top:9.45%;--grid-width:58.07%;--grid-height:78.35%'],[3,'overgrown-temple','overgrown','--grid-left:26.97%;--grid-top:9.69%;--grid-width:56.72%;--grid-height:77.75%']]){r.state.floor=floor;let build=r.render(),run=vm.runInContext('board(0,false)',r.sandbox);assert.ok(build.includes(`--build-scene:url('/assets/build-scenes/${scene}-7x7.webp')`),name+' scene');assert.ok(build.includes(grid),name+' aligned 7x7 overlay');assert.ok(build.includes('reference-scene'),name+' desktop scene class');assert.ok(run.includes(`--theme-floor:url('/assets/floors/${name}.webp')`),name+' run floor');assert.equal((build.match(/class=\"tile /g)||[]).length,49);assert.equal((run.match(/class=\"tile /g)||[]).length,49);assert.equal((build.match(/exit-tile/g)||[]).length,1);assert.equal((build.match(/start-tile/g)||[]).length,1);assert.ok(!build.includes('dungeon-torch'))}assert.ok(activeCss.includes('Version 92 · desktop Build'));});

test('the visible 7x7 tiles remain playable except protected spawn and exit clearances',()=>{
 const r=renderer();
 for(const floor of [1,2,3]){
  r.state.floor=floor;r.state.mazeSize=7;r.state.pieces=34;
  assert.equal(r.valid(1,1,'wall'),false,`theme ${floor} protected start`);
  assert.equal(r.valid(5,5,'portal'),false,`theme ${floor} protected exit`);
  assert.equal(r.valid(3,0,'wall'),true,`theme ${floor} top-row floor tile`);
  assert.equal(r.valid(3,6,'trap'),true,`theme ${floor} bottom-row floor tile`);
  assert.equal(r.valid(3,3,'wall'),true,`theme ${floor} central floor`);
  assert.doesNotMatch(r.render(),/unplaceable-cell/);
  assert.doesNotMatch(vm.runInContext('minimap(0,false)',r.sandbox),/map-border/);
 }
 assert.ok(css.includes('.tile.invalid-drop:hover:after'),'invalid cells show a red no-placement mark');
 for(const tile of ['volcanic-wall-tile','crystal-wall-tile','overgrown-wall-tile'])assert.ok(css.includes(`/assets/walls/${tile}.webp`),tile);
 assert.ok(activeCss.includes('width:76%!important;height:68%!important'),'wall sprite is contained within one grid cell');
});

test('all six live monsters render timed idle, chase, wind-up, strike, hurt and defeat motions',()=>{
 const r=renderer(),now=Date.now(),ids=[['magma-golem',1],['ember-imp',1],['crystal-slime',2],['crystal-wraith',2],['mushroom-brute',3],['leaf-sprite',3]];
 r.sandbox.Date=class extends Date{static now(){return now}};
 vm.runInContext(client.slice(client.indexOf('function monsterMotion'),client.indexOf('function monsterSprite')),r.sandbox);
 r.sandbox.monsterSprite=(id)=>`<span class="monster-sprite"><img src="/assets/monsters/${id}.webp"></span>`;
 for(const [id,floor] of ids){
  r.state.phase='run';r.state.floor=floor;r.state.mazes[0]={'4,4':'monster'};r.state.monsterTypes[0]={'4,4':id};r.state.monsterHp[0]={'4,4':100};
  const check=(ai,motion)=>{r.state.monsterAI=[{'4,4':ai},{}];const html=vm.runInContext('board(0,false)',r.sandbox);assert.match(html,new RegExp(`monster-anim-${motion}`),`${id} ${motion}`);assert.ok(html.includes(`/assets/monsters/${id}.webp`));};
  check({state:'idle'},'idle');check({state:'chase',movedAt:now},'move');check({state:'windup',windupAt:now},'windup');check({state:'attack',attackAt:now},'attack');check({state:'chase',hitAt:now},'hurt');
  r.state.mazes[0]={};r.state.defeatedMonsters=[{x:4,y:4,id,mazeTeam:0,at:now}];assert.match(vm.runInContext('board(0,false)',r.sandbox),/monster-anim-death/);r.state.defeatedMonsters=[];
 }
 for(const state of ['move','windup','attack','hurt'])assert.ok(activeCss.includes(`monster-anim-${state}`),state);
 assert.match(activeCss,/@keyframes creature-death/);
 assert.match(activeCss,/@keyframes creature-projectile/);
});
test('a revealed spike plate springs above the runner while a wall still occupies one logical cell',()=>{
 const r=renderer();r.state.phase='run';r.state.mazes[0]['3,3']='trap';r.state.trapTypes[0]['3,3']='spikes';r.state.revealedTraps=[{'3,3':Date.now()},{}];
 const html=vm.runInContext('board(0,false)',r.sandbox);
 assert.match(html,/effect-trap trap-spikes[^"\n]*trap-triggered/);
 assert.match(html,/class="spike-plate"/);
 assert.match(html,/class="spring-spikes"/);
 assert.equal(pressurePlate.toString('hex',0,8),'89504e470d0a1a0a');
 assert.match(activeCss,/\.trap-triggered\.trap-spikes \.spring-spikes\{animation:spikes-spring/);
 assert.match(activeCss,/>\.tile\.wall:before[\s\S]*?width:72%!important;height:58%!important/);
 r.state.mazes[0]={'3,3':'wall'};assert.equal((vm.runInContext('board(0,false)',r.sandbox).match(/aria-label="Stone wall · 4, 4"/g)||[]).length,1);
});
test('desktop Build styling uses the live reference plate without relying on a fine pointer',()=>{
 assert.ok(activeCss.includes('@media (min-width:1000px){'),'desktop viewport rules apply on hybrid/touch browsers');
 assert.ok(activeCss.includes('.build-title img{display:block;max-width:100%;max-height:54px'),'title is constrained in the build header');
 assert.ok(activeCss.includes('background-image:var(--build-scene)!important'),'the reference plate is the single desktop Build background');
});

test('Run surfaces and lights preserve all 49 cells, wall adjacency, actors and START/EXIT in every theme',()=>{
 const r=renderer();r.state.phase='run';r.state.mazes[0]={'2,2':'wall','3,2':'wall','4,4':'trap'};r.state.trapTypes[0]={'4,4':'rift'};
 for(const floor of [1,2,3]){
  r.state.floor=floor;const before=JSON.stringify(r.state),html=vm.runInContext('board(0,false)',r.sandbox);
  assert.match(html,/world-interior/);assert.match(html,/world-light/);assert.match(html,/dungeon-air/);
  assert.equal((html.match(/class="tile /g)||[]).length,49);
  assert.equal((html.match(/class="floor-detail"/g)||[]).length,49);
  assert.equal((html.match(/start-tile/g)||[]).length,1);assert.equal((html.match(/exit-tile/g)||[]).length,1);
  assert.match(html,/join-e/);assert.match(html,/join-w/);assert.match(html,/dungeon-portal/);
  assert.ok((html.match(/class="dungeon-torch"/g)||[]).length<=8);
  assert.equal(JSON.stringify(r.state),before,'environment rendering cannot mutate match state');
 }
 r.state.phase='build';assert.ok(!r.render().includes('world-interior'));
});
