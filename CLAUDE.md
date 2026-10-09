# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo. **Keep this file current**: update it
in the same change whenever architecture, commands, conventions or migration status change.

## Project

BatchMate — scholarship discovery, eligibility matching, guided applications, document retention
and mock-exam prep for Indian students. Mobile-first web app; primary audience Gen Z / young
millennials, often on low-end Android devices.

## Ground rules

- **Never push to GitHub** (or open PRs) without explicit approval from the repo owner. Commit
  locally on a feature branch only.
- **Never commit secrets.** `.env` (root, server-side secrets incl. service-role key and DB URL)
  and `client/.env.local` (browser-safe values) are gitignored. Only the *publishable* key may reach
  the browser. Service-role / secret keys belong only in `.env`, Edge Function secrets, or Vault.
- **Privacy:** never add a column, field or form input for national/government identifiers
  (Aadhaar, PAN, RRN, SSN, passport/voter/driving numbers). Income is stored as a *bracket*, never
  an exact figure. Edge Functions run `assertNoSensitiveFields` on request bodies.

## Architecture (Supabase-native)

```
client/                React 18 + Vite + Tailwind SPA (GitHub Pages, batchmate.duckdns.org)
supabase/
  migrations/          Versioned SQL — schema, RLS, RPCs, triggers, storage, pg_cron
  functions/
    _shared/           Pure TS shared by Edge Functions AND the client (via `@shared` alias):
                       constants, types, matching engine, exam generator/scorer, privacy guard,
                       scholarship snapshot, scraper sources, catalogue upsert
    exams/             Edge Function: generate / get / submit mock tests (answers stay server-side)
    jobs/              Edge Function: `scrape` + `retention` tasks (pg_cron or admin)
scripts/               Node ops scripts (seed, make-admin, setup-cron, smoke, db-push); read root .env
```

Data access model:
- **Reads** go straight from the client to Postgres via supabase-js; RLS limits users to their own
  rows. `scholarships` is publicly readable.
- **Simple writes** (passport fields, document registry, application notes) are direct table
  writes restricted by RLS **and column-level grants**: derived/privileged columns (role,
  completeness, status, retention) are not client-writable.
- **Workflow writes** go through security-definer RPCs: `start_application`,
  `set_checklist_item`, `update_application_status`, `submit_application`. Insights come from
  `get_insights()` (aggregates only; buckets < 3 profiles fold into "Other").
- **Matching** runs client-side with `_shared/matching.ts` (pure; scholarships are public, the
  passport is the user's own).
- **Exams** go through the `exams` Edge Function because `mock_tests.questions` contains answers
  (no RLS read policy on `mock_tests`).
- **Triggers:** `handle_new_user` (profile + empty passport on sign-up), `passport_derive`
  (completeness), retention trigger on applications (documents locked while any application is
  active; completion + 180 days afterwards).
- **Storage:** private bucket `documents`, object path `<user_id>/<file>`; 10 MB, PDF/images.
- **Cron:** `nightly-scrape` 18:30 UTC (00:00 IST), `retention-sweep` 19:15 UTC, via
  `public.invoke_job()` → `jobs` function. Needs Vault secrets `project_url` + `cron_secret` and
  the `CRON_SECRET` function secret (set by `scripts/setup-cron.ts`).

Supabase project ref `tresgtfjlqxrixitafjv`, region ap-south-1 (Mumbai). Direct DB host is IPv6-only;
use the session pooler URL (`SUPABASE_DB_URL` in `.env`).

## Commands

```bash
# Apply migrations to the remote project
npx supabase db push --db-url "$SUPABASE_DB_URL"

# Deploy Edge Functions (needs SUPABASE_ACCESS_TOKEN or `npx supabase login`)
npx supabase functions deploy exams jobs --project-ref tresgtfjlqxrixitafjv --use-api
```

Root shortcuts: `npm run dev | build | typecheck | seed | smoke | db:push`.

## Client structure

- `src/lib/queries.ts` — every data access as React Query hooks (+ derived `useMatches`,
  `usePerformance`). Add new reads/writes here, not in pages.
- `src/components/ui/index.tsx` — the UI kit (Button with `iconOnly`, Card, Badge/TierBadge/
  StatusBadge, Field/Input/Select, ChipGroup, Toggle, Progress, Ring, CountUp, Skeleton,
  EmptyState, Segmented, Sheet). Reuse before adding.
- `AppShell` = bottom tab bar (mobile) / sidebar (desktop). Exam taking is full-screen (outside
  the shell). Pages are lazy-loaded in `App.tsx`.
- Motion: `LazyMotion strict` — use `m.*`, never `motion.*`. Prefer CSS transitions for simple
  state changes. Tailwind tokens live as CSS variables in `src/index.css` (`.light` = light mode).
- Don't fight size padding with `px-0` (Tailwind class order loses); use a prop instead.
- Verify UI with Playwright mobile screenshots (Pixel 7 viewport) against `vite preview`.

## Conventions

- DB rows are snake_case end to end (types in `supabase/functions/_shared/types.ts`); don't
  re-map to camelCase in the client.
- Files under `_shared/` must stay runtime-neutral (no Deno/Node/DOM APIs, except `http.ts` and
  `catalogue.ts` which are Edge-only) and import siblings with explicit `.ts` extensions.
- Reference value lists exist in two places: `_shared/constants.ts` and `public.ref_values()` in
  SQL. Change both together (new migration for the SQL side).
- New schema changes = new timestamped migration file; never edit an applied migration.

## UI direction

Dark-first, glowy accents, clean and professional; mobile is the primary target. Must stay fast
on low-end devices: animate only transform/opacity, no backdrop blur or heavy gradients/shadows,
honour `prefers-reduced-motion`, route-level code splitting, keep initial JS small. Bottom tab bar
on mobile, sidebar on desktop, ≥44px touch targets, safe-area insets.

## Status

- [x] Schema, RLS, RPCs, storage bucket, triggers (`20261009000001`)
- [x] pg_cron jobs + upsert key fix (`20261009000002`)
- [x] Shared logic ported (matching, exams, privacy, snapshot)
- [x] Edge Functions written (`exams`, `jobs`)
- [ ] Edge Functions deployed + function secrets (CRON_SECRET, ALLOWED_ORIGINS, AI_*) set
- [x] Seed catalogue (`npm --workspace scripts run seed`; `seed:demo` adds a demo student)
- [x] RLS/RPC smoke test passing (`npm --workspace scripts run smoke`)
- [x] Vault secrets for cron (`npm --workspace scripts run setup-cron`)
- [x] Client moved to supabase-js (auth incl. reset/confirm, data layer, storage)
- [x] Legacy `server/`, Mongo, `render.yaml`, `start-mongodb.cmd` removed; README + CI updated
- [x] UI overhaul (dark-first, mobile-first, PWA)
- [ ] Supabase Auth URL config (site URL + redirect URLs) applied on the hosted project
- [ ] GitHub repo variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` set
- [ ] Custom SMTP for auth emails (built-in sender is rate-limited)

## Scripts (`scripts/` workspace, reads root `.env`)

| Command | What it does |
| --- | --- |
| `npm --workspace scripts run seed` | Upsert the bundled scholarship snapshot |
| `npm --workspace scripts run seed:demo` | …plus a demo student (`student@example.com`, `DEMO_PASSWORD` or `password123`) |
| `npm --workspace scripts run make-admin -- <email>` | Promote an account to admin (`--revoke` to demote). No default admin exists. |
| `npm --workspace scripts run setup-cron` | Generate `CRON_SECRET` and store Vault secrets for pg_cron |
| `npm --workspace scripts run smoke` | End-to-end RLS/RPC/storage checks with a throwaway user |
