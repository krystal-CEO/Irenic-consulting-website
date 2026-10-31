-- ACADEMY LOCAL-ONLY DEVELOPMENT SCHEMA. Do not apply remotely.
-- Auth tables must be independently reconciled with the installed Better Auth CLI's
-- generated schema before ANY remote deployment (versions may add columns).
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS "user" (
 "id" TEXT PRIMARY KEY NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL UNIQUE,
 "emailVerified" INTEGER NOT NULL DEFAULT 0, "image" TEXT,
 "createdAt" INTEGER NOT NULL, "updatedAt" INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "session" (
 "id" TEXT PRIMARY KEY NOT NULL, "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
 "token" TEXT NOT NULL UNIQUE, "expiresAt" INTEGER NOT NULL,
 "ipAddress" TEXT, "userAgent" TEXT, "createdAt" INTEGER NOT NULL, "updatedAt" INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_session_user ON "session"("userId");
CREATE TABLE IF NOT EXISTS "account" (
 "id" TEXT PRIMARY KEY NOT NULL, "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
 "accountId" TEXT NOT NULL, "providerId" TEXT NOT NULL, "accessToken" TEXT,
 "refreshToken" TEXT, "accessTokenExpiresAt" INTEGER, "refreshTokenExpiresAt" INTEGER,
 "scope" TEXT, "idToken" TEXT, "password" TEXT,
 "createdAt" INTEGER NOT NULL, "updatedAt" INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_account_user ON "account"("userId");
CREATE TABLE IF NOT EXISTS "verification" (
 "id" TEXT PRIMARY KEY NOT NULL, "identifier" TEXT NOT NULL, "value" TEXT NOT NULL,
 "expiresAt" INTEGER NOT NULL, "createdAt" INTEGER NOT NULL, "updatedAt" INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_verification_identifier ON "verification"("identifier");
CREATE TABLE IF NOT EXISTS "rateLimit" (
 "id" TEXT PRIMARY KEY NOT NULL, "key" TEXT NOT NULL UNIQUE,
 "count" INTEGER NOT NULL, "lastRequest" INTEGER NOT NULL
);

-- Public-facing course metadata is separate from any consultation/therapy client records.
CREATE TABLE IF NOT EXISTS academy_courses (
 id TEXT PRIMARY KEY NOT NULL, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 summary TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
 CHECK(status IN ('draft','published','retired'))
);
CREATE TABLE IF NOT EXISTS academy_course_versions (
 id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL REFERENCES academy_courses(id),
 version_number INTEGER NOT NULL CHECK(version_number > 0),
 status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL,
 content_digest TEXT, UNIQUE(course_id,version_number),
 CHECK(status IN ('draft','published','superseded'))
);
CREATE TABLE IF NOT EXISTS academy_lessons (
 id TEXT PRIMARY KEY NOT NULL, version_id TEXT NOT NULL REFERENCES academy_course_versions(id),
 position INTEGER NOT NULL CHECK(position >= 1), title TEXT NOT NULL,
 kind TEXT NOT NULL, body_text TEXT,
 required INTEGER NOT NULL DEFAULT 1 CHECK(required IN (0,1)),
 UNIQUE(version_id,position), CHECK(kind IN ('text','video','download'))
);
-- Enrollments are written only by a future verified payment webhook or separately
-- audited staff grant. There is intentionally no learner-facing enrollment endpoint.
CREATE TABLE IF NOT EXISTS academy_enrollments (
 id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES "user"("id"),
 version_id TEXT NOT NULL REFERENCES academy_course_versions(id),
 source TEXT NOT NULL, source_ref TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
 created_at TEXT NOT NULL, UNIQUE(user_id,version_id), UNIQUE(source,source_ref),
 CHECK(source IN ('verified_payment','admin_grant')),
 CHECK(status IN ('active','completed','revoked'))
);
CREATE TABLE IF NOT EXISTS academy_lesson_progress (
 enrollment_id TEXT NOT NULL REFERENCES academy_enrollments(id),
 lesson_id TEXT NOT NULL REFERENCES academy_lessons(id),
 completed_at TEXT NOT NULL, evidence_type TEXT NOT NULL,
 PRIMARY KEY(enrollment_id,lesson_id),
 CHECK(evidence_type IN ('learner_acknowledgement','verified_activity'))
);
CREATE TABLE IF NOT EXISTS academy_admin_roles (
 user_id TEXT NOT NULL REFERENCES "user"("id"),
 role TEXT NOT NULL, granted_by TEXT NOT NULL, granted_at TEXT NOT NULL,
 revoked_at TEXT, PRIMARY KEY(user_id,role),
 CHECK(role IN ('admin','editor','support','compliance'))
);
CREATE TABLE IF NOT EXISTS academy_audit_events (
 id TEXT PRIMARY KEY NOT NULL, actor_id TEXT, action TEXT NOT NULL,
 resource_type TEXT NOT NULL, resource_id TEXT NOT NULL,
 created_at TEXT NOT NULL, reason TEXT, details_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS academy_access_user ON academy_enrollments(user_id,status);
CREATE INDEX IF NOT EXISTS academy_lessons_version ON academy_lessons(version_id,position);

-- Published course identity and published-version lesson content are immutable.
-- Future revisions must create new draft versions rather than overwrite history.
CREATE TRIGGER IF NOT EXISTS academy_lock_course_identity
BEFORE UPDATE OF slug, title, summary ON academy_courses
WHEN OLD.status IN ('published','retired')
BEGIN SELECT RAISE(ABORT, 'published course identity is immutable'); END;
CREATE TRIGGER IF NOT EXISTS academy_lock_published_version
BEFORE UPDATE OF course_id, version_number, created_at, content_digest ON academy_course_versions
WHEN OLD.status IN ('published','superseded')
BEGIN SELECT RAISE(ABORT, 'published course version is immutable'); END;
CREATE TRIGGER IF NOT EXISTS academy_no_unpublish_version
BEFORE UPDATE OF status ON academy_course_versions
WHEN OLD.status IN ('published','superseded') AND NEW.status = 'draft'
BEGIN SELECT RAISE(ABORT, 'published version cannot return to draft'); END;
CREATE TRIGGER IF NOT EXISTS academy_no_edit_published_lesson
BEFORE UPDATE ON academy_lessons
WHEN (SELECT status FROM academy_course_versions WHERE id = OLD.version_id) IN ('published','superseded')
BEGIN SELECT RAISE(ABORT, 'published lesson is immutable'); END;
CREATE TRIGGER IF NOT EXISTS academy_no_delete_published_lesson
BEFORE DELETE ON academy_lessons
WHEN (SELECT status FROM academy_course_versions WHERE id = OLD.version_id) IN ('published','superseded')
BEGIN SELECT RAISE(ABORT, 'published lesson is immutable'); END;
CREATE TRIGGER IF NOT EXISTS academy_no_insert_published_lesson
BEFORE INSERT ON academy_lessons
WHEN (SELECT status FROM academy_course_versions WHERE id = NEW.version_id) IN ('published','superseded')
BEGIN SELECT RAISE(ABORT, 'published version cannot accept new lessons'); END;
