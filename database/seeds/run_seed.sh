#!/usr/bin/env bash
# EduHub — Executar seed de desenvolvimento
# Uso: bash database/seeds/run_seed.sh [clear]

set -euo pipefail

CONTAINER="eduhub-postgres"
DB_USER="${POSTGRES_USER:-eduhub_user}"
DB_NAME="${POSTGRES_DB:-eduhub}"
SEED_DIR="$(cd "$(dirname "$0")" && pwd)"

# Verificar que o container está a correr
if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  echo "ERRO: Container '$CONTAINER' não está a correr."
  echo "Corre 'docker compose up -d' primeiro."
  exit 1
fi

# Aguardar PostgreSQL ficar pronto
echo "A aguardar PostgreSQL..."
until docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" -q; do
  sleep 1
done
echo "PostgreSQL pronto."

if [[ "${1:-}" == "clear" ]]; then
  echo "A remover dados de seed..."
  docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$SEED_DIR/clear_seed.sql"
  echo "Seed removida."
else
  echo "A carregar seed de desenvolvimento..."
  docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$SEED_DIR/seed.sql"
fi
