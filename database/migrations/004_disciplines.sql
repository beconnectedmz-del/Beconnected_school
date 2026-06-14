CREATE TABLE disciplines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  category    VARCHAR(100),
  description TEXT,
  icon_url    TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disciplines_category  ON disciplines(category);
CREATE INDEX idx_disciplines_is_active ON disciplines(is_active);
CREATE INDEX idx_disciplines_slug      ON disciplines(slug);

CREATE TABLE teacher_disciplines (
  teacher_id    UUID REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  discipline_id UUID REFERENCES disciplines(id) ON DELETE CASCADE,
  level         VARCHAR(50) CHECK (level IN ('basic','intermediate','advanced','all')),
  price_per_hour DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (teacher_id, discipline_id)
);

CREATE INDEX idx_teacher_disciplines_discipline ON teacher_disciplines(discipline_id);

-- Seed: disciplinas iniciais
INSERT INTO disciplines (name, slug, category, description) VALUES
  ('Inglês',          'ingles',       'Línguas',    'Aprendizagem da língua inglesa'),
  ('Francês',         'frances',      'Línguas',    'Aprendizagem da língua francesa'),
  ('Português',       'portugues',    'Línguas',    'Gramática e redação em português'),
  ('Matemática',      'matematica',   'Ciências',   'Álgebra, cálculo e geometria'),
  ('Física',          'fisica',       'Ciências',   'Mecânica, termodinâmica e electromagnetismo'),
  ('Química',         'quimica',      'Ciências',   'Química orgânica e inorgânica'),
  ('Biologia',        'biologia',     'Ciências',   'Genética, ecologia e fisiologia'),
  ('Programação',     'programacao',  'Tecnologia', 'Python, JavaScript, Go e mais'),
  ('Música',          'musica',       'Artes',      'Teoria musical e instrumentos'),
  ('Desenho e Arte',  'arte',         'Artes',      'Ilustração digital e tradicional');
