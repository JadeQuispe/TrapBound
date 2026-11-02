import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style-v51.css',import.meta.url),'utf8');
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const build=await readFile(new URL('../scripts/build-worker.mjs',import.meta.url),'utf8');
test('Version 51 keeps stable live game DOM and preserves existing nodes through multiplayer updates',()=>{
  assert.match(client,/function patchMarkup\(root,markup\)/);
  assert.match(client,/patchMarkup\(app,room\+phase\+/);
  assert.doesNotMatch(client,/app\.innerHTML=room\+phase/);
  assert.match(client,/requestAnimationFrame\(\(\)=>\{setViewportUnit\(\);syncDeviceLayout\(\);releaseStick\(\)/);
  assert.match(client,/window\.visualViewport\?\.addEventListener\('resize',refreshViewport/);
});
test('portrait and landscape gameplay have bounded viewport layouts and dedicated touch trays',()=>{
  assert.match(css,/\.topdown-raid\{height:100%;min-height:0;display:grid/);
  assert.match(css,/grid-template-rows:minmax\(0,1fr\) 72px!important/);
  assert.match(css,/\.touch-joystick\{width:62px;height:62px/);
  assert.match(css,/\.build-board\{order:0;min-height:0;min-width:0;grid-row:1/);
  assert.match(css,/\.build-tools\{order:1;grid-row:2/);
  assert.match(css,/@media\(max-width:760px\) and \(orientation:landscape\)/);
  assert.match(html,/viewport-fit=cover/);
});
test('camera-scaled dungeon no longer animates GPU filter and keeps responsive camera updates',()=>{
  assert.match(css,/\.dungeon-field\.maze\{animation:none!important;filter:none!important\}/);
  assert.match(client,/Math\.min\(1\.55,Math\.max\(1\.06,Math\.min\(window\.innerWidth,window\.innerHeight\)\/360\)\)/);
  assert.match(client,/maze\.style\.setProperty\(name,value\)/);
  assert.match(css,/transform:translate\(var\(--follow-x\),var\(--follow-y\)\) scale\(var\(--follow-zoom\)\)!important/);
});
test('deployment bundle serves Version 51 CSS and non-remounting client script',()=>{
  assert.match(html,/style-v51\.css/);assert.match(html,/app-v18\.js/);
  assert.match(build,/style-v51\.css/);assert.match(build,/app-v18\.js/);
  assert.match(build,/assets\/how-to-play-v70\.png/);
});

test('tutorial opens after successful Lobby entry and can be skipped per local player',()=>{
  assert.match(client,/howOpen=false/);
  assert.match(client,/enteredLobby=next\.phase==='lobby'/);
  assert.match(client,/if\(enteredLobby\)\{clearTimeout\(tutorialTransitionTimer\);tutorialEntrySerial\+\+;tutorialClosing=false;tutorialOpen=firstWardenVisit\(next\)/);
  assert.doesNotMatch(client,/trapboundWardenSeenV144/);
  assert.match(client,/howOpen=false;render\(\)/);
  assert.doesNotMatch(client,/data-how-never|Don't show again|tutorialSuppressed|trapboundHowSeen/);
  assert.match(client,/function home\(\)[\s\S]*?\$\{howOpen\?howOverlay\(\):''\}/);
  assert.doesNotMatch(client,/howOpen=globalThis\.localStorage/);
});
test('selected weapons use compact hand-anchored original-style art with no floating emblem',()=>{
  const sandbox={};vm.createContext(sandbox);
  vm.runInContext(client.slice(0,client.indexOf('const MONSTERS='))+client.slice(client.indexOf('const HERO_WEAPON_STYLES='),client.indexOf('function wallConnections(')),sandbox);
  const heroes=['fox','witch','golem','wisp','goblin','tinker'];
  const weapons=['sword','arrow','sandal','spear','wand','hammer','dagger','crossbow'];
  for(const hero of heroes)for(const weapon of vm.runInContext(`availableWeapons('${hero}')`,sandbox)){
    const art=vm.runInContext(`weaponIllustration('${weapon}','${hero}')`,sandbox);
    vm.runInContext("state={phase:'run'}",sandbox);const figure=vm.runInContext(`avatar({name:'Jade',character:'${hero}',weapon:'${weapon}'})`,sandbox);
    assert.ok(art.includes('stroke-linejoin'),`${hero} ${weapon} has weapon art`);
    assert.ok(figure.includes(`data-equipped="${weapon}" data-hero="${hero}"`));
    assert.ok(figure.includes(`/assets/equipped-v156/`));
    if(weapon==='sandal')assert.ok(art.includes('M18 31 32 46 46 30'),'fallback sandal also has a footbed and straps');
  }
  assert.equal(new Set(heroes.map(hero=>vm.runInContext(`weaponIllustration('sword','${hero}')`,sandbox))).size,6);
});
test('mobile reflows through tablet widths, respects notch/safe areas, and centers the dungeon',()=>{
  assert.match(css,/@media\(pointer:coarse\),\(max-width:900px\)/);
  assert.match(css,/env\(safe-area-inset-top\)/);assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(css,/width:min\(100%,calc\(var\(--tb-vh,100dvh\) - 155px\)\)!important/);
  assert.match(css,/\.hero-portrait:after/);
});
