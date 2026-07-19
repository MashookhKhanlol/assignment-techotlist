"""
/verdict router — AI-generated fit verdict endpoints.

POST /verdict
  JSON body (VerdictRequest) — reuses already-extracted skill data from /analyze.

POST /verdict/quick
  Multipart form — same inputs as /analyze; runs the full pipeline internally
  and returns only the VerdictResponse (no skill breakdown).
"""

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from models.schemas import VerdictRequest, VerdictResponse
from services.comparison import compare_skills
from services.llm_service import extract_skills
from services.text_extractor import extract_text
from services.verdict_service import generate_verdict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verdict", tags=["verdict"])


# ── Helper ─────────────────────────────────────────────────────────────────────

def _build_verdict_response(result: dict) -> VerdictResponse:
    """Normalise the generate_verdict dict into a VerdictResponse."""
    reasons = list(result.get("reasons", []))
    if len(reasons) < 3:
        reasons += ["No additional information available."] * (3 - len(reasons))
    return VerdictResponse(
        verdict=str(result.get("verdict", "Almost There")),
        reasons=reasons[:3],
    )


# ── POST /verdict — accepts already-extracted skill data ──────────────────────

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

    return _build_verdict_response(result)


# ── POST /verdict/quick — accepts raw resume + JD, full pipeline ──────────────

@router.post("/quick", response_model=VerdictResponse)
async def verdict_quick(
    resume_file: UploadFile = File(..., description="Candidate's resume (PDF/DOCX/TXT)"),
    jd_text: str = Form("", description="Job description as plain text"),
    jd_file: UploadFile | None = File(None, description="Job description file (optional)"),
) -> VerdictResponse:
    """
    Full pipeline in one call: extract text → extract skills → compare → verdict.
    Returns only the fit verdict with reasons (no skill breakdown).
    """
    # ── 1. Resume text ─────────────────────────────────────────────────────────
    resume_bytes = await resume_file.read()
    if not resume_bytes:
        raise HTTPException(status_code=422, detail="Resume file is empty.")
    try:
        resume_text = extract_text(
            resume_bytes,
            content_type=resume_file.content_type or "",
            filename=resume_file.filename or "",
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # ── 2. JD text ─────────────────────────────────────────────────────────────
    jd_source = jd_text.strip()
    if not jd_source and jd_file:
        jd_bytes = await jd_file.read()
        try:
            jd_source = extract_text(
                jd_bytes,
                content_type=jd_file.content_type or "",
                filename=jd_file.filename or "",
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    if not jd_source:
        raise HTTPException(
            status_code=422,
            detail="Provide a job description via jd_text or jd_file.",
        )

    # ── 3. Extract skills + compare ────────────────────────────────────────────
    try:
        logger.info("verdict/quick — extracting skills")
        resume_skills = extract_skills(resume_text, context="resume")
        jd_skills = extract_skills(jd_source, context="job description")
        comparison = compare_skills(resume_skills, jd_skills)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # ── 4. Generate verdict ────────────────────────────────────────────────────
    try:
        result = generate_verdict(
            matched_skills=comparison["matched"],
            missing_skills=comparison["missing"],
            bonus_skills=comparison["bonus"],
            jd_skills=jd_skills,
            match_percent=comparison["match_percent"],
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return _build_verdict_response(result)
