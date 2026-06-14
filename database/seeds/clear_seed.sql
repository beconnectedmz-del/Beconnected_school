-- EduHub — Remover todos os dados de seed
-- Remove apenas registos cujo ID começa com 'deadbeef-dead-dead-'
-- Dados reais não são afectados.
--
-- Uso: docker exec -i eduhub-postgres psql -U eduhub_user -d eduhub < database/seeds/clear_seed.sql

BEGIN;

DELETE FROM lesson_progress   WHERE id::text   LIKE 'deadbeef-dead-dead-a11c-%';
DELETE FROM enrollments       WHERE id::text   LIKE 'deadbeef-dead-dead-b0a7-%';
DELETE FROM feedbacks         WHERE id::text   LIKE 'deadbeef-dead-dead-f33d-%';
DELETE FROM transactions      WHERE id::text   LIKE 'deadbeef-dead-dead-ca5e-%';
DELETE FROM live_sessions     WHERE id::text   LIKE 'deadbeef-dead-dead-bad0-%';
DELETE FROM lessons           WHERE id::text   LIKE 'deadbeef-dead-dead-feed-%';
DELETE FROM courses           WHERE id::text   LIKE 'deadbeef-dead-dead-face-%';
DELETE FROM affiliate_clicks  WHERE affiliate_id::text LIKE 'deadbeef-dead-dead-afaf-%';
DELETE FROM affiliates        WHERE id::text   LIKE 'deadbeef-dead-dead-afaf-%';
DELETE FROM leads             WHERE id::text   LIKE 'deadbeef-dead-dead-1ead-%';
DELETE FROM teacher_availability WHERE teacher_id::text LIKE 'deadbeef-dead-dead-cafe-%';
DELETE FROM teacher_disciplines  WHERE teacher_id::text LIKE 'deadbeef-dead-dead-cafe-%';
DELETE FROM admin_profiles    WHERE id::text   LIKE 'deadbeef-dead-dead-fade-%';
DELETE FROM teacher_profiles  WHERE id::text   LIKE 'deadbeef-dead-dead-cafe-%';
DELETE FROM student_profiles  WHERE id::text   LIKE 'deadbeef-dead-dead-babe-%';
DELETE FROM users             WHERE id::text   LIKE 'deadbeef-dead-dead-dead-%';

COMMIT;

\echo 'Seed removida com sucesso.'
