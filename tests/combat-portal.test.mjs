import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style-v51.css',import.meta.url),'utf8');

test('combat feedback distinguishes reload, range, and no-hit outcomes in the game HUD',()=>{
  const label={textContent:'',classes:new Set(),classList:{add(x){label.classes.add(x)}}};
  const context={Date,app:{querySelector:()=>label},combatMessage:'',combatMessageUntil:0,toast:message=>assert.fail(`unexpected toast: ${message}`)};
  vm.createContext(context);
  vm.runInContext(client.slice(client.indexOf('function showCombatFeedback'),client.indexOf('function attackTargetAction')),context);
  vm.runInContext("showShotFeedback('Your weapon is recharging.')",context);assert.match(label.textContent,/^RELOADING/);
  vm.runInContext("showShotFeedback('Face the monster until the crosshair locks.')",context);assert.match(label.textContent,/^OUT OF RANGE/);
  vm.runInContext("showShotFeedback('Unknown shot error')",context);assert.match(label.textContent,/^NO HIT/);
  assert.match(client,/function attackAhead[\s\S]*NO HIT · No enemy in range/);
  assert.match(client,/function attackAhead[\s\S]*me\.escaped\|\|me\.eliminated/);
  assert.match(client,/data-reload-fill[\s\S]*setInterval\(\(\)=>\{if\(state\?\.phase!=='run'\)return;const me=state\.players\.find/);
  assert.match(css,/\.combat-actions>#weaponReady\.combat-feedback\{display:block!important/);
});

test('broken chat bubbles and bottom ping controls are absent from the Run UI',()=>{
  assert.match(client,/function removeBrokenChatBubbles\(\)[\s\S]*\.combat-log,\.chat-bubble,\[data-chat-bubble\]/);
  assert.match(css,/\.combat-log,\.chat-bubble,\[data-chat-bubble\],\.run-chat-bubble\{display:none!important\}/);
  assert.doesNotMatch(client,/\$\{teamPings\(me\)\}/);
});

