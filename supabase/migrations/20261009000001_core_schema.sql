-- =============================================================================
-- BatchMate core schema (Supabase / Postgres)
--
-- Privacy rule: no table stores a national/government identifier (Aadhaar, PAN,
-- RRN, SSN, passport/voter/driving numbers). PostgREST rejects unknown columns,
-- so the schema itself is the guard for direct client writes; Edge Functions
-- additionally run `assertNoSensitiveFields` on their request bodies.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Reference value lists (kept in sync with supabase/functions/_shared/constants.ts)
-- -----------------------------------------------------------------------------
create or replace function public.ref_values(kind text)
returns text[]
language sql
immutable
as $$
  select case kind
    when 'category' then array['General','OBC','SC','ST','EWS','Minority','Other']
    when 'gender' then array['Male','Female','Other','Prefer not to say']
    when 'degree' then array['Class 10','Class 11','Class 12','Diploma','Undergraduate','Postgraduate','Professional (MBBS/BTech/LLB)','Doctorate','Other']
    when 'income' then array['Below 100000','100000-250000','250000-500000','500000-800000','800000-1200000','Above 1200000']
    when 'document' then array['Income Certificate','Class 10 Marksheet','Class 12 Marksheet','Category Certificate','Domicile Proof','Disability Certificate','Bonafide / Enrolment Certificate','Bank Passbook','Entrance Exam Scorecard','Photograph','Signature','Other']
    when 'app_status' then array['Not Started','In Progress','Submitted','Verification Pending','Awarded','Rejected']
    when 'scholarship_type' then array['Government','State Government','Corporate CSR','Foundation','Merit-Based','Need-Based','Minority']
    when 'state' then array['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh','Andaman and Nicobar Islands','Dadra and Nagar Haveli and Daman and Diu','Lakshadweep','All India']
  end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Scholarship passport (1:1 with profile). Flat columns so every value is
-- type-checked and constrained by the database.
-- -----------------------------------------------------------------------------
create table public.passports (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 20),
  -- academic
  institution text check (char_length(institution) <= 160),
  course text check (char_length(course) <= 120),
  degree text check (degree = any (public.ref_values('degree'))),
  current_year text check (char_length(current_year) <= 40),
  class12_percentage numeric(5, 2) check (class12_percentage between 0 and 100),
  cgpa numeric(4, 2) check (cgpa between 0 and 10),
  entrance_exam_name text check (char_length(entrance_exam_name) <= 80),
  entrance_exam_score numeric,
  -- demographic
  state text check (state = any (public.ref_values('state'))),
  category text check (category = any (public.ref_values('category'))),
  income_bracket text check (income_bracket = any (public.ref_values('income'))),
  gender text check (gender = any (public.ref_values('gender'))),
  disability_status boolean not null default false,
  -- derived
  completeness integer not null default 0,
  last_matched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Completeness counts only the fields the matching engine relies on
-- (mirrors `completeness()` in _shared/matching.ts).
create or replace function public.passport_derive()
returns trigger
language plpgsql
as $$
declare
  filled integer := 0;
begin
  filled := (new.degree is not null)::int
    + (new.state is not null)::int
    + (new.category is not null)::int
    + (new.income_bracket is not null)::int
    + (new.gender is not null)::int
    + (coalesce(new.class12_percentage, new.cgpa) is not null)::int
    + (nullif(new.current_year, '') is not null)::int;
  new.completeness := round(filled * 100.0 / 7);
  new.last_matched_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger passports_derive before insert or update on public.passports
  for each row execute function public.passport_derive();

-- -----------------------------------------------------------------------------
-- Passport documents (files live in the private `documents` storage bucket)
-- -----------------------------------------------------------------------------
create table public.passport_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type = any (public.ref_values('document'))),
  file_name text not null check (char_length(file_name) <= 200),
  storage_key text not null unique,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes between 0 and 10485760),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'verified', 'rejected')),
  -- null = active/locked (never expires); a date = removable after it passes.
  retention_until timestamptz,
  uploaded_at timestamptz not null default now(),
  -- documents must live in the owner's folder
  constraint storage_key_in_owner_folder check (storage_key like user_id::text || '/%')
);

create index passport_documents_user_idx on public.passport_documents (user_id);
create index passport_documents_retention_idx on public.passport_documents (retention_until)
  where retention_until is not null;

-- -----------------------------------------------------------------------------
-- Scholarships catalogue
-- -----------------------------------------------------------------------------
create table public.scholarships (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  title text not null,
  type text not null check (type = any (public.ref_values('scholarship_type'))),
  amount numeric not null default 0,
  amount_description text,
  degree text[] not null default '{}' check (degree <@ public.ref_values('degree')),
  current_year_allowed text[] not null default '{}',
  income_limit numeric,
  marks_min numeric,
  category text[] not null default '{}' check (category <@ public.ref_values('category')),
  state_domicile text[] not null default '{}',
  gender text[] not null default '{}',
  deadline timestamptz,
  required_documents text[] not null default '{}'
    check (required_documents <@ public.ref_values('document')),
  selection_process text[] not null default '{}',
  aptitude_test_required boolean not null default false,
  renewal_criteria jsonb,
  official_source_url text not null,
  last_scraped_at timestamptz not null default now(),
  application_mode text not null default 'external' check (application_mode in ('native', 'external')),
  external_portal_url text,
  application_steps text[] not null default '{}',
  description text,
  exam_pattern jsonb,
  tags text[] not null default '{}',
  active boolean not null default true,
  search tsvector generated always as (
    to_tsvector('english', coalesce(provider, '') || ' ' || coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (official_source_url, title)
);

create index scholarships_search_idx on public.scholarships using gin (search);
create index scholarships_active_deadline_idx on public.scholarships (active, deadline);
create trigger scholarships_updated_at before update on public.scholarships
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Applications. Writes go through RPCs below so status transitions, checklist
-- generation and retention are enforced server-side.
-- -----------------------------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  mode text not null default 'external' check (mode in ('native', 'external')),
  status text not null default 'Not Started' check (status = any (public.ref_values('app_status'))),
  -- [{ id, label, done, documentType? }]
  checklist jsonb not null default '[]',
  notes text check (char_length(notes) <= 2000),
  submitted_at timestamptz,
  completed_at timestamptz,
  -- [{ status, note?, at }]
  history jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, scholarship_id)
);

create index applications_user_idx on public.applications (user_id, updated_at desc);
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Mock tests (answers stay server-side) and exam attempts
-- -----------------------------------------------------------------------------
create table public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  title text not null,
  duration_minutes integer not null default 30,
  negative_marking numeric not null default 0,
  -- [{ id, section, topic, prompt, options[], correctIndex, explanation?, difficulty }]
  questions jsonb not null default '[]',
  source text not null default 'curated' check (source in ('ai', 'curated')),
  generated_at timestamptz not null default now()
);

create index mock_tests_scholarship_idx on public.mock_tests (scholarship_id, generated_at desc);

create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  mock_test_id uuid not null references public.mock_tests (id) on delete cascade,
  answers jsonb not null default '[]',
  score numeric not null default 0,
  max_score numeric not null default 0,
  accuracy integer not null default 0,
  readiness_score integer not null default 0,
  avg_seconds integer not null default 0,
  section_stats jsonb not null default '[]',
  weak_topics jsonb not null default '[]',
  completed_at timestamptz not null default now()
);

create index exam_attempts_user_idx on public.exam_attempts (user_id, completed_at desc);

-- -----------------------------------------------------------------------------
-- Scraper audit trail
-- -----------------------------------------------------------------------------
create table public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_url text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'success' check (status in ('success', 'partial', 'failed', 'skipped')),
  records_found integer not null default 0,
  records_upserted integer not null default 0,
  duration_ms integer not null default 0,
  error text,
  mode text not null default 'snapshot' check (mode in ('live', 'snapshot'))
);

create index scrape_runs_started_idx on public.scrape_runs (started_at desc);

-- =============================================================================
-- New-user bootstrap: profile + empty passport
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  insert into public.passports (user_id, full_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), nullif(new.raw_user_meta_data ->> 'full_name', ''))
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Retention policy engine
--   While a user has any non-terminal application, every document is locked
--   (retention_until = null). Once all applications are terminal, documents
--   get latest completion + 180 days, after which the sweep may remove them.
-- =============================================================================
create or replace function public.apply_retention(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
  total_count integer;
  latest timestamptz;
  until timestamptz := null;
begin
  select count(*) filter (where status not in ('Awarded', 'Rejected')),
         count(*),
         max(coalesce(completed_at, updated_at)) filter (where status in ('Awarded', 'Rejected'))
    into active_count, total_count, latest
    from public.applications
   where user_id = p_user;

  if active_count = 0 and total_count > 0 and latest is not null then
    until := latest + interval '180 days';
  end if;

  update public.passport_documents
     set retention_until = until
   where user_id = p_user
     and retention_until is distinct from until;
end;
$$;

create or replace function public.applications_retention_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.apply_retention(coalesce(new.user_id, old.user_id));
  return null;
end;
$$;

create trigger applications_retention after insert or update of status or delete
  on public.applications
  for each row execute function public.applications_retention_trigger();

-- New documents inherit the user's current retention state; users can only
-- ever create pending_review documents.
create or replace function public.passport_documents_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    new.status := 'pending_review';
  end if;
  new.retention_until := (
    select d.retention_until from public.passport_documents d
     where d.user_id = new.user_id and d.retention_until is not null
     limit 1
  );
  return new;
end;
$$;

create trigger passport_documents_insert before insert on public.passport_documents
  for each row execute function public.passport_documents_before_insert();

-- =============================================================================
-- Application RPCs
-- =============================================================================

-- Start tracking an application (idempotent). Builds the checklist from the
-- scholarship's required documents and application steps.
create or replace function public.start_application(p_scholarship uuid)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  s public.scholarships;
  app public.applications;
  owned text[];
  checklist jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into app from public.applications where user_id = uid and scholarship_id = p_scholarship;
  if found then
    return app;
  end if;

  select * into s from public.scholarships where id = p_scholarship and active;
  if not found then
    raise exception 'Scholarship not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct type), '{}') into owned
    from public.passport_documents where user_id = uid;

  checklist := jsonb_build_array(jsonb_build_object(
    'id', gen_random_uuid(), 'label', 'Review eligibility criteria', 'done', false));

  checklist := checklist || coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', gen_random_uuid(), 'label', 'Upload ' || d, 'done', d = any (owned), 'documentType', d))
      from unnest(s.required_documents) as d), '[]'::jsonb);

  checklist := checklist || coalesce((
    select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'label', step, 'done', false))
      from unnest(s.application_steps) as step), '[]'::jsonb);

  insert into public.applications (user_id, scholarship_id, mode, status, checklist, history)
  values (
    uid, s.id, s.application_mode, 'Not Started', checklist,
    jsonb_build_array(jsonb_build_object('status', 'Not Started', 'note', 'Application tracking started', 'at', now()))
  )
  returning * into app;

  return app;
end;
$$;

-- Tick / untick a checklist item. The first tick moves the application to
-- "In Progress".
create or replace function public.set_checklist_item(p_application uuid, p_item text, p_done boolean)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.applications;
begin
  select * into app from public.applications
   where id = p_application and user_id = auth.uid()
   for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  if not exists (select 1 from jsonb_array_elements(app.checklist) e where e ->> 'id' = p_item) then
    raise exception 'Checklist item not found' using errcode = 'P0002';
  end if;

  update public.applications a
     set checklist = (
       select jsonb_agg(
                case when e ->> 'id' = p_item then jsonb_set(e, '{done}', to_jsonb(p_done)) else e end
                order by ord)
         from jsonb_array_elements(app.checklist) with ordinality as t(e, ord)
     ),
     status = case when app.status = 'Not Started' and p_done then 'In Progress' else app.status end,
     history = case when app.status = 'Not Started' and p_done
                 then app.history || jsonb_build_object('status', 'In Progress', 'note', 'Checklist started', 'at', now())
                 else app.history end
   where a.id = app.id
  returning * into app;

  return app;
end;
$$;

-- Advance the status pipeline along allowed transitions only.
create or replace function public.update_application_status(p_application uuid, p_status text, p_note text default null)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.applications;
  allowed text[];
begin
  select * into app from public.applications
   where id = p_application and user_id = auth.uid()
   for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  allowed := case app.status
    when 'Not Started' then array['In Progress']
    when 'In Progress' then array['Submitted', 'Not Started']
    when 'Submitted' then array['Verification Pending', 'Rejected']
    when 'Verification Pending' then array['Awarded', 'Rejected']
    else array[]::text[]
  end;

  if not (p_status = any (allowed)) then
    raise exception 'Cannot move from "%" to "%"', app.status, p_status using errcode = '22023';
  end if;

  update public.applications a
     set status = p_status,
         history = app.history || jsonb_strip_nulls(jsonb_build_object('status', p_status, 'note', left(p_note, 500), 'at', now())),
         submitted_at = case when p_status = 'Submitted' then now() else app.submitted_at end,
         completed_at = case when p_status in ('Awarded', 'Rejected') then now() else app.completed_at end
   where a.id = app.id
  returning * into app;

  return app;
end;
$$;

-- Native submission with readiness checks.
create or replace function public.submit_application(p_application uuid)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  app public.applications;
  s public.scholarships;
  p public.passports;
  missing_docs text[];
  blocking text[] := '{}';
begin
  select * into app from public.applications where id = p_application and user_id = uid for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if app.mode <> 'native' then
    raise exception 'This scholarship is applied for on the provider portal' using errcode = '22023';
  end if;
  if app.status not in ('Not Started', 'In Progress') then
    raise exception 'Application has already been submitted' using errcode = '22023';
  end if;

  select * into s from public.scholarships where id = app.scholarship_id;
  select * into p from public.passports where user_id = uid;

  select coalesce(array_agg(d), '{}') into missing_docs
    from unnest(s.required_documents) d
   where not exists (select 1 from public.passport_documents pd where pd.user_id = uid and pd.type = d);

  if p.degree is null then blocking := blocking || 'Degree'; end if;
  if p.state is null then blocking := blocking || 'State / Domicile'; end if;
  if p.income_bracket is null then blocking := blocking || 'Family income bracket'; end if;

  if cardinality(blocking) > 0 or cardinality(missing_docs) > 0 then
    raise exception 'Application is not ready to submit'
      using errcode = '22023',
            detail = jsonb_build_object('missingProfileFields', blocking, 'missingDocuments', missing_docs)::text;
  end if;

  update public.applications a
     set status = 'Submitted',
         submitted_at = now(),
         history = app.history || jsonb_build_object('status', 'Submitted', 'note', 'Submitted natively', 'at', now())
   where a.id = app.id
  returning * into app;

  return app;
end;
$$;

-- =============================================================================
-- Anonymised insights: aggregates only, never row-level data. Buckets with
-- fewer than 3 profiles are folded into "Other" to prevent re-identification.
-- =============================================================================
create or replace function public.get_insights()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with p as (
    select user_id,
           coalesce(state, 'Unknown') as state,
           coalesce(income_bracket, 'Unknown') as income_tier,
           coalesce(degree, 'Unknown') as degree
      from public.passports
  ),
  a as (
    select ap.user_id, ap.status, s.type as scholarship_type
      from public.applications ap join public.scholarships s on s.id = ap.scholarship_id
  ),
  bucketed as (
    select dim, case when count(*) over (partition by dim, key) < 3 then 'Other' else key end as key, user_id
      from (
        select 'state' as dim, state as key, user_id from p
        union all select 'income', income_tier, user_id from p
        union all select 'degree', degree, user_id from p
      ) x
  ),
  dims as (
    select b.dim, b.key, count(*) as total,
           count(*) filter (where exists (select 1 from a where a.user_id = b.user_id and a.status = 'Awarded')) as awarded
      from bucketed b
     group by b.dim, b.key
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'profiles', (select count(*) from p),
      'applicationsStarted', (select count(*) from a),
      'submitted', (select count(*) from a where status in ('Submitted', 'Verification Pending', 'Awarded', 'Rejected')),
      'awarded', (select count(*) from a where status = 'Awarded'),
      'rejected', (select count(*) from a where status = 'Rejected')
    ),
    'byState', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'total', total, 'awarded', awarded) order by total desc)
                           from (select * from dims where dim = 'state' order by total desc limit 12) t), '[]'),
    'byIncomeTier', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'total', total) order by total desc)
                           from dims where dim = 'income'), '[]'),
    'byDegree', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'total', total) order by total desc)
                           from dims where dim = 'degree'), '[]'),
    'awardedByType', coalesce((select jsonb_agg(jsonb_build_object('key', scholarship_type, 'count', c) order by c desc)
                           from (select scholarship_type, count(*) c from a where status = 'Awarded' group by 1) t), '[]')
  );
$$;

-- =============================================================================
-- Row level security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.passports enable row level security;
alter table public.passport_documents enable row level security;
alter table public.scholarships enable row level security;
alter table public.applications enable row level security;
alter table public.mock_tests enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.scrape_runs enable row level security;

-- Profiles: read/update own; admins read all. Role is not user-writable.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (name, avatar_url) on public.profiles to authenticated;

-- Passports: read/update own. Derived columns are trigger-maintained.
create policy "passports: read own" on public.passports
  for select to authenticated using (user_id = (select auth.uid()));
create policy "passports: update own" on public.passports
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, update, delete on public.passports from authenticated, anon;
grant update (full_name, phone, institution, course, degree, current_year, class12_percentage, cgpa,
              entrance_exam_name, entrance_exam_score, state, category, income_bracket, gender,
              disability_status) on public.passports to authenticated;

-- Documents: own rows; delete only when not under a retention window; admins
-- may review (update status).
create policy "documents: read own" on public.passport_documents
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "documents: insert own" on public.passport_documents
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "documents: delete own unlocked" on public.passport_documents
  for delete to authenticated using (user_id = (select auth.uid()) and retention_until is null);
create policy "documents: admin review" on public.passport_documents
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke update on public.passport_documents from authenticated, anon;
grant update (status) on public.passport_documents to authenticated;

-- Scholarships: public catalogue; admins manage.
create policy "scholarships: public read" on public.scholarships
  for select to anon, authenticated using (active or (select public.is_admin()));
create policy "scholarships: admin write" on public.scholarships
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Applications: read own; all writes via security-definer RPCs.
create policy "applications: read own" on public.applications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "applications: update notes" on public.applications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, update, delete on public.applications from authenticated, anon;
grant update (notes) on public.applications to authenticated;

-- Mock tests: never directly readable (contain answers); served by the
-- `exams` Edge Function with answers stripped.
-- (RLS enabled with no policies = deny all for anon/authenticated.)

-- Exam attempts: read own; inserted by the Edge Function (service role).
create policy "attempts: read own" on public.exam_attempts
  for select to authenticated using (user_id = (select auth.uid()));

-- Scrape runs: admins only.
create policy "scrape_runs: admin read" on public.scrape_runs
  for select to authenticated using ((select public.is_admin()));

-- RPC execute grants
revoke execute on function public.start_application(uuid) from public, anon;
revoke execute on function public.set_checklist_item(uuid, text, boolean) from public, anon;
revoke execute on function public.update_application_status(uuid, text, text) from public, anon;
revoke execute on function public.submit_application(uuid) from public, anon;
revoke execute on function public.apply_retention(uuid) from public, anon, authenticated;
revoke execute on function public.get_insights() from public, anon;
grant execute on function public.start_application(uuid) to authenticated;
grant execute on function public.set_checklist_item(uuid, text, boolean) to authenticated;
grant execute on function public.update_application_status(uuid, text, text) to authenticated;
grant execute on function public.submit_application(uuid) to authenticated;
grant execute on function public.get_insights() to authenticated;

-- =============================================================================
-- Storage: private bucket, one folder per user (`<uid>/<file>`)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "documents bucket: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

create policy "documents bucket: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents bucket: delete own unlocked" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.passport_documents d
       where d.storage_key = name and d.retention_until is not null
    )
  );
