import React, { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import type { AutoSaveStatus } from '../../customHooks/useAutoSaveDraft';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt: number | null;
}

const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ status, lastSavedAt }) => {
  // Re-render every few seconds so "Xs ago" stays fresh while the form is open.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'idle' && !lastSavedAt) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-secondary">
      {status === 'saving' ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving...</span>
        </>
      ) : lastSavedAt ? (
        <>
          <Check className="w-3 h-3 text-[var(--accent-green)]" />
          <span>Draft saved {formatRelativeTime(new Date(lastSavedAt).toISOString())}</span>
        </>
      ) : null}
    </div>
  );
};

export default AutoSaveIndicator;
