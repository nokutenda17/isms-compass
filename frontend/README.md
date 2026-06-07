# ISMS Compass — Frontend

React Progressive Web App (PWA) for the ISMS Compass ISO 27001 implementation assistant.

## Quick Start

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env    # or edit .env directly

# 3. Start development server
npm run dev
# App runs at http://localhost:5173
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL. Default `http://localhost:5000/api` |
| `VITE_OLLAMA_URL` | Local Ollama URL for direct fallback. Default `http://localhost:11434` |

> **⚠️ Never add `VITE_CLAUDE_API_KEY` or any secret here.**  
> All `VITE_*` variables are bundled into the browser JavaScript and visible to anyone.  
> The Claude API key lives only in the backend `.env` as `CLAUDE_API_KEY`.

## Build for Production

```bash
npm run build          # Outputs to dist/
npm run preview        # Preview the production build locally
```

## Project Structure

```
frontend/
├── src/
│   ├── lib/
│   │   └── api.ts            # ★ Shared API client — all backend calls go here
│   ├── contexts/
│   │   └── AuthContext.tsx   # JWT auth state + login/logout
│   ├── hooks/
│   │   ├── useAIEngine.ts    # AI prompt routing (backend → Ollama → fallback)
│   │   └── useOnlineStatus.ts
│   ├── pages/
│   │   ├── Dashboard.tsx     # Live progress rings, risk heat map
│   │   ├── StepOverview.tsx  # 10-step roadmap grid (live API)
│   │   ├── StepModule.tsx    # Individual step form + AI draft area (live API)
│   │   ├── RiskRegister.tsx  # Risk CRUD with server-side filtering (live API)
│   │   ├── StatementOfApplicability.tsx  # 93-control SoA table (live API)
│   │   ├── DocumentExport.tsx            # DOCX/PDF export (live API)
│   │   ├── UserManagement.tsx            # User invite + role management (live API)
│   │   ├── MonitoringScreen.tsx          # Incidents, actions, audits (live API)
│   │   ├── AuditLog.tsx                  # Immutable audit trail (live API)
│   │   └── ...
│   ├── components/
│   │   ├── RoleGuard.tsx     # Route-level RBAC wrapper
│   │   ├── AIChatPanel.tsx   # Conversational AI panel
│   │   └── layout/           # Sidebar, TopBar, Layout
│   └── App.tsx               # Router + protected routes
├── .env                      # Frontend env vars (no secrets)
└── vite.config.ts
```

## API Integration

All backend calls use `src/lib/api.ts`:

```typescript
import { apiFetch } from '@/lib/api';

// Authenticated GET
const risks = await apiFetch<{ risks: Risk[]; total: number }>('/risks?page=1');

// Authenticated POST
const newRisk = await apiFetch('/risks', {
  method: 'POST',
  body: JSON.stringify({ threat: 'Phishing', likelihood: 3, impact: 4 }),
});
```

The `apiFetch` helper automatically:
- Attaches the JWT `Authorization` header
- Silently refreshes expired tokens once before redirecting to login
- Uses a polyfill-safe timeout signal (compatible with Android Chrome < 124)
- Normalises error responses to `Error` instances

## Offline Mode

The app uses IndexedDB (via `useAIEngine`) to cache AI responses for offline access.  
Previously generated AI drafts remain readable during load-shedding.  
New AI requests gracefully degrade with a clear "AI unavailable" message.
