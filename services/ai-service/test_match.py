"""Tests for compute_match_score — no database or network required."""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from main import compute_match_score, MatchRequest


def make_req(**kw):
    defaults = dict(student_id="00000000-0000-0000-0000-000000000001",
                    discipline_slug="matematica")
    defaults.update(kw)
    return MatchRequest(**defaults)


def make_teacher(**kw):
    defaults = dict(
        id="t1", full_name="Prof Test",
        rating=5.0, total_reviews=100,
        is_featured=False, is_validated=True,
        price_per_hour=500.0, level="all",
        available_days=[1, 2, 3, 4, 5],
    )
    defaults.update(kw)
    return defaults


# ─── Basic scoring ────────────────────────────────────────────────────────────

def test_score_range():
    score, _ = compute_match_score(make_teacher(), make_req(), "beginner")
    assert 0.0 <= score <= 1.0, f"score out of range: {score}"


def test_perfect_teacher_scores_high():
    t = make_teacher(rating=5.0, is_featured=True, total_reviews=200)
    req = make_req(preferred_days=[1, 2, 3], max_price_per_hour=600.0)
    score, _ = compute_match_score(t, req, "beginner")
    assert score >= 0.80, f"perfect teacher should score high, got {score}"


def test_low_rating_scores_lower():
    t_high = make_teacher(rating=5.0)
    t_low  = make_teacher(rating=2.0)
    req = make_req()
    s_high, _ = compute_match_score(t_high, req, "beginner")
    s_low, _  = compute_match_score(t_low,  req, "beginner")
    assert s_high > s_low, "higher rating should yield higher score"


def test_level_match_adds_score():
    t_match    = make_teacher(level="beginner")
    t_mismatch = make_teacher(level="advanced")
    req = make_req()
    s_match, _    = compute_match_score(t_match,    req, "beginner")
    s_mismatch, _ = compute_match_score(t_mismatch, req, "beginner")
    assert s_match > s_mismatch, "level match should score higher"


def test_within_budget_scores_higher():
    t_cheap     = make_teacher(price_per_hour=200.0)
    t_expensive = make_teacher(price_per_hour=900.0)
    req = make_req(max_price_per_hour=500.0)
    s_cheap, _     = compute_match_score(t_cheap,     req, "beginner")
    s_expensive, _ = compute_match_score(t_expensive, req, "beginner")
    assert s_cheap > s_expensive, "cheaper teacher within budget should score higher"


def test_schedule_overlap_adds_score():
    t_overlap   = make_teacher(available_days=[1, 2, 3, 4, 5])
    t_no_overlap = make_teacher(available_days=[6, 0])
    req = make_req(preferred_days=[1, 2, 3])
    s_overlap, _    = compute_match_score(t_overlap,    req, "beginner")
    s_no_overlap, _ = compute_match_score(t_no_overlap, req, "beginner")
    assert s_overlap > s_no_overlap, "schedule overlap should add score"


def test_featured_adds_score():
    t_featured     = make_teacher(is_featured=True)
    t_not_featured = make_teacher(is_featured=False)
    req = make_req()
    s_feat, _     = compute_match_score(t_featured,     req, "beginner")
    s_no_feat, _  = compute_match_score(t_not_featured, req, "beginner")
    assert s_feat > s_no_feat, "featured teacher should score higher"


def test_reasons_not_empty_for_good_teacher():
    t = make_teacher(rating=4.8, is_featured=True)
    _, reasons = compute_match_score(t, make_req(), "beginner")
    assert len(reasons) > 0, "good teacher should have match reasons"


# ─── Run ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    passed = failed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"  FAIL  {t.__name__}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
