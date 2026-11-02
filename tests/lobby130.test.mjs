import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createGame,lobbyState,lobbyReadiness,playerView} from '../worker/game.js';
let now=1790000000000;Date.now=()=>now;
function lobby(n=2){const g=createGame(lobbyState('LOBB13','p0','Host'));for(let i=1;i<n;i++)g.act('p'+i,{type:'join',name:'Player '+i});return g}
function ready(g){for(const p of g.snapshot().players.filter(p=>p.connected!==false))g.act(p.id,{type:'ready',ready:true})}
test('2–8 players must all explicitly ready, then only the host can start manually',()=>{
 for(let n=2;n<=8;n++){const g=lobby(n);assert.throws(()=>g.act('p0',{type:'start'}),/READY/);for(let i=0;i<n-1;i++)g.act('p'+i,{type:'ready',ready:true});assert.throws(()=>g.act('p0',{type:'start'}),/READY/);g.act('p'+(n-1),{type:'ready',ready:true});assert.equal(g.snapshot().phase,'lobby');assert.equal(lobbyReadiness(g.snapshot()).canStart,true);assert.throws(()=>g.act('p1',{type:'start'}),/host/);for(let i=0;i<n;i++)assert.ok(playerView(g.snapshot(),'p'+i).players.every(p=>p.ready));g.act('p0',{type:'start'});assert.equal(g.snapshot().phase,'build');}
});
test('unready, hero change, weapon change, and team change each revoke start permission',()=>{
 for(const action of [{type:'ready',ready:false},{type:'loadout',character:'golem'},{type:'loadout',weapon:'crossbow'},{type:'switchTeam',team:0}]){const g=lobby(4);ready(g);g.act('p1',action);assert.equal(g.snapshot().players.find(p=>p.id==='p1').ready,false);assert.equal(lobbyReadiness(g.snapshot()).canStart,false);assert.throws(()=>g.act('p0',{type:'start'}),/READY|Balance/);assert.equal(g.snapshot().phase,'lobby');}
});
test('unchanged choices and ordinary heartbeats preserve consent',()=>{const g=lobby();ready(g);g.act('p1',{type:'loadout',character:'fox',weapon:'arrow'});g.act('p1',{type:'switchTeam',team:1});g.heartbeat('p0');assert.equal(lobbyReadiness(g.snapshot()).canStart,true)});
test('disconnect revokes lobby consent, rejoin requires READY again, and host migration stays safe',()=>{
 const g=lobby(4);ready(g);now+=8100;for(const id of ['p0','p2','p3'])g.heartbeat(id);assert.equal(g.snapshot().players.find(p=>p.id==='p1').connected,false);assert.equal(lobbyReadiness(g.snapshot()).canStart,false);assert.ok(g.snapshot().players.every(p=>!p.ready));g.act('p1',{type:'join',name:'Player 1'});assert.equal(lobbyReadiness(g.snapshot()).canStart,false);ready(g);assert.equal(lobbyReadiness(g.snapshot()).canStart,true);
 now+=8100;g.heartbeat('p1');assert.equal(g.snapshot().host,'p1');assert.equal(lobbyReadiness(g.snapshot()).canStart,false);assert.throws(()=>g.act('p1',{type:'start'}),/at least 2 players/);
});
test('client and server agree on all-ready, offline, team balance and minimum party cases',async()=>{
 const source=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8'),ctx=vm.createContext({});vm.runInContext(source.slice(source.indexOf('function lobbyReadiness'),source.indexOf('function render()')),ctx);
 for(let n=1;n<=8;n++)for(let unready=-1;unready<n;unready++)for(const offline of [-1,0]){const s={players:Array.from({length:n},(_,i)=>({id:'p'+i,team:i%2,ready:i!==unready,connected:i!==offline}))};assert.deepEqual(JSON.parse(JSON.stringify(ctx.lobbyReadiness(s))),lobbyReadiness(s));}
});
test('all 48 frames center complete silhouettes within the same padded canvas',async()=>{
 const frames=JSON.parse(await readFile(new URL('./hero-frames130.json',import.meta.url),'utf8'));assert.equal(Object.keys(frames).length,48);
 for(const [name,f] of Object.entries(frames)){const [l,t,r,b]=f.bounds,s=f.scale;assert.ok(s>0);assert.ok(Math.abs(Math.max((r-l)*s,(b-t)*s)-336)<.01,name);const cx=192+f.center[0]*3.84+((l+r)/2-192)*s,cy=192+f.center[1]*3.84+((t+b)/2-192)*s;assert.ok(Math.abs(cx-192)<.01&&Math.abs(cy-192)<.01,name);}
});
