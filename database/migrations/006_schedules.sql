CREATE TABLE teacher_availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  timezone     VARCHAR(100) DEFAULT 'Africa/Maputo',
  is_active    BOOLEAN DEFAULT TRUE,
  CONSTRAINT no_time_overlap CHECK (start_time < end_time)
);

CREATE INDEX idx_teacher_availability_teacher  ON teacher_availability(teacher_id);
CREATE INDEX idx_teacher_availability_day      ON teacher_availability(day_of_week);

CREATE TABLE live_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id       UUID REFERENCES teacher_profiles(id),
  course_id        UUID REFERENCES courses(id),
  student_id       UUID REFERENCES student_profiles(id),
  scheduled_at     TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status           VARCHAR(50) DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','live','completed','cancelled','no_show','rescheduled')),
  room_id          VARCHAR(255) UNIQUE,
  recording_url    TEXT,
  join_url         TEXT,
  cancellation_reason TEXT,
  cancelled_by     UUID REFERENCES users(id),
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_sessions_teacher_id    ON live_sessions(teacher_id);
CREATE INDEX idx_live_sessions_student_id    ON live_sessions(student_id);
CREATE INDEX idx_live_sessions_course_id     ON live_sessions(course_id);
CREATE INDEX idx_live_sessions_status        ON live_sessions(status);
CREATE INDEX idx_live_sessions_scheduled_at  ON live_sessions(scheduled_at);

CREATE TRIGGER live_sessions_updated_at
  BEFORE UPDATE ON live_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
