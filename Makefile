# EduHub — Comandos de desenvolvimento
# Uso: make <target>

COMPOSE  = docker compose
PSQL     = docker exec -i eduhub-postgres psql -U eduhub_user -d eduhub

.PHONY: help up down restart logs seed seed-clear psql \
        test-go test-js test-py test build-all

help:
	@echo ""
	@echo "  EduHub — Comandos disponíveis"
	@echo "  ──────────────────────────────────────────────"
	@echo "  make up          Iniciar todos os serviços"
	@echo "  make down        Parar todos os serviços"
	@echo "  make restart     Reiniciar todos os serviços"
	@echo "  make logs        Ver logs em tempo real"
	@echo "  make logs s=auth Ver logs de um serviço específico"
	@echo "  ──────────────────────────────────────────────"
	@echo "  make seed        Carregar dados de teste"
	@echo "  make seed-clear  Remover dados de teste"
	@echo "  make psql        Abrir psql interactivo"
	@echo "  ──────────────────────────────────────────────"
	@echo "  make test        Correr todos os testes"
	@echo "  make test-go     Testes Go (todos os serviços)"
	@echo "  make test-js     Testes JavaScript"
	@echo "  make test-py     Testes Python"
	@echo "  ──────────────────────────────────────────────"
	@echo "  make build-all   Build de todas as imagens Docker"
	@echo ""

# ── Ciclo de vida ─────────────────────────────────────────────────────────────
up:
	$(COMPOSE) up -d
	@echo ""
	@echo "  Serviços a correr:"
	@echo "  Frontend  → http://localhost:3000"
	@echo "  API       → http://localhost:8080"
	@echo "  MinIO     → http://localhost:9001"

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

logs:
ifdef s
	$(COMPOSE) logs -f $(s)-service
else
	$(COMPOSE) logs -f
endif

# ── Base de dados ─────────────────────────────────────────────────────────────
seed:
	@echo "A carregar seed de desenvolvimento..."
	$(PSQL) < database/seeds/seed.sql
	@echo "Seed carregada. Senha de todos: EduHub@2024"

seed-clear:
	@echo "A remover dados de seed..."
	$(PSQL) < database/seeds/clear_seed.sql

seed-reset: seed-clear seed

psql:
	docker exec -it eduhub-postgres psql -U eduhub_user -d eduhub

# ── Testes ────────────────────────────────────────────────────────────────────
test: test-go test-js test-py

test-go:
	@echo "── Testes Go ────────────────────────────"
	@for svc in auth-service payment-service course-service user-service api-gateway funnel-service; do \
		echo "  → $$svc"; \
		docker run --rm \
			-v "$(PWD)/services/$$svc:/app" \
			-w /app \
			golang:1.22-alpine \
			sh -c "go mod tidy && go test ./... -race -timeout 60s" || exit 1; \
	done

test-js:
	@echo "── Testes JavaScript ─────────────────────"
	@echo "  → content-service"
	@docker run --rm \
		-v "$(PWD)/services/content-service:/app" \
		-w /app \
		node:20-alpine \
		sh -c "npm ci --quiet && node --test src/security.test.js"

test-py:
	@echo "── Testes Python ─────────────────────────"
	@echo "  → ai-service"
	@docker run --rm \
		-v "$(PWD)/services/ai-service:/app" \
		-w /app \
		python:3.11-alpine \
		sh -c "pip install fastapi pydantic python-jose numpy -q && python test_match.py"

# ── Build ─────────────────────────────────────────────────────────────────────
build-all:
	$(COMPOSE) build --parallel
