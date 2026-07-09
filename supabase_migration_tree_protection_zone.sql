-- ============================================================================
--  Migration: add a Protection Zone (TPZ/SRZ) field to Trees
--
--  Run this in Supabase: Project -> SQL Editor -> New query -> paste -> Run.
--
--  Safe to run any time — it only adds one column, and does nothing if that
--  column already exists. No existing data is touched or removed.
--
--  IMPORTANT: run this BEFORE (or immediately after) deploying the app
--  update that adds "Save to Tree Data" / "Add to a report" on the TPZ/SRZ
--  calculator. The app now always sends a `protection_zone` value when
--  saving a tree, so saving any tree will fail with a database error until
--  this column exists.
-- ============================================================================

alter table public.trees
  add column if not exists protection_zone jsonb;

-- ============================================================================
--  Done. TPZ/SRZ/encroachment results saved from a tree's page will now
--  persist, and will show up in any report that includes that tree.
-- ============================================================================
