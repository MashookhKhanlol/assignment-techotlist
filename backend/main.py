"""
FastAPI application entry point for the Skill Gap Analyzer backend.
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.analyze import router as analyze_router

# Load .env early so all modules that import at top-level get the values
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Log startup/shutdown."""
    logger.info("Skill Gap Analyzer backend starting up…")
    yield
    logger.info("Skill Gap Analyzer backend shutting down.")


app = FastAPI(
    title="Skill Gap Analyzer API",
    description=(
        "Upload a resume and a job description. "
        "Get back matched skills, missing skills, bonus skills, and a match percentage."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(analyze_router)


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Simple liveness probe for Docker/Nginx health checks."""
    return {"status": "ok"}
