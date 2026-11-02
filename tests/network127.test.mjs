import {currentClient} from './current-client.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';

const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const queueCode=client.slice(client.indexOf('function send(message)'),client.indexOf("window.addEventListener('offline'"));
const microtasks=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
function clientQueue(){
 const requests=[],accepted=[],messages=[];
 const context=vm.createContext({queueMicrotask,state:{phase:'build'},profile:{code:'TEST01',id:'guest'},roomGeneration:1,connectionIssue:'',pendingActionKeys:new Set(),actionQueue:[],actionDrainRunning:false,queuedActions:0,
  toast:message=>messages.push(message),showShotFeedback:message=>messages.push(message),setConnectionIssue:message=>messages.push(message),acceptRoom:result=>accepted.push(result),api:(path,body)=>new Promise((resolve,reject)=>requests.push({path,body,resolve,reject}))});
 vm.runInContext(queueCode,context);return {context,requests,accepted,messages};
}
test('rapid guest clicks survive slow responses in ordered batches, not one dropped placement per request',async()=>{
 const {context,requests,accepted}=clientQueue();
 for(let x=0;x<8;x++)context.send({type:'place',kind:'wall',x,y:2});
 await microtasks();assert.equal(requests.length,1);assert.equal(requests[0].body.actions.length,8);
 for(let x=0;x<8;x++)context.send({type:'place',kind:'wall',x,y:4});
 context.send({type:'finishBuild'});await microtasks();assert.equal(requests.length,1);
 requests[0].resolve({revision:1});await microtasks();assert.equal(requests.length,2);assert.equal(requests[1].body.actions.length,8);
 assert.deepEqual(Array.from(requests[1].body.actions,action=>action.x),[0,1,2,3,4,5,6,7]);
 requests[1].resolve({revision:2});await microtasks();assert.equal(requests[2].body.action.type,'finishBuild');
 requests[2].resolve({revision:3});await microtasks();assert.equal(context.queuedActions,0);assert.equal(context.pendingActionKeys.size,0);assert.equal(accepted.length,3);
});
test('duplicate tile taps are coalesced but different tiles and erase are retained',async()=>{
 const {context,requests}=clientQueue();
 for(let i=0;i<5;i++)context.send({type:'place',kind:'wall',x:2,y:2});
 context.send({type:'place',kind:'wall',x:3,y:2});context.send({type:'place',kind:'erase',x:2,y:2});
 await microtasks();assert.deepEqual(Array.from(requests[0].body.actions,a=>[a.kind,a.x]),[['wall',2],['wall',3],['erase',2]]);
 requests[0].resolve({revision:1});await microtasks();assert.equal(context.queuedActions,0);
});
test('a late response cannot overwrite a newly joined room',async()=>{
 const {context,requests,accepted}=clientQueue();context.send({type:'ready',ready:true});await microtasks();context.roomGeneration++;
 requests[0].resolve({revision:99});await microtasks();assert.equal(accepted.length,0);assert.equal(context.queuedActions,0);
});

const bundle=await readFile(new URL('../dist/server/index.js',import.meta.url),'utf8');
const worker=currentClient((await import('data:text/javascript;base64,'+Buffer.from(bundle).toString('base64'))).default);
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE rooms(code TEXT PRIMARY KEY,host_id TEXT,state TEXT,revision INTEGER DEFAULT 0,host_seen INTEGER,created_at INTEGER);CREATE TABLE actions(id INTEGER PRIMARY KEY,code TEXT,player_id TEXT,body TEXT,created_at INTEGER)');
 let writes=0;
 const DB={prepare(sql){
  const stmt=db.prepare(sql);let args=[];
  return {
   bind(...a){args=a;return this},
   async first(){return stmt.get(...args)||null},
   async run(){if(sql.startsWith('UPDATE rooms'))writes++;return {meta:{changes:Number(stmt.run(...args).changes)}}}
  };
 }};
 const req=async(path,body)=>{const response=await worker.fetch(new Request('https://trapbound.test'+path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined}),{DB});return {status:response.status,...await response.json()}};
 return {db,req,writes:()=>writes};
}
test('two devices concurrently batch walls with no lost cells, and repeated build polls do not compete for writes',async()=>{
 const {db,req,writes}=fixture();try{
  const {code}=await req('/api/create',{id:'host',name:'Host'});await req('/api/join',{code,id:'guest',name:'Guest'});
  for(const id of ['host','guest'])await req('/api/action',{code,id,action:{type:'ready',ready:true}});await req('/api/action',{code,id:'host',action:{type:'start'}});
  const places=[2,4].flatMap(y=>[2,3,4,5].map(x=>({type:'place',kind:'wall',x,y})));
  const replies=await Promise.all(['host','guest'].map(id=>req('/api/action',{code,id,actions:places})));
  for(const result of replies){assert.equal(result.status,200);assert.ok(!result.errors)}
  const poll=await req(`/api/poll?code=${code}&id=guest`);for(const cells of poll.state.mazes)assert.equal(Object.values(cells).filter(v=>v==='wall').length,8);
  const before=writes();for(let i=0;i<10;i++){const next=await req(`/api/poll?code=${code}&id=guest&after=${poll.revision}`);assert.equal(next.unchanged,true);assert.ok(!next.state)}assert.equal(writes(),before);
  // A due heartbeat still writes and keeps the guest connected.
  const row=db.prepare('SELECT state FROM rooms WHERE code=?').get(code),stored=JSON.parse(row.state);stored.players.find(p=>p.id==='guest').lastSeen=Date.now()-3000;db.prepare('UPDATE rooms SET state=? WHERE code=?').run(JSON.stringify(stored),code);
  const fresh=await req(`/api/poll?code=${code}&id=guest`);assert.ok(fresh.state.players.find(p=>p.id==='guest').connected);assert.ok(writes()>before);
 }finally{db.close()}
});
test('batch validation keeps protected zones and wall limits; one rejected tile does not discard valid neighbours',async()=>{
 const {db,req}=fixture();try{
  const {code}=await req('/api/create',{id:'h',name:'Host'});await req('/api/join',{code,id:'g',name:'Guest'});for(const id of ['h','g'])await req('/api/action',{code,id,action:{type:'ready',ready:true}});await req('/api/action',{code,id:'h',action:{type:'start'}});
  const result=await req('/api/action',{code,id:'g',actions:[{type:'place',kind:'wall',x:2,y:2},{type:'place',kind:'wall',x:1,y:1},{type:'place',kind:'wall',x:3,y:2}]});
  assert.equal(result.status,200);assert.equal(result.errors.length,1);assert.equal(result.errors[0].index,1);assert.equal(result.state.mazes[1]['2,2'],'wall');assert.equal(result.state.mazes[1]['3,2'],'wall');assert.equal(result.state.mazes[1]['1,1'],'');
  assert.equal((await req('/api/action',{code,id:'g',actions:[{type:'shoot'}]})).status,400);
 }finally{db.close()}
});
test('2, 4 and 8 concurrent HTTP clients synchronize READY, revoke it on edits and require host Start',async()=>{
 for(const n of [2,4,8]){const {db,req}=fixture();try{
  const ids=Array.from({length:n},(_,i)=>'p'+i),{code}=await req('/api/create',{id:'p0',name:'Host'});
  for(const id of ids.slice(1))await req('/api/join',{code,id,name:id});
  const act=(id,action)=>req('/api/action',{code,id,action});
  assert.equal((await act('p0',{type:'start'})).status,409);
  const ready=await Promise.all(ids.map(id=>act(id,{type:'ready',ready:true})));assert.ok(ready.every(r=>r.status===200));
  for(const id of ids){const poll=await req(`/api/poll?code=${code}&id=${id}`);assert.equal(poll.state.phase,'lobby');assert.ok(poll.state.players.every(p=>p.ready));}
  assert.equal((await act('p1',{type:'start'})).status,409);
  await act('p1',{type:'loadout',character:'golem',weapon:'hammer'});
  const staleStart=await act('p0',{type:'start'});assert.equal(staleStart.status,409);assert.match(staleStart.error,/READY/);
  for(const id of ids){const poll=await req(`/api/poll?code=${code}&id=${id}`);assert.equal(poll.state.players.find(p=>p.id==='p1').ready,false)}
  await act('p1',{type:'ready',ready:true});const started=await act('p0',{type:'start'});assert.equal(started.status,200);assert.equal(started.state.phase,'build');
 }finally{db.close()}}
});
test('Reconnect is offered only for a real recent room containing the saved player, without writes',async()=>{
 const {db,req,writes}=fixture();try{
  assert.equal((await req('/api/resume?code=ABCDEF&id=missing')).exists,false);
  const {code}=await req('/api/create',{id:'host',name:'Host'}),before=writes();
  assert.equal((await req(`/api/resume?code=${code}&id=host`)).exists,true);
  assert.equal((await req(`/api/resume?code=${code}&id=stranger`)).exists,false);
  assert.equal(writes(),before);
  db.prepare('UPDATE rooms SET created_at=? WHERE code=?').run(Date.now()-86400001,code);
  assert.equal((await req(`/api/resume?code=${code}&id=host`)).exists,false);
 }finally{db.close()}
});
