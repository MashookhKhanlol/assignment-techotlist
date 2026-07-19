"""
Verdict service — asks Claude for a Qualified / Almost There / Not Yet verdict
with three supporting reasons, based on already-extracted skill data.
"""

import json
import logging
import os
import re

import anthropic
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
_MODEL = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")

_SYSTEM_PROMPT = (
    "You are an expert technical recruiter. "
    "Evaluate candidate fit based on skill match data and return ONLY valid JSON — "
    "no markdown, no code fences, no explanation."
)

_PROMPT_TEMPLATE = """\
Evaluate this candidate's fit for the job based on the following skill analysis:

Match percentage : {match_percent}%
Matched skills   : {matched}
Missing skills   : {missing}
Bonus skills     : {bonus}
Total JD skills  : {total_jd}

Return a JSON object with exactly these two keys:
  "verdict" : exactly one of "Qualified", "Almost There", or "Not Yet"
  "reasons" : an array of exactly 3 concise strings (1 sentence each)

Verdict guidelines:
  Qualified    → match ≥ 75% OR all critical skills present
  Almost There → match 35–74% OR strong core match but a few key gaps
  Not Yet      → match < 35% OR missing most required skills

The 3 reasons must:
  1. Highlight the strongest match point
  2. Identify the most significant gap (if any)
  3. Give an overall assessment or actionable suggestion

Example output:
{{"verdict": "Almost There", "reasons": ["Strong experience in React, TypeScript, and Redux.", "Missing experience with AWS and Docker.", "A few months of cloud platform exposure would make this a strong fit."]}}
"""


def generate_verdict(
    matched_skills: list[str],
    missing_skills: list[str],
    bonus_skills: list[str],
    jd_skills: list[str],
    match_percent: float,
) -> dict[str, str | list[str]]:
    """
    Ask Claude to produce a fit verdict and three reasons.

    Returns a dict with keys: verdict (str), reasons (list[str]).
    Falls back to a rule-based verdict if the LLM call fails.
    """
    prompt = _PROMPT_TEMPLATE.format(
        match_percent=round(match_percent, 1),
        matched=", ".join(matched_skills) or "none",
        missing=", ".join(missing_skills) or "none",
        bonus=", ".join(bonus_skills) or "none",
        total_jd=len(jd_skills),
    )

    try:
        logger.info("Calling Claude (%s) for fit verdict", _MODEL)
        message = _client.messages.create(
            model=_MODEL,
            max_tokens=512,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        logger.debug("Verdict raw response: %s", raw[:300])
        return _parse_verdict(raw, match_percent)

    except TypeError as e:
        logger.error("Claude auth error (missing API key?): %s", e)
        raise RuntimeError(
            "AI service is not configured — ANTHROPIC_API_KEY is missing."
        ) from e
    except anthropic.APIConnectionError as e:
        logger.error("Claude connection error: %s", e)
        raise RuntimeError("Could not connect to AI service.") from e
    except anthropic.RateLimitError as e:
        logger.error("Claude rate limit: %s", e)
        raise RuntimeError("AI rate limit reached. Please retry shortly.") from e
    except anthropic.APIStatusError as e:
        logger.error("Claude API error %s: %s", e.status_code, e.message)
        raise RuntimeError(f"AI service error (status {e.status_code}).") from e


def _parse_verdict(raw: str, match_percent: float) -> dict[str, str | list[str]]:
    """Parse Claude's JSON response, with fallbacks."""
    # 1. Direct parse
    try:
        data = json.loads(raw)
        if _is_valid_verdict(data):
            return data
    except json.JSONDecodeError:
        pass

    # 2. Strip code fences
    stripped = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()
    try:
        data = json.loads(stripped)
        if _is_valid_verdict(data):
            return data
    except json.JSONDecodeError:
        pass

    # 3. Find JSON object in text
    match = re.search(r"\{.*?\}", raw, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            if _is_valid_verdict(data):
                return data
        except json.JSONDecodeError:
            pass

    # 4. Rule-based fallback
    logger.warning("Could not parse verdict JSON — using rule-based fallback")
    return _rule_based_verdict(match_percent)


def _is_valid_verdict(data: dict) -> bool:
    return (
        isinstance(data, dict)
        and "verdict" in data
        and "reasons" in data
        and data["verdict"] in ("Qualified", "Almost There", "Not Yet")
        and isinstance(data["reasons"], list)
        and len(data["reasons"]) >= 1
    )


def _rule_based_verdict(match_percent: float) -> dict[str, str | list[str]]:
    if match_percent >= 75:
        verdict = "Qualified"
        reasons = [
            "Strong overall skill match with the job requirements.",
            "Covers the majority of required technical skills.",
            "Candidate profile aligns well with the role.",
        ]
    elif match_percent >= 35:
        verdict = "Almost There"
        reasons = [
            "Good match on several key required skills.",
            "Some gaps in the required skill set that could be addressed.",
            "With targeted upskilling this candidate would be a strong fit.",
        ]
    else:
        verdict = "Not Yet"
        reasons = [
            "Significant gaps between the candidate's skills and job requirements.",
            "Many of the core required skills are missing from the resume.",
            "Substantial additional experience or training would be needed.",
        ]
    return {"verdict": verdict, "reasons": reasons}
