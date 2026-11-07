-- Test fixtures ONLY. Never use on a deployed database.
INSERT INTO "user"("id","name","email","emailVerified","createdAt","updatedAt") VALUES
 ('synthetic-user-a','Synthetic Learner A','learner-a@example.invalid',1,0,0),
 ('synthetic-user-b','Synthetic Learner B','learner-b@example.invalid',1,0,0),
 ('synthetic-unverified','Synthetic Unverified','unverified@example.invalid',0,0,0);
INSERT INTO academy_courses(id,slug,title,summary,status) VALUES
 ('course-accountable','culturally-accountable-clinical-supervision','Culturally Accountable Clinical Supervision',
 'A draft professional-development module on bias awareness, equitable caseloads and supervisor accountability. No CE credit is claimed.','draft'),
 ('course-internal','internal-draft','Unpublished course','This must remain private.','draft');
INSERT INTO academy_course_versions(id,course_id,version_number,status,created_at) VALUES
 ('version-accountable-1','course-accountable',1,'draft','2026-10-31T00:00:00Z'),
 ('version-draft-1','course-internal',1,'draft','2026-10-31T00:00:00Z');
INSERT INTO academy_lessons(id,version_id,position,title,kind,body_text,required) VALUES
 ('lesson-bias','version-accountable-1',1,'Recognizing bias in supervision','text',
 'Practice prompt: Describe two ways assumptions about identity or communication styles could affect a supervisory evaluation. This is a draft instructional exercise, not approved CE content.',1),
 ('lesson-caseload','version-accountable-1',2,'Equitable caseload assignment','text',
 'Practice prompt: Identify transparent factors for assigning caseloads and how supervisors would document exceptions. This is draft instructional material.',1),
 ('lesson-accountability','version-accountable-1',3,'Accountability and repair','text',
 'Practice prompt: Outline how a supervisor could review inequities, obtain feedback, and track corrective action over time. This is draft instructional material.',1),
 ('lesson-secret','version-draft-1',1,'Unpublished lesson','text','Private draft must not be exposed.',1);
INSERT INTO academy_enrollments(id,user_id,version_id,source,source_ref,status,created_at) VALUES
 ('enrollment-a','synthetic-user-a','version-accountable-1','admin_grant','synthetic-1','active','2026-10-31T00:00:00Z'),
 ('enrollment-b','synthetic-user-b','version-accountable-1','admin_grant','synthetic-2','revoked','2026-10-31T00:00:00Z'),
 ('enrollment-unverified','synthetic-unverified','version-accountable-1','admin_grant','synthetic-3','active','2026-10-31T00:00:00Z');

-- Publish only after all draft content has been inserted.
UPDATE academy_course_versions SET status = 'published' WHERE id = 'version-accountable-1';
UPDATE academy_courses SET status = 'published' WHERE id = 'course-accountable';
