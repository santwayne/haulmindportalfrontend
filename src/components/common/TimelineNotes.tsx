import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Loader2, MessageSquare, Pencil, Trash2, AlertCircle } from 'lucide-react';
import type { RootState } from '../../redux/store';
import { useTimeline } from '../../customHooks/useTimeline';
import type { TimelineEntityType, TimelineEntry, TimelineMutationResponse } from '../../axios/api/timeline';
import { formatAbsoluteTime, formatRelativeTime } from '../../utils/formatRelativeTime';
import ConfirmationModal from './ConfirmationModal';

const ADMIN_ROLES = ['admin', 'superadmin'];

interface TimelineNotesProps {
  entityType: TimelineEntityType;
  entityId: string | undefined;
}

const TimelineEntryRow: React.FC<{
  entry: TimelineEntry;
  canManage: boolean;
  onEdit: (entryId: string, note: string) => Promise<TimelineMutationResponse | { success: boolean; message?: string }>;
  onDelete: (entryId: string) => void;
}> = ({ entry, canManage, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftNote, setDraftNote] = useState(entry.note);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!draftNote.trim() || draftNote.trim() === entry.note) {
      setIsEditing(false);
      setDraftNote(entry.note);
      return;
    }
    setSaving(true);
    const res = await onEdit(entry._id, draftNote);
    setSaving(false);
    if (res?.success !== false) {
      setIsEditing(false);
    }
  };

  return (
    <div className="flex gap-3 py-4 border-b border-theme last:border-b-0">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--accent-purple)]/20 flex items-center justify-center text-sm font-semibold text-primary">
        {entry.author?.name?.charAt(0)?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2">
          <span className="font-medium text-primary text-sm">{entry.author?.name || 'Unknown'}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-medium ${
              ADMIN_ROLES.includes((entry.author?.role || '').toLowerCase())
                ? 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]'
                : 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]'
            }`}
          >
            {entry.author?.role || 'user'}
          </span>
          <span className="text-xs text-secondary" title={formatAbsoluteTime(entry.createdAt)}>
            {formatRelativeTime(entry.createdAt)}
          </span>
          {entry.updatedAt && entry.updatedAt !== entry.createdAt && (
            <span className="text-xs text-secondary italic">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-theme rounded-lg bg-card text-primary text-sm focus:ring-2 focus:ring-[var(--accent-purple)]/30 focus:border-[var(--accent-purple)]"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent-purple)] text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setDraftNote(entry.note);
                }}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-theme text-primary hover:bg-[rgba(255,255,255,0.03)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-secondary whitespace-pre-wrap break-words">{entry.note}</p>
        )}

        {canManage && !isEditing && (
          <div className="flex gap-3 mt-1.5">
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-secondary hover:text-primary flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={() => onDelete(entry._id)}
              className="text-xs text-secondary hover:text-red-500 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TimelineNotes: React.FC<TimelineNotesProps> = ({ entityType, entityId }) => {
  const { userInfo } = useSelector((state: RootState) => state.userAuth);
  const currentUser = userInfo?.userData;
  const isAdmin = ADMIN_ROLES.includes((currentUser?.role || '').toLowerCase());

  const {
    entries,
    loading,
    loadingMore,
    hasMore,
    error,
    submitting,
    loadMore,
    addNote,
    editNote,
    removeNote,
  } = useTimeline(entityType, entityId);

  const [newNote, setNewNote] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    const res = await addNote(newNote);
    if (res?.success !== false) {
      setNewNote('');
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    await removeNote(pendingDeleteId);
    setDeleting(false);
    setPendingDeleteId(null);
  };

  return (
    <div className="bg-card rounded-xl border border-theme p-4">
      <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" /> Timeline &amp; Notes
      </h3>

      <div className="mb-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note or update about this record..."
          rows={2}
          className="w-full px-3 py-2 border border-theme rounded-lg bg-card text-primary text-sm focus:ring-2 focus:ring-[var(--accent-purple)]/30 focus:border-[var(--accent-purple)]"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAdd}
            disabled={submitting || !newNote.trim()}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent-purple)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Posting...' : 'Post Note'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-secondary text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading timeline...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-6 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="py-8 text-center text-sm text-secondary">
          No notes yet. Be the first to add an update.
        </div>
      ) : (
        <div>
          {entries.map((entry) => (
            <TimelineEntryRow
              key={entry._id}
              entry={entry}
              canManage={isAdmin || entry.author?._id === currentUser?._id}
              onEdit={editNote}
              onDelete={(id) => setPendingDeleteId(id)}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center mt-3">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-1.5 text-xs font-medium rounded-lg border border-theme text-primary hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete note"
        message="Are you sure you want to delete this timeline entry? This cannot be undone."
        confirmText="Delete"
        type="danger"
        isLoading={deleting}
      />
    </div>
  );
};

export default TimelineNotes;
