-- Migration: Add approval workflow and cost tracking to LCL BOQ
-- Date: 2025-06-13
-- Purpose: Implement approval workflow, cost breakdown, and audit trail for LCL BOQ

-- Add approval workflow columns
ALTER TABLE lcl_boqs
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Add lock mechanism for preventing concurrent edits after approval
ALTER TABLE lcl_boqs
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMPTZ;

-- Add financial tracking columns
ALTER TABLE lcl_boqs
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(50) CHECK (discount_type IN ('percentage', 'fixed', NULL)),
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_type VARCHAR(50) DEFAULT 'VAT' CHECK (tax_type IN ('VAT', 'GST', 'Sales Tax', 'Other', 'None')),
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2);

-- Add revision and audit tracking
ALTER TABLE lcl_boqs
ADD COLUMN IF NOT EXISTS revision_number INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES lcl_boqs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add invoice conversion tracking
ALTER TABLE lcl_boqs
ADD COLUMN IF NOT EXISTS converted_to_invoice_id UUID,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Enhance items_snapshot to include cost breakdown data
-- This JSONB now can include margin and cost category breakdown per item
-- Example: {items: [{...item..., margin_percentage: 20, material_cost: X, labor_cost: Y}]}

-- Add columns for items validation state
ALTER TABLE lcl_boqs
ADD COLUMN IF NOT EXISTS items_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS validation_errors JSONB;

-- Create indexes for approval queries
CREATE INDEX IF NOT EXISTS idx_lcl_boqs_approval_status 
  ON lcl_boqs(company_id, approval_status);

CREATE INDEX IF NOT EXISTS idx_lcl_boqs_approved_by 
  ON lcl_boqs(approved_by);

-- Create indexes for revision tracking
CREATE INDEX IF NOT EXISTS idx_lcl_boqs_revision_number 
  ON lcl_boqs(company_id, revision_number DESC);

CREATE INDEX IF NOT EXISTS idx_lcl_boqs_previous_version_id 
  ON lcl_boqs(previous_version_id);

-- Create indexes for lock tracking
CREATE INDEX IF NOT EXISTS idx_lcl_boqs_locked_by 
  ON lcl_boqs(locked_by) WHERE locked_by IS NOT NULL;

-- Create indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_lcl_boqs_updated_by 
  ON lcl_boqs(updated_by);

-- Create indexes for conversion tracking
CREATE INDEX IF NOT EXISTS idx_lcl_boqs_converted_to_invoice 
  ON lcl_boqs(converted_to_invoice_id);

-- Add comments documenting the new fields
COMMENT ON COLUMN lcl_boqs.approval_status IS 
  'Approval workflow state: pending (awaiting review), approved (ready for conversion), rejected (failed approval), needs_revision (requested changes)';

COMMENT ON COLUMN lcl_boqs.approved_by IS 
  'User ID of approver (null if not yet approved)';

COMMENT ON COLUMN lcl_boqs.approval_date IS 
  'Timestamp of approval decision';

COMMENT ON COLUMN lcl_boqs.approval_notes IS 
  'Comments from approver regarding approval decision or required revisions';

COMMENT ON COLUMN lcl_boqs.locked_by IS 
  'User ID who locked this BOQ to prevent editing (null if unlocked)';

COMMENT ON COLUMN lcl_boqs.lock_expires_at IS 
  'Timestamp when lock expires (auto-unlock mechanism for abandoned locks)';

COMMENT ON COLUMN lcl_boqs.subtotal IS 
  'Sum of all (item quantity × item unit_price) before discounts and tax';

COMMENT ON COLUMN lcl_boqs.discount_type IS 
  'Discount calculation method: percentage (0-100) or fixed amount';

COMMENT ON COLUMN lcl_boqs.discount_value IS 
  'Discount percentage (if discount_type=percentage) or fixed amount (if discount_type=fixed)';

COMMENT ON COLUMN lcl_boqs.discount_amount IS 
  'Calculated discount amount applied to subtotal';

COMMENT ON COLUMN lcl_boqs.tax_type IS 
  'Type of tax: VAT, GST, Sales Tax, Other, or None';

COMMENT ON COLUMN lcl_boqs.tax_amount IS 
  'Calculated tax amount based on (subtotal - discount) × tax_rate';

COMMENT ON COLUMN lcl_boqs.total_amount IS 
  'Final BOQ total: (subtotal - discount_amount) + tax_amount';

COMMENT ON COLUMN lcl_boqs.revision_number IS 
  'Sequential version number starting at 1, incremented when major changes occur';

COMMENT ON COLUMN lcl_boqs.previous_version_id IS 
  'Reference to prior version if this is a revision for audit trail';

COMMENT ON COLUMN lcl_boqs.updated_by IS 
  'User ID who last updated this BOQ (for audit trail)';

COMMENT ON COLUMN lcl_boqs.items_validated IS 
  'Flag indicating whether items_snapshot has been validated for consistency';

COMMENT ON COLUMN lcl_boqs.validation_errors IS 
  'JSONB array of validation errors found during items_snapshot validation';
