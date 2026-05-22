import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface BOQSaveIndicatorProps {
  isSaving: boolean;
  lastSavedTime: string | null;
  hasUnsavedChanges: boolean;
}

export function BOQSaveIndicator({
  isSaving,
  lastSavedTime,
  hasUnsavedChanges,
}: BOQSaveIndicatorProps) {
  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <AlertCircle className="h-4 w-4" />
        <span>Unsaved changes</span>
      </div>
    );
  }

  if (lastSavedTime) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>Saved at {lastSavedTime}</span>
      </div>
    );
  }

  return null;
}
