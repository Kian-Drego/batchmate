-- Scholarships may be restricted to students with a documented disability.
-- The passport already records disability_status; the matching engine
-- (supabase/functions/_shared/matching.ts) applies this gate.
alter table public.scholarships
  add column if not exists disability_required boolean not null default false;

comment on column public.scholarships.disability_required is
  'When true, only students who recorded a documented disability in their passport can match this scholarship.';