#!/usr/bin/env bash
# Inicializa todas as dependências do projecto EduHub
# Execute uma vez antes de: docker compose up --build
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

echo ""
echo "========================================="
echo "   EduHub — Inicialização de dependências"
echo "========================================="
echo ""

# ─── 1. go.sum para todos os serviços Go ──────────────────────────────────────
GO_SERVICES=(api-gateway auth-service user-service payment-service course-service funnel-service)

if command -v go &>/dev/null; then
  for svc in "${GO_SERVICES[@]}"; do
    dir="$ROOT_DIR/services/$svc"
    if [ -f "$dir/go.mod" ]; then
      echo -n "  go mod tidy → $svc ... "
      (cd "$dir" && go mod tidy) && log "ok" || err "falhou"
    fi
  done
else
  warn "Go não encontrado localmente — go.sum será gerado dentro do Docker durante o build"
  warn "Para gerar localmente: instale Go 1.22+ e volte a correr este script"
fi

# ─── 2. node_modules para os serviços Node.js ─────────────────────────────────
NODE_SERVICES=(streaming-service content-service notification-service)

if command -v npm &>/dev/null; then
  for svc in "${NODE_SERVICES[@]}"; do
    dir="$ROOT_DIR/services/$svc"
    if [ -f "$dir/package.json" ]; then
      echo -n "  npm install → $svc ... "
      (cd "$dir" && npm install --prefer-offline 2>/dev/null) && log "ok" || err "falhou"
    fi
  done
else
  warn "npm não encontrado — node_modules serão instalados dentro do Docker"
fi

# ─── 3. Certificado SSL ────────────────────────────────────────────────────────
SSL_DIR="$ROOT_DIR/nginx/ssl"
mkdir -p "$SSL_DIR"

if [ ! -f "$SSL_DIR/eduhub.crt" ]; then
  if command -v openssl &>/dev/null; then
    echo -n "  Gerando certificado SSL self-signed ... "
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout "$SSL_DIR/eduhub.key" \
      -out    "$SSL_DIR/eduhub.crt" \
      -subj "/C=MZ/ST=Maputo/L=Maputo/O=EduHub/CN=localhost" \
      2>/dev/null && log "ok" || err "falhou"
  else
    warn "OpenSSL não encontrado — forneça eduhub.crt e eduhub.key em nginx/ssl/"
  fi
else
  log "Certificado SSL já existe — pulando"
fi

# ─── 4. Ficheiro .env ─────────────────────────────────────────────────────────
if [ ! -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  warn ".env criado a partir de .env.example — EDITE os valores antes de iniciar!"
else
  log ".env já existe"
fi

# ─── 5. Dependência Python (ai-service) ───────────────────────────────────────
if command -v pip3 &>/dev/null; then
  echo -n "  pip install → ai-service ... "
  (cd "$ROOT_DIR/services/ai-service" && pip3 install -r requirements.txt -q) && log "ok" || err "falhou"
else
  warn "pip3 não encontrado — dependências Python serão instaladas dentro do Docker"
fi

echo ""
echo "========================================="
log "Inicialização concluída!"
echo ""
echo "  Próximo passo:"
echo "    1. Edite .env com as suas credenciais"
echo "    2. docker compose up --build"
echo "========================================="
echo ""
