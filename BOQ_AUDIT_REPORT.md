# BOQ Database Schema Audit Report

**Date**: June 2024
**Audit Scope**: BOQ and BOQ Drafts tables implementation
**Status**: Analysis Complete

## Executive Summary

The BOQ implementation has **PARTIAL alignment** with the database schema. The Supabase types match the database schema perfectly, but there are critical data handling gaps in the create, edit, and draft flows where several schema fields are either:
1. Not captured in forms
2. Not properly persisted to database
3. Not loaded from database when editing
4. Hardcoded to defaults instead of user input

---

## Schema Field Mapping Audit

### BOQ Table (boqs)

| Field | Type | Nullable | Create Form | Edit Form | Draft Service | Load on Edit | Issue |
|-------|------|----------|------------|-----------|---------------|--------------|-------|
| `id` | uuid | NO | ✓ Auto | ✓ Loaded | N/A | N/A | None |
| `company_id` | uuid | YES | ✓ Set | ✓ Set | ✓ Set | ✓ Loaded | None |
| `number` | varchar | NO | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `boq_date` | date | NO | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `client_name` | text | NO | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `client_email` | text | YES | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `client_phone` | text | YES | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `client_address` | text | YES | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `client_city` | text | YES | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `client_country` | text | YES | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `contractor` | text | YES | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `project_title` | text | YES | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `currency` | varchar | YES | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `subtotal` | numeric | YES | ✓ Calc | ✓ Calc | ✓ Calc | ✓ Loaded | **HARDCODED to 0 in draft** |
| `tax_amount` | numeric | YES | ✗ Hardcoded | ✗ Hardcoded | ✗ Hardcoded | ✗ Hardcoded | **Always 0, never user-configurable** |
| `total_amount` | numeric | NO | ✓ Calc | ✓ Calc | ✓ Calc | ✓ Loaded | Calculated correctly |
| `attachment_url` | text | YES | ✗ Not Captured | ✗ Not Editable | ✗ Not Captured | N/A | **MISSING** |
| `data` | jsonb | YES | ✓ Set | ✓ Set | ✓ Set | ✓ Loaded | None (sections, notes stored here) |
| `created_by` | uuid | YES | ✓ Set | ✓ Loaded | ✗ Not Captured | ✓ Loaded | **Not updated in edit; not in draft** |
| `created_at` | timestamp | YES | ✓ Auto | ✓ Loaded | ✓ Auto | ✓ Loaded | None |
| `updated_at` | timestamp | YES | ✓ Auto | ✓ Updated | ✓ Auto | ✓ Loaded | None |
| `status` | varchar | YES | ✗ Not Set | ✗ Not Editable | ✗ Not Captured | N/A | **MISSING - No status lifecycle** |
| `converted_to_invoice_id` | uuid | YES | N/A | N/A | N/A | N/A | Conversion logic handled separately |
| `converted_at` | timestamp | YES | N/A | N/A | N/A | N/A | Conversion logic handled separately |
| `due_date` | date | YES | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `terms_and_conditions` | text | YES | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |
| `showCalculatedValuesInTerms` | boolean | YES | ✓ Form | ✓ Loaded | ✓ Draft | ✓ Loaded | None |

### Critical Issues Found

#### **ISSUE #1: Tax Amount Never User-Configurable**
- **Location**: CreateBOQModal.tsx:611, EditBOQModal.tsx:188, boqAutoSaveService.ts:93
- **Problem**: `tax_amount` is hardcoded to `0` in all flows. No form field exists to input tax.
- **Impact**: BOQ cannot capture tax information; total always equals subtotal.
- **Required Fix**: 
  - Add tax input field to CreateBOQModal
  - Add tax input field to EditBOQModal
  - Update draft save to capture tax_amount from form
  - Update boqAutoSaveService.ts to accept and save taxAmount

#### **ISSUE #2: Attachment URL Not Captured**
- **Location**: CreateBOQModal.tsx:613 (hardcoded to null)
- **Problem**: No form field to upload or input attachment URL. Always saved as null.
- **Impact**: BOQ attachments cannot be managed through UI.
- **Required Fix**:
  - Add file upload/URL input field to CreateBOQModal
  - Add file upload/URL input field to EditBOQModal
  - Update draft service to capture and persist attachment_url
  - Display attachment URL when loading BOQ

#### **ISSUE #3: Status Field Never Set**
- **Location**: CreateBOQModal.tsx (not set), EditBOQModal.tsx (not set)
- **Problem**: BOQ `status` column is never populated. No status lifecycle management.
- **Impact**: Cannot track BOQ states (draft, pending, approved, converted, etc.).
- **Required Fix**:
  - Define status enum/constants (draft, pending, approved, converted, archived)
  - Set initial status='draft' on create
  - Add ability to change status on edit
  - Update BOQ list to display status

#### **ISSUE #4: Created By Not Captured in Edit/Draft**
- **Location**: EditBOQModal.tsx (not in draft save), boqAutoSaveService.ts (not captured)
- **Problem**: `created_by` is set on initial creation but not preserved in drafts.
- **Impact**: Edit drafts cannot recover creator information if session restarted.
- **Required Fix**:
  - Pass created_by to draft save in edit flow
  - Load created_by from original BOQ when editing

#### **ISSUE #5: Tax Amount Not Synced Between Create Draft and Save**
- **Location**: boqAutoSaveService.ts:93
- **Problem**: Draft is saved with `tax_amount: 0` but when publishing, tax isn't recalculated.
- **Impact**: Even if user calculates tax manually, it's not recovered from draft.
- **Required Fix**:
  - Update draft payload interface to include taxAmount
  - Ensure tax is captured in draft save
  - Calculate/recover tax_amount when loading for resume

---

## Field Usage Summary

### Fully Implemented ✓ (17 fields)
- id, company_id, number, boq_date, client_name, client_email, client_phone
- client_address, client_city, client_country, contractor, project_title
- currency, total_amount, data, created_at, updated_at, due_date
- terms_and_conditions, showCalculatedValuesInTerms

### Partial Issues (4 fields)
- `subtotal`: Calculated correctly but draft hardcodes to 0
- `tax_amount`: Never user-input, always 0
- `created_by`: Not included in edit drafts
- `status`: Never set or managed

### Not Implemented ✗ (2 fields)
- `attachment_url`: Never captured or persisted
- (status lifecycle not defined)

---

## Create BOQ Modal (`CreateBOQModal.tsx`)

### Fields Captured
- BOQ number, date, due date ✓
- Client (via selector) + all contact fields ✓
- Project title, contractor ✓
- Currency ✓
- Terms and conditions ✓
- Show calculated values flag ✓
- Sections data (items, quantities, rates) ✓
- Notes ✓
- created_by (set from auth profile) ✓

### Missing Captures
- **Tax Amount**: No form field, always 0
- **Attachment URL**: Not captured, always null
- **Status**: Not set, defaults to null
- **Subtotal/Total**: Calculated from items but could be lost if draft corrupted

### Payload at Save (line 596-618)
```
company_id ✓
number ✓
boq_date ✓
due_date ✓
client_name ✓
client_email ✓
client_phone ✓
client_address ✓
client_city ✓
client_country ✓
contractor ✓
project_title ✓
currency ✓
subtotal ✓ (calculated)
tax_amount ✗ (hardcoded to 0)
total_amount ✓ (calculated)
attachment_url ✗ (hardcoded to null)
data ✓ (includes sections, notes)
termsAndConditions ✓
showCalculatedValuesInTerms ✓
created_by ✓
(status missing)
(converted_to_invoice_id not applicable)
(converted_at not applicable)
```

---

## Edit BOQ Modal (`EditBOQModal.tsx`)

### Fields Loaded from BOQ (line 288-326 approximately)
- ✓ All basic fields (number, date, due_date)
- ✓ Client and contact details
- ✓ Project title, contractor
- ✓ Currency, sections, notes
- ✓ Terms and conditions
- ✓ Show calculated values flag

### Edit Limitations
- **Cannot edit created_by**: Loaded but immutable (by design - correct)
- **Cannot upload/edit attachment_url**: Field not shown in form
- **Cannot edit status**: No status field in form
- **Cannot edit tax_amount**: Always recalculated as 0

### Autosave Payload (line 173-212)
Same issues as Create:
- `tax_amount`: Hardcoded to 0 (line 188)
- `attachment_url`: Never touched
- `status`: Never set
- `created_by`: Not included in draft (line 214 saveEditingDraft)

---

## Draft Service (`boqAutoSaveService.ts`)

### BOQDraftData Interface (line 3-24)
```typescript
export interface BOQDraftData {
  boqNumber ✓
  boqDate ✓
  dueDate ✓
  clientId ✓
  customerName? ✓
  customerEmail? ✓
  customerPhone? ✓
  customerAddress? ✓
  customerCity? ✓
  customerCountry? ✓
  projectTitle ✓
  contractor ✓
  notes ✓
  termsAndConditions ✓
  showCalculatedValuesInTerms ✓
  currency ✓
  sections ✓
  subtotal? ✓ (included)
  taxAmount? ✗ (should be included but isn't)
  totalAmount? ✓ (included)
}
```

### Save Payload Construction (line 75-103)
- Line 93: `tax_amount: formData.taxAmount || 0` — Falls back to 0 because taxAmount never in formData
- Line 94: `total_amount: formData.totalAmount || 0` — Better, but should validate
- Line 99: `data: { sections, notes }` — Correctly nests in JSONB
- Missing: No `status` field in payload
- Missing: No `created_by` preservation in edit flow
- Missing: No `attachment_url` in payload

---

## BOQ to Invoice Conversion (`useBOQ.ts`)

### Fields Retrieved from BOQ (line 111-130)
- Uses `boq.data` to extract sections and items ✓
- Extracts client from `boq.data.client` or creates new customer ✓

### Conversion Fields NOT Checked
- Does not verify `tax_amount` before creating invoice
- Does not capture or link `attachment_url` to invoice
- Does not check `status` (e.g., cannot prevent conversion of archived BOQs)
- Does not use `due_date` for invoice due date mapping
- Does not use `created_by` to track converter/owner

### Conversion Updates (post-conversion)
- Updates `converted_to_invoice_id` ✓
- Updates `converted_at` ✓
- Likely updates `status` (should be 'converted') — **Need to verify**

---

## BOQ Data Transformation (`boqHelper.ts`, `boqPdfGenerator.ts`)

### createPercentageCopy() Issues (line 22-56)
- **Line 44-46**: Correctly copies subtotal, tax_amount, total_amount
- **Missing**: Does not copy attachment_url
- **Missing**: Does not copy created_by
- **Missing**: Does not copy status
- **Missing**: Does not copy due_date, terms_and_conditions explicitly (but may be in data)

### PDF Generation
- Extracts from `boq.data.sections` ✓
- Includes notes ✓
- **Missing**: Does not render tax_amount in PDF
- **Missing**: Does not render attachment_url in PDF
- **Missing**: Does not render status in PDF

---

## Supabase Types Validation (`types.ts`)

### BOQ Row Type (line 71-100) ✓ MATCHES SCHEMA
- All 27 fields present with correct types
- Nullable flags match schema
- Insert/Update types properly allow optional fields

### BOQ Drafts Type
- Need to verify boq_drafts table type definition
- Should mirror boqs table structure

---

## Validation & Constraints

### Required Fields (NOT NULL in schema)
- `id`: ✓ Auto-generated
- `number`: ✓ Validated in form (line 505)
- `boq_date`: ✓ Validated in form (line 505)
- `client_name`: ✓ Validated in form (line 504)
- `total_amount`: ✓ Calculated, always set

### Optional Fields (Nullable in schema)
- All contact/detail fields: ✓ Properly optional
- Financial fields: ✗ tax_amount always 0, not truly optional
- attachment_url: ✗ Always null, not optional to user
- status: ✗ Never set, not truly optional

---

## Recommendations by Priority

### HIGH PRIORITY (Data Loss Risk)
1. **Add Tax Amount Field** - Enable user to input tax on BOQ creation and edit
2. **Add Status Lifecycle** - Implement status field (draft, pending, approved, converted, archived)
3. **Add Attachment URL Support** - Allow users to upload or link BOQ attachments
4. **Preserve created_by in Drafts** - Ensure creator info survives draft recovery

### MEDIUM PRIORITY (Data Completeness)
5. **Sync Financial Fields Correctly** - Ensure subtotal/tax/total round-trip correctly through drafts
6. **Update PDF Export** - Include tax, attachment reference, and status in PDF
7. **Update Percentage Copy** - Preserve all non-financial fields (attachment_url, status, etc.)
8. **Document Status Enum** - Define valid status values and transitions

### LOW PRIORITY (Code Quality)
9. **Add Validation for Numeric Fields** - Ensure subtotal/tax/total are valid decimals
10. **Add Audit Trail** - Track when status changes, conversions occur
11. **Improve Type Safety** - Create explicit interfaces for BOQ financial data

---

## Testing Scenarios

### Create → Save Round-Trip
1. [ ] Create BOQ with tax amount
2. [ ] Verify tax_amount saved to database
3. [ ] Load BOQ and verify tax displayed
4. [ ] Edit and change tax amount
5. [ ] Verify tax_amount updated correctly

### Draft Recovery
1. [ ] Create BOQ draft with tax amount
2. [ ] Abandon modal without saving
3. [ ] Reopen modal
4. [ ] Verify tax amount recovered from draft
5. [ ] Complete save and verify tax persisted

### Conversion with Tax
1. [ ] Create BOQ with subtotal=100, tax=15, total=115
2. [ ] Convert to invoice
3. [ ] Verify invoice created with correct amounts
4. [ ] Verify BOQ status updated to 'converted'

### Attachment Management
1. [ ] Create BOQ with attachment URL
2. [ ] Save and verify attachment_url in database
3. [ ] Edit BOQ and change attachment
4. [ ] Verify updated attachment_url persisted
5. [ ] PDF export includes attachment reference

---

## Files Requiring Modification

### Core Forms
- [ ] `src/components/boq/CreateBOQModal.tsx` — Add tax, attachment, status fields
- [ ] `src/components/boq/EditBOQModal.tsx` — Add tax, attachment, status fields

### Draft System
- [ ] `src/services/boqAutoSaveService.ts` — Add taxAmount to interface, update payload

### Conversion & Transformation
- [ ] `src/hooks/useBOQ.ts` — Verify status update on conversion
- [ ] `src/utils/boqHelper.ts` — Preserve all fields in percentage copy
- [ ] `src/utils/boqPdfGenerator.ts` — Include tax and attachment in PDF

### Database Types
- [ ] `src/integrations/supabase/types.ts` — Verify types match (currently OK)

---

## Conclusion

The BOQ implementation has **strong coverage** of the core fields (client, project, items) but has **critical gaps** in secondary fields (tax, attachments, status). The schema is well-designed, but the UI and service layer haven't caught up with all fields.

**Priority**: Implement tax and status management first, as these are fundamental to financial accuracy and BOQ lifecycle management.
