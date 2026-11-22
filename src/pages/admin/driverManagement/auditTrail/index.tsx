import { useState, useMemo, useEffect } from 'react';
import {
  FaHistory, FaSearch, FaUser, FaTruck, FaEdit, FaPlus,
  FaTrash, FaCheckCircle, FaClock, FaFileAlt,
} from 'react-icons/fa';
import { MdAccessTime } from 'react-icons/md';
import { Loader2 } from 'lucide-react';
import { getHRAuditTrail } from '../../../../axios/api/hr.audit';

interface AuditChange {
  field: string;
  oldValue: string;
  newValue: string;
}

interface HRAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entityType: 'Employee' | 'Driver' | 'Attendance' | string;
  entityId: string;
  entityName: string;
  changes: AuditChange[];
  details: string;
}

const HRAuditTrail = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterEntityType, setFilterEntityType] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [auditTrail, setAuditTrail] = useState<HRAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditTrail();
  }, []);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const response = await getHRAuditTrail();
      if (response.success && response.data) {
        setAuditTrail(
          response.data.map((entry: any) => ({
            id: entry.id || entry._id || Math.random().toString(),
            timestamp: entry.timestamp,
            user: entry.user || 'System',
            action: entry.action || 'Updated',
            entityType: entry.entityType || 'Employee',
            entityId: entry.entityId || '',
            entityName: entry.entityName || '',
            changes: entry.changes || [],
            details: entry.details || '',
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching HR audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const uniqueUsers = useMemo(() => Array.from(new Set(auditTrail.map(e => e.user))).sort(), [auditTrail]);
  const uniqueEntityTypes = useMemo(() => Array.from(new Set(auditTrail.map(e => e.entityType))).sort(), [auditTrail]);
  const uniqueActions = useMemo(() => Array.from(new Set(auditTrail.map(e => e.action))).sort(), [auditTrail]);

  const filteredAuditTrail = useMemo(() => {
    return auditTrail.filter(entry => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        entry.entityName.toLowerCase().includes(term) ||
        entry.entityId.toLowerCase().includes(term) ||
        entry.user.toLowerCase().includes(term) ||
        entry.details.toLowerCase().includes(term);

      const matchesUser = filterUser === 'all' || entry.user === filterUser;
      const matchesEntityType = filterEntityType === 'all' || entry.entityType === filterEntityType;
      const matchesAction = filterAction === 'all' || entry.action === filterAction;

      let matchesDate = true;
      if (dateFilter === 'today') {
        const d = new Date(entry.timestamp);
        const now = new Date();
        matchesDate = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else if (dateFilter === 'week') {
        matchesDate = new Date(entry.timestamp) >= new Date(Date.now() - 7 * 86_400_000);
      } else if (dateFilter === 'month') {
        matchesDate = new Date(entry.timestamp) >= new Date(Date.now() - 30 * 86_400_000);
      }

      return matchesSearch && matchesUser && matchesEntityType && matchesAction && matchesDate;
    });
  }, [auditTrail, searchTerm, filterUser, filterEntityType, filterAction, dateFilter]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Created':     return <FaPlus className="text-green-500" />;
      case 'Updated':     return <FaEdit className="text-[var(--accent-navyblue)]" />;
      case 'Deleted':     return <FaTrash className="text-[#047857]" />;
      case 'Checked In':  return <FaCheckCircle className="text-green-500" />;
      case 'Checked Out': return <FaCheckCircle className="text-[var(--accent-navyblue)]" />;
      default:            return <FaClock className="text-secondary" />;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'Employee':   return <FaUser className="text-[var(--accent-navyblue)]" />;
      case 'Driver':     return <FaTruck className="text-green-500" />;
      case 'Attendance': return <MdAccessTime className="text-[#d97706]" />;
      default:           return <FaFileAlt className="text-secondary" />;
    }
  };

  const getEntityTypeBadgeColor = (entityType: string) => {
    switch (entityType) {
      case 'Employee':   return 'bg-[var(--accent-navyblue)]/10 text-[var(--accent-navyblue)]';
      case 'Driver':     return 'bg-green-500/10 text-green-500';
      case 'Attendance': return 'bg-[#d97706]/10 text-[#d97706]';
      default:           return 'bg-card border border-theme text-primary';
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'Created':     return 'bg-green-500/10 text-green-500';
      case 'Updated':     return 'bg-[var(--accent-navyblue)]/10 text-[var(--accent-navyblue)]';
      case 'Deleted':     return 'bg-[#047857]/10 text-[#047857]';
      case 'Checked In':  return 'bg-green-500/10 text-green-500';
      case 'Checked Out': return 'bg-[var(--accent-navyblue)]/10 text-[var(--accent-navyblue)]';
      default:            return 'bg-card border border-theme text-primary';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDate = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FaHistory className="text-2xl text-primary" />
            <h1 className="text-3xl font-bold text-primary">HR Audit Trail</h1>
          </div>
          <p className="text-secondary">
            Track all changes made in the HR system — employees, drivers, and attendance records.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow-sm p-4 mb-6 border border-theme">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm" />
              <input
                type="text"
                placeholder="Search by name, user, or details..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-theme rounded-lg bg-card text-primary text-sm focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
              />
            </div>

            <select
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-card text-primary text-sm focus:ring-2 focus:ring-[var(--accent-blue)]"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            <select
              value={filterEntityType}
              onChange={e => setFilterEntityType(e.target.value)}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-card text-primary text-sm focus:ring-2 focus:ring-[var(--accent-blue)]"
            >
              <option value="all">All Types</option>
              {uniqueEntityTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-card text-primary text-sm focus:ring-2 focus:ring-[var(--accent-blue)]"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            {[
              { label: 'All Time', value: 'all' },
              { label: 'Today', value: 'today' },
              { label: 'Last 7 Days', value: 'week' },
              { label: 'Last 30 Days', value: 'month' },
            ].map(item => (
              <button
                key={item.value}
                onClick={() => setDateFilter(item.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  dateFilter === item.value
                    ? 'bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-white'
                    : 'bg-card border border-theme text-primary hover:bg-[rgba(15,31,23,0.05)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div className="mb-4 text-sm text-secondary">
          Showing <span className="font-semibold text-primary">{filteredAuditTrail.length}</span> of{' '}
          <span className="font-semibold text-primary">{auditTrail.length}</span> audit trail entries
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-card rounded-lg border border-theme p-12 text-center">
              <Loader2 className="mx-auto w-8 h-8 animate-spin text-[var(--accent-navyblue)] mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-1">Loading audit trail...</h3>
              <p className="text-secondary text-sm">Please wait while we fetch the HR audit entries.</p>
            </div>
          ) : filteredAuditTrail.length === 0 ? (
            <div className="bg-card rounded-lg border border-theme p-12 text-center">
              <FaHistory className="mx-auto text-4xl text-secondary mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-1">No audit entries found</h3>
              <p className="text-secondary text-sm">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            filteredAuditTrail.map(entry => (
              <div
                key={entry.id}
                className="bg-card rounded-lg border border-theme p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-full bg-card border border-theme flex items-center justify-center">
                      {getActionIcon(entry.action)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-2 gap-4">
                      <div className="flex items-center gap-2">
                        {getEntityIcon(entry.entityType)}
                        <div>
                          <h3 className="font-semibold text-primary">{entry.entityName}</h3>
                          <p className="text-xs text-secondary">{entry.entityId}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-medium text-primary">{formatTimestamp(entry.timestamp)}</div>
                        <div className="text-xs text-secondary">{formatFullDate(entry.timestamp)}</div>
                      </div>
                    </div>

                    {/* Badges + details */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionBadgeColor(entry.action)}`}>
                          {entry.action}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEntityTypeBadgeColor(entry.entityType)}`}>
                          {entry.entityType}
                        </span>
                      </div>
                      {entry.details && (
                        <p className="text-sm text-secondary">{entry.details}</p>
                      )}
                    </div>

                    {/* Changes */}
                    {entry.changes.length > 0 && (
                      <div className="pt-3 border-t border-theme">
                        <div className="text-xs font-semibold text-secondary mb-2 uppercase tracking-wide">Changes:</div>
                        <div className="space-y-1">
                          {entry.changes.map((change, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm flex-wrap">
                              <span className="font-medium text-primary">{change.field}:</span>
                              <span className="text-[#047857] line-through">{change.oldValue}</span>
                              <span className="text-secondary">→</span>
                              <span className="text-green-500 font-medium">{change.newValue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Who */}
                    <div className="mt-3 pt-3 border-t border-theme flex items-center gap-2 text-sm text-secondary">
                      <FaUser className="text-xs" />
                      <span>Changed by: <span className="font-medium text-primary">{entry.user}</span></span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HRAuditTrail;
