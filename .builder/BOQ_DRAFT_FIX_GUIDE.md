# BOQ Draft Fix - Quick Reference

## What Was Fixed
1. **Database Constraint**: Added UNIQUE constraint on `(company_id, user_id, boq_id)` to prevent duplicate drafts
2. **Draft Loading**: Now fetches the most recent draft even if duplicates exist
3. **Error Handling**: Shows user when autosave fails instead of silently failing
4. **Logging**: Added comprehensive debug logs to diagnose issues

## User-Facing Changes

### Before
- ❌ Draft was lost on page refresh
- ❌ Multiple duplicate draft rows created
- ❌ No feedback when save failed

### After
- ✅ Draft persists after page refresh
- ✅ Only 1 draft per user per company
- ✅ "Save failed" indicator appears if autosave fails
- ✅ "Saved at HH:MM" shows last successful save time

## How to Use

### Normal Workflow (No Changes Needed)
1. Open BOQ modal
2. Fill out form (autosaves every 5 seconds)
3. See "Saved at HH:MM" when save succeeds
4. Refresh page - draft loads back automatically
5. Continue editing or click "Download BOQ PDF"

### If Autosave Fails
1. Look for red "Save failed" indicator at bottom of modal
2. Try editing again - autosave will retry every 5 seconds
3. Check browser console (F12) for detailed error logs
4. If problem persists, contact support with console logs

## For Developers

### Debug Logs Location
Open browser DevTools (F12) → Console tab. You'll see logs like:
```
[loadBoqDraft] Attempting to load draft for user: abc123, company: xyz789
[loadBoqDraft] Successfully loaded draft, last saved at: 2025-05-22T10:30:00Z
[saveBoqDraft] Attempting upsert for company: xyz789, user: abc123
[saveBoqDraft] Successfully saved/updated draft with ID: draft-001
```

### Clean Duplicate Drafts (Admin Only)
If you need to remove existing duplicate drafts from the database:
```javascript
// Run in browser console with admin access
import { cleanupDuplicateDrafts } from '@/services/boqAutoSaveService';
const result = await cleanupDuplicateDrafts(userId, companyId);
console.log(`Deleted ${result.deletedCount} duplicate drafts`);
```

### Database Constraint Check
To verify the constraint is properly applied:
```sql
SELECT constraint_name, column_name 
FROM information_schema.key_column_usage 
WHERE table_name = 'boq_drafts' 
AND constraint_name LIKE '%unique%';
```

Should show:
```
boq_drafts_company_user_boq_unique | company_id
boq_drafts_company_user_boq_unique | user_id
boq_drafts_company_user_boq_unique | boq_id
```

## Implementation Details

### Files Modified
1. `migrations/20250315_fix_boq_drafts_unique_constraint.sql` - Database fix
2. `src/services/boqAutoSaveService.ts` - Enhanced load/save logic
3. `src/components/boq/CreateBOQModal.tsx` - Error state tracking
4. `src/components/boq/BOQSaveIndicator.tsx` - Error UI

### Technical Details
- **Autosave Frequency**: Every 5 seconds (debounced)
- **Unique Constraint**: On columns (company_id, user_id, boq_id)
- **Conflict Strategy**: Upsert (INSERT or UPDATE, not INSERT + INSERT)
- **Draft Scope**: One per user per company (boq_id=NULL) + one per BOQ being edited

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Draft not loading after refresh | Check console logs, verify `loadBoqDraft` is being called |
| "Save failed" keeps appearing | Check network connection, verify RLS policies allow save |
| Duplicate drafts still exist | Run `cleanupDuplicateDrafts()` in console |
| Autosave not working at all | Check browser console for errors, verify user is authenticated |

## Success Indicators
✅ Console shows `[loadBoqDraft] Successfully loaded draft...` when modal opens
✅ Console shows `[saveBoqDraft] Successfully saved/updated draft...` during editing
✅ Green "Saved at HH:MM" indicator appears after 5 seconds of no edits
✅ Draft loads back identically after page refresh
✅ No duplicate rows in boq_drafts table
