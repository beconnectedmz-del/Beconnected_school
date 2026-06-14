# 🎓 EduHub — Escola Virtual Multi-Disciplinar

Plataforma de ensino online escalável que conecta estudantes e professores de qualquer disciplina, com aulas ao vivo por videochamada, aulas gravadas, sistema de comissões automáticas e funil de vendas integrado.

**Escala alvo:** 200.000+ estudantes | 5.000+ professores | 10.000+ conexões simultâneas

---

## 🏗️ Arquitectura

```
                    ┌──────────┐
    Internet ──────►│  NGINX   │ (reverse proxy + rate limiting)
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │  API     │ (Go + Fiber — roteamento + JWT)
                    │ Gateway  │
                    └────┬─────┘
          ┌──────────────┼──────────────────────────────┐
          │              │              │                │
    ┌─────▼────┐  ┌──────▼──────┐ ┌────▼──────┐  ┌─────▼──────┐
    │   Auth   │  │    User     │ │ Payment   │  │ Streaming  │
    │ (Go)     │  │   (Go)      │ │  (Go)     │  │ (Node.js)  │
    └──────────┘  └─────────────┘ └───────────┘  └────────────┘
          │              │              │                │
    ┌─────▼────┐  ┌──────▼──────┐ ┌────▼──────┐  ┌─────▼──────┐
    │ Content  │  │     AI      │ │  Notif.   │  │  PostgreSQL│
    │(Node.js) │  │  (Python)   │ │(Node.js)  │  │  Redis     │
    └──────────┘  └─────────────┘ └───────────┘  │  MinIO     │
                                                   └────────────┘
```

### Stack

| Serviço | Tecnologia |
|---|---|
| API Gateway | Go + Fiber |
| Auth Service | Go + Fiber + JWT |
| User Service | Go + Fiber |
| Payment Service | Go + Fiber |
| Streaming | Node.js + Socket.io + WebRTC |
| Content | Node.js + MinIO |
| AI/Match | Python + FastAPI |
| Notifications | Node.js + Nodemailer + Web Push |
| Base de dados | PostgreSQL 15 |
| Cache/Sessões | Redis 7 |
| Armazenamento | MinIO (S3-compatible) |
| Proxy | NGINX |

---

## 🚀 Início Rápido

```bash
# Clonar e entrar no directório
cd eduhub

# Setup completo com um comando
bash setup.sh
```

### Ou manualmente:

```bash
cp .env.example .env
# Editar .env com as tuas credenciais

docker-compose up -d
bash database/run-migrations.sh
```

---

## 🌐 URLs

| Serviço | URL |
|---|---|
| API Principal | http://localhost:8080 |
| MinIO Console | http://localhost:9001 |
| Health Check | http://localhost:8080/health |

---

## 📡 API — Endpoints Principais

### Auth
```
POST /auth/register          → Registar utilizador
POST /auth/login             → Login (retorna JWT)
POST /auth/refresh           → Renovar token
POST /auth/logout            → Terminar sessão
GET  /auth/me                → Dados do utilizador autenticado
POST /auth/forgot-password   → Recuperar password
POST /auth/reset-password    → Redefinir password
POST /auth/verify-email      → Verificar email
```

### Estudantes
```
POST /students/profile       → Criar perfil
PUT  /students/profile       → Actualizar perfil
POST /students/diagnostic    → Submeter diagnóstico de nível
GET  /students/dashboard     → Painel do estudante
GET  /students/recommendations → Professores recomendados (AI)
```

### Professores
```
POST /teachers/profile       → Criar perfil
PUT  /teachers/profile       → Actualizar perfil
POST /teachers/availability  → Definir horários
GET  /teachers/dashboard     → Painel do professor
GET  /teachers/list          → Listagem pública com filtros
GET  /teachers/:id           → Perfil público do professor
```

### Pagamentos (comissões 70/20/10)
```
POST /payments/checkout      → Iniciar pagamento
POST /payments/webhook       → Webhook do gateway
GET  /payments/history       → Histórico do estudante
GET  /payments/earnings      → Ganhos do professor
POST /payouts/request        → Solicitar levantamento
GET  /admin/financial-report → Relatório financeiro (admin)
```

### Streaming (WebRTC via Socket.io)
```
WS  /socket.io               → Conexão Socket.io
Events: join-room, offer, answer, ice-candidate,
        chat-message, raise-hand, media-state,
        start-screenshare, leave-room
```

### Conteúdo
```
POST /content/upload/video   → Upload de vídeo (MinIO)
POST /content/upload/material → Upload de material
GET  /content/signed-url     → URL temporária para streaming
GET  /content/pending        → Aulas pendentes de revisão (admin)
POST /content/lessons/:id/approve → Aprovar aula
POST /content/lessons/:id/reject  → Rejeitar aula
```

### AI/Match
```
POST /match                    → Match estudante-professor
GET  /recommendations/:id      → Recomendações personalizadas
```

### Notificações
```
GET  /notifications            → Listar notificações
POST /notifications/:id/read   → Marcar como lida
POST /notifications/read-all   → Marcar todas como lidas
GET  /notifications/unread-count → Contagem de não lidas
POST /push/subscribe           → Subscrever Web Push
```

---

## 💰 Modelo de Comissões

```
Valor total pago pelo estudante = 100%
  ├── Professor recebe:  70%
  ├── Plataforma retém:  20%
  └── Afiliado/Vendedor: 10% (se houver código de afiliado)

Se não houver afiliado:
  ├── Professor:  70%
  └── Plataforma: 30%
```

---

## 🤖 Algoritmo de Match (AI Service)

O match professor-estudante usa scoring ponderado:

| Factor | Peso |
|---|---|
| Rating do professor | 35% |
| Compatibilidade de nível | 25% |
| Disponibilidade de horários | 20% |
| Preço vs. orçamento | 15% |
| Professor em destaque | 5% |

---

## 👥 Perfis de Administração

| Perfil | Acesso |
|---|---|
| `super_admin` | Acesso total ao sistema |
| `financial_manager` | Transacções, payouts, relatórios |
| `academic_coordinator` | Cursos, aulas, feedbacks, validações |
| `support` | Utilizadores (leitura), tickets, sessões |

---

## 🛠️ Comandos Úteis

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f auth-service

# Reiniciar um serviço
docker-compose restart payment-service

# Parar tudo
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker-compose down -v

# Ver estado dos containers
docker-compose ps
```

---

## ⚠️ Variáveis de Ambiente Críticas

Antes de ir para produção, configura obrigatoriamente no `.env`:
- `JWT_SECRET` — mínimo 64 caracteres aleatórios
- `POSTGRES_PASSWORD` — password forte
- `REDIS_PASSWORD` — password forte
- `MINIO_ROOT_PASSWORD` — password forte
- `PAYMENT_GATEWAY_KEY` / `PAYMENT_GATEWAY_SECRET` — credenciais do gateway
- `SMTP_*` — configuração de email
- `VAPID_*` — chaves para Web Push

---

## 🔒 Segurança

- Todas as passwords com bcrypt (custo configurável)
- JWT com expiração curta (24h) + refresh tokens no Redis
- Rate limiting por IP no API Gateway e NGINX
- Inputs validados em todos os endpoints
- Transacções atómicas em operações financeiras
- Headers de segurança (HSTS, CSP, X-Frame-Options) via NGINX
- Assinatura HMAC em webhooks de pagamento
- Logs estruturados em JSON para auditoria
