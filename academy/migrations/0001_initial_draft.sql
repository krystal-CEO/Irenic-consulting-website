-- Irenic Academy: initial DESIGN DRAFT. Do not apply to production.
-- Separate Cloudflare D1 database only (never CONSULTING_DB).
PRAGMA foreign_keys = ON;
CREATE TABLE learners (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
 email_verified_at TEXT, created_at TEXT NOT NULL, disabled_at TEXT
);
CREATE TABLE learner_licenses (
 id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES learners(id),
 jurisdiction TEXT NOT NULL, profession TEXT NOT NULL, license_number TEXT,
 created_at TEXT NOT NULL,
 CHECK(length(jurisdiction) BETWEEN 2 AND 30)
);
CREATE TABLE admin_roles (
 learner_id TEXT NOT NULL REFERENCES learners(id), role TEXT NOT NULL,
 granted_by TEXT NOT NULL, granted_at TEXT NOT NULL, revoked_at TEXT,
 PRIMARY KEY(learner_id, role), CHECK(role IN ('admin','editor','support','compliance'))
);
CREATE TABLE courses (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft',
 created_at TEXT NOT NULL, retired_at TEXT,
 CHECK(status IN ('draft','published','retired'))
);
CREATE TABLE course_versions (
 id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id),
 version_number INTEGER NOT NULL CHECK(version_number>0), content_digest TEXT NOT NULL,
 policy_json TEXT NOT NULL, published_at TEXT, superseded_at TEXT,
 UNIQUE(course_id,version_number), UNIQUE(id,course_id)
);
CREATE TABLE course_lessons (
 id TEXT PRIMARY KEY, course_version_id TEXT NOT NULL REFERENCES course_versions(id),
 sort_order INTEGER NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL,
 private_asset_key TEXT, content_json TEXT NOT NULL,
 required INTEGER NOT NULL DEFAULT 1 CHECK(required IN (0,1)),
 UNIQUE(course_version_id,sort_order),
 CHECK(kind IN ('text','video','download'))
);
CREATE TABLE assessment_versions (
 id TEXT PRIMARY KEY, course_version_id TEXT NOT NULL REFERENCES course_versions(id),
 passing_percent INTEGER NOT NULL CHECK(passing_percent BETWEEN 0 AND 100),
 max_attempts INTEGER, questions_json TEXT NOT NULL, answers_private_json TEXT NOT NULL,
 CHECK(max_attempts IS NULL OR max_attempts>0)
);
CREATE TABLE price_versions (
 id TEXT PRIMARY KEY, course_version_id TEXT NOT NULL REFERENCES course_versions(id),
 amount_minor INTEGER NOT NULL CHECK(amount_minor>=0), currency TEXT NOT NULL,
 checkout_enabled INTEGER NOT NULL DEFAULT 0 CHECK(checkout_enabled IN(0,1)),
 effective_at TEXT NOT NULL
);
CREATE TABLE orders (
 id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES learners(id),
 course_version_id TEXT NOT NULL REFERENCES course_versions(id),
 price_version_id TEXT NOT NULL REFERENCES price_versions(id),
 provider TEXT NOT NULL, provider_account_id TEXT NOT NULL,
 checkout_session_id TEXT UNIQUE, payment_intent_id TEXT UNIQUE,
 amount_minor INTEGER NOT NULL CHECK(amount_minor>=0), currency TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, paid_at TEXT,
 CHECK(status IN ('pending','paid','failed','canceled','refunded','disputed'))
);
CREATE TABLE payment_events (
 provider TEXT NOT NULL, provider_account_id TEXT NOT NULL, event_id TEXT NOT NULL,
 event_type TEXT NOT NULL, payload_digest TEXT NOT NULL,
 received_at TEXT NOT NULL, processed_at TEXT, error_code TEXT,
 PRIMARY KEY(provider,provider_account_id,event_id)
);
CREATE TABLE enrollments (
 id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES learners(id),
 course_version_id TEXT NOT NULL REFERENCES course_versions(id),
 source_order_id TEXT UNIQUE REFERENCES orders(id),
 admin_grant_id TEXT UNIQUE,
 status TEXT NOT NULL DEFAULT 'active',
 enrolled_at TEXT NOT NULL, revoked_at TEXT,
 UNIQUE(learner_id,course_version_id),
 CHECK((source_order_id IS NOT NULL) <> (admin_grant_id IS NOT NULL)),
 CHECK(status IN ('active','completed','revoked'))
);
CREATE TABLE admin_grants (
 id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES learners(id),
 course_version_id TEXT NOT NULL REFERENCES course_versions(id),
 granted_by TEXT NOT NULL, reason TEXT NOT NULL, granted_at TEXT NOT NULL
);
CREATE TABLE lesson_progress (
 enrollment_id TEXT NOT NULL REFERENCES enrollments(id),
 lesson_id TEXT NOT NULL REFERENCES course_lessons(id),
 completed_at TEXT NOT NULL, evidence_json TEXT NOT NULL,
 PRIMARY KEY(enrollment_id,lesson_id)
);
CREATE TABLE assessment_attempts (
 id TEXT PRIMARY KEY, enrollment_id TEXT NOT NULL REFERENCES enrollments(id),
 assessment_version_id TEXT NOT NULL REFERENCES assessment_versions(id),
 attempt_number INTEGER NOT NULL, score_percent INTEGER NOT NULL,
 passed INTEGER NOT NULL CHECK(passed IN(0,1)),
 started_at TEXT NOT NULL, submitted_at TEXT NOT NULL,
 evidence_digest TEXT NOT NULL,
 UNIQUE(enrollment_id,assessment_version_id,attempt_number)
);
CREATE TABLE evaluations (
 id TEXT PRIMARY KEY, enrollment_id TEXT NOT NULL UNIQUE REFERENCES enrollments(id),
 form_version TEXT NOT NULL, submitted_at TEXT NOT NULL, response_private_json TEXT NOT NULL
);
CREATE TABLE certificates (
 id TEXT PRIMARY KEY, certificate_code TEXT NOT NULL UNIQUE,
 enrollment_id TEXT NOT NULL REFERENCES enrollments(id),
 course_version_id TEXT NOT NULL REFERENCES course_versions(id),
 credit_decision_id TEXT, issued_at TEXT NOT NULL,
 recipient_name_snapshot TEXT NOT NULL, title_snapshot TEXT NOT NULL,
 pdf_private_asset_key TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'issued', supersedes_id TEXT REFERENCES certificates(id),
 reason TEXT, revoked_at TEXT, revoked_by TEXT,
 CHECK(status IN ('issued','revoked','superseded'))
);
CREATE TABLE ce_eligibility_decisions (
 id TEXT PRIMARY KEY, course_version_id TEXT NOT NULL REFERENCES course_versions(id),
 jurisdiction TEXT NOT NULL, profession TEXT NOT NULL, format TEXT NOT NULL,
 credit_category TEXT, credit_minutes INTEGER, status TEXT NOT NULL,
 provider_approval_id TEXT, wording TEXT, official_source_url TEXT NOT NULL,
 verified_at TEXT NOT NULL, review_due_at TEXT,
 CHECK(status IN ('unverified','approved','not_applicable','restricted')),
 CHECK(credit_minutes IS NULL OR credit_minutes>=0)
);
CREATE TABLE audit_events (
 id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL, resource_type TEXT NOT NULL,
 resource_id TEXT NOT NULL, reason TEXT, created_at TEXT NOT NULL, details_json TEXT NOT NULL
);
CREATE INDEX idx_orders_learner ON orders(learner_id,status);
CREATE INDEX idx_enrollments_learner ON enrollments(learner_id,status);
CREATE INDEX idx_attempts_enrollment ON assessment_attempts(enrollment_id,submitted_at);
CREATE INDEX idx_certificates_enrollment ON certificates(enrollment_id,issued_at);
CREATE INDEX idx_payment_events_processing ON payment_events(processed_at,received_at);
-- IMPORTANT: This schema cannot by itself enforce cross-table completion and
-- payment invariants, immutability, authorization, or safe asset access.
-- Add transactionally checked service logic and negative security tests.
