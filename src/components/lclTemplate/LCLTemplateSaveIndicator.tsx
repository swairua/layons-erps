interface LCLTemplateSaveIndicatorProps {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedTime: string | null;
}

export function LCLTemplateSaveIndicator({
  isSaving,
  hasUnsavedChanges,
  lastSavedTime,
}: LCLTemplateSaveIndicatorProps) {
  if (isSaving) {
    return <span className="text-xs text-amber-600">Saving draft...</span>;
  }

  if (hasUnsavedChanges) {
    return <span className="text-xs text-orange-600">Unsaved changes</span>;
  }

  if (lastSavedTime) {
    const time = new Date(lastSavedTime).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return <span className="text-xs text-green-600">Saved at {time}</span>;
  }

  return null;
}
