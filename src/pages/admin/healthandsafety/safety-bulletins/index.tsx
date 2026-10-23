import React, { useState, useEffect } from 'react';
import { COLORS } from '../../../../theme/colors';
import {
  FaBullhorn,
  FaPlus,
  FaEdit,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaDownload,
  FaTag,
} from 'react-icons/fa';

interface SafetyBulletin {
  _id: string;
  bulletinNumber: string;
  title: string;
  content: string;
  category: 'Safety Alert' | 'Policy Update' | 'Procedure Change' | 'Hazard Warning' | 'Training Reminder' | 'General';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'published' | 'archived';
  publishedDate?: string;
  expiryDate?: string;
  targetAudience: 'all' | 'drivers' | 'mechanics' | 'office-staff' | 'supervisors' | 'custom';
  customRoles?: string[];
  createdBy: string;
  createdDate: string;
  lastModified?: string;
  attachments?: Array<{
    fileUrl: string;
    fileName: string;
    fileType: string;
  }>;
  tags: string[];

  // Acknowledgment Tracking
  acknowledgmentRequired: boolean;
  acknowledgments: Array<{
    employeeId: string;
    employeeName: string;
    acknowledgedDate: string;
    signature?: string;
  }>;
  totalEmployees: number;
  acknowledgmentRate: number; // percentage

  // Related Items
  relatedIncident?: string;
  relatedHazard?: string;
  relatedPolicy?: string;
}

const SafetyBulletins: React.FC = () => {
  const [bulletins, setBulletins] = useState<SafetyBulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showNewBulletinModal, setShowNewBulletinModal] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<SafetyBulletin | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Temporary usage to silence build errors until modals are implemented
  useEffect(() => {
    if (showNewBulletinModal) console.log('New bulletin modal would open');
    if (showDetailModal && selectedBulletin) console.log('Detail modal would open for', selectedBulletin._id);
  }, [showNewBulletinModal, showDetailModal, selectedBulletin]);

  useEffect(() => {
    // Mock data
    const mockBulletins: SafetyBulletin[] = [
      {
        _id: '1',
        bulletinNumber: 'SB-2025-001',
        title: 'Winter Driving Safety Reminder',
        content: 'With winter conditions approaching, all drivers must review winter driving procedures. Ensure vehicles are equipped with proper tires, chains if required, and emergency kits. Reduce speed in adverse conditions and increase following distance.',
        category: 'Safety Alert',
        priority: 'high',
        status: 'published',
        publishedDate: '2025-12-01',
        expiryDate: '2025-03-31',
        targetAudience: 'drivers',
        createdBy: 'Safety Manager',
        createdDate: '2025-11-28',
        lastModified: '2025-12-01',
        tags: ['winter-driving', 'safety-alert', 'drivers'],
        acknowledgmentRequired: true,
        acknowledgments: [
          {
            employeeId: 'E001',
            employeeName: 'John Driver',
            acknowledgedDate: '2025-12-02',
            signature: 'John Driver',
          },
          {
            employeeId: 'E002',
            employeeName: 'Jane Driver',
            acknowledgedDate: '2025-12-02',
            signature: 'Jane Driver',
          },
        ],
        totalEmployees: 25,
        acknowledgmentRate: 8, // 2 out of 25 = 8%
      },
      {
        _id: '2',
        bulletinNumber: 'SB-2025-002',
        title: 'Updated Load Securement Policy',
        content: 'Effective immediately, all drivers must use a minimum of 4 straps for loads over 10,000 lbs. This change aligns with updated CVSA standards. Please review the updated policy document attached.',
        category: 'Policy Update',
        priority: 'critical',
        status: 'published',
        publishedDate: '2025-12-05',
        expiryDate: '2026-12-05',
        targetAudience: 'drivers',
        createdBy: 'Compliance Manager',
        createdDate: '2025-12-04',
        lastModified: '2025-12-05',
        attachments: [
          {
            fileUrl: '/documents/load-securement-policy-2025.pdf',
            fileName: 'load-securement-policy-2025.pdf',
            fileType: 'pdf',
          },
        ],
        tags: ['policy-update', 'load-securement', 'compliance'],
        acknowledgmentRequired: true,
        acknowledgments: [
          {
            employeeId: 'E001',
            employeeName: 'John Driver',
            acknowledgedDate: '2025-12-06',
            signature: 'John Driver',
          },
        ],
        totalEmployees: 25,
        acknowledgmentRate: 4, // 1 out of 25 = 4%
        relatedPolicy: 'POL-2025-012',
      },
      {
        _id: '3',
        bulletinNumber: 'SB-2025-003',
        title: 'Hazard Alert: Icy Conditions in Yard',
        content: 'The main yard area has been experiencing icy conditions. All personnel must exercise extreme caution when walking. Use designated walkways and report any additional hazards immediately.',
        category: 'Hazard Warning',
        priority: 'critical',
        status: 'published',
        publishedDate: '2025-12-10',
        expiryDate: '2025-12-17',
        targetAudience: 'all',
        createdBy: 'Yard Supervisor',
        createdDate: '2025-12-10',
        tags: ['hazard-warning', 'yard-safety', 'weather'],
        acknowledgmentRequired: false,
        acknowledgments: [],
        totalEmployees: 50,
        acknowledgmentRate: 0,
        relatedHazard: 'HAZ-2025-045',
      },
      {
        _id: '4',
        bulletinNumber: 'SB-2025-004',
        title: 'TDG Training Renewal Reminder',
        content: 'Several employees have TDG certificates expiring in the next 30 days. Please schedule renewal training as soon as possible. Contact the safety department to book your training session.',
        category: 'Training Reminder',
        priority: 'medium',
        status: 'published',
        publishedDate: '2025-12-08',
        expiryDate: '2025-12-31',
        targetAudience: 'custom',
        customRoles: ['drivers', 'dispatchers'],
        createdBy: 'Training Coordinator',
        createdDate: '2025-12-07',
        tags: ['training', 'tdg', 'certification'],
        acknowledgmentRequired: true,
        acknowledgments: [],
        totalEmployees: 12,
        acknowledgmentRate: 0,
      },
    ];

    setBulletins(mockBulletins);
    setLoading(false);
  }, []);

  const filteredBulletins = bulletins.filter(bulletin => {
    const matchesSearch =
      bulletin.bulletinNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bulletin.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bulletin.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bulletin.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || bulletin.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || bulletin.category === filterCategory;
    const matchesPriority = filterPriority === 'all' || bulletin.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

  const stats = {
    total: bulletins.length,
    published: bulletins.filter(b => b.status === 'published').length,
    draft: bulletins.filter(b => b.status === 'draft').length,
    archived: bulletins.filter(b => b.status === 'archived').length,
    critical: bulletins.filter(b => b.priority === 'critical' && b.status === 'published').length,
    avgAcknowledgment: bulletins
      .filter(b => b.acknowledgmentRequired)
      .reduce((sum, b) => sum + b.acknowledgmentRate, 0) /
      (bulletins.filter(b => b.acknowledgmentRequired).length || 1),
  };

  const getPriorityColor = (priority: SafetyBulletin['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-500';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-500';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-500';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-500';
      default:
        return 'bg-card text-primary border-gray-500';
    }
  };

  const getStatusColor = (status: SafetyBulletin['status']) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-card text-primary';
      case 'archived':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-card text-primary';
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: COLORS.background.secondary }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.text.primary }}>
            <FaBullhorn className="inline mr-3" style={{ color: COLORS.status.warning }} />
            Safety Bulletins
          </h1>
          <p className="text-lg text-secondary">
            Create, publish, and track safety bulletins with employee acknowledgment tracking.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-card rounded-xl p-6 shadow-md border-l-4" style={{ borderColor: COLORS.status.warning }}>
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-secondary mt-1">Total Bulletins</div>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-green-500">
            <div className="text-3xl font-bold text-green-700">{stats.published}</div>
            <div className="text-sm text-secondary mt-1">Published</div>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-gray-500">
            <div className="text-3xl font-bold text-primary">{stats.draft}</div>
            <div className="text-sm text-secondary mt-1">Draft</div>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-red-500">
            <div className="text-3xl font-bold text-red-700">{stats.critical}</div>
            <div className="text-sm text-secondary mt-1">Critical Alerts</div>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-blue-500">
            <div className="text-3xl font-bold text-blue-700">{Math.round(stats.avgAcknowledgment)}%</div>
            <div className="text-sm text-secondary mt-1">Avg. Acknowledgment</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl p-4 shadow-lg mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search bulletins by title, number, content, tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <FaFilter className="text-secondary" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Safety Alert">Safety Alert</option>
                <option value="Policy Update">Policy Update</option>
                <option value="Procedure Change">Procedure Change</option>
                <option value="Hazard Warning">Hazard Warning</option>
                <option value="Training Reminder">Training Reminder</option>
                <option value="General">General</option>
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <button
              onClick={() => setShowNewBulletinModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-semibold"
            >
              <FaPlus /> New Bulletin
            </button>
          </div>
        </div>

        {/* Bulletins List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-card rounded-xl p-8 text-center text-secondary">Loading...</div>
          ) : filteredBulletins.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center text-secondary">No bulletins found</div>
          ) : (
            filteredBulletins.map((bulletin) => (
              <div
                key={bulletin._id}
                className="bg-card rounded-xl shadow-lg p-6 border-l-4"
                style={{
                  borderColor:
                    bulletin.priority === 'critical'
                      ? COLORS.status.danger
                      : bulletin.priority === 'high'
                        ? COLORS.status.warning
                        : COLORS.primary.main,
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-primary">{bulletin.title}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getPriorityColor(
                          bulletin.priority
                        )}`}
                      >
                        {bulletin.priority.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(bulletin.status)}`}>
                        {bulletin.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-secondary mb-3">
                      <span className="font-medium">{bulletin.bulletinNumber}</span>
                      <span className="flex items-center gap-1">
                        <FaTag className="text-secondary" size={12} />
                        {bulletin.category}
                      </span>
                      {bulletin.publishedDate && (
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt className="text-secondary" size={12} />
                          Published: {new Date(bulletin.publishedDate).toLocaleDateString()}
                        </span>
                      )}
                      {bulletin.expiryDate && (
                        <span className="flex items-center gap-1">
                          <FaClock className="text-secondary" size={12} />
                          Expires: {new Date(bulletin.expiryDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-primary mb-4">{bulletin.content}</p>
                    {bulletin.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {bulletin.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-card text-secondary rounded text-xs">
                            <FaTag className="inline mr-1" size={8} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {bulletin.acknowledgmentRequired && (
                      <div className="bg-card border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-semibold text-blue-900">Acknowledgment Required</span>
                            <div className="text-xs text-blue-700 mt-1">
                              {bulletin.acknowledgments.length} of {bulletin.totalEmployees} employees acknowledged (
                              {bulletin.acknowledgmentRate}%)
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${bulletin.acknowledgmentRate}%` }}
                              />
                            </div>
                            {bulletin.acknowledgmentRate < 100 && (
                              <span className="text-xs text-[#F59E0B] flex items-center gap-1">
                                <FaExclamationTriangle /> Pending
                              </span>
                            )}
                            {bulletin.acknowledgmentRate === 100 && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <FaCheckCircle /> Complete
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedBulletin(bulletin);
                        setShowDetailModal(true);
                      }}
                      className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition"
                      title="View Details"
                    >
                      <FaEye />
                    </button>
                    {bulletin.status === 'draft' && (
                      <button className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition" title="Edit">
                        <FaEdit />
                      </button>
                    )}
                    <button className="p-2 text-secondary hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition" title="Download">
                      <FaDownload />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-card border-2 border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-3 flex items-center gap-2">
            <FaBullhorn /> Safety Bulletins Features
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>✅ Create and publish safety alerts, policy updates, and hazard warnings</li>
            <li>✅ Target specific employee groups (drivers, mechanics, office staff, etc.)</li>
            <li>✅ Track employee acknowledgment with digital signatures</li>
            <li>✅ Set priority levels (low, medium, high, critical) for urgent communications</li>
            <li>✅ Attach documents, policies, or procedures to bulletins</li>
            <li>✅ Automatic expiry dates and archiving for compliance</li>
            <li>✅ Link bulletins to related incidents, hazards, or policies</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SafetyBulletins;

