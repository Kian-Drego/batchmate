-- =============================================================================
-- One document per type per user.
--
-- Before this rule the UI let a student upload a second file for a type they
-- already had (e.g. re-uploading after a rejection without deleting the old
-- copy), which left several rows for the same (user_id, type).
--
-- A plain UNIQUE index is not used because rows created before this rule already
-- contain duplicates and we must not destroy those documents. Instead the
-- existing BEFORE INSERT trigger gains a guard that rejects any *new* duplicate
-- with a message the client shows verbatim. Combined with the client-side
-- pre-check this keeps a single active document of each type going forward.
-- =============================================================================

create or replace function public.passport_documents_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
      from public.passport_documents d
     where d.user_id = new.user_id
       and d.type = new.type
  ) then
    raise exception 'This document has already been uploaded. Please delete the document and try again.'
      using errcode = '23505';
  end if;

  -- A re-uploaded document always starts fresh.
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
