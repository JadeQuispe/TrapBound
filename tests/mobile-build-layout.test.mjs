import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style-v51.css',import.meta.url),'utf8');
const mobile=css.slice(css.indexOf('/* Mobile Build: same 7×7 cells'));
test('portrait Build reserves a square 7×7 board and a five-tool touch bar',()=>{
 assert.match(client,/referenceMap=!arena&&\(state.phase==='build'\|\|state.phase==='build2'\)&&state.floor<=3/);
 assert.match(client,/state.floor<=3\?\[\['wall','Walls'\],\['monster','Monsters'\],\['trap','Traps'\],\['portal','Portals'\],\['erase','Erase'\]\]/);
 for(const scene of ['volcanic-7x7.webp','crystal-7x7.webp','overgrown-7x7.webp'])assert.ok(mobile.includes(scene));
 assert.match(mobile,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)!important/);
 assert.match(mobile,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
 assert.match(mobile,/\.build-tools \{position:sticky!important;bottom:0!important\}/);
 assert.match(mobile,/\.tool \{[^\n]*min-height:44px!important/);
});
test('landscape Build moves its touch tools to the left while preserving timer and readiness',()=>{
 assert.match(mobile,/orientation:landscape/);
 assert.match(mobile,/\.build-layout \{flex-direction:row!important/);
 assert.match(mobile,/\.build-tools \{order:0!important/);
 assert.match(mobile,/\.build-top \.build-clock \{grid-column:3!important/);
 assert.match(mobile,/\.build-top \.build-team-status \{grid-column:4!important/);
 assert.match(mobile,/\.build-top \.finish-maze \{grid-column:5!important/);
 assert.match(mobile,/touch-action:manipulation/);
});
