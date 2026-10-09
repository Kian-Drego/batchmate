# BatchMate — Scholarships, matched

A mobile-first web app for **scholarship discovery, eligibility matching, guided applications,
document retention and mock-exam prep** for Indian students.

- **Frontend:** React 18 + Vite + Tailwind + Framer Motion, installable PWA, "soft tactile" UI with light + dark modes.
  Hosted on Vercel at <https://batchmate.duckdns.org> (also <https://batchmate-liart.vercel.app>).
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
| **Admin console** | `/admin`: document verification queue, application decisions, student files and roles, catalogue editor, insights (admins only; aggregates only, buckets under 3 profiles folded into "Other"), scrape audit and a full activity log. |
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
npm --workspace scripts run create-admin         # admin@batchmate.app, password saved to .env
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
  `https://batchmate.duckdns.org/**`, `https://batchmate-liart.vercel.app/**` and
  `http://localhost:5173/**`.
- **Auth → Providers → Google** (optional): add the client ID and secret, then set
  `VITE_GOOGLE_AUTH=true`.
- **Auth → SMTP:** configure a custom SMTP sender for production. The built-in sender is heavily
  rate-limited.

---

## Deployment (Vercel)

1. Vercel project settings: **Root Directory** `client`, framework **Vite**, build `npm run build`,
   output `dist`. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
   optionally `VITE_GOOGLE_AUTH`. Every push to `main` deploys.
2. `client/vercel.json` (mirrored at the repo root) rewrites every route to `index.html` so deep
   links like `/admin/review` work, caches hashed assets for a year and never caches the service
   worker.
3. **Custom domain:** Vercel → Project → Settings → Domains → add `batchmate.duckdns.org`.
   `duckdns.org` is on the public-suffix list, so Vercel treats it as an apex domain and asks for
   an **A record `76.76.21.21`** (DuckDNS cannot create CNAMEs). On duckdns.org set the `batchmate`
   IPv4 to `76.76.21.21` and clear any IPv6. Vercel issues the HTTPS certificate automatically.

## Performance budget

The app targets low-end Android phones on mobile data:
- Routes are code-split.
- Animation features load lazily, after first paint.
- Only `transform` and `opacity` are animated.
- Shadows and paper grain are static, never `filter: blur`.
- Fonts are Latin-only variable fonts (~61 KB).
- `prefers-reduced-motion` is honoured.
- Installable PWA with an offline app shell.
