import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const bundle=await readFile(new URL('../dist/server/index.js',import.meta.url),'utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle).toString('base64'))).default;
const source=await readFile(new URL('../public/version-sync.js',import.meta.url),'utf8');
const A='a'.repeat(20),B='b'.repeat(20);
test('the version endpoint and scripts agree, and missing or stale clients cannot change rooms',async()=>{
 const response=await worker.fetch(new Request('https://trapbound.test/api/version'),{}),{build}=await response.json();assert.match(build,/^[a-f0-9]{20}$/);assert.equal(response.headers.get('X-Trapbound-Build'),build);assert.equal(response.headers.get('cache-control'),'no-store');
 const script=await (await worker.fetch(new Request('https://trapbound.test/version-sync.js'),{})).text();assert.ok(script.includes(`const BUILD='${build}'`));
 for(const header of [null,'old-browser',A]){let reads=0;const headers={'content-type':'application/json'};if(header)headers['X-Trapbound-Build']=header;const r=await worker.fetch(new Request('https://trapbound.test/api/action',{method:'POST',headers,body:JSON.stringify({action:{type:'move'}})}),{DB:{prepare(){reads++;throw Error('must not access room')}}});assert.equal(r.status,426);assert.equal((await r.json()).updateRequired,true);assert.equal(reads,0)}
});
function updater(prior=false){
 let server=A;const storage=new Map(prior?[['trapboundUpdateAttempt:'+B,String(Date.now())]]:[]),timers=[],events=[],requests=[],banners=[];
 const document={hidden:false,body:{append:el=>banners.push(el)},createElement:()=>({setAttribute(){},append(el){this.child=el}}),addEventListener(){}};
 const location={href:'https://trapbound.test/?room=ABCDEF',origin:'https://trapbound.test',replace:url=>events.push(url)};
 const window={fetch:async(url,init)=>{requests.push({url,init});return {ok:true,headers:new Headers({'X-Trapbound-Build':server}),json:async()=>({build:server})}},addEventListener(){},dispatchEvent:e=>events.push(e.type)};
 vm.runInNewContext(source.replace('__BUILD_ID__',A),{window,document,location,URL,Request,Headers,Event,Date,sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setInterval(){},setTimeout:f=>timers.push(f)});
 return {window,timers,requests,events,banners,server:value=>server=value};
}
test('every API call carries this client version, and updates cause one automatic cache-busted reload',async()=>{
 const u=updater();await u.window.fetch('/api/poll');assert.equal(u.requests[0].init.headers.get('X-Trapbound-Build'),A);assert.equal(u.timers.length,0);
 u.server(B);await u.window.fetch('/api/poll');await u.window.TrapboundUpdater.check();await u.window.fetch('/api/poll');assert.equal(u.timers.length,1);assert.ok(u.events.includes('trapbound-before-update'));u.timers[0]();assert.match(u.events.at(-1),/room=ABCDEF&tb_build=bbbb/);
});
test('a cached failed update cannot cause an endless reload loop',async()=>{
 const u=updater(true);u.server(B);await u.window.TrapboundUpdater.check();assert.equal(u.timers.length,0);assert.equal(u.banners[0].child.textContent,'Reload game');
});
test('a version reload keeps the same player and reconnects to the existing room',async()=>{
 const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8'),callbacks={},storage=new Map(),starts=[];
 const ctx=vm.createContext({state:{me:'a'},profile:{id:'a',name:'Host',code:'ABCDEF'},window:{addEventListener:(n,f)=>callbacks[n]=f},sessionStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)},startGuest:(...args)=>starts.push(args)});
 vm.runInContext(client.slice(client.indexOf("window.addEventListener('trapbound-before-update'"),client.indexOf('let savedRoomCheck=')),ctx);callbacks['trapbound-before-update']();callbacks.load();assert.deepEqual(starts,[['Host','a','ABCDEF',true]]);assert.equal(storage.has('trapboundAutoResume'),false);
});
