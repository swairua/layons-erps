-- LCL Template Schema
-- Supports nested sections > subsections > items structure

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- TABLE: lcl_template_structures
-- =========================================================

CREATE TABLE IF NOT EXISTS lcl_template_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  company_id UUID NOT NULL
    REFERENCES companies(id)
    ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,

  description TEXT,

  structure_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- TABLE: lcl_template_items
-- =========================================================

CREATE TABLE IF NOT EXISTS lcl_template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  company_id UUID NOT NULL
    REFERENCES companies(id)
    ON DELETE CASCADE,

  structure_id UUID
    REFERENCES lcl_template_structures(id)
    ON DELETE CASCADE,

  -- Hierarchical identifiers
  section_id TEXT NOT NULL,

  subsection_id TEXT NOT NULL,

  -- Item details
  item_number VARCHAR(50),

  description TEXT NOT NULL,

  unit TEXT DEFAULT 'Item',

  default_qty NUMERIC(12,2),

  default_rate NUMERIC(12,2),

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- TABLE: lcl_template_history
-- =========================================================

CREATE TABLE IF NOT EXISTS lcl_template_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  company_id UUID NOT NULL
    REFERENCES companies(id)
    ON DELETE CASCADE,

  structure_id UUID
    REFERENCES lcl_template_structures(id)
    ON DELETE CASCADE,

  action VARCHAR(50) NOT NULL,

  changed_by TEXT,

  changed_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_lcl_template_structures_company
ON lcl_template_structures(company_id);

CREATE INDEX IF NOT EXISTS idx_lcl_template_items_company
ON lcl_template_items(company_id);

CREATE INDEX IF NOT EXISTS idx_lcl_template_items_structure
ON lcl_template_items(structure_id);

CREATE INDEX IF NOT EXISTS idx_lcl_template_items_section_subsection
ON lcl_template_items(section_id, subsection_id);

CREATE INDEX IF NOT EXISTS idx_lcl_template_history_company
ON lcl_template_history(company_id);

CREATE INDEX IF NOT EXISTS idx_lcl_template_history_structure
ON lcl_template_history(structure_id);

-- =========================================================
-- ENABLE RLS
-- =========================================================

ALTER TABLE lcl_template_structures ENABLE ROW LEVEL SECURITY;

ALTER TABLE lcl_template_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE lcl_template_history ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- DROP OLD POLICIES
-- =========================================================

DROP POLICY IF EXISTS lcl_template_structures_company_policy
ON lcl_template_structures;

DROP POLICY IF EXISTS lcl_template_items_company_policy
ON lcl_template_items;

DROP POLICY IF EXISTS lcl_template_history_company_policy
ON lcl_template_history;

-- =========================================================
-- DEVELOPMENT POLICIES (ALLOW ALL)
-- Replace later with secure company membership logic
-- =========================================================

CREATE POLICY lcl_template_structures_company_policy
ON lcl_template_structures
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY lcl_template_items_company_policy
ON lcl_template_items
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY lcl_template_history_company_policy
ON lcl_template_history
FOR ALL
USING (true)
WITH CHECK (true);
