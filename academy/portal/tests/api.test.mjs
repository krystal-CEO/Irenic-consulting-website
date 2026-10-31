import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleAcademyApi } from '../src/api.mjs';

const base = 'https://learn.irenicconsulting.com';
function setup() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../migrations/0001_local_schema.sql', import.meta.url), 'utf8'));
  sql.exec(readFileSync(new URL('../dev/seed-synthetic.sql', import.meta.url), 'utf8'));
  const db = { prepare(query) {
    const stmt = sql.prepare(query);
    return { bind(...values) { return {
      async first() { return stmt.get(...values) || null; },
      async all() { return { results: stmt.all(...values) }; },
      async run() { stmt.run(...values); return { success: true }; }
    }; } };
  }};
  const session = id => id ? { user: { id, name: id,
    email: id+'@example.invalid', emailVerified: id !== 'synthetic-unverified' } } : null;
  const request = (path, method='GET', origin=base) => new Request(base+path,{ method,
    headers: method === 'POST' ? { 'Origin':origin, 'content-type':'application/json' } : {},
    ...(method === 'POST' ? { body:'{}' } : {})
  });
  const call = async (path, id, method='GET', origin=base) => {
    const r = await handleAcademyApi(request(path,method,origin),
      { ACADEMY_DB:db, ACADEMY_ORIGIN:base }, async () => session(id));
    return { status:r.status, data:await r.json() };
  };
  return {call, sql};
}
test('catalog has only published courses and no paid lesson bodies', async () => {
  const {call} = setup();
  const r=await call('/api/catalog');
  assert.equal(r.status,200); assert.equal(r.data.courses.length,1);
  assert.equal(r.data.courses[0].version_id,'version-accountable-1');
  assert.ok(!JSON.stringify(r.data).includes('Private draft'));
  assert.ok(!JSON.stringify(r.data).includes('Practice prompt'));
});
test('requires a valid authenticated and verified session', async () => {
  const {call} = setup();
  assert.equal((await call('/api/me',null)).status,401);
  assert.equal((await call('/api/me','synthetic-unverified')).status,403);
  assert.equal((await call('/api/my/courses','synthetic-unverified')).status,403);
  assert.equal((await call('/api/my/courses','synthetic-user-a')).status,200);
});
test('revoked and other learner content cannot be accessed, even by direct URL', async () => {
  const {call} = setup();
  const path='/api/my/courses/version-accountable-1/progress';
  assert.equal((await call(path,'synthetic-user-b')).status,404);
  assert.equal((await call(path,'some-other-user')).status,404);
  assert.equal((await call('/api/my/courses/version-draft-1/lessons/lesson-secret','synthetic-user-a')).status,404);
  assert.equal((await call('/api/my/courses/version-accountable-1/lessons/lesson-bias','synthetic-user-b')).status,404);
  assert.equal((await call('/api/my/courses/version-accountable-1/lessons/lesson-secret','synthetic-user-a')).status,404);
});
test('text lesson order enforced, acknowledgement is idempotent, and no certificate is issued', async () => {
  const {call,sql} = setup();
  const prefix='/api/my/courses/version-accountable-1/lessons/';
  assert.equal((await call(prefix+'lesson-caseload','synthetic-user-a')).status,423);
  assert.equal((await call(prefix+'lesson-caseload/acknowledge','synthetic-user-a','POST')).status,423);
  assert.equal((await call(prefix+'lesson-bias','synthetic-user-a')).status,200);
  assert.equal((await call(prefix+'lesson-bias/acknowledge','synthetic-user-a','POST')).status,200);
  assert.equal((await call(prefix+'lesson-bias/acknowledge','synthetic-user-a','POST')).status,200);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM academy_lesson_progress').get().count,1);
  assert.equal((await call(prefix+'lesson-caseload','synthetic-user-a')).status,200);
  await call(prefix+'lesson-caseload/acknowledge','synthetic-user-a','POST');
  assert.equal((await call(prefix+'lesson-accountability','synthetic-user-a')).status,200);
  const p=await call('/api/my/courses/version-accountable-1/progress','synthetic-user-a');
  assert.equal(p.status,200); assert.equal(p.data.lessons.length,3);
  assert.equal(p.data.lessons.filter(l=>l.completed_at).length,2);
  assert.equal((await call('/api/my/courses/version-accountable-1/certificate','synthetic-user-a')).status,404);
});
test('CSRF origin and JSON content-type checks prevent unintended state changes', async () => {
  const {call,sql} = setup();
  const path='/api/my/courses/version-accountable-1/lessons/lesson-bias/acknowledge';
  assert.equal((await call(path,'synthetic-user-a','POST','https://evil.example')).status,403);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM academy_lesson_progress').get().count,0);
  assert.equal((await call('/api/grant','synthetic-user-a','POST')).status,404);
  assert.equal((await call('/api/admin/grants','synthetic-user-a','POST')).status,404);
});
test('revocation immediately removes access regardless of historic progress', async () => {
  const {call,sql}=setup();
  await call('/api/my/courses/version-accountable-1/lessons/lesson-bias/acknowledge','synthetic-user-a','POST');
  sql.prepare("UPDATE academy_enrollments SET status='revoked' WHERE id='enrollment-a'").run();
  assert.equal((await call('/api/my/courses/version-accountable-1/progress','synthetic-user-a')).status,404);
  assert.equal((await call('/api/my/courses/version-accountable-1/lessons/lesson-bias','synthetic-user-a')).status,404);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM academy_lesson_progress').get().count,1);
});

test('published course identity and versioned lessons cannot be rewritten; superseded version access remains', async () => {
  const {call,sql} = setup();
  assert.throws(()=>sql.prepare("UPDATE academy_lessons SET body_text = 'tampered' WHERE id='lesson-bias'").run(),/immutable/);
  assert.throws(()=>sql.prepare("DELETE FROM academy_lessons WHERE id='lesson-bias'").run(),/immutable/);
  assert.throws(()=>sql.prepare("INSERT INTO academy_lessons(id,version_id,position,title,kind,body_text) VALUES('new','version-accountable-1',5,'Tampered','text','x')").run(),/cannot accept/);
  assert.throws(()=>sql.prepare("UPDATE academy_courses SET title='Rewritten' WHERE id='course-accountable'").run(),/immutable/);
  assert.throws(()=>sql.prepare("UPDATE academy_course_versions SET version_number=9 WHERE id='version-accountable-1'").run(),/immutable/);
  sql.prepare("UPDATE academy_course_versions SET status='superseded' WHERE id='version-accountable-1'").run();
  assert.equal((await call('/api/my/courses/version-accountable-1/progress','synthetic-user-a')).status,200);
  assert.equal((await call('/api/catalog',null)).data.courses.length,0);
});
