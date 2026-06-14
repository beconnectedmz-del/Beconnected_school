-- ═══════════════════════════════════════════════════════════════════════════
-- EduHub — Seed de Desenvolvimento
-- Cobre todos os fluxos: auth, 2FA, cursos, sessões, pagamentos, feedback
-- Senha de todos os utilizadores: EduHub@2024
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Como correr:
--   docker exec -i eduhub-postgres psql -U eduhub_user -d eduhub < database/seeds/seed.sql
-- Ou via Make:
--   make seed
--
-- Todos os IDs de seed começam com 'deadbeef-dead-dead-'
-- para identificação e limpeza fáceis.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Limpeza da seed anterior (ordem de dependência FK) ───────────────────────
DELETE FROM lesson_progress
  WHERE id::text LIKE 'deadbeef-dead-dead-a11c-%';

DELETE FROM enrollments
  WHERE id::text LIKE 'deadbeef-dead-dead-b0a7-%';

DELETE FROM feedbacks
  WHERE id::text LIKE 'deadbeef-dead-dead-f33d-%';

DELETE FROM transactions
  WHERE id::text LIKE 'deadbeef-dead-dead-ca5e-%';

DELETE FROM live_sessions
  WHERE id::text LIKE 'deadbeef-dead-dead-bad0-%';

DELETE FROM lessons
  WHERE id::text LIKE 'deadbeef-dead-dead-feed-%';

DELETE FROM courses
  WHERE id::text LIKE 'deadbeef-dead-dead-face-%';

DELETE FROM affiliate_clicks
  WHERE affiliate_id::text LIKE 'deadbeef-dead-dead-afaf-%';

DELETE FROM affiliates
  WHERE id::text LIKE 'deadbeef-dead-dead-afaf-%';

DELETE FROM leads
  WHERE id::text LIKE 'deadbeef-dead-dead-1ead-%';

DELETE FROM teacher_availability
  WHERE teacher_id::text LIKE 'deadbeef-dead-dead-cafe-%';

DELETE FROM teacher_disciplines
  WHERE teacher_id::text LIKE 'deadbeef-dead-dead-cafe-%';

DELETE FROM admin_profiles
  WHERE id::text LIKE 'deadbeef-dead-dead-fade-%';

DELETE FROM teacher_profiles
  WHERE id::text LIKE 'deadbeef-dead-dead-cafe-%';

DELETE FROM student_profiles
  WHERE id::text LIKE 'deadbeef-dead-dead-babe-%';

DELETE FROM users
  WHERE id::text LIKE 'deadbeef-dead-dead-dead-%';

-- ════════════════════════════════════════════════════════════════════════════
-- 1. UTILIZADORES
-- ════════════════════════════════════════════════════════════════════════════
--
--  ID suffix  │ Email                              │ Papel
--  ...0001    │ admin@eduhub-seed.test             │ admin
--  ...0002    │ ana.machava@eduhub-seed.test        │ teacher
--  ...0003    │ carlos.nhangumbe@eduhub-seed.test   │ teacher
--  ...0004    │ fatima.matavel@eduhub-seed.test     │ teacher
--  ...0005    │ joao.silva@eduhub-seed.test         │ student
--  ...0006    │ maria.cumbe@eduhub-seed.test        │ student
--  ...0007    │ pedro.machel@eduhub-seed.test       │ student
--  ...0008    │ sofia.nhantumbo@eduhub-seed.test    │ student
--  ...0009    │ rui.nguenha@eduhub-seed.test        │ affiliate
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO users (id, email, password_hash, role, email_verified, status) VALUES

  ('deadbeef-dead-dead-dead-000000000001',
   'admin@eduhub-seed.test',
   crypt('EduHub@2024', gen_salt('bf', 10)),
   'admin', true, 'active'),

  ('deadbeef-dead-dead-dead-000000000002',
   'ana.machava@eduhub-seed.test',
   crypt('EduHub@2024', gen_salt('bf', 10)),
   'teacher', true, 'active'),

  ('deadbeef-dead-dead-dead-000000000003',
   'carlos.nhangumbe@eduhub-seed.test',
   crypt('EduHub@2024', gen_salt('bf', 10)),
   'teacher', true, 'active'),

  ('deadbeef-dead-dead-dead-000000000004',
   'fatima.matavel@eduhub-seed.test',
   crypt('EduHub@2024', gen_salt('bf', 10)),
   'teacher', true, 'active'),

  ('deadbeef-dead-dead-dead-000000000005',
   'joao.silva@eduhub-seed.test',
   crypt('EduHub@2024', gen_salt('bf', 10)),
   'student', true, 'active'),

  ('deadbeef-dead-dead-dead-000000000006',
   'maria.cumbe@eduhub-seed.test',
   crypt('EduHub@2024', gen_salt('bf', 10)),
   'student', true, 'active'),

  ('deadbeef-dead-dead-dead-000000000007',
   'pedro.machel@eduhub-seed.test',
   crypt('EduHub@2024', gen_salt('bf', 10)),
   'student', true, 'active'),

  ('deadbeef-dead-dead-dead-000000000008',
   'sofia.nhantumbo@eduhub-seed.test',
   crypt('EduHub@2024', gen_salt('bf', 10)),
   'student', true, 'active'),

  ('deadbeef-dead-dead-dead-000000000009',
   'rui.nguenha@eduhub-seed.test',
   crypt('EduHub@2024', gen_salt('bf', 10)),
   'affiliate', true, 'active')
;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. PERFIL ADMIN
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO admin_profiles (id, user_id, full_name, admin_role, permissions)
VALUES (
  'deadbeef-dead-dead-fade-000000000001',
  'deadbeef-dead-dead-dead-000000000001',
  'Administrador EduHub',
  'super_admin',
  '{"all": true, "financial": true, "academic": true, "support": true}'::jsonb
);

-- ════════════════════════════════════════════════════════════════════════════
-- 3. PERFIS DE PROFESSORES
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO teacher_profiles
  (id, user_id, full_name, bio, rating, total_reviews, total_students,
   total_hours_taught, is_validated, is_featured, commission_rate,
   timezone, languages, credentials)
VALUES
  (
    'deadbeef-dead-dead-cafe-000000000001',
    'deadbeef-dead-dead-dead-000000000002',
    'Ana Machava',
    'Licenciada em Matemática pela UEM com 8 anos de experiência no ensino secundário e universitário. Especialista em preparação para exames nacionais. Metodologia clara e prática, focada nos padrões do exame.',
    4.92, 48, 67, 312.50,
    true, true, 70.00,
    'Africa/Maputo',
    '["pt"]'::jsonb,
    '[{"type": "degree", "title": "Licenciatura em Matemática", "institution": "UEM", "year": 2016}]'::jsonb
  ),
  (
    'deadbeef-dead-dead-cafe-000000000002',
    'deadbeef-dead-dead-dead-000000000003',
    'Carlos Nhangumbe',
    'Engenheiro de Software com 10 anos de experiência em empresas nacionais e internacionais. Fundador de uma startup tech em Maputo. Formou mais de 200 programadores iniciantes em Python, JavaScript e desenvolvimento web.',
    4.78, 35, 48, 245.00,
    true, false, 70.00,
    'Africa/Maputo',
    '["pt", "en"]'::jsonb,
    '[{"type": "degree", "title": "Licenciatura em Engenharia Informática", "institution": "ISCTEM", "year": 2013}, {"type": "cert", "title": "AWS Certified Developer", "institution": "Amazon", "year": 2022}]'::jsonb
  ),
  (
    'deadbeef-dead-dead-cafe-000000000003',
    'deadbeef-dead-dead-dead-000000000004',
    'Fátima Matavel',
    'Mestre em Linguística Aplicada pela Universidade de Lisboa. Professora certificada CELTA. Ensina inglês conversacional, preparação para IELTS e inglês de negócios. Método comunicativo centrado no estudante.',
    4.85, 62, 89, 420.00,
    true, true, 70.00,
    'Africa/Maputo',
    '["pt", "en", "fr"]'::jsonb,
    '[{"type": "degree", "title": "Mestrado em Linguística Aplicada", "institution": "Universidade de Lisboa", "year": 2018}, {"type": "cert", "title": "CELTA", "institution": "Cambridge", "year": 2019}]'::jsonb
  )
;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. PERFIS DE ESTUDANTES
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO student_profiles
  (id, user_id, full_name, proficiency_level, learning_goals,
   diagnostic_answers, timezone, preferred_language)
VALUES
  (
    'deadbeef-dead-dead-babe-000000000001',
    'deadbeef-dead-dead-dead-000000000005',
    'João Silva',
    'intermediate',
    'Preparar para o exame nacional de Matemática e conseguir nota acima de 14 valores.',
    '{"preferred_discipline": "matematica", "study_hours_per_week": 10, "learning_style": "visual", "exam_target": "exame_nacional_12"}'::jsonb,
    'Africa/Maputo', 'pt'
  ),
  (
    'deadbeef-dead-dead-babe-000000000002',
    'deadbeef-dead-dead-dead-000000000006',
    'Maria Cumbe',
    'beginner',
    'Aprender programação do zero para conseguir emprego na área de TI em menos de 6 meses.',
    '{"preferred_discipline": "programacao", "study_hours_per_week": 15, "learning_style": "hands-on", "career_goal": "junior_developer"}'::jsonb,
    'Africa/Maputo', 'pt'
  ),
  (
    'deadbeef-dead-dead-babe-000000000003',
    'deadbeef-dead-dead-dead-000000000007',
    'Pedro Machel',
    'advanced',
    'Atingir nível C1 em inglês para candidatura a bolsa de estudos no Reino Unido.',
    '{"preferred_discipline": "ingles", "study_hours_per_week": 8, "learning_style": "auditory", "exam_target": "ielts_7"}'::jsonb,
    'Africa/Maputo', 'pt'
  ),
  (
    'deadbeef-dead-dead-babe-000000000004',
    'deadbeef-dead-dead-dead-000000000008',
    'Sofia Nhantumbo',
    'beginner',
    'Melhorar o inglês para comunicar com clientes internacionais no trabalho.',
    '{"preferred_discipline": "ingles", "study_hours_per_week": 6, "learning_style": "reading", "career_goal": "business_english"}'::jsonb,
    'Africa/Maputo', 'pt'
  )
;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. AFILIADO
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO affiliates
  (id, user_id, affiliate_code, commission_rate, total_earned,
   total_conversions, total_clicks, is_active, approved_by, approved_at)
VALUES (
  'deadbeef-dead-dead-afaf-000000000001',
  'deadbeef-dead-dead-dead-000000000009',
  'RUI2024',
  10.00,
  480.00,
  2,
  47,
  true,
  'deadbeef-dead-dead-dead-000000000001',
  NOW() - INTERVAL '30 days'
);

INSERT INTO affiliate_clicks
  (affiliate_id, ip_address, referrer, landing_page, clicked_at)
VALUES
  ('deadbeef-dead-dead-afaf-000000000001',
   '196.24.10.1', 'https://facebook.com/groups/estudantes-moz', '/', NOW() - INTERVAL '35 days'),
  ('deadbeef-dead-dead-afaf-000000000001',
   '196.24.10.2', 'https://t.me/eduhub_moz', '/courses', NOW() - INTERVAL '33 days'),
  ('deadbeef-dead-dead-afaf-000000000001',
   '196.24.10.3', NULL, '/courses/python', NOW() - INTERVAL '31 days')
;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. DISCIPLINAS DOS PROFESSORES
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO teacher_disciplines (teacher_id, discipline_id, level, price_per_hour)
SELECT 'deadbeef-dead-dead-cafe-000000000001'::uuid, id, 'all',          1500.00 FROM disciplines WHERE slug = 'matematica'
UNION ALL
SELECT 'deadbeef-dead-dead-cafe-000000000001'::uuid, id, 'intermediate', 1200.00 FROM disciplines WHERE slug = 'fisica'
UNION ALL
SELECT 'deadbeef-dead-dead-cafe-000000000002'::uuid, id, 'all',          1800.00 FROM disciplines WHERE slug = 'programacao'
UNION ALL
SELECT 'deadbeef-dead-dead-cafe-000000000002'::uuid, id, 'intermediate', 1300.00 FROM disciplines WHERE slug = 'matematica'
UNION ALL
SELECT 'deadbeef-dead-dead-cafe-000000000003'::uuid, id, 'all',          1400.00 FROM disciplines WHERE slug = 'ingles'
UNION ALL
SELECT 'deadbeef-dead-dead-cafe-000000000003'::uuid, id, 'intermediate', 1200.00 FROM disciplines WHERE slug = 'frances'
;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. DISPONIBILIDADE DOS PROFESSORES
--    day_of_week: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
-- ════════════════════════════════════════════════════════════════════════════

-- Prof. Ana — Seg a Sex manhã e tarde
INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time)
SELECT 'deadbeef-dead-dead-cafe-000000000001'::uuid, d, '08:00'::time, '12:00'::time
FROM generate_series(1,5) AS d
UNION ALL
SELECT 'deadbeef-dead-dead-cafe-000000000001'::uuid, d, '14:00'::time, '18:00'::time
FROM generate_series(1,5) AS d
UNION ALL
-- Prof. Carlos — Seg a Qui noite + Sáb dia inteiro
SELECT 'deadbeef-dead-dead-cafe-000000000002'::uuid, d, '18:00'::time, '22:00'::time
FROM generate_series(1,4) AS d
UNION ALL
SELECT 'deadbeef-dead-dead-cafe-000000000002'::uuid, 6, '09:00'::time, '17:00'::time
UNION ALL
-- Prof. Fátima — Ter, Qui, Sáb manhã e tarde
SELECT 'deadbeef-dead-dead-cafe-000000000003'::uuid, d, '07:00'::time, '12:00'::time
FROM (VALUES (2),(4),(6)) AS t(d)
UNION ALL
SELECT 'deadbeef-dead-dead-cafe-000000000003'::uuid, d, '15:00'::time, '20:00'::time
FROM (VALUES (2),(4),(6)) AS t(d)
;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. CURSOS
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO courses
  (id, teacher_id, discipline_id, title, description, level, price,
   lesson_type, total_hours, total_lessons, is_published, is_validated,
   is_featured, tags, meta_title, meta_description)
SELECT
  'deadbeef-dead-dead-face-000000000001'::uuid,
  'deadbeef-dead-dead-cafe-000000000001'::uuid,
  d.id,
  'Matemática para o 12° Ano — Preparação para Exame Nacional',
  'Curso intensivo de preparação para o exame nacional de Matemática do 12° ano. Cobre todos os temas do currículo moçambicano: funções, trigonometria, geometria analítica, limites e derivadas. Inclui resolução de exames de anos anteriores e simulações.',
  'intermediate', 2500.00, 'hybrid', 40.0, 4,
  true, true, true,
  '["matematica","12-ano","exame-nacional","preparacao","uem"]'::jsonb,
  'Matemática 12° Ano | EduHub',
  'Prepara-te para o exame nacional com a Profa. Ana Machava. Aprovação garantida!'
FROM disciplines d WHERE d.slug = 'matematica'
UNION ALL
SELECT
  'deadbeef-dead-dead-face-000000000002'::uuid,
  'deadbeef-dead-dead-cafe-000000000002'::uuid,
  d.id,
  'Python do Zero ao Avançado — Programação para o Mercado de Trabalho',
  'Aprende Python desde o zero absoluto até conceitos avançados: OOP, ficheiros, APIs REST, automatização e análise de dados. Curso 100% prático com projectos reais que podes incluir no teu portfólio.',
  'beginner', 3000.00, 'recorded', 60.0, 4,
  true, true, false,
  '["python","programacao","iniciantes","automacao","api"]'::jsonb,
  'Python do Zero | EduHub',
  'Aprende Python do zero com o Eng. Carlos Nhangumbe. Projectos reais incluídos.'
FROM disciplines d WHERE d.slug = 'programacao'
UNION ALL
SELECT
  'deadbeef-dead-dead-face-000000000003'::uuid,
  'deadbeef-dead-dead-cafe-000000000003'::uuid,
  d.id,
  'Inglês Conversacional — Do Básico ao Fluente em 3 Meses',
  'Desenvolve a tua fluência em inglês através de conversação, roleplay, vídeos autênticos e textos do quotidiano. Método comunicativo certificado. Ideal para quem quer comunicar no trabalho, viajar ou estudar no estrangeiro.',
  'beginner', 1800.00, 'live', 30.0, 4,
  true, true, true,
  '["ingles","conversacao","fluencia","ielts","business-english"]'::jsonb,
  'Inglês Conversacional | EduHub',
  'Torna-te fluente em inglês com a Profa. Fátima Matavel. Método CELTA certificado.'
FROM disciplines d WHERE d.slug = 'ingles'
UNION ALL
SELECT
  'deadbeef-dead-dead-face-000000000004'::uuid,
  'deadbeef-dead-dead-cafe-000000000001'::uuid,
  d.id,
  'Álgebra Linear e Geometria Analítica',
  'Vectores, matrizes, determinantes, sistemas de equações, espaços vectoriais e transformações lineares. Conteúdo universitário essencial para Engenharia, Física e Matemática. Demonstrações rigorosas e exercícios resolvidos.',
  'advanced', 2000.00, 'recorded', 35.0, 4,
  true, true, false,
  '["algebra","geometria","universidade","matematica","uem"]'::jsonb,
  'Álgebra Linear | EduHub',
  'Domina a Álgebra Linear com a Profa. Ana Machava. Para estudantes universitários.'
FROM disciplines d WHERE d.slug = 'matematica'
;

-- ════════════════════════════════════════════════════════════════════════════
-- 9. AULAS (LESSONS)
-- ════════════════════════════════════════════════════════════════════════════

-- Curso 1: Matemática 12° Ano
INSERT INTO lessons
  (id, course_id, title, description, lesson_order,
   duration_minutes, is_free_preview, status)
VALUES
  ('deadbeef-dead-dead-feed-000000000101',
   'deadbeef-dead-dead-face-000000000001',
   'Aula 1 — Introdução: O Que Esperar do Exame Nacional',
   'Visão geral da estrutura do exame, tipologias de questões, distribuição de valores e estratégias de gestão do tempo.',
   1, 45, true, 'approved'),

  ('deadbeef-dead-dead-feed-000000000102',
   'deadbeef-dead-dead-face-000000000001',
   'Aula 2 — Funções Reais: Revisão Completa',
   'Domínio, contradomínio, função injectiva, sobrejectiva e bijectiva. Funções compostas e inversas. Exercícios resolvidos.',
   2, 90, false, 'approved'),

  ('deadbeef-dead-dead-feed-000000000103',
   'deadbeef-dead-dead-face-000000000001',
   'Aula 3 — Trigonometria: Fórmulas e Aplicações',
   'Razões trigonométricas, fórmulas de adição, equações e inequações trigonométricas. Exercícios de exames anteriores.',
   3, 75, false, 'approved'),

  ('deadbeef-dead-dead-feed-000000000104',
   'deadbeef-dead-dead-face-000000000001',
   'Aula 4 — Limites, Continuidade e Derivadas',
   'Definição de limite, técnicas de cálculo de limites, regras de derivação, derivada da função composta e aplicações.',
   4, 80, false, 'approved'),

-- Curso 2: Python
  ('deadbeef-dead-dead-feed-000000000201',
   'deadbeef-dead-dead-face-000000000002',
   'Aula 1 — Instalação, Configuração e Olá Mundo!',
   'Instalar Python e VS Code, configurar o ambiente, escrever e executar o primeiro programa Python.',
   1, 30, true, 'approved'),

  ('deadbeef-dead-dead-feed-000000000202',
   'deadbeef-dead-dead-face-000000000002',
   'Aula 2 — Variáveis, Tipos de Dados e Operadores',
   'int, float, str, bool, listas, dicionários. Operadores aritméticos, de comparação e lógicos. Input e output.',
   2, 60, false, 'approved'),

  ('deadbeef-dead-dead-feed-000000000203',
   'deadbeef-dead-dead-face-000000000002',
   'Aula 3 — Controlo de Fluxo: if, for, while',
   'Estruturas condicionais e de repetição. Compreensão de listas. Exercício: calculadora e jogo da adivinha.',
   3, 75, false, 'approved'),

  ('deadbeef-dead-dead-feed-000000000204',
   'deadbeef-dead-dead-face-000000000002',
   'Aula 4 — Funções, Módulos e Manipulação de Ficheiros',
   'Definir funções, parâmetros e retornos. Importar módulos standard. Ler e escrever ficheiros CSV e JSON.',
   4, 90, false, 'approved'),

-- Curso 3: Inglês Conversacional
  ('deadbeef-dead-dead-feed-000000000301',
   'deadbeef-dead-dead-face-000000000003',
   'Lesson 1 — Greetings, Introductions and Small Talk',
   'How to greet people formally and informally, introduce yourself and others, and maintain basic small talk conversations.',
   1, 50, true, 'approved'),

  ('deadbeef-dead-dead-feed-000000000302',
   'deadbeef-dead-dead-face-000000000003',
   'Lesson 2 — Daily Routines and Present Simple',
   'Talking about habits and routines using present simple. Time expressions: always, usually, sometimes, never.',
   2, 55, false, 'approved'),

  ('deadbeef-dead-dead-feed-000000000303',
   'deadbeef-dead-dead-face-000000000003',
   'Lesson 3 — Shopping and Asking for Directions',
   'Vocabulary for shops and products. Dialogues for asking prices, sizes and colours. How to ask for and give directions.',
   3, 60, false, 'approved'),

  ('deadbeef-dead-dead-feed-000000000304',
   'deadbeef-dead-dead-face-000000000003',
   'Lesson 4 — Talking About the Past: Simple Past and Past Continuous',
   'Regular and irregular verbs in the past. Narrating past events. Pronunciation of -ed endings.',
   4, 60, false, 'approved'),

-- Curso 4: Álgebra Linear
  ('deadbeef-dead-dead-feed-000000000401',
   'deadbeef-dead-dead-face-000000000004',
   'Aula 1 — Vectores no Plano e no Espaço',
   'Representação geométrica e algébrica de vectores. Operações: adição, subtracção, produto por escalar. Produto escalar e vectorial.',
   1, 70, true, 'approved'),

  ('deadbeef-dead-dead-feed-000000000402',
   'deadbeef-dead-dead-face-000000000004',
   'Aula 2 — Matrizes: Tipos e Operações',
   'Tipos de matrizes. Adição, subtracção e multiplicação de matrizes. Transposição. Matriz identidade e inversa.',
   2, 80, false, 'approved'),

  ('deadbeef-dead-dead-feed-000000000403',
   'deadbeef-dead-dead-face-000000000004',
   'Aula 3 — Determinantes e Regra de Cramer',
   'Cálculo de determinantes de ordem 2 e 3. Propriedades dos determinantes. Regra de Cramer para sistemas 2×2 e 3×3.',
   3, 75, false, 'approved'),

  ('deadbeef-dead-dead-feed-000000000404',
   'deadbeef-dead-dead-face-000000000004',
   'Aula 4 — Sistemas de Equações Lineares e Método de Gauss',
   'Classificação de sistemas: compatível determinado, compatível indeterminado, incompatível. Escalonamento. Discussão e resolução.',
   4, 90, false, 'approved')
;

-- ════════════════════════════════════════════════════════════════════════════
-- 10. MATRÍCULAS
-- ════════════════════════════════════════════════════════════════════════════
-- Nota: o trigger trg_update_enrollment_progress irá recalcular o progresso
--       quando inserirmos lesson_progress abaixo. Definimos progress_percent = 0
--       e deixamos o trigger corrigir.
INSERT INTO enrollments
  (id, student_id, course_id, progress_percent, status, enrolled_at)
VALUES
  -- João: Matemática (75% — 3/4 aulas) + Python (100% — concluído)
  ('deadbeef-dead-dead-b0a7-000000000001',
   'deadbeef-dead-dead-babe-000000000001',
   'deadbeef-dead-dead-face-000000000001',
   0, 'active', NOW() - INTERVAL '30 days'),

  ('deadbeef-dead-dead-b0a7-000000000002',
   'deadbeef-dead-dead-babe-000000000001',
   'deadbeef-dead-dead-face-000000000002',
   0, 'active', NOW() - INTERVAL '35 days'),

  -- Maria: Matemática (50% — 2/4) + Inglês (25% — 1/4)
  ('deadbeef-dead-dead-b0a7-000000000003',
   'deadbeef-dead-dead-babe-000000000002',
   'deadbeef-dead-dead-face-000000000001',
   0, 'active', NOW() - INTERVAL '22 days'),

  ('deadbeef-dead-dead-b0a7-000000000004',
   'deadbeef-dead-dead-babe-000000000002',
   'deadbeef-dead-dead-face-000000000003',
   0, 'active', NOW() - INTERVAL '20 days'),

  -- Pedro: Inglês (100% — concluído) + Python (50% — 2/4)
  ('deadbeef-dead-dead-b0a7-000000000005',
   'deadbeef-dead-dead-babe-000000000003',
   'deadbeef-dead-dead-face-000000000003',
   0, 'active', NOW() - INTERVAL '40 days'),

  ('deadbeef-dead-dead-b0a7-000000000006',
   'deadbeef-dead-dead-babe-000000000003',
   'deadbeef-dead-dead-face-000000000002',
   0, 'active', NOW() - INTERVAL '38 days'),

  -- Sofia: Inglês (0% — ainda não começou)
  ('deadbeef-dead-dead-b0a7-000000000007',
   'deadbeef-dead-dead-babe-000000000004',
   'deadbeef-dead-dead-face-000000000003',
   0, 'active', NOW() - INTERVAL '5 days')
;

-- ════════════════════════════════════════════════════════════════════════════
-- 11. PROGRESSO DAS AULAS
--     O trigger recalcula progress_percent em enrollments automaticamente.
-- ════════════════════════════════════════════════════════════════════════════

-- João em Matemática: aulas 1-3 completas, aula 4 em progresso
INSERT INTO lesson_progress
  (id, enrollment_id, lesson_id, completed, completed_at, watched_seconds)
VALUES
  ('deadbeef-dead-dead-a11c-000000000001',
   'deadbeef-dead-dead-b0a7-000000000001',
   'deadbeef-dead-dead-feed-000000000101',
   true, NOW() - INTERVAL '28 days', 2700),

  ('deadbeef-dead-dead-a11c-000000000002',
   'deadbeef-dead-dead-b0a7-000000000001',
   'deadbeef-dead-dead-feed-000000000102',
   true, NOW() - INTERVAL '22 days', 5400),

  ('deadbeef-dead-dead-a11c-000000000003',
   'deadbeef-dead-dead-b0a7-000000000001',
   'deadbeef-dead-dead-feed-000000000103',
   true, NOW() - INTERVAL '16 days', 4500),

  ('deadbeef-dead-dead-a11c-000000000004',
   'deadbeef-dead-dead-b0a7-000000000001',
   'deadbeef-dead-dead-feed-000000000104',
   false, NULL, 1800),

-- João em Python: todas as 4 aulas completas
  ('deadbeef-dead-dead-a11c-000000000005',
   'deadbeef-dead-dead-b0a7-000000000002',
   'deadbeef-dead-dead-feed-000000000201',
   true, NOW() - INTERVAL '33 days', 1800),

  ('deadbeef-dead-dead-a11c-000000000006',
   'deadbeef-dead-dead-b0a7-000000000002',
   'deadbeef-dead-dead-feed-000000000202',
   true, NOW() - INTERVAL '30 days', 3600),

  ('deadbeef-dead-dead-a11c-000000000007',
   'deadbeef-dead-dead-b0a7-000000000002',
   'deadbeef-dead-dead-feed-000000000203',
   true, NOW() - INTERVAL '26 days', 4500),

  ('deadbeef-dead-dead-a11c-000000000008',
   'deadbeef-dead-dead-b0a7-000000000002',
   'deadbeef-dead-dead-feed-000000000204',
   true, NOW() - INTERVAL '20 days', 5400),

-- Maria em Matemática: aulas 1-2 completas
  ('deadbeef-dead-dead-a11c-000000000009',
   'deadbeef-dead-dead-b0a7-000000000003',
   'deadbeef-dead-dead-feed-000000000101',
   true, NOW() - INTERVAL '20 days', 2700),

  ('deadbeef-dead-dead-a11c-000000000010',
   'deadbeef-dead-dead-b0a7-000000000003',
   'deadbeef-dead-dead-feed-000000000102',
   true, NOW() - INTERVAL '14 days', 5400),

-- Maria em Inglês: aula 1 completa
  ('deadbeef-dead-dead-a11c-000000000011',
   'deadbeef-dead-dead-b0a7-000000000004',
   'deadbeef-dead-dead-feed-000000000301',
   true, NOW() - INTERVAL '18 days', 3000),

-- Pedro em Inglês: todas as 4 aulas completas
  ('deadbeef-dead-dead-a11c-000000000012',
   'deadbeef-dead-dead-b0a7-000000000005',
   'deadbeef-dead-dead-feed-000000000301',
   true, NOW() - INTERVAL '38 days', 3000),

  ('deadbeef-dead-dead-a11c-000000000013',
   'deadbeef-dead-dead-b0a7-000000000005',
   'deadbeef-dead-dead-feed-000000000302',
   true, NOW() - INTERVAL '33 days', 3300),

  ('deadbeef-dead-dead-a11c-000000000014',
   'deadbeef-dead-dead-b0a7-000000000005',
   'deadbeef-dead-dead-feed-000000000303',
   true, NOW() - INTERVAL '28 days', 3600),

  ('deadbeef-dead-dead-a11c-000000000015',
   'deadbeef-dead-dead-b0a7-000000000005',
   'deadbeef-dead-dead-feed-000000000304',
   true, NOW() - INTERVAL '22 days', 3600),

-- Pedro em Python: aulas 1-2 completas
  ('deadbeef-dead-dead-a11c-000000000016',
   'deadbeef-dead-dead-b0a7-000000000006',
   'deadbeef-dead-dead-feed-000000000201',
   true, NOW() - INTERVAL '36 days', 1800),

  ('deadbeef-dead-dead-a11c-000000000017',
   'deadbeef-dead-dead-b0a7-000000000006',
   'deadbeef-dead-dead-feed-000000000202',
   true, NOW() - INTERVAL '30 days', 3600)
;

-- ════════════════════════════════════════════════════════════════════════════
-- 12. SESSÕES AO VIVO
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO live_sessions
  (id, teacher_id, course_id, student_id,
   scheduled_at, duration_minutes, status, room_id,
   reminder_sent, started_at, ended_at)
VALUES
  -- ── Passadas (concluídas) ──────────────────────────────────────────────
  (
    'deadbeef-dead-dead-bad0-000000000001',
    'deadbeef-dead-dead-cafe-000000000001',  -- Ana
    'deadbeef-dead-dead-face-000000000001',  -- Matemática
    'deadbeef-dead-dead-babe-000000000001',  -- João
    NOW() - INTERVAL '15 days',
    60, 'completed', 'room-seed-001', true,
    NOW() - INTERVAL '15 days' + INTERVAL '1 minute',
    NOW() - INTERVAL '15 days' + INTERVAL '61 minutes'
  ),
  (
    'deadbeef-dead-dead-bad0-000000000002',
    'deadbeef-dead-dead-cafe-000000000001',  -- Ana
    'deadbeef-dead-dead-face-000000000001',  -- Matemática
    'deadbeef-dead-dead-babe-000000000003',  -- Pedro (Ana também ensina a Pedro ocasionalmente)
    NOW() - INTERVAL '10 days',
    60, 'completed', 'room-seed-002', true,
    NOW() - INTERVAL '10 days' + INTERVAL '2 minutes',
    NOW() - INTERVAL '10 days' + INTERVAL '62 minutes'
  ),
  (
    'deadbeef-dead-dead-bad0-000000000003',
    'deadbeef-dead-dead-cafe-000000000003',  -- Fátima
    'deadbeef-dead-dead-face-000000000003',  -- Inglês
    'deadbeef-dead-dead-babe-000000000003',  -- Pedro
    NOW() - INTERVAL '8 days',
    60, 'completed', 'room-seed-003', true,
    NOW() - INTERVAL '8 days' + INTERVAL '1 minute',
    NOW() - INTERVAL '8 days' + INTERVAL '61 minutes'
  ),
  (
    'deadbeef-dead-dead-bad0-000000000004',
    'deadbeef-dead-dead-cafe-000000000002',  -- Carlos
    'deadbeef-dead-dead-face-000000000002',  -- Python
    'deadbeef-dead-dead-babe-000000000002',  -- Maria
    NOW() - INTERVAL '4 days',
    90, 'completed', 'room-seed-004', true,
    NOW() - INTERVAL '4 days' + INTERVAL '3 minutes',
    NOW() - INTERVAL '4 days' + INTERVAL '93 minutes'
  ),

  -- ── Futuras agendadas ─────────────────────────────────────────────────
  (
    'deadbeef-dead-dead-bad0-000000000005',
    'deadbeef-dead-dead-cafe-000000000001',  -- Ana
    'deadbeef-dead-dead-face-000000000001',  -- Matemática
    'deadbeef-dead-dead-babe-000000000001',  -- João
    NOW() + INTERVAL '2 days',
    60, 'scheduled', 'room-seed-005', false,
    NULL, NULL
  ),
  (
    'deadbeef-dead-dead-bad0-000000000006',
    'deadbeef-dead-dead-cafe-000000000003',  -- Fátima
    'deadbeef-dead-dead-face-000000000003',  -- Inglês
    'deadbeef-dead-dead-babe-000000000004',  -- Sofia
    NOW() + INTERVAL '5 days',
    60, 'scheduled', 'room-seed-006', false,
    NULL, NULL
  ),

  -- ── Sessão cancelada (para testar fluxo de cancelamento) ─────────────
  (
    'deadbeef-dead-dead-bad0-000000000007',
    'deadbeef-dead-dead-cafe-000000000002',  -- Carlos
    'deadbeef-dead-dead-face-000000000002',  -- Python
    'deadbeef-dead-dead-babe-000000000002',  -- Maria
    NOW() - INTERVAL '2 days',
    60, 'cancelled', 'room-seed-007', true,
    NULL, NULL
  ),

  -- ── Sessão para testar o SCHEDULER de reminders (~31 minutos no futuro) ──
  -- Esta sessão deve ser detectada pelo goroutine de reminder quando o seed for corrido.
  -- Se o seed for corrido < 29 min antes do scheduler, o reminder será enviado.
  (
    'deadbeef-dead-dead-bad0-000000000008',
    'deadbeef-dead-dead-cafe-000000000002',  -- Carlos
    'deadbeef-dead-dead-face-000000000002',  -- Python
    'deadbeef-dead-dead-babe-000000000003',  -- Pedro
    NOW() + INTERVAL '31 minutes',
    60, 'scheduled', 'room-seed-008', false,
    NULL, NULL
  )
;

-- ════════════════════════════════════════════════════════════════════════════
-- 13. TRANSACÇÕES (PAGAMENTOS)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Distribuição de comissões (taxas padrão):
--   Professor  70% · Plataforma 20% (sem afiliado) / 10% (com afiliado) · Afiliado 10%
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO transactions
  (id, student_id, course_id, gross_amount, teacher_amount, platform_amount,
   seller_amount, seller_id, currency, payment_method, payment_gateway,
   gateway_tx_id, payment_status, paid_at)
VALUES
  -- João comprou Matemática — M-Pesa, sem afiliado
  ('deadbeef-dead-dead-ca5e-000000000001',
   'deadbeef-dead-dead-dead-000000000005',
   'deadbeef-dead-dead-face-000000000001',
   2500.00, 1750.00, 750.00, 0.00, NULL,
   'MZN', 'mpesa', 'mpesa',
   'MPZ-SEED-TX-001', 'paid', NOW() - INTERVAL '30 days'),

  -- João comprou Python — M-Pesa, COM afiliado Rui (código RUI2024)
  ('deadbeef-dead-dead-ca5e-000000000002',
   'deadbeef-dead-dead-dead-000000000005',
   'deadbeef-dead-dead-face-000000000002',
   3000.00, 2100.00, 600.00, 300.00,
   'deadbeef-dead-dead-dead-000000000009',  -- Rui
   'MZN', 'mpesa', 'mpesa',
   'MPZ-SEED-TX-002', 'paid', NOW() - INTERVAL '35 days'),

  -- Maria comprou Matemática — M-Pesa, sem afiliado
  ('deadbeef-dead-dead-ca5e-000000000003',
   'deadbeef-dead-dead-dead-000000000006',
   'deadbeef-dead-dead-face-000000000001',
   2500.00, 1750.00, 750.00, 0.00, NULL,
   'MZN', 'mpesa', 'mpesa',
   'MPZ-SEED-TX-003', 'paid', NOW() - INTERVAL '24 days'),

  -- Maria comprou Inglês — M-Pesa, sem afiliado
  ('deadbeef-dead-dead-ca5e-000000000004',
   'deadbeef-dead-dead-dead-000000000006',
   'deadbeef-dead-dead-face-000000000003',
   1800.00, 1260.00, 540.00, 0.00, NULL,
   'MZN', 'mpesa', 'mpesa',
   'MPZ-SEED-TX-004', 'paid', NOW() - INTERVAL '22 days'),

  -- Pedro comprou Inglês — M-Pesa, COM afiliado Rui
  ('deadbeef-dead-dead-ca5e-000000000005',
   'deadbeef-dead-dead-dead-000000000007',
   'deadbeef-dead-dead-face-000000000003',
   1800.00, 1260.00, 360.00, 180.00,
   'deadbeef-dead-dead-dead-000000000009',  -- Rui
   'MZN', 'mpesa', 'mpesa',
   'MPZ-SEED-TX-005', 'paid', NOW() - INTERVAL '42 days'),

  -- Pedro comprou Python — Stripe (cartão internacional)
  ('deadbeef-dead-dead-ca5e-000000000006',
   'deadbeef-dead-dead-dead-000000000007',
   'deadbeef-dead-dead-face-000000000002',
   3000.00, 2100.00, 900.00, 0.00, NULL,
   'MZN', 'card', 'stripe',
   'pi_seed_stripe_001', 'paid', NOW() - INTERVAL '40 days'),

  -- Sofia comprou Inglês — M-Pesa, PENDENTE (para testar fluxo de webhook)
  ('deadbeef-dead-dead-ca5e-000000000007',
   'deadbeef-dead-dead-dead-000000000008',
   'deadbeef-dead-dead-face-000000000003',
   1800.00, 1260.00, 540.00, 0.00, NULL,
   'MZN', 'mpesa', 'mpesa',
   'MPZ-SEED-TX-007-PENDING', 'pending', NULL),

  -- Transacção falhada (para testar fluxo de erro)
  ('deadbeef-dead-dead-ca5e-000000000008',
   'deadbeef-dead-dead-dead-000000000008',
   'deadbeef-dead-dead-face-000000000001',
   2500.00, 1750.00, 750.00, 0.00, NULL,
   'MZN', 'mpesa', 'mpesa',
   'MPZ-SEED-TX-008-FAIL', 'failed', NULL)
;

-- ════════════════════════════════════════════════════════════════════════════
-- 14. FEEDBACK (avaliações)
--     O trigger trg_update_teacher_rating recalcula automaticamente os ratings.
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO feedbacks
  (id, student_id, teacher_id, course_id, live_session_id,
   rating, comment, teacher_response, teacher_response_at, is_visible)
VALUES
  -- João avalia Ana — curso Matemática — 5 estrelas
  ('deadbeef-dead-dead-f33d-000000000001',
   'deadbeef-dead-dead-babe-000000000001',
   'deadbeef-dead-dead-cafe-000000000001',
   'deadbeef-dead-dead-face-000000000001',
   'deadbeef-dead-dead-bad0-000000000001',
   5,
   'A Professora Ana é extraordinária! Explica os conceitos com uma clareza que nunca encontrei noutros professores. Em 3 meses melhorei a minha nota de 8 para 15 valores. Recomendo a qualquer estudante do 12° ano que queira passar no exame nacional!',
   'Muito obrigada João! É um prazer acompanhar o teu crescimento. A tua dedicação é o verdadeiro segredo do teu sucesso. Continua assim!',
   NOW() - INTERVAL '13 days',
   true),

  -- Maria avalia Ana — curso Matemática — 4 estrelas
  ('deadbeef-dead-dead-f33d-000000000002',
   'deadbeef-dead-dead-babe-000000000002',
   'deadbeef-dead-dead-cafe-000000000001',
   'deadbeef-dead-dead-face-000000000001',
   NULL,
   4,
   'Bom curso e conteúdo bem organizado. A professora é muito competente. Às vezes o ritmo é um pouco rápido, mas posso rever os vídeos quantas vezes precisar. No geral estou muito satisfeita!',
   NULL, NULL,
   true),

  -- João avalia Carlos — curso Python — 5 estrelas
  ('deadbeef-dead-dead-f33d-000000000003',
   'deadbeef-dead-dead-babe-000000000001',
   'deadbeef-dead-dead-cafe-000000000002',
   'deadbeef-dead-dead-face-000000000002',
   NULL,
   5,
   'O Carlos é um professor incrível! Em menos de 2 meses aprendi Python do zero e já estou a desenvolver o meu primeiro projecto. Os exercícios são muito práticos e os exemplos são do mundo real. Curso altamente recomendado!',
   'Que fantástico João! Fico muito feliz com o teu progresso. A chave é continuar a praticar todos os dias. Em breve estarás a fazer coisas ainda mais incríveis!',
   NOW() - INTERVAL '18 days',
   true),

  -- Pedro avalia Fátima — curso Inglês — 5 estrelas
  ('deadbeef-dead-dead-f33d-000000000004',
   'deadbeef-dead-dead-babe-000000000003',
   'deadbeef-dead-dead-cafe-000000000003',
   'deadbeef-dead-dead-face-000000000003',
   'deadbeef-dead-dead-bad0-000000000003',
   5,
   'A Professora Fátima é simplesmente fantástica! O método dela é muito diferente do que aprendi na escola. Em 3 meses já me sinto confiante para falar inglês em qualquer situação. Consegui a bolsa de estudos que queria. Obrigado de coração!',
   'Parabéns pela bolsa, Pedro! That is truly amazing news! Your hard work and dedication paid off. Wishing you all the best in your studies abroad!',
   NOW() - INTERVAL '20 days',
   true),

  -- Pedro avalia Carlos — curso Python — 4 estrelas (feedback construtivo)
  ('deadbeef-dead-dead-f33d-000000000005',
   'deadbeef-dead-dead-babe-000000000003',
   'deadbeef-dead-dead-cafe-000000000002',
   'deadbeef-dead-dead-face-000000000002',
   'deadbeef-dead-dead-bad0-000000000004',
   4,
   'Curso de boa qualidade e bem estruturado. O Carlos explica bem. O único aspecto que poderia melhorar é ter mais exercícios práticos entre as aulas, pois sinto que seria útil consolidar cada tema antes de avançar.',
   'Obrigado pelo feedback construtivo, Pedro! Vou adicionar mais exercícios de consolidação nas próximas actualizações do curso. O teu comentário vai ajudar outros estudantes também!',
   NOW() - INTERVAL '38 days',
   true)
;

-- ════════════════════════════════════════════════════════════════════════════
-- 15. LEADS (funil de captação)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO leads
  (id, email, name, phone, interest_discipline, interest_level,
   source, affiliate_code, utm_source, utm_medium, utm_campaign, status)
VALUES
  ('deadbeef-dead-dead-1ead-000000000001',
   'amina.mussa@gmail-seed.test',
   'Amina Mussa',
   '+258 84 123 4567',
   'matematica', 'intermediate',
   'facebook_ad', NULL,
   'facebook', 'cpc', 'matematica-12-ano', 'new'),

  ('deadbeef-dead-dead-1ead-000000000002',
   'tomas.boane@hotmail-seed.test',
   'Tomás Boane',
   '+258 82 987 6543',
   'programacao', 'beginner',
   'google_ad', 'RUI2024',
   'google', 'cpc', 'python-iniciantes', 'contacted'),

  ('deadbeef-dead-dead-1ead-000000000003',
   'isabel.cossa@yahoo-seed.test',
   'Isabel Cossa',
   '+258 86 555 0123',
   'ingles', 'beginner',
   'referral', NULL,
   NULL, NULL, NULL, 'qualified'),

  ('deadbeef-dead-dead-1ead-000000000004',
   'manuel.guambe@gmail-seed.test',
   'Manuel Guambe',
   NULL,
   'fisica', 'intermediate',
   'organic', NULL,
   NULL, NULL, NULL, 'new'),

  ('deadbeef-dead-dead-1ead-000000000005',
   'lucia.sitoe@gmail-seed.test',
   'Lúcia Sitoe',
   '+258 84 777 8899',
   'ingles', 'advanced',
   'instagram_ad', 'RUI2024',
   'instagram', 'story', 'ingles-ielts', 'new')
;

-- ════════════════════════════════════════════════════════════════════════════
-- 16. ACTUALIZAR CONTADORES DESNORMALIZADOS
-- ════════════════════════════════════════════════════════════════════════════

-- Enrolled count nos cursos
UPDATE courses
SET enrolled_count = (
  SELECT COUNT(*) FROM enrollments WHERE course_id = courses.id
)
WHERE id::text LIKE 'deadbeef-dead-dead-face-%';

-- Total de estudantes por professor
UPDATE teacher_profiles
SET total_students = (
  SELECT COUNT(DISTINCT e.student_id)
  FROM enrollments e
  JOIN courses c ON c.id = e.course_id
  WHERE c.teacher_id = teacher_profiles.id
)
WHERE id::text LIKE 'deadbeef-dead-dead-cafe-%';

-- Afiliado: actualizar totais
UPDATE affiliates
SET total_conversions = 2, total_earned = 480.00, total_clicks = 47
WHERE id = 'deadbeef-dead-dead-afaf-000000000001';

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
\echo ''
\echo '╔══════════════════════════════════════════════════════════════════╗'
\echo '║           EduHub — Seed de Desenvolvimento Concluído            ║'
\echo '╠════════════════════════════════════════════════════════════════  ╣'
\echo '║  SENHA DE TODOS OS UTILIZADORES: EduHub@2024                    ║'
\echo '╠══════════════════════════════════════════════════════════════════╣'
\echo '║ admin@eduhub-seed.test          → Super Admin                   ║'
\echo '║ ana.machava@eduhub-seed.test    → Prof. Matemática (★4.92)      ║'
\echo '║ carlos.nhangumbe@eduhub-seed.test → Prof. Python (★4.78)        ║'
\echo '║ fatima.matavel@eduhub-seed.test → Prof. Inglês (★4.85)          ║'
\echo '║ joao.silva@eduhub-seed.test     → Estudante (75% Mat, 100% Py)  ║'
\echo '║ maria.cumbe@eduhub-seed.test    → Estudante (50% Mat, 25% Ing)  ║'
\echo '║ pedro.machel@eduhub-seed.test   → Estudante (100% Ing, 50% Py)  ║'
\echo '║ sofia.nhantumbo@eduhub-seed.test→ Estudante (0% Ing)            ║'
\echo '║ rui.nguenha@eduhub-seed.test    → Afiliado (código: RUI2024)    ║'
\echo '╠══════════════════════════════════════════════════════════════════╣'
\echo '║ Tx pendente:  deadbeef-...-ca5e-000000000007 (Sofia/Inglês)      ║'
\echo '║ Reminder test: room-seed-008 (31 min no futuro)                  ║'
\echo '╚══════════════════════════════════════════════════════════════════╝'
