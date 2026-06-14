CREATE TABLE enrollments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  course_id        UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at      TIMESTAMPTZ DEFAULT NOW(),
  progress_percent DECIMAL(5,2) DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  last_accessed_at TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  status           VARCHAR(50) DEFAULT 'active'
    CHECK (status IN ('active','completed','cancelled','expired')),
  certificate_url  TEXT,
  UNIQUE(student_id, course_id)
);

CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_course_id  ON enrollments(course_id);
CREATE INDEX idx_enrollments_status     ON enrollments(status);

CREATE TABLE lesson_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id     UUID REFERENCES lessons(id) ON DELETE CASCADE,
  watched_seconds INTEGER DEFAULT 0,
  completed     BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);

CREATE TRIGGER lesson_progress_updated_at
  BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Actualiza progresso do enrollment automaticamente
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  new_progress DECIMAL(5,2);
BEGIN
  SELECT COUNT(*) INTO total_lessons
  FROM lessons l
  JOIN enrollments e ON e.id = NEW.enrollment_id
  WHERE l.course_id = e.course_id AND l.status = 'approved';

  SELECT COUNT(*) INTO completed_lessons
  FROM lesson_progress
  WHERE enrollment_id = NEW.enrollment_id AND completed = TRUE;

  IF total_lessons > 0 THEN
    new_progress := (completed_lessons::DECIMAL / total_lessons) * 100;
  ELSE
    new_progress := 0;
  END IF;

  UPDATE enrollments
  SET progress_percent = new_progress,
      last_accessed_at = NOW(),
      completed_at = CASE WHEN new_progress = 100 THEN NOW() ELSE completed_at END,
      status = CASE WHEN new_progress = 100 THEN 'completed' ELSE status END
  WHERE id = NEW.enrollment_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_enrollment_progress
  AFTER INSERT OR UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_enrollment_progress();
