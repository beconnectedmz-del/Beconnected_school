CREATE TABLE feedbacks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID REFERENCES student_profiles(id) ON DELETE SET NULL,
  teacher_id        UUID REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  course_id         UUID REFERENCES courses(id) ON DELETE SET NULL,
  live_session_id   UUID REFERENCES live_sessions(id) ON DELETE SET NULL,
  rating            INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment           TEXT,
  teacher_response  TEXT,
  teacher_response_at TIMESTAMPTZ,
  is_visible        BOOLEAN DEFAULT TRUE,
  flagged_for_review BOOLEAN DEFAULT FALSE,
  flagged_reason    TEXT,
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedbacks_teacher_id        ON feedbacks(teacher_id);
CREATE INDEX idx_feedbacks_student_id        ON feedbacks(student_id);
CREATE INDEX idx_feedbacks_course_id         ON feedbacks(course_id);
CREATE INDEX idx_feedbacks_rating            ON feedbacks(rating);
CREATE INDEX idx_feedbacks_flagged           ON feedbacks(flagged_for_review) WHERE flagged_for_review = TRUE;
CREATE INDEX idx_feedbacks_is_visible        ON feedbacks(is_visible);

-- Actualiza rating do professor automaticamente após feedback
CREATE OR REPLACE FUNCTION update_teacher_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE teacher_profiles
  SET
    rating = (
      SELECT ROUND(AVG(rating)::DECIMAL, 2)
      FROM feedbacks
      WHERE teacher_id = NEW.teacher_id
        AND is_visible = TRUE
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM feedbacks
      WHERE teacher_id = NEW.teacher_id
        AND is_visible = TRUE
    )
  WHERE id = NEW.teacher_id;

  -- Flag automático para revisão se rating <= 2
  IF NEW.rating <= 2 THEN
    UPDATE feedbacks
    SET flagged_for_review = TRUE,
        flagged_reason = 'Rating baixo (≤2) - revisão automática'
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_teacher_rating
  AFTER INSERT OR UPDATE ON feedbacks
  FOR EACH ROW EXECUTE FUNCTION update_teacher_rating();
