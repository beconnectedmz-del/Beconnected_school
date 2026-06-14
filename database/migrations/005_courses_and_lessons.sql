CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  discipline_id   UUID REFERENCES disciplines(id),
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  level           VARCHAR(50)  CHECK (level IN ('beginner','intermediate','advanced')),
  price           DECIMAL(10,2) NOT NULL,
  lesson_type     VARCHAR(50)   CHECK (lesson_type IN ('live','recorded','hybrid')),
  total_hours     DECIMAL(5,2),
  total_lessons   INTEGER DEFAULT 0,
  enrolled_count  INTEGER DEFAULT 0,
  is_published    BOOLEAN DEFAULT FALSE,
  is_validated    BOOLEAN DEFAULT FALSE,
  is_featured     BOOLEAN DEFAULT FALSE,
  thumbnail_url   TEXT,
  promo_video_url TEXT,
  tags            JSONB DEFAULT '[]',
  meta_title      VARCHAR(255),
  meta_description TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_teacher_id    ON courses(teacher_id);
CREATE INDEX idx_courses_discipline_id ON courses(discipline_id);
CREATE INDEX idx_courses_is_published  ON courses(is_published);
CREATE INDEX idx_courses_is_validated  ON courses(is_validated);
CREATE INDEX idx_courses_lesson_type   ON courses(lesson_type);
CREATE INDEX idx_courses_level         ON courses(level);
CREATE INDEX idx_courses_price         ON courses(price);

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE lessons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        UUID REFERENCES courses(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  lesson_order     INTEGER NOT NULL,
  video_url        TEXT,
  thumbnail_url    TEXT,
  duration_minutes INTEGER,
  is_free_preview  BOOLEAN DEFAULT FALSE,
  status           VARCHAR(50) DEFAULT 'draft'
    CHECK (status IN ('draft','pending_review','approved','rejected')),
  rejection_reason TEXT,
  resources        JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_status    ON lessons(status);
CREATE INDEX idx_lessons_order     ON lessons(course_id, lesson_order);

CREATE TRIGGER lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
