"""
/verdict router — AI-generated fit verdict endpoint.

POST /verdict
  JSON body (VerdictRequest):
    matched_skills  list[str]
    missing_skills  list[str]
    bonus_skills    list[str]
    jd_skills       list[str]
    match_percent   float

  Returns VerdictResponse:
    verdict  str          — "Qualified" | "Almost There" | "Not Yet"
    reasons  list[str]    — exactly 3 concise supporting reasons
"""

import logging

from fastapi import APIRouter, HTTPException

from models.schemas import VerdictRequest, VerdictResponse
from services.verdict_service import generate_verdict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verdict", tags=["verdict"])


@router.post("", response_model=VerdictResponse)
async def verdict(req: VerdictRequest) -> VerdictResponse:
    """
    Generate an AI fit verdict from already-extracted skill data.

    Accepts the output of /analyze so no re-parsing is needed.
    """
    try:
        result = generate_verdict(
            matched_skills=req.matched_skills,
            missing_skills=req.missing_skills,
            bonus_skills=req.bonus_skills,
            jd_skills=req.jd_skills,
            match_percent=req.match_percent,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # Ensure exactly 3 reasons (pad or trim if model misbehaved)
    reasons = list(result.get("reasons", []))
    if len(reasons) < 3:
        reasons += ["No additional information available."] * (3 - len(reasons))
    reasons = reasons[:3]

    return VerdictResponse(
        verdict=str(result.get("verdict", "Almost There")),
        reasons=reasons,
    )
