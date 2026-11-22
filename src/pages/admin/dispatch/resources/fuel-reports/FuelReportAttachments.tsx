import { useEffect, useRef, useState } from "react";
import { FileText, Plus, X, ExternalLink } from "lucide-react";
import { getFuelReportAttachments, uploadFuelReportAttachments, deleteFuelReportAttachment } from "../../../../../axios/api/dispatcher.fuelreport";

interface Attachment { _id: string; name?: string; url?: string; viewUrl?: string; mimeType?: string; uploadedAt?: string }

// Receipt / documents saved on a fuel report: open, add more, remove.
export default function FuelReportAttachments({ reportId }: { reportId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!reportId) return;
    let alive = true;
    setLoading(true);
    getFuelReportAttachments(reportId).then(res => {
      if (!alive) return;
      if (res?.success) setItems(res.data || []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [reportId]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError(null);
    const res = await uploadFuelReportAttachments(reportId, files);
    setUploading(false);
    if (res?.success) setItems(res.data?.attachments || []);
    else setError(res?.message || "Upload failed");
  };

  const remove = async (id: string) => {
    const res = await deleteFuelReportAttachment(reportId, id);
    if (res?.success) setItems(res.data || []);
    else setError(res?.message || "Could not remove the file");
  };

  return (
    <div className="mt-6 bg-card border border-theme rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-headings">
          <FileText className="w-4 h-4 text-secondary" /> Receipt &amp; documents
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-theme text-sm hover:bg-[rgba(15,31,23,0.03)] disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> {uploading ? "Uploading..." : "Attach file(s)"}
        </button>
        <input ref={inputRef} type="file" multiple accept=".pdf,image/*,.xlsx,.xls,.doc,.docx" className="hidden" onChange={onPick} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {loading ? (
        <p className="text-xs text-secondary">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-secondary">No files attached to this report.</p>
      ) : (
        <ul className="space-y-1">
          {items.map(a => (
            <li key={a._id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded border border-theme">
              <a href={a.viewUrl || a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate max-w-[320px] text-[var(--accent-blue)] hover:underline" title={a.name}>
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /> {a.name || "File"}
              </a>
              <button type="button" onClick={() => remove(a._id)} className="text-red-500 hover:text-red-700 ml-2" title="Remove">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
