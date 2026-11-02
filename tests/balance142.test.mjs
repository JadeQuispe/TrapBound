import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createGame,lobbyState,availableWeapons} from '../worker/game.js';
import {readyAndStart} from './start-fixture.mjs';
let now=1900000000000;Date.now=()=>now;
function run(character='fox',weapon=availableWeapons(character)[0]){now+=10000;const g=createGame(lobbyState('BAL142','a','Hero'));g.act('b',{type:'join',name:'Opponent'});g.act('a',{type:'loadout',character,weapon});g.act('b',{type:'loadout',character:'tinker',weapon:'crossbow'});readyAndStart(g);g.act('a',{type:'finishBuild'});g.act('b',{type:'finishBuild'});const s=g.snapshot();s.modAt=null;s.nextMonsterStep=now+60000;s.deadline=now+120000;for(const cells of s.mazes)for(const k of Object.keys(cells))cells[k]='';return s}
function duel(s){s.arenaMaze={};s.pvpArena={id:'balance-duel',type:'rival',participants:['a','b'],until:now+45000};Object.assign(s.players[0],{x:2,y:3,facing:1});Object.assign(s.players[1],{x:3,y:3,facing:3});return createGame(s)}
const cases={fox:[120,150,1800,600],witch:[85,180,2500,600],golem:[120,280,3500,450],wisp:[85,150,1800,600],goblin:[110,180,2500,600],tinker:[100,180,2500,600]};
test('six heroes start with distinct HP, movement and dodge tradeoffs; the server enforces each cooldown',()=>{
 for(const [hero,[hp,move,dodge,window]] of Object.entries(cases)){
  const s=run(hero);assert.equal(s.players[0].maxHp,hp);assert.equal(s.players[0].hp,hp);const g=createGame(s);
  g.act('a',{type:'move',dir:[1,0]});now+=move-1;g.act('a',{type:'move',dir:[1,0]});assert.equal(g.snapshot().players[0].x,1,hero);now++;g.act('a',{type:'move',dir:[1,0]});assert.equal(g.snapshot().players[0].x,2,hero);
  g.act('a',{type:'dodge'});assert.equal(g.snapshot().players[0].dodgeUntil,now+window);now+=dodge-1;assert.throws(()=>g.act('a',{type:'dodge'}),/recovering/);now++;g.act('a',{type:'dodge'});assert.equal(g.snapshot().players[0].lastDodge,now);
 }
});
test('armor, fragile defense, heavy attacks and reduced support damage affect real confirmed PvP hits',()=>{
 const expected={fox:[12,25],witch:[16,20],golem:[33,14],wisp:[18,20],goblin:[14,20],tinker:[20,20]};
 for(const [hero,[outgoing,incoming]] of Object.entries(expected)){
  const s=run(hero);s.players.forEach(p=>{p.hp=300;p.maxHp=300});const g=duel(s);g.act('a',{type:'shoot',target:'b'});assert.equal(g.snapshot().players[1].hp,300-outgoing,hero);g.act('b',{type:'shoot',target:'a'});assert.equal(g.snapshot().players[0].hp,300-incoming,hero);
 }
});
test('Rook opening burst recovers in 3s, while a real miss adds recovery and temporary vulnerability',()=>{
 let s=run('wisp');s.players[1].hp=300;s.players[1].maxHp=300;let g=duel(s);g.act('a',{type:'shoot',target:'b'});assert.equal(g.snapshot().players[1].hp,282);now+=428;g.act('a',{type:'shoot',target:'b'});assert.equal(g.snapshot().players[1].hp,267);now+=3000;g.act('a',{type:'shoot',target:'b'});assert.equal(g.snapshot().players[1].hp,249);
 s=run('wisp');g=duel(s);g.act('a',{type:'shoot',miss:true});const missAt=now;assert.equal(g.snapshot().players[0].attackReadyAt,now+1028);assert.equal(g.snapshot().players[0].exposedUntil,now+900);g.act('b',{type:'shoot',target:'a'});assert.equal(g.snapshot().players[0].hp,61);now=missAt+1027;assert.throws(()=>g.act('a',{type:'shoot',target:'b'}),/recharging/);now++;g.act('a',{type:'shoot',target:'b'});assert.equal(g.snapshot().players[0].lastShot,now);
});
test('Moonveil slows on confirmed hits with a 3.5s immunity gap, and cannot slow a dodging target',()=>{
 const s=run('witch');let g=duel(s);g.act('a',{type:'shoot',target:'b'});assert.equal(g.snapshot().players[1].slowUntil,now+900);const immune=g.snapshot().players[1].magicSlowImmuneUntil;now+=850;g.act('a',{type:'shoot',target:'b'});assert.equal(g.snapshot().players[1].magicSlowImmuneUntil,immune);assert.equal(g.snapshot().players[1].slowUntil,now+50);
 const dodge=run('witch');g=duel(dodge);g.act('b',{type:'dodge'});g.act('a',{type:'shoot',target:'b'});assert.equal(g.snapshot().players[1].hp,100);assert.ok(!g.snapshot().players[1].slowUntil);
});
test('Sunseed heals self and nearby allies without healing through walls, across realms or above max HP',()=>{
 const s=run('goblin');Object.assign(s.players[0],{x:2,y:2,hp:60});s.players.push({...s.players[0],id:'c',name:'Nearby',x:3,hp:100},{...s.players[0],id:'d',name:'Far',x:6,hp:60},{...s.players[0],id:'e',name:'Blocked',x:2,y:4,hp:60},{...s.players[0],id:'f',name:'In Realm',x:2,y:2,hp:60});s.mazes[1]['2,3']='wall';s.pvpArena={id:'other',type:'monster',participants:['f'],monster:{id:'ember-imp',x:4,y:3,hp:100,maxHp:100},until:now+45000};s.arenaMaze={};
 const g=createGame(s);g.act('a',{type:'ability'});const p=g.snapshot().players;assert.equal(p[0].hp,85);assert.equal(p.find(p=>p.id==='c').hp,110);assert.equal(p.find(p=>p.id==='d').hp,60);assert.equal(p.find(p=>p.id==='e').hp,60);assert.equal(p.find(p=>p.id==='f').hp,60);now+=15999;assert.throws(()=>g.act('a',{type:'ability'}),/recovering/);
});
function trap(type,gears=0){const s=run('goblin');Object.assign(s.players[0],{x:2,y:2});s.players[1].character=gears?'tinker':'fox';for(let i=1;i<gears;i++)s.players.push({...s.players[1],id:'gear'+i,name:'Gear '+i});s.mazes[1]['3,2']='trap';s.trapTypes[1]['3,2']=type;const g=createGame(s);g.act('a',{type:'move',dir:[1,0]});return g}
test('Gearleaf strengthens only their own team traps once; duplicates never stack or add activations',()=>{
 for(const [type,base,boosted,field] of [['ice',5500,6600,'slowUntil'],['web',4200,5040,'slowUntil'],['stun',5000,5000,'stunnedUntil']]){
  for(const [gears,duration] of [[0,base],[1,boosted],[4,boosted]]){const g=trap(type,gears);assert.equal(g.snapshot().players[0][field]-now,duration);const s=g.snapshot();s.players.push({...s.players[0],id:'c',x:2,y:2,lastMove:0,slowUntil:0,stunnedUntil:0,used:[]});const next=createGame(s);next.act('c',{type:'move',dir:[1,0]});assert.equal(next.snapshot().players.find(p=>p.id==='c')[field],0);}
 }
 const otherTeam=run('tinker');otherTeam.players[0].trapShield=true;otherTeam.players[1].character='fox';Object.assign(otherTeam.players[0],{x:2,y:2});otherTeam.mazes[1]['3,2']='trap';otherTeam.trapTypes[1]['3,2']='ice';const opposing=createGame(otherTeam);opposing.act('a',{type:'move',dir:[1,0]});assert.equal(opposing.snapshot().players[0].slowUntil-now,5500);
 for(const gears of [1,4]){let g=trap('fire',gears);assert.equal(g.snapshot().players[0].hp,101);assert.equal(g.snapshot().players[0].burnTicks,3);assert.equal(g.snapshot().players[0].burnDamage,7);g=trap('spikes',gears);assert.equal(g.snapshot().players[0].hp,0);assert.equal(g.snapshot().players[0].hearts,2);}
});
test('Lobby displays both strengths and weaknesses with class-adjusted damage and cooldowns; shared configs match',async()=>{
 const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8'),server=await readFile(new URL('../worker/game.js',import.meta.url),'utf8');
 const config=s=>vm.runInNewContext(s.slice(0,s.indexOf('const MONSTERS=')).replace(/export\s+/g,'')+';JSON.stringify({heroes:HERO_STATS,characters:CHARACTERS,weapons:HERO_WEAPONS})');assert.equal(config(client),config(server));
 const ctx=vm.createContext({});vm.runInContext(client.slice(0,client.indexOf('const MONSTERS='))+client.slice(client.indexOf('function loadoutEditor'),client.indexOf('function wallConnections')),ctx);
 for(const hero of Object.keys(cases)){const html=vm.runInContext(`loadoutEditor({character:'${hero}',weapon:availableWeapons('${hero}')[0],name:'Hero'})`,ctx);assert.match(html,/ADVANTAGE/);assert.match(html,/DISADVANTAGE/);assert.match(html,/hero-strength/);assert.match(html,/hero-weakness/);assert.ok(!html.includes('undefined'));}
 const stats=JSON.parse(vm.runInContext('JSON.stringify(HERO_STATS)',ctx));assert.ok(Object.values(stats).every(s=>s.incoming>=.7&&s.dodgeWindow/s.dodge<=1/3));
});
test('mobile joystick cadence follows each hero speed instead of forcing every class to the old speed',async()=>{
 const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
 for(const [hero,[,move]] of Object.entries(cases)){
  const sent=[],timers=[],ctx=vm.createContext({Date,fixture:{phase:'run',me:'a',players:[{id:'a',character:hero}]},queuedActions:0,send:m=>sent.push(m),mazeScreenDirection:d=>d,document:{addEventListener:()=>{},querySelector:()=>null},setInterval:f=>timers.push(f)});
  vm.runInContext(client.slice(0,client.indexOf('const MONSTERS='))+';state=fixture;'+client.slice(client.indexOf('let stickPointer='),client.indexOf("document.addEventListener('pointerup',releaseStick)")),ctx);
  vm.runInContext('stickPointer=11;stickOrigin={x:40,y:40}',ctx);ctx.updateStick({pointerId:11,clientX:50,clientY:40});assert.equal(sent.length,1);now+=move+4;timers[0]();assert.equal(sent.length,1,hero);now++;timers[0]();assert.equal(sent.length,2,hero);
 }
});
