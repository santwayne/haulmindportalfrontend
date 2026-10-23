import React, { useState, useEffect } from 'react';
import {
  FaUsersCog, FaPlus, FaTimes, FaCheckCircle, FaInfoCircle,
  FaExclamationTriangle, FaTrash
} from 'react-icons/fa';
import {
  AlertCircle,
  ClipboardList,
  Search,
  Filter,
  Clock,
  Link,
  CheckCheck,
  CheckCircle,
  XCircle,
  Bell,
  Edit,
  Users,
} from "lucide-react";


import {
  createCommitteeMember,
  getCommitteeMembers,
  updateCommitteeMember,
  deleteCommitteeMember,
  createCAPA,
  getCAPAs,
  updateCAPA,
  deleteCAPA
} from '../../../../axios/api/healthSafety';
import { getEmployees } from '../../../../axios/api/account.payroll';

const CUSTOM_COLORS = {
  background: '#EDF8FF',
  primary: '#016ab2',
  dark: '#063f6f',
  light: '#398bc3',
  gradient: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)',
  gradientVertical: 'linear-gradient(to bottom right, #016ab2, #063f6f)',
};

// ============================================================================
// ENHANCED INTERFACES - FULLY COMPLIANT WITH REQUIREMENTS
// ============================================================================

interface TrainingCompletion {
  trainingName: string;
  completionDate: string;
  expiryDate?: string;
  certificateUrl?: string;
}

interface MeetingAttendance {
  meetingId: string;
  meetingDate: string;
  attended: boolean;
  notes?: string;
}

interface CommitteeMember {
  _id: string;
  name: string;
  role: 'Chairperson (Supervisor)' | 'Employee Representative' | 'H&S Representative' | 'Management Rep';
  department: string;
  email: string;
  phone: string;
  termStartDate: string;
  termEndDate: string;
  trainingCompleted: TrainingCompletion[];
  meetingAttendance: MeetingAttendance[];
  responsibilities: string[];
  status: 'active' | 'inactive';
}







interface ReminderSchedule {
  reminderDays: number[]; // e.g., [30, 14, 7, 1]
  lastReminderSent?: string;
  nextReminderDate?: string;
  emailsSent: { date: string; recipient: string }[];
}

interface EscalationRule {
  escalateIfOverdueBy: number; // days
  escalateTo: string;
  escalationLevel: 'supervisor' | 'manager' | 'executive';
  escalationTriggered: boolean;
  escalationDate?: string;
  escalationNotes?: string;
}

interface SourceReference {
  type: 'incident' | 'hazard' | 'audit' | 'inspection' | 'meeting';
  recordId: string;
  recordTitle: string;
  linkUrl: string;
}

interface VerificationChecklist {
  item: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedDate?: string;
  notes?: string;
}

interface CAPA {
  _id: string;
  capaNumber: string;
  title: string;
  type: 'corrective' | 'preventive';
  source: string;
  sourceReference: SourceReference;
  issueDate: string;
  dueDate: string;
  status: 'open' | 'in-progress' | 'completed' | 'overdue' | 'cancelled';
  assignedTo: string | any;
  assignedToEmail?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  rootCause?: string;
  correctiveActions: string[];
  preventiveActions: string[];
  resourcesRequired: string[];
  estimatedCost?: number;
  actualCost?: number;
  reminderSchedule: ReminderSchedule;
  escalationRules: EscalationRule;
  verificationRequired: boolean;
  verificationChecklist: VerificationChecklist[];
  verificationCompletedBy?: string;
  verificationDate?: string;
  evidenceUrls: string[];
  followUpDate?: string;
  completionDate?: string;
  completionNotes?: string;
  effectiveness: 'not-assessed' | 'effective' | 'partially-effective' | 'ineffective';
  effectivenessReviewDate?: string;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
}

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EnhancedCommitteeCAPA = () => {
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [capas, setCapas] = useState<CAPA[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'committee' | 'capa'>('committee');
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [notificationId, setNotificationId] = useState(0);

  // Modal states
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null);
  const [showCAPAModal, setShowCAPAModal] = useState(false);
  const [editingCAPA, setEditingCAPA] = useState<CAPA | null>(null);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteParams, setDeleteParams] = useState<{ id: string; type: 'member' | 'capa' } | null>(null);

  // Form states
  const [memberFormData, setMemberFormData] = useState({
    name: '',
    role: '',
    department: '',
    email: '',
    phone: ''
  });

  const [capaFormData, setCapaFormData] = useState({
    title: '',
    type: 'corrective' as 'corrective' | 'preventive',
    source: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    status: 'open' as 'open' | 'in-progress' | 'completed' | 'overdue' | 'cancelled',
    assignedTo: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    description: '',
    rootCause: '',
    correctiveAction: '',
    preventiveAction: ''
  });

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = notificationId + 1;
    setNotificationId(id);
    setNotifications([...notifications, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const fetchMembers = async () => {
    try {
      const response = await getCommitteeMembers();
      if (response?.success && Array.isArray(response.data)) {
        setMembers(response.data.map((member: any) => ({
          ...member,
          trainingCompleted: member.trainingCompleted || [],
          meetingAttendance: member.meetingAttendance || [],
          responsibilities: member.responsibilities || []
        })));
      }
    } catch (error: any) {
      console.error('Error fetching committee members:', error);
      showNotification('error', error?.response?.data?.message || 'Failed to fetch committee members');
    }
  };

  const fetchCAPAs = async () => {
    try {
      const response = await getCAPAs({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchTerm || undefined
      });
      if (response?.success && Array.isArray(response.data)) {
        setCapas(response.data.map((item: any) => {
          // Handle assignedTo - could be object with name/email or string
          let assignedToName = 'Unknown';
          if (typeof item.assignedTo === 'object' && item.assignedTo) {
            assignedToName = item.assignedTo.name || item.assignedTo.email || 'Unknown';
          } else if (typeof item.assignedTo === 'string' && item.assignedTo) {
            assignedToName = item.assignedTo;
          }

          // Handle correctiveAction and preventiveAction - could be string or array
          let correctiveActions: string[] = [];
          if (Array.isArray(item.correctiveActions)) {
            correctiveActions = item.correctiveActions;
          } else if (item.correctiveAction) {
            correctiveActions = [item.correctiveAction];
          } else if (typeof item.correctiveActions === 'string') {
            correctiveActions = [item.correctiveActions];
          }

          let preventiveActions: string[] = [];
          if (Array.isArray(item.preventiveActions)) {
            preventiveActions = item.preventiveActions;
          } else if (item.preventiveAction) {
            preventiveActions = [item.preventiveAction];
          } else if (typeof item.preventiveActions === 'string') {
            preventiveActions = [item.preventiveActions];
          }

          return {
            _id: item._id,
            capaNumber: item.capaNumber || '',
            title: item.title || '',
            type: item.type || 'corrective',
            source: item.source || '',
            issueDate: item.issueDate || new Date().toISOString(),
            dueDate: item.dueDate || new Date().toISOString(),
            status: item.status || 'open',
            assignedTo: assignedToName,
            priority: item.priority || 'medium',
            description: item.description || '',
            rootCause: item.rootCause || '',
            correctiveActions: correctiveActions,
            preventiveActions: preventiveActions,
            resourcesRequired: item.resourcesRequired || [],
            estimatedCost: item.estimatedCost,
            reminderSchedule: item.reminderSchedule || { reminderDays: [], emailsSent: [] },
            escalationRules: item.escalationRules || { escalateIfOverdueBy: 0, escalateTo: '', escalationLevel: 'supervisor', escalationTriggered: false },
            verificationRequired: item.verificationRequired || false,
            verificationChecklist: item.verificationChecklist || [],
            evidenceUrls: item.evidenceUrls || [],
            effectiveness: item.effectiveness || 'not-assessed',
            sourceReference: item.sourceReference || { type: 'incident', recordId: '', recordTitle: '', linkUrl: '' }
          };
        }));
      }
    } catch (error: any) {
      console.error('Error fetching CAPAs:', error);
      showNotification('error', error?.response?.data?.message || 'Failed to fetch CAPAs');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await getEmployees();
      if (response?.success && Array.isArray(response.data)) {
        setEmployees(response.data.map((emp: any) => ({
          _id: emp._id,
          name: emp.name,
          email: emp.email
        })));
      }
    } catch (error: any) {
      console.error('Error fetching employees:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMembers(), fetchCAPAs(), fetchEmployees()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'capa') {
      fetchCAPAs();
    }
  }, [filterStatus, searchTerm, activeTab]);

  // Mock data removed - using real API data only

  // Helper Functions
  const getStatusColor = (status: CAPA['status'] | undefined) => {
    const statusMap: { [key in CAPA['status']]: string } = {
      'completed': 'bg-green-100 text-green-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'open': 'bg-yellow-100 text-yellow-800',
      'overdue': 'bg-red-100 text-red-800',
      'cancelled': 'bg-card text-primary'
    };
    return statusMap[status || 'open'];
  };

  const getPriorityColor = (priority: CAPA['priority'] | undefined) => {
    const priorityMap: { [key in CAPA['priority']]: string } = {
      'critical': 'bg-red-600 text-white',
      'high': 'bg-orange-500 text-white',
      'medium': 'bg-yellow-500 text-white',
      'low': 'bg-green-500 text-white'
    };
    return priorityMap[priority || 'medium'];
  };

  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleCreateMember = () => {
    setEditingMember(null);
    setMemberFormData({
      name: '',
      role: '',
      department: '',
      email: '',
      phone: ''
    });
    setShowMemberModal(true);
  };



  const confirmDelete = async () => {
    if (!deleteParams) return;

    if (deleteParams.type === 'member') {
      try {
        const response = await deleteCommitteeMember(deleteParams.id);
        if (response?.success) {
          showNotification('success', 'Committee member deleted successfully');
          fetchMembers();
        } else {
          showNotification('error', response?.message || 'Failed to delete committee member');
        }
      } catch (error: any) {
        console.error('Error deleting committee member:', error);
        showNotification('error', error?.response?.data?.message || 'Failed to delete committee member');
      }
    } else if (deleteParams.type === 'capa') {
      try {
        const response = await deleteCAPA(deleteParams.id);
        if (response?.success) {
          showNotification('success', 'CAPA deleted successfully');
          fetchCAPAs();
        } else {
          showNotification('error', response?.message || 'Failed to delete CAPA');
        }
      } catch (error: any) {
        console.error('Error deleting CAPA:', error);
        showNotification('error', error?.response?.data?.message || 'Failed to delete CAPA');
      }
    }
    setShowDeleteModal(false);
    setDeleteParams(null);
  };

  const handleSubmitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMember) {
        const response = await updateCommitteeMember(editingMember._id, memberFormData);
        if (response?.success) {
          showNotification('success', 'Committee member updated successfully');
          setShowMemberModal(false);
          fetchMembers();
        } else {
          showNotification('error', response?.message || 'Failed to update committee member');
        }
      } else {
        const response = await createCommitteeMember(memberFormData);
        if (response?.success) {
          showNotification('success', 'Committee member created successfully');
          setShowMemberModal(false);
          fetchMembers();
        } else {
          showNotification('error', response?.message || 'Failed to create committee member');
        }
      }
    } catch (error: any) {
      console.error('Error saving committee member:', error);
      showNotification('error', error?.response?.data?.message || 'Failed to save committee member');
    }
  };

  const handleCreateCAPA = () => {
    setEditingCAPA(null);
    setCapaFormData({
      title: '',
      type: 'corrective',
      source: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'open',
      assignedTo: '',
      priority: 'medium',
      description: '',
      rootCause: '',
      correctiveAction: '',
      preventiveAction: ''
    });
    setShowCAPAModal(true);
  };

  const handleEditCAPA = (capa: CAPA) => {
    setEditingCAPA(capa);
    // Find the employee ID if assignedTo is a name
    const assignedToId = typeof capa.assignedTo === 'string'
      ? employees.find(emp => emp.name === capa.assignedTo)?._id || ''
      : (capa.assignedTo?._id || '');

    setCapaFormData({
      title: capa.title || '',
      type: capa.type || 'corrective',
      source: capa.source || '',
      issueDate: capa.issueDate ? new Date(capa.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: capa.dueDate ? new Date(capa.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: capa.status || 'open',
      assignedTo: assignedToId,
      priority: capa.priority || 'medium',
      description: capa.description || '',
      rootCause: capa.rootCause || '',
      correctiveAction: Array.isArray(capa.correctiveActions) ? capa.correctiveActions.join('\n') : (capa.correctiveActions || ''),
      preventiveAction: Array.isArray(capa.preventiveActions) ? capa.preventiveActions.join('\n') : (capa.preventiveActions || '')
    });
    setShowCAPAModal(true);
  };

  const handleDeleteCAPA = (id: string) => {
    setDeleteParams({ id, type: 'capa' });
    setShowDeleteModal(true);
  };

  const handleSubmitCAPA = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!capaFormData.title || !capaFormData.type || !capaFormData.source || !capaFormData.issueDate || !capaFormData.dueDate || !capaFormData.assignedTo) {
      showNotification('error', 'Please fill in all required fields');
      return;
    }

    try {
      // Prepare payload for API
      const payload = {
        title: capaFormData.title.trim(),
        type: capaFormData.type,
        source: capaFormData.source.trim(),
        issueDate: capaFormData.issueDate,
        dueDate: capaFormData.dueDate,
        status: capaFormData.status,
        assignedTo: capaFormData.assignedTo,
        priority: capaFormData.priority,
        description: capaFormData.description || '',
        rootCause: capaFormData.rootCause || '',
        correctiveAction: capaFormData.correctiveAction || '',
        preventiveAction: capaFormData.preventiveAction || ''
      };

      if (editingCAPA) {
        const response = await updateCAPA(editingCAPA._id, payload);
        if (response?.success) {
          showNotification('success', 'CAPA updated successfully');
          setShowCAPAModal(false);
          setEditingCAPA(null);
          fetchCAPAs();
        } else {
          showNotification('error', response?.message || 'Failed to update CAPA');
        }
      } else {
        const response = await createCAPA(payload);
        if (response?.success) {
          showNotification('success', 'CAPA created successfully');
          setShowCAPAModal(false);
          fetchCAPAs();
        } else {
          showNotification('error', response?.message || 'Failed to create CAPA');
        }
      }
    } catch (error: any) {
      console.error('Error saving CAPA:', error);
      showNotification('error', error?.response?.data?.message || error?.message || 'Failed to save CAPA');
    }
  };

  const filteredCapas = capas.filter(capa => {
    const matchesSearch =
      (capa.capaNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (capa.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof capa.assignedTo === 'string' && capa.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || (capa.status || 'open') === filterStatus;
    const matchesPriority = filterPriority === 'all' || (capa.priority || 'medium') === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Statistics
  const capaStats = {
    total: capas.length,
    overdue: capas.filter(c => (c.status || 'open') === 'overdue').length,
    dueThisWeek: capas.filter(c => {
      if (!c.dueDate) return false;
      const days = getDaysUntilDue(c.dueDate);
      return days >= 0 && days <= 7 && (c.status || 'open') !== 'completed';
    }).length,
    inProgress: capas.filter(c => (c.status || 'open') === 'in-progress').length,
    completed: capas.filter(c => (c.status || 'open') === 'completed').length
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderCommitteeManagement = () => (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-headings" >
          <FaUsersCog /> H&S Committee Members
        </h2>
        <button
          onClick={handleCreateMember}
          className="px-4 py-2 rounded-lg !text-white shadow-md hover:opacity-90 transition flex items-center gap-2 bg-[var(--accent-navyblue)]"

        >
          <FaPlus /> Add Member
        </button>
      </div>
      <p className="mb-6 text-secondary">
        Federally mandated committee structure: <strong>Supervisor (Chair)</strong>, <strong>Employee Representative</strong>, and <strong>H&S Rep</strong>. Track training, attendance, term dates.
      </p>

      <div className="bg-card rounded-xl shadow-lg overflow-hidden p-6 ">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <div key={member._id} className="border-2 border-theme rounded-lg p-5 hover:shadow-xl transition ">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg text-headings">{member.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-card text-primary'
                  }`}>
                  {(member.status || 'unknown').toUpperCase()}
                </span>
              </div>

              <div className="mb-3 bg-[var(--accent-navyblue)]/20 border-2 border-theme p-2 rounded-lg">
                <p className="text-sm font-bold text-primary">{member.role}</p>
              </div>

              <div className="space-y-2 text-sm text-primary mb-4">
                <p><strong className="text-headings">Dept:</strong> {member.department}</p>
                <p><strong className="text-headings">Email:</strong> {member.email}</p>
                <p><strong className="text-headings">Phone:</strong> {member.phone}</p>
                <p><strong className="text-headings">Term:</strong> {new Date(member.termStartDate).toLocaleDateString()} - {new Date(member.termEndDate).toLocaleDateString()}</p>
              </div>

              <div className="mb-4">
                <p className="text-xs font-bold text-secondary mb-1">TRAINING COMPLETED:</p>
                {(!member.trainingCompleted || member.trainingCompleted.length === 0) ? (
                  <p className="text-xs text-headings">⚠️ No training recorded</p>
                ) : (
                  member.trainingCompleted.map((training, idx) => (
                    <div key={idx} className="text-xs bg-green-50 p-2 rounded mb-1">
                      <div className="font-semibold text-green-900">{training.trainingName || 'N/A'}</div>
                      <div className="text-green-700">Completed: {training.completionDate ? new Date(training.completionDate).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="mb-4">
                <p className="text-xs font-bold text-secondary mb-1">MEETING ATTENDANCE:</p>
                <p className="text-sm">
                  {member.meetingAttendance && member.meetingAttendance.length > 0
                    ? `${member.meetingAttendance.filter(a => a.attended).length} / ${member.meetingAttendance.length} meetings attended`
                    : 'No attendance records'}
                </p>
              </div>

            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-card border-2 border-theme rounded-xl p-5">
        <h3 className="font-bold text-headings mb-2 flex items-center gap-2">
          <FaCheckCircle /> CLC Compliance Requirements Met
        </h3>
        <ul className="text-sm text-headings space-y-1">
          <li>✅ Committee structure includes Supervisor (Chair), Employee Rep, and H&S Rep</li>
          <li>✅ Member training tracked (H&S Committee Training, Investigation Training)</li>
          <li>✅ Meeting attendance records maintained</li>
          <li>✅ Term start/end dates documented</li>
        </ul>
      </div>
    </>
  );



  const renderCAPAManagement = () => (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-headings">
          <ClipboardList className="w-7 h-7" /> CAPA Management System
        </h2>
        <button
          onClick={handleCreateCAPA}
          className="px-4 py-2 rounded-lg !text-white shadow-md hover:opacity-90 transition flex items-center gap-2 bg-[var(--accent-navyblue)]"

        >
          <FaPlus /> New CAPA
        </button>
      </div>
      <p className="mb-6 text-secondary">
        Corrective & Preventive Action tracking with automated reminders, escalation rules, and verification checklists.
      </p>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="text-3xl font-bold text-primary">{capaStats.total}</div>
          <div className="text-sm text-secondary">Total CAPAs</div>
        </div>
        <div className="bg-[var(--accent-red)]/20 rounded-lg shadow-md p-4 border-2 border-theme">
          <div className="text-3xl font-bold text-[var(--accent-red)]">{capaStats.overdue}</div>
          <div className="text-sm text-[var(--accent-red)]">Overdue</div>
        </div>
        <div className="bg-[var(--accent-green)]/20 rounded-lg shadow-md p-4 border-2 border-theme">
          <div className="text-3xl font-bold text-[#00FFA3]">{capaStats.dueThisWeek}</div>
          <div className="text-sm text-[#00FFA3]">Due This Week</div>
        </div>
        <div className="bg-[var(--accent-blue)]/20 rounded-lg shadow-md p-4 border-2 border-theme">
          <div className="text-3xl font-bold text-[var(--accent-blue)]">{capaStats.inProgress}</div>
          <div className="text-sm text-[var(--accent-blue)]">In Progress</div>
        </div>
        <div className="bg-[var(--accent-green)]/20 rounded-lg shadow-md p-4 border-2 border-theme">
          <div className="text-3xl font-bold text-[var(--accent-green)]">{capaStats.completed}</div>
          <div className="text-sm text-[var(--accent-green)]">Completed</div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-card rounded-xl shadow-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-secondary" />
            <input
              type="text"
              placeholder="Search CAPA number, title, or assignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-theme rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 w-5 h-5 text-secondary" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  appearance-none cursor-pointer transition-all"
            >
              <option value="all" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                All Statuses
              </option>

              <option value="open" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Open
              </option>

              <option value="in-progress" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                In Progress
              </option>

              <option value="completed" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Completed
              </option>

              <option value="overdue" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Overdue
              </option>
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 w-5 h-5 text-secondary" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  appearance-none cursor-pointer transition-all"
            >
              <option value="all" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                All Priorities
              </option>

              <option value="critical" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Critical
              </option>

              <option value="high" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                High
              </option>

              <option value="medium" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Medium
              </option>

              <option value="low" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Low
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* CAPA Cards */}
      <div className="space-y-4">
        {filteredCapas.map((capa) => {
          const daysUntilDue = getDaysUntilDue(capa.dueDate);
          const isUrgent = daysUntilDue <= 7 && capa.status !== 'completed';

          return (
            <div key={capa._id} className={`bg-card rounded-xl shadow-lg overflow-hidden ${isUrgent ? 'border-2 border-red-500' : ''
              }`}>
              {/* Header */}
              <div className="bg-card p-4 text-white" style={{ background: CUSTOM_COLORS.gradient }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{capa.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(capa.priority || 'medium')}`}>
                        {(capa.priority || 'medium').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-mono font-bold">{capa.capaNumber || 'N/A'}</span>
                      <span>•</span>
                      <span>{(capa.type || 'corrective') === 'corrective' ? 'Corrective Action' : 'Preventive Action'}</span>
                      <span>•</span>
                      <span>Source: {capa.source || 'N/A'}</span>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold ${getStatusColor(capa.status)}`}>
                    {(capa.status || 'open').replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {/* Alert for Overdue/Urgent */}
                {capa.status === 'overdue' && (
                  <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3 mb-4 flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-[#A855F7]" />
                    <div>
                      <p className="font-bold text-red-800">OVERDUE - Action Required!</p>
                      <p className="text-sm text-red-700">
                        {capa.escalationRules.escalationTriggered && (
                          <>Escalated to {capa.escalationRules.escalateTo} on {new Date(capa.escalationRules.escalationDate!).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {isUrgent && capa.status !== 'overdue' && (
                  <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3 mb-4 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-[#00FFA3]" />
                    <div>
                      <p className="font-bold text-yellow-800">Due in {daysUntilDue} days</p>
                      <p className="text-sm text-yellow-700">This CAPA requires immediate attention</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-secondary mb-1">DESCRIPTION:</p>
                      <p className="text-sm text-primary">{capa.description}</p>
                    </div>

                    {capa.rootCause && (
                      <div>
                        <p className="text-xs font-bold text-secondary mb-1">ROOT CAUSE:</p>
                        <p className="text-sm text-primary bg-card p-2 rounded">{capa.rootCause}</p>
                      </div>
                    )}

                    {capa.correctiveActions && capa.correctiveActions.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-secondary mb-2">CORRECTIVE ACTIONS:</p>
                        <ul className="space-y-1">
                          {capa.correctiveActions.map((action, idx) => (
                            <li key={idx} className="text-sm text-primary flex gap-2">
                              <span className="text-green-600">✓</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {capa.preventiveActions && capa.preventiveActions.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-secondary mb-2">PREVENTIVE ACTIONS:</p>
                        <ul className="space-y-1">
                          {capa.preventiveActions.map((action, idx) => (
                            <li key={idx} className="text-sm text-primary flex gap-2">
                              <span className="text-[#00D1FF]">→</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="bg-card p-3 rounded-lg">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-secondary">Assigned To:</p>
                          <p className="font-semibold text-primary">{capa.assignedTo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-secondary">Issue Date:</p>
                          <p className="font-semibold text-primary">{new Date(capa.issueDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-secondary">Due Date:</p>
                          <p className="font-semibold text-primary">{new Date(capa.dueDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-secondary">Est. Cost:</p>
                          <p className="font-semibold text-primary">${capa.estimatedCost?.toLocaleString() || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Source Reference Link */}
                    {capa.sourceReference && capa.sourceReference.recordTitle && (
                      <div className="bg-card p-3 rounded-lg border border-blue-200">
                        <p className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-2">
                          <Link className="w-4 h-4" /> SOURCE RECORD
                        </p>
                        <div className="text-sm">
                          <p className="text-blue-800 font-semibold">{capa.sourceReference.recordTitle}</p>
                          {capa.sourceReference.recordId && (
                            <p className="text-blue-700 text-xs">ID: {capa.sourceReference.recordId}</p>
                          )}
                          {capa.sourceReference.linkUrl && (
                            <button className="mt-2 text-xs text-[#00D1FF] hover:text-blue-800 underline">
                              View Original Record →
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Verification Checklist */}
                    {capa.verificationRequired && capa.verificationChecklist && capa.verificationChecklist.length > 0 && (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <p className="text-xs font-bold text-green-900 mb-2 flex items-center gap-2">
                          <CheckCheck className="w-4 h-4" /> VERIFICATION CHECKLIST
                        </p>
                        <div className="space-y-2">
                          {capa.verificationChecklist.map((check, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              {check.verified ? (
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-secondary mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className={`text-sm ${check.verified ? 'text-green-900 line-through' : 'text-primary'}`}>
                                  {check.item}
                                </p>
                                {check.verified && check.verifiedBy && (
                                  <p className="text-xs text-green-700">
                                    ✓ {check.verifiedBy} {check.verifiedDate && `on ${new Date(check.verifiedDate).toLocaleDateString()}`}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reminder Schedule */}
                    {capa.reminderSchedule && capa.reminderSchedule.emailsSent && capa.reminderSchedule.emailsSent.length > 0 && (
                      <div className="bg-card p-3 rounded-lg border border-yellow-200">
                        <p className="text-xs font-bold text-yellow-900 mb-2 flex items-center gap-2">
                          <Bell className="w-4 h-4" /> REMINDER HISTORY
                        </p>
                        <div className="space-y-1">
                          {capa.reminderSchedule.emailsSent.slice(-3).map((email, idx) => (
                            <p key={idx} className="text-xs text-yellow-800">
                              {new Date(email.date).toLocaleDateString()} - Sent to {email.recipient}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => handleEditCAPA(capa)}
                    className="flex-1 bg-green-600 hover:bg-green-700 !text-white py-2 px-4 rounded-lg transition font-semibold flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit CAPA
                  </button>
                  <button
                    onClick={() => handleDeleteCAPA(capa._id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 !text-white py-2 px-4 rounded-lg transition font-semibold flex items-center justify-center gap-2"
                  >
                    <FaTrash className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCapas.length === 0 && (
        <div className="bg-card rounded-xl p-12 text-center">
          <ClipboardList className="w-16 h-16 text-secondary mx-auto mb-4" />
          <p className="text-xl font-semibold text-secondary">No CAPAs found</p>
          <p className="text-secondary mt-2">Try adjusting your search or filter criteria</p>
        </div>
      )}

      <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="font-bold text-white mb-2 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> CAPA System Features
        </h3>
        <ul className="text-sm text-white space-y-1">
          <li>✅ Automated reminder system with email tracking</li>
          <li>✅ Escalation rules with automatic triggers</li>
          <li>✅ Verification checklists for quality assurance</li>
          <li>✅ Source record linkage (incidents, hazards, audits)</li>
          <li>✅ Cost tracking and effectiveness assessment</li>
          <li>✅ Priority-based workflow management</li>
        </ul>
      </div>
    </>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-primary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-main">
      <div className="w-full mx-auto">
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

        {/* Header */}


        {/* Tab Navigation */}
        <div className="bg-card rounded-xl shadow-lg mb-6 p-2 flex gap-2">
          <button
            onClick={() => setActiveTab('committee')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${activeTab === 'committee'
              ? '!text-white'
              : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
              }`}
            style={activeTab === 'committee' ? { background: CUSTOM_COLORS.primary } : {}}
          >
            <Users className="w-5 h-5" />
            H&S Committee
          </button>
          <button
            onClick={() => setActiveTab('capa')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${activeTab === 'capa'
              ? '!text-white'
              : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
              }`}
            style={activeTab === 'capa' ? { background: CUSTOM_COLORS.primary } : {}}
          >
            <ClipboardList className="w-5 h-5" />
            CAPA Management
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'committee' && renderCommitteeManagement()}
          {activeTab === 'capa' && renderCAPAManagement()}
        </div>

        {/* Committee Member Modal */}
        {showMemberModal && (
          <div className="fixed inset-0 bg-card/30 backdrop-blur-md z-50 flex items-center justify-center p-4 ">
            <div className="bg-card rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-theme">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">{editingMember ? 'Edit Member' : 'Add Member'}</h2>
                  <button
                    onClick={() => setShowMemberModal(false)}
                    className="text-secondary hover:text-secondary"
                  >
                    <FaTimes size={24} />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmitMember} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-headings mb-1">Name *</label>
                  <input
                    type="text"
                    value={memberFormData.name}
                    onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                    required
                    className="w-full border border-theme p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-1">Role *</label>
                  <input
                    type="text"
                    value={memberFormData.role}
                    onChange={(e) => setMemberFormData({ ...memberFormData, role: e.target.value })}
                    required
                    placeholder="e.g., Chairperson, Member"
                    className="w-full border border-theme p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-1">Department *</label>
                  <input
                    type="text"
                    value={memberFormData.department}
                    onChange={(e) => setMemberFormData({ ...memberFormData, department: e.target.value })}
                    required
                    className="w-full border border-theme p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-1">Email *</label>
                  <input
                    type="email"
                    value={memberFormData.email}
                    onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                    required
                    className="w-full border border-theme p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={memberFormData.phone}
                    onChange={(e) => setMemberFormData({ ...memberFormData, phone: e.target.value })}
                    required
                    className="w-full border border-theme p-2 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowMemberModal(false)}
                    className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg !text-white bg-[var(--accent-navyblue)]"

                  >
                    {editingMember ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CAPA Modal */}
        {showCAPAModal && (
          <div className="fixed inset-0 bg-card/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-theme">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">{editingCAPA ? 'Edit CAPA' : 'New CAPA'}</h2>
                  <button
                    onClick={() => {
                      setShowCAPAModal(false);
                      setEditingCAPA(null);
                      setCapaFormData({
                        title: '',
                        type: 'corrective',
                        source: '',
                        issueDate: new Date().toISOString().split('T')[0],
                        dueDate: new Date().toISOString().split('T')[0],
                        status: 'open',
                        assignedTo: '',
                        priority: 'medium',
                        description: '',
                        rootCause: '',
                        correctiveAction: '',
                        preventiveAction: ''
                      });
                    }}
                    className="text-secondary hover:text-secondary"
                  >
                    <FaTimes size={24} />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmitCAPA} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Title *</label>
                  <input
                    type="text"
                    value={capaFormData.title}
                    onChange={(e) => setCapaFormData({ ...capaFormData, title: e.target.value })}
                    required
                    className="w-full border border-theme p-2 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Type *</label>
                    <select
                      value={capaFormData.type}
                      onChange={(e) => setCapaFormData({ ...capaFormData, type: e.target.value as any })}
                      required
                      className="w-full border border-theme p-2 rounded-lg"
                    >
                      <option className='form-option' value="corrective">Corrective</option>
                      <option className='form-option' value="preventive">Preventive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Priority *</label>
                    <select
                      value={capaFormData.priority}
                      onChange={(e) => setCapaFormData({ ...capaFormData, priority: e.target.value as any })}
                      required
                      className="w-full border border-theme p-2 rounded-lg"
                    >
                      <option className='form-option' value="low">Low</option>
                      <option className='form-option' value="medium">Medium</option>
                      <option className='form-option' value="high">High</option>
                      <option className='form-option' value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Source *</label>
                  <input
                    type="text"
                    value={capaFormData.source}
                    onChange={(e) => setCapaFormData({ ...capaFormData, source: e.target.value })}
                    required
                    placeholder="e.g., Incident Report, Safety Audit"
                    className="w-full border border-theme p-2 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Issue Date *</label>
                    <input
                      type="date"
                      value={capaFormData.issueDate}
                      onChange={(e) => setCapaFormData({ ...capaFormData, issueDate: e.target.value })}
                      required
                      className="w-full border border-theme p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Due Date *</label>
                    <input
                      type="date"
                      value={capaFormData.dueDate}
                      onChange={(e) => setCapaFormData({ ...capaFormData, dueDate: e.target.value })}
                      required
                      className="w-full border border-theme p-2 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Status *</label>
                    <select
                      value={capaFormData.status}
                      onChange={(e) => setCapaFormData({ ...capaFormData, status: e.target.value as any })}
                      required
                      className="w-full border border-theme p-2 rounded-lg"
                    >
                      <option className='form-option' value="open">Open</option>
                      <option className='form-option' value="in-progress">In Progress</option>
                      <option className='form-option' value="completed">Completed</option>
                      <option className='form-option' value="overdue">Overdue</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Assigned To *</label>
                    <select
                      value={capaFormData.assignedTo}
                      onChange={(e) => setCapaFormData({ ...capaFormData, assignedTo: e.target.value })}
                      required
                      className="w-full border border-theme p-2 rounded-lg"
                    >
                      <option className='form-option' value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option className='form-option' key={emp._id} value={emp._id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-4 !pt-4 ">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCAPAModal(false);
                      setEditingCAPA(null);
                      setCapaFormData({
                        title: '',
                        type: 'corrective',
                        source: '',
                        issueDate: new Date().toISOString().split('T')[0],
                        dueDate: new Date().toISOString().split('T')[0],
                        status: 'open',
                        assignedTo: '',
                        priority: 'medium',
                        description: '',
                        rootCause: '',
                        correctiveAction: '',
                        preventiveAction: ''
                      });
                    }}
                    className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg !text-white bg-[var(--accent-navyblue)]"
                   
                  >
                    {editingCAPA ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all scale-100 opacity-100">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <FaTrash className="text-[#A855F7] text-xl" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">Delete Confirmation</h3>
                <p className="text-secondary text-sm mb-6">
                  Are you sure you want to delete this {deleteParams?.type === 'member' ? 'Committee Member' : 'CAPA'}? This action cannot be undone.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 bg-card text-primary font-bold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 bg-red-600 !text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedCommitteeCAPA;
