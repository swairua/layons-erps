# BOQ Migration Deployment Checklist

This checklist ensures safe deployment of the BOQ schema enhancements across all three workflows.

---

## Pre-Deployment Verification

### Code Review
- [ ] All 3 migration files reviewed for syntax errors
- [ ] All service code reviewed for SQL injection risks
- [ ] Type definitions verified for compatibility
- [ ] No hardcoded values in migrations

### Environment Setup
- [ ] Backup current production database
- [ ] Test migrations on staging database first
- [ ] Verify Supabase connection in both environments
- [ ] Check disk space for new tables/indexes

---

## Migration Deployment Order

**CRITICAL**: Deploy in this exact order. Do not skip steps.

### Step 1: Standard BOQ Enhancement
**File**: `migrations/20260613_add_approval_audit_fields_to_boqs.sql`

**Pre-Deployment**:
- [ ] Verify existing `boqs` table has data
- [ ] Confirm `profiles` table exists for foreign keys
- [ ] Check no conflicts with existing columns

**Deployment**:
```bash
# Supabase: Run migration through web UI or CLI
supabase migration up --connection-string <production_db_url>
```

**Post-Deployment**:
- [ ] Run: `SELECT COUNT(*) FROM boqs;` - Should return existing count
- [ ] Verify new columns exist: `\d boqs` or check column list
- [ ] Check indexes: `SELECT * FROM pg_indexes WHERE tablename='boqs';`
- [ ] Sample query: `SELECT id, approval_status, approved_by FROM boqs LIMIT 5;`

**Verify All Columns Added**:
- [ ] approval_status (VARCHAR)
- [ ] approved_by (UUID)
- [ ] approval_date (TIMESTAMPTZ)
- [ ] approval_notes (TEXT)
- [ ] revision_number (INT)
- [ ] previous_version_id (UUID)
- [ ] locked_by (UUID)
- [ ] locked_at (TIMESTAMPTZ)
- [ ] lock_expires_at (TIMESTAMPTZ)
- [ ] tax_type (VARCHAR)
- [ ] discount_type (VARCHAR)
- [ ] discount_value (NUMERIC)
- [ ] discount_amount (NUMERIC)
- [ ] updated_by (UUID)

**Verify All Indexes Created**:
- [ ] idx_boqs_approval_status
- [ ] idx_boqs_approved_by
- [ ] idx_boqs_revision_number
- [ ] idx_boqs_previous_version_id
- [ ] idx_boqs_locked_by
- [ ] idx_boqs_updated_by

**Also Enhanced**:
- [ ] boq_drafts table - approval fields added
- [ ] boq_drafts table - tax/discount fields added

---

### Step 2: Hierarchical BOQ Instance & Cost Tracking
**File**: `migrations/20260613_hierarchical_boq_instances_and_cost_breakdown.sql`

**Pre-Deployment**:
- [ ] Verify `boq_fixed_structures` table exists
- [ ] Verify `boq_fixed_items_v2` table exists
- [ ] Confirm no naming conflicts with new tables

**Deployment**:
```bash
supabase migration up --connection-string <production_db_url>
```

**Post-Deployment**:
- [ ] Verify table creation: `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='public';`
- [ ] Check new tables exist:
  - [ ] boq_hierarchical_instances
  - [ ] boq_hierarchical_item_costs
  - [ ] boq_hierarchical_section_totals

**Verify New Columns in boq_fixed_items_v2**:
- [ ] material_cost_percentage
- [ ] labor_cost_percentage
- [ ] equipment_cost_percentage
- [ ] margin_percentage

**Verify boq_hierarchical_instances Table**:
- [ ] id (UUID PRIMARY KEY)
- [ ] company_id, structure_id (FKs)
- [ ] number (VARCHAR UNIQUE with company_id)
- [ ] boq_date, client_* fields
- [ ] subtotal, tax_amount, total_amount
- [ ] approval_status, approved_by, approval_date
- [ ] revision_number, previous_version_id
- [ ] locked_by, locked_at, lock_expires_at
- [ ] created_by, created_at, updated_by, updated_at
- [ ] converted_to_invoice_id, converted_at

**Verify boq_hierarchical_item_costs Table**:
- [ ] id (UUID PRIMARY KEY)
- [ ] boq_instance_id, item_id (FKs)
- [ ] quantity, unit_price, total_amount
- [ ] material_cost, labor_cost, equipment_cost
- [ ] margin_percentage, margin_amount

**Verify Indexes** (9 new indexes for performance)

---

### Step 3: LCL BOQ Enhancement
**File**: `migrations/20260613_add_approval_fields_to_lcl_boqs.sql`

**Pre-Deployment**:
- [ ] Verify `lcl_boqs` table exists and has data
- [ ] Confirm `auth.users` table exists (for foreign keys)
- [ ] Check no conflicts with existing columns

**Deployment**:
```bash
supabase migration up --connection-string <production_db_url>
```

**Post-Deployment**:
- [ ] Run: `SELECT COUNT(*) FROM lcl_boqs;` - Should match pre-deployment count
- [ ] Verify new columns exist

**Verify All Columns Added to lcl_boqs**:
- [ ] approval_status (VARCHAR)
- [ ] approved_by (UUID)
- [ ] approval_date (TIMESTAMPTZ)
- [ ] approval_notes (TEXT)
- [ ] locked_by, locked_at, lock_expires_at
- [ ] subtotal, discount_type, discount_value, discount_amount
- [ ] tax_type, tax_amount, total_amount
- [ ] revision_number, previous_version_id
- [ ] updated_by, converted_to_invoice_id, converted_at
- [ ] items_validated (BOOLEAN)
- [ ] validation_errors (JSONB)

**Verify All Indexes Created**:
- [ ] idx_lcl_boqs_approval_status
- [ ] idx_lcl_boqs_approved_by
- [ ] idx_lcl_boqs_revision_number
- [ ] idx_lcl_boqs_previous_version_id
- [ ] idx_lcl_boqs_locked_by
- [ ] idx_lcl_boqs_updated_by
- [ ] idx_lcl_boqs_converted_to_invoice

---

## Data Validation Tests

### After all migrations complete, run these verification queries:

```sql
-- Standard BOQ: Verify column defaults
SELECT approval_status, COUNT(*) as count FROM boqs GROUP BY approval_status;
-- Expected: All rows have 'pending' approval_status

-- Standard BOQ: Check revision numbers
SELECT revision_number, COUNT(*) as count FROM boqs GROUP BY revision_number;
-- Expected: All rows have 1

-- Hierarchical BOQ: Verify instance table is empty (new table)
SELECT COUNT(*) FROM boq_hierarchical_instances;
-- Expected: 0

-- Hierarchical BOQ: Verify item costs table is empty (new table)
SELECT COUNT(*) FROM boq_hierarchical_item_costs;
-- Expected: 0

-- LCL BOQ: Verify column defaults
SELECT approval_status, COUNT(*) as count FROM lcl_boqs GROUP BY approval_status;
-- Expected: All rows have 'pending' approval_status

-- LCL BOQ: Verify items_validated defaults to false
SELECT items_validated, COUNT(*) as count FROM lcl_boqs GROUP BY items_validated;
-- Expected: All rows have false

-- Check no data was lost
SELECT 'boqs' as table_name, COUNT(*) as row_count FROM boqs
UNION ALL
SELECT 'lcl_boqs', COUNT(*) FROM lcl_boqs;
-- Expected: Pre-migration row counts match
```

---

## Service Layer Deployment

### After database migrations, deploy service code:

1. **Deploy**: `src/services/hierarchicalBOQInstanceService.ts`
   - [ ] Copy file to production
   - [ ] Run TypeScript compiler: `tsc --noEmit`
   - [ ] No import errors

2. **Deploy**: `src/services/lclBoqValidationService.ts`
   - [ ] Copy file to production
   - [ ] Run TypeScript compiler: `tsc --noEmit`
   - [ ] No import errors

3. **Update Exports** (if needed):
   - [ ] Add to service index file if one exists
   - [ ] Update type definitions
   - [ ] Run build: `npm run build`

---

## UI Component Updates

### After services are deployed, update UI:

1. **FixedBOQHierarchical.tsx**
   - [ ] Import hierarchicalBOQInstanceService
   - [ ] Update create flow to use instances
   - [ ] Update item management for new costs
   - [ ] Add approval workflow UI
   - [ ] Test in browser

2. **LCLBOQList.tsx**
   - [ ] Import lclBOQValidationService
   - [ ] Add validation before save
   - [ ] Add approval workflow UI
   - [ ] Display validation errors to user
   - [ ] Test in browser

3. **BOQs.tsx (Standard)**
   - [ ] Update to use new approval fields
   - [ ] Add lock checking for edits
   - [ ] Add revision history display
   - [ ] Test in browser

---

## Smoke Tests (Manual)

### After full deployment, run these manual tests:

**Standard BOQ**:
- [ ] Create new BOQ - approval_status should be 'pending'
- [ ] Edit BOQ - updated_by should be set
- [ ] Lock BOQ for editing
- [ ] Approve BOQ - approval_date should be set
- [ ] Create revision - revision_number increments
- [ ] Convert to invoice

**Hierarchical BOQ**:
- [ ] Create new instance from structure
- [ ] Add item with cost breakdown
- [ ] Calculate totals - should match manual sum
- [ ] Approve instance
- [ ] Lock instance
- [ ] Unlock instance
- [ ] View revision history

**LCL BOQ**:
- [ ] Create BOQ from template
- [ ] Validate items_snapshot - should report errors if invalid
- [ ] Approve BOQ
- [ ] Create revision
- [ ] Calculate totals with discount/tax
- [ ] Convert to invoice

---

## Performance Checks

### After smoke tests, verify performance:

```sql
-- Check index usage
EXPLAIN ANALYZE SELECT * FROM boqs WHERE approval_status = 'pending';
-- Should use idx_boqs_approval_status

EXPLAIN ANALYZE SELECT * FROM lcl_boqs WHERE approved_by IS NOT NULL;
-- Should use idx_lcl_boqs_approved_by

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE tablename IN ('boqs', 'lcl_boqs', 'boq_hierarchical_instances')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index count
SELECT 
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE tablename IN ('boqs', 'lcl_boqs', 'boq_hierarchical_instances')
GROUP BY tablename;
```

---

## Rollback Plan (If Needed)

### If migration fails, rollback in reverse order:

```bash
# Only if deployment failed catastrophically
supabase migration down 20260613_add_approval_fields_to_lcl_boqs
supabase migration down 20260613_hierarchical_boq_instances_and_cost_breakdown
supabase migration down 20260613_add_approval_audit_fields_to_boqs

# Restore from backup
# Notify stakeholders
```

**Note**: Rollback should only be used if migrations fail during deployment. Once live, use ALTER TABLE DROP COLUMN with care.

---

## Post-Deployment Monitoring

### First 24 hours:
- [ ] Monitor database query performance
- [ ] Check for any NULL constraint violations
- [ ] Review error logs for migration issues
- [ ] Monitor UI components for errors
- [ ] Verify approval workflows work end-to-end

### First Week:
- [ ] Run ANALYZE on all modified tables
- [ ] Verify autosave still works (if applicable)
- [ ] Check revision history tracking
- [ ] Monitor lock mechanism usage
- [ ] Get user feedback on new features

---

## Success Criteria

Deployment is considered successful when:

✅ All 3 migrations complete without errors  
✅ All new columns and tables exist  
✅ All indexes are created  
✅ No data loss (row counts match)  
✅ All smoke tests pass  
✅ Services import without errors  
✅ UI components work without errors  
✅ Approval workflows function correctly  
✅ Revision tracking works  
✅ Lock mechanism prevents concurrent edits  
✅ No performance degradation  

---

## Support & Troubleshooting

### Common Issues:

**Issue**: Foreign key constraint violation
**Solution**: Verify profiles and customers tables exist and have required IDs

**Issue**: Index creation timeout
**Solution**: Increase migration timeout, run indexes separately

**Issue**: Column already exists error
**Solution**: Check if migration was partially run; may need manual cleanup

**Issue**: Service imports fail
**Solution**: Verify TypeScript paths in tsconfig.json are correct

---

**Deployed By**: _____________  
**Date Deployed**: _____________  
**Deployment Duration**: _____________  
**Approved By**: _____________  
