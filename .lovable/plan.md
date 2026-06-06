## Goal

1. Verify the login flow works end-to-end against the new MySQL DB.
2. Stop `/lcl-template` from silently redirecting to `/` after a few seconds.
3. Make the existing LCL section/item features actually work: section rename, delete-with-renumber, drag-reorder with auto renumber, in-section item drag, and duplicate section.

## 1. Login verification (no code changes unless broken)

- Load `/auth`, sign in with `admin@lending.com / Pass123` against `wayrusc1_lending`.
- Confirm `api.php?action=login` returns a session and the app lands on `/`.
- If login fails, report the API error and stop — do not proceed to LCL changes until auth is healthy.

## 2. Diagnose & fix the silent redirect to Dashboard on `/lcl-template`

Symptom: page loads, then a few seconds later URL becomes `/` with no toast.

Investigation steps (in order):
1. Open `/lcl-template` in the preview, capture console + network. Watch for: a failing lazy chunk that triggers the `ModuleErrorFallback`'s "Go to Home" path, or a thrown error inside `LCLBOQItemEditor` that unmounts the route.
2. Check whether `loadLCLBOQData` throws because the `LCL Default BOQ` structure is missing in MySQL — currently it only toasts, but the editor mounts with `hierarchicalData=null` and the `useEffect` in `LCLBOQItemEditor` calls `data.structure_id` on the parent's render path (a render-time crash would bubble to the error boundary).
3. Check `Sidebar`/`Header` for any `useEffect` that calls `navigate('/')` when a fetch errors (e.g. companies list empty).
4. Check the React Query default `onError` or any global interceptor in `utils/api.ts` that might do `window.location.href = '/'` on 401/500.

Likely fixes (apply whichever the diagnosis confirms):
- Guard `LCLBOQItemEditor` so it never receives a null/invalid `data` (early-return in parent already done; verify no second mount path).
- Replace any `window.location.href = '/'` on API failure with a toast — never a forced redirect.
- If the LCL Default BOQ row is missing in MySQL, surface a clear "Setup required" panel on the page with a button to create it, instead of leaving the user staring at an empty page that then bounces.

Acceptance: opening `/lcl-template` stays on `/lcl-template` indefinitely; any failure shows an inline message, never a navigation.

## 3. LCL section/item editing fixes

The editor at `src/components/lcl/LCLBOQItemEditor.tsx` already wires up all six behaviors, but they are reportedly broken. Reproduce each, then fix:

| # | Behavior | Likely bug to verify |
|---|---|---|
| 3 | Delete a middle section → remaining sections renumber A, B, C… | `confirmRemove` deletes items by `section_id` but does not relabel remaining `section_id`/`section_name` locally — only calls a server renumber. Add the same local `letterMap` relabel used in `handleSectionDrop` so the UI updates without a reload. |
| 4 | Section name is editable | `handleSaveSectionTitle` only persists when `structureId && templateStructure` are both set; on this page `templateStructure` is `undefined`, so the rename silently falls through to local-only. Make the local branch always run and persist via `lclTemplateService` when `structureId` is present. |
| 5a | Drag a section to reorder → auto-renumber | `handleSectionDrop` renumbers locally but never persists; on next load the old order returns. Persist new section order via `lclTemplateService` (new or existing `updateSectionsSortOrder` helper). |
| 5b | Drag an item inside its subsection | Already persists via `updateItemsSortOrder`; verify drop handler still fires after the section-level `draggable` was added (event may be swallowed by the parent's drag handlers — stop propagation on row drag events). |
| 6 | Duplicate a section | `handleDuplicateSection` clones in memory only and reuses subsection IDs with a regex that fails when IDs don't match `section_[a-z]`. Generate fresh subsection/item IDs, copy the subsection structure cleanly, and persist the new section via `lclTemplateService`. |

Cross-cutting:
- After any structural change (delete / reorder / duplicate / rename), call a single `renumberSectionsLocally(items)` helper that rewrites `section_id`, `subsection_id`, and `section_name` so letters are always contiguous A..N alphabetically by current position.
- Stop event propagation between row-drag and section-drag so item drags don't trigger section drags.
- Keep the existing autosave-draft path; just make sure the renumbered snapshot is what gets saved.

Acceptance:
- Delete section B of A/B/C/D → UI immediately shows A/B/C (was C/D).
- Click section title → input appears, Enter saves, reload keeps the new name.
- Drag section C above section A → order becomes C→A→B→D, then renumbers to A/B/C/D with C's content as new A; reload preserves order.
- Drag an item within its subsection → order and `item_number` update and persist.
- Click the copy icon on a section → a new trailing section appears with the next free letter and a deep copy of subsections/items; reload preserves it.

## Technical notes

- All changes stay in: `src/pages/LCLTemplate.tsx`, `src/components/lcl/LCLBOQItemEditor.tsx`, `src/services/lclTemplateService.ts`, and possibly `api.php` (only if a missing endpoint is needed for section reorder/duplicate persistence).
- No database schema migration is expected; we'll reuse existing `lcl_template_*` tables.
- No new dependencies — keep the native HTML5 drag-and-drop that's already in place.

## Out of scope

- Cross-subsection item drag.
- Replacing the drag library.
- Visual redesign of the editor.