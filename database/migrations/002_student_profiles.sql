CREATE TABLE student_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name           VARCHAR(255) NOT NULL,
  date_of_birth       DATE,
  proficiency_level   VARCHAR(50) CHECK (proficiency_level IN ('beginner','intermediate','advanced')),
  learning_goals      TEXT,
  diagnostic_answers  JSONB DEFAULT '{}',
  avatar_url          TEXT,
  parent_id           UUID REFERENCES users(id),
  timezone            VARCHAR(100) DEFAULT 'Africa/Maputo',
  preferred_language  VARCHAR(10)  DEFAULT 'pt',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_profiles_user_id   ON student_profiles(user_id);
CREATE INDEX idx_student_profiles_parent_id ON student_profiles(parent_id);

CREATE TRIGGER student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
