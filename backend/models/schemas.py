"""
Pydantic schemas for request/response models.
"""

from pydantic import BaseModel


class AnalyzeResponse(BaseModel):
    """Full analysis result returned from the /analyze endpoint."""

    resume_skills: list[str]
    """All skills extracted from the resume."""

    jd_skills: list[str]
    """All skills extracted from the job description."""

    matched_skills: list[str]
    """Skills present in both resume and JD (intersection)."""

    missing_skills: list[str]
    """Skills required by JD but absent from resume."""

    bonus_skills: list[str]
    """Skills in resume not mentioned in JD (good differentiators)."""

    match_percent: float
    """Percentage of JD skills covered by the resume (0–100)."""


class VerdictRequest(BaseModel):
    """Input to the /verdict endpoint — reuses already-extracted skills."""

    matched_skills: list[str]
    missing_skills: list[str]
    bonus_skills: list[str]
    jd_skills: list[str]
    match_percent: float


class VerdictResponse(BaseModel):
    """AI-generated fit verdict with supporting reasons."""

    verdict: str
    """One of: 'Qualified', 'Almost There', 'Not Yet'"""

    reasons: list[str]
    """Exactly three concise strings explaining the verdict."""


class ErrorResponse(BaseModel):
    detail: str
