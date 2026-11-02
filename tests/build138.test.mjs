import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,lobbyState,FLOOR_THEMES} from '../worker/game.js';
import {readyAndStart} from './start-fixture.mjs';

function building(floor=1){
 const g=createGame(lobbyState('TEST138','a','Amber'));
 g.act('b',{type:'join',name:'Violet'});g.act('c',{type:'join',name:'Amber teammate'});
 g.act('d',{type:'join',name:'Violet teammate'});readyAndStart(g);
 const s=g.snapshot();s.floor=floor;s.wallLimit=FLOOR_THEMES[floor].wallLimit;
 return createGame(s);
}
test('two spike traps per maze are shared across teammates; erasing refunds the slot',()=>{
 for(const floor of [1,2,3]){
  const g=building(floor);
  g.act('a',{type:'place',kind:'trap',trap:'spikes',x:2,y:2});
  g.act('c',{type:'place',kind:'trap',trap:'spikes',x:4,y:2});
  assert.throws(()=>g.act('a',{type:'place',kind:'trap',trap:'spikes',x:2,y:4}),/2 per maze/);
  assert.throws(()=>g.act('c',{type:'place',kind:'trap',trap:'unknown',x:2,y:4}),/2 per maze/);
  assert.equal(g.snapshot().mazes[0]['2,4'],'');
  g.act('b',{type:'place',kind:'trap',trap:'spikes',x:2,y:2});
  g.act('a',{type:'place',kind:'trap',trap:'fire',x:2,y:4});
  g.act('c',{type:'place',kind:'erase',x:2,y:2});
  g.act('a',{type:'place',kind:'trap',trap:'spikes',x:4,y:4});
  assert.equal(Object.values(g.snapshot().trapTypes[0]).filter(t=>t==='spikes').length,2);
 }
});
test('manual finish and timeout keep each authored maze layout without generating walls',()=>{
 for(const floor of [1,2,3])for(const timeout of [false,true]){
  let g=building(floor);
  g.act('a',{type:'place',kind:'wall',x:2,y:1});
  g.act('a',{type:'place',kind:'wall',x:3,y:1});
  g.act('b',{type:'place',kind:'wall',x:4,y:3});
  const authored=structuredClone(g.snapshot().mazes);
  if(timeout){const s=g.snapshot();s.deadline=Date.now()-1;g=createGame(s);g.tick()}
  else{
   g.act('a',{type:'finishBuild'});
   assert.deepEqual(g.snapshot().mazes,authored);
   assert.throws(()=>g.act('c',{type:'place',kind:'wall',x:2,y:3}),/already pressed Finish/);
   g.act('b',{type:'finishBuild'});
  }
  assert.equal(g.snapshot().phase,'run');
  for(const [team,cells] of g.snapshot().mazes.entries())for(const [key,value] of Object.entries(cells)){
   assert.equal(value==='loot'?'':value,authored[team][key]);
  }
 }
});
