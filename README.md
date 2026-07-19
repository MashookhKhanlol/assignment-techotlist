# Skill Gap Analyzer

AI-powered tool that compares a candidate's resume against a job description,
extracting skills with Claude AI and returning matched, missing, and bonus skills.

## Quick Start (local)

```bash
# 1. Copy env file and add your API key
cp .env.example .env
# Edit .env: set ANTHROPIC_API_KEY=sk-ant-...

# 2. Build and run
docker-compose up --build

# 3. Open http://localhost:3000
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 (App Router) |
| Backend | FastAPI + Uvicorn |
| Text extraction | pdfplumber + python-docx |
| AI extraction | Claude API (Haiku by default) |
| Containers | Docker + Docker Compose |

## Project Structure

```
.
├── backend/
│   ├── main.py                  # FastAPI app
│   ├── routers/analyze.py       # POST /analyze endpoint
│   ├── services/
│   │   ├── text_extractor.py    # PDF/DOCX/TXT → plain text
│   │   ├── llm_service.py       # Claude skill extraction
│   │   └── comparison.py       # Set-based skill comparison
│   └── models/schemas.py        # Pydantic response model
├── frontend/
│   └── src/
│       ├── app/page.tsx          # Main UI page
│       └── components/
│           ├── UploadSection.tsx
│           ├── ResultsPanel.tsx
│           ├── SkillTag.tsx
│           └── MatchRing.tsx
├── nginx/skillgap.conf           # VPS Nginx config
├── docker-compose.yml
└── .env.example
```

## API

### `POST /analyze`

**Form fields:**
- `resume_file` (required) — PDF, DOCX, or TXT
- `jd_text` (optional) — raw job description text
- `jd_file` (optional) — PDF/DOCX/TXT (use one of jd_text or jd_file)

**Response:**
```json
{
  "resume_skills": ["Python", "FastAPI"],
  "jd_skills": ["Python", "Docker", "AWS"],
  "matched_skills": ["Python"],
  "missing_skills": ["Docker", "AWS"],
  "bonus_skills": ["FastAPI"],
  "match_percent": 33.3
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | — | Claude API key |
| `CLAUDE_MODEL` | ❌ | `claude-haiku-3-5` | Model to use |
| `CORS_ORIGINS` | ❌ | `http://localhost:3000` | Comma-separated allowed origins |

## VPS Deployment

See [`nginx/skillgap.conf`](./nginx/skillgap.conf) for the Nginx config.

**Steps:**
1. Copy project to VPS, create `.env` with your API key
2. `docker-compose up -d --build`
3. Copy `nginx/skillgap.conf` → `/etc/nginx/sites-available/`, symlink, reload Nginx
4. Add to `~/.cloudflared/config.yml`:
   ```yaml
   - hostname: skillgap.flowcrafted.me
     service: http://localhost:3000
   ```
5. `sudo systemctl reload cloudflared`
6. Add CNAME DNS record in Cloudflare pointing to your tunnel
