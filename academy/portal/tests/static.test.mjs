import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = f=>readFileSync(new URL('../public/'+f, import.meta.url),'utf8');
test('frontend is explicitly non-public, accessible, and uses safe DOM methods',()=>{
  const html=read('index.html'),script=read('app.mjs');
  assert.match(html,/<meta name="robots" content="noindex,nofollow"/);
  assert.match(html,/Skip to main content/);
  assert.match(html,/continuing-education credit are not currently offered/);
  assert.match(html,/role="status" aria-live="polite"/);
  assert.ok(script.includes('textContent'));
  assert.ok(!script.includes('innerHTML'));
  assert.ok(!script.includes('localStorage'));
  assert.ok(!script.includes('sessionStorage'));
  assert.match(read('_headers'),/frame-ancestors 'none'/);
});
