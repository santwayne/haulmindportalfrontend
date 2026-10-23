import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import {
  FaClipboardCheck, FaCheckCircle, FaPlus, FaEye,
  FaSearch, FaMapMarkerAlt, FaUser,
  FaTools, FaCamera, FaTimes, FaClock,
  FaExclamationTriangle, FaInfoCircle,
  FaHistory, FaEdit, FaTrash, FaDownload
} from 'react-icons/fa';
import {
  createInspection,
  getInspections,
  updateInspection,
  deleteInspection
} from '../../../../axios/api/healthSafety';



interface ChecklistItem {
  id: string;
  question: string;
  status: 'pass' | 'fail' | 'na' | 'pending';
  notes?: string;
  photoRequired: boolean;
  photos?: string[];
}

interface CorrectiveAction {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'completed' | 'overdue';
  completedDate?: string;
  verifiedBy?: string;
}

interface Inspection {
  _id: string;
  inspectionNumber: string;
  type: 'Yard Inspection' | 'Shop Safety' | 'Fire Extinguisher Check' | 'Reefer Food Safety' |
  'PPE Inspection' | 'Emergency Exit/Eyewash' | 'Equipment' | 'Vehicle' |
  'Workplace Safety' | 'Hazard Assessment' | 'Regulatory';
  category: 'Scheduled' | 'Routine' | 'Follow-up' | 'Complaint-Based' | 'Incident-Based' | 'Regulatory';
  status: 'scheduled' | 'in-progress' | 'completed' | 'overdue' | 'cancelled' | 'action-required';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledDate: string;
  completedDate?: string;
  dueDate: string;
  location: string;
  locationType: 'warehouse' | 'yard' | 'shop' | 'office' | 'vehicle' | 'other';
  inspector: string;
  inspectorId?: string;
  inspectedBy?: string;
  checklist: ChecklistItem[];
  findings: {
    total: number;
    critical: number;
    major: number;
    minor: number;
    resolved: number;
  };
  complianceStatus: 'compliant' | 'non-compliant' | 'partial' | 'pending';
  correctiveActions: CorrectiveAction[];
  notes?: string;
  documentUrl?: string;
  photoEvidence: Array<{
    fileUrl: string;
    fileName: string;
    uploadedAt: string;
    uploadedBy: string;
  }>;
  relatedIncidentId?: string;
  auditTrail: Array<{
    action: string;
    user: string;
    timestamp: string;
    details: string;
  }>;
}

const INSPECTION_TYPES = [
  { value: 'Yard Inspection', icon: '🚛', description: 'Yard safety and traffic flow' },
  { value: 'Shop Safety', icon: '🔧', description: 'Workshop and maintenance area' },
  { value: 'Fire Extinguisher Check', icon: '🧯', description: 'Fire safety equipment' },
  { value: 'Reefer Food Safety', icon: '❄️', description: 'Trailer cleanliness and sanitation' },
  { value: 'PPE Inspection', icon: '🦺', description: 'Personal protective equipment' },
  { value: 'Emergency Exit/Eyewash', icon: '🚪', description: 'Emergency facilities' },
  { value: 'Equipment', icon: '⚙️', description: 'General equipment safety' },
  { value: 'Vehicle', icon: '🚐', description: 'Vehicle safety inspection' },
  { value: 'Workplace Safety', icon: '🏢', description: 'General workplace safety' },
  { value: 'Hazard Assessment', icon: '⚠️', description: 'Risk and hazard evaluation' },
  { value: 'Regulatory', icon: '📋', description: 'Compliance audit' },
];

type ChecklistTemplateKey = 'Fire Extinguisher Check' | 'Reefer Food Safety' | 'PPE Inspection' | 'Emergency Exit/Eyewash' | 'Yard Inspection' | 'Shop Safety';

interface ChecklistTemplateItem {
  question: string;
  photoRequired: boolean;
}

const CHECKLIST_TEMPLATES: Record<ChecklistTemplateKey, ChecklistTemplateItem[]> = {
  'Fire Extinguisher Check': [
    { question: 'Extinguisher accessible and unobstructed?', photoRequired: true },
    { question: 'Pressure gauge in green zone?', photoRequired: true },
    { question: 'Pin and tamper seal intact?', photoRequired: false },
    { question: 'Inspection tag current (monthly)?', photoRequired: true },
    { question: 'No visible damage or corrosion?', photoRequired: false },
    { question: 'Signage visible and legible?', photoRequired: false },
  ],
  'Reefer Food Safety': [
    { question: 'Interior walls clean and free of debris?', photoRequired: true },
    { question: 'Floor clean and sanitized?', photoRequired: true },
    { question: 'Drain plugs sealed and functioning?', photoRequired: false },
    { question: 'No odors or contamination present?', photoRequired: false },
    { question: 'Temperature logs up to date?', photoRequired: true },
    { question: 'Refrigeration unit functioning properly?', photoRequired: false },
  ],
  'PPE Inspection': [
    { question: 'Hard hats available and in good condition?', photoRequired: true },
    { question: 'Safety glasses/goggles available?', photoRequired: false },
    { question: 'High-visibility vests available?', photoRequired: true },
    { question: 'Steel-toed boots worn by all personnel?', photoRequired: false },
    { question: 'Gloves appropriate for tasks?', photoRequired: false },
    { question: 'Hearing protection available where required?', photoRequired: false },
  ],
  'Emergency Exit/Eyewash': [
    { question: 'Emergency exits clearly marked?', photoRequired: true },
    { question: 'Exit paths clear and unobstructed?', photoRequired: true },
    { question: 'Emergency lighting functional?', photoRequired: false },
    { question: 'Eyewash station accessible within 10 seconds?', photoRequired: true },
    { question: 'Eyewash water flow test passed?', photoRequired: false },
    { question: 'First aid kit stocked and accessible?', photoRequired: true },
  ],
  'Yard Inspection': [
    { question: 'Traffic lanes clearly marked?', photoRequired: true },
    { question: 'Lighting adequate for night operations?', photoRequired: false },
    { question: 'No slip/trip hazards present?', photoRequired: true },
    { question: 'Dock plates secured and in good condition?', photoRequired: false },
    { question: 'Spill containment equipment available?', photoRequired: true },
    { question: 'Vehicle parking areas organized?', photoRequired: false },
  ],
  'Shop Safety': [
    { question: 'Equipment guards in place and functional?', photoRequired: true },
    { question: 'Lockout/tagout procedures posted?', photoRequired: true },
    { question: 'Chemical storage properly labeled (WHMIS)?', photoRequired: true },
    { question: 'Ventilation systems functioning?', photoRequired: false },
    { question: 'Work areas clean and organized (5S)?', photoRequired: false },
    { question: 'Waste disposal containers available?', photoRequired: false },
  ],
};

interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const ToastNotificationComponent = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationTriangle className="text-red-500" size={24} />,
    info: <FaInfoCircle className="text-blue-500" size={24} />,
    warning: <FaExclamationTriangle className="text-yellow-500" size={24} />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
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

const SafetyInspections: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentTab, setCurrentTab] = useState('all');
  const [showNewInspectionModal, setShowNewInspectionModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] = useState<Inspection | null>(null);

  // Toast notification helpers
  const addNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Fetch all inspections on initial render (without filters)
  useEffect(() => {
    fetchInspections(false); // false = don't apply filters, fetch all
  }, []);

  // Fetch inspections when filters change
  useEffect(() => {
    // Skip initial render (when filters are still 'all')
    const isInitial = filterStatus === 'all' && filterType === 'all';
    if (!isInitial) {
      fetchInspections(true); // true = apply filters
    }
  }, [filterStatus, filterType]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchInspections();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchInspections = async (applyFilters = true) => {
    setLoading(true);
    try {
      const params: any = {};

      if (applyFilters) {
        if (filterStatus !== 'all') {
          params.status = filterStatus;
        }
        if (filterType !== 'all') {
          params.type = filterType;
        }
        if (searchTerm) {
          params.search = searchTerm;
        }
      }

      // Always call API, even if no params (to get all inspections)
      const apiParams = Object.keys(params).length > 0 ? params : undefined;
      console.log('Fetching inspections with params:', apiParams);
      const response = await getInspections(apiParams);
      console.log('Inspections API response:', response);

      if (response?.success && Array.isArray(response.data)) {
        console.log(`Fetched ${response.data.length} inspections`);
        // Map API response to frontend format
        const mappedInspections = response.data.map((inspection: any) => {
          // Calculate findings summary from findings array
          const findingsArray = Array.isArray(inspection.findings) ? inspection.findings : [];
          const findingsSummary = {
            total: findingsArray.length,
            critical: findingsArray.filter((f: any) => f.severity === 'critical').length,
            major: findingsArray.filter((f: any) => f.severity === 'high').length,
            minor: findingsArray.filter((f: any) => f.severity === 'medium' || f.severity === 'low').length,
            resolved: findingsArray.filter((f: any) => f.status === 'resolved' || f.status === 'closed').length
          };

          // Map findings to checklist format if needed
          const checklist: ChecklistItem[] = findingsArray.map((finding: any, idx: number) => ({
            id: finding._id || `finding-${idx}`,
            question: finding.description || '',
            status: finding.status === 'resolved' || finding.status === 'closed' ? 'pass' :
              finding.severity === 'critical' || finding.severity === 'high' ? 'fail' : 'pending',
            notes: finding.correctiveAction || '',
            photoRequired: false,
            photos: []
          }));

          return {
            _id: inspection._id,
            inspectionNumber: inspection.inspectionNumber,
            type: inspection.type as Inspection['type'],
            category: 'Scheduled' as Inspection['category'], // Default, backend doesn't have this
            status: inspection.status as Inspection['status'],
            priority: 'medium' as Inspection['priority'], // Default, backend doesn't have this
            scheduledDate: inspection.scheduledDate ? new Date(inspection.scheduledDate).toISOString().split('T')[0] :
              inspection.date ? new Date(inspection.date).toISOString().split('T')[0] :
                new Date().toISOString().split('T')[0],
            completedDate: inspection.completedDate ? new Date(inspection.completedDate).toISOString().split('T')[0] : undefined,
            dueDate: inspection.scheduledDate ? new Date(inspection.scheduledDate).toISOString().split('T')[0] :
              inspection.date ? new Date(inspection.date).toISOString().split('T')[0] :
                new Date().toISOString().split('T')[0],
            location: inspection.location,
            locationType: 'other' as Inspection['locationType'], // Default
            inspector: inspection.inspector,
            inspectorId: inspection.createdBy?._id,
            inspectedBy: inspection.inspector,
            checklist: checklist.length > 0 ? checklist : [],
            findings: findingsSummary,
            complianceStatus: findingsSummary.total === 0 ? 'compliant' :
              findingsSummary.critical > 0 ? 'non-compliant' :
                findingsSummary.major > 0 ? 'partial' : 'compliant',
            correctiveActions: [], // Backend doesn't have this structure
            notes: inspection.notes || '',
            documentUrl: undefined,
            photoEvidence: [],
            relatedIncidentId: undefined,
            auditTrail: [
              {
                action: 'Created',
                user: inspection.createdBy?.name || 'System',
                timestamp: inspection.createdAt || new Date().toISOString(),
                details: 'Inspection created'
              }
            ]
          };
        });

        setInspections(mappedInspections);
      } else {
        if (response?.success && !Array.isArray(response.data)) {
          console.error('Invalid response format:', response);
          addNotification('error', 'Invalid data format received from server');
        } else {
          addNotification('error', response?.message || 'Failed to fetch inspections');
        }
      }
    } catch (error: any) {
      addNotification('error', error?.message || 'Error fetching inspections');
    } finally {
      setLoading(false);
    }
  };


  const stats = {
    total: inspections.length,
    scheduled: inspections.filter(i => i.status === 'scheduled').length,
    inProgress: inspections.filter(i => i.status === 'in-progress').length,
    completed: inspections.filter(i => i.status === 'completed').length,
    overdue: inspections.filter(i => i.status === 'overdue').length,
    actionRequired: inspections.filter(i => i.status === 'action-required').length,
    compliant: inspections.filter(i => i.complianceStatus === 'compliant').length,
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      'action-required': 'bg-orange-100 text-orange-800',
      cancelled: 'bg-card text-primary',
    };
    return styles[status] || 'bg-card text-primary';
  };

  const filteredInspections = inspections.filter(i => {
    const matchesSearch = i.inspectionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || i.type === filterType;
    const matchesStatus = filterStatus === 'all' || i.status === filterStatus;
    const matchesTab = currentTab === 'all' || i.status === currentTab;
    return matchesSearch && matchesType && matchesStatus && matchesTab;
  });

  const handleExportReport = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Safety Inspections & Audits';
      const sheet = workbook.addWorksheet('Inspections', { views: [{ state: 'frozen', ySplit: 1 }] });
      sheet.addRow(['Inspection #', 'Type', 'Category', 'Location', 'Inspector', 'Date', 'Status', 'Findings', 'Compliance']);
      filteredInspections.forEach((i: Inspection) => {
        const findingsStr = i.findings.total === 0 ? 'No Issues' : `${i.findings.critical} Critical, ${i.findings.major} Major`;
        sheet.addRow([
          i.inspectionNumber,
          i.type,
          i.category,
          i.location,
          i.inspector,
          i.scheduledDate ? new Date(i.scheduledDate).toLocaleDateString() : 'N/A',
          i.status,
          findingsStr,
          i.complianceStatus || ''
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
      a.download = `Safety-Inspections-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification('success', 'Report exported successfully');
    } catch (err: any) {
      addNotification('error', err?.message || 'Failed to export report');
    }
  };

  const handleCreateInspection = async (formData: any) => {
    try {
      if (!formData.type || !formData.location || !formData.inspector || !formData.scheduledDate) {
        addNotification('error', 'Please fill in all required fields: Type, Location, Inspector, and Scheduled Date');
        return;
      }

      const payload = {
        date: formData.scheduledDate || formData.date, // Use scheduledDate as the main date
        type: formData.type,
        inspector: formData.inspector.trim(),
        location: formData.location.trim(),
        status: formData.status || 'scheduled',
        notes: formData.notes || '',
        scheduledDate: formData.scheduledDate,
        completedDate: formData.completedDate || null,
        findings: [],
        hazards: []
      };

      const response = await createInspection(payload);

      if (response?.success) {
        addNotification('success', 'Inspection created successfully');
        setShowNewInspectionModal(false);
        await fetchInspections(false); // Fetch all inspections without filters
      } else {
        const errorMsg = response?.message || 'Failed to create inspection';
        addNotification('error', errorMsg);
        console.error('Create inspection error:', response);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Error creating inspection';
      addNotification('error', errorMsg);
      console.error('Create inspection exception:', error);
    }
  };

  const handleUpdateInspection = async (inspectionId: string, updateData: any) => {
    try {
      const response = await updateInspection(inspectionId, updateData);
      if (response?.success) {
        addNotification('success', 'Inspection updated successfully');
        setEditingInspection(null);
        setShowNewInspectionModal(false);
        await fetchInspections(false); // Fetch all inspections
      } else {
        const errorMsg = response?.message || 'Failed to update inspection';
        addNotification('error', errorMsg);
        console.error('Update inspection error:', response);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Error updating inspection';
      addNotification('error', errorMsg);
      console.error('Update inspection exception:', error);
    }
  };

  const handleDeleteInspection = (inspection: Inspection) => {
    setInspectionToDelete(inspection);
    setShowDeleteModal(true);
  };

  const confirmDeleteInspection = async () => {
    if (!inspectionToDelete) return;

    try {
      const response = await deleteInspection(inspectionToDelete._id);
      if (response?.success) {
        addNotification('success', 'Inspection deleted successfully');
        setShowDetailModal(false);
        setSelectedInspection(null);
        setShowDeleteModal(false);
        setInspectionToDelete(null);
        await fetchInspections(false); // Fetch all inspections
      } else {
        const errorMsg = response?.message || 'Failed to delete inspection';
        addNotification('error', errorMsg);
        console.error('Delete inspection error:', response);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Error deleting inspection';
      addNotification('error', errorMsg);
      console.error('Delete inspection exception:', error);
    }
  };

  const NewInspectionModal = ({ editing }: { editing?: Inspection | null }) => {
    const [selectedType, setSelectedType] = useState(editing?.type || '');
    const [selectedLocation, setSelectedLocation] = useState(editing?.location || '');
    const [selectedInspector, setSelectedInspector] = useState(editing?.inspector || '');
    const [scheduledDate, setScheduledDate] = useState(
      editing?.scheduledDate || ''
    );
    const [dueDate, setDueDate] = useState(
      editing?.dueDate || editing?.scheduledDate || ''
    );
    const [priority, setPriority] = useState(editing?.priority || 'medium');
    const [notes, setNotes] = useState(editing?.notes || '');
    const [saving, setSaving] = useState(false);

    // Update form when editing changes
    useEffect(() => {
      if (editing) {
        setSelectedType(editing.type || '');
        setSelectedLocation(editing.location || '');
        setSelectedInspector(editing.inspector || '');
        setScheduledDate(editing.scheduledDate || '');
        setDueDate(editing.dueDate || editing.scheduledDate || '');
        setPriority(editing.priority || 'medium');
        setNotes(editing.notes || '');
      } else {
        // Reset form when not editing
        setSelectedType('');
        setSelectedLocation('');
        setSelectedInspector('');
        setScheduledDate('');
        setDueDate('');
        setPriority('medium');
        setNotes('');
      }
    }, [editing]);

    return (
      <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-card">
            <h2 className="text-2xl font-bold text-primary">
              {editing ? 'Edit Inspection' : 'Schedule New Inspection'}
            </h2>
            <button
              onClick={() => {
                setShowNewInspectionModal(false);
                setEditingInspection(null);
              }}
              className="text-secondary hover:text-primary"
            >
              <FaTimes size={24} />
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary">Inspection Type *</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option className='form-option' value="">Select Type...</option>
                  {INSPECTION_TYPES.map(type => (
                    <option className='form-option' key={type.value} value={type.value}>
                      {type.icon} {type.value} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary">Location *</label>
                <input
                  type="text"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  placeholder="e.g., Warehouse A, Trailer #4587"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary">Scheduled Date *</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary">Due Date *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary">Inspector *</label>
                <input
                  type="text"
                  value={selectedInspector}
                  onChange={(e) => setSelectedInspector(e.target.value)}
                  placeholder="Enter inspector name"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option className='form-option' value="low">Low</option>
                  <option className='form-option' value="medium">Medium</option>
                  <option className='form-option' value="high">High</option>
                  <option className='form-option' value="critical">Critical</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-primary">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {selectedType && CHECKLIST_TEMPLATES[selectedType as ChecklistTemplateKey] && (
              <div className="bg-card border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-3">📋 Standard Checklist Preview</h3>
                <div className="space-y-2">
                  {CHECKLIST_TEMPLATES[selectedType as ChecklistTemplateKey].slice(0, 3).map((item: ChecklistTemplateItem, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-blue-800">
                      <FaCheckCircle className="text-[#00D1FF]" />
                      <span>{item.question}</span>
                      {item.photoRequired && <FaCamera className="text-blue-400" size={12} />}
                    </div>
                  ))}
                  <p className="text-xs text-[#00D1FF] mt-2">
                    + {CHECKLIST_TEMPLATES[selectedType as ChecklistTemplateKey].length - 3} more items
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={async () => {
                  if (!selectedType || !selectedLocation || !selectedInspector || !scheduledDate) {
                    addNotification('error', 'Please fill in all required fields');
                    return;
                  }

                  setSaving(true);
                  try {
                    if (editing) {
                      // Update existing inspection
                      await handleUpdateInspection(editing._id, {
                        type: selectedType,
                        location: selectedLocation,
                        inspector: selectedInspector,
                        date: scheduledDate,
                        scheduledDate: scheduledDate,
                        notes: notes,
                        status: editing.status
                      });
                    } else {
                      // Create new inspection
                      await handleCreateInspection({
                        type: selectedType,
                        location: selectedLocation,
                        inspector: selectedInspector,
                        date: scheduledDate,
                        scheduledDate: scheduledDate,
                        dueDate: dueDate || scheduledDate,
                        priority: priority,
                        notes: notes,
                        status: 'scheduled'
                      });
                    }
                  } catch (error) {
                    console.error('Error in save inspection:', error);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving || !selectedType || !selectedLocation || !selectedInspector || !scheduledDate}
                className="bg-[var(--accent-navyblue)] flex-1 px-6 py-3 !text-white rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {editing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <FaPlus /> {editing ? 'Update Inspection' : 'Schedule Inspection'}
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowNewInspectionModal(false);
                  setEditingInspection(null);
                  // Reset form
                  setSelectedType('');
                  setSelectedLocation('');
                  setSelectedInspector('');
                  setScheduledDate('');
                  setDueDate('');
                  setPriority('medium');
                  setNotes('');
                }}
                className="px-6 py-3 bg-gray-200 !text-black rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const InspectionDetailModal = () => {
    if (!selectedInspection) return null;

    return (
      <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-card">
            <div>
              <h2 className="text-2xl font-bold text-primary">{selectedInspection.inspectionNumber}</h2>
              <p className="text-secondary">{selectedInspection.type} - {selectedInspection.location}</p>
            </div>
            <button onClick={() => setShowDetailModal(false)} className="text-secondary hover:text-primary">
              <FaTimes size={24} />
            </button>
          </div>

          <div className="p-6">
            {/* Status Overview */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-card p-4 rounded-lg">
                <div className="text-sm text-secondary mb-1">Status</div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedInspection.status)}`}>
                  {selectedInspection.status.toUpperCase()}
                </span>
              </div>
              <div className="bg-card p-4 rounded-lg">
                <div className="text-sm text-secondary mb-1">Scheduled</div>
                <div className="font-semibold">
                  {selectedInspection.scheduledDate
                    ? new Date(selectedInspection.scheduledDate).toLocaleDateString()
                    : 'N/A'}
                </div>
              </div>
              <div className="bg-card p-4 rounded-lg">
                <div className="text-sm text-secondary mb-1">Inspector</div>
                <div className="font-semibold">{selectedInspection.inspector}</div>
              </div>
              <div className="bg-card p-4 rounded-lg">
                <div className="text-sm text-secondary mb-1">Findings</div>
                <div className="font-semibold">{selectedInspection.findings.total} Total</div>
              </div>
            </div>

            {/* Checklist */}
            {selectedInspection.checklist.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FaClipboardCheck /> Inspection Checklist
                </h3>
                <div className="space-y-3">
                  {selectedInspection.checklist.map(item => (
                    <div key={item.id} className="bg-card p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {item.status === 'pass' && <FaCheckCircle className="text-green-600" size={20} />}
                            {item.status === 'fail' && <FaTimes className="text-[#A855F7]" size={20} />}
                            {item.status === 'na' && <span className="text-secondary">N/A</span>}
                            {item.status === 'pending' && <FaClock className="text-[#00FFA3]" size={20} />}
                            <span className="font-medium">{item.question}</span>
                            {item.photoRequired && <FaCamera className="text-blue-400" size={14} />}
                          </div>
                          {item.notes && (
                            <p className="text-sm text-secondary mt-2 ml-8">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Corrective Actions */}
            {selectedInspection.correctiveActions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FaTools /> Corrective Actions ({selectedInspection.correctiveActions.length})
                </h3>
                <div className="space-y-3">
                  {selectedInspection.correctiveActions.map(action => (
                    <div key={action.id} className="bg-card border border-orange-200 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-primary">{action.description}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-secondary">
                            <span>👤 Assigned: {action.assignedTo}</span>
                            <span>📅 Due: {new Date(action.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${action.status === 'completed' ? 'bg-green-100 text-green-800' :
                          action.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                            action.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                          }`}>
                          {action.status.toUpperCase().replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Evidence */}
            {selectedInspection.photoEvidence.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FaCamera /> Photo Evidence ({selectedInspection.photoEvidence.length})
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {selectedInspection.photoEvidence.map((photo, idx) => (
                    <div key={idx} className="bg-card p-3 rounded-lg">
                      <div className="aspect-video bg-gray-300 rounded mb-2 flex items-center justify-center">
                        <FaCamera size={32} className="text-secondary" />
                      </div>
                      <p className="text-xs text-secondary truncate">{photo.fileName}</p>
                      <p className="text-xs text-secondary">{photo.uploadedBy}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Trail */}
            <div className="mb-6 ">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-headings">
                <FaHistory /> Audit Trail
              </h3>
              <div className="space-y-2">
                {selectedInspection.auditTrail.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm">
                    <div className="bg-gray-200 rounded-full p-2">
                      <FaClock size={12} className="text-secondary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-semibold text-primary">{entry.action}</span>
                        <span className="text-secondary text-xs">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-secondary">{entry.details}</p>
                      <p className="text-secondary text-xs">by {entry.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {selectedInspection.notes && (
              <div className="bg-card border border-yellow-200 p-4 rounded-lg">
                <h4 className="font-semibold text-primary mb-2">📝 Notes</h4>
                <p className="text-primary">{selectedInspection.notes}</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-card flex gap-3">

            <button
              onClick={() => {
                setEditingInspection(selectedInspection);
                setShowDetailModal(false);
                setShowNewInspectionModal(true);
              }}
              className="px-6 py-3 bg-green-600 !text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
            >
              <FaEdit /> Edit Inspection
            </button>
            <button
              onClick={() => handleDeleteInspection(selectedInspection)}
              className="px-6 py-3 bg-red-600 !text-white rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2"
            >
              <FaTrash /> Delete
            </button>
            <button
              onClick={() => {
                setShowDetailModal(false);
                setSelectedInspection(null);
              }}
              className="px-6 py-3 border border-theme text-primary rounded-lg font-semibold hover:bg-[var(--accent-navyblue)]/20 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-main" >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-headings" >
          <FaClipboardCheck className="text-indigo-600" />
          Safety Inspections & Audits
        </h1>
        <p className="text-secondary">Track and manage facility, equipment, and compliance inspections</p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-card p-4 rounded-xl shadow-sm border border-theme">
          <div className="text-sm text-secondary mb-1">Total</div>
          <div className="text-2xl font-bold text-primary">{stats.total}</div>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-sm border border-blue-200">
          <div className="text-sm text-[#00D1FF] mb-1">Scheduled</div>
          <div className="text-2xl font-bold text-blue-900">{stats.scheduled}</div>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-sm border border-yellow-200">
          <div className="text-sm text-yellow-900 mb-1">In Progress</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.inProgress}</div>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-sm border border-green-200">
          <div className="text-sm text-green-600 mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-sm border border-red-200">
          <div className="text-sm text-red-900 mb-1">Overdue</div>
          <div className="text-2xl font-bold text-red-900">{stats.overdue}</div>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-sm border border-orange-200">
          <div className="text-sm text-[#F59E0B] mb-1">Action Required</div>
          <div className="text-2xl font-bold text-[#F59E0B]">{stats.actionRequired}</div>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-sm border border-purple-200">
          <div className="text-sm text-purple-900 mb-1">Compliant</div>
          <div className="text-2xl font-bold text-purple-900">{stats.compliant}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card p-4 rounded-xl shadow-sm border border-theme mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search by inspection number or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option className='form-option' value="all">All Types</option>
            {INSPECTION_TYPES.map(type => (
              <option className='form-option' key={type.value} value={type.value}>{type.value}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option className='form-option' value="all">All Status</option>
            <option className='form-option' value="scheduled">Scheduled</option>
            <option className='form-option' value="in-progress">In Progress</option>
            <option className='form-option' value="completed">Completed</option>
            <option className='form-option' value="overdue">Overdue</option>
            <option className='form-option' value="action-required">Action Required</option>
          </select>

          <button
            onClick={handleExportReport}
            className="px-6 py-3 bg-green-600 !text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2 whitespace-nowrap"
          >
            <FaDownload /> Export Report
          </button>
          <button
            onClick={() => {
              setEditingInspection(null);
              setShowNewInspectionModal(true);
            }}
            className="px-6 py-3 !text-white rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2 whitespace-nowrap bg-[var(--accent-navyblue)]"

          >
            <FaPlus /> New Inspection
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {['all', 'scheduled', 'in-progress', 'completed', 'overdue', 'action-required'].map(tab => (
          <button
            key={tab}
            onClick={() => setCurrentTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${currentTab === tab
              ? 'text-white'
              : 'bg-card text-primary hover:bg-[rgba(255,255,255,0.03)]'
              }
            style={currentTab === tab ? { background: CUSTOM_COLORS.primary } : {}}`}
          >
            {tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      {/* Inspections List */}
      <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card border-b border-theme">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-headings uppercase">Inspection #</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-headings uppercase">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-headings uppercase">Location</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-headings uppercase">Inspector</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-headings uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-headings uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-headings uppercase">Findings</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-headings uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-secondary">Loading...</td>
                </tr>
              ) : filteredInspections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-secondary">No inspections found.</td>
                </tr>
              ) : (
                filteredInspections.map(inspection => (
                  <tr key={inspection._id} onClick={() => {
                    setSelectedInspection(inspection);
                    setShowDetailModal(true);
                  }} className="hover:bg-[rgba(255,255,255,0.03)] transition cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-primary">{inspection.inspectionNumber}</div>
                      <div className="text-xs text-secondary">{inspection.category}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-primary">{inspection.type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-secondary" size={14} />
                        <span className="text-primary">{inspection.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaUser className="text-secondary" size={14} />
                        <span className="text-primary">{inspection.inspector}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-primary">
                        {inspection.scheduledDate
                          ? new Date(inspection.scheduledDate).toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(inspection.status)}`}>
                        {inspection.status.toUpperCase().replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {inspection.findings.critical > 0 && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                            {inspection.findings.critical} Critical
                          </span>
                        )}
                        {inspection.findings.major > 0 && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold">
                            {inspection.findings.major} Major
                          </span>
                        )}
                        {inspection.findings.total === 0 && (
                          <span className="text-green-600 text-xs">✓ No Issues</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInspection(inspection);
                          setShowDetailModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm flex items-center gap-1"
                      >
                        <FaEye /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showNewInspectionModal && <NewInspectionModal editing={editingInspection} />}
      {showDetailModal && <InspectionDetailModal />}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && inspectionToDelete && (
        <div className="fixed inset-0 flex justify-center items-center z-[11000] p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationTriangle className="text-red-500 text-3xl" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-2">Delete Inspection?</h2>
              <p className="text-secondary">
                Are you sure you want to delete inspection <span className="font-semibold text-primary">"{inspectionToDelete.inspectionNumber}"</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 bg-card text-primary rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteInspection}
                className="flex-1 px-4 py-3 bg-red-600 !text-white rounded-xl font-semibold hover:bg-red-700 transition shadow-lg shadow-red-200"
              >
                Delete Inspection
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default SafetyInspections;