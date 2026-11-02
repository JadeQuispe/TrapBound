import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css=await readFile(new URL('../public/style-v51.css',import.meta.url),'utf8');
const app=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');

test('v124 removes every rendered minimap at every viewport size',()=>{
  assert.match(css,/\.run-map,\.dungeon-minimap\{display:none!important\}/);
});

test('desktop walls use raised top and front faces with all connection topologies',()=>{
  assert.match(css,/@media\(min-width:1000px\)/);
  assert.match(css,/tile\.wall:before\{content:''!important/);
  assert.match(css,/tile\.wall:after\{content:''!important/);
  assert.match(css,/join-e\.join-w:not\(\.join-n\):not\(\.join-s\)/);
  assert.match(css,/join-n\.join-s:not\(\.join-e\):not\(\.join-w\)/);
  assert.match(css,/Corner pieces/);
  assert.match(css,/T-junction pieces/);
  assert.match(css,/join-n\.join-e\.join-s\.join-w/);
});

test('adjacent wall faces overlap shared edges with no floating-block gaps',()=>{
  assert.match(css,/v124: joined wall caps overlap/);
  assert.match(css,/tile\.wall\.join-n:before[^}]*top:-3px!important/);
  assert.match(css,/tile\.wall\.join-e:before[^}]*right:-3px!important/);
  assert.match(css,/tile\.wall\.join-s:before[^}]*bottom:-3px!important/);
  assert.match(css,/tile\.wall\.join-w:before[^}]*left:-3px!important/);
  assert.match(css,/tile\.wall\.join-e\.join-w:after[^}]*left:-3px!important;right:-3px!important/);
});

test('all theme materials remain distinct while collision-derived joins are unchanged',()=>{
  for(const asset of ['volcanic-wall-tile.webp','crystal-wall-tile.webp','overgrown-wall-tile.webp']) assert.ok(css.includes(asset));
  assert.match(app,/function wallConnections\(cells,x,y\)/);
  assert.match(app,/\[\[0,-1,'n'\],\[1,0,'e'\],\[0,1,'s'\],\[-1,0,'w'\]\]/);
  assert.ok(app.includes(".map(([, ,d])=>'join-'+d)"));
  assert.match(html,/\/v162\/style-v51\.css/);
  assert.match(html,/app-v18\.js\?v=162/);
});
