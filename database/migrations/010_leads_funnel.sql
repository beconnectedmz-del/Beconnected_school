CREATE TABLE leads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                VARCHAR(255),
  name                 VARCHAR(255),
  phone                VARCHAR(50),
  interest_discipline  VARCHAR(255),
  interest_level       VARCHAR(50),
  source               VARCHAR(100) DEFAULT 'organic',
  affiliate_code       VARCHAR(100),
  utm_source           VARCHAR(100),
  utm_medium           VARCHAR(100),
  utm_campaign         VARCHAR(100),
  ip_address           INET,
  user_agent           TEXT,
  status               VARCHAR(50) DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','converted','lost','unsubscribed')),
  converted_user_id    UUID REFERENCES users(id),
  converted_at         TIMESTAMPTZ,
  contacted_at         TIMESTAMPTZ,
  next_follow_up_at    TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_email          ON leads(email);
CREATE INDEX idx_leads_status         ON leads(status);
CREATE INDEX idx_leads_affiliate_code ON leads(affiliate_code);
CREATE INDEX idx_leads_source         ON leads(source);
CREATE INDEX idx_leads_created_at     ON leads(created_at DESC);

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE affiliates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  affiliate_code    VARCHAR(100) UNIQUE NOT NULL,
  commission_rate   DECIMAL(5,2) DEFAULT 10.00,
  total_earned      DECIMAL(10,2) DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_clicks      INTEGER DEFAULT 0,
  payout_method     VARCHAR(100),
  payout_details    JSONB DEFAULT '{}',
  is_active         BOOLEAN DEFAULT TRUE,
  approved_at       TIMESTAMPTZ,
  approved_by       UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_affiliates_user_id        ON affiliates(user_id);
CREATE INDEX idx_affiliates_affiliate_code ON affiliates(affiliate_code);
CREATE INDEX idx_affiliates_is_active      ON affiliates(is_active);

CREATE TRIGGER affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Registar clique em link de afiliado
CREATE TABLE affiliate_clicks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id   UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  ip_address     INET,
  user_agent     TEXT,
  referrer       TEXT,
  landing_page   TEXT,
  clicked_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_affiliate_clicks_affiliate ON affiliate_clicks(affiliate_id);
CREATE INDEX idx_affiliate_clicks_clicked   ON affiliate_clicks(clicked_at DESC);
