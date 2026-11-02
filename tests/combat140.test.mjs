import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,lobbyState,playerView,availableWeapons,spectatorTargets,combatScene} from '../worker/game.js';
import {readyAndStart} from './start-fixture.mjs';
let now=1800000000000;Date.now=()=>now;
function lobby(){const g=createGame(lobbyState('REALM40','a','Amber'));g.act('b',{type:'join',name:'Violet'});return g}
function run(){const g=lobby();readyAndStart(g);g.act('a',{type:'finishBuild'});g.act('b',{type:'finishBuild'});const s=g.snapshot();s.modAt=null;s.nextMonsterStep=now+60000;s.deadline=now+120000;for(const cells of s.mazes)for(const k of Object.keys(cells))cells[k]='';return s}
test('both duel clients and a permitted spectator receive the same confirmed enemy attack',()=>{
 const s=run();Object.assign(s.players[0],{x:1,y:3,facing:1});Object.assign(s.players[1],{x:3,y:3});
 s.players.push({...s.players[0],id:'c',name:'Spectator',escaped:true,spectating:'a'});
 s.pvpArena={id:'fight-1',type:'rival',participants:['a','b'],until:now+45000};s.arenaMaze={};
 const g=createGame(s);g.act('a',{type:'shoot',target:'b'});
 for(const id of ['a','b','c']){const events=playerView(g.snapshot(),id).combatEvents;assert.equal(events.length,1);assert.equal(events[0].attacker,'a');assert.equal(events[0].damage,15);assert.equal(events[0].fromX,1);assert.equal(events[0].x,3);assert.equal(events[0].realm,'fight-1')}
 const outside=g.snapshot();outside.players.push({...outside.players[0],id:'d',escaped:false,spectating:null});
 assert.equal(playerView(outside,'d').combatEvents.length,0);
});
test('finished teams automatically watch opponents, use their maze projection and retarget safely',()=>{
 const s=run();s.players[0].escaped=true;Object.assign(s.players[1],{x:3,y:2});s.mazes[0]['3,3']='monster';s.monsterTypes[0]['3,3']='magma-golem';s.monsterHp[0]['3,3']=150;s.mazes[0]['6,6']='monster';
 let g=createGame(s);assert.equal(g.snapshot().players[0].spectating,'b');const view=playerView(g.snapshot(),'a');assert.equal(view.mazes[0]['3,3'],'monster');assert.equal(view.mazes[0]['6,6'],'');
 g.act('a',{type:'spectate',target:'b'});
 const next=g.snapshot();next.players.push({...next.players[1],id:'c',name:'Other opponent'});next.players[1].escaped=true;g=createGame(next);assert.equal(g.snapshot().players[0].spectating,'c');
 const waiting=run();waiting.players.push({...waiting.players[0],id:'c',eliminated:true,hearts:1,respawnAt:now+5000});waiting.players[0].escaped=true;
 assert.deepEqual(spectatorTargets(waiting.players,waiting.players[0]),[]);
});
test('portals last 55 seconds, close for both clients and discard actions from a previous scene',()=>{
 const s=run();Object.assign(s.players[0],{x:2,y:2});s.mazes[1]['3,2']='trap';s.trapTypes[1]['3,2']='rift';s.deadline=now+5000;
 const g=createGame(s),oldScene=combatScene(s,s.players[0]),random=Math.random;Math.random=()=>.1;
 try{g.act('a',{type:'move',dir:[1,0],scene:oldScene})}finally{Math.random=random}
 const entered=g.snapshot();assert.equal(entered.pvpArena.until-now,55000);assert.ok(entered.deadline>=now+65000);
 for(const id of ['a','b'])assert.equal(playerView(entered,id).mazes[1]['3,2'],'');
 const position=[entered.players[0].x,entered.players[0].y];g.act('a',{type:'move',dir:[0,1],scene:oldScene});assert.deepEqual([g.snapshot().players[0].x,g.snapshot().players[0].y],position);
 const returned=g.snapshot(),oldRealm=combatScene(returned,returned.players[0]);returned.pvpArena=null;returned.arenaMaze=null;delete returned.players[0].arenaReturn;
 const resumed=createGame(returned);resumed.act('a',{type:'move',dir:[0,1],scene:oldRealm});assert.deepEqual([resumed.snapshot().players[0].x,resumed.snapshot().players[0].y],position);
});
test('ranged realm monsters attack nearby players without retreating on every update',()=>{
 const s=run();Object.assign(s.players[0],{x:2,y:3});s.pvpArena={id:'close-fight',type:'monster',participants:['a'],until:now+45000,monster:{id:'ember-imp',x:3,y:3,hp:105,maxHp:105,lastAttack:0,lastMove:0}};s.arenaMaze={};
 const g=createGame(s);g.heartbeat('a');now+=700;g.heartbeat('a');assert.deepEqual([g.snapshot().pvpArena.monster.x,g.snapshot().pvpArena.monster.y],[3,3]);assert.ok(g.snapshot().monsterProjectiles.some(e=>e.realm));now+=450;g.heartbeat('a');assert.equal(g.snapshot().players[0].hp,107);
});
test('every hero has a restricted supported arsenal; invalid weapons cannot be equipped',()=>{
 const expected={fox:['arrow','crossbow'],witch:['wand','potion'],golem:['hammer','greatsword'],wisp:['dagger','shuriken'],goblin:['spear','sandal'],tinker:['crossbow','bomb']};
 for(const [character,weapons] of Object.entries(expected)){
  assert.deepEqual(availableWeapons(character),weapons);const g=lobby();g.act('a',{type:'loadout',character});assert.ok(weapons.includes(g.snapshot().players[0].weapon));
  for(const weapon of weapons){g.act('a',{type:'loadout',weapon});assert.equal(g.snapshot().players[0].weapon,weapon)}
  const invalid=Object.values(expected).flat().find(w=>!weapons.includes(w));assert.throws(()=>g.act('a',{type:'loadout',weapon:invalid}),/available to this hero/);
 }
 const old=lobby().snapshot();old.players[0].character='witch';old.players[0].weapon='sandal';old.players[0].ready=true;const restored=createGame(old).snapshot();assert.equal(restored.players[0].weapon,'wand');assert.equal(restored.players[0].ready,false);
});
test('projectiles from a finished realm cannot hit a player back in the maze',()=>{
 const s=run();Object.assign(s.players[0],{x:2,y:3});s.monsterProjectiles=[{id:1,realm:true,realmId:'closed',mazeTeam:1,playerId:'a',monsterId:'ember-imp',toX:2,toY:3,fromX:3,fromY:3,impactAt:now-1,until:now+900,resolved:false}];
 const g=createGame(s);g.heartbeat('a');assert.equal(g.snapshot().players[0].hp,120);
});
