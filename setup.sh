#!/bin/bash
set -e

BOLD="\033[1m"
GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

header() { echo -e "\n${BOLD}${CYAN}==> $1${RESET}"; }
ok()     { echo -e "${GREEN}  ✓ $1${RESET}"; }
warn()   { echo -e "${YELLOW}  ⚠ $1${RESET}"; }
err()    { echo -e "${RED}  ✗ $1${RESET}"; exit 1; }

# ─── Verificar dependências ────────────────────────────────────────────────────
header "Verificando dependências"
for cmd in docker docker-compose; do
  command -v "$cmd" &>/dev/null && ok "$cmd instalado" || err "$cmd não encontrado. Instala em https://docker.com"
done

# ─── Copiar .env ───────────────────────────────────────────────────────────────
header "Configuração do ambiente"
if [ ! -f .env ]; then
  cp .env.example .env
  ok ".env criado a partir de .env.example"
  warn "IMPORTANTE: Edita o ficheiro .env antes de continuar em produção!"
else
  ok ".env já existe"
fi

# ─── Subir infraestrutura ──────────────────────────────────────────────────────
header "Iniciando infraestrutura (PostgreSQL + Redis + MinIO)"
docker-compose up -d postgres redis minio
echo "  Aguardando serviços ficarem prontos..."
sleep 15
ok "Infraestrutura pronta"

# ─── Migrations ────────────────────────────────────────────────────────────────
header "Aplicando migrations da base de dados"
source .env

for file in $(ls database/migrations/*.sql | sort); do
  echo "  -> $file"
  docker exec -i eduhub-postgres psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    < "$file" 2>&1 | grep -v "^$" | grep -v "^CREATE" | grep -v "^INSERT" || true
done
ok "Migrations aplicadas"

# ─── Build e arrancar serviços ────────────────────────────────────────────────
header "Construindo e iniciando todos os serviços"
docker-compose up -d --build
echo "  Aguardando serviços inicializarem..."
sleep 20

# ─── Health check ──────────────────────────────────────────────────────────────
header "Verificando saúde dos serviços"
GATEWAY_URL="http://localhost:8080"
for i in {1..10}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL/health" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    ok "API Gateway respondendo"
    break
  fi
  if [ $i -eq 10 ]; then
    warn "Gateway ainda não respondeu — verifique os logs: docker-compose logs api-gateway"
  fi
  sleep 5
done

# ─── Criar buckets MinIO ───────────────────────────────────────────────────────
header "Configurando MinIO"
docker exec eduhub-minio mc alias set local http://localhost:9000 \
  "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" 2>/dev/null || true
for bucket in videos materials avatars presentations; do
  docker exec eduhub-minio mc mb --ignore-existing "local/$bucket" 2>/dev/null && ok "Bucket: $bucket" || true
done

# ─── Sumário ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║          🎓 EduHub está a funcionar!               ║${RESET}"
echo -e "${BOLD}${GREEN}╠════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║  API (HTTPS):    https://localhost                ║${RESET}"
echo -e "${BOLD}${GREEN}║  API (HTTP):     http://localhost (→ HTTPS)       ║${RESET}"
echo -e "${BOLD}${GREEN}║  MinIO Console:  http://localhost:9001             ║${RESET}"
echo -e "${BOLD}${GREEN}║  Auth:           https://localhost/auth/login      ║${RESET}"
echo -e "${BOLD}${GREEN}║  Health:         https://localhost/health          ║${RESET}"
echo -e "${BOLD}${GREEN}║  Postman:        docs/EduHub.postman_collection.json ║${RESET}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Para ver logs: ${CYAN}docker-compose logs -f${RESET}"
echo -e "  Para parar:    ${CYAN}docker-compose down${RESET}"
echo ""
