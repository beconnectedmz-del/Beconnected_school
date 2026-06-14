#!/bin/bash
set -e

source .env

echo "==> Running EduHub database migrations..."

for file in database/migrations/*.sql; do
  echo "  -> Applying: $file"
  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h localhost \
    -p 5432 \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -f "$file"
done

echo "==> All migrations applied successfully!"
