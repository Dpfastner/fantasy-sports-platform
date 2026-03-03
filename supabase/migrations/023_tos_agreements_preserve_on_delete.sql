-- Phase 23 fix: Preserve tos_agreements when auth user is deleted
-- Privacy Policy Section 5 requires 7-year retention of consent records.
-- The original FK had ON DELETE CASCADE which would destroy consent records.

-- Step 1: Allow user_id to be nullable (deleted users become NULL)
ALTER TABLE tos_agreements ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: Drop the existing FK constraint and recreate with ON DELETE SET NULL
ALTER TABLE tos_agreements DROP CONSTRAINT IF EXISTS tos_agreements_user_id_fkey;
ALTER TABLE tos_agreements
  ADD CONSTRAINT tos_agreements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
