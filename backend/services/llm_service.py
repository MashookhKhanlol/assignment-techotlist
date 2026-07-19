"""
LLM skill extraction service using the Anthropic Claude API.

Sends a strict prompt asking for a JSON array of normalized skills.
Falls back gracefully on API errors.
"""

import json
import logging
import os
import re

import anthropic
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Client is initialised once at module import time ──────────────────────────
_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
_MODEL = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")

# ── Prompt template ───────────────────────────────────────────────────────────
_SYSTEM_PROMPT = (
    "You are a precise skill extraction assistant for job matching. "
    "Your sole task is to return a valid JSON array of strings — nothing else. "
    "No markdown, no code fences, no explanation. Just the raw JSON array."
)

_USER_PROMPT_TEMPLATE = """\
Extract every technical skill, tool, technology, framework, programming language, \
platform, or domain-specific skill from the following {context} text.

Rules:
- Return ONLY a JSON array of strings, e.g. ["Python", "Docker", "React"]
- Normalize casing: "ReactJS" → "React", "node.js" → "Node.js", "AWS" stays "AWS"
- Remove exact duplicates (case-insensitive)
- Exclude generic soft skills (communication, teamwork, etc.)
- Exclude years of experience phrases
- If no skills are found, return an empty array: []

{context_upper} text:
\"\"\"
{text}
\"\"\"
"""


def extract_skills(text: str, context: str = "document") -> list[str]:
    """
    Ask Claude to extract a normalised list of skills from the given text.

    Args:
        text:    Raw extracted text from a resume or job description.
        context: Human-readable label used in the prompt ('resume' or 'job description').

    Returns:
        A deduplicated list of skill strings, or an empty list on failure.
    """
    if not text or not text.strip():
        logger.warning("extract_skills called with empty text for context=%s", context)
        return []

    # Truncate to avoid hitting context limits on very long documents
    truncated_text = text[:12_000]

    user_prompt = _USER_PROMPT_TEMPLATE.format(
        context=context,
        context_upper=context.upper(),
        text=truncated_text,
    )

    try:
        logger.info("Calling Claude (%s) for skill extraction [context=%s]", _MODEL, context)
        message = _client.messages.create(
            model=_MODEL,
            max_tokens=1024,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw_content = message.content[0].text.strip()
        logger.debug("Claude raw response: %s", raw_content[:200])

        skills = _parse_skills_from_response(raw_content)
        logger.info("Extracted %d skills for context=%s", len(skills), context)
        return skills

    except TypeError as e:
        # Raised by the Anthropic client when ANTHROPIC_API_KEY is missing or empty
        logger.error("Claude authentication error (missing API key?): %s", e)
        raise RuntimeError(
            "AI service is not configured — ANTHROPIC_API_KEY is missing or invalid."
        ) from e
    except anthropic.APIConnectionError as e:
        logger.error("Claude API connection error: %s", e)
        raise RuntimeError("Could not connect to AI service. Please try again.") from e
    except anthropic.RateLimitError as e:
        logger.error("Claude rate limit hit: %s", e)
        raise RuntimeError("AI service rate limit reached. Please wait and retry.") from e
    except anthropic.APIStatusError as e:
        logger.error("Claude API status error %s: %s", e.status_code, e.message)
        raise RuntimeError(f"AI service error (status {e.status_code}).") from e


def _parse_skills_from_response(raw: str) -> list[str]:
    """
    Parse the model's response into a list of strings.

    Handles:
    - Perfect JSON arrays
    - JSON wrapped in code fences (```json ... ```)
    - Partial / malformed output (attempts regex extraction)
    """
    # 1. Try direct JSON parse
    try:
        result = json.loads(raw)
        if isinstance(result, list):
            return _deduplicate([str(s).strip() for s in result if str(s).strip()])
    except json.JSONDecodeError:
        pass

    # 2. Strip code fences and retry
    stripped = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()
    try:
        result = json.loads(stripped)
        if isinstance(result, list):
            return _deduplicate([str(s).strip() for s in result if str(s).strip()])
    except json.JSONDecodeError:
        pass

    # 3. Regex: find anything that looks like a JSON array
    match = re.search(r"\[.*?\]", raw, re.DOTALL)
    if match:
        try:
            result = json.loads(match.group())
            if isinstance(result, list):
                return _deduplicate([str(s).strip() for s in result if str(s).strip()])
        except json.JSONDecodeError:
            pass

    logger.warning("Could not parse skills from Claude response: %s", raw[:300])
    return []


def _deduplicate(skills: list[str]) -> list[str]:
    """Return a list of skills with case-insensitive deduplication, preserving first occurrence."""
    seen: set[str] = set()
    result: list[str] = []
    for skill in skills:
        key = skill.lower()
        if key not in seen:
            seen.add(key)
            result.append(skill)
    return result
