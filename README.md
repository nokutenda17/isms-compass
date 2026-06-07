# ISMS Compass

**AI-powered ISO 27001:2022 implementation assistant for Zimbabwean SMEs**

ISMS Compass guides small and medium enterprises through the full ten-step ISO 27001:2022 implementation process — from defining organisational context to producing a complete Statement of Applicability — using a locally-hosted AI engine that works during load shedding without any cloud dependency.

Built as a final-year Information Systems capstone project at Midlands State University Zimbabwe.

---

## The Problem

ISO 27001 certification is increasingly required by Zimbabwean SMEs tendering for government contracts, NGO partnerships, and financial services work. The existing tooling is either priced for enterprise clients (USD 10,000+/year) or designed for Western operating environments that assume stable electricity and reliable internet. Zimbabwean SMEs face 8–12 hour daily load shedding schedules and constrained budgets, making existing solutions inaccessible.

## The Solution

ISMS Compass is a Progressive Web App that:

- Runs fully offline during load shedding using service worker caching and IndexedDB
- Uses a locally installed AI model (no internet required for AI features)
- Costs nothing to deploy beyond a standard office laptop
- References Zimbabwe's Cyber and Data Protection Act (Chapter 12:07) throughout all generated documentation
- Produces export-ready DOCX policy documents populated with the organisation's real data

---

## Features

### Ten-Step ISO 27001:2022 Workflow
Each step maps to a specific clause of the standard and is gated — the next step only unlocks when the previous one is approved by the ISMS Owner.

| Step | ISO 27001:2022 Clause | Focus |
|------|----------------------|-------|
| 1 | Clause 4 | Organisational Context & Scope |
| 2 | Clause 5 | Leadership & Information Security Policy |
| 3 | Clause 6 | Risk Assessment Planning |
| 4 | Clause 6.1 | Asset Inventory & Risk Assessment |
| 5 | Clause 6.2 | Risk Treatment & Controls |
| 6 | Clause 7 | Support — Resources, Competence & Communication |
| 7 | Clause 8 | Operational Planning & Implementation |
| 8 | Clause 9 | Performance Evaluation & Internal Audit |
| 9 | Clause 10 | Improvement & Corrective Action |
| 10 | Annex A | Statement of Applicability Review |

### AI Assistant — Three-Tier Fallback
1. **Google Gemini Flash** (primary — cloud, ~2 second responses)
2. **Ollama + qwen2.5** (secondary — local, works offline)
3. **IndexedDB cache** (tertiary — instant, previously generated responses survive power cuts)

All AI output is labelled **DRAFT — Requires Human Review** and requires explicit ISMS Owner approval before use, satisfying ISO 27001 Clause 7.5 human-in-the-loop requirements.

### Role-Based Access Control
Four roles enforced at the API layer — not just the UI:

| Feature | ISMS Owner | Contributor | Reviewer | Auditor |
|---------|-----------|-------------|----------|---------|
| Complete steps | ✅ | ❌ | ❌ | ❌ |
| Add/edit risks | ✅ | ✅ | ❌ | ❌ |
| Update SoA | ✅ | ❌ | Justification only | ❌ |
| Export documents | ✅ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ | ✅ |
| Manage users | ✅ | ❌ | ❌ | ❌ |

### Document Generation
Produces populated, export-ready DOCX files using real organisational data:
- Information Security Policy
- Risk Assessment Report
- Risk Treatment Plan
- Statement of Applicability (all 93 Annex A controls)
- Scope Statement
- Corrective Action Log

All documents include a footer referencing ISO/IEC 27001:2022 and the Zimbabwe Cyber and Data Protection Act (Chapter 12:07).

### Security Implementation
- **bcrypt** password hashing (work factor 12)
- **JWT** authentication with silent token refresh
- **Rate limiting** — 5 login attempts per 5-minute window per IP
- **Immutable audit log** — every state change recorded with actor, role, timestamp, and IP address
- **Input validation** with bounded likelihood/impact values (1–5 matrix)

### Offline-First PWA
- Service worker caches the app shell and key API responses
- IndexedDB stores AI responses for offline retrieval
- Online/offline status indicator in the UI
- Designed for environments with 8–12 hour daily power outages

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Python 3.12, Flask, SQLite |
| AI (primary) | Google Gemini 2.5 Flash API |
| AI (offline) | Ollama + qwen2.5:1.5b |
| Auth | JWT (PyJWT), bcrypt |
| Documents | python-docx |
| PWA | vite-plugin-pwa, Workbox |
| Testing | pytest, pytest-flask (55 tests) |

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 20+
- Ollama (optional — for offline AI)

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate.bat
pip install -r requirements.txt
cp .env.example .env       # Add your JWT secret and Gemini API key
python app.py --seed       # Seeds SafeRoute Logistics demo data
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| ISMS Owner | tinashe@saferoute.co.zw | password123 |
| Contributor | kudzai@saferoute.co.zw | password123 |
| Reviewer | chipo@saferoute.co.zw | password123 |
| Auditor | tatenda@saferoute.co.zw | password123 |

### Run Tests
```bash
cd backend
python -m pytest tests/ -v
# 55 tests covering auth, RBAC, risk validation, password security, audit integrity
```

---

## Project Structure

```
isms-compass/
├── backend/
│   ├── app.py                    # Flask app factory
│   ├── models.py                 # SQLite schema
│   ├── routes/                   # API endpoints
│   │   ├── auth.py               # Login, refresh, logout
│   │   ├── risks.py              # Risk register CRUD
│   │   ├── soa.py                # Statement of Applicability
│   │   ├── steps.py              # Ten-step workflow
│   │   └── documents.py          # DOCX/PDF export
│   ├── services/
│   │   ├── auth_service.py       # JWT + bcrypt
│   │   ├── ai_service.py         # Gemini → Ollama fallback
│   │   └── doc_service.py        # Document generation
│   └── tests/                    # 55 automated tests
└── frontend/
    └── src/
        ├── lib/api.ts             # Authenticated API client
        ├── hooks/useAIEngine.ts   # Streaming AI with cache
        ├── components/
        │   ├── AIChatPanel.tsx    # Streaming chat interface
        │   └── RoleGuard.tsx      # Route-level RBAC
        └── pages/                 # All application pages
```

---

## Academic Context

**Institution:** Midlands State University, Zimbabwe  
**Department:** Information Systems  
**Degree:** BSc Honours Information Systems  
**Specialisation:** Governance, Risk and Compliance / Cybersecurity  
**Year:** 2026  

**Research Objectives:**
1. Guide Zimbabwean SMEs through a ten-step ISO 27001:2022 workflow
2. Generate draft ISMS documentation using AI
3. Deliver an offline-first PWA functional during load shedding
4. Enforce RBAC across four roles with an immutable audit trail
5. Contextualise all guidance to Zimbabwe's regulatory environment including the Cyber and Data Protection Act (Chapter 12:07)

---

## Author

**Nokutenda Chimhuya**  
Information Systems Student — Midlands State University Zimbabwe  
Specialisation: GRC & Cybersecurity  
GitHub: [@nokutenda17](https://github.com/nokutenda17)
