import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { deleteDraft, getDraft, saveDraft, type DraftEntityType } from '../axios/api/drafts';

const LOCAL_SAVE_DEBOUNCE_MS = 1000;
const REMOTE_SAVE_INTERVAL_MS = 12000;

export type AutoSaveStatus = 'idle' | 'saving' | 'saved';

export interface DraftRestoreInfo {
  formData: Record<string, unknown>;
  updatedAt: string;
  source: 'local' | 'server';
}

interface UseAutoSaveDraftOptions {
  /** One of drivers | trucks | trailers | employees */
  entityType: DraftEntityType;
  /** The record's id, or "new" for a creation-form draft */
  entityId: string;
  /** Current form state — save whenever this changes */
  formData: Record<string, unknown>;
  /** Set to false to pause autosave (e.g. while a restore banner is still unresolved) */
  enabled?: boolean;
}

/**
 * Crash/power-loss protection for create/edit forms: debounced localStorage snapshots
 * (the primary safety net — no network needed) plus a throttled backend copy so the
 * draft survives losing the browser/device entirely.
 */
export const useAutoSaveDraft = ({
  entityType,
  entityId,
  formData,
  enabled = true,
}: UseAutoSaveDraftOptions) => {
  const { userInfo } = useSelector((state: RootState) => state.userAuth);
  const userId = userInfo?.userData?._id || 'anonymous';
  const storageKey = `draft:${entityType}:${entityId}:${userId}`;

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [pendingRestore, setPendingRestore] = useState<DraftRestoreInfo | null>(null);

  const hasCheckedRef = useRef(false);
  const isFirstChangeRef = useRef(true);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const saveLocal = useCallback(
    (data: Record<string, unknown>) => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ formData: data, updatedAt: new Date().toISOString() })
        );
      } catch {
        // localStorage full/unavailable — best effort only, backend copy still applies
      }
    },
    [storageKey]
  );

  const saveRemote = useCallback(
    async (data: Record<string, unknown>) => {
      setStatus('saving');
      try {
        const res = await saveDraft(entityType, entityId, data);
        if (res?.success === false) {
          setStatus('idle');
          return;
        }
        setLastSavedAt(Date.now());
        setStatus('saved');
      } catch {
        setStatus('idle');
      }
    },
    [entityType, entityId]
  );

  // Check localStorage and the server for an existing draft once on mount; newest wins.
  useEffect(() => {
    if (!enabled || hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    let cancelled = false;

    (async () => {
      let local: DraftRestoreInfo | null = null;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.formData && parsed?.updatedAt) {
            local = { formData: parsed.formData, updatedAt: parsed.updatedAt, source: 'local' };
          }
        }
      } catch {
        // corrupt local draft — ignore
      }

      let server: DraftRestoreInfo | null = null;
      try {
        const res = await getDraft(entityType, entityId);
        if (res?.success !== false && res?.draft?.formData) {
          server = { formData: res.draft.formData, updatedAt: res.draft.updatedAt, source: 'server' };
        }
      } catch {
        // unreachable — fall back to local only
      }

      if (cancelled) return;

      let winner: DraftRestoreInfo | null = null;
      if (local && server) {
        winner = new Date(server.updatedAt).getTime() > new Date(local.updatedAt).getTime() ? server : local;
      } else {
        winner = local || server;
      }
      if (winner) setPendingRestore(winner);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, entityType, entityId, storageKey]);

  // Debounced local save on every form change (skips the initial mount and while a
  // restore banner is unresolved, so we never overwrite a not-yet-applied draft).
  useEffect(() => {
    if (!enabled || pendingRestore) return;
    if (isFirstChangeRef.current) {
      isFirstChangeRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      saveLocal(formDataRef.current);
      setLastSavedAt(Date.now());
      setStatus('saved');
    }, LOCAL_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [formData, enabled, pendingRestore, saveLocal]);

  // Throttled backend save so the draft survives a full browser/device loss.
  useEffect(() => {
    if (!enabled || pendingRestore) return;

    const interval = setInterval(() => {
      saveRemote(formDataRef.current);
    }, REMOTE_SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, pendingRestore, saveRemote]);

  // Flush on tab blur / visibility change (covers the tab-close / power-loss case).
  useEffect(() => {
    if (!enabled || pendingRestore) return;

    const flush = () => {
      saveLocal(formDataRef.current);
      saveRemote(formDataRef.current);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('blur', flush);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', flush);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, pendingRestore, saveLocal, saveRemote]);

  const restoreDraft = useCallback(() => {
    const draft = pendingRestore;
    setPendingRestore(null);
    return draft?.formData ?? null;
  }, [pendingRestore]);

  const discardDraft = useCallback(() => {
    setPendingRestore(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    deleteDraft(entityType, entityId).catch(() => {});
  }, [storageKey, entityType, entityId]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    return deleteDraft(entityType, entityId);
  }, [storageKey, entityType, entityId]);

  return {
    status,
    lastSavedAt,
    pendingRestore,
    restoreDraft,
    discardDraft,
    clearDraft,
  };
};
