import { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import {
  FaFileAlt,
  FaPlus,
  FaEye,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaDownload,
  FaFilePdf,
  FaFileWord,
  FaFile,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaClipboardCheck,
  FaSyncAlt,
  FaChartPie,
  FaUserTimes,
  FaUpload
} from 'react-icons/fa';

import {
  createPolicyDocument,
  getPolicyDocuments,
  getPolicyDocumentSignedUrl
} from '../../../../axios/api/healthSafety';

interface Policy {
  _id: string;
  policyNumber: string;
  title: string;

  category: 'Safety' | 'HR/Conduct' | 'Driver-Specific' | 'Wellness' | 'Shop/Yard' | string;
  version: string;
  effectiveDate: string;
  reviewDate: string;
  status: 'active' | 'draft' | 'archived' | 'under-review' | 'expired';
  documentType: 'Policy' | 'Procedure' | 'SOP' | 'Form' | 'policy' | 'procedure' | 'guideline' | 'form';
  fileType?: string;
  fileName?: string;
  fileUrl?: string;
  owner?: string;
  assignedRoles?: string;
  acknowledged: number;
  totalEmployees: number;
  linkedTrainingId?: string;
  renewalCycle?: number;
}

interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const ToastNotificationComponent = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-[var(--accent-green)]" size={24} />,
    error: <FaExclamationTriangle className="text-red-500" size={24} />,
    info: <FaInfoCircle className="text-blue-500" size={24} />,
    warning: <FaExclamationTriangle className="text-yellow-500" size={24} />
  };

  const bgColors = {
    success: 'bg-[var(--accent-green)]/20 border-[var(--accent-green)]',
    error: 'bg-card border-red-200',
    info: 'bg-card border-blue-200',
    warning: 'bg-card border-yellow-200'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`fixed top-4 right-4 flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg z-[10000] ${bgColors[notification.type]} min-w-[300px] max-w-[500px]`}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[notification.type]}
      </div>
      <p className="flex-1 text-sm font-medium text-primary">{notification.message}</p>
      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 text-secondary hover:text-secondary transition-colors"
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
};



const ALL_CATEGORIES = [
  'Safety', 'HR/Conduct', 'Driver-Specific', 'Wellness', 'Shop/Yard'
];

const PolicyManagementModule = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'library'>('dashboard');
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [notificationId, setNotificationId] = useState(0);

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAcknowledgmentModal, setShowAcknowledgmentModal] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  // Refs for dual scrollbar
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const CUSTOM_COLORS = {
    background: '#EDF8FF',
    primary: '#016ab2',
    dark: '#063f6f',
    light: '#398bc3',
    gradient: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)', // Highlight/Header gradient per user request
    gradientVertical: 'linear-gradient(to bottom right, #016ab2, #063f6f)',
  };

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = notificationId + 1;
    setNotificationId(id);
    setNotifications([...notifications, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleDownloadPolicy = async (policy: Policy, disposition: 'inline' | 'attachment' = 'inline') => {
    try {
      if (!policy.fileUrl) {
        showNotification('error', 'No file attached to this policy document');
        return;
      }

      // Always use signed URL for S3 files
      const response = await getPolicyDocumentSignedUrl(policy._id, disposition);
      if (response?.success && response.signedUrl) {
        if (disposition === 'attachment') {
          // Download file
          const link = document.createElement('a');
          link.href = response.signedUrl;
          link.download = policy.fileName || policy.fileUrl.split('/').pop() || 'policy-document.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // View file in new tab
          window.open(response.signedUrl, '_blank');
        }
      } else {
        showNotification('error', response?.message || 'Failed to get document URL');
      }
    } catch (error: any) {
      console.error('Error accessing policy document:', error);
      showNotification('error', error?.response?.data?.message || 'Failed to access policy document');
    }
  };

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await getPolicyDocuments({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        category: filterCategory !== 'all' ? filterCategory : undefined,
        search: searchTerm || undefined
      });
      if (response?.success && Array.isArray(response.data)) {
        setPolicies(response.data.map((item: any) => {
          // Determine file type from fileUrl or fileName if fileType is not available
          let fileType = item.fileType;
          if (!fileType && item.fileName) {
            const ext = item.fileName.split('.').pop()?.toUpperCase();
            if (ext === 'PDF' || ext === 'DOCX' || ext === 'DOC' || ext === 'TXT' || ext === 'XLS' || ext === 'XLSX') {
              fileType = ext;
            }
          } else if (!fileType && item.fileUrl) {
            const ext = item.fileUrl.split('.').pop()?.split('?')[0]?.toUpperCase();
            if (ext === 'PDF' || ext === 'DOCX' || ext === 'DOC' || ext === 'TXT' || ext === 'XLS' || ext === 'XLSX') {
              fileType = ext;
            }
          }

          return {
            _id: item._id,
            policyNumber: item.policyNumber || '',
            title: item.title || '',
            category: item.category || '',
            version: item.version || '',
            effectiveDate: item.effectiveDate || new Date().toISOString(),
            reviewDate: item.reviewDate || new Date().toISOString(),
            status: item.status || 'draft',
            documentType: item.documentType || 'policy',
            fileUrl: item.fileUrl || '',
            fileName: item.fileName || '',
            fileType: fileType || 'PDF',
            owner: item.owner || item.createdBy?.name || '',
            assignedRoles: item.assignedRoles || 'All Staff',
            acknowledged: item.acknowledged || 0,
            totalEmployees: item.totalEmployees || 0,
            renewalCycle: item.renewalCycle || 12
          };
        }));
      } else {
        showNotification('error', response?.message || 'Failed to fetch policies');
      }
    } catch (error: any) {
      console.error('Error fetching policies:', error);
      showNotification('error', error?.response?.data?.message || 'Failed to fetch policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [filterStatus, filterCategory, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'under-review': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-card text-primary';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-card text-primary';
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF': return <FaFilePdf className="text-red-500" />;
      case 'DOCX': return <FaFileWord className="text-blue-500" />;
      case 'TXT': return <FaFileAlt className="text-secondary" />;
      default: return <FaFile className="text-secondary" />;
    }
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch =
      policy.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || policy.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || policy.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleExportReport = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Company Policy Management';
      const sheet = workbook.addWorksheet('Policies', { views: [{ state: 'frozen', ySplit: 1 }] });
      sheet.addRow(['Policy #', 'Title', 'Category', 'Version', 'Effective Date', 'Review Date', 'Status', 'Assigned Roles', 'Acknowledgment', 'Compliance %']);
      filteredPolicies.forEach((p: Policy) => {
        const compliancePct = p.totalEmployees && p.totalEmployees > 0
          ? ((p.acknowledged / p.totalEmployees) * 100).toFixed(1) + '%'
          : 'N/A';
        sheet.addRow([
          p.policyNumber,
          p.title,
          p.category,
          p.version,
          p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString() : '',
          p.reviewDate ? new Date(p.reviewDate).toLocaleDateString() : '',
          p.status,
          p.assignedRoles || '',
          `${p.acknowledged}/${p.totalEmployees || 0}`,
          compliancePct
        ]);
      });
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      sheet.columns.forEach((col) => {
        let maxLen = 12;
        col.eachCell?.({ includeEmpty: true }, cell => {
          const val = cell.value?.toString() ?? '';
          maxLen = Math.min(Math.max(maxLen, val.length), 50);
        });
        col.width = maxLen;
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Company-Policies-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showNotification('success', 'Report exported successfully');
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to export report');
    }
  };

  const renderPolicyDashboard = () => {
    const activePolicies = policies.filter(p => p.status === 'active');
    const upcomingReviewPolicies = policies.filter(p => {
      const reviewDate = new Date(p.reviewDate).getTime();
      const today = new Date().getTime();
      const daysUntilReview = (reviewDate - today) / (1000 * 3600 * 24);

      return daysUntilReview > 0 && daysUntilReview <= 90;
    });


    // We define non-compliant as having less than 95% acknowledgment for audit focus
    const nonCompliantAcknowledgment = activePolicies.filter(p => {
      if (!p.totalEmployees || p.totalEmployees === 0) return false;
      return (p.acknowledged / p.totalEmployees) < 0.95;
    });

    // Calculate unique categories from actual policies data
    const uniqueCategories = new Set(policies.map(p => p.category).filter(Boolean));
    const policyCategoriesCount = uniqueCategories.size;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          <div className="bg-card p-5 rounded-xl shadow-md border-l-4 border-purple-500">
            <p className="text-sm font-medium text-secondary">Total Active Policies</p>
            <p className="text-3xl font-bold text-purple-700">{activePolicies.length}</p>
            <span className='text-xs text-secondary'>Ensures all mandatory policies are covered.</span>
          </div>


          <div className="bg-card p-5 rounded-xl shadow-md border-l-4 border-yellow-500">
            <p className="text-sm font-medium text-secondary">Upcoming Reviews (90 days)</p>
            <p className="text-3xl font-bold text-yellow-700">{upcomingReviewPolicies.length}</p>
            <span className='text-xs text-secondary'>Notifications sent to H&S Manager.</span>
          </div>


          <div className="bg-card p-5 rounded-xl shadow-md border-l-4 border-red-500">
            <p className="text-sm font-medium text-secondary">Acknowledgment Risk</p>
            <p className="text-3xl font-bold text-red-700">
              {nonCompliantAcknowledgment.length}
            </p>
            <span className='text-xs text-secondary'>Policies &lt; 95% **Read Receipts** tracked.</span>
          </div>


          <div className="bg-card p-5 rounded-xl shadow-md border-l-4 border-blue-500">
            <p className="text-sm font-medium text-secondary">Policy Categories Tracked</p>
            <p className="text-3xl font-bold text-blue-700">
              {policyCategoriesCount}
            </p>
            <span className='text-xs text-secondary'>Includes Safety, HR, Driver, Wellness, Shop/Yard.</span>
          </div>
        </div>


        <div className="bg-card rounded-xl shadow-lg overflow-hidden p-6">
          <h3 className="text-xl font-bold mb-4 text-headings flex items-center gap-2"><FaUserTimes /> Acknowledgment Audit Report</h3>
          <p className='text-sm text-secondary mb-4'>Audit-ready list showing policies where mandatory acknowledgment (Read Receipts) is missing for the **current version**.</p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-theme divide-white/5">
              <thead className="bg-card">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Policy Title (Version)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Assigned Roles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Unacknowledged</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Compliance %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-theme divide-white/5">
                {nonCompliantAcknowledgment.map(p => (
                  <tr key={p._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{p.title} <span className='text-secondary font-normal'>v.**{p.version}**</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{p.assignedRoles}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#A855F7]">{p.totalEmployees - p.acknowledged} employees</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {p.totalEmployees && p.totalEmployees > 0
                        ? ((p.acknowledged / p.totalEmployees) * 100).toFixed(1)
                        : '0'}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          setSelectedPolicy(p);
                          setShowAcknowledgmentModal(true);
                        }}
                        className='text-xs text-purple-600 hover:underline mr-2'
                      >
                        View Acknowledgment Details
                      </button>
                      <button className='text-xs text-[#00D1FF] hover:underline'>
                        Send Mandatory Reminder
                      </button>
                    </td>
                  </tr>
                ))}
                {nonCompliantAcknowledgment.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-green-600 font-semibold">All policies meet the 95% acknowledgment threshold. <FaCheckCircle className='inline ml-2' /></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  const PolicyUploadModal = ({ onClose, onUpload }: { onClose: () => void; onUpload: (data: any) => void }) => {
    const [formData, setFormData] = useState<{
      title: string;
      policyNumber: string;
      category: string;
      documentType: string;
      effectiveDate: string;
      reviewDate: string;
      renewalCycle: number;
      assignedRoles: string[];
      owner: string;
      version: string;
      linkedTraining: string;
      file: File | null;
    }>({
      title: '',
      policyNumber: '',
      category: 'Safety',
      documentType: 'Policy',
      effectiveDate: '',
      reviewDate: '',
      renewalCycle: 12,
      assignedRoles: [],
      owner: '',
      version: '1.0',
      linkedTraining: '',
      file: null
    });

    return (
      <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-card">
            <h2 className="text-2xl font-bold text-headings">Upload New Policy/SOP</h2>
            <button onClick={onClose} className="text-secondary hover:text-primary">
              <FaTimes size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-headings">Policy Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Fueling Operations SOP"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-headings">Policy Number *</label>
                <input
                  type="text"
                  placeholder="e.g., SOP-D-001"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500"
                  value={formData.policyNumber}
                  onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-headings">Category *</label>
                <select
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {ALL_CATEGORIES.map(cat => <option className='form-option' key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-headings">Document Type *</label>
                <select
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500"
                  value={formData.documentType}
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                >
                  <option className='form-option' value="Policy">Policy</option>
                  <option className='form-option' value="SOP">SOP</option>
                  <option className='form-option' value="Procedure">Procedure</option>
                  <option className='form-option' value="Form">Form</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-headings">Effective Date *</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-headings">Review Date *</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500"
                  value={formData.reviewDate}
                  onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-headings">Renewal Cycle (months) *</label>
                <select
                  value={formData.renewalCycle}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      renewalCycle: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                >
                  <option  value={12} className='form-option'>
                    12 months
                  </option>

                  <option value={24} className='form-option'>
                    24 months
                  </option>

                  <option value={36} className='form-option'>
                    36 months
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-headings">Policy Owner *</label>
                <select
                  value={formData.owner}
                  onChange={(e) =>
                    setFormData({ ...formData, owner: e.target.value })
                  }
                  className="w-full px-4 py-3 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                >
                  <option
                    value=""
                    className='form-option'
                  >
                    Select Owner
                  </option>

                  <option className='form-option'>
                    Safety Manager
                  </option>

                  <option className='form-option'>
                    HR Manager
                  </option>

                  <option className='form-option'>
                    Operations Manager
                  </option>

                  <option className='form-option'>
                    Fleet Manager
                  </option>

                  <option className='form-option'>
                    Yard Supervisor
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-headings">Version Number</label>
                <input
                  type="text"
                  placeholder="1.0"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-headings">Link to Training (Optional)</label>
                <input
                  type="text"
                  placeholder="Training ID"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500"
                  value={formData.linkedTraining}
                  onChange={(e) => setFormData({ ...formData, linkedTraining: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-headings">Assign to Roles *</label>
                <div className="grid grid-cols-3 gap-3">
                  {['All Staff', 'Drivers', 'Mechanics', 'Warehouse Staff', 'Office Staff', 'Managers'].map(role => (
                    <label key={role} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={formData.assignedRoles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, assignedRoles: [...formData.assignedRoles, role] });
                          } else {
                            setFormData({ ...formData, assignedRoles: formData.assignedRoles.filter(r => r !== role) });
                          }
                        }}
                      />
                      <span className="text-sm">{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">Upload Policy Document *</label>
                <div
                  className="border-2 border-dashed border-theme rounded-lg p-8 text-center hover:border-purple-500 transition cursor-pointer"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <FaUpload size={32} className="mx-auto mb-3 text-secondary" />
                  <p className="text-sm text-secondary mb-2">Click to upload or drag and drop</p>
                  <p className="text-xs text-secondary">PDF, DOCX, TXT up to 50MB</p>
                  {formData.file && (
                    <p className="text-sm text-green-600 mt-2">✓ {formData.file.name}</p>
                  )}
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, file: file });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  if (formData.title && formData.policyNumber && formData.effectiveDate && formData.reviewDate) {
                    onUpload(formData);
                  } else {
                    alert('Please fill in all required fields');
                  }
                }}

                className="flex-1 px-6 py-3 !text-white rounded-lg font-semibold hover:opacity-90 transition bg-[var(--accent-navyblue)]"
              >
                Upload Policy & Assign to Employees
              </button>
              <button onClick={onClose} className="px-6 py-3 bg-card border border-theme text-headings rounded-lg font-semibold hover:bg-[var(--accent-navyblue)]/20 transition ">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const EmployeeAcknowledgmentModal = ({ policy, onClose, onAcknowledge }: {
    policy: Policy;
    onClose: () => void;
    onAcknowledge: (data: any) => void
  }) => {
    const [signature, setSignature] = useState('');
    const [agreed, setAgreed] = useState(false);

    const handleAcknowledge = () => {
      const acknowledgment = {
        policyId: policy._id,
        policyVersion: policy.version,
        employeeName: 'Current User', // Would come from auth
        signature: signature,
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.100', // Would be captured server-side
        deviceUsed: navigator.userAgent
      };
      onAcknowledge(acknowledgment);
    };

    return (
      <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b sticky top-0 bg-card">
            <h2 className="text-2xl font-bold text-red-700">Policy Acknowledgment Required</h2>
            <p className="text-secondary">{policy.title} (Version {policy.version})</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Policy Document Display */}
            <div className="bg-card border-2 border-theme rounded-lg p-6 max-h-96 overflow-y-auto">
              <h3 className="font-bold mb-4">Policy Document</h3>
              <div className="aspect-[8.5/11] bg-card rounded shadow-inner flex items-center justify-center">
                <div className="text-center text-secondary">
                  <FaFilePdf size={64} className="mx-auto mb-4" />
                  <p>Policy PDF would display here</p>
                  <button className="mt-4 px-4 py-2 !text-white rounded hover:opacity-90" style={{ background: CUSTOM_COLORS.primary }}>
                    View Full Document
                  </button>
                </div>
              </div>
            </div>

            {/* Acknowledgment Agreement */}
            <div className="bg-card border-2 border-yellow-400 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm">
                  <strong>I acknowledge that:</strong> I have read, understood, and agree to comply with
                  the {policy.title} (Version {policy.version}). I understand that failure to comply may
                  result in disciplinary action up to and including termination.
                </span>
              </label>
            </div>

            {/* Digital Signature */}
            <div>
              <label className="block text-sm font-semibold mb-2">Digital Signature *</label>
              <input
                type="text"
                placeholder="Type your full name to sign"
                className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
              <p className="text-xs text-secondary mt-2">
                By typing your name, you are providing a legally binding electronic signature
              </p>
            </div>

            {/* Timestamp Info */}
            <div className="bg-card border border-blue-200 rounded-lg p-4 text-sm">
              <p><strong>Acknowledgment Details (for audit trail):</strong></p>
              <p>Date/Time: {new Date().toLocaleString()}</p>
              <p>IP Address: Will be recorded</p>
              <p>Policy Version: {policy.version}</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleAcknowledge}
                disabled={!agreed || !signature}
                className="flex-1 px-6 py-3 bg-green-600 !text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <FaCheckCircle className="inline mr-2" /> Submit Acknowledgment
              </button>
              <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-primary rounded-lg font-semibold hover:bg-gray-300 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 4. VERSION HISTORY MODAL
  const VersionHistoryModal = ({ policy, onClose }: { policy: Policy; onClose: () => void }) => {
    const versions = [
      { version: policy.version, date: policy.effectiveDate, changes: 'Current version', publishedBy: policy.owner, status: 'Current' },
      { version: '2.0', date: '2023-01-01', changes: 'Updated safety protocols', publishedBy: 'Safety Manager', status: 'Archived' },
      { version: '1.0', date: '2022-01-01', changes: 'Initial release', publishedBy: 'Safety Manager', status: 'Archived' }
    ];

    return (
      <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b sticky top-0 bg-card flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Version History</h2>
              <p className="text-secondary">{policy.title}</p>
            </div>
            <button onClick={onClose} className="text-secondary hover:text-primary">
              <FaTimes size={24} />
            </button>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {versions.map((v, idx) => (
                <div key={idx} className={`border-2 rounded-lg p-4 ${v.status === 'Current' ? 'border-green-500 bg-green-50' : 'border-theme'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold">Version {v.version}</h3>
                      <p className="text-sm text-secondary">Published: {new Date(v.date).toLocaleDateString()}</p>
                      <p className="text-sm text-secondary">By: {v.publishedBy}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${v.status === 'Current' ? 'bg-green-100 text-green-800' : 'bg-card text-primary'
                      }`}>
                      {v.status}
                    </span>
                  </div>
                  <p className="text-sm mb-3">{v.changes}</p>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 !text-white rounded hover:opacity-90 text-sm" style={{ background: CUSTOM_COLORS.primary }}>
                      <FaEye className="inline mr-1" /> View
                    </button>
                    <button className="px-4 py-2 bg-green-600 !text-white rounded hover:bg-green-700 text-sm">
                      <FaDownload className="inline mr-1" /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };



  const renderPolicyLibrary = () => (
    <>
      {/* Filters and Search */}
      <div className="bg-card rounded-xl p-4 shadow-lg mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search policies by title, number, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <FaFilter className="text-secondary" />
            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
            >
              <option value="all" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                All Status
              </option>

              <option value="active" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Active
              </option>

              <option value="under-review" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Under Review
              </option>

              <option value="draft" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Draft
              </option>

              <option value="expired" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Expired
              </option>
            </select>
            {/* Filter by Category */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {ALL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Policies Table - Version Control & Renewal Tracking */}
      <div className="bg-card rounded-xl shadow-lg overflow-hidden">
        {/* Top Scrollbar */}
        <div
          ref={topScrollRef}
          className="overflow-x-auto overflow-y-hidden"
          style={{ height: '17px' }}
          onScroll={() => {
            if (topScrollRef.current && bottomScrollRef.current) {
              bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
            }
          }}
        >
          <div style={{ width: 'fit-content', minWidth: '100%', height: '1px' }}>
            {/* Spacer to create scrollable width - matches table width */}
            <div style={{ width: '1400px', height: '1px' }}></div>
          </div>
        </div>

        {/* Main Table with Bottom Scrollbar */}
        <div
          ref={bottomScrollRef}
          className="overflow-x-auto"
          onScroll={() => {
            if (topScrollRef.current && bottomScrollRef.current) {
              topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
            }
          }}
        >
          <table className="w-full">
            <thead >
              <tr>
                <th className="px-6 py-4 text-left text-headings font-semibold">Policy #</th>
                <th className="px-6 py-4 text-left text-headings font-semibold">Title / Document Type</th>
                <th className="px-6 py-4 text-left text-headings font-semibold">Category</th>
                <th className="px-6 py-4 text-left text-headings font-semibold">Assigned Roles</th>
                <th className="px-6 py-4 text-left text-headings font-semibold">Document</th>
                <th className="px-6 py-4 text-left text-headings font-semibold">Version / Effective Date</th>
                <th className="px-6 py-4 text-left text-headings font-semibold">Next Review (Renewal Cycle)</th>
                <th className="px-6 py-4 text-left text-headings font-semibold">Acknowledgment</th>
                <th className="px-6 py-4 text-left text-headings font-semibold">Status</th>
                <th className="px-6 py-4 text-left text-headings font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-secondary">
                    {loading ? 'Loading policy data...' : 'No policies match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((policy) => (
                  <tr
                    key={policy._id}
                    onClick={() => {
                      setSelectedPolicy(policy);
                      setShowVersionHistoryModal(true);
                    }}
                    className="border-b border-theme hover:bg-[rgba(255,255,255,0.03)] cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium">{policy.policyNumber || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-medium">
                        {getFileIcon(policy.fileType || 'PDF')} {policy.title || 'N/A'}
                      </div>

                      <div className="mt-1">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                          {policy.documentType || 'N/A'}
                        </span>
                        {policy.fileType && (
                          <span className="ml-2 px-2 py-1 bg-card text-primary rounded-full text-xs">
                            {policy.fileType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{policy.category || 'N/A'}</td>

                    <td className="px-6 py-4 text-sm">
                      {policy.assignedRoles ? (
                        <div className="max-w-xs">
                          <span className="inline-block px-2 py-1 bg-card text-blue-700 rounded text-xs break-words">
                            {policy.assignedRoles}
                          </span>
                        </div>
                      ) : (
                        <span className="text-secondary text-xs">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {policy.fileUrl ? (
                        <div className="flex flex-col gap-1">
                          {policy.fileType && (
                            <span className="text-xs text-secondary">
                              {policy.fileType}
                            </span>
                          )}
                          {policy.fileName ? (
                            <span className="text-xs text-primary truncate max-w-xs" title={policy.fileName}>
                              {policy.fileName}
                            </span>
                          ) : (
                            <span className="text-xs text-green-600">✓ Document attached</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-secondary">No document</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">

                      <FaSyncAlt className='inline mr-1 text-secondary text-xs' /> v.**{policy.version}**
                      <p className='text-xs text-secondary'>Effective: {new Date(policy.effectiveDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">

                      <FaCalendarAlt className="inline mr-1 text-yellow-500" />
                      {new Date(policy.reviewDate).toLocaleDateString()}
                      <p className='text-xs text-secondary'>Cycle: **{policy.renewalCycle} months**</p>
                    </td>
                    <td className="px-6 py-4 text-sm">

                      <div className='flex items-center'>
                        <FaClipboardCheck className='text-green-500 mr-2' />
                        <span className='font-bold text-primary'>
                          {policy.acknowledged}/{policy.totalEmployees} Signed
                        </span>
                      </div>
                      <span className='text-xs text-secondary'>Read Receipts for Audit</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(policy.status)}`}>
                        {policy.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPolicy(policy);
                            setShowVersionHistoryModal(true);
                          }}
                          className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition"
                          title="View Version History"
                        >
                          <FaSyncAlt />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPolicy(policy);
                            setShowAcknowledgmentModal(true);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="View Acknowledgment Status"
                        >
                          <FaClipboardCheck />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPolicy(policy, 'inline');
                          }}
                          className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition"
                          title="View Policy"
                          disabled={!policy.fileUrl}
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPolicy(policy, 'attachment');
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Download Policy"
                          disabled={!policy.fileUrl}
                        >
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
    </>
  );

  return (
    <div className="min-h-screen p-6 bg-main">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[10001] space-y-2">
        {notifications.map(notification => (
          <ToastNotificationComponent
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>
      <div className="w-full mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-headings"
            >
              Company Policy Management & Renewal Tracking 📑
            </h1>
            <p className="text-secondary">Centralized policy library, version control, and **mandatory acknowledgment tracking** for CLC compliance.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReport}
              className="px-4 py-2 bg-green-600 !text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 font-semibold"
            >
              <FaDownload /> Export Report
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 rounded-lg !text-white shadow-md hover:opacity-90 transition flex items-center gap-2 font-semibold bg-[var(--accent-navyblue)]"

            >
              <FaPlus /> Upload New Policy
            </button>
          </div>
        </div>

        {/* Tabs for Dashboard and Library (Serving as Sub-Menus) */}
        <div className="bg-card rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-theme">
            {/* Sub-Menu 1: Compliance Dashboard (Audit View) */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 px-6 py-4 font-semibold transition ${activeTab === 'dashboard' ? 'border-b-2 text-purple-600' : 'text-secondary hover:text-primary'
                }`}
              style={activeTab === 'dashboard' ? { borderColor: CUSTOM_COLORS.primary } : {}}
            >
              <FaChartPie className="inline mr-2" /> Compliance Dashboard (Audit View)
            </button>
            {/* Sub-Menu 2: Policy Library (Management View) */}
            <button
              onClick={() => setActiveTab('library')}
              className={`flex-1 px-6 py-4 font-semibold transition ${activeTab === 'library' ? 'border-b-2 text-purple-600' : 'text-secondary hover:text-primary'
                }`}
              style={activeTab === 'library' ? { borderColor: CUSTOM_COLORS.primary } : {}}
            >
              <FaFileAlt className="inline mr-2" /> Policy Library (Version & Renewal Control)
            </button>
          </div>
        </div>

        {/* Content Render */}
        {activeTab === 'dashboard' ? renderPolicyDashboard() : renderPolicyLibrary()}
      </div>

      {/* Modals */}
      {showUploadModal && (
        <PolicyUploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={async (data) => {
            try {
              const formData = new FormData();
              formData.append('title', data.title);
              formData.append('category', data.category);
              formData.append('version', data.version);
              formData.append('effectiveDate', data.effectiveDate);
              formData.append('reviewDate', data.reviewDate);
              formData.append('status', 'draft');
              formData.append('documentType', data.documentType.toLowerCase());

              if (data.file) {
                formData.append('file', data.file);
              }

              const response = await createPolicyDocument(formData);
              if (response?.success) {
                showNotification('success', 'Policy document created successfully');
                setShowUploadModal(false);
                fetchPolicies();
              } else {
                showNotification('error', response?.message || 'Failed to create policy document');
              }
            } catch (error: any) {
              console.error('Error creating policy document:', error);
              showNotification('error', error?.response?.data?.message || 'Failed to create policy document');
            }
          }}
        />
      )}

      {showAcknowledgmentModal && selectedPolicy && (
        <EmployeeAcknowledgmentModal
          policy={selectedPolicy}
          onClose={() => {
            setShowAcknowledgmentModal(false);
            setSelectedPolicy(null);
          }}
          onAcknowledge={(data) => {
            console.log('Acknowledgment submitted:', data);
            // Update policy acknowledgment count
            setPolicies(prev => prev.map(p =>
              p._id === selectedPolicy._id
                ? { ...p, acknowledged: p.acknowledged + 1 }
                : p
            ));
            setShowAcknowledgmentModal(false);
            setSelectedPolicy(null);
          }}
        />
      )}

      {showVersionHistoryModal && selectedPolicy && (
        <VersionHistoryModal
          policy={selectedPolicy}
          onClose={() => {
            setShowVersionHistoryModal(false);
            setSelectedPolicy(null);
          }}
        />
      )}
    </div>
  );
};

export default PolicyManagementModule;
