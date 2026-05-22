-- ============================================================================
-- Migration: Fix UNIQUE constraint on boq_drafts table
-- ============================================================================
-- The previous migration dropped the old constraint but the new constraint
-- for (company_id, user_id, boq_id) may not have been applied correctly.
-- This migration ensures the constraint exists and works properly.
--
-- Issue: Multiple draft rows being created instead of updating existing draft
-- Root Cause: Missing UNIQUE constraint allows INSERT instead of UPDATE in upsert

BEGIN TRANSACTION;

-- First, check if the constraint exists and drop it if it does
ALTER TABLE boq_drafts 
DROP CONSTRAINT IF EXISTS boq_drafts_company_user_boq_unique;

-- Re-create the UNIQUE constraint on (company_id, user_id, boq_id)
-- This ensures:
-- - Only ONE draft per user per company for creating new BOQs (boq_id=NULL)
-- - Only ONE draft per user per BOQ being edited (boq_id=specific_id)
ALTER TABLE boq_drafts 
ADD CONSTRAINT boq_drafts_company_user_boq_unique UNIQUE(company_id, user_id, boq_id);

-- Create index for efficient upsert operations
CREATE INDEX IF NOT EXISTS idx_boq_drafts_upsert_check 
ON boq_drafts(company_id, user_id, boq_id);

-- Verification query (should show only one row per user per company)
-- SELECT company_id, user_id, boq_id, COUNT(*) as draft_count
-- FROM boq_drafts
-- GROUP BY company_id, user_id, boq_id
-- HAVING COUNT(*) > 1;

COMMIT;
