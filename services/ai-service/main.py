"""
EduHub AI/Match Service
Algoritmo de match estudante-professor baseado em:
  - Nível de proficiência do estudante
  - Disciplina e nível desejado
  - Disponibilidade de horários
  - Rating do professor
  - Histórico de feedback
"""

import os
import logging
import json
from contextlib import asynccontextmanager
from typing import Optional

import asyncpg
import redis.asyncio as aioredis
import numpy as np
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, UUID4
from jose import jwt, JWTError


# ─── Config ───────────────────────────────────────────────────────────────────
DATABASE_URL   = os.getenv("DATABASE_URL")
REDIS_URL      = os.getenv("REDIS_URL", "redis://localhost:6379/5")
JWT_SECRET     = os.getenv("JWT_SECRET")
REC_LIMIT      = int(os.getenv("RECOMMENDATION_LIMIT", "10"))

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger("ai-service")

# ─── App lifecycle ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    app.state.redis = await aioredis.from_url(REDIS_URL, decode_responses=True)
    log.info("AI Service started")
    yield
    await app.state.db.close()
    await app.state.redis.aclose()

app = FastAPI(title="EduHub AI Service", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ─── Auth ──────────────────────────────────────────────────────────────────────
async def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="token não fornecido")
    try:
        payload = jwt.decode(authorization.split(" ")[1], JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="token inválido")


# ─── Modelos ───────────────────────────────────────────────────────────────────
class MatchRequest(BaseModel):
    student_id: UUID4
    discipline_slug: str
    level: Optional[str] = None
    preferred_days: Optional[list[int]] = None   # 0=Dom, 6=Sáb
    preferred_times: Optional[list[str]] = None  # ex: ["08:00","09:00"]
    max_price_per_hour: Optional[float] = None
    limit: Optional[int] = REC_LIMIT


class TeacherScore(BaseModel):
    teacher_id: str
    full_name: str
    rating: float
    total_reviews: int
    price_per_hour: float
    match_score: float
    match_reasons: list[str]
    is_featured: bool


# ─── Match Algorithm ───────────────────────────────────────────────────────────
def compute_match_score(teacher: dict, req: MatchRequest, student_level: str) -> tuple[float, list[str]]:
    """
    Weighted scoring:
      - Rating do professor:      35%
      - Compatibilidade de nível: 25%
      - Disponibilidade:          20%
      - Preço:                    15%
      - Featured:                  5%
    """
    score = 0.0
    reasons = []

    # Rating (35%)
    rating = float(teacher.get("rating") or 0)
    rating_score = (rating / 5.0) * 0.35
    score += rating_score
    if rating >= 4.5:
        reasons.append(f"Avaliação excelente: {rating:.1f}⭐")
    elif rating >= 4.0:
        reasons.append(f"Boa avaliação: {rating:.1f}⭐")

    # Nível (25%)
    teacher_level = teacher.get("level", "all")
    if teacher_level == "all" or teacher_level == student_level:
        score += 0.25
        reasons.append(f"Especializado no nível {student_level}")
    elif (student_level == "intermediate" and teacher_level in ["basic","advanced"]):
        score += 0.10

    # Disponibilidade (20%)
    if req.preferred_days and teacher.get("available_days"):
        available = set(teacher["available_days"])
        wanted = set(req.preferred_days)
        overlap = len(available & wanted) / max(len(wanted), 1)
        avail_score = overlap * 0.20
        score += avail_score
        if overlap >= 0.75:
            reasons.append("Horário muito compatível")
        elif overlap >= 0.5:
            reasons.append("Horário parcialmente compatível")
    else:
        score += 0.10  # sem preferência, neutro

    # Preço (15%)
    price = float(teacher.get("price_per_hour") or 0)
    if req.max_price_per_hour and price > 0:
        if price <= req.max_price_per_hour:
            price_score = min((req.max_price_per_hour - price) / req.max_price_per_hour, 1.0) * 0.15
            score += price_score + 0.05  # bónus por estar dentro do orçamento
            reasons.append(f"Dentro do orçamento: {price:.0f} MZN/h")
        else:
            reasons.append(f"Acima do orçamento: {price:.0f} MZN/h")
    else:
        score += 0.075  # neutro

    # Featured (5%)
    if teacher.get("is_featured"):
        score += 0.05
        reasons.append("Professor em destaque")

    # Bónus por total de reviews (reputação)
    reviews = int(teacher.get("total_reviews") or 0)
    if reviews >= 100:
        score += 0.02
    elif reviews >= 50:
        score += 0.01

    return round(min(score, 1.0), 4), reasons


# ─── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai"}


@app.post("/match", response_model=list[TeacherScore])
async def match_teachers(req: MatchRequest, user=Depends(verify_token)):
    db = app.state.db
    redis = app.state.redis

    # Cache
    cache_key = f"match:{req.student_id}:{req.discipline_slug}:{req.level}:{req.max_price_per_hour}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # Nível do estudante
    student_level = await db.fetchval(
        "SELECT proficiency_level FROM student_profiles WHERE user_id = $1",
        str(req.student_id),
    ) or "beginner"

    # Buscar professores que ensinam a disciplina
    query = """
        SELECT
          tp.id, tp.full_name, tp.rating, tp.total_reviews,
          tp.is_validated, tp.is_featured, tp.timezone,
          td.price_per_hour, td.level,
          ARRAY_AGG(DISTINCT ta.day_of_week) FILTER (WHERE ta.day_of_week IS NOT NULL) as available_days
        FROM teacher_profiles tp
        JOIN teacher_disciplines td ON td.teacher_id = tp.id
        JOIN disciplines d ON d.id = td.discipline_id
        LEFT JOIN teacher_availability ta ON ta.teacher_id = tp.id AND ta.is_active = TRUE
        WHERE tp.is_validated = TRUE
          AND d.slug = $1
          AND ($2::TEXT IS NULL OR td.level IN ($2, 'all'))
          AND ($3::NUMERIC IS NULL OR td.price_per_hour <= $3)
        GROUP BY tp.id, tp.full_name, tp.rating, tp.total_reviews,
                 tp.is_validated, tp.is_featured, tp.timezone,
                 td.price_per_hour, td.level
        ORDER BY tp.rating DESC
        LIMIT 100
    """
    rows = await db.fetch(
        query,
        req.discipline_slug,
        req.level,
        req.max_price_per_hour,
    )

    scored = []
    for row in rows:
        teacher = dict(row)
        teacher["available_days"] = list(teacher.get("available_days") or [])
        match_score, reasons = compute_match_score(teacher, req, student_level)
        scored.append(TeacherScore(
            teacher_id=str(teacher["id"]),
            full_name=teacher["full_name"],
            rating=float(teacher["rating"] or 0),
            total_reviews=int(teacher["total_reviews"] or 0),
            price_per_hour=float(teacher["price_per_hour"] or 0),
            match_score=match_score,
            match_reasons=reasons,
            is_featured=bool(teacher["is_featured"]),
        ))

    # Ordenar por score
    scored.sort(key=lambda x: (x.match_score, x.rating), reverse=True)
    result = scored[:req.limit or REC_LIMIT]

    # Cache por 5 minutos
    await redis.setex(cache_key, 300, json.dumps([r.model_dump() for r in result]))

    return result


@app.get("/recommendations/{student_id}", response_model=list[TeacherScore])
async def get_recommendations(student_id: str, user=Depends(verify_token)):
    db = app.state.db
    redis = app.state.redis

    cache_key = f"recommendations:{student_id}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # Buscar dados do estudante
    row = await db.fetchrow(
        "SELECT proficiency_level, diagnostic_answers FROM student_profiles WHERE user_id = $1",
        student_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="perfil de estudante não encontrado")

    student_level = row["proficiency_level"] or "beginner"
    diagnostic    = row["diagnostic_answers"] or {}
    interest      = diagnostic.get("preferred_discipline", "")

    # Buscar professores mais bem avaliados por disciplina de interesse
    rows = await db.fetch("""
        SELECT
          tp.id, tp.full_name, tp.rating, tp.total_reviews, tp.is_featured,
          td.price_per_hour, td.level, d.slug as discipline_slug,
          ARRAY_AGG(DISTINCT ta.day_of_week) FILTER (WHERE ta.day_of_week IS NOT NULL) as available_days
        FROM teacher_profiles tp
        JOIN teacher_disciplines td ON td.teacher_id = tp.id
        JOIN disciplines d ON d.id = td.discipline_id
        LEFT JOIN teacher_availability ta ON ta.teacher_id = tp.id AND ta.is_active = TRUE
        WHERE tp.is_validated = TRUE
          AND tp.rating >= 4.0
          AND ($1 = '' OR d.slug = $1)
        GROUP BY tp.id, tp.full_name, tp.rating, tp.total_reviews, tp.is_featured,
                 td.price_per_hour, td.level, d.slug
        ORDER BY tp.is_featured DESC, tp.rating DESC
        LIMIT 50
    """, interest)

    req = MatchRequest(
        student_id=student_id,
        discipline_slug=interest or "matematica",
    )

    scored = []
    for row in rows:
        teacher = dict(row)
        teacher["available_days"] = list(teacher.get("available_days") or [])
        match_score, reasons = compute_match_score(teacher, req, student_level)
        scored.append(TeacherScore(
            teacher_id=str(teacher["id"]),
            full_name=teacher["full_name"],
            rating=float(teacher["rating"] or 0),
            total_reviews=int(teacher["total_reviews"] or 0),
            price_per_hour=float(teacher["price_per_hour"] or 0),
            match_score=match_score,
            match_reasons=reasons,
            is_featured=bool(teacher["is_featured"]),
        ))

    scored.sort(key=lambda x: x.match_score, reverse=True)
    result = scored[:REC_LIMIT]

    await redis.setex(cache_key, 600, json.dumps([r.model_dump() for r in result]))

    return result
