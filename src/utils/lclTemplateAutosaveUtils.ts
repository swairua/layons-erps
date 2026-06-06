import { useLocalStorage } from '@/hooks/useLocalStorage';

interface InlineEdit {
  qty?: number;
  rate?: number;
}

interface AutosaveDraft {
  inlineEdits: { [itemId: string]: InlineEdit };
  lastSavedAt: string;
}

export function getLclTemplateAutosaveKey(structureId: string): string {
  return `lcl_template_draft_${structureId}`;
}

export function saveDraftToLocalStorage(
  structureId: string,
  inlineEdits: { [itemId: string]: InlineEdit }
): void {
  const { setItem } = useLocalStorage();
  const key = getLclTemplateAutosaveKey(structureId);
  const draft: AutosaveDraft = {
    inlineEdits,
    lastSavedAt: new Date().toISOString(),
  };
  setItem(key, draft);
}

export function loadDraftFromLocalStorage(
  structureId: string
): { [itemId: string]: InlineEdit } | null {
  const { getItem } = useLocalStorage();
  const key = getLclTemplateAutosaveKey(structureId);
  const draft = getItem<AutosaveDraft>(key);
  return draft ? draft.inlineEdits : null;
}

export function clearDraftFromLocalStorage(structureId: string): void {
  const { removeItem } = useLocalStorage();
  const key = getLclTemplateAutosaveKey(structureId);
  removeItem(key);
}

export function getDraftLastSavedTime(structureId: string): string | null {
  const { getItem } = useLocalStorage();
  const key = getLclTemplateAutosaveKey(structureId);
  const draft = getItem<AutosaveDraft>(key);
  return draft ? draft.lastSavedAt : null;
}
