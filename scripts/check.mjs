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
  assert.ok(!('telephone' in JSON.parse(schema)), `${file}: no phone in organization schema`);
  assert.ok(!/href="tel:/i.test(html), `${file}: no phone links`);
  assert.ok(!/\(928\) 316-3388|\+1-928-316-3388|\+19283163388/.test(html), `${file}: no former consulting phone`);
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
assert.ok(contact.includes('Direct submission is available when verification loads.'));
assert.match(contact, /<input id="email"[^>]+type="email"[^>]+required/);
assert.match(contact, /<textarea id="message"[^>]+maxlength="2000"[^>]+required/);
assert.ok(!contact.includes('<form action='));
const serviceSelect = contact.match(/<select id="service"[^>]*>(.*?)<\/select>/s)?.[1];
assert.ok(serviceSelect, 'Required service dropdown exists');
const serviceChoices = Array.from(serviceSelect.matchAll(/<option(?:\s[^>]*)?>(.*?)<\/option>/gs), m => m[1]);
assert.deepEqual(serviceChoices, [
  'Choose an area of interest', 'Leadership development', 'Workplace mental health',
  'Culture &amp; psychological safety', 'Workshops &amp; training',
  'Organizational assessment', 'Ongoing consulting', 'Help choosing the right approach'
], 'Every service must be a selectable option so required form validation can pass');

const academy = await readFile(path.join(root, 'academy/index.html'), 'utf8');
assert.match(academy, /Coming soon/i);
assert.match(academy, /Course enrollment is not open/);
assert.match(academy, /CE approvals are not yet available|credit eligibility will be published only when confirmed/);
assert.ok(!/Enroll now|Buy now|Register now/i.test(academy), 'Academy must not offer unapproved enrollment');
const assessment = await readFile(path.join(root, 'organizational-assessments/index.html'), 'utf8');
assert.match(assessment, /organizational assessment/i);
assert.match(assessment, /defined in|agreed in|determined in the proposal/i);
const home = await readFile(path.join(root, 'index.html'), 'utf8');
assert.match(home, /Who we serve/);
assert.match(home, /Healthcare organizations/);
assert.match(home, /Nonprofits/);
const about = await readFile(path.join(root, 'about/index.html'), 'utf8');
assert.match(about, /collaborative|Collaborative/);
assert.match(about, /Ph\.D\. candidate/);
assert.ok(!about.includes('class="initials"'), 'About page should not center founder initials or portrait');
const workshops = await readFile(path.join(root, 'workshops/index.html'), 'utf8');
assert.match(workshops, /Best for:/);
assert.match(workshops, /Typical format:/);
for (const route of ['/academy/','/organizational-assessments/']) {
  assert.ok((await readFile(path.join(root, 'sitemap.xml'), 'utf8')).includes(`<loc>https://irenicconsulting.com${route}</loc>`));
}
assert.ok(!/class="initials"/.test(home), 'Homepage should not focus on founder initials');
assert.ok(!/href="tel:/.test(home + about + academy + assessment), 'Consulting must use email and contact form');
console.log(`Checked ${htmlCount} pages: routes, anchors, assets, schema, CSP, and inquiry encoding.`);
