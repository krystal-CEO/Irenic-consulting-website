import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { handle, validateLead, isConfigured } from './worker.mjs';

const lead = { id: '5b4d7ea5-44c3-4f6c-82d6-8e809d9404f8', name: '=TEST', email: 'example@example.org', organization: 'TEST organization', role: 'Manager', service: 'Leadership development', size: '11–50', timeframe: 'Exploring options', message: '=IMPORTXML("example", "x")' };
const origin = 'https://irenicconsulting.com';
const env = { INQUIRIES_ENABLED: 'true', TURNSTILE_SITE_KEY: 'test-public', TURNSTILE_SECRET_KEY: 'test-private', GAS_SHARED_SECRET: 'a'.repeat(36), GAS_WEB_APP_URL: 'https://script.google.com/macros/s/TEST/exec', ASSETS: { fetch: async () => new Response('static page') } };
let calls = [];
const goodFetch = async (url, options) => {
  calls.push({ url, body: JSON.parse(options.body) });
  return Response.json(url.includes('siteverify') ? { success: true, hostname: 'irenicconsulting.com', action: 'consulting_inquiry' } : { status: 'accepted', id: lead.id });
};
const request = (body = { ...lead, turnstileToken: 'test-token' }, extra = {}) => new Request(origin + '/api/inquiries', { method: 'POST', headers: { origin, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });
assert.equal(isConfigured({}), false);
assert.equal(isConfigured({ ...env, INQUIRIES_ENABLED: 'false' }), false);
assert.equal(isConfigured({ ...env, GAS_WEB_APP_URL: 'https://example.org/exec' }), false);
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
assert.equal(calls.length, 2);
assert.equal(calls[1].body.token, env.GAS_SHARED_SECRET);
assert.equal(calls[1].body.turnstileToken, undefined);
const badBackend = async (url) => Response.json(url.includes('siteverify') ? { success: true, hostname: 'irenicconsulting.com', action: 'consulting_inquiry' } : { status: 'save_failed' });
assert.equal((await handle(request(), env, badBackend)).status, 502);
assert.equal(await (await handle(new Request(origin + '/'), env)).text(), 'static page');

// Exercise the Google code with private synthetic in-memory rows; no Google writes or email.
const rows = [];
const properties = { SHARED_SECRET: env.GAS_SHARED_SECRET, SHEET_ID: 'synthetic-only', NOTIFICATION_EMAIL: 'owner@example.org' };
let quota = 0;
let emails = [];
let failNotification = false;
let failStorage = false;
const sheet = {
  getLastRow: () => rows.length,
  getLastColumn: () => rows[0].length,
  appendRow: (row) => { if (failStorage) throw new Error('synthetic'); rows.push(row); },
  getRange: (row, col, count = 1, width = 1) => ({
    getValues: () => rows.slice(row - 1, row - 1 + count).map(r => r.slice(col - 1, col - 1 + width)),
    setValue: (value) => { rows[row - 1][col - 1] = value; },
    createTextFinder: (id) => ({ matchEntireCell: () => ({ findNext: () => rows.slice(1).find(r => r[0] === id) || null }) })
  })
};
const context = vm.createContext({
  PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => properties[key] }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush() {} },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (value) => ({ setMimeType: () => JSON.parse(value) }) },
  MailApp: { getRemainingDailyQuota: () => quota, sendEmail: (email) => { if (failNotification) throw new Error('synthetic'); emails.push(email); } },
  console: { error() {}, log() {} }
});
vm.runInContext(await readFile(new URL('./google-apps-script/Code.gs', import.meta.url), 'utf8'), context);
rows.push(Array.from(context.HEADERS));
const post = (data) => context.doPost({ postData: { contents: JSON.stringify(data) } });
assert.equal(post({ ...lead, token: 'wrong' }).status, 'unauthorized');
assert.equal(rows.length, 1);
assert.equal(post({ ...lead, token: env.GAS_SHARED_SECRET }).status, 'accepted');
assert.equal(rows.length, 2);
assert.equal(rows[1][2][0], "'");
assert.equal(rows[1][9][0], "'");
assert.equal(post({ ...lead, token: env.GAS_SHARED_SECRET }).duplicate, true);
assert.equal(rows.length, 2);
context.processPendingMail();
assert.equal(emails.length, 0);
assert.equal(rows[1][11], 'queued');
quota = 5;
failNotification = true;
context.processPendingMail();
assert.equal(rows[1][11], 'failed');
assert.equal(rows[1][12], 1);
assert.equal(emails.length, 0);
failNotification = false;
context.processPendingMail();
assert.equal(rows[1][11], 'sent');
assert.equal(emails.length, 1);
assert.equal(emails[0].to, properties.NOTIFICATION_EMAIL);
assert.equal(emails[0].replyTo, lead.email);
context.processPendingMail();
assert.equal(emails.length, 1);
rows[1][11] = 'sending';
context.processPendingMail();
assert.equal(emails.length, 1);
// A spreadsheet from the earlier setup must not cause queued visitor mail to send.
const legacyHeaders = [...rows[0]];
legacyHeaders.splice(11, 0, 'Acknowledgement');
legacyHeaders.splice(13, 0, 'Ack attempts');
const legacyRow = [...rows[1]];
legacyRow.splice(11, 0, 'queued');
legacyRow.splice(13, 0, 0);
legacyRow[12] = 'queued';
rows.splice(0, rows.length, legacyHeaders, legacyRow);
context.processPendingMail();
assert.equal(rows[1][11], 'queued');
assert.equal(rows[1][12], 'sent');
assert.equal(emails.length, 2);
assert.ok(emails.every(mail => mail.to === properties.NOTIFICATION_EMAIL));
assert.equal(post({ ...lead, id: '8b4d7ea5-44c3-4f6c-82d6-8e809d9404f8', token: env.GAS_SHARED_SECRET }).status, 'accepted');
assert.equal(rows[2][11], 'disabled');
assert.equal(rows[2][12], 'queued');
context.processPendingMail();
assert.equal(emails.length, 3);
assert.ok(emails.every(mail => mail.to === properties.NOTIFICATION_EMAIL));
failStorage = true;
assert.equal(post({ ...lead, id: '9b4d7ea5-44c3-4f6c-82d6-8e809d9404f8', token: env.GAS_SHARED_SECRET }).status, 'save_failed');
console.log('Passed: configuration gating, origin/token checks, payload bounds, durable acceptance, duplicate suppression, formula protection, quota queue, owner-only notification retries and legacy log compatibility, and ambiguous-send handling.');
