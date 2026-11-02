import {readyAndStart} from './start-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createGame,lobbyState,playerView} from '../worker/game.js';
let now=1780000000000;Date.now=()=>now;
function fixture(){const g=createGame(lobbyState('MOB129','a','Host'));g.act('b',{type:'join',name:'Guest'});g.act('c',{type:'join',name:'Teammate'});readyAndStart(g);g.act('a',{type:'finishBuild'});g.act('b',{type:'finishBuild'});const s=g.snapshot();s.modAt=null;s.nextMonsterStep=now+60000;s.mazes=s.mazes.map(m=>Object.fromEntries(Object.keys(m).map(k=>[k,''])));s.players[0].x=2;s.players[0].y=2;return s}
test('sprung traps are safe for reentry and every other teammate',()=>{
 const s=fixture();s.players[0].character='fox';s.players[2].team=0;s.players[2].x=2;s.players[2].y=2;s.mazes[1]['3,2']='trap';s.trapTypes[1]['3,2']='fire';const g=createGame(s);
 g.act('a',{type:'move',dir:[1,0]});const hp=g.snapshot().players[0].hp;now+=200;g.act('a',{type:'move',dir:[-1,0]});now+=200;g.act('a',{type:'move',dir:[1,0]});assert.equal(g.snapshot().players[0].hp,hp);
 g.act('c',{type:'move',dir:[1,0]});assert.equal(g.snapshot().players[2].trapEvent,undefined);assert.equal(g.snapshot().mazes[1]['3,2'],'trap');assert.ok(playerView(g.snapshot(),'a').revealedTraps[1]['3,2']);
});
test('spikes instantly lose exactly one life even with shield, dodge, and prior trap grace',()=>{
 for(const character of ['fox','tinker','golem']){const s=fixture(),p=s.players[0];Object.assign(p,{character,hp:120,shield:50,dodgeUntil:now+1000,protectedUntil:now+1000,trapGraceUntil:now+1000});s.mazes[1]['3,2']='trap';s.trapTypes[1]['3,2']='spikes';const g=createGame(s);g.act('a',{type:'move',dir:[1,0]});let p1=g.snapshot().players[0];assert.equal(p1.hp,0);assert.equal(p1.hearts,2);assert.equal(p1.deaths,1);g.act('a',{type:'move',dir:[1,0]});assert.equal(g.snapshot().players[0].hearts,2);assert.equal(g.snapshot().mazes[1]['3,2'],'trap');}
});
test('successful realm entry consumes a shared portal for both player views and after return',()=>{
 for(const roll of [.1,.9]){const s=fixture();s.mazes[1]['3,2']='trap';s.trapTypes[1]['3,2']='rift';const g=createGame(s),random=Math.random;Math.random=()=>roll;try{g.act('a',{type:'move',dir:[1,0]})}finally{Math.random=random}assert.ok(g.snapshot().pvpArena);for(const id of ['a','b']){const view=playerView(g.snapshot(),id);assert.equal(view.mazes[1]['3,2'],'');assert.equal(view.trapTypes[1]['3,2'],undefined)}let active=g.snapshot();active.pvpArena.until=now-1;const resumed=createGame(active);resumed.heartbeat('a');assert.equal(resumed.snapshot().pvpArena,null);assert.equal(resumed.snapshot().mazes[1]['3,2'],'');}
});
test('an occupied encounter leaves an unused portal available',()=>{
 const s=fixture();s.mazes[1]['3,2']='trap';s.trapTypes[1]['3,2']='rift';s.pvpArena={type:'monster',participants:['b'],until:now+20000,monster:{id:'magma-golem',hp:150,maxHp:150,x:4,y:3}};s.arenaMaze={};const g=createGame(s);g.act('a',{type:'move',dir:[1,0]});assert.equal(g.snapshot().mazes[1]['3,2'],'trap');assert.equal(g.snapshot().trapTypes[1]['3,2'],'rift');
});
test('each trap triggers once for the whole maze across death and room reload, and resets next floor',()=>{
 const s=fixture();s.players[2].team=0;s.players[2].x=2;s.players[2].y=2;s.mazes[1]['3,2']='trap';s.trapTypes[1]['3,2']='spikes';let g=createGame(s);
 g.act('a',{type:'move',dir:[1,0]});assert.equal(g.snapshot().players[0].hearts,2);assert.ok(g.snapshot().players[0].used.includes('3,2'));
 now+=5000;g.heartbeat('a');let restored=JSON.parse(JSON.stringify(g.snapshot()));Object.assign(restored.players[0],{x:2,y:2,lastMove:0});g=createGame(restored);g.act('a',{type:'move',dir:[1,0]});assert.equal(g.snapshot().players[0].hp,120);assert.equal(g.snapshot().players[0].hearts,2);
 g.act('c',{type:'move',dir:[1,0]});assert.equal(g.snapshot().players[2].hearts,3);assert.equal(g.snapshot().mazes[1]['3,2'],'trap');
 let next=g.snapshot();next.phase='build';next.floor=2;next.buildReady=[false,false];next.deadline=now+60000;g=createGame(next);g.act('a',{type:'finishBuild'});g.act('b',{type:'finishBuild'});assert.equal(g.snapshot().phase,'run');assert.ok(g.snapshot().players.every(p=>p.used.length===0));
});
const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
test('joystick repeats close to server cadence, bounds queue and preserves a different finger release',()=>{
 const sent=[],events={},timers=[];const p={id:'a'};const ctx=vm.createContext({heroStats:()=>({move:180}),Date,state:{phase:'run',me:'a',players:[p]},queuedActions:0,send:m=>sent.push(m),mazeScreenDirection:d=>d,document:{addEventListener:(n,f)=>events[n]=f,querySelector:()=>null},setInterval:(f,n)=>timers.push({f,n})});
 vm.runInContext(client.slice(client.indexOf('let stickPointer='),client.indexOf("document.addEventListener('pointerup',releaseStick)")),ctx);
 vm.runInContext('stickPointer=11;stickOrigin={x:40,y:40}',ctx);ctx.updateStick({pointerId:11,clientX:47,clientY:40});assert.equal(sent.length,1);
 now+=184;timers[0].f();assert.equal(sent.length,1);now++;timers[0].f();assert.equal(sent.length,2);
 ctx.releaseStick({pointerId:22});now+=185;timers[0].f();assert.equal(sent.length,3);
 ctx.queuedActions=2;now+=200;timers[0].f();assert.equal(sent.length,3);ctx.queuedActions=0;ctx.releaseStick({pointerId:11});now+=200;timers[0].f();assert.equal(sent.length,3);assert.equal(timers[0].n,25);
});

test('the Realm deadline chooses one survivor and charges the loser exactly one life',()=>{const s=fixture();s.pvpArena={type:'rival',participants:['a','b'],until:now+1000,startedAt:now,tieBreaker:'a'};s.arenaMaze={};for(const p of s.players.slice(0,2)){p.hp=p.maxHp;p.hearts=3;p.arenaReturn={x:0,y:0};}const g=createGame(s);now+=1001;g.heartbeat('a');const result=g.snapshot();assert.equal(result.pvpArena,null);assert.equal(result.players[0].hearts,3);assert.ok(result.players[0].hp>0);assert.equal(result.players[1].hearts,2);assert.equal(result.players[1].deaths,1);g.heartbeat('b');assert.equal(g.snapshot().players[1].hearts,2);});

test('turning is stationary, facing is synced, and vertical movement keeps the last horizontal pose',()=>{
 const s=fixture();s.players[0].x=3;s.players[0].y=3;s.players[0].facing=1;const g=createGame(s);
 g.act('a',{type:'turn',delta:1});g.act('a',{type:'turn',delta:1});let p=g.snapshot().players[0];assert.equal(p.facing,3);assert.equal(p.lookFacing,-1);assert.equal(p.x,3);assert.equal(p.y,3);assert.equal(playerView(g.snapshot(),'b').players[0].lookFacing,-1);
 now+=200;g.act('a',{type:'move',dir:[0,-1]});p=g.snapshot().players[0];assert.equal(p.facing,0);assert.equal(p.lookFacing,-1);
 now+=200;g.act('a',{type:'move',dir:[1,0]});p=g.snapshot().players[0];assert.equal(p.facing,1);assert.equal(p.lookFacing,1);
 const restored=createGame(JSON.parse(JSON.stringify(g.snapshot())));assert.equal(restored.snapshot().players[0].lookFacing,1);
});

test('winning either Realm fight immediately clears its originating portal for both devices',()=>{
 for(const type of ['monster','rival']){const s=fixture();s.players[0].x=2;s.players[0].y=3;s.players[0].facing=1;s.players[0].lastShot=0;s.players[0].arenaReturn={x:2,y:2,facing:1};s.players[1].x=4;s.players[1].y=3;s.players[1].hp=1;s.players[1].protectedUntil=0;s.players[1].dodgeUntil=0;s.players[1].arenaReturn={x:0,y:0,facing:1};s.arenaMaze={};s.mazes[1]['3,2']='trap';s.trapTypes[1]['3,2']='rift';s.revealedTraps[1]['3,2']=now;s.pvpArena={type,participants:type==='rival'?['a','b']:['a'],until:now+20000,portalOrigin:{team:1,key:'3,2'},monster:type==='monster'?{id:'ember-imp',x:4,y:3,hp:1,maxHp:105}:null};const g=createGame(s);g.act('a',type==='monster'?{type:'shoot',cell:[4,3]}:{type:'shoot',target:'b'});assert.equal(g.snapshot().pvpArena,null,type);for(const id of ['a','b']){const view=playerView(g.snapshot(),id);assert.equal(view.mazes[1]['3,2'],'');assert.equal(view.trapTypes[1]['3,2'],undefined);assert.equal(view.revealedTraps[1]['3,2'],undefined)}}
});
