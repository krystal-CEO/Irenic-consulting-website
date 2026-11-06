-- LOCAL DEVELOPMENT ONLY. No remote application is authorized.
-- Prevent indirect edits that bypass the original published-content guards.
DROP TRIGGER IF EXISTS academy_no_edit_published_lesson;
CREATE TRIGGER academy_no_edit_published_lesson
BEFORE UPDATE ON academy_lessons
WHEN (SELECT status FROM academy_course_versions WHERE id = OLD.version_id) IN ('published','superseded')
  OR (SELECT status FROM academy_course_versions WHERE id = NEW.version_id) IN ('published','superseded')
BEGIN SELECT RAISE(ABORT, 'published lesson is immutable'); END;
CREATE TRIGGER IF NOT EXISTS academy_no_unpublish_course
BEFORE UPDATE OF status ON academy_courses
WHEN OLD.status IN ('published','retired') AND NEW.status = 'draft'
BEGIN SELECT RAISE(ABORT, 'published course cannot return to draft'); END;
