import { readdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { composeInquiry } from '../src/inquiry.mjs';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const files = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) await walk(file); else files.push(file);
  }
}
await walk(root);
const headers = await readFile(path.join(root, '_headers'), 'utf8');
let htmlCount = 0;
for (const file of files.filter(x => x.endsWith('.html'))) {
  htmlCount++;
  const html = await readFile(file, 'utf8');
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${file}: exactly one h1`);
  assert.match(html, /<meta name="description" content="[^\"]+"/);
  const schema = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1];
  assert.equal(JSON.parse(schema).email, 'info@irenicconsulting.com');
  const hash = createHash('sha256').update(schema).digest('base64');
  assert.ok(headers.includes(`'sha256-${hash}'`), `${file}: CSP hash`);
  for (const m of html.matchAll(/(?:href|src)="([^\"]+)"/g)) {
    const link = m[1];
    if (!link.startsWith('/') && !link.startsWith('#')) continue;
    const [url, anchor] = link.split('#');
    let target = url ? path.join(root, url) : file;
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    await stat(target);
    if (anchor) assert.ok((await readFile(target, 'utf8')).includes(`id="${anchor}"`), `Missing anchor: ${link}`);
  }
}
const draft = composeInquiry({ name: 'A & B', email: 'team@example.org', organization: 'Example Org', service: 'Culture & psychological safety', message: 'Questions? #1: workload + boundaries\nNext line.' });
const url = new URL(draft.url);
assert.equal(url.protocol, 'mailto:');
assert.equal(url.pathname, 'info@irenicconsulting.com');
assert.equal(url.searchParams.get('subject'), draft.subject);
assert.equal(url.searchParams.get('body'), draft.body);
assert.ok(draft.body.includes('Questions? #1: workload + boundaries\nNext line.'));
const contact = await readFile(path.join(root, 'contact/index.html'), 'utf8');
assert.ok(contact.includes('Nothing is submitted by completing this form.'));
assert.match(contact, /<input id="email"[^>]+type="email"[^>]+required/);
assert.match(contact, /<textarea id="message"[^>]+maxlength="2000"[^>]+required/);
assert.ok(!contact.includes('<form action='));
console.log(`Checked ${htmlCount} pages: routes, anchors, assets, schema, CSP, and inquiry encoding.`);
