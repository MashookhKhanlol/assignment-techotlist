# Skill Gap Analyzer

An AI-powered tool that compares a candidate's resume against a Job Description and returns:

- **Skill breakdown** — matched, missing, and bonus skills
- **Match percentage** — how well the resume covers the JD
- **Fit Verdict** — *Qualified / Almost There / Not Yet* with three AI-generated supporting reasons

Live: **https://skillgap.flowcrafted.me**

---

## Features

| Feature | Description |
|---------|-------------|
| Resume upload | PDF, DOCX, or TXT |
| JD input | Paste text or upload a file |
| Skill extraction | Claude AI extracts skills from both documents |
| Match ring | Animated SVG ring showing match % (red → amber → green) |
| Skill tags | Color-coded matched / missing / bonus tags |
| AI Fit Verdict | One-click verdict with 3 concise reasons |
| Standalone verdict | Get verdict directly without viewing full breakdown |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router, standalone output) |
| Backend | FastAPI (Python 3.12) |
| AI | Anthropic Claude (`claude-haiku-4-5-20251001`) |
| Resume parsing | `pdfplumber` (PDF), `python-docx` (DOCX) |
| Containerisation | Docker + Docker Compose |
| Reverse proxy | Nginx |
| CI/CD | GitHub Actions → SSH deploy |

---

## Project Structure

```
.
├── backend/
│   ├── main.py                   # FastAPI app, CORS, routers
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── models/
│   │   └── schemas.py            # Pydantic request/response models
│   ├── routers/
│   │   ├── analyze.py            # POST /analyze
│   │   └── verdict.py            # POST /verdict  POST /verdict/quick
│   └── services/
│       ├── text_extractor.py     # PDF / DOCX / TXT → plain text
│       ├── llm_service.py        # Claude skill extraction
│       ├── comparison.py         # Set-math skill comparison
│       └── verdict_service.py    # Claude fit verdict
├── frontend/
│   ├── Dockerfile
│   ├── next.config.ts            # Standalone output + /api proxy rewrite
│   ├── src/app/
│   │   ├── layout.tsx
│   │   ├── globals.css           # Full design system (tokens, components)
│   │   └── page.tsx              # Main page — analyze + verdict flows
│   └── src/components/
│       ├── UploadSection.tsx     # Resume drag-and-drop + JD input
│       ├── MatchRing.tsx         # Animated SVG match ring
│       ├── SkillTag.tsx          # Animated skill pill
│       ├── ResultsPanel.tsx      # Full analysis results view
│       └── VerdictPanel.tsx      # AI fit verdict card
├── nginx/
│   └── skillgap.conf             # Nginx server block (Let's Encrypt SSL)
├── docker-compose.yml
├── .env.example
└── .github/workflows/
    └── deploy.yml                # CI/CD — SSH pull + rebuild on push
```

---

## API Endpoints

### `POST /analyze`
Accepts multipart form data. Returns full skill breakdown.

```
resume_file   File    required   PDF / DOCX / TXT
jd_text       string  optional   Raw JD text
jd_file       File    optional   JD as file (if jd_text is empty)
```

**Response**
```json
{
  "resume_skills": ["Python", "FastAPI", "Docker"],
  "jd_skills": ["Python", "FastAPI", "AWS", "Kubernetes"],
  "matched_skills": ["Python", "FastAPI"],
  "missing_skills": ["AWS", "Kubernetes"],
  "bonus_skills": ["Docker"],
  "match_percent": 50.0
}
```

---

### `POST /verdict`
Accepts JSON (reuses already-extracted skill data from `/analyze`).

```json
{
  "matched_skills": ["Python", "FastAPI"],
  "missing_skills": ["AWS", "Kubernetes"],
  "bonus_skills": ["Docker"],
  "jd_skills": ["Python", "FastAPI", "AWS", "Kubernetes"],
  "match_percent": 50.0
}
```

---

### `POST /verdict/quick`
Accepts the same multipart form as `/analyze`. Runs the full pipeline internally and returns **only** the verdict (no skill breakdown). Used by the standalone verdict button on the main page.

**Response (both verdict endpoints)**
```json
{
  "verdict": "Almost There",
  "reasons": [
    "Strong match on Python and FastAPI — the core backend stack.",
    "Missing cloud infrastructure experience (AWS, Kubernetes).",
    "Targeted cloud upskilling would make this a strong application."
  ]
}
```

| Verdict | Condition |
|---------|-----------|
| **Qualified** | ≥ 75% match |
| **Almost There** | 35–74% match |
| **Not Yet** | < 35% match |

---

### `GET /health`
Returns `{"status": "ok"}`. Used by Docker health check.

---

## Local Development

### Prerequisites
- Docker + Docker Compose
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
# 1. Clone
git clone https://github.com/MashookhKhanlol/assignment-techotlist.git
cd assignment-techotlist

# 2. Create .env
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# 3. Build and run
docker compose up --build

# 4. Open
# Frontend: http://localhost:3002
# Backend docs: http://localhost:8000/docs
```

### Without Docker (backend only)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | — | Your Claude API key |
| `CLAUDE_MODEL` | ❌ | `claude-haiku-4-5-20251001` | Claude model ID |
| `CORS_ORIGINS` | ❌ | `http://localhost:3002` | Comma-separated allowed origins |

---

## Deployment (VPS)

The project is deployed via **GitHub Actions → SSH → Docker Compose** on a DigitalOcean VPS behind Nginx + Let's Encrypt.

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `HOST_IP` | VPS IP address |
| `SSH_USER` | SSH login user |
| `SSH_PRIVATE_KEY` | Private key with VPS access |
| `ANTHROPIC_API_KEY` | Claude API key |
| `CLAUDE_MODEL` | *(optional)* Model ID — defaults to haiku |

### Deploy flow

On every push to `main`/`master` (when `backend/`, `frontend/`, or `docker-compose.yml` change):

1. SSH into VPS
2. `git pull origin master`
3. Write `.env` from GitHub Secrets
4. `docker compose build --no-cache`
5. `docker compose up -d`
6. Docker cleanup (dangling images, stopped containers, build cache)

### Nginx + SSL

```bash
# Install certbot (if not already installed)
sudo apt install -y certbot python3-certbot-nginx

# Copy nginx config
sudo cp nginx/skillgap.conf /etc/nginx/sites-available/skillgap.conf
sudo ln -sf /etc/nginx/sites-available/skillgap.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Issue Let's Encrypt certificate
sudo certbot --nginx -d skillgap.flowcrafted.me
```

---

## Assumptions

1. **Resume and JD are text-heavy.** The tool works best with standard resume formats. Heavily image-based or scanned PDFs will extract poorly (pdfplumber handles text-layer PDFs only).

2. **Skills are extractable from free-form text.** Claude is prompted to extract explicit and implied skills. Vague job descriptions ("fast learner") yield fewer skills.

3. **Skill matching is case-insensitive and normalised.** "React.js" and "ReactJS" are treated as the same skill via lowercasing and punctuation stripping in the comparison service.

4. **No user accounts or persistence.** The MVP is fully stateless — no database, no login, no history. Each analysis is a fresh request.

5. **Single-user / low-concurrency workload.** A 2-core VPS is sufficient. There is no request queue; each comparison is one synchronous Claude round-trip (~2–4 s).

---

## Trade-offs

### LLM for extraction vs. NLP/regex
**Chosen:** Claude API for skill extraction
**Alternative:** spaCy NER + curated skill dictionary

Claude handles synonyms, abbreviations, and implied skills automatically (e.g. "built REST APIs" → FastAPI, Express). A curated dictionary would be faster and free but requires ongoing maintenance and misses novel frameworks.

**Trade-off:** API cost (~$0.001/request at haiku pricing) in exchange for accuracy and zero maintenance overhead.

---

### Set-math comparison vs. semantic similarity
**Chosen:** Pure set intersection after LLM normalisation
**Alternative:** Embedding cosine similarity (e.g. `text-embedding-3-small`)

After Claude normalises skill names to canonical forms, set intersection is deterministic, fast, and explainable. Semantic similarity would catch "Postgres" ↔ "PostgreSQL" without needing normalisation, but adds latency and another API dependency.

**Trade-off:** Simplicity and speed over fuzzy-match capability.

---

### Synchronous LLM calls vs. async/queued
**Chosen:** Synchronous uvicorn async (two sequential Claude calls per request)
**Alternative:** Celery + Redis task queue

Each analysis makes two Claude calls (resume + JD extraction) plus one verdict call if requested. At haiku latency (~1 s/call), the total round-trip is 2–4 s — well within acceptable limits for a web request. A queue adds operational complexity with no benefit at this scale.

**Trade-off:** Simpler deployment in exchange for latency that becomes unacceptable only at high concurrency.

---

### Standalone output vs. Node.js server
**Chosen:** `output: "standalone"` in Next.js
**Alternative:** Standard `next start`

Standalone bundles the minimum server code + dependencies into a self-contained directory, making the Docker image smaller and startup faster. The trade-off is that dynamic `process.env` rewrites must be baked in at build time.

---

### No database
**Chosen:** Stateless — no storage
**Alternative:** PostgreSQL for history + analytics

Storing past comparisons would enable history, trending skills, and A/B testing prompts. For this MVP the requirement was a single comparison tool, so the complexity is not justified.

---

## License

MIT
