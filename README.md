# BatchMate — Scholarship Passport & Intelligent Matching Platform

A unified full-stack application for **scholarship discovery, eligibility matching, guided
applications, document retention and AI-assisted exam preparation**.

The repository is a monorepo:

```
busnotfound/
├── server/   # Node.js + Express (TypeScript) API, MongoDB/Mongoose, Node-Cron, scraping, storage
└── client/   # React + Vite + Tailwind + Framer Motion + Lucide single-page app
```

---

## 1. Feature overview

| Module | What it does |
| --- | --- |
| **Auth & Passport** | Google OAuth 2.0 + local email/password (bcrypt). A single `ScholarshipPassport` holds academic, demographic and document metadata. Saving the passport recalculates every match immediately. |
| **Automated scraper** | Node-Cron job at **00:00 IST (18:30 UTC)** crawls government/CSR scholarship sources with Playwright/Cheerio, normalises records to the mandatory schema and records a per-source audit row. |
| **Hybrid matching** | Two-tier engine: hard boolean eligibility filters, then a transparent weighted 0–100 fit score. Results are grouped into *Highly Eligible*, *Possibly Eligible* and *Needs Additional Information* with a reason-by-reason breakdown. |
| **Dual-mode applications** | Native submission flow plus a guided external split drawer (checklist + status tracker on the left, official portal on the right). Full status pipeline. |
| **Exam & readiness hub** | Syllabus/pattern viewer, automated mock-test generation (LLM with curated offline fallback), performance analytics (weak topics, speed, readiness score) and a renewal-eligibility tracker. |
| **Anonymised analytics** | `AnalyticsProfile` stores only coarse demographic buckets — state × income tier × degree × category × awarded type. No identifiers, ever. |
| **Retention engine** | Documents stay linked to the passport. Active applications are locked; completed applications get `completionDate + 180 days` before a cleanup worker may remove them. |

---

## 2. Privacy & security rules (enforced in code)

- **Zero national identifiers.** A global request gate (`server/src/domain/privacy.ts`) scans every
  request body/query for keys resembling Aadhaar, PAN, RRN, MyNumber, SSN, passport/voter/driving
  numbers and **rejects the request with HTTP 400** before it reaches a controller.
- Passport forms accept only non-restricted metadata: institution, course, degree, year, Class 12 %,
  CGPA, entrance score, state/domicile, category, income *bracket*, gender and disability status.
- The **anonymised data lake** (`AnalyticsProfile`) has no `user` reference and contains counts only.
- Passwords are hashed with bcrypt (cost 12); the hash is `select: false` by default.
- Helmet, CORS allow-list, rate limiting on auth and API routes.

---

## 3. Quick start

### Prerequisites

- Node.js 18+
- MongoDB running locally **or** a connection string (Atlas, etc.)

### Steps

```bash
# 1. Install all workspace dependencies
npm install

# 2. Create your environment file
cp .env.example .env        # Windows: copy .env.example .env

# 3. Seed the catalogue + demo users (idempotent)
npm run seed

# 4. Run API and web app together
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:4000/api
- Health: http://localhost:4000/api/health

### Demo credentials

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@example.com` | `password123` |
| Admin | `admin@example.com` | `password123` |

> The API still boots when MongoDB is unreachable (health reports `degraded`) so the UI and
> configuration can be inspected. Data endpoints require a live database.

---

## 4. Environment variables

All variables are documented in [`.env.example`](./.env.example). Highlights:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Token signing. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enable Google sign-in; hidden in the UI when unset. |
| `STORAGE_DRIVER` | `local` (default, zero-dependency), `s3` or `supabase`. Cloud drivers issue presigned upload URLs. |
| `AI_PROVIDER` | `disabled` (default), `openai-compatible` (Groq/Ollama/vLLM/Together) or `huggingface`. Falls back to a curated question bank when disabled or unreachable. |
| `SCRAPER_LIVE` | `false` (default) ingests a bundled verified snapshot; `true` performs live Playwright/Cheerio crawls. |

---

## 5. Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run API + client concurrently. |
| `npm run build` | Type-check and build both workspaces. |
| `npm start` | Start the compiled API. |
| `npm run seed` | Seed catalogue, demo users, passport and applications. |
| `npm run typecheck` | Type-check server and client. |
| `npm --workspace server run scrape` | Trigger the crawl manually. |
| `npm --workspace server run dev` | API only (tsx watch). |
| `npm --workspace client run dev` | Client only. |

---

## 6. Matching algorithm

`server/src/services/matching.ts`

1. **Hard filters (pass/fail):** degree, domicile, category, gender, family income ceiling, minimum
   marks, current-year eligibility. A missing profile field is **never** treated as a pass — it moves
   the scholarship to *Needs Additional Information*.
2. **Weighted fit score (0–100):**
   - Income closeness to the ceiling — 35 pts
   - Academic standing relative to the minimum — 35 pts
   - Required-document readiness — 30 pts
3. **Categorisation:**
   - `Highly Eligible` — full hard match and score ≥ 80
   - `Possibly Eligible` — full hard match and score < 80
   - `Needs Additional Information` — missing fields required for verification
4. **Transparency:** every result carries a `reasons[]` audit list, e.g.
   `✅ Undergraduate student verified`, `✅ Maharashtra domicile satisfied`,
   `✅ Family income below ₹8,00,000`, `⚠ Income certificate upload required`.

---

## 7. Project structure

```
server/src
├── config/        # env + mongoose connection
├── domain/        # constants + privacy request guard
├── middleware/    # auth (JWT), error handling, rate limits, validation
├── models/        # User, ScholarshipPassport, Scholarship, Application,
│                  # AnalyticsProfile, MockTest, ExamAttempt, ScrapeRun
├── routes/        # auth, passport, scholarships, applications, exams, analytics, files
├── services/      # matching, passport, analytics, retention, storage, scraper, exam (AI)
├── scraper/       # source registry
├── jobs/          # node-cron scheduler
├── data/          # bundled verified scholarship snapshot
├── seed/          # seed + manual scrape runners
├── types/         # Express user augmentation
├── app.ts         # Express app assembly
└── index.ts       # bootstrap

client/src
├── components/    # Layout, UI kit, match reasons, route guard
├── context/       # AuthContext
├── lib/           # api client, types, constants, formatting
└── pages/         # Login, Register, Dashboard, Passport, Matches,
                   # ScholarshipDetail, Applications, ExamHub, ExamTake,
                   # Insights, Admin, NotFound
```

---

## 8. API reference (selected)

| Method & path | Description |
| --- | --- |
| `POST /api/auth/register` · `POST /api/auth/login` | Local auth, returns JWT. |
| `GET /api/auth/google` · `/api/auth/google/callback` | Google OAuth flow. |
| `GET /api/auth/me` | Current user. |
| `GET /api/passport` · `PUT /api/passport` | Read/update passport (update recalculates matches). |
| `GET /api/passport/matches` | Grouped, scored matches with reasons. |
| `POST /api/passport/documents` | Multipart document upload. |
| `POST /api/passport/documents/presign` · `/register` | Presigned direct-to-storage upload. |
| `GET /api/scholarships` · `GET /api/scholarships/:id` | Catalogue and per-user match detail. |
| `POST /api/scholarships/admin/scrape` | Manual crawl (admin). |
| `GET /api/scholarships/admin/scrape-runs` | Source audit trail (admin). |
| `GET/POST /api/applications` · `PATCH /:id/status` · `PATCH /:id/checklist/:itemId` · `POST /:id/submit` | Application tracking pipeline. |
| `GET /api/exams/:scholarshipId/blueprint` | Pattern, syllabus, renewal outlook. |
| `POST /api/exams/:scholarshipId/generate` | Generate/reuse a mock test. |
| `POST /api/exams/mock/:id/submit` | Score an attempt. |
| `GET /api/exams/performance` | Readiness, weak topics, speeds. |
| `GET /api/analytics/insights` | Anonymised demographic aggregates. |
| `GET /api/files/*` | Serves documents for the local storage driver. |

---

## 9. Design notes

- High-contrast editorial styling: lavender-tinted paper background, violet-black ink, a single
  lavender accent and semantic green/amber/red. Sharp, non-uniform corners; no purple-blue
  gradients or blurred hero.
- Utility-first copy throughout ("Matched Scholarships", "3 steps remaining", "Verify income
  certificate") — no decorative emoji used as UI.
- Functional Lucide SVG icons only; subtle Framer Motion transitions for drawers and progress.

---

## 10. Production checklist

1. Set a strong `JWT_SECRET` and a real `MONGO_URI`.
2. Choose `STORAGE_DRIVER=s3` or `supabase` and provide credentials.
3. Optionally enable Google OAuth and an AI provider.
4. Set `SCRAPER_LIVE=true` to run live crawls (install Playwright browsers:
   `npx playwright install chromium`).
5. Serve the built client (`client/dist`) behind your web server and point `/api` at the API.

---

## 11. Deployment

The web app is a static SPA while the API is a separate Node service, so they deploy
independently. Reference setup:

| Piece | Where | URL |
| --- | --- | --- |
| Web app (`client/`) | GitHub Pages | https://batchmate.duckdns.org |
| API (`server/`) | Render free web service | https://&lt;service&gt;.onrender.com |
| Database | MongoDB Atlas | `MONGO_URI` |

### 1. API on Render
1. Create a free MongoDB Atlas cluster and copy its connection string.
2. In Render choose **New → Blueprint**, select this repo (it reads `render.yaml`) and
   supply `MONGO_URI`. `JWT_SECRET` is generated and `CLIENT_ORIGIN` is preset to the
   Pages domain.
3. Confirm `https://<service>.onrender.com/api/health` returns `status: ok`.

> Render's free disk is ephemeral: uploaded documents with `STORAGE_DRIVER=local` are
> lost on redeploy/restart. Use `s3` or `supabase` for durable storage.

### 2. Web app on GitHub Pages
1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: add `VITE_API_URL` = your
   Render API URL (no trailing slash).
3. Push to `main`. `.github/workflows/deploy-pages.yml` builds `client/dist`, adds a
   `404.html` SPA fallback (so deep links like `/dashboard` resolve) and publishes it.

### 3. Custom domain (DuckDNS)
GitHub Pages normally wants a CNAME record, which DuckDNS cannot create, so point the
DuckDNS subdomain at GitHub Pages' A records instead:

1. At https://www.duckdns.org set `batchmate` → `185.199.108.153`. If multiple A records
   are available, also add `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
2. `client/public/CNAME` (shipped in this repo) declares `batchmate.duckdns.org`, so the
   built site carries the domain. In **Settings → Pages → Custom domain** confirm it and
   enable **Enforce HTTPS** once the certificate is issued.
3. DNS is case-insensitive; DuckDNS stores the host lowercase as `batchmate.duckdns.org`.
