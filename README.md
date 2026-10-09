# BatchMate — Scholarships, matched

A mobile-first web app for **scholarship discovery, eligibility matching, guided applications,
document retention and mock-exam prep** for Indian students.

- **Frontend:** React 18 + Vite + Tailwind + Framer Motion, installable PWA, dark-first UI.
  Hosted on GitHub Pages at <https://batchmate.duckdns.org>.
- **Backend:** Supabase. That means Postgres with row-level security, Auth, Storage, Edge
  Functions and pg_cron. There is no separate server to host.

```
client/      React SPA
supabase/
  migrations/   schema, RLS, RPCs, triggers, storage bucket, cron jobs
  functions/
    _shared/    pure TS shared by the client and Edge Functions (matching, exams, constants…)
    exams/      generate / serve / score mock tests (answers stay server-side)
    jobs/       nightly scrape + document-retention sweep
scripts/     seed, admin promotion, cron setup, end-to-end smoke test
```

---

## Features

| Module | How it works |
| --- | --- |
| **Auth** | Supabase Auth: email/password (with confirmation + password reset) and optional Google. |
| **Scholarship Passport** | One `passports` row per user: academics plus coarse demographics. Completeness is computed by a trigger. |
| **Hybrid matching** | `_shared/matching.ts` runs in the browser. First, hard eligibility filters; then a 0–100 fit score (income 35, academics 35, documents 30). Every result explains itself with `reasons[]`. Missing data never silently passes a filter; those matches land in *Needs info* instead. |
| **Applications** | Security-definer RPCs (`start_application`, `set_checklist_item`, `update_application_status`, `submit_application`) enforce the checklist and the allowed status transitions. |
| **Documents** | Private `documents` bucket, stored as `<user_id>/<file>`. While any application is active, documents are locked. Once all are complete, documents get *completion + 180 days*, then the nightly sweep deletes them. |
| **Exam prep** | The `exams` Edge Function builds mock tests (an OpenAI-compatible LLM, or a curated offline bank) and scores attempts server-side. Readiness, weak topics and pace are tracked per user. |
| **Insights** | `get_insights()` returns aggregates only. Any bucket with fewer than 3 profiles is folded into "Other". |
| **Catalogue refresh** | pg_cron runs the `jobs` function at 00:00 IST. By default it ingests the bundled, verified snapshot (`SCRAPER_LIVE=false`). With `SCRAPER_LIVE=true` it fetches static sources live, and records each source in `scrape_runs`. |

### Privacy rules (enforced)

- **No national identifiers, ever** (Aadhaar, PAN, RRN, SSN, passport/voter/driving numbers). No
  column for them exists, and PostgREST rejects unknown columns. Edge Functions also reject such
  keys in request bodies.
- Income is stored as a *bracket*, never an exact figure.
- RLS restricts every user to their own rows. Column-level grants stop clients from writing
  role, completeness, document status or retention dates.

---

## Local development

Prerequisites: Node 20+ and access to the Supabase project.

```bash
npm install
cp .env.example .env                       # server-side secrets (scripts/CLI only)
cp client/.env.example client/.env.local   # browser-safe URL + publishable key
npm run dev                                # http://localhost:5173
```

### Database & backend

```bash
npm run db:push                                  # apply supabase/migrations
npm --workspace scripts run seed                 # load the scholarship catalogue
npm --workspace scripts run seed:demo            # + demo student (student@example.com)
npm --workspace scripts run make-admin -- <email>
npm --workspace scripts run setup-cron           # Vault secrets for pg_cron
npm --workspace scripts run smoke                # end-to-end RLS / RPC / storage checks

# Edge Functions (needs `npx supabase login` once)
npx supabase functions deploy exams jobs --project-ref <ref> --use-api
npx supabase secrets set --project-ref <ref> CRON_SECRET=<from .env> \
  ALLOWED_ORIGINS=https://batchmate.duckdns.org,http://localhost:5173
# Optional AI question generation:
npx supabase secrets set --project-ref <ref> AI_PROVIDER=openai-compatible \
  AI_BASE_URL=https://api.groq.com/openai/v1 AI_API_KEY=... AI_MODEL=llama-3.1-8b-instant
```

### Supabase dashboard settings

- **Auth → URL configuration:** Site URL `https://batchmate.duckdns.org`; redirect URLs
  `https://batchmate.duckdns.org/**` and `http://localhost:5173/**`.
- **Auth → Providers → Google** (optional): add the client ID and secret, then set
  `VITE_GOOGLE_AUTH=true`.
- **Auth → SMTP:** configure a custom SMTP sender for production. The built-in sender is heavily
  rate-limited.

---

## Deployment (GitHub Pages)

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`, optionally `VITE_GOOGLE_AUTH`.
3. Push to `main`. `.github/workflows/deploy-pages.yml` builds `client/dist`, adds a `404.html`
   SPA fallback and publishes it.
4. DuckDNS: point `batchmate` at the GitHub Pages A records (`185.199.108–111.153`).
   `client/public/CNAME` carries the domain.

## Performance budget

The app targets low-end Android phones on mobile data:
- Routes are code-split.
- Animation features load lazily, after first paint.
- Only `transform` and `opacity` are animated.
- Glows are static `box-shadow`s, never `filter: blur`.
- Fonts are Latin-only variable fonts (~68 KB).
- `prefers-reduced-motion` is honoured.
- Installable PWA with an offline app shell.
