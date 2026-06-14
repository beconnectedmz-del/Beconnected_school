-- ═══════════════════════════════════════════════════════════════════════════
-- EduHub — Queries de validação do seed
-- Uso: make psql  →  \i database/seeds/test_queries.sql
-- ═══════════════════════════════════════════════════════════════════════════

\echo '═══════════════════════════════════════════════'
\echo ' 1. UTILIZADORES criados'
\echo '═══════════════════════════════════════════════'
SELECT role, count(*) FROM users
WHERE id::text LIKE 'deadbeef-dead-dead-dead-%'
GROUP BY role ORDER BY role;

\echo ''
\echo '═══════════════════════════════════════════════'
\echo ' 2. PROFESSORES — rating e total de reviews'
\echo '═══════════════════════════════════════════════'
SELECT full_name, rating, total_reviews, total_students, is_validated, is_featured
FROM teacher_profiles
WHERE id::text LIKE 'deadbeef-dead-dead-cafe-%'
ORDER BY rating DESC;

\echo ''
\echo '═══════════════════════════════════════════════'
\echo ' 3. CURSOS publicados'
\echo '═══════════════════════════════════════════════'
SELECT c.title, tp.full_name AS professor, c.price, c.enrolled_count,
       c.lesson_type, c.level, c.is_featured
FROM courses c
JOIN teacher_profiles tp ON tp.id = c.teacher_id
WHERE c.id::text LIKE 'deadbeef-dead-dead-face-%'
ORDER BY c.enrolled_count DESC;

\echo ''
\echo '═══════════════════════════════════════════════'
\echo ' 4. MATRÍCULAS e PROGRESSO'
\echo '═══════════════════════════════════════════════'
SELECT sp.full_name AS estudante, c.title AS curso,
       e.progress_percent || '%' AS progresso, e.status
FROM enrollments e
JOIN student_profiles sp ON sp.id = e.student_id
JOIN courses c ON c.id = e.course_id
WHERE e.id::text LIKE 'deadbeef-dead-dead-b0a7-%'
ORDER BY sp.full_name, e.progress_percent DESC;

\echo ''
\echo '═══════════════════════════════════════════════'
\echo ' 5. SESSÕES AO VIVO — todas'
\echo '═══════════════════════════════════════════════'
SELECT tp.full_name AS professor, sp.full_name AS estudante,
       ls.scheduled_at AT TIME ZONE 'Africa/Maputo' AS hora_local,
       ls.status, ls.reminder_sent, ls.room_id
FROM live_sessions ls
JOIN teacher_profiles tp ON tp.id = ls.teacher_id
JOIN student_profiles sp ON sp.id = ls.student_id
WHERE ls.id::text LIKE 'deadbeef-dead-dead-bad0-%'
ORDER BY ls.scheduled_at;

\echo ''
\echo '═══════════════════════════════════════════════'
\echo ' 6. SESSÃO para testar REMINDER (deveria ser ~31 min no futuro)'
\echo '═══════════════════════════════════════════════'
SELECT room_id, status, reminder_sent,
       scheduled_at - NOW() AS tempo_restante,
       CASE
         WHEN scheduled_at BETWEEN NOW() + INTERVAL '28 min'
                               AND NOW() + INTERVAL '32 min'
         THEN 'SERÁ APANHADA pelo scheduler'
         ELSE 'fora da janela de 28-32 min'
       END AS scheduler_status
FROM live_sessions
WHERE room_id = 'room-seed-008';

\echo ''
\echo '═══════════════════════════════════════════════'
\echo ' 7. TRANSACÇÕES — resumo por estado'
\echo '═══════════════════════════════════════════════'
SELECT payment_status, payment_gateway,
       count(*) AS total,
       sum(gross_amount) AS volume_total,
       sum(teacher_amount) AS pago_professores,
       sum(platform_amount) AS receita_plataforma,
       sum(seller_amount) AS comissoes_afiliados
FROM transactions
WHERE id::text LIKE 'deadbeef-dead-dead-ca5e-%'
GROUP BY payment_status, payment_gateway
ORDER BY payment_status;

\echo ''
\echo '═══════════════════════════════════════════════'
\echo ' 8. FEEDBACK — reviews por professor'
\echo '═══════════════════════════════════════════════'
SELECT tp.full_name AS professor,
       count(*)              AS total_reviews,
       round(avg(f.rating),2) AS rating_calculado,
       tp.rating              AS rating_tabela
FROM feedbacks f
JOIN teacher_profiles tp ON tp.id = f.teacher_id
WHERE f.id::text LIKE 'deadbeef-dead-dead-f33d-%'
GROUP BY tp.full_name, tp.rating
ORDER BY rating_calculado DESC;

\echo ''
\echo '═══════════════════════════════════════════════'
\echo ' 9. AFILIADO — estatísticas'
\echo '═══════════════════════════════════════════════'
SELECT u.email, a.affiliate_code,
       a.total_clicks, a.total_conversions, a.total_earned
FROM affiliates a
JOIN users u ON u.id = a.user_id
WHERE a.id::text LIKE 'deadbeef-dead-dead-afaf-%';

\echo ''
\echo '═══════════════════════════════════════════════'
\echo ' 10. LEADS — por estado'
\echo '═══════════════════════════════════════════════'
SELECT status, count(*) FROM leads
WHERE id::text LIKE 'deadbeef-dead-dead-1ead-%'
GROUP BY status;

\echo ''
\echo '═══════════════════════════════════════════════'
\echo ' 11. TRANSACÇÃO PENDENTE (para testar webhook)'
\echo '═══════════════════════════════════════════════'
SELECT id, payment_status, gateway_tx_id, gross_amount
FROM transactions
WHERE id = 'deadbeef-dead-dead-ca5e-000000000007';

\echo ''
\echo '═══════════════════════════════════════════════'
\echo ' 12. Confirmar transacção pendente (simular webhook M-Pesa)'
\echo '     (Descomentar e correr manualmente)'
\echo '═══════════════════════════════════════════════'
-- UPDATE transactions
-- SET payment_status = 'paid', paid_at = NOW(), updated_at = NOW()
-- WHERE id = 'deadbeef-dead-dead-ca5e-000000000007';
-- SELECT 'Transacção confirmada!' AS resultado;

\echo ''
\echo '✓ Queries de validação concluídas.'
\echo ''
\echo '  Para testar autenticação via API:'
\echo '  curl -s -X POST http://localhost:8080/auth/login \'
\echo '    -H "Content-Type: application/json" \'
\echo '    -d "{\"email\":\"joao.silva@eduhub-seed.test\",\"password\":\"EduHub@2024\"}" | jq .'
\echo ''
