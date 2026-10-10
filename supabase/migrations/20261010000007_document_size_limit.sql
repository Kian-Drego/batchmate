-- =============================================================================
-- Cap document uploads at 500 KB.
--
-- The client rejects files larger than 500 KB with a friendly message, and the
-- private `documents` bucket enforces the same ceiling server-side so a direct
-- upload cannot bypass it. Only new uploads are affected: files already stored
-- above the old 10 MB limit are left untouched (tightening the table check
-- would make future updates to those rows fail).
--
-- 500 KB = 500 * 1024 = 512000 bytes.
-- =============================================================================

update storage.buckets
   set file_size_limit = 512000
 where id = 'documents';
