-- =============================================================================
-- Trim education levels.
--
-- School-year levels (Class 10/11/12) and Diploma are removed from the degree
-- reference list. The passport now captures 'Other' with a free-text detail
-- column (degree_other), and current-year-of-study choices stay within the
-- existing '1st Year'..'5th Year' set.
--
-- Keep in sync with supabase/functions/_shared/constants.ts (see CLAUDE.md).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Reference lists — degree is the only list that changes.
-- ---------------------------------------------------------------------------
create or replace function public.ref_values(kind text)
returns text[]
language sql
immutable
as $$
  select case kind
    when 'category' then array['General','OBC','SC','ST','EWS','Minority','Other']
    when 'gender' then array['Male','Female','Other','Prefer not to say']
    when 'degree' then array['Undergraduate','Postgraduate','Professional (MBBS/BTech/LLB)','Doctorate','Other']
    when 'income' then array['Below 100000','100000-250000','250000-500000','500000-800000','800000-1200000','Above 1200000']
    when 'document' then array['Income Certificate','Class 10 Marksheet','Class 12 Marksheet','Category Certificate','Domicile Proof','Disability Certificate','Bonafide / Enrolment Certificate','Bank Passbook','Entrance Exam Scorecard','Photograph','Signature','Other']
    when 'app_status' then array['Not Started','In Progress','Submitted','Verification Pending','Awarded','Rejected']
    when 'scholarship_type' then array['Government','State Government','Corporate CSR','Foundation','Merit-Based','Need-Based','Minority']
    when 'state' then array['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh','Andaman and Nicobar Islands','Dadra and Nagar Haveli and Daman and Diu','Lakshadweep','All India']
  end
$$;

-- ---------------------------------------------------------------------------
-- 2. Passports: free-text detail for the 'Other' level.
-- ---------------------------------------------------------------------------
alter table public.passports
  add column degree_other text check (char_length(degree_other) <= 80);

-- Rows holding a removed level can no longer pass the degree check on their
-- next update; migrate them to 'Other' and preserve the original value as the
-- free-text detail so nothing is silently lost.
update public.passports
   set degree = 'Other',
       degree_other = degree
 where degree in ('Class 10', 'Class 11', 'Class 12', 'Diploma');

-- Column-level grant mirrors the one in 20261009000001_core_schema.sql so the
-- client can write degree_other directly (the base revoke applies table-wide).
grant update (degree_other) on public.passports to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Scholarships: drop removed levels from eligibility arrays.
-- ---------------------------------------------------------------------------
update public.scholarships
   set degree = array(
         select d
           from unnest(degree) as d
          where d = any (public.ref_values('degree'))
       )
 where degree && array['Class 10', 'Class 11', 'Class 12', 'Diploma'];

-- The two school-only schemes (Class 9–12) now have an empty degree list and no
-- user can select those levels, so retire them instead of surfacing them as
-- "open to all". They stay in the table for audit/history, just inactive.
update public.scholarships
   set active = false,
       updated_at = now()
 where degree = '{}'
   and title in (
     'Begum Hazrat Mahal National Scholarship',
     'National Means-cum-Merit Scholarship (NMMS)'
   );
