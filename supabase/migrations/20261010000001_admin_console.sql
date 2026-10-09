-- =============================================================================
-- Admin console: document review, application decisions, role management,
-- audit trail, admin-only insights.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Audit log (admins read; written only by security-definer functions/triggers)
-- -----------------------------------------------------------------------------
create table public.admin_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index admin_audit_created_idx on public.admin_audit (created_at desc);
alter table public.admin_audit enable row level security;
create policy "audit: admin read" on public.admin_audit
  for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.admin_audit from authenticated, anon;

create or replace function public.log_admin(p_action text, p_type text, p_id text, p_details jsonb default '{}')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit (actor_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_type, p_id, coalesce(p_details, '{}'));
$$;
revoke execute on function public.log_admin(text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Document review metadata (students see the outcome + note)
-- -----------------------------------------------------------------------------
alter table public.passport_documents
  add column review_note text check (char_length(review_note) <= 500),
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles (id) on delete set null;

create index passport_documents_status_idx on public.passport_documents (status, uploaded_at);

-- Direct status updates are no longer granted; reviews go through the RPC.
drop policy if exists "documents: admin review" on public.passport_documents;
revoke update on public.passport_documents from authenticated, anon;

create or replace function public.admin_review_document(p_document uuid, p_status text, p_note text default null)
returns public.passport_documents
language plpgsql
security definer
set search_path = ''
as $$
declare
  doc public.passport_documents;
begin
  perform public.require_admin();
  if p_status not in ('verified', 'rejected', 'pending_review') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;
  if p_status = 'rejected' and nullif(trim(p_note), '') is null then
    raise exception 'Add a short reason so the student knows what to fix' using errcode = '22023';
  end if;

  update public.passport_documents
     set status = p_status,
         review_note = nullif(left(trim(p_note), 500), ''),
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_document
  returning * into doc;
  if not found then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;

  perform public.log_admin('document.' || p_status, 'document', doc.id::text,
    jsonb_build_object('type', doc.type, 'user_id', doc.user_id, 'note', doc.review_note));
  return doc;
end;
$$;

-- A re-uploaded document always starts fresh.
create or replace function public.passport_documents_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.status := 'pending_review';
  new.review_note := null;
  new.reviewed_at := null;
  new.reviewed_by := null;
  new.retention_until := (
    select d.retention_until from public.passport_documents d
     where d.user_id = new.user_id and d.retention_until is not null
     limit 1
  );
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin read access
-- -----------------------------------------------------------------------------
drop policy "passports: read own" on public.passports;
create policy "passports: read own or admin" on public.passports
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy "applications: read own" on public.applications;
create policy "applications: read own or admin" on public.applications
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy "attempts: read own" on public.exam_attempts;
create policy "attempts: read own or admin" on public.exam_attempts
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Application decisions (admin)
-- -----------------------------------------------------------------------------
create or replace function public.admin_decide_application(p_application uuid, p_status text, p_note text default null)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.applications;
  allowed text[];
begin
  perform public.require_admin();
  select * into app from public.applications where id = p_application for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  allowed := case app.status
    when 'Submitted' then array['Verification Pending', 'Awarded', 'Rejected']
    when 'Verification Pending' then array['Awarded', 'Rejected']
    when 'In Progress' then array['Rejected']
    when 'Not Started' then array['Rejected']
    else array[]::text[]
  end;
  if not (p_status = any (allowed)) then
    raise exception 'Cannot move from "%" to "%"', app.status, p_status using errcode = '22023';
  end if;
  if p_status = 'Rejected' and nullif(trim(p_note), '') is null then
    raise exception 'Add a reason for the rejection' using errcode = '22023';
  end if;

  update public.applications a
     set status = p_status,
         history = app.history || jsonb_strip_nulls(jsonb_build_object(
           'status', p_status, 'note', nullif(left(trim(p_note), 500), ''), 'at', now(), 'by', 'admin')),
         completed_at = case when p_status in ('Awarded', 'Rejected') then now() else app.completed_at end
   where a.id = app.id
  returning * into app;

  perform public.log_admin('application.' || lower(replace(p_status, ' ', '_')), 'application', app.id::text,
    jsonb_build_object('user_id', app.user_id, 'scholarship_id', app.scholarship_id, 'note', p_note));
  return app;
end;
$$;

-- -----------------------------------------------------------------------------
-- Role management
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  prof public.profiles;
begin
  perform public.require_admin();
  if p_role not in ('student', 'admin') then
    raise exception 'Invalid role' using errcode = '22023';
  end if;
  if p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'You cannot remove your own admin access' using errcode = '22023';
  end if;
  update public.profiles set role = p_role where id = p_user returning * into prof;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  perform public.log_admin('user.role_' || p_role, 'user', p_user::text, jsonb_build_object('email', prof.email));
  return prof;
end;
$$;

-- -----------------------------------------------------------------------------
-- Catalogue changes are audited
-- -----------------------------------------------------------------------------
create or replace function public.scholarships_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return null; -- cron/service-role ingests are tracked in scrape_runs
  end if;
  perform public.log_admin(
    'scholarship.' || lower(tg_op),
    'scholarship',
    coalesce(new.id, old.id)::text,
    jsonb_build_object('title', coalesce(new.title, old.title),
                       'active', case when tg_op = 'DELETE' then null else new.active end));
  return null;
end;
$$;

create trigger scholarships_audit after insert or update or delete on public.scholarships
  for each row execute function public.scholarships_audit();

-- -----------------------------------------------------------------------------
-- Dashboard numbers
-- -----------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'students', (select count(*) from public.profiles where role = 'student'),
    'newStudents7d', (select count(*) from public.profiles where role = 'student' and created_at > now() - interval '7 days'),
    'pendingDocuments', (select count(*) from public.passport_documents where status = 'pending_review'),
    'awaitingDecision', (select count(*) from public.applications where status in ('Submitted', 'Verification Pending')),
    'activeApplications', (select count(*) from public.applications where status not in ('Awarded', 'Rejected')),
    'awarded', (select count(*) from public.applications where status = 'Awarded'),
    'activeScholarships', (select count(*) from public.scholarships where active),
    'closingSoon', (select count(*) from public.scholarships where active and deadline between now() and now() + interval '14 days')
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Insights become admin-only
-- -----------------------------------------------------------------------------
create or replace function public.get_insights_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return public.get_insights();
end;
$$;

revoke execute on function public.get_insights() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke execute on function public.admin_review_document(uuid, text, text) from public, anon;
revoke execute on function public.admin_decide_application(uuid, text, text) from public, anon;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
revoke execute on function public.admin_stats() from public, anon;
revoke execute on function public.get_insights_admin() from public, anon;
revoke execute on function public.require_admin() from public, anon;
grant execute on function public.admin_review_document(uuid, text, text) to authenticated;
grant execute on function public.admin_decide_application(uuid, text, text) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.get_insights_admin() to authenticated;
grant execute on function public.require_admin() to authenticated;
