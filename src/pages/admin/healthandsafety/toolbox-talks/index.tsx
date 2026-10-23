import React, { useState, useEffect } from 'react';

import { COLORS } from '../../../../theme/colors';
import {
  FaComments,
  FaPlus,
  FaEdit,
  FaEye,
  FaDownload,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaCheckCircle,
  FaUsers,
  FaClock,
  FaBookOpen,
} from 'react-icons/fa';

interface ToolboxTalk {
  _id: string;
  talkNumber: string;
  title: string;
  topic: string;
  category: 'Safety' | 'Operations' | 'Environmental' | 'Health' | 'Emergency' | 'Equipment';
  date: string;
  location: string;
  presenter: string;
  presenterId?: string;
  duration: number; // minutes
  attendees: ToolboxTalkAttendee[];
  totalAttendees: number;
  content: string;
  keyPoints: string[];
  discussionNotes?: string;
  actionItems?: string[];
  attachments?: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  createdBy: string;
  createdDate: string;
}

interface ToolboxTalkAttendee {
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  attended: boolean;
  signature?: string;
  signedDate?: string;
}

interface ToolboxTalkTemplate {
  _id: string;
  title: string;
  topic: string;
  category: string;
  content: string;
  keyPoints: string[];
  estimatedDuration: number;
  createdBy: string;
  createdDate: string;
  usageCount: number;
}

const ToolboxTalks: React.FC = () => {
  // const navigate = useNavigate();
  const [talks, setTalks] = useState<ToolboxTalk[]>([]);
  const [templates, setTemplates] = useState<ToolboxTalkTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'talks' | 'templates'>('talks');
  const [showNewTalkModal, setShowNewTalkModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTalk, setSelectedTalk] = useState<ToolboxTalk | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Temporary usage to silence build errors until implementation
  useEffect(() => {
    if (showNewTalkModal) console.log('Show new talk modal');
    if (showTemplateModal) console.log('Show template modal');
    if (showDetailModal && selectedTalk) console.log('Show detail modal for', selectedTalk._id);
  }, [showNewTalkModal, showTemplateModal, showDetailModal, selectedTalk]);

  useEffect(() => {
    // Mock data
    const mockTalks: ToolboxTalk[] = [
      {
        _id: '1',
        talkNumber: 'TT-2025-001',
        title: 'Winter Driving Safety',
        topic: 'Safe driving practices in winter conditions',
        category: 'Safety',
        date: '2025-12-10',
        location: 'Main Yard - Conference Room',
        presenter: 'Safety Manager',
        duration: 15,
        attendees: [
          {
            employeeId: 'E001',
            employeeName: 'John Driver',
            role: 'Driver',
            department: 'Operations',
            attended: true,
            signature: 'John Driver',
            signedDate: '2025-12-10',
          },
          {
            employeeId: 'E002',
            employeeName: 'Jane Driver',
            role: 'Driver',
            department: 'Operations',
            attended: true,
            signature: 'Jane Driver',
            signedDate: '2025-12-10',
          },
        ],
        totalAttendees: 2,
        content: 'Discussion on winter driving techniques, black ice awareness, and proper vehicle preparation.',
        keyPoints: [
          'Reduce speed in adverse conditions',
          'Increase following distance',
          'Check tire condition before trips',
          'Carry emergency kit',
        ],
        discussionNotes: 'Drivers asked about chain requirements. Clarified company policy on mandatory chains above 3000ft elevation.',
        actionItems: ['Distribute winter driving checklist', 'Schedule tire inspection'],
        status: 'completed',
        createdBy: 'Safety Manager',
        createdDate: '2025-12-05',
      },
      {
        _id: '2',
        talkNumber: 'TT-2025-002',
        title: 'Load Securement Best Practices',
        topic: 'Proper load securement techniques',
        category: 'Operations',
        date: '2025-12-15',
        location: 'Warehouse A',
        presenter: 'Operations Manager',
        duration: 20,
        attendees: [],
        totalAttendees: 0,
        content: 'Review of FMCSA/CVSA load securement standards and company procedures.',
        keyPoints: [
          'Minimum number of straps required',
          'Proper tensioning techniques',
          'Inspection before departure',
          'Documentation requirements',
        ],
        status: 'scheduled',
        createdBy: 'Operations Manager',
        createdDate: '2025-12-08',
      },
    ];

    const mockTemplates: ToolboxTalkTemplate[] = [
      {
        _id: 'T1',
        title: 'Slip, Trip, and Fall Prevention',
        topic: 'Workplace safety',
        category: 'Safety',
        content: 'Comprehensive discussion on identifying and preventing slip, trip, and fall hazards in the workplace.',
        keyPoints: [
          'Keep walkways clear',
          'Report spills immediately',
          'Wear appropriate footwear',
          'Use handrails on stairs',
        ],
        estimatedDuration: 15,
        createdBy: 'Safety Manager',
        createdDate: '2024-01-15',
        usageCount: 12,
      },
      {
        _id: 'T2',
        title: 'PPE Requirements',
        topic: 'Personal protective equipment',
        category: 'Safety',
        content: 'Review of required PPE for different job functions and proper use.',
        keyPoints: [
          'Hard hats in yard and shop',
          'Safety glasses for mechanical work',
          'High-visibility vests in yard',
          'Steel-toed boots required',
        ],
        estimatedDuration: 10,
        createdBy: 'Safety Manager',
        createdDate: '2024-02-01',
        usageCount: 8,
      },
    ];

    setTalks(mockTalks);
    setTemplates(mockTemplates);
    setLoading(false);
  }, []);

  const stats = {
    total: talks.length,
    completed: talks.filter(t => t.status === 'completed').length,
    scheduled: talks.filter(t => t.status === 'scheduled').length,
    totalAttendees: talks.reduce((sum, t) => sum + t.totalAttendees, 0),
    templates: templates.length,
  };

  const filteredTalks = talks.filter(talk => {
    const matchesSearch =
      talk.talkNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      talk.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      talk.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || talk.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || talk.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const renderTalksList = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-blue-500">
          <div className="text-3xl font-bold text-primary">{stats.total}</div>
          <div className="text-sm text-secondary mt-1">Total Talks</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-green-500">
          <div className="text-3xl font-bold text-green-700">{stats.completed}</div>
          <div className="text-sm text-secondary mt-1">Completed</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-yellow-500">
          <div className="text-3xl font-bold text-yellow-700">{stats.scheduled}</div>
          <div className="text-sm text-secondary mt-1">Scheduled</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-purple-500">
          <div className="text-3xl font-bold text-purple-700">{stats.totalAttendees}</div>
          <div className="text-sm text-secondary mt-1">Total Attendees</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 shadow-lg">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search by talk number, title, or topic..."
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
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="Safety">Safety</option>
              <option value="Operations">Operations</option>
              <option value="Environmental">Environmental</option>
              <option value="Health">Health</option>
              <option value="Emergency">Emergency</option>
              <option value="Equipment">Equipment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Talks Table */}
      <div className="bg-card rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold text-primary">Toolbox Talks</h3>
          <button
            onClick={() => setShowNewTalkModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-semibold"
          >
            <FaPlus /> New Toolbox Talk
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Talk #</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Title / Topic</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Date / Location</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Presenter</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Attendees</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-secondary">Loading...</td>
                </tr>
              ) : filteredTalks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-secondary">No toolbox talks found</td>
                </tr>
              ) : (
                filteredTalks.map((talk) => (
                  <tr key={talk._id} className="hover:bg-[rgba(255,255,255,0.03)] transition">
                    <td className="px-6 py-4 font-medium text-primary">{talk.talkNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-primary">{talk.title}</div>
                      <div className="text-sm text-secondary">{talk.topic}</div>
                      <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        {talk.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2 text-primary">
                        <FaCalendarAlt className="text-secondary" />
                        {new Date(talk.date).toLocaleDateString()}
                      </div>
                      <div className="text-secondary mt-1">{talk.location}</div>
                      <div className="text-xs text-secondary mt-1">
                        <FaClock className="inline mr-1" />
                        {talk.duration} min
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary">{talk.presenter}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaUsers className="text-secondary" />
                        <span className="font-semibold">{talk.totalAttendees}</span>
                        {talk.attendees.filter(a => a.attended).length > 0 && (
                          <span className="text-xs text-green-600">
                            ({talk.attendees.filter(a => a.attended).length} signed)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${talk.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : talk.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-card text-primary'
                          }`}
                      >
                        {talk.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedTalk(talk);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Download">
                          <FaDownload />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-primary">Toolbox Talk Templates</h3>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-semibold"
          >
            <FaPlus /> Create Template
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template._id} className="bg-card rounded-xl p-6 border-2 border-theme hover:border-blue-500 transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-primary mb-1">{template.title}</h4>
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                    {template.category}
                  </span>
                </div>
              </div>
              <p className="text-sm text-secondary mb-4">{template.topic}</p>
              <div className="space-y-2 mb-4">
                <div className="text-xs text-secondary">
                  <FaClock className="inline mr-1" />
                  {template.estimatedDuration} minutes
                </div>
                <div className="text-xs text-secondary">
                  <FaBookOpen className="inline mr-1" />
                  Used {template.usageCount} times
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs font-semibold text-secondary mb-2">Key Points:</p>
                <ul className="text-xs text-primary space-y-1">
                  {template.keyPoints.slice(0, 3).map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <FaCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={10} />
                      <span>{point}</span>
                    </li>
                  ))}
                  {template.keyPoints.length > 3 && (
                    <li className="text-secondary">+ {template.keyPoints.length - 3} more</li>
                  )}
                </ul>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold">
                  Use Template
                </button>
                <button className="px-4 py-2 bg-gray-200 text-primary rounded-lg hover:bg-gray-300 transition">
                  <FaEdit />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: COLORS.background.secondary }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.text.primary }}>
            <FaComments className="inline mr-3" style={{ color: COLORS.modules.committee }} />
            Toolbox Talks
          </h1>
          <p className="text-lg text-secondary">
            Schedule and track safety toolbox talks, manage templates, and track employee attendance.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-theme">
            <button
              onClick={() => setActiveTab('talks')}
              className={`flex-1 px-6 py-4 font-semibold transition ${activeTab === 'talks'
                ? 'border-b-2 text-[#00D1FF]'
                : 'text-secondary hover:text-primary'
                }`}
              style={activeTab === 'talks' ? { borderColor: COLORS.primary.main } : {}}
            >
              <FaComments className="inline mr-2" />
              Toolbox Talks
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 px-6 py-4 font-semibold transition ${activeTab === 'templates'
                ? 'border-b-2 text-[#00D1FF]'
                : 'text-secondary hover:text-primary'
                }`}
              style={activeTab === 'templates' ? { borderColor: COLORS.primary.main } : {}}
            >
              <FaBookOpen className="inline mr-2" />
              Templates
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'talks' && renderTalksList()}
        {activeTab === 'templates' && renderTemplates()}

        {/* Info Panel */}
        <div className="mt-6 bg-card border-2 border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
            <FaCheckCircle /> Toolbox Talks Compliance
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✅ Track attendance with digital signatures</li>
            <li>✅ Store discussion notes and action items</li>
            <li>✅ Use templates for consistent messaging</li>
            <li>✅ Document all safety communications for federal audits</li>
            <li>✅ Link to related incidents, hazards, or policies</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ToolboxTalks;

