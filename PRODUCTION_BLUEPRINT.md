# CareerForge Pro Production Blueprint

## 1) Product Scope

**Project:** AI Resume Architect & ATS Optimizer  
**Brand:** CareerForge Pro

### Production use case

A user uploads an existing resume and pastes a target Job Description (JD). CareerForge Pro:

1. Parses and normalizes resume data.
2. Extracts and ranks critical JD keywords.
3. Rewrites bullet points to align with JD keywords and tone.
4. Computes ATS match score and section-level feedback.
5. Generates pixel-perfect, non-editable PDF output.
6. Gates premium features via Stripe Free/Pro subscription.

---

## 2) Production Architecture

### Logical architecture

1. **Frontend Web App (React + Vite)**
- Resume editor, ATS panel, AI rewrite panel, dashboard, billing page.
- Calls backend APIs with authenticated user token.

2. **API Service (Node.js + Express)**
- Authz/authn checks.
- Resume CRUD and versioning.
- ATS analysis endpoints.
- AI rewrite orchestration endpoints.
- Stripe checkout + webhook handling.
- PDF generation job orchestration.

3. **AI Services Layer**
- JD Analysis Agent (keyword extraction + ranking).
- Prompt Template Engine (rewrite strategies by role/seniority).
- Rewrite Evaluator (latency + quality + keyword inclusion checks).

4. **Async Worker Service**
- PDF rendering using Puppeteer/Headless Chrome.
- Long-running AI enrichment tasks.
- Retry and dead-letter handling.

5. **Data Layer**
- MongoDB Atlas for primary persistence.
- Redis for cache, queue state, rate limit counters.
- Object storage (S3 or equivalent) for uploaded files and generated PDFs.

6. **Billing Layer**
- Stripe Checkout, customer portal, webhook processor.
- Plan entitlements (Free: 1 resume, Pro: unlimited + premium templates + cover letters).

7. **Observability & Security**
- Centralized logs, metrics, traces.
- Error monitoring (Sentry or equivalent).
- WAF/rate limits, audit logs, secrets manager.

### Deployment topology

- **Frontend:** Vercel/Netlify or CDN-backed static hosting.
- **Backend API + Worker:** Containerized service on Render/Railway/Fly.io/AWS ECS.
- **Database:** MongoDB Atlas.
- **Queue/Cache:** Redis (Upstash/ElastiCache/Redis Cloud).
- **Storage:** S3 bucket + signed URLs.
- **Secrets:** Platform secret manager (no plain `.env` in repo).

---

## 3) Core Services and Contracts

### Resume domain entities

1. `User`
- `id`, `email`, `name`, `stripeCustomerId`, `plan`, `status`, timestamps.

2. `Resume`
- `id`, `userId`, `title`, `data`, `templateId`, `currentVersion`, timestamps.

3. `ResumeVersion`
- `id`, `resumeId`, `dataSnapshot`, `changeSummary`, `createdBy`, timestamp.

4. `JDAnalysis`
- `id`, `resumeId`, `jobDescriptionHash`, `keywordsRanked`, `atsScore`, `sectionBreakdown`, timestamp.

5. `RewriteAttempt`
- `id`, `resumeId`, `sourceBullet`, `keyword`, `promptTemplate`, `rewrittenBullet`, `latencyMs`, `qualityScore`, `verdict`, timestamp.

6. `GeneratedAsset`
- `id`, `resumeId`, `type` (`pdf`, `cover-letter`), `storageUrl`, `renderMeta`, timestamp.

7. `SubscriptionEvent`
- `id`, `userId`, `stripeEventId`, `type`, `payloadDigest`, processed timestamp.

### API contract (target)

1. Resume + analysis
- `POST /api/resumes`
- `PUT /api/resumes/:id`
- `POST /api/resumes/analyze`
- `GET /api/resumes/:id/analysis-history`
- `POST /api/jd/keywords`

2. AI writer
- `POST /api/ai/rewrite-bullet`
- `POST /api/ai/rewrite-batch`
- `POST /api/ai/quality-evaluate`

3. PDF pipeline
- `POST /api/pdf/jobs`
- `GET /api/pdf/jobs/:jobId`
- `GET /api/resumes/:id/pdf/latest`

4. Billing
- `POST /api/billing/checkout`
- `POST /api/billing/webhook`
- `GET /api/billing/entitlements`

---

## 4) ATS Scoring and AI Quality Standard

### ATS score model

- Weighted section score:
  - Experience: 55%
  - Skills: 30%
  - Summary: 15%
- Raw keyword coverage score maintained in parallel for transparency.
- Persist analysis history for before/after trend tracking.

### AI rewrite acceptance criteria

Each rewrite is measured on:

1. Keyword inclusion accuracy.
2. Action-verb authority.
3. Meaning preservation vs source bullet.
4. Length adequacy and readability.
5. Latency SLO compliance.

### Proposed SLOs (initial)

- `/api/resumes/analyze` p95 < 1200 ms.
- `/api/ai/rewrite-bullet` p95 < 1800 ms.
- PDF job completion p95 < 12 seconds.
- Availability target: 99.9% monthly.

---

## 5) CI/CD Pipeline (Production)

### Branch strategy

- `main`: production-ready only.
- `develop` (optional): integration branch.
- `feature/*`: sprint tasks.
- `hotfix/*`: production issues.

### PR quality gates

1. Lint + format checks.
2. Unit tests (backend services, scoring logic, prompt builder).
3. Integration tests (API endpoints).
4. Frontend build + smoke tests.
5. Security checks:
- npm audit (high/critical fail gate)
- secret scan
- dependency license policy.

### Deployment stages

1. **CI (every PR)**
- Build/test all packages.
- Publish preview artifacts.

2. **Staging CD (merge to develop/main based on flow)**
- Deploy backend, frontend, worker.
- Run smoke test suite against staging URLs.
- Verify Stripe test mode and webhook health.

3. **Production CD (manual approval gate)**
- Deploy with canary or blue/green.
- Run post-deploy smoke tests.
- Auto-rollback on failing health checks.

### Migration and rollback

- Use versioned migration scripts.
- Backward compatible changes first (expand/contract pattern).
- Maintain one-click rollback for API and worker images.

---

## 6) Weekly Team Plan and Ownership

You selected **Backend + AI ownership**. The plan below assumes a 4-person team:

- **You (Backend + AI Lead)**
- **Frontend Engineer**
- **Platform/DevOps Engineer**
- **QA/Product Analyst**

### Week 1: The Builder Core (Data Entry -> Preview)

**Goal:** Stable schema, live editor-preview loop, reliable state flow.

**You (Backend + AI Lead)**
- Finalize canonical resume schema + validation contracts.
- Implement backend resume create/get/update with version-ready design.
- Define API response contracts and error model.

**Frontend Engineer**
- Build split-screen editor + preview.
- Context/Reducer state wiring.
- Autosave and draft hydration behavior.

**Platform/DevOps Engineer**
- Setup local dev scripts, pre-commit hooks, base CI pipeline.
- Add environment templates and secret handling standard.

**QA/Product Analyst**
- Build test checklist for every resume section and live preview sync.
- Verify no data-loss on refresh and autosave flow.

**Review/Verification**
- Full state management check.
- API contract test pass.
- Frontend build pass.

### Week 2: AI Writer & Optimization (Magic Button)

**Goal:** Production-grade rewrite loop with ATS scoring and measurable AI quality.

**You (Backend + AI Lead)**
- Implement JD keyword extraction/ranking agent endpoints.
- Implement prompt template engine and rewrite endpoint.
- Add ATS weighted scoring and section breakdown.
- Add latency and rewrite quality scoring metrics.
- Persist analysis/rewrite history per resume.

**Frontend Engineer**
- Build ATS panel + Magic Rewrite UI.
- Keyword selection and one-click insertion UX.
- Display latency, quality score, and verdict.

**Platform/DevOps Engineer**
- Add API performance dashboards and logs.
- Add rate limiting and timeout policies for AI endpoints.

**QA/Product Analyst**
- Evaluate rewrite quality across sample JDs.
- Validate deterministic keyword coverage improvement after rewrite.

**Review/Verification**
- ATS score reproducibility check.
- AI latency benchmarks and quality thresholds met.

### Week 3: PDF Generation & Payment (The Product)

**Goal:** Monetized product with premium gating and export quality.

**You (Backend + AI Lead)**
- Implement Puppeteer render service + job queue orchestration.
- Secure signed URL delivery for generated PDFs.
- Integrate Stripe checkout, webhook processing, entitlement updates.
- Enforce plan limits in API middleware.

**Frontend Engineer**
- Billing page, plan cards, checkout flow.
- Premium template locks/unlocks by entitlement.
- PDF export UX with progress status.

**Platform/DevOps Engineer**
- Separate worker deployment and autoscaling rules.
- Stripe webhook reliability (retry and idempotency checks).

**QA/Product Analyst**
- Validate Pro unlock after webhook confirmation.
- Validate PDF visual parity with preview and no clipping.

**Review/Verification**
- Webhook-to-entitlement propagation under 10 seconds.
- Pro feature access immediately after successful payment event.

### Week 4: Final Polish (Delivery)

**Goal:** Ship-ready user experience and operational confidence.

**You (Backend + AI Lead)**
- Build cover letter generation APIs and prompt profiles.
- Add dashboard APIs for resume versions and iteration history.
- Final hardening: rate limits, idempotency, observability gaps.

**Frontend Engineer**
- Build dashboard UI (saved resumes, versions, export history).
- Build cover letter generator UI.
- Final accessibility and responsive pass.

**Platform/DevOps Engineer**
- Final production alerting and on-call runbook.
- Backup/restore validation and disaster recovery checklist.

**QA/Product Analyst**
- End-to-end regression suite.
- PDF print standard checks (A4/Letter boundaries, pagination).

**Review/Verification**
- Final UAT pass with production-like dataset.
- Release readiness checklist signed.

---

## 7) First Week Execution Backlog (Actionable)

### Day 1

- Freeze schema and API contract spec.
- Define frontend field mapping and validation matrix.

### Day 2

- Implement backend routes + validation.
- Implement frontend context and reducer baseline.

### Day 3

- Build split-screen form and live preview rendering.
- Add autosave loop and draft restore.

### Day 4

- API integration and state synchronization fixes.
- Edge-case handling for partial/incomplete drafts.

### Day 5

- Integration test + demo script.
- Week 1 review and Week 2 handoff checklist.

---

## 8) Production Risks and Mitigations

1. **AI cost spikes**
- Mitigation: token budgets, caching, plan quotas, prompt compression.

2. **Webhook inconsistency**
- Mitigation: idempotency keys + event replay support.

3. **PDF rendering drift across templates**
- Mitigation: golden snapshot tests + fixed print CSS.

4. **Latency regressions**
- Mitigation: p95 alerts, queue offloading, timeout + fallback paths.

5. **Security/privacy concerns in resumes**
- Mitigation: encrypted data at rest, strict access controls, audit logs, retention policy.

---

## 9) Definition of Done for Production Launch

1. Core features complete: JD analysis, AI rewrite, ATS scoring, PDF export, billing.
2. Free/Pro entitlement enforcement active and tested.
3. Observability dashboard + alerting active.
4. CI/CD with rollback verified.
5. Security checklist and backup/restore drill complete.
