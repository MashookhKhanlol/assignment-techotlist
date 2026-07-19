"""
/analyze router — main endpoint for skill gap analysis.

POST /analyze
  Form fields:
    resume_file  (required) — PDF, DOCX, or TXT upload
    jd_text      (optional) — raw job description text
    jd_file      (optional) — PDF, DOCX, or TXT upload for JD

  At least one of jd_text or jd_file must be provided.
"""

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from models.schemas import AnalyzeResponse
from services.comparison import compare_skills
from services.llm_service import extract_skills
from services.text_extractor import extract_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("", response_model=AnalyzeResponse)
async def analyze(
    resume_file: UploadFile = File(..., description="Candidate's resume (PDF/DOCX/TXT)"),
    jd_text: str = Form("", description="Job description as plain text"),
    jd_file: UploadFile | None = File(None, description="Job description file (PDF/DOCX/TXT)"),
) -> AnalyzeResponse:
    """
    Extract skills from resume and job description, then compare them.

    Returns matched skills, missing skills, bonus skills, and a match percentage.
    """
    # ── 1. Extract resume text ─────────────────────────────────────────────
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

    if not resume_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Could not extract any text from the resume. Please check the file.",
        )

    # ── 2. Extract JD text ─────────────────────────────────────────────────
    if jd_file is not None:
        jd_bytes = await jd_file.read()
        try:
            jd_raw_text = extract_text(
                jd_bytes,
                content_type=jd_file.content_type or "",
                filename=jd_file.filename or "",
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    elif jd_text and jd_text.strip():
        jd_raw_text = jd_text
    else:
        raise HTTPException(
            status_code=422,
            detail="Please provide a job description — either paste text or upload a file.",
        )

    if not jd_raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Job description appears to be empty. Please provide content.",
        )

    # ── 3. LLM skill extraction (parallel would need asyncio.gather + executor) ──
    logger.info("Extracting skills from resume and JD…")
    try:
        resume_skills = extract_skills(resume_text, context="resume")
        jd_skills = extract_skills(jd_raw_text, context="job description")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if not resume_skills:
        logger.warning("No skills found in resume — model may have returned empty list.")
    if not jd_skills:
        logger.warning("No skills found in JD — model may have returned empty list.")

    # ── 4. Compare ─────────────────────────────────────────────────────────
    comparison = compare_skills(resume_skills, jd_skills)

    return AnalyzeResponse(
        resume_skills=resume_skills,
        jd_skills=jd_skills,
        matched_skills=comparison["matched_skills"],
        missing_skills=comparison["missing_skills"],
        bonus_skills=comparison["bonus_skills"],
        match_percent=comparison["match_percent"],
    )
