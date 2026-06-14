-- Add package support to enrollments
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS package_type VARCHAR(20) DEFAULT 'basic'
    CHECK (package_type IN ('basic','lite','premium')),
  ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 500.00,
  ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');

-- Course packages (3 tiers per course)
CREATE TABLE IF NOT EXISTS course_packages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID REFERENCES courses(id) ON DELETE CASCADE,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('basic','lite','premium')),
  name          VARCHAR(100) NOT NULL,
  monthly_price DECIMAL(10,2) NOT NULL,
  description   TEXT,
  features      JSONB DEFAULT '[]',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, type)
);
CREATE INDEX IF NOT EXISTS idx_course_packages_course ON course_packages(course_id);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  type             VARCHAR(50) NOT NULL CHECK (type IN ('email','push','in_app','sms')),
  status           VARCHAR(50) DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','completed','cancelled')),
  target_segment   VARCHAR(100) DEFAULT 'all',
  subject          VARCHAR(500),
  content          TEXT,
  discount_percent INTEGER DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  promo_code       VARCHAR(50),
  target_course_id UUID REFERENCES courses(id),
  scheduled_at     TIMESTAMPTZ,
  launched_at      TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  target_count     INTEGER DEFAULT 0,
  sent_count       INTEGER DEFAULT 0,
  opened_count     INTEGER DEFAULT 0,
  clicked_count    INTEGER DEFAULT 0,
  converted_count  INTEGER DEFAULT 0,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status  ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON campaigns(created_at DESC);

-- Segments
CREATE TABLE IF NOT EXISTS segments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  criteria         JSONB DEFAULT '{}',
  member_count     INTEGER DEFAULT 0,
  last_computed_at TIMESTAMPTZ,
  is_system        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Default segments
INSERT INTO segments (name, description, criteria, is_system) VALUES
  ('Todos os utilizadores','Todos os alunos inscritos','{"type":"all"}'::jsonb, true),
  ('Subscritores Básico','Alunos com pacote Básico (500 MZN/mês)','{"package_type":"basic"}'::jsonb, true),
  ('Subscritores Lite','Alunos com pacote Lite (1500 MZN/mês)','{"package_type":"lite"}'::jsonb, true),
  ('Subscritores Premium','Alunos com pacote Premium (3500 MZN/mês)','{"package_type":"premium"}'::jsonb, true),
  ('Inativos (30+ dias)','Alunos sem actividade há mais de 30 dias','{"type":"inactive","days":30}'::jsonb, true),
  ('Novos leads','Leads captados nos últimos 7 dias','{"type":"new_leads","days":7}'::jsonb, true)
ON CONFLICT DO NOTHING;

-- Seed default packages for existing courses
INSERT INTO course_packages (course_id, type, name, monthly_price, description, features)
SELECT id,'basic','Básico',500.00,'Acesso a todas as aulas gravadas','["Aulas gravadas","Acesso 24/7","Certificado de conclusão","Suporte via chat"]'::jsonb FROM courses ON CONFLICT DO NOTHING;

INSERT INTO course_packages (course_id, type, name, monthly_price, description, features)
SELECT id,'lite','Lite',1500.00,'Aulas gravadas + sessões ao vivo em horários predefinidos','["Tudo do Básico","Sessões ao vivo em grupo","Horários fixos mensais","Q&A ao vivo com o professor"]'::jsonb FROM courses ON CONFLICT DO NOTHING;

INSERT INTO course_packages (course_id, type, name, monthly_price, description, features)
SELECT id,'premium','Premium',3500.00,'Aulas gravadas + aulas personalizadas no horário do aluno','["Tudo do Lite","Aulas 1:1 personalizadas","Horário totalmente flexível","Plano de estudo individual","Acesso prioritário"]'::jsonb FROM courses ON CONFLICT DO NOTHING;
