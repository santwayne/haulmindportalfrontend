import React from 'react';
import { History } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

interface DraftRestoreBannerProps {
  updatedAt: string;
  onRestore: () => void;
  onDiscard: () => void;
}

const DraftRestoreBanner: React.FC<DraftRestoreBannerProps> = ({ updatedAt, onRestore, onDiscard }) => (
  <div className="flex items-center justify-between gap-3 px-4 py-2.5 mb-4 rounded-lg border border-[var(--accent-amber)]/40 bg-[var(--accent-amber)]/10 text-sm">
    <div className="flex items-center gap-2 text-primary">
      <History className="w-4 h-4 text-[var(--accent-amber)] flex-shrink-0" />
      <span>
        You have unsaved changes from {formatRelativeTime(updatedAt)}.
      </span>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        onClick={onRestore}
        className="px-3 py-1 text-xs font-medium rounded-md bg-[var(--accent-amber)] text-black hover:opacity-90"
      >
        Restore
      </button>
      <button
        onClick={onDiscard}
        className="px-3 py-1 text-xs font-medium rounded-md border border-theme text-primary hover:bg-[rgba(255,255,255,0.03)]"
      >
        Discard
      </button>
    </div>
  </div>
);

export default DraftRestoreBanner;
