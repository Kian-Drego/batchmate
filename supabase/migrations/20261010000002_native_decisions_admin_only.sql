-- Applications submitted through BatchMate ("native") are decided by admins.
-- Students may still self-report progress for external-portal applications.
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

  if app.mode = 'native' and p_status in ('Submitted', 'Verification Pending', 'Awarded', 'Rejected') then
    raise exception 'In-app applications are submitted with submit_application and decided by the BatchMate team'
      using errcode = '42501';
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
