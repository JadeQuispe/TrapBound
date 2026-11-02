import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style-v51.css',import.meta.url),'utf8');
const server=await readFile(new URL('../worker/game.js',import.meta.url),'utf8');
test('results use existing scores, player stats and server result deadline without a manual advance button',()=>{
 for(const field of ['p.score','p.kills','p.deaths','p.pickups','p.damageDealt','state.scores[0]','state.scores[1]','state.resultUntil']) assert.ok(client.includes(field),field);
 assert.match(client,/NEXT FLOOR IN <b data-result-seconds>/);
 assert.match(client,/const remaining=Math.max\(0,until-Date.now\(\)\)/);
 assert.match(server,/r.resultUntil=Date.now\(\)\+6500/);
 for(const name of ['volcanic-ruins','crystal-cavern','overgrown-temple'])assert.ok(client.includes(name));
 assert.match(css,/\.results-screen \.result-cards \{flex:1;min-height:0;display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('the same 2×2 START and EXIT placement boundary is used by client and server',()=>{
 assert.match(client,/function mazeProtected\(floor,x,y,size\)\{if\(!mazePlacementCell\(floor,x,y,size\)\)return false;const edge=size-1,clearance=1/);
 assert.match(server,/function inEndpointClearance\(x,y,size,floor=1\)\{if\(!isThemePlacementCell\(floor,x,y,size\)\)return false;let edge=size-1,clearance=1/);
});
