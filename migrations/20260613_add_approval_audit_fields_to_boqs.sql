-- Migration: Add approval, audit, and revision tracking to Standard BOQ
-- Date: 2025-06-13
-- Purpose: Implement approval workflow, revision history, and audit trail for Standard BOQ

-- Add approval and audit tracking columns
ALTER TABLE boqs
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending' 
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add revision tracking columns
ALTER TABLE boqs
ADD COLUMN IF NOT EXISTS revision_number INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES boqs(id) ON DELETE SET NULL;

-- Add lock mechanism for preventing concurrent edits
ALTER TABLE boqs
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMPTZ;

-- Add tax and discount tracking columns
ALTER TABLE boqs
ADD COLUMN IF NOT EXISTS tax_type VARCHAR(50) DEFAULT 'VAT' 
  CHECK (tax_type IN ('VAT', 'GST', 'Sales Tax', 'Other', 'None')),
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(50) 
  CHECK (discount_type IN ('percentage', 'fixed', NULL)),
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0;

-- Update boq_drafts table with corresponding audit fields
ALTER TABLE boq_drafts
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS tax_type VARCHAR(50) DEFAULT 'VAT',
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(15,2) DEFAULT 0;

-- Create index for approval queries
CREATE INDEX IF NOT EXISTS idx_boqs_approval_status 
  ON boqs(company_id, approval_status);

CREATE INDEX IF NOT EXISTS idx_boqs_approved_by 
  ON boqs(approved_by);

-- Create index for revision history queries
CREATE INDEX IF NOT EXISTS idx_boqs_revision_number 
  ON boqs(company_id, revision_number DESC);

CREATE INDEX IF NOT EXISTS idx_boqs_previous_version_id 
  ON boqs(previous_version_id);

-- Create index for lock queries
CREATE INDEX IF NOT EXISTS idx_boqs_locked_by 
  ON boqs(locked_by) WHERE locked_by IS NOT NULL;

-- Create index for updated_by queries
CREATE INDEX IF NOT EXISTS idx_boqs_updated_by 
  ON boqs(updated_by);

-- Add comment documenting approval workflow
COMMENT ON COLUMN boqs.approval_status IS 
  'Approval state: pending (awaiting review), approved (ready for conversion), rejected (failed approval), needs_revision (requested changes)';

COMMENT ON COLUMN boqs.approved_by IS 
  'User ID of approver (null if not yet approved)';

COMMENT ON COLUMN boqs.approval_date IS 
  'Timestamp of approval decision';

COMMENT ON COLUMN boqs.approval_notes IS 
  'Comments from approver regarding approval decision or required revisions';

COMMENT ON COLUMN boqs.revision_number IS 
  'Sequential version number starting at 1, incremented on major changes';

COMMENT ON COLUMN boqs.previous_version_id IS 
  'Reference to prior version if this is a revision';

COMMENT ON COLUMN boqs.locked_by IS 
  'User ID who locked this BOQ (prevents editing), null if unlocked';

COMMENT ON COLUMN boqs.lock_expires_at IS 
  'Timestamp when lock expires (auto-unlock for abandoned locks)';

COMMENT ON COLUMN boqs.tax_type IS 
  'Type of tax applied: VAT, GST, Sales Tax, Other, or None';

COMMENT ON COLUMN boqs.discount_type IS 
  'Discount calculation method: percentage or fixed amount';

COMMENT ON COLUMN boqs.discount_value IS 
  'Discount percentage (0-100) or fixed amount (if discount_type is set)';

COMMENT ON COLUMN boqs.discount_amount IS 
  'Calculated discount amount for display (discount_value applied to subtotal)';
