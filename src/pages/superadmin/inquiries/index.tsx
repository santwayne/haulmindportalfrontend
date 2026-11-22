import { useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCw, Search, AlertTriangle } from 'lucide-react';
import { getContactInquiries, updateContactInquiryStatus, type ContactInquiry } from '../../../axios/api/superadmin';

// Leads from the public website contact form. Every submission is stored here,
// even when the notification email could not be sent.
const STATUS_STYLES: Record<ContactInquiry['status'], string> = {
  new: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  contacted: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  closed: 'bg-green-500/15 text-green-400 border-green-500/30',
};

const Inquiries = () => {
  const [rows, setRows] = useState<ContactInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContactInquiry['status']>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await getContactInquiries();
    if (res.success) setRows(res.data || []);
    else setError(res.message || 'Failed to load inquiries');
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeStatus = async (id: string, status: ContactInquiry['status']) => {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));
    const res = await updateContactInquiryStatus(id, status);
    if (!res.success) load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (!q || [r.name, r.email, r.company, r.message].some((v) => (v || '').toLowerCase().includes(q))));
  }, [rows, search, statusFilter]);

  const newCount = rows.filter((r) => r.status === 'new').length;
  const emailFailed = rows.filter((r) => r.emailSent === false).length;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><Mail className="w-6 h-6" /> Website Inquiries</h1>
          <p className="text-sm text-secondary mt-1">Messages from the website contact form. {newCount} new.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-theme text-secondary hover:text-primary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {emailFailed > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{emailFailed} inquir{emailFailed === 1 ? 'y was' : 'ies were'} saved but the notification email could not be sent. Check the server's SMTP settings. The leads are safe below.</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, company, message..."
            className="pl-9 pr-3 py-2 w-full border border-theme rounded-lg bg-card text-sm text-primary focus:outline-none" />
        </div>
        {(['all', 'new', 'contacted', 'closed'] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm border capitalize ${statusFilter === s ? 'text-white border-transparent' : 'text-secondary border-theme'}`}
            style={statusFilter === s ? { backgroundColor: 'var(--accent-navyblue)' } : undefined}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-theme overflow-hidden">
        {loading ? (
          <p className="py-16 text-center text-secondary text-sm">Loading...</p>
        ) : error ? (
          <p className="py-16 text-center text-red-400 text-sm">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-secondary text-sm">No inquiries yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-theme">
                <tr className="text-left text-xs uppercase text-secondary">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Fleet</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Lang</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id} className="border-b border-theme align-top hover:bg-[rgba(15,31,23,0.03)]">
                    <td className="px-4 py-3 text-secondary whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-primary font-medium whitespace-nowrap">{r.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><a href={`mailto:${r.email}`} className="text-[var(--accent-navyblue)] hover:underline">{r.email}</a></td>
                    <td className="px-4 py-3 text-secondary">{r.company || '—'}</td>
                    <td className="px-4 py-3 text-secondary">{r.fleetSize || '—'}</td>
                    <td className="px-4 py-3 text-secondary max-w-md">
                      <button onClick={() => setOpenId(openId === r._id ? null : r._id)} className="text-left">
                        <span className={openId === r._id ? 'whitespace-pre-wrap' : 'line-clamp-2'}>{r.message}</span>
                      </button>
                      {r.emailSent === false && <div className="text-[11px] text-amber-400 mt-1">Email notification not sent</div>}
                    </td>
                    <td className="px-4 py-3 text-secondary uppercase">{r.language || 'en'}</td>
                    <td className="px-4 py-3">
                      <select value={r.status} onChange={(e) => changeStatus(r._id, e.target.value as ContactInquiry['status'])}
                        className={`px-2 py-1 rounded-md border text-xs capitalize bg-transparent ${STATUS_STYLES[r.status]}`}>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inquiries;
