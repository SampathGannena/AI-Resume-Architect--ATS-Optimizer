# AI-Resume-Architect--ATS-Optimizer

CareerForge Pro is a full-stack resume builder focused on ATS readiness.

## Current Architecture

- Frontend: React + Vite SPA with authenticated sessions
- Backend: Express API with JWT auth middleware
- Persistence: MongoDB (users, resumes, billing events/subscriptions, PDF jobs/assets)
- Billing: Stripe checkout/webhook flow with local mock fallback
- Export: Puppeteer-based PDF queue with signed asset URLs

## Production Planning

- See [PRODUCTION_BLUEPRINT.md](PRODUCTION_BLUEPRINT.md) for production-level architecture, CI/CD pipeline, and week-wise team execution plan.

## Week 1 Delivered

- Resume builder UI with guided sections and live ATS-style preview
- Autosave to backend with create, fetch, and update APIs
- Draft-safe schema normalization and validation
- Sticky preview panel with glass UI and responsive mobile behavior

## Week 2 Delivered

- ATS Optimizer workflow for job description matching
- Backend analysis endpoint: `POST /api/resumes/analyze`
- Resume-vs-JD score generation (0-100)
- Matched and missing keyword extraction
- Actionable rewrite suggestions for better ATS alignment

## Run Locally

1. Configure backend environment

Create [Backend/.env](Backend/.env) from [Backend/.env.example](Backend/.env.example).

Required variables:

- `MONGODB_URI`
- `JWT_SECRET` (minimum 32 characters)
- `PDF_SIGNING_SECRET` (minimum 32 characters)
- `REDIS_URL` (required when `PDF_PIPELINE_ENABLED=true`)
- `OBJECT_STORAGE_BUCKET` (required when `PDF_PIPELINE_ENABLED=true`)

Optional local fallback:

- Set `PDF_PIPELINE_ENABLED=false` if you want to run without Redis/object storage.

2. Start backend

```bash
cd Backend
npm install
npm run dev
```

3. Start PDF worker (recommended in a second terminal)

```bash
cd Backend
npm run worker
```

4. Configure frontend environment

Create [Frontend/.env](Frontend/.env) from [Frontend/.env.example](Frontend/.env.example).

5. Start frontend

```bash
cd Frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and backend on `http://localhost:3000`.

## Auth and Data Ownership

- All resume, billing, and PDF records are bound to the authenticated user identity.
- API calls require `Authorization: Bearer <token>` on protected routes.
- The frontend stores a session token and loads the user profile via `/api/auth/me`.

## Notes

- Stripe is optional in local development. If Stripe keys are missing, checkout falls back to mock mode.
- CORS defaults to localhost ports and can be overridden with `CORS_ORIGINS` (comma-separated list).

## Quality Gates

Backend:

```bash
cd Backend
npm test
```

Frontend:

```bash
cd Frontend
npm test
npm run build
```

CI runs both backend and frontend quality gates through [.github/workflows/quality-gates.yml](.github/workflows/quality-gates.yml).