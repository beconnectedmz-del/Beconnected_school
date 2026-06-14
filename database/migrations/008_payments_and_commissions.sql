CREATE TABLE transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID REFERENCES users(id),
  course_id        UUID REFERENCES courses(id),
  live_session_id  UUID REFERENCES live_sessions(id),
  gross_amount     DECIMAL(10,2) NOT NULL,
  teacher_amount   DECIMAL(10,2) NOT NULL,
  platform_amount  DECIMAL(10,2) NOT NULL,
  seller_amount    DECIMAL(10,2) DEFAULT 0,
  seller_id        UUID REFERENCES users(id),
  currency         VARCHAR(10) DEFAULT 'MZN',
  payment_method   VARCHAR(100),
  payment_gateway  VARCHAR(100),
  gateway_tx_id    VARCHAR(255),
  payment_status   VARCHAR(50) DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded','disputed')),
  refund_reason    TEXT,
  paid_at          TIMESTAMPTZ,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_student_id      ON transactions(student_id);
CREATE INDEX idx_transactions_course_id       ON transactions(course_id);
CREATE INDEX idx_transactions_seller_id       ON transactions(seller_id);
CREATE INDEX idx_transactions_payment_status  ON transactions(payment_status);
CREATE INDEX idx_transactions_paid_at         ON transactions(paid_at);

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE payouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  UUID REFERENCES users(id) NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  currency      VARCHAR(10) DEFAULT 'MZN',
  period_start  DATE,
  period_end    DATE,
  payout_method VARCHAR(100),
  payout_ref    VARCHAR(255),
  status        VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  processed_by  UUID REFERENCES users(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payouts_recipient_id ON payouts(recipient_id);
CREATE INDEX idx_payouts_status       ON payouts(status);
CREATE INDEX idx_payouts_period       ON payouts(period_start, period_end);

CREATE TRIGGER payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Função para calcular comissões com transacção atómica
CREATE OR REPLACE FUNCTION calculate_and_register_commission(
  p_gross_amount    DECIMAL,
  p_teacher_rate    DECIMAL,
  p_platform_rate   DECIMAL,
  p_affiliate_rate  DECIMAL,
  p_has_affiliate   BOOLEAN
) RETURNS TABLE(teacher DECIMAL, platform DECIMAL, affiliate DECIMAL) AS $$
DECLARE
  v_teacher   DECIMAL;
  v_platform  DECIMAL;
  v_affiliate DECIMAL;
BEGIN
  IF p_has_affiliate THEN
    v_teacher   := ROUND(p_gross_amount * (p_teacher_rate / 100), 2);
    v_affiliate := ROUND(p_gross_amount * (p_affiliate_rate / 100), 2);
    v_platform  := p_gross_amount - v_teacher - v_affiliate;
  ELSE
    v_teacher  := ROUND(p_gross_amount * (p_teacher_rate / 100), 2);
    v_platform := p_gross_amount - v_teacher;
    v_affiliate := 0;
  END IF;

  RETURN QUERY SELECT v_teacher, v_platform, v_affiliate;
END;
$$ LANGUAGE plpgsql;
