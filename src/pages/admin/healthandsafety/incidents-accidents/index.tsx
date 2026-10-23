
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FaExclamationTriangle,
  FaPlus,
  FaEye,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaClipboardList,
  FaUserInjured,
  FaTools,
  FaTimes,
  FaCalendarAlt,
  FaTrash,
  FaImage,
  FaPrint,
  FaVideo,
  FaSave,
  FaChevronDown,
  FaEdit,

} from 'react-icons/fa';
import { FaInfoCircle } from 'react-icons/fa';
import {
  createIncident,
  getIncidents,
  deleteIncident,
  updateInvestigation,
  updateInjuryRecord,

} from '../../../../axios/api/healthSafety';



const getStatusColor = (status: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    open: { bg: '#dbeafe', text: '#1e40af' },
    investigating: { bg: '#fef3c7', text: '#92400e' },
    'action-required': { bg: '#fed7aa', text: '#9a3412' },
    resolved: { bg: '#d1fae5', text: '#065f46' },
    closed: { bg: '#e5e7eb', text: '#374151' },
  };
  return colors[status] || colors.open;
};

const getPriorityColor = (priority: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    low: { bg: '#d1fae5', text: '#065f46' },
    medium: { bg: '#fef3c7', text: '#92400e' },
    high: { bg: '#fee2e2', text: '#991b1b' },
    critical: { bg: '#fce7f3', text: '#831843' },
  };
  return colors[priority] || colors.medium;
};

// Types
interface MediaFile {
  fileUrl: string;
  fileName: string;
  fileType: 'image' | 'video' | 'document';
  uploadedAt: string;
  uploadedBy: string;
}

interface WitnessStatement {
  witnessName: string;
  witnessRole: string;
  statement: string;
  dateProvided: string;
}

interface CAPA {
  capaNumber: string;
  assignedTo: string;
  assignedToName: string;
  dueDate: string;
  status: string;
  description: string;
  title: string;
  type: string;
  source: string;
  priority: string;
  createdDate: string;
}

interface InjuryRecord {
  injuredWorker: string;
  injuryDate: string;
  injuryType: string;
  bodyPart: string;
  severity: string;
  progressNotes: ProgressNote[];
  wcbClaimNumber?: string;
  doctorRestrictions?: string;
  modifiedDutyPlan?: string;
  lastUpdated?: string;
}

interface ProgressNote {
  date: string;
  note: string;
  enteredBy: string;
}

interface Incident {
  _id: string;
  incidentNumber: string;
  date: string;
  time: string;
  location: string;
  locationType: string;
  type: string;
  severity: string;
  status: string;
  reportedBy: string;
  reportedById?: string;
  reportedByRole: string;
  description: string;
  immediateActionTaken?: string;
  hasInjury: boolean;
  hasDamage?: boolean;
  estimatedCost?: number;
  photoEvidence?: MediaFile[];
  videoEvidence?: MediaFile[];
  witnessStatements?: WitnessStatement[];
  capa?: CAPA;
  injuryRecord?: InjuryRecord;
  investigation?: {
    investigationLead: string;
    rootCauseType: '5-why' | 'fishbone';
    rootCause: string;
    analysis: string;
    fiveWhys?: string[];
    fishboneData?: {
      people: string;
      process: string;
      equipment: string;
      environment: string;
      materials: string;
      management: string;
    };
    completedDate: string;
  };
}



const TABS = {
  INCIDENT_LIST: 'list',

  INVESTIGATIONS: 'investigations',
  INJURY_RTW: 'injury',

};

// Toast notification interface
interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const ToastNotificationComponent = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={16} />,
    error: <FaExclamationTriangle className="text-red-500" size={16} />,
    info: <FaInfoCircle className="text-blue-500" size={16} />,
    warning: <FaExclamationTriangle className="text-yellow-500" size={16} />
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
    <div className={`fixed top-4 right-4 flex items-start gap-3 p-3 rounded-lg border shadow-lg z-[10000] ${bgColors[notification.type]} min-w-[300px] max-w-[400px]`}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[notification.type]}
      </div>
      <p className="flex-1 text-xs font-medium text-primary">{notification.message}</p>
      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 text-secondary hover:text-secondary transition-colors"
      >
        <FaTimes size={12} />
      </button>
    </div>
  );
};

const IncidentManagement: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');
  const [currentTab, setCurrentTab] = useState(TABS.INCIDENT_LIST);
  const [selectedIncidentForDetail, setSelectedIncidentForDetail] = useState<Incident | null>(null);




  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [notificationId, setNotificationId] = useState(0);

  // New Incident Form States


  // Investigation form states
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [investigationLead, setInvestigationLead] = useState('');
  const [rootCauseType, setRootCauseType] = useState<'5-why' | 'fishbone' | ''>('');
  const [rootCause, setRootCause] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [fiveWhys, setFiveWhys] = useState(['', '', '', '', '']);
  const [fishboneData, setFishboneData] = useState({
    people: '',
    process: '',
    equipment: '',
    environment: '',
    materials: '',
    management: '',
  });
  // Witness statements are stored within the incident's investigation data

  // Injury RTW form states
  const [selectedInjuryIncidentId, setSelectedInjuryIncidentId] = useState('');
  const [wcbClaimNumber, setWcbClaimNumber] = useState('');
  const [doctorRestrictions, setDoctorRestrictions] = useState('');
  const [modifiedDutyPlan, setModifiedDutyPlan] = useState('');
  const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([
    { date: '', note: '', enteredBy: '' },
  ]);



  // Incident form state
  const [incidentFormData, setIncidentFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: '',
    locationType: 'warehouse' as 'warehouse' | 'yard' | 'shop' | 'highway' | 'other',
    type: 'Workplace Incident' as 'Driver Injury' | 'Vehicle Accident' | 'Workplace Incident' | 'Near Miss',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    reportedBy: '',
    reportedByRole: '',
    description: '',
    hasInjury: false
  });
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState<File[]>([]);
  const [selectedVideoFiles, setSelectedVideoFiles] = useState<File[]>([]);

  // Emergency Contact form state


  // Investigation form state

  const [selectedWcbFiles, setSelectedWcbFiles] = useState<File[]>([]);
  const [showNewReportMenu, setShowNewReportMenu] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentFormType, setIncidentFormType] = useState<'Driver Injury' | 'Vehicle Accident' | 'Workplace Incident' | 'Near Miss' | null>(null);

  // Delete Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = notificationId + 1;
    setNotificationId(id);
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getLocalUserInfo = () => {
    const userInfoString = localStorage.getItem('userInfo');
    if (!userInfoString) return null;
    try {
      return JSON.parse(userInfoString);
    } catch (error) {
      console.error('Error parsing userInfo from localStorage:', error);
      return null;
    }
  };

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch data when tab changes
  useEffect(() => {
    if (currentTab === TABS.INCIDENT_LIST) {
      fetchIncidents();
    }
  }, [currentTab, searchTerm, filterStatus, filterType]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchIncidents(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidents = async () => {
    try {
      const response = await getIncidents({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        type: filterType !== 'all' ? filterType : undefined,
        search: searchTerm || undefined
      });
      if (response?.success && Array.isArray(response.data)) {
        setIncidents(response.data.map((inc: any) => ({
          _id: inc._id,
          incidentNumber: inc.incidentNumber,
          date: inc.date,
          time: inc.time,
          location: inc.location,
          locationType: inc.locationType,
          type: inc.type,
          severity: inc.severity,
          status: inc.status,
          reportedBy: inc.reportedBy,
          reportedByRole: inc.reportedByRole,
          description: inc.description,
          hasInjury: inc.hasInjury || false,
          photoEvidence: inc.photoEvidence || [],
          videoEvidence: inc.videoEvidence || [],
          workerStatements: inc.workerStatements || [],
          witnessReports: inc.witnessReports || [],
          investigation: inc.investigation,
          capa: inc.capa,
          injuryRecord: inc.injuryRecord,
          wcbClaimNumber: inc.wcbClaimNumber,
          wcbDocuments: inc.wcbDocuments || []
        })));
      }
    } catch (error: any) {
      console.error('Error fetching incidents:', error);
      showNotification('error', error?.response?.data?.message || 'Failed to fetch incidents');
    }
  };





  // Handle incident creation
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentFormType) return;

    const userInfo = getLocalUserInfo();
    const userName = userInfo?.userData?.name || userInfo?.name || 'Unknown User';
    const userRole = userInfo?.userData?.role || userInfo?.role || 'Unknown Role';

    const formData = new FormData();
    formData.append('date', incidentFormData.date);
    formData.append('time', incidentFormData.time);
    formData.append('location', incidentFormData.location);
    formData.append('locationType', incidentFormData.locationType);
    formData.append('type', incidentFormType);
    formData.append('severity', incidentFormData.severity);
    formData.append('reportedBy', incidentFormData.reportedBy || userName);
    formData.append('reportedByRole', incidentFormData.reportedByRole || userRole);
    formData.append('description', incidentFormData.description);
    formData.append('hasInjury', String(incidentFormData.hasInjury));

    selectedPhotoFiles.forEach(file => {
      formData.append('photoEvidence', file);
    });

    selectedVideoFiles.forEach(file => {
      formData.append('videoEvidence', file);
    });

    try {
      setUploadingFiles(true);
      const response = await createIncident(formData);
      if (response?.success) {
        showNotification('success', 'Incident created successfully');
        setShowIncidentForm(false);
        setIncidentFormType(null);
        setSelectedPhotoFiles([]);
        setSelectedVideoFiles([]);
        setIncidentFormData({
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          location: '',
          locationType: 'warehouse',
          type: 'Workplace Incident',
          severity: 'medium',
          reportedBy: '',
          reportedByRole: '',
          description: '',
          hasInjury: false
        });
        await fetchIncidents();
      } else {
        const errorMsg = response?.message || 'Failed to create incident';
        const validationErrors = response?.errors;
        let fullErrorMsg = errorMsg;
        if (validationErrors && Array.isArray(validationErrors) && validationErrors.length > 0) {
          fullErrorMsg += ': ' + validationErrors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
        }
        showNotification('error', fullErrorMsg);
      }
    } catch (error: any) {
      console.error('Error creating incident:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to create incident';
      const validationErrors = error?.response?.data?.errors;
      let fullErrorMsg = errorMsg;
      if (validationErrors && Array.isArray(validationErrors) && validationErrors.length > 0) {
        fullErrorMsg += ': ' + validationErrors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
      }
      showNotification('error', fullErrorMsg);
    } finally {
      setUploadingFiles(false);
    }
  };

  // Handle incident deletion
  const handleDeleteIncident = (id: string) => {
    setIncidentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteIncident = async () => {
    if (!incidentToDelete) return;

    try {
      const response = await deleteIncident(incidentToDelete);
      if (response?.success) {
        showNotification('success', 'Incident deleted successfully');
        await fetchIncidents();
        setShowDeleteModal(false);
        setIncidentToDelete(null);
      } else {
        showNotification('error', response?.message || 'Failed to delete incident');
      }
    } catch (error: any) {
      console.error('Error deleting incident:', error);
      showNotification('error', error?.response?.data?.message || 'Failed to delete incident');
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    _type: 'photo' | 'video' | 'document'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // TODO: Implement actual file upload to backend
    // Files will be uploaded and stored with the incident/investigation/injury record
    // After upload, file URLs will be added to the respective record's document arrays
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  const handleSubmitInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentId || !investigationLead || !analysis) {
      showNotification('error', 'Please fill in all required fields');
      return;
    }

    try {
      const investigationData: any = {
        investigationLead,
        startDate: new Date().toISOString().split('T')[0],
        analysis,
        rootCause,
        rootCauseAnalysisMethod: rootCauseType as '5-why' | 'fishbone' | 'other',
      };

      if (rootCauseType === '5-why') {
        investigationData.fiveWhys = fiveWhys.filter(w => w.trim());
      } else if (rootCauseType === 'fishbone') {
        investigationData.fishboneData = fishboneData;
      }

      const response = await updateInvestigation(selectedIncidentId, investigationData);
      if (response?.success) {
        showNotification('success', 'Investigation updated successfully');
        setSelectedIncidentId('');
        setInvestigationLead('');
        setRootCauseType('');
        setRootCause('');
        setAnalysis('');
        setFiveWhys(['', '', '', '', '']);
        setFishboneData({
          people: '',
          process: '',
          equipment: '',
          environment: '',
          materials: '',
          management: '',
        });
        await fetchIncidents();
      } else {
        showNotification('error', response?.message || 'Failed to update investigation');
      }
    } catch (error: any) {
      console.error('Error updating investigation:', error);
      showNotification('error', error?.response?.data?.message || 'Failed to update investigation');
    }
  };

  const handleSubmitInjuryRTW = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInjuryIncidentId) {
      showNotification('error', 'Please select an incident');
      return;
    }

    const formData = new FormData();
    formData.append('wcbClaimNumber', wcbClaimNumber || '');
    formData.append('doctorRestrictions', doctorRestrictions);
    formData.append('modifiedDutyPlan', modifiedDutyPlan);
    if (progressNotes && progressNotes.length > 0) {
      formData.append('progressNotes', JSON.stringify(progressNotes.filter(note => note.date && note.note)));
    }

    try {
      setUploadingFiles(true);
      const response = await updateInjuryRecord(selectedInjuryIncidentId, formData);
      if (response?.success) {
        showNotification('success', 'Injury record updated successfully');
        setSelectedInjuryIncidentId('');
        setWcbClaimNumber('');
        setDoctorRestrictions('');
        setModifiedDutyPlan('');
        setProgressNotes([{ date: '', note: '', enteredBy: '' }]);
        await fetchIncidents();
      } else {
        showNotification('error', response?.message || 'Failed to update injury record');
      }
    } catch (error: any) {
      console.error('Error updating injury record:', error);
      showNotification('error', error?.response?.data?.message || 'Failed to update injury record');
    } finally {
      setUploadingFiles(false);
    }
  };



  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.incidentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.reportedBy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    const matchesType = filterType === 'all' || incident.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  // ==================== RENDER FUNCTIONS ====================

  // Render main incident list
  const renderIncidentList = () => (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 ">
        <div className=" bg-[var(--accent-blue)]/20 rounded-xl p-3 shadow-sm border border-theme flex items-center justify-between ">
          <div>
            <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider">Total Incidents</p>
            <h3 className="text-xl font-bold text-primary">{incidents.length}</h3>
          </div>
          <div className=" p-2 rounded-lg text-[#00D1FF]">
            <FaClipboardList size={16} />
          </div>
        </div>
        <div className="bg-[var(--accent-green)]/20 rounded-xl p-3 shadow-sm border border-theme flex items-center justify-between">
          <div>
            <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider">Open Cases</p>
            <h3 className="text-xl font-bold text-primary">{incidents.filter(i => i.status === 'open').length}</h3>
          </div>
          <div className="bg-card p-2 rounded-lg text-[#00FFA3]">
            <FaExclamationTriangle size={16} />
          </div>
        </div>
        <div className="bg-[var(--accent-purple)]/20 rounded-xl p-3 shadow-sm border border-theme flex items-center justify-between">
          <div>
            <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider">Injuries</p>
            <h3 className="text-xl font-bold text-primary">{incidents.filter(i => i.hasInjury).length}</h3>
          </div>
          <div className="bg-card p-2 rounded-lg text-[#A855F7]">
            <FaUserInjured size={16} />
          </div>
        </div>
        <div className="bg-[var(--accent-green)]/20 rounded-xl p-3 shadow-sm border border-theme flex items-center justify-between">
          <div>
            <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider">Resolved</p>
            <h3 className="text-xl font-bold text-primary">{incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length}</h3>
          </div>
          <div className=" p-2 rounded-lg text-green-600">
            <FaCheckCircle size={16} />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-lg border border-theme p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-0">
          <div className="relative w-full md:w-96">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={14} />
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={12} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-card cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="Driver Injury">Driver Injury</option>
                <option value="Vehicle Accident">Vehicle Accident</option>
                <option value="Workplace Incident">Workplace Incident</option>
                <option value="Near Miss">Near Miss</option>
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" size={10} />
            </div>
            <div className="relative flex-1 md:flex-none">
              <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={12} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-card cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" size={10} />
            </div>
            <div className="relative flex-1 md:flex-none">
              <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={12} />
              <select
                value={filterRiskLevel}
                onChange={(e) => setFilterRiskLevel(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-card cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" size={10} />
            </div>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-card border-b border-theme">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">
                  Incident #
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">CAPA</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-headings uppercase tracking-wider">Injury?</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-headings uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y  divide-theme divide-white/5">
              {loading || filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                        <p className="text-xs text-secondary font-medium">Loading incidents...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <FaExclamationTriangle size={32} className="text-gray-300" />
                        <p className="text-xs text-secondary font-medium">
                          No incidents found matching your filters
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => {
                  const statusColors = getStatusColor(incident.status);
                  const severityColors = getPriorityColor(incident.severity);

                  return (
                    <tr
                      key={incident._id}
                      onClick={() => setSelectedIncidentForDetail(incident)}
                      className="hover:bg-[var(--accent-navyblue)]/20 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-primary group-hover:text-[#00D1FF] transition-colors">
                          {incident.incidentNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt className="text-secondary" size={10} />
                          <div>
                            <div className="text-xs font-medium text-primary">
                              {new Date(incident.date).toLocaleDateString()}
                            </div>
                            <div className="text-[10px] text-secondary">{incident.time}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-primary">
                          {incident.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5" title={incident.location}>
                          <FaMapMarkerAlt className="text-secondary flex-shrink-0" size={10} />
                          <span className="text-xs text-secondary truncate max-w-[120px]">{incident.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold border"
                          style={{
                            backgroundColor: severityColors.bg,
                            color: severityColors.text,
                            borderColor: severityColors.bg,
                          }}
                        >
                          {incident.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold border"
                          style={{
                            backgroundColor: statusColors.bg,
                            color: statusColors.text,
                            borderColor: statusColors.bg,
                          }}
                        >
                          {incident.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {incident.capa ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono font-medium text-[#00D1FF] bg-card px-1.5 py-0.5 rounded border border-blue-100">
                              {incident.capa.capaNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-secondary italic">No CAPA</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {incident.hasInjury ? (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-card text-red-500 ring-4 ring-white">
                            <FaUserInjured size={10} title="Injury Reported" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50 text-green-500 ring-4 ring-white">
                            <FaCheckCircle size={10} title="No Injury" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIncidentForDetail(incident);
                            }}
                            className="p-1.5 text-[#00D1FF] hover:bg-[var(--accent-navyblue)]/50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FaEye size={12} className='text-[var(--accent-blue)]' />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteIncident(incident._id);
                            }}
                            className="p-1.5 text-[#A855F7] hover:bg-[var(--accent-red)]/20 rounded-lg transition"
                            title="Delete"
                          >
                            <FaTrash size={12} className='text-[var(--accent-red)]' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );





  const renderInvestigations = () => (
    <div className="bg-card rounded-2xl p-8 shadow-lg">
      <h2 className="text-3xl font-bold mb-3 text-primary">
        Investigation & Root Cause Analysis
      </h2>
      <div
        className="mb-8 p-4 rounded-xl border-l-4"
        style={{
          backgroundColor: '#f59e0b' + '20',
          borderColor: '#f59e0b',
        }}
      >
        <p className="text-sm text-primary">
          <strong className="text-amber-800">Federal Requirement:</strong> Canada Labour
          Code requires employers to investigate and document all hazardous occurrences.
        </p>
      </div>

      <form onSubmit={handleSubmitInvestigation} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Incident Reference *
            </label>
            <select
              required
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option className='form-option' value="">Select Incident to Investigate...</option>
              {incidents
                .filter((i) => i.status !== 'resolved' && i.status !== 'closed')
                .map((i) => (
                  <option className='form-option' key={i._id} value={i._id}>
                    {i.incidentNumber} - {i.type}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Investigation Lead *
            </label>
            <input
              type="text"
              required
              value={investigationLead}
              onChange={(e) => setInvestigationLead(e.target.value)}
              placeholder="Safety Manager Name"
              className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Root Cause Analysis Tools */}
        <div className="border-t-2 border-theme pt-8">
          <h3 className="text-xl font-bold mb-6 text-primary">
            Root Cause Analysis Tool
          </h3>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-primary mb-3">
              Analysis Method *
            </label>
            <div className="flex gap-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="5-why"
                  checked={rootCauseType === '5-why'}
                  onChange={(e) => setRootCauseType(e.target.value as '5-why')}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                />
                <span className="!ml-2 font-medium text-primary">5-Why Analysis</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="fishbone"
                  checked={rootCauseType === 'fishbone'}
                  onChange={(e) => setRootCauseType(e.target.value as 'fishbone')}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                />
                <span className=" !ml-2 font-medium text-primary">
                  Fishbone (Ishikawa) Diagram
                </span>
              </label>
            </div>
          </div>

          {rootCauseType === '5-why' && (
            <div className="space-y-4 mb-6 p-6 bg-card rounded-xl">
              <label className="block text-sm font-bold text-purple-900">
                5-Why Analysis
              </label>
              {[1, 2, 3, 4, 5].map((num, idx) => (
                <div key={num}>
                  <label className="block text-xs font-semibold text-secondary mb-2">
                    Why {num}?
                  </label>
                  <input
                    type="text"
                    value={fiveWhys[idx]}
                    onChange={(e) => {
                      const newWhys = [...fiveWhys];
                      newWhys[idx] = e.target.value;
                      setFiveWhys(newWhys);
                    }}
                    placeholder={`Enter reason ${num}...`}
                    className="w-full border-2 border-purple-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-purple-900 mb-2">
                  Root Cause Identified
                </label>
                <input
                  type="text"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Final root cause..."
                  className="w-full border-2 border-purple-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>
            </div>
          )}

          {rootCauseType === 'fishbone' && (
            <div className="mb-6 p-6 bg-card rounded-xl">
              <label className="block text-sm font-bold text-blue-900 mb-4">
                Fishbone Categories
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['people', 'process', 'equipment', 'environment', 'materials', 'management'].map(
                  (category) => (
                    <div key={category}>
                      <label className="block text-xs font-semibold text-secondary mb-2 capitalize">
                        {category}
                      </label>
                      <input
                        type="text"
                        value={fishboneData[category as keyof typeof fishboneData]}
                        onChange={(e) =>
                          setFishboneData({ ...fishboneData, [category]: e.target.value })
                        }
                        placeholder={`${category} factors...`}
                        className="w-full border-2 border-blue-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  )
                )}
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-blue-900 mb-2">
                  Root Cause Identified
                </label>
                <input
                  type="text"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Final root cause..."
                  className="w-full border-2 border-blue-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Detailed Findings & Analysis *
            </label>
            <textarea
              required
              rows={5}
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value)}
              placeholder="Document the step-by-step root cause analysis process..."
              className="w-full border-2 border-theme p-4 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Evidence & Document Upload */}
        <div className="border-t-2 border-theme pt-6">
          <h3 className="text-lg font-bold mb-4 text-primary">Evidence & Documentation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Photo Evidence
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileUpload(e, 'photo')}
                className="block w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-card file:text-purple-700 hover:file:bg-purple-100"
              />
              <p className="text-xs text-secondary mt-1">Upload scene photos, damage images, etc.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Video Evidence
              </label>
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => handleFileUpload(e, 'video')}
                className="block w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-card file:text-purple-700 hover:file:bg-purple-100"
              />
              <p className="text-xs text-secondary mt-1">Upload video recordings of incident.</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-primary mb-2">
                Investigation Documents (PDF, Word, etc.)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                multiple
                onChange={(e) => handleFileUpload(e, 'document')}
                className="block w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-card file:text-purple-700 hover:file:bg-purple-100"
              />
              <p className="text-xs text-secondary mt-1">Upload witness statements, reports, analysis documents, etc.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t-2 border-theme">
          <button
            type="button"
            onClick={() => setCurrentTab(TABS.INCIDENT_LIST)}
            className="px-6 py-3 bg-gray-200 !text-black rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 !text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
          >
            <FaSave className="inline mr-2" />
            Save Investigation
          </button>
        </div>
      </form>
    </div>
  );

  const renderInjuryRTW = () => {
    const injuryIncidents = incidents.filter((i) => i.hasInjury);
    const selectedIncident = injuryIncidents.find((i) => i._id === selectedInjuryIncidentId);

    return (
      <div className="space-y-6">
        {/* List of Incidents with Injuries */}
        <div className="bg-card rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-primary">
            Incidents with Injuries
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
            </div>
          ) : injuryIncidents.length === 0 ? (
            <div className="text-center py-12">
              <FaUserInjured size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-secondary font-medium">No incidents with injuries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-card border-b border-theme">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">
                      Incident #
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">
                      Injured Worker
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">
                      Injury Type
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">
                      WCB Claim #
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-headings uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-headings uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {injuryIncidents.map((incident) => {
                    const statusColors = getStatusColor(incident.status);
                    const isSelected = selectedInjuryIncidentId === incident._id;

                    return (
                      <tr
                        key={incident._id}
                        className={`hover:bg-red-50/30 transition-colors cursor-pointer ${isSelected ? 'bg-card border-l-4 border-red-500' : ''
                          }`}
                        onClick={() => {
                          setSelectedInjuryIncidentId(incident._id);
                          // Populate form with existing data
                          if (incident.injuryRecord) {
                            setWcbClaimNumber(incident.injuryRecord.wcbClaimNumber || '');
                            setDoctorRestrictions(incident.injuryRecord.doctorRestrictions || '');
                            setModifiedDutyPlan(incident.injuryRecord.modifiedDutyPlan || '');
                            setProgressNotes(
                              incident.injuryRecord.progressNotes && incident.injuryRecord.progressNotes.length > 0
                                ? incident.injuryRecord.progressNotes.map((note: any) => ({
                                  date: note.date ? new Date(note.date).toISOString().split('T')[0] : '',
                                  note: note.note || '',
                                  enteredBy: note.enteredBy || ''
                                }))
                                : [{ date: '', note: '', enteredBy: '' }]
                            );
                          }
                        }}
                      >
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-primary">
                            {incident.incidentNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-primary">
                            {new Date(incident.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-primary">
                            {incident.injuryRecord?.injuredWorker || 'Unknown Worker'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-primary">
                            {incident.injuryRecord?.injuryType || incident.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-secondary">
                            {incident.injuryRecord?.wcbClaimNumber || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold border"
                            style={{
                              backgroundColor: statusColors.bg,
                              color: statusColors.text,
                              borderColor: statusColors.bg,
                            }}
                          >
                            {incident.status.replace('-', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInjuryIncidentId(incident._id);
                              if (incident.injuryRecord) {
                                setWcbClaimNumber(incident.injuryRecord.wcbClaimNumber || '');
                                setDoctorRestrictions(incident.injuryRecord.doctorRestrictions || '');
                                setModifiedDutyPlan(incident.injuryRecord.modifiedDutyPlan || '');
                                setProgressNotes(
                                  incident.injuryRecord.progressNotes && incident.injuryRecord.progressNotes.length > 0
                                    ? incident.injuryRecord.progressNotes.map((note: any) => ({
                                      date: note.date ? new Date(note.date).toISOString().split('T')[0] : '',
                                      note: note.note || '',
                                      enteredBy: note.enteredBy || ''
                                    }))
                                    : [{ date: '', note: '', enteredBy: '' }]
                                );
                              }
                            }}
                            className="p-1.5 text-[#A855F7] hover:bg-red-50 rounded-lg transition-colors"
                            title="Edit Injury Record"
                          >
                            <FaEdit size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Injury Record Form */}
        {selectedInjuryIncidentId && (
          <div className="bg-card rounded-2xl p-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary">
                {selectedIncident ? `Edit Injury Record - ${selectedIncident.incidentNumber}` : 'Injury Management & Return-to-Work'}
              </h2>
              <button
                onClick={() => {
                  setSelectedInjuryIncidentId('');
                  setWcbClaimNumber('');
                  setDoctorRestrictions('');
                  setModifiedDutyPlan('');
                  setProgressNotes([{ date: '', note: '', enteredBy: '' }]);
                  setSelectedWcbFiles([]);
                }}
                className="text-secondary hover:text-primary"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitInjuryRTW} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    WCB/WSIB Claim Number
                  </label>
                  <input
                    type="text"
                    value={wcbClaimNumber}
                    onChange={(e) => setWcbClaimNumber(e.target.value)}
                    placeholder="WCB-2025-XXXXX"
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Doctor Restrictions *
                </label>
                <textarea
                  required
                  rows={3}
                  value={doctorRestrictions}
                  onChange={(e) => setDoctorRestrictions(e.target.value)}
                  placeholder="No lifting over 10 lbs, restricted bending, etc."
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Modified Duty Plan *
                </label>
                <textarea
                  required
                  rows={4}
                  value={modifiedDutyPlan}
                  onChange={(e) => setModifiedDutyPlan(e.target.value)}
                  placeholder="Detailed plan for modified work duties..."
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="border-t-2 border-theme pt-6">
                <h3 className="text-lg font-bold mb-4 text-primary">Progress Notes</h3>
                {progressNotes.map((note, idx) => (
                  <div key={idx} className="!mb-4 p-4 bg-card rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 !mb-4">
                      <input
                        type="date"
                        value={note.date}
                        onChange={(e) => {
                          const newNotes = [...progressNotes];
                          newNotes[idx].date = e.target.value;
                          setProgressNotes(newNotes);
                        }}
                        className="border-2 border-theme p-2 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Entered by"
                        value={note.enteredBy}
                        onChange={(e) => {
                          const newNotes = [...progressNotes];
                          newNotes[idx].enteredBy = e.target.value;
                          setProgressNotes(newNotes);
                        }}
                        className="border-2 border-theme p-2 rounded-lg"
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Progress note..."
                      value={note.note}
                      onChange={(e) => {
                        const newNotes = [...progressNotes];
                        newNotes[idx].note = e.target.value;
                        setProgressNotes(newNotes);
                      }}
                      className="w-full mt-2 border-2 border-theme p-2 rounded-lg resize-none"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setProgressNotes([...progressNotes, { date: '', note: '', enteredBy: '' }])
                  }
                  className="text-[#A855F7] font-semibold hover:text-red-700"
                >
                  + Add Progress Note
                </button>
              </div>

              {/* WCB/WSIB Documents Upload */}
              <div className="border-t-2 border-theme pt-6">
                <h3 className="text-lg font-bold mb-4 text-primary">WCB/WSIB Documentation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      WCB/WSIB Claim Documents
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          setSelectedWcbFiles(Array.from(files));
                        }
                      }}
                      className="block w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-card file:text-red-700 hover:file:bg-red-100"
                    />
                    <p className="text-xs text-secondary mt-1">Upload claim forms, medical reports, doctor notes, etc.</p>
                    {selectedWcbFiles.length > 0 && (
                      <p className="text-xs text-[#00D1FF] mt-1">{selectedWcbFiles.length} file(s) selected</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Medical Certificates & Fitness Forms
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          setSelectedWcbFiles([...selectedWcbFiles, ...Array.from(files)]);
                        }
                      }}
                      className="block w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-card file:text-red-700 hover:file:bg-red-100"
                    />
                    <p className="text-xs text-secondary mt-1">Upload fitness certificates, return-to-work forms, etc.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t-2 border-theme">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInjuryIncidentId('');
                    setWcbClaimNumber('');
                    setDoctorRestrictions('');
                    setModifiedDutyPlan('');
                    setProgressNotes([{ date: '', note: '', enteredBy: '' }]);
                    setSelectedWcbFiles([]);
                  }}
                  className="px-6 py-3 bg-gray-200 !text-black rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFiles}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 !text-white rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50"
                >
                  <FaSave className="inline mr-2" />
                  {uploadingFiles ? 'Saving...' : 'Save RTW Plan'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  };


  const renderIncidentDetail = () => {
    if (!selectedIncidentForDetail) return null;

    const incident = selectedIncidentForDetail;
    const statusColors = getStatusColor(incident.status);
    const severityColors = getPriorityColor(incident.severity);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">{incident.incidentNumber}</h2>
              <p className="text-purple-100">{incident.type}</p>
            </div>
            <button
              onClick={() => setSelectedIncidentForDetail(null)}
              className="text-white hover:bg-card hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <FaTimes size={24} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            {/* Status and Severity */}
            <div className="flex gap-4">
              <span
                className="px-4 py-2 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                }}
              >
                {incident.status.replace('-', ' ').toUpperCase()}
              </span>
              <span
                className="px-4 py-2 rounded-full text-sm font-bold"
                style={{
                  backgroundColor: severityColors.bg,
                  color: severityColors.text,
                }}
              >
                {incident.severity.toUpperCase()} SEVERITY
              </span>
              {incident.hasInjury && (
                <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold flex items-center gap-2">
                  <FaUserInjured /> Injury Reported
                </span>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-secondary">Date & Time</label>
                <p className="text-lg font-medium text-primary">
                  {new Date(incident.date).toLocaleDateString()} at {incident.time}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-secondary">Location</label>
                <p className="text-lg font-medium text-primary flex items-center gap-2">
                  <FaMapMarkerAlt className="text-red-500" />
                  {incident.location}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-secondary">Reported By</label>
                <p className="text-lg font-medium text-primary">
                  {incident.reportedBy} ({incident.reportedByRole})
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-semibold text-secondary">Description</label>
              <p className="text-primary mt-2 leading-relaxed">{incident.description}</p>
            </div>

            {incident.immediateActionTaken && (
              <div>
                <label className="text-sm font-semibold text-secondary">Immediate Action Taken</label>
                <p className="text-primary mt-2 leading-relaxed">{incident.immediateActionTaken}</p>
              </div>
            )}

            {/* CAPA Info */}
            {incident.capa && (
              <div className="bg-card border-2 border-orange-200 rounded-xl p-6">
                <h3 className="font-bold text-lg text-primary mb-4">Corrective Action</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-secondary">CAPA Number</label>
                    <p className="font-semibold text-primary">{incident.capa.capaNumber}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary">Assigned To</label>
                    <p className="font-semibold text-primary">{incident.capa.assignedToName}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary">Due Date</label>
                    <p className="font-semibold text-primary">
                      {new Date(incident.capa.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary">Status</label>
                    <p className="font-semibold text-primary capitalize">{incident.capa.status}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-secondary">Description</label>
                    <p className="text-primary mt-1">{incident.capa.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Investigation Data */}
            {incident.investigation && (
              <div className="bg-card border-2 border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-lg text-primary mb-4 flex items-center gap-2">
                  <FaTools className="text-[#00D1FF]" />
                  Investigation & Root Cause Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-secondary">Investigation Lead</label>
                    <p className="font-semibold text-primary">{incident.investigation.investigationLead}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary">Completed Date</label>
                    <p className="font-semibold text-primary">
                      {new Date(incident.investigation.completedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary">Analysis Method</label>
                    <p className="font-semibold text-primary capitalize">
                      {incident.investigation.rootCauseType === '5-why' ? '5-Why Analysis' : 'Fishbone Diagram'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary">Root Cause</label>
                    <p className="font-semibold text-primary">{incident.investigation.rootCause}</p>
                  </div>
                </div>

                {incident.investigation.rootCauseType === '5-why' && incident.investigation.fiveWhys && (
                  <div className="mb-4 p-4 bg-card rounded-lg">
                    <label className="text-xs font-semibold text-secondary mb-2 block">5-Why Analysis</label>
                    <div className="space-y-2">
                      {incident.investigation.fiveWhys.map((why, idx) => (
                        why && (
                          <div key={idx} className="text-sm text-primary">
                            <span className="font-semibold">Why {idx + 1}:</span> {why}
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {incident.investigation.rootCauseType === 'fishbone' && incident.investigation.fishboneData && (
                  <div className="mb-4 p-4 bg-card rounded-lg">
                    <label className="text-xs font-semibold text-secondary mb-2 block">Fishbone Categories</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(incident.investigation.fishboneData).map(([key, value]) => (
                        value && (
                          <div key={key}>
                            <span className="font-semibold capitalize">{key}:</span> {value}
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-secondary mb-2 block">Detailed Findings & Analysis</label>
                  <p className="text-primary whitespace-pre-wrap bg-card p-4 rounded-lg">
                    {incident.investigation.analysis}
                  </p>
                </div>
              </div>
            )}

            {/* Injury Record & RTW */}
            {incident.injuryRecord && (
              <div className="bg-card border-2 border-red-200 rounded-xl p-6">
                <h3 className="font-bold text-lg text-primary mb-4 flex items-center gap-2">
                  <FaUserInjured className="text-[#A855F7]" />
                  Injury Management & Return-to-Work
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-secondary">Injured Worker</label>
                    <p className="font-semibold text-primary">{incident.injuryRecord.injuredWorker}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary">Injury Date</label>
                    <p className="font-semibold text-primary">
                      {new Date(incident.injuryRecord.injuryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary">Injury Type</label>
                    <p className="font-semibold text-primary">{incident.injuryRecord.injuryType}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary">Body Part</label>
                    <p className="font-semibold text-primary">{incident.injuryRecord.bodyPart}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary">Severity</label>
                    <p className="font-semibold text-primary capitalize">{incident.injuryRecord.severity}</p>
                  </div>
                  {incident.injuryRecord.wcbClaimNumber && (
                    <div>
                      <label className="text-xs font-semibold text-secondary">WCB/WSIB Claim Number</label>
                      <p className="font-semibold text-primary">{incident.injuryRecord.wcbClaimNumber}</p>
                    </div>
                  )}
                </div>

                {incident.injuryRecord.doctorRestrictions && (
                  <div className="mb-4 p-4 bg-card rounded-lg">
                    <label className="text-xs font-semibold text-secondary mb-2 block">Doctor Restrictions</label>
                    <p className="text-primary whitespace-pre-wrap">{incident.injuryRecord.doctorRestrictions}</p>
                  </div>
                )}

                {incident.injuryRecord.modifiedDutyPlan && (
                  <div className="mb-4 p-4 bg-card rounded-lg">
                    <label className="text-xs font-semibold text-secondary mb-2 block">Modified Duty Plan</label>
                    <p className="text-primary whitespace-pre-wrap">{incident.injuryRecord.modifiedDutyPlan}</p>
                  </div>
                )}

                {incident.injuryRecord.progressNotes && incident.injuryRecord.progressNotes.length > 0 && (
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-secondary mb-2 block">Progress Notes</label>
                    <div className="space-y-3">
                      {incident.injuryRecord.progressNotes.map((note, idx) => (
                        <div key={idx} className="bg-card p-4 rounded-lg border-l-4 border-red-400">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-semibold text-primary">
                              {new Date(note.date).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-secondary">By: {note.enteredBy}</span>
                          </div>
                          <p className="text-sm text-primary">{note.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {incident.injuryRecord.lastUpdated && (
                  <div className="text-xs text-secondary mt-4">
                    Last Updated: {new Date(incident.injuryRecord.lastUpdated).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* Photo Evidence */}
            {incident.photoEvidence && incident.photoEvidence.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-secondary mb-3 block">Photo Evidence</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {incident.photoEvidence.map((photo, idx) => (
                    <div key={idx} className="border-2 border-theme rounded-lg overflow-hidden">
                      <div className="bg-card h-32 flex items-center justify-center">
                        <FaImage className="text-secondary" size={32} />
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-secondary truncate">{photo.fileName}</p>
                        <a
                          href={photo.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#00D1FF] hover:underline mt-1 inline-block"
                        >
                          View/Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Evidence */}
            {incident.videoEvidence && incident.videoEvidence.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-secondary mb-3 block">Video Evidence</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incident.videoEvidence.map((video, idx) => (
                    <div key={idx} className="border-2 border-theme rounded-lg overflow-hidden">
                      <div className="bg-card h-32 flex items-center justify-center">
                        <FaVideo className="text-secondary" size={32} />
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-secondary truncate">{video.fileName}</p>
                        <a
                          href={video.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#00D1FF] hover:underline mt-1 inline-block"
                        >
                          View/Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related First Aid Logs */}
            {/* Note: firstAidLogs and FaBriefcaseMedical might need to be available or added back if they were only in the duplicate block? */}
            {/* But I saw firstAidLogs defined in the component early on? */}
            {/* No, firstAidLogs state was NOT in the initial component review? */}
            {/* Let's remove First Aid Logs section from here to be safe if it causes errors, user task was to separate it anyway! */}
            {/* User said "consolidate First Aid Logs... into respective standalone pages. This involves removing these tabs...". */}
            {/* But here it says "Related First Aid Treatment". */}
            {/* I will remove the First Aid section from the detail modal as well to be consistent with removal! */}

            <div className="flex justify-end gap-3 pt-6 border-t-2 border-theme">
              <button
                onClick={() => setSelectedIncidentForDetail(null)}
                className="px-6 py-3 bg-gray-200 !text-black rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
                <FaPrint />
                Print Report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentTab) {
      case TABS.INCIDENT_LIST:
        return renderIncidentList();
      case TABS.INVESTIGATIONS:
        return renderInvestigations();
      case TABS.INJURY_RTW:
        return renderInjuryRTW();
      default:
        return renderIncidentList();
    }
  };

  return (
    <div className="min-h-screen pb-10 flex flex-col relative bg-main" >


      <div className="flex-1 w-full  mx-auto px-4 pt-6 relative z-10">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-headings mb-1">
              Incident Management
            </h1>
            <p className="text-secondary text-xs font-medium opacity-90">Report, investigate, and track safety events</p>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowNewReportMenu(!showNewReportMenu)}
              className="px-3 py-2 bg-card text-[rgba(0,209,255,0.15)] rounded-lg shadow-sm hover:bg-card/90 transition flex items-center gap-2 font-bold text-xs"
            >
              <FaPlus size={10} /> New Report
            </button>

            {showNewReportMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-xl z-50 
                border border-white/10 overflow-hidden backdrop-blur-sm">

                {/* Header */}
                <p className="px-4 py-2 text-[10px] font-bold text-secondary 
                border-b border-white/10 bg-card uppercase tracking-wider">
                  Select Report Type
                </p>

                {/* Options */}
                <div className="py-1 divide-y divide-white/5">

                  <button
                    className="w-full text-left px-4 py-2 text-xs text-primary
                 hover:bg-white/10 hover:text-[#00D1FF]
                 active:bg-white/20
                 transition-all duration-150"
                    onClick={() => {
                      setShowNewReportMenu(false);
                      setIncidentFormType('Driver Injury');
                      setShowIncidentForm(true);
                    }}
                  >
                    Driver Injury Report
                  </button>

                  <button
                    className="w-full text-left px-4 py-2 text-xs text-primary
                 hover:bg-white/10 hover:text-[#00D1FF]
                 active:bg-white/20
                 transition-all duration-150"
                    onClick={() => {
                      setShowNewReportMenu(false);
                      setIncidentFormType('Vehicle Accident');
                      setShowIncidentForm(true);
                    }}
                  >
                    Vehicle Accident Report
                  </button>

                  <button
                    className="w-full text-left px-4 py-2 text-xs text-primary
                 hover:bg-white/10 hover:text-[#00D1FF]
                 active:bg-white/20
                 transition-all duration-150"
                    onClick={() => {
                      setShowNewReportMenu(false);
                      setIncidentFormType('Workplace Incident');
                      setShowIncidentForm(true);
                    }}
                  >
                    Workplace Incident
                  </button>

                  <button
                    className="w-full text-left px-4 py-2 text-xs text-primary
                 hover:bg-white/10 hover:text-[#00D1FF]
                 active:bg-white/20
                 transition-all duration-150"
                    onClick={() => {
                      setShowNewReportMenu(false);
                      setIncidentFormType('Near Miss');
                      setShowIncidentForm(true);
                    }}
                  >
                    Near Miss Reporting
                  </button>

                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-theme mb-6 bg-card rounded-xl shadow-sm px-2 py-1 overflow-x-auto gap-2">
          <button
            onClick={() => setCurrentTab(TABS.INCIDENT_LIST)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${currentTab === TABS.INCIDENT_LIST
              ? 'bg-card text-[#00D1FF]'
              : 'text-secondary hover:bg-[rgba(255,255,255,0.03)] hover:text-primary'
              }`}
          >
            <FaClipboardList size={14} />
            <span className="whitespace-nowrap">Incidents</span>
          </button>

          <button
            onClick={() => setCurrentTab(TABS.INVESTIGATIONS)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${currentTab === TABS.INVESTIGATIONS
              ? 'bg-card text-[#00D1FF]'
              : 'text-secondary hover:bg-[rgba(255,255,255,0.03)] hover:text-primary'
              }`}
          >
            <FaSearch />
            <span className="whitespace-nowrap">Investigations</span>
          </button>
          <button
            onClick={() => setCurrentTab(TABS.INJURY_RTW)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${currentTab === TABS.INJURY_RTW
              ? 'bg-card text-[#00D1FF]'
              : 'text-secondary hover:bg-[rgba(255,255,255,0.03)] hover:text-primary'
              }`}
          >
            <span className="whitespace-nowrap">Injury & RTW</span>
          </button>
        </div>

        {/* Tab Content */}
        {renderContent()}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[10000] p-4 bg-black/50 backdrop-blur-md">
            <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaExclamationTriangle className="text-red-500 text-3xl" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">Delete Incident?</h3>
                <p className="text-secondary">
                  Are you sure you want to delete this incident? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-5 py-2.5 bg-card hover:bg-gray-200 text-primary rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteIncident}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-red-200"
                >
                  Delete Incident
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        {notifications.map(notification => (
          <ToastNotificationComponent
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}

        {/* Incident Form Modal */}
        {showIncidentForm && incidentFormType && createPortal(
          <div className="fixed inset-0 flex justify-center items-center z-[10000] p-4 bg-black/50 backdrop-blur-md">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="text-xl font-bold">Report New {incidentFormType}</h3>
                <button onClick={() => {
                  setShowIncidentForm(false);
                  setIncidentFormType(null);
                  setSelectedPhotoFiles([]);
                  setSelectedVideoFiles([]);
                }} className="text-secondary hover:text-primary">
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleCreateIncident} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Date *</label>
                    <input
                      type="date"
                      value={incidentFormData.date}
                      onChange={(e) => setIncidentFormData({ ...incidentFormData, date: e.target.value })}
                      required
                      className="w-full border border-theme p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Time *</label>
                    <input
                      type="time"
                      value={incidentFormData.time}
                      onChange={(e) => setIncidentFormData({ ...incidentFormData, time: e.target.value })}
                      required
                      className="w-full border border-theme p-2 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Location *</label>
                    <input
                      type="text"
                      value={incidentFormData.location}
                      onChange={(e) => setIncidentFormData({ ...incidentFormData, location: e.target.value })}
                      required
                      placeholder="Location"
                      className="w-full border border-theme p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Location Type *</label>
                    <select
                      value={incidentFormData.locationType}
                      onChange={(e) => setIncidentFormData({ ...incidentFormData, locationType: e.target.value as any })}
                      required
                      className="w-full border border-theme p-2 rounded-lg"
                    >
                      <option className='form-option' value="warehouse">Warehouse</option>
                      <option className='form-option' value="yard">Yard</option>
                      <option className='form-option' value="shop">Shop</option>
                      <option className='form-option' value="highway">Highway</option>
                      <option className='form-option' value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Severity *</label>
                    <select
                      value={incidentFormData.severity}
                      onChange={(e) => setIncidentFormData({ ...incidentFormData, severity: e.target.value as any })}
                      required
                      className="w-full border border-theme p-2 rounded-lg"
                    >
                      <option className='form-option' value="low">Low</option>
                      <option className='form-option' value="medium">Medium</option>
                      <option className='form-option' value="high">High</option>
                      <option className='form-option' value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Reported By *</label>
                    <input
                      type="text"
                      value={incidentFormData.reportedBy}
                      onChange={(e) => setIncidentFormData({ ...incidentFormData, reportedBy: e.target.value })}
                      required
                      placeholder="Reporter Name"
                      className="w-full border border-theme p-2 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Reported By Role</label>
                  <input
                    type="text"
                    value={incidentFormData.reportedByRole}
                    onChange={(e) => setIncidentFormData({ ...incidentFormData, reportedByRole: e.target.value })}
                    placeholder="Role"
                    className="w-full border border-theme p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Description *</label>
                  <textarea
                    rows={4}
                    value={incidentFormData.description}
                    onChange={(e) => setIncidentFormData({ ...incidentFormData, description: e.target.value })}
                    required
                    placeholder="Describe the incident..."
                    className="w-full border border-theme p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={incidentFormData.hasInjury}
                      onChange={(e) => setIncidentFormData({ ...incidentFormData, hasInjury: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-primary">Injury Reported</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Photo Evidence</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          setSelectedPhotoFiles(Array.from(files));
                        }
                      }}
                      className="block w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-card file:text-purple-700 hover:file:bg-purple-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Video Evidence</label>
                    <input
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          setSelectedVideoFiles(Array.from(files));
                        }
                      }}
                      className="block w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-card file:text-purple-700 hover:file:bg-purple-100"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowIncidentForm(false);
                      setIncidentFormType(null);
                      setSelectedPhotoFiles([]);
                      setSelectedVideoFiles([]);
                    }}
                    className="px-4 py-2 bg-gray-200 !text-black rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingFiles}
                    className="px-4 py-2 !text-white rounded-lg disabled:opacity-50"
                    style={{
                      background: 'var(--accent-navyblue)'
                    }}
                  >
                    {uploadingFiles ? 'Creating...' : 'Create Incident'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}





        {/* Modal for Detailed Incident View */}
        {selectedIncidentForDetail && createPortal(
          <div className="fixed inset-0 flex justify-center items-center  p-4 bg-black/50 backdrop-blur-md">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="text-xl font-bold text-headings">Incident Detail: {selectedIncidentForDetail.incidentNumber}</h3>
                <button onClick={() => setSelectedIncidentForDetail(null)} className="text-secondary hover:text-primary">
                  <FaTimes />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Type:</strong> {selectedIncidentForDetail.type}
                  </div>
                  <div>
                    <strong>Date/Time:</strong> {new Date(selectedIncidentForDetail.date).toLocaleDateString()} {selectedIncidentForDetail.time}
                  </div>
                  <div>
                    <strong>Location:</strong> {selectedIncidentForDetail.location}
                  </div>
                  <div>
                    <strong>Severity:</strong>
                    <span
                      className="ml-2 px-2 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: getPriorityColor(selectedIncidentForDetail.severity).bg,
                        color: getPriorityColor(selectedIncidentForDetail.severity).text
                      }}
                    >
                      {selectedIncidentForDetail.severity.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <strong>Status:</strong>
                    <span
                      className="ml-2 px-2 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: getStatusColor(selectedIncidentForDetail.status).bg,
                        color: getStatusColor(selectedIncidentForDetail.status).text
                      }}
                    >
                      {selectedIncidentForDetail.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <strong>Reported By:</strong> {selectedIncidentForDetail.reportedBy} ({selectedIncidentForDetail.reportedByRole})
                  </div>
                </div>
                <div>
                  <strong>Description:</strong>
                  <p className="mt-2 text-primary">{selectedIncidentForDetail.description}</p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}



        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emergencyContacts.map((contact) => (
            <div
              key={contact._id}
              className={`p-5 rounded-xl border-2 ${contact.isPrimary
                ? 'border-red-500 bg-card'
                : 'border-theme bg-card'
                }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-primary">{contact.name}</h3>
                  {contact.isPrimary && (
                    <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full mt-1 inline-block">
                      PRIMARY
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditContact(contact)}
                    className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition"
                    title="Edit Contact"
                  >
                    <FaEdit size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteContact(contact._id)}
                    className="p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition"
                    title="Delete Contact"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-secondary mb-2">{contact.role}</p>
              <p className="text-sm text-secondary mb-2">{contact.department}</p>
              <div className="flex items-center gap-2 mb-1">
                <FaPhone className="text-[#00D1FF]" size={14} />
                <a href={`tel:${contact.phone}`} className="text-lg font-semibold text-[#00D1FF] hover:underline">
                  {contact.phone}
                </a>
              </div>
              {contact.alternatePhone && (
                <div className="flex items-center gap-2 mb-1">
                  <FaPhone className="text-secondary" size={12} />
                  <span className="text-sm text-secondary">Alt: {contact.alternatePhone}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2">
                  <FaEnvelope className="text-secondary" size={12} />
                  <a href={`mailto:${contact.email}`} className="text-sm text-secondary hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.available24_7 && (
                <span className="mt-2 inline-block text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                  24/7 Available
                </span>
              )}
            </div>
          ))}
        </div> */}

        {/* <div className="mt-6 flex justify-end">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
            <FaPrint /> Print Emergency Contact List
          </button>
        </div> */}
      </div>

      {renderIncidentDetail()}

    </div>
  );

};

export default IncidentManagement;
