import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addTimelineEntry,
  deleteTimelineEntry,
  getTimeline,
  updateTimelineEntry,
  type TimelineEntityType,
  type TimelineEntry,
} from '../axios/api/timeline';

const PAGE_SIZE = 15;

export const useTimeline = (entityType: TimelineEntityType, entityId: string | undefined) => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Guards against a slow earlier request overwriting a newer one when entityId changes quickly.
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (pageToLoad: number, mode: 'replace' | 'append') => {
      if (!entityId) return;
      const requestId = ++requestIdRef.current;
      if (mode === 'replace') {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const res = await getTimeline(entityType, entityId, pageToLoad, PAGE_SIZE);
        if (requestId !== requestIdRef.current) return;
        if (res?.success === false) {
          setError(res?.message || 'Failed to load timeline');
          return;
        }
        const newEntries = res?.entries || [];
        setEntries((prev) => (mode === 'replace' ? newEntries : [...prev, ...newEntries]));
        setHasMore(Boolean(res?.hasMore));
        setPage(pageToLoad);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load timeline');
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [entityType, entityId]
  );

  useEffect(() => {
    setEntries([]);
    setPage(1);
    setHasMore(false);
    if (entityId) {
      fetchPage(1, 'replace');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    fetchPage(page + 1, 'append');
  }, [fetchPage, page, hasMore, loading, loadingMore]);

  const refresh = useCallback(() => fetchPage(1, 'replace'), [fetchPage]);

  const addNote = useCallback(
    async (note: string) => {
      if (!entityId || !note.trim()) return { success: false, message: 'Note is required' };
      setSubmitting(true);
      try {
        const res = await addTimelineEntry(entityType, entityId, note.trim());
        const newEntry = res?.entry;
        if (res?.success !== false && newEntry) {
          setEntries((prev) => [newEntry, ...prev]);
        } else if (res?.success !== false) {
          // Backend may not echo the entry back — fall back to a full refresh.
          await fetchPage(1, 'replace');
        }
        return res;
      } finally {
        setSubmitting(false);
      }
    },
    [entityType, entityId, fetchPage]
  );

  const editNote = useCallback(
    async (entryId: string, note: string) => {
      if (!entityId || !note.trim()) return { success: false, message: 'Note is required' };
      const res = await updateTimelineEntry(entityType, entityId, entryId, note.trim());
      if (res?.success !== false) {
        setEntries((prev) =>
          prev.map((e) => (e._id === entryId ? { ...e, note: note.trim(), ...(res?.entry || {}) } : e))
        );
      }
      return res;
    },
    [entityType, entityId]
  );

  const removeNote = useCallback(
    async (entryId: string) => {
      if (!entityId) return { success: false };
      const res = await deleteTimelineEntry(entityType, entityId, entryId);
      if (res?.success !== false) {
        setEntries((prev) => prev.filter((e) => e._id !== entryId));
      }
      return res;
    },
    [entityType, entityId]
  );

  return {
    entries,
    loading,
    loadingMore,
    hasMore,
    error,
    submitting,
    loadMore,
    refresh,
    addNote,
    editNote,
    removeNote,
  };
};
