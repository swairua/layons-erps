# Phase 1: BOQ Schema Audit and Gap Analysis

## Executive Summary

This document provides a comprehensive audit of the three BOQ workflow schemas (Standard, Hierarchical, LCL) as of the current implementation state. It identifies gaps in approval workflow, audit trail, revision history, and validation fields across all three types.

---

## 1. Standard BOQ Schema

### Current Implementation

**Table:** `boqs` (migrations/004_boqs.sql)

#### Columns
```sql
id UUID PRIMARY KEY
company_id UUID NOT NULL REFERENCES companies(id)
number VARCHAR(100) NOT NULL
boq_date DATE NOT NULL
client_name TEXT NOT NULL
client_email TEXT
client_phone TEXT
client_address TEXT
client_city TEXT
client_country TEXT
contractor TEXT
project_title TEXT
currency VARCHAR(3) DEFAULT 'KES'
subtotal NUMERIC(15,2)
tax_amount NUMERIC(15,2)
total_amount NUMERIC(15,2) NOT NULL
attachment_url TEXT
data JSONB (contains sections, items, notes)
created_by UUID REFERENCES profiles(id)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(company_id, number)
```

#### Status Fields (added via migrations/20250214_add_boq_status.sql)
```sql
boq_status VARCHAR(50) DEFAULT 'draft'
```

#### Additional Fields (via separate migrations)
- `due_date` (migrations/20250215_add_due_date_to_boqs.sql)
- `terms_and_conditions` (migrations/20250215_add_terms_to_boqs.sql)
- Conversion fields (migrations/011_add_boq_conversion_fields.sql)

### Supporting Tables
- `boq_drafts` - Draft autosave for in-progress BOQs
- Implicit history via `created_at`, `updated_at`

### JSONB Data Structure (src/components/boq/CreateBOQModal.tsx)
```javascript
{
  sections: [
    {
      id: string,
      name: string,
      items: [
        {
          id: string,
          description: string,
          quantity: number,
          unit: string,
          rate: number,
          amount: number // calculated: qty * rate
        }
      ]
    }
  ],
  notes: string,
  termsAndConditions: string
}
```

### Gaps Identified

| Gap | Impact | Priority |
|-----|--------|----------|
| **No approval workflow** | No formal approval tracking, approval_by/approval_date fields missing | HIGH |
| **No approval notes** | Cannot track approval decisions or feedback | MEDIUM |
| **No revision tracking** | Cannot track multiple versions or changes | MEDIUM |
| **No lock mechanism** | Concurrent edits possible, no way to prevent | MEDIUM |
| **No tax type field** | Tax calculation assumes VAT, no flexibility | LOW |
| **No discount fields** | No built-in discount tracking (percentage/fixed) | LOW |
| **Limited audit trail** | Only created_by/created_at, no update_by tracking | MEDIUM |
| **No previous version ref** | Cannot link to prior BOQ versions | MEDIUM |

### Current Workflow
1. Create draft → autosave to `boq_drafts`
2. Finalize → convert draft to `boqs` record
3. No formal approval state
4. Convert to invoice (direct, no approval gate)

---

## 2. Hierarchical BOQ Schema

### Current Implementation

**Tables:** 
- `boq_fixed_structures` (templates)
- `boq_fixed_items_v2` (line items)
- `boq_fixed_items_migration_log` (migration tracking)

#### boq_fixed_structures Columns
```sql
id UUID PRIMARY KEY
company_id UUID NOT NULL REFERENCES companies(id)
name VARCHAR(255) NOT NULL
description TEXT
structure_data JSONB (hierarchical section/subsection definition)
is_active BOOLEAN DEFAULT TRUE
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### boq_fixed_items_v2 Columns
```sql
id UUID PRIMARY KEY
company_id UUID NOT NULL REFERENCES companies(id)
structure_id UUID REFERENCES boq_fixed_structures(id)
section_id TEXT NOT NULL (e.g., "SECTION_A")
subsection_id TEXT NOT NULL (e.g., "MATERIALS")
item_number VARCHAR(50)
description TEXT NOT NULL
unit TEXT DEFAULT 'Item'
default_qty NUMERIC(12,2)
default_rate NUMERIC(12,2)
sort_order INTEGER DEFAULT 0
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### structure_data JSONB Schema
```javascript
{
  sections: [
    {
      id: string,
      name: string,
      subsections: [
        {
          id: string,
          name: string
        }
      ]
    }
  ]
}
```

### Service Layer (src/services/hierarchicalBOQService.ts)
- Methods for CRUD on structures and items
- No validation layer implemented
- No calculation logic for totals
- No conversion to invoice logic

### Gaps Identified

| Gap | Impact | Priority |
|-----|--------|----------|
| **No BOQ instance table** | Can only manage templates, not actual BOQs | CRITICAL |
| **No cost breakdown fields** | Cannot track margin, labor, materials separately | HIGH |
| **No section total calculation** | No recalculation of nested totals | HIGH |
| **No validation rules** | qty > 0, rate > 0 checks missing | MEDIUM |
| **No approval workflow** | No approval state management | HIGH |
| **No conversion to invoice** | Cannot create invoices from hierarchical BOQs | CRITICAL |
| **No autosave/draft support** | No draft persistence like Standard BOQ | MEDIUM |
| **No quantity tracking** | No way to store actual quantities used vs defaults | HIGH |
| **Missing JSONB for cost breakdown** | Cannot store margin %, labor cost, material cost | MEDIUM |

### Current Workflow
1. Create structure template (sections/subsections)
2. Add items to template
3. (No BOQ instance creation)
4. (No approval or conversion)

---

## 3. LCL BOQ Schema

### Current Implementation

**Table:** `lcl_boqs` (supabase/migrations/20250527_create_lcl_boqs_table.sql)

#### Columns
```sql
id UUID PRIMARY KEY
company_id UUID NOT NULL REFERENCES companies(id)
number TEXT NOT NULL
customer_id UUID REFERENCES customers(id) ON DELETE SET NULL
project_title TEXT
boq_date DATE DEFAULT CURRENT_DATE
items_snapshot JSONB (flattened items with qty/rate/amount)
notes TEXT
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE
created_by UUID REFERENCES auth.users(id)
status TEXT DEFAULT 'saved' -- 'draft' or 'saved'
UNIQUE(company_id, number)
```

#### items_snapshot JSONB Schema (from src/services/lclBoqService.ts)
```javascript
[
  {
    id: string,
    sectionLetter: string (A, B, C, etc.),
    itemNumber: string,
    description: string,
    quantity: number,
    rate: number,
    amount: number,
    unit: string
  }
]
```

### Supporting Components
- `lcl_template_items` - Template item definitions
- LCL Template system for reusable templates
- PDF generation utilities

### Gaps Identified

| Gap | Impact | Priority |
|-----|--------|----------|
| **No approval workflow** | No approval_by, approval_date fields | HIGH |
| **No approval notes** | Cannot document approval decisions | MEDIUM |
| **No cost tracking fields** | No margin, labor, material breakdown | MEDIUM |
| **No lock mechanism** | Can be edited after approval | MEDIUM |
| **No revision tracking** | Cannot track BOQ versions | MEDIUM |
| **Limited audit tracking** | Only created_by, no update_by | MEDIUM |
| **No validation state** | No way to mark as "validated" before approval | LOW |
| **No boq_id link** | Some records have boq_id, inconsistent | MEDIUM |

### Current Workflow
1. Create from template or manual entry
2. Save to `lcl_boqs` with status 'draft' or 'saved'
3. (No formal approval)
4. Convert to invoice via `convertLCLBOQToInvoice`

---

## 4. Cross-Cutting Concerns

### Missing Across All BOQ Types

#### Approval & Audit Tracking
- No `approved_by` field pointing to approver profile
- No `approval_date` timestamp
- No `approval_notes` text field
- No `approval_status` state management

#### Revision History
- No `revision_number` field
- No `previous_version_id` reference
- No way to compare versions
- No changelog/diff tracking

#### Locking Mechanism
- No `locked_by` field
- No `locked_at` timestamp
- Concurrent edit conflicts not prevented

#### Validation & Calculation
- No validation status field
- No calculation accuracy verification
- Missing min/max constraints
- No total recalculation triggers

#### Tax & Financial Fields
- Standard BOQ has `tax_amount` but no `tax_type` field
- No `discount_type` (percentage vs fixed)
- No `discount_value` field
- No currency validation rules

---

## 5. Data Model Consistency Issues

### Number Generation
- Standard BOQ: unique `number` per company
- Hierarchical: no BOQ instances, only templates
- LCL BOQ: unique `number` per company
- → Need consistent numbering strategy across all types

### Company Isolation
- All tables have `company_id` for multi-tenancy ✓
- RLS policies exist in LCL and Hierarchical, not all Standard columns covered

### Customer/Client Tracking
- Standard BOQ: `client_*` fields (direct entry)
- LCL BOQ: `customer_id` reference
- Hierarchical: no customer tracking
- → Inconsistent approach to customer data

### Timestamps
- Standard BOQ: `created_at`, `updated_at` TIMESTAMPTZ
- LCL BOQ: `created_at`, `updated_at` TIMESTAMP WITH TIME ZONE
- Hierarchical: `created_at`, `updated_at` TIMESTAMPTZ
- → Mixed timestamp types (minor inconsistency)

### Status Fields
- Standard BOQ: `boq_status` VARCHAR(50)
- LCL BOQ: `status` TEXT
- Hierarchical: no status field (structure/items only)
- → No standardized status enum or validation

---

## 6. Recommendations for Phase 1 Completion

### Immediate Actions

1. **Create detailed BOQ_STANDARD_MODEL.md**
   - Document all fields with their types and constraints
   - Explain JSONB structure with examples
   - Document workflow states: draft → finalized → converted
   - Identify immutable fields after approval

2. **Complete HIERARCHICAL_BOQ_IMPLEMENTATION.md**
   - Document need for BOQ instance table (separate from template)
   - Define hierarchical depth limits (sections → subsections → items)
   - Explain cost breakdown structure (margin, labor, materials)
   - Detail calculation rules for nested totals

3. **Create BOQ_LCL_TEMPLATE_MODEL.md**
   - Document items_snapshot structure with full examples
   - Explain template reuse mechanism
   - Document status transitions
   - Show JSON schema for items

4. **Create BOQ_WORKFLOWS_COMPARISON.md**
   - Side-by-side table of all three types
   - When to use each workflow
   - Data relationships and integration points
   - Field mapping across types

### Schema Standardization

1. **Define Standard Status Enum**
   ```
   draft, pending_approval, approved, converted, rejected, cancelled, archived
   ```

2. **Define Standard Approval Fields**
   - All BOQ types should have: `approved_by`, `approval_date`, `approval_notes`, `approval_status`

3. **Define Standard Revision Fields**
   - All BOQ types should support: `revision_number`, `previous_version_id`

---

## 7. Phase 1 Completion Checklist

- [x] Audit Standard BOQ schema
- [x] Audit Hierarchical BOQ schema
- [x] Audit LCL BOQ schema
- [ ] Create BOQ_STANDARD_MODEL.md with complete field documentation
- [ ] Create BOQ_LCL_TEMPLATE_MODEL.md with complete field documentation
- [ ] Update HIERARCHICAL_BOQ_IMPLEMENTATION.md with schema details
- [ ] Create BOQ_WORKFLOWS_COMPARISON.md
- [ ] Document validation rules for each type
- [ ] Document JSONB schemas with full examples
- [ ] Identify conflicting design decisions that need resolution

---

## Next Steps (Phase 2)

1. Create migration for Standard BOQ enhancements
2. Add validation fields to Hierarchical BOQ service
3. Add validation and approval fields to LCL BOQ
4. Implement cost breakdown tracking across all types
5. Standardize status management

