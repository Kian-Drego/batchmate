-- Catalogue records are identified by provider + title; the source URL can be
-- refreshed by the crawler without creating duplicates.
alter table public.scholarships drop constraint scholarships_official_source_url_title_key;
alter table public.scholarships add constraint scholarships_provider_title_key unique (provider, title);

-- Clients may omit user_id when registering an uploaded document.
alter table public.passport_documents alter column user_id set default auth.uid();

-- =============================================================================
-- Scheduled jobs (pg_cron -> pg_net -> `jobs` Edge Function)
--
-- Requires two Vault secrets, created out-of-band so they never live in git
-- (see scripts/setup-cron.mjs):
--   project_url  e.g. https://<ref>.supabase.co
--   cron_secret  same value as the CRON_SECRET Edge Function secret
-- =============================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_job(task text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  secret text;
begin
  select decrypted_secret into base from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if base is null or secret is null then
    raise warning 'invoke_job(%): vault secrets project_url/cron_secret missing', task;
    return null;
  end if;
  return net.http_post(
    url := base || '/functions/v1/jobs',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := jsonb_build_object('task', task),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke execute on function public.invoke_job(text) from public, anon, authenticated;

-- 00:00 IST nightly crawl; 00:45 IST retention sweep.
select cron.schedule('nightly-scrape', '30 18 * * *', $$select public.invoke_job('scrape')$$);
select cron.schedule('retention-sweep', '15 19 * * *', $$select public.invoke_job('retention')$$);
