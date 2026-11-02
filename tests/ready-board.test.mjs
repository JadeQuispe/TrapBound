import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style-v51.css',import.meta.url),'utf8');
test('all three Build scenes persist when a team is Ready while placement stays disabled',()=>{
 assert.match(source,/referenceMap=!arena&&\(state\.phase==='build'\|\|state\.phase==='build2'\)&&state\.floor<=3/);
 assert.match(source,/\$\{board\(team,editing\)\}/);
 assert.match(source,/\$\{editable\?'maze-edit':'maze-live'\}/);
 for(const name of ['volcanic-reference.webp','crystal-reference.webp','overgrown-reference.webp']) assert.ok(css.includes(name));
 assert.match(css,/\.build-board \.dungeon-field\.maze\.reference-scene\[style\*="--theme-floor"\]/);
});
