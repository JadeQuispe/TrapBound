import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const searchSource=client.slice(client.indexOf('function mazeHeightFor'),client.indexOf('function minimap'));
function checker(floor=1){
 const context=vm.createContext({state:{mazeSize:7,floor,pieces:34}});vm.runInContext(searchSource,context);return context;
}
test('off-grid protected corners are never walkable on any floor',()=>{
 for(const floor of [1,2,3]){const ctx=checker(floor);
  for(const [x,y] of [[-1,-1],[-100,0],[0,-100],[7,7],[100,100],[6,7],[-1,6],[2.5,2]]){
   assert.equal(ctx.mazeProtected(floor,x,y,7),false);assert.equal(ctx.mazeWalkableCell(floor,x,y,7),false);
  }
  assert.equal(ctx.mazeProtected(floor,1,1,7),true);assert.equal(ctx.mazeProtected(floor,5,5,7),true);
 }
});
test('the exact four-wall freeze layout terminates under a strict VM deadline',()=>{
 const ctx=checker();ctx.cells={'0,2':'wall','1,2':'wall','2,1':'wall','2,0':'wall'};
 assert.equal(vm.runInContext('mazePathExists(cells,7,1)',ctx,{timeout:100}),false);
 delete ctx.cells['2,0'];
 assert.equal(vm.runInContext("placementAllowed(cells,2,0,'wall',0)",ctx,{timeout:100}),false);
 assert.equal(vm.runInContext('mazePathExists(cells,7,1)',ctx,{timeout:100}),true);
});
test('a trapped START or EXIT visits no more than the finite board for all three floors',()=>{
 for(const floor of [1,2,3])for(const wallKeys of [['0,2','1,2','2,1','2,0'],['4,5','5,4','6,4','4,6']]){
  const ctx=checker(floor);let reads=0;ctx.cells=new Proxy(Object.fromEntries(wallKeys.map(k=>[k,'wall'])),{get(target,key){reads++;assert.ok(reads<=196,'search escaped the 49-cell board');return target[key]}});
  assert.equal(vm.runInContext(`mazePathExists(cells,7,${floor})`,ctx,{timeout:100}),false);
 }
});
test('500 rapid validation passes near a boxed-in route do not grow an unbounded search',()=>{
 const ctx=checker();ctx.cells={'0,2':'wall','1,2':'wall','2,1':'wall'};
 const result=vm.runInContext("let rejected=0;for(let pass=0;pass<500;pass++)for(let y=0;y<7;y++)for(let x=0;x<7;x++)if(!placementAllowed(cells,x,y,'wall',0))rejected++;rejected",ctx,{timeout:5000});
 assert.ok(result>500);assert.equal(ctx.mazePathExists(ctx.cells,7,1),true);
});
test('targeted attacks await the actual queued turn rather than the removed legacy actionChain',()=>{
 assert.ok(!client.includes('await actionChain'));
 assert.ok(client.includes("await send({type:'turn'"));assert.ok(client.includes('return completion;'));
});
