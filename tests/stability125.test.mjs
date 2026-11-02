import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app-v18.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/style-v51.css', import.meta.url), 'utf8');

test('polling yields while actions are pending and keeps a background heartbeat', () => {
  assert.match(app, /!pollInFlight&&queuedActions===0/);
  assert.match(app, /document.hidden\?2000:state\?\.phase==='run'\?200:400/);
});

test('only identical commands are deduplicated and the client queue is bounded', () => {
  assert.match(app, /const pendingActionKeys=new Set\(\)/);
  assert.match(app, /queuedActions>=32/);
  assert.match(app, /JSON.stringify\(message\)/);
  assert.match(app, /pendingActionKeys\.has\(key\)/);
  assert.match(app, /pendingActionKeys\.delete\(item.key\)/);
});

test('legacy mutation observers and duplicate realm timers are removed', () => {
  assert.equal((app.match(/new MutationObserver/g) || []).length, 0);
  assert.equal((app.match(/querySelector\(\`\[data-duel-ring=/g) || []).length, 1);
  assert.equal((app.match(/classList\.toggle\('is-hurt'/g) || []).length, 1);
});

test('connected walls avoid per-tile blurred GPU shadows', () => {
  const v124 = css.slice(css.indexOf('/* v124:'));
  assert.match(v124, /background-blend-mode:normal/);
  assert.doesNotMatch(v124, /0 9px 8px/);
});
