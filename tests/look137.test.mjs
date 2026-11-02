import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
function setup(){
 const p={id:'a',x:3,y:3,facing:1},commands=[],listeners={};
 const context={state:{phase:'run',me:'a',players:[p]},Date,Number,Math,facingOf:p=>p.facing,document:{querySelector:()=>null,addEventListener:(name,fn)=>listeners[name]=fn},send:async cmd=>{commands.push(cmd);p.facing=(p.facing+cmd.delta+4)%4}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('let lookingAtFloor='),source.indexOf('function showCombatFeedback')),context);
 return {p,commands,listeners,look:(x,y)=>context.lookAtFloor(x,y)};
}
test('click-to-look rotates at most twice, never moves, and respects inactive players',async()=>{
 const a=setup();await a.look(1,3);assert.equal(a.p.facing,3);assert.equal(a.commands.length,2);assert.ok(a.commands.every(c=>c.type==='turn'));assert.deepEqual([a.p.x,a.p.y],[3,3]);
 await a.look(1,3);assert.equal(a.commands.length,2);a.p.escaped=true;await a.look(3,0);assert.equal(a.commands.length,2);
});
test('enemy clicks retain attack behavior, while floor clicks choose a direction',async()=>{
 const a=setup();a.listeners.click({target:{closest:selector=>selector==='[data-monster],[data-rival]'?{}:null}});assert.equal(a.commands.length,0);
 a.listeners.click({target:{closest:selector=>selector==='[data-look-cell]'?{dataset:{lookCell:'3,0'}}:null}});await Promise.resolve();await Promise.resolve();assert.equal(a.p.facing,0);assert.equal(a.commands.length,1);
});
