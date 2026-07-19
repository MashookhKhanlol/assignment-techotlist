"""
Skill comparison logic — pure Python, deterministic set operations.

No LLM needed here. Operates on already-normalised skill lists.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def _normalise(skill: str) -> str:
    """Lower-case and strip a skill string for comparison purposes."""
    return skill.strip().lower()


def compare_skills(
    resume_skills: list[str],
    jd_skills: list[str],
) -> dict[str, list[str] | float]:
    """
    Compare resume skills against JD skills using set operations.

    Args:
        resume_skills: Normalised skills extracted from the candidate's resume.
        jd_skills:     Normalised skills extracted from the job description.

    Returns:
        A dict with keys:
            matched_skills  — skills present in both (uses JD casing)
            missing_skills  — JD skills absent from resume (uses JD casing)
            bonus_skills    — resume skills not in JD (uses resume casing)
            match_percent   — float 0–100
    """
    if not jd_skills:
        logger.warning("JD skills list is empty — cannot compute match percentage.")
        return {
            "matched_skills": [],
            "missing_skills": [],
            "bonus_skills": resume_skills[:],
            "match_percent": 0.0,
        }

    # Build lookup maps: normalised key → original casing
    resume_map: dict[str, str] = {_normalise(s): s for s in resume_skills}
    jd_map: dict[str, str] = {_normalise(s): s for s in jd_skills}

    resume_keys = set(resume_map.keys())
    jd_keys = set(jd_map.keys())

    matched_keys = resume_keys & jd_keys
    missing_keys = jd_keys - resume_keys
    bonus_keys = resume_keys - jd_keys

    # Preserve original casing from the source list
    matched = sorted(jd_map[k] for k in matched_keys)
    missing = sorted(jd_map[k] for k in missing_keys)
    bonus = sorted(resume_map[k] for k in bonus_keys)

    match_percent = round(len(matched_keys) / len(jd_keys) * 100, 1)

    logger.info(
        "Comparison — matched=%d, missing=%d, bonus=%d, percent=%.1f%%",
        len(matched),
        len(missing),
        len(bonus),
        match_percent,
    )

    return {
        "matched_skills": matched,
        "missing_skills": missing,
        "bonus_skills": bonus,
        "match_percent": match_percent,
    }
