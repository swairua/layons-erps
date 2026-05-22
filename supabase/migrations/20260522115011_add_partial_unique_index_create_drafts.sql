-- Fix CREATE draft uniqueness by adding a partial unique index
-- This ensures only one create draft (boq_id IS NULL) exists per user/company
-- Edit drafts (boq_id IS NOT NULL) are unaffected by this constraint

CREATE UNIQUE INDEX idx_boq_drafts_create_draft_unique 
ON boq_drafts (company_id, user_id) 
WHERE boq_id IS NULL;

-- Add a comment explaining the purpose
COMMENT ON INDEX idx_boq_drafts_create_draft_unique IS 
'Enforces exactly one create draft per user per company. Only applies when boq_id IS NULL.';
