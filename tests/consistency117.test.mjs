import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const app=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style-v51.css',import.meta.url),'utf8');
const engine=await readFile(new URL('../worker/game.js',import.meta.url),'utf8');

test('all 48 isolated equipped hero poses have valid nonempty transparent WebP data',async()=>{
 for(const hero of ['fox','witch','golem','wisp','goblin','tinker'])for(const weapon of ['sword','arrow','sandal','spear','wand','hammer','dagger','crossbow']){
  const image=await readFile(new URL(`../public/assets/equipment-v63/${hero}-${weapon}.webp`,import.meta.url));
  assert.ok(image.length>1000,`${hero}-${weapon} must have image data`);
  assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');
 }
 assert.match(css,/\.avatar-chip\.reference-equipped\{overflow:hidden/);
 assert.match(css,/\.reference-hero\{width:100%;height:100%;object-fit:contain/);
});

test('the runner camera follows the current player while the Realm keeps its duel framing',()=>{
 assert.match(app,/function runCamera\(focus,size,floor\)/);
 assert.match(app,/!arena\?runCamera\(focus,size,state.floor\)/);
 assert.match(css,/--follow-zoom/);
 assert.match(css,/\.topdown-raid:not\(\.realm-active\) \.run-board\{overflow:hidden!important/);
});

test('desktop keys and touch actions stay consistent in the maze and both Realm modes',()=>{
 assert.match(app,/if\(key==='q'\)\{e.preventDefault\(\);send\(\{type:'dodge'\}\)/);
 assert.match(app,/if\(key==='e'\)\{e.preventDefault\(\);send\(\{type:'ability'\}\)/);
 assert.match(app,/if\(e.code==='Space'\)\{e.preventDefault\(\);attackAhead/);
 assert.match(app,/if\(e.target.closest\('\[data-dodge\]'\)\)\{send\(\{type:'dodge'\}\)/);
 assert.match(app,/const stick=e.target.closest\('\[data-joystick\]'\)/);
 assert.match(app,/data-fp-attack/);
 assert.ok(!app.includes("e.code==='Space'&&state.floor<=3&&inRealm(me)"));
});

test('all six creatures use live animation classes with attack timestamps tied to damage',()=>{
 for(const state of ['idle','move','windup','attack','hurt','death'])assert.match(css,new RegExp(`creature-${state==='idle'?'breathe':state==='move'?'stride':state==='windup'?'windup':state==='attack'?'strike':state}`));
 assert.match(engine,/ai\.attackAt=now;if\(canAttack\)/);
 assert.match(engine,/m\.attackAt=now;r\.message=monsterAttack/);
 assert.match(app,/monsterProjectiles\|\|\[\]/);
});
