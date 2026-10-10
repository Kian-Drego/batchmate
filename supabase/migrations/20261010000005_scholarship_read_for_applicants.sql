-- -----------------------------------------------------------------------------
-- Keep applications to retired (active = false) scholarships readable
-- -----------------------------------------------------------------------------
-- The "scholarships: public read" policy only exposed active rows to students.
-- A student can still hold an application to a scholarship that was later
-- hidden; embedding `scholarships(*)` from `applications` then returned NULL
-- for that row (RLS filters the embed), and pages that render
-- `application.scholarship.title` crashed into the error boundary.
--
-- Let a student keep read access to any scholarship they applied to. Hidden
-- scholarships still stay out of the catalogue and match engine because those
-- queries filter on `active = true` explicitly.
drop policy if exists "scholarships: public read" on public.scholarships;

create policy "scholarships: public read" on public.scholarships
  for select
  to anon, authenticated
  using (
    (active = true)
    or (select public.is_admin())
    or exists (
      select 1
      from public.applications a
      where a.scholarship_id = public.scholarships.id
        and a.user_id = (select auth.uid())
    )
  );
