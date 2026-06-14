CREATE TABLE teacher_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name               VARCHAR(255) NOT NULL,
  bio                     TEXT,
  presentation_video_url  TEXT,
  cv_url                  TEXT,
  credentials             JSONB DEFAULT '[]',
  rating                  DECIMAL(3,2) DEFAULT 0.00 CHECK (rating BETWEEN 0 AND 5),
  total_reviews           INTEGER DEFAULT 0,
  total_students          INTEGER DEFAULT 0,
  total_hours_taught      DECIMAL(10,2) DEFAULT 0,
  is_validated            BOOLEAN DEFAULT FALSE,
  is_featured             BOOLEAN DEFAULT FALSE,
  commission_rate         DECIMAL(5,2) DEFAULT 70.00,
  timezone                VARCHAR(100) DEFAULT 'Africa/Maputo',
  languages               JSONB DEFAULT '["pt"]',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teacher_profiles_user_id      ON teacher_profiles(user_id);
CREATE INDEX idx_teacher_profiles_rating       ON teacher_profiles(rating DESC);
CREATE INDEX idx_teacher_profiles_is_validated ON teacher_profiles(is_validated);
CREATE INDEX idx_teacher_profiles_is_featured  ON teacher_profiles(is_featured);

CREATE TRIGGER teacher_profiles_updated_at
  BEFORE UPDATE ON teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
