// Read-only public deployment smoke check. Does not send a lead, bypass Turnstile, or read private data.
import assert from 'node:assert/strict';

const base = 'https://irenicconsulting.com';
const pages = new Map([
  ['/', ['Who we serve','Healthcare organizations','Irenic Academy']],
  ['/services/', ['Consulting services','Examples of consulting engagements']],
  ['/workshops/', ['Workshops & training','Typical format:']],
  ['/about/', ['Ph.D. candidate','qualified professionals']],
  ['/contact/', ['info@irenicconsulting.com','id="inquiry-form"','id="email-instead"']],
  ['/privacy/', ['Business inquiries','Cloudflare']],
  ['/academy/', ['Coming soon','Course enrollment is not open','Irenic Academy']],
  ['/organizational-assessments/', ['Organizational culture assessments','confidentiality']]
]);
const audit = [];
let errors = 0;
async function get(path) {
  const uri = new URL(path, base);
  uri.searchParams.set('qa', '20261106');
  const res = await fetch(uri, { headers: { 'cache-control': 'no-cache', 'accept': 'text/html,*/*' }, signal: AbortSignal.timeout(16000), redirect: 'follow' });
  return { status: res.status, body: await res.text(), type: res.headers.get('content-type') || '', headers:res.headers };
}
for (const [path, fragments] of pages) {
  try {
    const { status, body } = await get(path);
    assert.equal(status, 200, `status ${status}`);
    for (const fragment of fragments) assert.ok(body.toLowerCase().includes(fragment.toLowerCase()), `missing ${fragment}`);
    assert.ok(/<title>[^<]+<\/title>/.test(body), 'missing title');
    assert.ok(body.includes('info@irenicconsulting.com'), 'missing email');
    assert.ok(!/tel:|928[\s-]*316[\s-]*3388|\btelephone\s*:/i.test(body), 'public phone still exposed');
    assert.ok(body.includes('rel="canonical"'), 'missing canonical');
    if (path==='/academy/') assert.ok(!/Register now|Enroll now|Buy now/i.test(body), 'enrollment CTA unexpectedly offered');
    if (path==='/contact/') {
      assert.ok(!/<input[^>]+(?:id|name)="phone"/i.test(body), 'phone field present');
      assert.ok(body.includes('/site.mjs'), 'contact script not loaded');
    }
    audit.push(`PASS ${path} (HTTP ${status})`);
  } catch (e) {
    errors++;
    audit.push(`FAIL ${path}: ${e.message}`);
  }
}
try {
  const {status,body} = await get('/sitemap.xml');
  assert.equal(status, 200);
  assert.ok(body.includes('<urlset'), 'no XML urlset');
  for (const path of pages.keys()) assert.ok(body.includes(base+path), `missing sitemap URL: ${path}`);
  audit.push('PASS /sitemap.xml (all eight routes)');
} catch(e) {errors++;audit.push('FAIL /sitemap.xml: '+e.message);}
try {
  const {status,body} = await get('/api/inquiry-config');
  assert.equal(status, 200);
  const config=JSON.parse(body);
  assert.equal(config.enabled,true, 'direct inquiry submissions not available');
  assert.equal(typeof config.siteKey,'string');
  assert.ok(config.siteKey.length>0,'Turnstile site key missing');
  audit.push('PASS /api/inquiry-config (direct submission available; key redacted)');
} catch(e) {errors++;audit.push('FAIL /api/inquiry-config: '+e.message);}
try {
  const {body} = await get('/');
  console.log('Cloudflare Web Analytics beacon: ' + (/static\\.cloudflareinsights\\.com\\/beacon\\.min\\.js/.test(body) ? 'present in public HTML' : 'not found in public HTML'));
  console.log('Google Search Console verification meta: ' + (/name="google-site-verification"/.test(body) ? 'present in public HTML' : 'not found in public HTML'));
} catch(error) {console.log('Could not inspect public analytics markup: '+error.message);}
for(const line of audit) console.log(line);
if (errors) {console.error(`Public smoke test failed: ${errors} check(s).`); process.exitCode=1;}
else console.log('Public smoke test passed. This does NOT test real browser Turnstile completion, D1 saving, Resend, or inbox receipt.');
