#!/usr/bin/env bash
# EduHub — Testes HTTP rápidos com os dados de seed
# Uso: bash database/seeds/http_tests.sh
# Requer: curl + jq instalados

set -euo pipefail

API="${API_URL:-http://localhost:8080}"
OK=0; FAIL=0

check() {
  local label="$1"; local expected="$2"; local actual="$3"
  if echo "$actual" | grep -q "$expected" 2>/dev/null; then
    echo "  ✓ $label"
    ((OK++)) || true
  else
    echo "  ✗ $label"
    echo "    esperado: '$expected'"
    echo "    obtido:   $(echo "$actual" | head -c 120)"
    ((FAIL++)) || true
  fi
}

echo "══════════════════════════════════════════"
echo "  EduHub — Testes de integração (seed)"
echo "  API: $API"
echo "══════════════════════════════════════════"

# ── 1. Saúde dos serviços ───────────────────────────────────────────────────
echo ""
echo "1. Health checks"
check "API Gateway" '"status"' "$(curl -sf "$API/health" || echo '{}')"

# ── 2. Login como estudante ─────────────────────────────────────────────────
echo ""
echo "2. Autenticação"

STUDENT_RESP=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"joao.silva@eduhub-seed.test","password":"EduHub@2024"}' || echo '{}')
check "Login estudante (João)" '"token"' "$STUDENT_RESP"
STUDENT_TOKEN=$(echo "$STUDENT_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")

# Login como professor
TEACHER_RESP=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ana.machava@eduhub-seed.test","password":"EduHub@2024"}' || echo '{}')
check "Login professor (Ana)" '"token"' "$TEACHER_RESP"
TEACHER_TOKEN=$(echo "$TEACHER_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")

# Login como admin
ADMIN_RESP=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@eduhub-seed.test","password":"EduHub@2024"}' || echo '{}')
check "Login admin" '"token"' "$ADMIN_RESP"
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")

# Login com senha errada (deve falhar)
WRONG_RESP=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"joao.silva@eduhub-seed.test","password":"ErradaPass"}' \
  -w "%{http_code}" -o /dev/null || echo "401")
check "Login com senha errada (401)" "401" "$WRONG_RESP"

# ── 3. Cursos (público) ─────────────────────────────────────────────────────
echo ""
echo "3. Cursos"

COURSES=$(curl -sf "$API/courses" || echo '{}')
check "Listar cursos (público)" 'Matemática' "$COURSES"
check "Filtro por disciplina" 'Python' "$(curl -sf "$API/courses?discipline=programacao" || echo '')"

# ── 4. Perfil e matrículas ─────────────────────────────────────────────────
echo ""
echo "4. Perfil e matrículas (autenticado)"

if [[ -n "$STUDENT_TOKEN" ]]; then
  ENROLLMENTS=$(curl -sf "$API/enrollments/my" \
    -H "Authorization: Bearer $STUDENT_TOKEN" || echo '{}')
  check "Listar matrículas do estudante" '"course_id"' "$ENROLLMENTS"

  SESSIONS=$(curl -sf "$API/sessions/my" \
    -H "Authorization: Bearer $STUDENT_TOKEN" || echo '{}')
  check "Listar sessões do estudante" '"status"' "$SESSIONS"
else
  echo "  ⚠ Sem token — a saltar testes autenticados"
fi

# ── 5. Feedback público ─────────────────────────────────────────────────────
echo ""
echo "5. Feedback"
TEACHER_ID="deadbeef-dead-dead-cafe-000000000001"
FEEDBACK=$(curl -sf "$API/feedback/teacher/$TEACHER_ID" || echo '{}')
check "Feedback do professor (Ana)" '"rating"' "$FEEDBACK"

# ── 6. Match AI ─────────────────────────────────────────────────────────────
echo ""
echo "6. Match AI (requer serviço ai-service)"
if [[ -n "$STUDENT_TOKEN" ]]; then
  STUDENT_ID="deadbeef-dead-dead-dead-000000000005"
  MATCH=$(curl -sf "$API/ai/recommendations/$STUDENT_ID" \
    -H "Authorization: Bearer $STUDENT_TOKEN" || echo '{}')
  check "Recomendações AI para estudante" '"teacher_id"' "$MATCH"
fi

# ── 7. Histórico de pagamentos ──────────────────────────────────────────────
echo ""
echo "7. Pagamentos"
if [[ -n "$STUDENT_TOKEN" ]]; then
  HISTORY=$(curl -sf "$API/payments/history" \
    -H "Authorization: Bearer $STUDENT_TOKEN" || echo '{}')
  check "Histórico de pagamentos do estudante" '"payment_status"' "$HISTORY"
fi

if [[ -n "$TEACHER_TOKEN" ]]; then
  EARNINGS=$(curl -sf "$API/payments/earnings" \
    -H "Authorization: Bearer $TEACHER_TOKEN" || echo '{}')
  check "Ganhos do professor (Ana)" '"total_earned"' "$EARNINGS"
fi

# ── 8. Admin endpoints ──────────────────────────────────────────────────────
echo ""
echo "8. Admin"
if [[ -n "$ADMIN_TOKEN" ]]; then
  REPORT=$(curl -sf "$API/payments/admin/report" \
    -H "Authorization: Bearer $ADMIN_TOKEN" || echo '{}')
  check "Relatório financeiro (admin)" '"total_revenue"' "$REPORT"
fi

# ── Resultado final ─────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
echo "  Resultado: $OK passaram · $FAIL falharam"
echo "══════════════════════════════════════════"
[[ $FAIL -eq 0 ]]
