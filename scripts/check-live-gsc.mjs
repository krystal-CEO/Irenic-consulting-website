import assert from 'node:assert/strict';
const url = 'https://irenicconsulting.com/?gsc_check=20261106';
const response = await fetch(url, {headers: {'cache-control':'no-cache','accept':'text/html'},signal: AbortSignal.timeout(20000)});
assert.equal(response.status, 200, 'Consulting homepage must be publicly reachable');
const html = await response.text();
const tag = '<meta name="google-site-verification" content="h_3RAeYObf7QzdeH4UUwNLUyFu-AcfPAR8YaRc_3nO4">';
assert.ok(html.includes(tag), 'Google Search Console verification tag not yet visible in live homepage HTML');
console.log('PASS: Consulting homepage serves the approved Google Search Console verification tag.');
