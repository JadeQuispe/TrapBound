import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {createGame,lobbyState,availableWeapons,playerView} from '../worker/game.js';
import {readyAndStart} from './start-fixture.mjs';
import {currentClient} from './current-client.mjs';
const expected={fox:['arrow','crossbow'],witch:['wand','potion'],golem:['hammer','greatsword'],wisp:['dagger','shuriken'],goblin:['spear','sandal'],tinker:['crossbow','bomb'],ember:['fan','orb'],frost:['spear','shield']};
const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(client.slice(0,client.indexOf('const MONSTERS='))+client.slice(client.indexOf('function loadoutEditor'),client.indexOf('function wallConnections')),context);
test('all six Lobby racks show exactly their two locked class weapons, in order',()=>{
 for(const [character,weapons] of Object.entries(expected)){
  assert.deepEqual(availableWeapons(character),weapons);
  const html=vm.runInContext(`loadoutEditor(${JSON.stringify({character,weapon:weapons[0],name:'Hero'})})`,context);
  assert.deepEqual([...html.matchAll(/data-weapon="([^"]+)"/g)].map(m=>m[1]),weapons);
  for(const weapon of weapons){const art=vm.runInContext(`equippedSprite('${weapon}','${character}')`,context);assert.match(art,/class="roster-sprite|class="inventory-cutout/);assert.match(art,/<image|<path|<img/);assert.ok(!art.includes('NaN'));}
 }
});
test('every allowed class weapon survives Lobby to Run and confirms damage to both duel clients',()=>{
 for(const [character,weapons] of Object.entries(expected))for(const weapon of weapons){
  const g=createGame(lobbyState('CLASS1','a','Hero'));g.act('b',{type:'join',name:'Enemy'});g.act('a',{type:'loadout',character,weapon});readyAndStart(g);g.act('a',{type:'finishBuild'});g.act('b',{type:'finishBuild'});
  const s=g.snapshot();assert.equal(s.players[0].weapon,weapon);assert.equal(s.players[0].character,character);
  Object.assign(s.players[0],{x:2,y:3,facing:1,lastShot:0});Object.assign(s.players[1],{x:3,y:3,hp:120});s.arenaMaze={};s.pvpArena={id:'classes',type:'rival',participants:['a','b'],until:Date.now()+45000};s.modAt=null;
  const run=createGame(s);run.act('a',{type:'shoot',target:'b'});const after=run.snapshot();assert.ok(after.players[1].hp<120,weapon);
  for(const id of ['a','b']){const view=playerView(after,id);assert.equal(view.players[0].weapon,weapon);assert.equal(view.combatEvents.at(-1).weapon,weapon);}
  assert.throws(()=>run.act('a',{type:'shoot',target:'b'}),/recharging/);
 }
});
test('class swaps revoke READY, incompatible selections reject and legacy lobbies normalize safely',()=>{
 for(const [character,weapons] of Object.entries(expected)){
  const g=createGame(lobbyState('CLASS2','a','Hero'));g.act('b',{type:'join',name:'Enemy'});g.act('a',{type:'loadout',character});g.act('a',{type:'ready',ready:true});g.act('a',{type:'loadout',weapon:weapons[1]});assert.equal(g.snapshot().players[0].ready,false);
  const other=Object.values(expected).flat().find(w=>!weapons.includes(w));assert.throws(()=>g.act('a',{type:'loadout',weapon:other}),/available to this hero/);assert.equal(g.snapshot().players[0].weapon,weapons[1]);
  const old=g.snapshot();Object.assign(old.players[0],{weapon:'sword',ready:true});const fixed=createGame(old).snapshot().players[0];assert.equal(fixed.weapon,weapons[0]);assert.equal(fixed.ready,false);
 }
});
const bundle=await readFile(new URL('../dist/server/index.js',import.meta.url),'utf8');
const worker=currentClient((await import('data:text/javascript;base64,'+Buffer.from(bundle).toString('base64'))).default);
test('2 and 8 HTTP clients agree on class locks, equipped weapons, READY and Run loadouts',async()=>{
 for(const count of [2,8]){
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE rooms(code TEXT PRIMARY KEY,host_id TEXT,state TEXT,revision INTEGER DEFAULT 0,host_seen INTEGER,created_at INTEGER);CREATE TABLE actions(id INTEGER PRIMARY KEY,code TEXT,player_id TEXT,body TEXT,created_at INTEGER)');
  const DB={prepare(sql){const stmt=db.prepare(sql);let args=[];return {bind(...a){args=a;return this},async first(){return stmt.get(...args)||null},async run(){return {meta:{changes:Number(stmt.run(...args).changes)}}}}}};
  const req=async(path,body)=>{const res=await worker.fetch(new Request('https://trapbound.test'+path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined}),{DB});return {status:res.status,...await res.json()}};
  try{
   const ids=Array.from({length:count},(_,i)=>'p'+i),{code}=await req('/api/create',{id:'p0',name:'Host'}),act=(id,action)=>req('/api/action',{code,id,action});
   for(const id of ids.slice(1))await req('/api/join',{code,id,name:id});
   const chosen=ids.map((id,i)=>{const [character,weapons]=Object.entries(expected)[i%6];return [id,character,weapons[i%2]]});
   for(const [id,character,weapon] of chosen){assert.equal((await act(id,{type:'loadout',character,weapon})).status,200);await act(id,{type:'ready',ready:true});}
   const invalid=await act('p0',{type:'loadout',weapon:'hammer'});assert.equal(invalid.status,409);
   for(const id of ids){const poll=await req(`/api/poll?code=${code}&id=${id}`);assert.deepEqual(poll.state.players.map(p=>[p.id,p.character,p.weapon]),chosen);assert.ok(poll.state.players.every(p=>p.ready));}
   await act('p0',{type:'start'});for(const id of ids)await act(id,{type:'finishBuild'});
   for(const id of ids){const poll=await req(`/api/poll?code=${code}&id=${id}`);assert.equal(poll.state.phase,'run');assert.deepEqual(poll.state.players.map(p=>[p.id,p.character,p.weapon]),chosen);assert.deepEqual(poll.state.players.map(p=>p.maxHp),chosen.map(([,hero])=>({fox:120,witch:85,golem:120,wisp:85,goblin:110,tinker:100})[hero]));}
  }finally{db.close()}
 }
});
