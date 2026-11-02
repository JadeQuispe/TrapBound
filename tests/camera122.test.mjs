import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const ctx={};vm.createContext(ctx);
vm.runInContext(client.slice(client.indexOf('let interiorMetrics='),client.indexOf('function runCamera')),ctx);

test('the measured camera keeps every playable cell and its hero inside desktop and mobile viewports',()=>{
 const cases=[{viewWidth:1108,viewHeight:740,worldWidth:1400,worldHeight:1400},{viewWidth:390,viewHeight:500,worldWidth:630,worldHeight:630},{viewWidth:844,viewHeight:230,worldWidth:844,worldHeight:844},{viewWidth:768,viewHeight:700,worldWidth:900,worldHeight:900}];
 for(const metrics of cases)for(let y=0;y<7;y++)for(let x=0;x<7;x++){
  ctx.focus={x,y};ctx.metrics=metrics;
  const pan=vm.runInContext('interiorCameraOffset(focus,7,metrics)',ctx),cell=metrics.worldWidth/7;
  const centerX=(x+.5)*cell+pan.x,centerY=(y+.5)*cell+pan.y,halfSprite=Math.min(76,cell*.774)/2;
  assert.ok(Number.isFinite(pan.x)&&Number.isFinite(pan.y));
  assert.ok(centerX-halfSprite>=-.01&&centerX+halfSprite<=metrics.viewWidth+.01,`${x},${y} horizontal ${metrics.viewWidth}`);
  assert.ok(centerY-halfSprite>=-.01&&centerY+halfSprite<=metrics.viewHeight+.01,`${x},${y} vertical ${metrics.viewHeight}`);
  assert.ok(pan.x<=0&&pan.x>=Math.min(0,metrics.viewWidth-metrics.worldWidth));
  assert.ok(pan.y<=0&&pan.y>=Math.min(0,metrics.viewHeight-metrics.worldHeight));
 }
});

test('orientation changes recompute bounds instead of reusing the old viewport',()=>{
 ctx.focus={x:5,y:6};ctx.metrics={viewWidth:390,viewHeight:500,worldWidth:756,worldHeight:756};
 const portrait=vm.runInContext('interiorCameraOffset(focus,7,metrics)',ctx);
 ctx.metrics={viewWidth:844,viewHeight:230,worldWidth:844,worldHeight:844};
 const landscape=vm.runInContext('interiorCameraOffset(focus,7,metrics)',ctx);
 assert.notEqual(portrait.x,landscape.x);assert.notEqual(portrait.y,landscape.y);
 assert.ok(client.includes('new ResizeObserver(queueInteriorCamera)'));
 assert.ok(client.includes('world.offsetWidth'));
});
