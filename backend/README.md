# ISMS Compass — Backend

Python / Flask REST API for the ISMS Compass ISO 27001 implementation assistant.

## Quick Start

```bash
cd backend

# 1. Create virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env             # Edit JWT_SECRET_KEY at minimum

# 4. Run (with demo data)
python app.py --seed             # Seeds SafeRoute Logistics demo org

# API is now live at http://localhost:5000/api
# Health check: http://localhost:5000/api/health
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET_KEY` | **Yes** | Long random string — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | No | SQLite (default) or `postgresql://user:pass@host/db` |
| `FLASK_DEBUG` | No | Set `1` for development only. Default `0`. |
| `OLLAMA_URL` | No | Local Ollama endpoint. Default `http://localhost:11434` |
| `OLLAMA_MODEL` | No | Model name. Default `phi4-mini` |
| `CLAUDE_API_KEY` | No | Anthropic API key for cloud fallback. **Never use `VITE_` prefix.** |
| `CORS_ORIGINS` | No | Comma-separated allowed origins. Default `http://localhost:5173` |

## AI Setup (Ollama — required for AI features)

```bash
# Install Ollama from https://ollama.com, then:
ollama pull phi4-mini
ollama serve          # Starts on http://localhost:11434
```

## Running Tests

```bash
pip install pytest pytest-flask
python -m pytest tests/ -v
# 55 tests — auth, RBAC, risk validation, password security, audit integrity
```

## Project Structure

```
backend/
├── app.py                    # Flask app factory
├── models.py                 # SQLite schema + DB connection
├── seed.py                   # Demo data seeder
├── requirements.txt
├── .env                      # Secrets — never commit
├── .gitignore
├── data/
│   └── annex-a-controls.json # ISO 27001:2022 Annex A (93 controls)
├── routes/
│   ├── auth.py               # Login, refresh, logout, /me
│   ├── risks.py              # Risk register CRUD
│   ├── soa.py                # Statement of Applicability
│   ├── steps.py              # 10-step workflow
│   ├── documents.py          # DOCX/PDF export
│   ├── dashboard.py          # Progress + stats
│   ├── monitoring.py         # Incidents, corrective actions, audits
│   ├── organisations.py      # Org profile management
│   └── users_and_more.py     # Users, audit log, notifications, AI prompt
├── services/
│   ├── auth_service.py       # JWT + bcrypt password hashing
│   ├── ai_service.py         # Ollama → Claude API routing + caching
│   ├── audit_helper.py       # Immutable audit log writer
│   └── doc_service.py        # python-docx document generation
└── tests/
    ├── conftest.py            # Isolated test fixtures (per-test DB)
    ├── test_auth.py           # Login, rate limiting, token refresh
    ├── test_risks.py          # Risk CRUD, validation, RBAC
    ├── test_rbac.py           # Full permissions matrix coverage
    └── test_security.py       # bcrypt, JWT security, audit integrity
```

## Key Security Decisions

- **bcrypt (rounds=12)** for password hashing — resistant to GPU brute-force
- **JWT** (stateless) — works correctly in offline/sync scenarios without server-side session state
- **Rate limiting** — 5 login attempts per 5-minute window per IP+email
- **RBAC enforced at API level** — not just UI — via `@roles_required` decorator
- **Immutable audit log** — every write action recorded with user_id, role, and timestamp
- **No API keys in frontend** — `CLAUDE_API_KEY` lives only in backend `.env`
