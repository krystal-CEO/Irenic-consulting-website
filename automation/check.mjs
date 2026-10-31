import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handle, validateLead, isConfigured } from './worker.mjs';

import { DatabaseSync } from 'node:sqlite';
import { notifyInquiry, processPendingNotifications } from './worker.mjs';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
let failStorage = false;
const DB = {
  prepare(sql) {
    let values = [];
    const stmt = {
      bind(...args) { values = args; return stmt; },
      async run() { if (failStorage) throw new Error('synthetic storage failure'); const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
      async first() { return sqlite.prepare(sql).get(...values) || null; },
      async all() { return { success: true, results: sqlite.prepare(sql).all(...values) }; }
    };
    return stmt;
  }
};
let sent = [];
let emailError;
const lead = { id: '5b4d7ea5-44c3-4f6c-82d6-8e809d9404f8', name: '=TEST', email: 'example@example.org', organization: "TEST's organization", role: 'Manager', service: 'Leadership development', size: '11–50', timeframe: 'Exploring options', message: '=IMPORTXML("example", "x")' };
const origin = 'https://irenicconsulting.com';
const env = { INQUIRIES_ENABLED: 'true', TURNSTILE_SITE_KEY: 'test-public', TURNSTILE_SECRET_KEY: 'test-private', CONSULTING_DB: DB,
  NOTIFICATION_EMAIL: 'owner@example.org', NOTIFICATION_FROM: 'inquiries@notifications.irenicconsulting.com',
  CONSULTING_EMAIL: { async send(message) { if (emailError) throw emailError; sent.push(message); return { messageId: 'synthetic-' + sent.length }; } },
  ASSETS: { fetch: async () => new Response('static page') } };
let calls = [];
const goodFetch = async (url, options) => {
  calls.push({ url, body: JSON.parse(options.body) });
  assert.ok(url.includes('siteverify'), 'Only Turnstile uses an external HTTP request');
  return Response.json({ success: true, hostname: 'irenicconsulting.com', action: 'consulting_inquiry' });
};
const request = (body = { ...lead, turnstileToken: 'test-token' }, extra = {}) => new Request(origin + '/api/inquiries', { method: 'POST', headers: { origin, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });
assert.equal(isConfigured({}), false);
assert.equal(isConfigured({ ...env, INQUIRIES_ENABLED: 'false' }), false);
assert.equal(isConfigured({ ...env, CONSULTING_DB: undefined }), false);
assert.equal(isConfigured({ ...env, CONSULTING_EMAIL: undefined }), false);
assert.equal(isConfigured({ ...env, NOTIFICATION_FROM: 'inquiries@irenix.org' }), false);
assert.equal((await handle(request(), { ...env, INQUIRIES_ENABLED: 'false' }, goodFetch)).status, 503);
assert.equal(calls.length, 0);
assert.equal((await handle(request(undefined, { origin: 'https://other.example' }), env, goodFetch)).status, 403);
assert.equal(calls.length, 0);
assert.equal(validateLead({ ...lead, email: 'a@example.org,b@example.org' }), null);
assert.equal(validateLead({ ...lead, name: 'Hello\r\nBcc: other@example.org' }), null);
assert.equal(validateLead({ ...lead, service: 'Unknown service' }), null);
assert.equal((await handle(request({ ...lead, message: 'é'.repeat(9000), turnstileToken: 'token' }), env, goodFetch)).status, 413);
const invalidHostname = async () => Response.json({ success: true, hostname: 'other.example', action: 'consulting_inquiry' });
assert.equal((await handle(request(), env, invalidHostname)).status, 400);
const invalidAction = async () => Response.json({ success: true, hostname: 'irenicconsulting.com', action: 'other' });
assert.equal((await handle(request(), env, invalidAction)).status, 400);
const accepted = await handle(request(), env, goodFetch);
assert.equal(accepted.status, 200);
assert.equal((await accepted.json()).id, lead.id);
assert.equal(calls.length, 1);
const row = () => sqlite.prepare('SELECT * FROM consulting_inquiries WHERE id = ?').get(lead.id);
assert.equal(row().organization, lead.organization);
assert.equal(row().goals, lead.message);
assert.equal(row().notification_state, 'sent');
assert.equal(sent.length, 1);
assert.equal(sent[0].to, env.NOTIFICATION_EMAIL);
assert.equal(sent[0].replyTo, lead.email);
assert.equal((await handle(request(), env, goodFetch)).status, 200);
assert.equal(sqlite.prepare('SELECT count(*) AS count FROM consulting_inquiries').get().count, 1);
assert.equal(sent.length, 1);
assert.equal((await handle(request({ ...lead, message: 'changed', turnstileToken: 'test-token' }), env, goodFetch)).status, 409);
assert.equal(row().goals, lead.message);
assert.equal(sent.length, 1);
assert.equal(await (await handle(new Request(origin + '/'), env)).text(), 'static page');
failStorage = true;
assert.equal((await handle(request({ ...lead, id: '9b4d7ea5-44c3-4f6c-82d6-8e809d9404f8', turnstileToken: 'token' }), env, goodFetch)).status, 502);
failStorage = false;
// Notification failures must never turn a durably saved inquiry into a false failure.
const queuedLead = { ...lead, id: '8b4d7ea5-44c3-4f6c-82d6-8e809d9404f8', turnstileToken: 'token' };
emailError = Object.assign(new Error('synthetic quota rejection'), { code: 'E_DAILY_LIMIT_EXCEEDED' });
assert.equal((await handle(request(queuedLead), env, goodFetch)).status, 200);
let queued = () => sqlite.prepare('SELECT * FROM consulting_inquiries WHERE id = ?').get(queuedLead.id);
assert.equal(queued().notification_state, 'failed');
emailError = undefined;
await Promise.all([notifyInquiry(env, queuedLead.id), notifyInquiry(env, queuedLead.id)]);
assert.equal(sent.length, 2);
assert.equal(queued().notification_state, 'sent');
await processPendingNotifications(env);
assert.equal(sent.length, 2);
// Ambiguous service errors and interrupted sends must not trigger automatic duplicates.
sqlite.prepare("UPDATE consulting_inquiries SET notification_state = 'queued', notification_attempts = 0 WHERE id = ?").run(queuedLead.id);
emailError = new Error('synthetic connection interruption');
await processPendingNotifications(env);
assert.equal(queued().notification_state, 'sending');
emailError = undefined;
await processPendingNotifications(env);
assert.equal(sent.length, 2);
sqlite.prepare("UPDATE consulting_inquiries SET notification_state = 'failed', notification_attempts = 3 WHERE id = ?").run(queuedLead.id);
await processPendingNotifications(env);
assert.equal(sent.length, 2);
assert.ok(sent.every(message => message.to === env.NOTIFICATION_EMAIL));
const worker = await readFile(new URL('./worker.mjs', import.meta.url), 'utf8');
assert.ok(!worker.includes('script.google.com'));
assert.ok(!worker.includes('GAS_SHARED_SECRET'));
// Exercise the free HTTP provider through the real request/storage/notification path.
const resendEnv = { ...env, NOTIFICATION_PROVIDER: 'resend', RESEND_API_KEY: 're_synthetic_only', CONSULTING_EMAIL: undefined };
assert.equal(isConfigured(resendEnv), true);
assert.equal(isConfigured({ ...resendEnv, RESEND_API_KEY: undefined }), false);
assert.equal(isConfigured({ ...resendEnv, NOTIFICATION_PROVIDER: 'unrecognized' }), false);
let providerStatus = 200;
let providerBody = { id: 'resend-synthetic-id' };
let providerThrow = false;
const providerCalls = [];
const providerFetch = async (url, options) => {
  if (url.includes('siteverify')) return goodFetch(url, options);
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.authorization, 'Bearer re_synthetic_only');
  providerCalls.push({ payload: JSON.parse(options.body), key: options.headers['idempotency-key'] });
  if (providerThrow) throw new Error('synthetic network interruption');
  return Response.json(providerBody, { status: providerStatus });
};
const resendLead = { ...lead, id: '7b4d7ea5-44c3-4f6c-82d6-8e809d9404f8', turnstileToken: 'token', to: 'attacker@example.net', NOTIFICATION_EMAIL: 'attacker@example.net' };
assert.equal((await handle(request(resendLead), resendEnv, providerFetch)).status, 200);
const resendRow = id => sqlite.prepare('SELECT * FROM consulting_inquiries WHERE id = ?').get(id);
assert.equal(resendRow(resendLead.id).notification_state, 'sent');
assert.equal(resendRow(resendLead.id).notification_message_id, providerBody.id);
assert.deepEqual(providerCalls[0].payload.to, [env.NOTIFICATION_EMAIL]);
assert.equal(providerCalls[0].payload.from, 'Irenic Consulting <' + env.NOTIFICATION_FROM + '>');
assert.equal(providerCalls[0].payload.reply_to, lead.email);
assert.ok(providerCalls[0].payload.text.includes(lead.message));
assert.ok(!providerCalls[0].payload.cc && !providerCalls[0].payload.bcc);
assert.equal(providerCalls[0].key, 'consulting-inquiry/' + resendLead.id);
assert.equal((await handle(request(resendLead), resendEnv, providerFetch)).status, 200);
assert.equal(providerCalls.length, 1, 'A duplicate POST cannot send a second notification');
const rateLead = { ...resendLead, id: '6b4d7ea5-44c3-4f6c-82d6-8e809d9404f8' };
providerStatus = 429;
assert.equal((await handle(request(rateLead), resendEnv, providerFetch)).status, 200);
assert.equal(resendRow(rateLead.id).notification_state, 'failed');
assert.equal(resendRow(rateLead.id).notification_error, 'E_RATE_LIMIT_EXCEEDED');
providerStatus = 200;
await Promise.all([notifyInquiry(resendEnv, rateLead.id, providerFetch), notifyInquiry(resendEnv, rateLead.id, providerFetch)]);
assert.equal(resendRow(rateLead.id).notification_state, 'sent');
assert.equal(providerCalls.length, 3, 'Only one retry claims the failed row');
assert.equal(providerCalls[1].key, providerCalls[2].key, 'Retries reuse the same provider idempotency key');
for (const mode of ['server_error', 'network_error', 'missing_acceptance_id']) {
  const ambiguousLead = { ...resendLead, id: crypto.randomUUID() };
  providerStatus = mode === 'server_error' ? 500 : 200;
  providerThrow = mode === 'network_error';
  providerBody = mode === 'missing_acceptance_id' ? {} : { id: 'synthetic-uncertain' };
  assert.equal((await handle(request(ambiguousLead), resendEnv, providerFetch)).status, 200);
  assert.equal(resendRow(ambiguousLead.id).notification_state, 'sending');
  const attemptsBefore = providerCalls.length;
  await notifyInquiry(resendEnv, ambiguousLead.id, providerFetch);
  assert.equal(providerCalls.length, attemptsBefore, 'Uncertain acceptance requires review rather than an automatic duplicate');
}
providerThrow = false;
providerStatus = 403;
const rejectedLead = { ...resendLead, id: crypto.randomUUID() };
assert.equal((await handle(request(rejectedLead), resendEnv, providerFetch)).status, 200);
assert.equal(resendRow(rejectedLead.id).notification_state, 'failed');
assert.equal(resendRow(rejectedLead.id).notification_error, 'E_VALIDATION_ERROR');
assert.ok(providerCalls.every(call => call.payload.to.length === 1 && call.payload.to[0] === env.NOTIFICATION_EMAIL));
sqlite.close();
console.log('Passed: configuration gating, origin/token checks, payload bounds, real SQL persistence, duplicate/conflict handling, owner-only notifications, Cloudflare and Resend delivery, HTTP rejection handling, atomic send claims, stable idempotency keys, retries, and ambiguous-send handling.');
