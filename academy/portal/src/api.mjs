// Irenic Academy learner API. No browser-supplied user ID, admin role or enrollment is trusted.
const response = (status, body) => Response.json(body, { status, headers: {
  'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer', 'vary': 'Cookie'
} });
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(value);
const read = (db, sql, ...args) => db.prepare(sql).bind(...args).first();
const rows = (db, sql, ...args) => db.prepare(sql).bind(...args).all();

async function authorizedEnrollment(db, userId, versionId) {
  return read(db, `SELECT e.id, e.user_id, e.version_id, e.status, c.title AS course_title,
      v.version_number AS course_version
    FROM academy_enrollments e
    JOIN academy_course_versions v ON v.id = e.version_id
    JOIN academy_courses c ON c.id = v.course_id
    WHERE e.user_id = ? AND e.version_id = ? AND e.status IN ('active','completed')
      AND v.status = 'published' AND c.status = 'published'`, userId, versionId);
}
async function accessibleLesson(db, userId, versionId, lessonId) {
  const enrollment = await authorizedEnrollment(db, userId, versionId);
  if (!enrollment) return null;
  const lesson = await read(db, `SELECT id, version_id, position, kind, title, body_text, required
    FROM academy_lessons WHERE id = ? AND version_id = ?`, lessonId, versionId);
  return lesson ? { enrollment, lesson } : null;
}
async function prerequisitesMet(db, enrollmentId, versionId, position) {
  const result = await read(db, `SELECT COUNT(*) AS missing FROM academy_lessons l
    LEFT JOIN academy_lesson_progress p ON p.enrollment_id = ? AND p.lesson_id = l.id
    WHERE l.version_id = ? AND l.position < ? AND l.required = 1 AND p.lesson_id IS NULL`,
    enrollmentId, versionId, position);
  return Number(result?.missing || 0) === 0;
}

export async function handleAcademyApi(request, env, getSession) {
  const url = new URL(request.url);
  const db = env.ACADEMY_DB;
  if (!db?.prepare) return response(503, { error: 'academy_storage_unavailable' });
  if (request.method === 'GET' && url.pathname === '/api/catalog') {
    const result = await rows(db, `SELECT c.slug, c.title, c.summary, v.id AS version_id
      FROM academy_courses c JOIN academy_course_versions v ON v.course_id = c.id
      WHERE c.status = 'published' AND v.status = 'published'
      ORDER BY c.title LIMIT 100`);
    return response(200, { courses: result.results || [] });
  }
  if (request.method !== 'GET') {
    if (request.method !== 'POST') return response(405, { error: 'method_not_allowed' });
    if (request.headers.get('origin') !== new URL(env.ACADEMY_ORIGIN).origin)
      return response(403, { error: 'invalid_origin' });
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return response(415, { error: 'json_required' });
    if (Number(request.headers.get('content-length') || 0) > 256)
      return response(413, { error: 'body_too_large' });
  }
  let session;
  try { session = await getSession({ headers: request.headers }); }
  catch { return response(503, { error: 'authentication_unavailable' }); }
  const user = session?.user;
  if (!validId(user?.id)) return response(401, { error: 'sign_in_required' });
  if (user.emailVerified !== true) return response(403, { error: 'email_verification_required' });
  if (request.method === 'GET' && url.pathname === '/api/me') {
    return response(200, { user: { name: user.name, email: user.email } });
  }
  if (request.method === 'GET' && url.pathname === '/api/my/courses') {
    const result = await rows(db, `SELECT e.version_id, e.status, c.title,
        v.version_number FROM academy_enrollments e
        JOIN academy_course_versions v ON v.id = e.version_id
        JOIN academy_courses c ON c.id = v.course_id
        WHERE e.user_id = ? AND e.status IN ('active','completed')
        AND v.status = 'published' AND c.status = 'published'
        ORDER BY c.title LIMIT 100`, user.id);
    return response(200, { courses: result.results || [] });
  }
  const progress = url.pathname.match(/^\/api\/my\/courses\/([^/]+)\/progress$/);
  if (progress && request.method === 'GET') {
    const versionId = progress[1];
    if (!validId(versionId)) return response(404, { error: 'not_found' });
    const enrollment = await authorizedEnrollment(db, user.id, versionId);
    if (!enrollment) return response(404, { error: 'not_found' });
    const result = await rows(db, `SELECT l.id, l.position, l.kind, l.title, l.required,
      p.completed_at FROM academy_lessons l
      LEFT JOIN academy_lesson_progress p ON p.enrollment_id = ? AND p.lesson_id = l.id
      WHERE l.version_id = ? ORDER BY l.position`, enrollment.id, versionId);
    return response(200, { title: enrollment.course_title,
      version: enrollment.course_version, lessons: result.results || [] });
  }
  const path = url.pathname.match(/^\/api\/my\/courses\/([^/]+)\/lessons\/([^/]+)(\/acknowledge)?$/);
  if (path && (request.method === 'GET' || request.method === 'POST')) {
    const [, versionId, lessonId, action] = path;
    if (!validId(versionId) || !validId(lessonId)) return response(404, { error: 'not_found' });
    if (request.method === 'POST' && action !== '/acknowledge') return response(405, { error: 'method_not_allowed' });
    if (request.method === 'GET' && action) return response(405, { error: 'method_not_allowed' });
    const match = await accessibleLesson(db, user.id, versionId, lessonId);
    if (!match) return response(404, { error: 'not_found' });
    const { enrollment, lesson } = match;
    if (!await prerequisitesMet(db, enrollment.id, versionId, lesson.position))
      return response(423, { error: 'complete_previous_required_lessons' });
    if (request.method === 'GET') {
      // Only text lessons are unlocked in this phase; video and file content stay private.
      if (lesson.kind !== 'text') return response(403, { error: 'lesson_format_not_yet_available' });
      return response(200, { lesson: {
        id: lesson.id, title: lesson.title, kind: lesson.kind, body_text: lesson.body_text,
        note: 'A learner acknowledgement is not proof of CE participation.'
      } });
    }
    if (lesson.kind !== 'text') return response(403, { error: 'cannot_self_complete_lesson' });
    await db.prepare(`INSERT INTO academy_lesson_progress
      (enrollment_id, lesson_id, completed_at, evidence_type)
      VALUES (?, ?, ?, 'learner_acknowledgement')
      ON CONFLICT(enrollment_id, lesson_id) DO NOTHING`)
      .bind(enrollment.id, lesson.id, new Date().toISOString()).run();
    return response(200, { status: 'acknowledged',
      warning: 'This acknowledgement alone does not establish course or CE completion.' });
  }
  // There is intentionally no public grant, admin escalation, payment, grading or certificate endpoint.
  return response(404, { error: 'not_found' });
}
