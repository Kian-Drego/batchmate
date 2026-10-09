-- =============================================================================
-- Soft email verification.
--
-- Supabase's mandatory confirmation is off (beta: the free tier sends ~2 auth
-- emails/hour), so users get in immediately and verify later in-app. Ownership
-- is recorded here, never trusted from the client: confirm_email_ownership()
-- only succeeds when the caller's current session was minted by an emailed
-- one-time code / magic link / recovery link, i.e. they read that inbox.
-- =============================================================================

alter table public.profiles add column email_verified_at timestamptz;

-- Existing accounts were created under mandatory confirmation (or by an admin),
-- so their addresses are already proven.
update public.profiles p
   set email_verified_at = coalesce(u.email_confirmed_at, now())
  from auth.users u
 where u.id = p.id;

-- OAuth providers (Google) verify the address themselves.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, avatar_url, email_verified_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    case when coalesce(new.raw_app_meta_data ->> 'provider', 'email') <> 'email' then now() end
  );
  insert into public.passports (user_id, full_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), nullif(new.raw_user_meta_data ->> 'full_name', ''))
  );
  return new;
end;
$$;

create or replace function public.confirm_email_ownership()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  proven boolean;
  stamp timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select exists (
    select 1
      from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as m
     where m ->> 'method' in ('otp', 'magiclink', 'recovery', 'email/signup', 'email_change')
  ) into proven;

  if not proven then
    raise exception 'Open the code or link from your email to verify' using errcode = '42501';
  end if;

  update public.profiles
     set email_verified_at = coalesce(email_verified_at, now())
   where id = auth.uid()
  returning email_verified_at into stamp;

  return stamp;
end;
$$;

revoke execute on function public.confirm_email_ownership() from public, anon;
grant execute on function public.confirm_email_ownership() to authenticated;

-- Admin overview: how many students still need to verify.
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
    'unverifiedStudents', (select count(*) from public.profiles where role = 'student' and email_verified_at is null),
    'pendingDocuments', (select count(*) from public.passport_documents where status = 'pending_review'),
    'awaitingDecision', (select count(*) from public.applications where status in ('Submitted', 'Verification Pending')),
    'activeApplications', (select count(*) from public.applications where status not in ('Awarded', 'Rejected')),
    'awarded', (select count(*) from public.applications where status = 'Awarded'),
    'activeScholarships', (select count(*) from public.scholarships where active),
    'closingSoon', (select count(*) from public.scholarships where active and deadline between now() and now() + interval '14 days')
  );
end;
$$;
