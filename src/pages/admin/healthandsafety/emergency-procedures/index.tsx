import React, { useState, useEffect } from 'react';
const CUSTOM_COLORS = {
  background: '#EDF8FF',
  primary: '#016ab2',
  dark: '#063f6f',
  light: '#398bc3',
  gradient: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)',
  gradientVertical: 'linear-gradient(to bottom right, #016ab2, #063f6f)',
};
import {
  FaAmbulance,
  FaFire,
  FaFlask,
  FaCar,
  FaPhone,
  FaEnvelope,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaPrint,
  FaChevronDown,
  FaChevronRight,
  FaExclamationTriangle,
  FaFileAlt,
  FaClipboardList,
  FaTimes,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import {
  createEmergencyContact,
  getEmergencyContacts,
  updateEmergencyContact,
  deleteEmergencyContact,
  createEmergencyProcedure,
  getEmergencyProcedures,
  updateEmergencyProcedure,
  deleteEmergencyProcedure,
  createFirstAidLog,
  getFirstAidLogs,
  updateFirstAidLog,
  deleteFirstAidLog,
} from '../../../../axios/api/healthSafety';

interface EmergencyContact {
  _id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  department: string;
  isPrimary: boolean;
  available24_7?: boolean;
  alternatePhone?: string;
}

interface EmergencyProcedure {
  _id: string;
  title: string;
  type: 'medical' | 'fire' | 'spill' | 'collision' | 'breakdown' | 'violence' | 'other';
  procedure: string;
  lastUpdated: string;
  quickReferenceSteps?: string[];
  documentUrl?: string;
  documents?: Array<{
    fileUrl: string;
    fileName: string;
    fileType: 'image' | 'video' | 'document';
    uploadedAt: string;
    uploadedBy: string;
  }>;
}

interface FirstAidLog {
  _id: string;
  date: string;
  time: string;
  location: string;
  injuredPerson: string;
  injuryDescription: string;
  firstAidProvided: string;
  treatedBy: string;
  followUpRequired: boolean;
  relatedIncident?: string;
}

interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const ToastNotificationComponent = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaTimesCircle className="text-red-500" size={24} />,
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

const EmergencyProcedures: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [procedures, setProcedures] = useState<EmergencyProcedure[]>([]);
  const [firstAidLogs, setFirstAidLogs] = useState<FirstAidLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Silence unused variable warning
  useEffect(() => {
    if (loading) console.log('Loading emergency data...');
  }, [loading]);

  const [activeTab, setActiveTab] = useState<'contacts' | 'procedures' | 'firstaid'>('contacts');
  const [expandedProcedure, setExpandedProcedure] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showProcedureForm, setShowProcedureForm] = useState(false);
  const [showFirstAidForm, setShowFirstAidForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [editingProcedure, setEditingProcedure] = useState<EmergencyProcedure | null>(null);
  const [editingFirstAid, setEditingFirstAid] = useState<FirstAidLog | null>(null);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [newContact, setNewContact] = useState({
    name: '',
    role: '',
    phone: '',
    email: '',
    department: '',
    isPrimary: false,
    available24_7: false,
    alternatePhone: '',
  });

  const [newProcedure, setNewProcedure] = useState({
    title: '',
    type: 'medical' as EmergencyProcedure['type'],
    procedure: '',
    quickReferenceSteps: [''],
  });

  const [newFirstAidLog, setNewFirstAidLog] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: '',
    injuredPerson: '',
    injuryDescription: '',
    firstAidProvided: '',
    treatedBy: '',
    followUpRequired: false,
    relatedIncident: '',
  });

  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItemType, setDeleteItemType] = useState<'contact' | 'procedure' | 'firstaid' | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFirstAidLog, setSelectedFirstAidLog] = useState<FirstAidLog | null>(null);

  const addNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contactsRes, proceduresRes, firstAidRes] = await Promise.all([
        getEmergencyContacts(),
        getEmergencyProcedures(),
        getFirstAidLogs(),
      ]);

      if (contactsRes.success) {
        setContacts(contactsRes.data || []);
      } else {
        addNotification('error', contactsRes.message || 'Failed to load emergency contacts');
      }

      if (proceduresRes.success) {
        setProcedures(proceduresRes.data || []);
      } else {
        addNotification('error', proceduresRes.message || 'Failed to load emergency procedures');
      }

      if (firstAidRes.success) {
        setFirstAidLogs(firstAidRes.data || []);
      } else {
        addNotification('error', firstAidRes.message || 'Failed to load first aid logs');
      }
    } catch (error: any) {
      addNotification('error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !deleteItemType) return;

    try {
      let result;
      let successMessage = '';
      let errorMessage = '';

      if (deleteItemType === 'contact') {
        result = await deleteEmergencyContact(itemToDelete._id);
        successMessage = 'Contact deleted successfully';
        errorMessage = 'Failed to delete contact';
      } else if (deleteItemType === 'procedure') {
        result = await deleteEmergencyProcedure(itemToDelete._id);
        successMessage = 'Procedure deleted successfully';
        errorMessage = 'Failed to delete procedure';
      } else if (deleteItemType === 'firstaid') {
        result = await deleteFirstAidLog(itemToDelete._id);
        successMessage = 'First aid log deleted successfully';
        errorMessage = 'Failed to delete first aid log';
      }

      if (result && result.success) {
        addNotification('success', result.message || successMessage);
        setShowDeleteModal(false);
        setItemToDelete(null);
        setDeleteItemType(null);
        await fetchData();
      } else {
        addNotification('error', result?.message || errorMessage);
      }
    } catch (error: any) {
      addNotification('error', error.message || 'An error occurred');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getProcedureIcon = (type: EmergencyProcedure['type']) => {
    switch (type) {
      case 'medical':
        return <FaAmbulance className="text-[#A855F7]" size={24} />;
      case 'fire':
        return <FaFire className="text-[#F59E0B]" size={24} />;
      case 'spill':
        return <FaFlask className="text-[#00FFA3]" size={24} />;
      case 'collision':
        return <FaCar className="text-[#00D1FF]" size={24} />;
      case 'breakdown':
        return <FaCar className="text-secondary" size={24} />;
      case 'violence':
        return <FaExclamationTriangle className="text-[#A855F7]" size={24} />;
      default:
        return <FaFileAlt className="text-secondary" size={24} />;
    }
  };

  const renderEmergencyContacts = () => (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl p-8 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-headings flex items-center gap-3">
            <FaPhone className="" />
            Emergency Contacts
          </h2>
          <button
            onClick={() => {
              setEditingContact(null);
              setNewContact({
                name: '',
                role: '',
                phone: '',
                email: '',
                department: '',
                isPrimary: false,
                available24_7: false,
                alternatePhone: '',
              });
              setShowContactForm(true);
            }}
            className="px-6 py-3 !text-white rounded-xl font-semibold hover:opacity-90 transition-colors flex items-center gap-2 bg-[var(--accent-navyblue)]"

          >
            <FaPlus /> Add Contact
          </button>
        </div>

        {showContactForm && (
          <div className="mb-6 p-6 bg-card rounded-xl border-2 border-theme">
            <h3 className="text-lg font-bold mb-4 text-primary">
              {editingContact ? 'Edit Emergency Contact' : 'Add New Emergency Contact'}
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setSubmitting(true);
                  let result;
                  if (editingContact) {
                    result = await updateEmergencyContact(editingContact._id, newContact);
                  } else {
                    result = await createEmergencyContact(newContact);
                  }

                  if (result.success) {
                    addNotification('success', result.message || (editingContact ? 'Contact updated successfully' : 'Contact created successfully'));
                    setShowContactForm(false);
                    setEditingContact(null);
                    setNewContact({
                      name: '',
                      role: '',
                      phone: '',
                      email: '',
                      department: '',
                      isPrimary: false,
                      available24_7: false,
                      alternatePhone: '',
                    });
                    await fetchData();
                  } else {
                    addNotification('error', result.message || 'Failed to save contact');
                  }
                } catch (error: any) {
                  addNotification('error', error.message || 'An error occurred');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-headings mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                    placeholder="Contact Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-headings mb-2">Role *</label>
                  <input
                    type="text"
                    required
                    value={newContact.role}
                    onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                    placeholder="Safety Manager, Operations Manager, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-headings mb-2">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                    placeholder="+1-555-0100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-headings mb-2">Alternate Phone</label>
                  <input
                    type="tel"
                    value={newContact.alternatePhone}
                    onChange={(e) => setNewContact({ ...newContact, alternatePhone: e.target.value })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                    placeholder="+1-555-0101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-headings mb-2">Email</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                    placeholder="contact@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-headings mb-2">Department *</label>
                  <input
                    type="text"
                    required
                    value={newContact.department}
                    onChange={(e) => setNewContact({ ...newContact, department: e.target.value })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                    placeholder="Safety, Operations, External, etc."
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newContact.isPrimary}
                    onChange={(e) => setNewContact({ ...newContact, isPrimary: e.target.checked })}
                    className="w-5 h-5 text-[#A855F7] focus:ring-red-500 rounded"
                  />
                  <span className="font-medium text-primary">Primary Contact</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newContact.available24_7}
                    onChange={(e) => setNewContact({ ...newContact, available24_7: e.target.checked })}
                    className="w-5 h-5 text-[#A855F7] focus:ring-red-500 rounded"
                  />
                  <span className="font-medium text-primary">Available 24/7</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                <button
                  type="button"
                  onClick={() => {
                    setShowContactForm(false);
                    setEditingContact(null);
                  }}
                  className="px-4 py-2 bg-card text-primary border border-theme rounded-xl font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 !text-white rounded-xl font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--accent-navyblue)]"

                >
                  <FaSave /> {submitting ? 'Saving...' : (editingContact ? 'Update Contact' : 'Save Contact')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => (
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
                    onClick={() => {
                      setEditingContact(contact);
                      setNewContact({
                        name: contact.name,
                        role: contact.role,
                        phone: contact.phone,
                        email: contact.email || '',
                        department: contact.department,
                        isPrimary: contact.isPrimary,
                        available24_7: contact.available24_7 || false,
                        alternatePhone: contact.alternatePhone || '',
                      });
                      setShowContactForm(true);
                    }}
                    className="p-2 text-[#00D1FF] hover:bg-[var(--accent-navyblue)]/20 rounded-lg transition"
                    title="Edit Contact"
                  >
                    <FaEdit size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setItemToDelete(contact);
                      setDeleteItemType('contact');
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-[#A855F7] hover:bg-[var(--accent-red)]/20 rounded-lg transition"
                    title="Delete Contact"
                  >
                    <FaTrash size={14} className='text-[var(--accent-red)]' />
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
        </div>

        <div className="mt-6 flex justify-end">
          <button className="px-6 py-3 bg-[var(--accent-navyblue)] !text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
            <FaPrint /> Print Emergency Contact List
          </button>
        </div>
      </div>
    </div>
  );

  const renderEmergencyProcedures = () => (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl p-8 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-3">
            <FaClipboardList className="text-[#F59E0B]" />
            Emergency Response Procedures
          </h2>
          <button
            onClick={() => {
              setEditingProcedure(null);
              setNewProcedure({
                title: '',
                type: 'medical',
                procedure: '',
                quickReferenceSteps: [''],
              });
              setShowProcedureForm(true);
            }}
            className="px-6 py-3 !text-white rounded-xl font-semibold hover:opacity-90 transition-colors flex items-center gap-2 bg-[var(--accent-navyblue)]"

          >
            <FaPlus /> Add Procedure
          </button>
        </div>

        <div className="space-y-4">
          {procedures.map((proc) => (
            <div
              key={proc._id}
              className="border-2 border-theme rounded-xl overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedProcedure(expandedProcedure === proc._id ? null : proc._id)
                }
                className="w-full p-5 bg-[var(--accent-orange)]/20 hover:bg-[var(--accent-orange)]/40 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {getProcedureIcon(proc.type)}
                  <div className="text-left">
                    <h3 className="font-bold text-primary text-lg">{proc.title}</h3>
                    <p className="text-xs text-secondary">
                      Last Updated: {new Date(proc.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProcedure(proc);
                      setNewProcedure({
                        title: proc.title,
                        type: proc.type,
                        procedure: proc.procedure,
                        quickReferenceSteps: proc.quickReferenceSteps || [''],
                      });
                      setShowProcedureForm(true);
                    }}
                    className="p-2 text-[#00D1FF] hover:bg-[var(--accent-navyblue)]/20 rounded-lg transition"
                    title="Edit Procedure"
                  >
                    <FaEdit size={14} />
                  </button>
                  {expandedProcedure === proc._id ? (
                    <FaChevronDown className="text-secondary" />
                  ) : (
                    <FaChevronRight className="text-secondary" />
                  )}
                </div>
              </button>

              {expandedProcedure === proc._id && (
                <div className="p-6 bg-card border-t-2 border-theme">
                  {proc.quickReferenceSteps && proc.quickReferenceSteps.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-bold text-primary mb-2">Quick Reference Steps:</h4>
                      <div className="flex flex-wrap gap-2">
                        {proc.quickReferenceSteps.map((step, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold"
                          >
                            {idx + 1}. {step}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-primary mb-2">Detailed Procedure:</h4>
                    <div className="whitespace-pre-line text-primary bg-card p-4 rounded-lg">
                      {proc.procedure}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        setItemToDelete(proc);
                        setDeleteItemType('procedure');
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-2 bg-red-600 !text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                    >
                      <FaTrash /> Delete
                    </button>

                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Procedure Form Modal */}
      {showProcedureForm && (
        <div className="fixed inset-0 flex justify-center items-center z-[10000] p-4 bg-black/40 bg-opacity-50" onClick={() => setShowProcedureForm(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {editingProcedure ? 'Edit Emergency Procedure' : 'Add New Emergency Procedure'}
              </h2>
              <button
                onClick={() => setShowProcedureForm(false)}
                className="text-secondary hover:text-primary transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setSubmitting(true);
                  const formData = new FormData();
                  formData.append('title', newProcedure.title);
                  formData.append('type', newProcedure.type);
                  formData.append('procedure', newProcedure.procedure);
                  formData.append('quickReferenceSteps', JSON.stringify(newProcedure.quickReferenceSteps.filter(s => s.trim())));

                  let result;
                  if (editingProcedure) {
                    result = await updateEmergencyProcedure(editingProcedure._id, formData);
                  } else {
                    result = await createEmergencyProcedure(formData);
                  }

                  if (result.success) {
                    addNotification('success', result.message || (editingProcedure ? 'Procedure updated successfully' : 'Procedure created successfully'));
                    setShowProcedureForm(false);
                    setEditingProcedure(null);
                    setNewProcedure({
                      title: '',
                      type: 'medical',
                      procedure: '',
                      quickReferenceSteps: [''],
                    });
                    await fetchData();
                  } else {
                    addNotification('error', result.message || 'Failed to save procedure');
                  }
                } catch (error: any) {
                  addNotification('error', error.message || 'An error occurred');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="p-6 space-y-6"
            >
              <div>
                <label className="block text-sm font-semibold text-headings mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={newProcedure.title}
                  onChange={(e) => setNewProcedure({ ...newProcedure, title: e.target.value })}
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-orange-500"
                  placeholder="Procedure Title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-headings mb-2">Type *</label>
                <select
                  required
                  value={newProcedure.type}
                  onChange={(e) => setNewProcedure({ ...newProcedure, type: e.target.value as any })}
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-orange-500"
                >
                  <option className='form-option' value="medical">Medical</option>
                  <option className='form-option' value="fire">Fire</option>
                  <option className='form-option' value="spill">Spill</option>
                  <option className='form-option' value="collision">Collision</option>
                  <option className='form-option' value="breakdown">Breakdown</option>
                  <option className='form-option' value="violence">Violence</option>
                  <option className='form-option' value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-headings mb-2">Procedure Details *</label>
                <textarea
                  required
                  rows={8}
                  value={newProcedure.procedure}
                  onChange={(e) => setNewProcedure({ ...newProcedure, procedure: e.target.value })}
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter detailed procedure steps..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-headings mb-2">Quick Reference Steps</label>
                {newProcedure.quickReferenceSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => {
                        const newSteps = [...newProcedure.quickReferenceSteps];
                        newSteps[idx] = e.target.value;
                        setNewProcedure({ ...newProcedure, quickReferenceSteps: newSteps });
                      }}
                      className="flex-1 border-2 border-theme p-2 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder={`Step ${idx + 1}`}
                    />
                    {newProcedure.quickReferenceSteps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newSteps = newProcedure.quickReferenceSteps.filter((_, i) => i !== idx);
                          setNewProcedure({ ...newProcedure, quickReferenceSteps: newSteps });
                        }}
                        className="px-3 py-2 bg-red-500 !text-white rounded-lg hover:bg-red-600"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setNewProcedure({ ...newProcedure, quickReferenceSteps: [...newProcedure.quickReferenceSteps, ''] })}
                  className="mt-2 px-4 py-2 bg-[var(--accent-navyblue)] text-primary rounded-lg hover:bg-[var(--accent-navyblue)]/80 flex items-center gap-2"
                >
                  <FaPlus /> Add Step
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                <button
                  type="button"
                  onClick={() => {
                    setShowProcedureForm(false);
                    setEditingProcedure(null);
                  }}
                  className="px-4 py-2 bg-card border border-theme text-primary rounded-xl font-semibold hover:bg-gray-300"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'var(--accent-navyblue)'
                  }}
                  className="px-4 py-2  !text-white rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaSave /> {submitting ? 'Saving...' : (editingProcedure ? 'Update Procedure' : 'Save Procedure')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderFirstAidLogs = () => (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl p-8 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-headings flex items-center gap-3">
            <FaAmbulance className="" />
            First Aid Logs
          </h2>
          <button
            onClick={() => setShowFirstAidForm(true)}
            className="px-6 py-3 bg-[var(--accent-navyblue)] !text-white rounded-xl font-semibold hover:bg-[var(--accent-navyblue)]/80  transition-colors flex items-center gap-2"
          >
            <FaPlus /> New First Aid Log
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Date / Time</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Location</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Injured Person</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Injury Description</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">First Aid Provided</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Treated By</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Follow-up</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {firstAidLogs.map((log) => (
                <tr
                  key={log._id}
                  onClick={() => {
                    setSelectedFirstAidLog(log);
                    setShowDetailModal(true);
                  }}
                  className="hover:bg-[rgba(255,255,255,0.03)] transition cursor-pointer"
                >
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-primary">{new Date(log.date).toLocaleDateString()}</div>
                    <div className="text-secondary text-xs">{log.time}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-primary">
                    <div className="flex items-center gap-2">
                      <FaMapMarkerAlt className="text-secondary" size={12} />
                      {log.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-primary">{log.injuredPerson}</td>
                  <td className="px-6 py-4 text-sm text-primary">{log.injuryDescription}</td>
                  <td className="px-6 py-4 text-sm text-primary">{log.firstAidProvided}</td>
                  <td className="px-6 py-4 text-sm text-primary">{log.treatedBy}</td>
                  <td className="px-6 py-4">
                    {log.followUpRequired ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                        Required
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                        None
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFirstAid(log);
                          setNewFirstAidLog({
                            date: log.date,
                            time: log.time,
                            location: log.location,
                            injuredPerson: log.injuredPerson,
                            injuryDescription: log.injuryDescription,
                            firstAidProvided: log.firstAidProvided,
                            treatedBy: log.treatedBy,
                            followUpRequired: log.followUpRequired,
                            relatedIncident: log.relatedIncident || '',
                          });
                          setShowFirstAidForm(true);
                        }}
                        className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition" title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete(log);
                          setDeleteItemType('firstaid');
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition" title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* First Aid Log Form Modal */}
      {showFirstAidForm && (
        <div className="fixed inset-0 flex justify-center items-center z-[10000] p-4 bg-black/40 bg-opacity-50" onClick={() => setShowFirstAidForm(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {editingFirstAid ? 'Edit First Aid Log' : 'New First Aid Log'}
              </h2>
              <button
                onClick={() => setShowFirstAidForm(false)}
                className="text-secondary hover:text-primary transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setSubmitting(true);
                  const data: any = {
                    date: newFirstAidLog.date,
                    time: newFirstAidLog.time,
                    location: newFirstAidLog.location,
                    injuredPerson: newFirstAidLog.injuredPerson,
                    injuryDescription: newFirstAidLog.injuryDescription,
                    firstAidProvided: newFirstAidLog.firstAidProvided,
                    treatedBy: newFirstAidLog.treatedBy,
                    followUpRequired: newFirstAidLog.followUpRequired,
                  };

                  if (newFirstAidLog.relatedIncident) {
                    data.relatedIncident = newFirstAidLog.relatedIncident;
                  }

                  let result;
                  if (editingFirstAid) {
                    result = await updateFirstAidLog(editingFirstAid._id, data);
                  } else {
                    result = await createFirstAidLog(data);
                  }

                  if (result.success) {
                    addNotification('success', result.message || (editingFirstAid ? 'First aid log updated successfully' : 'First aid log created successfully'));
                    setShowFirstAidForm(false);
                    setEditingFirstAid(null);
                    setNewFirstAidLog({
                      date: new Date().toISOString().split('T')[0],
                      time: new Date().toTimeString().slice(0, 5),
                      location: '',
                      injuredPerson: '',
                      injuryDescription: '',
                      firstAidProvided: '',
                      treatedBy: '',
                      followUpRequired: false,
                      relatedIncident: '',
                    });
                    await fetchData();
                  } else {
                    addNotification('error', result.message || 'Failed to save first aid log');
                  }
                } catch (error: any) {
                  addNotification('error', error.message || 'An error occurred');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="p-6 space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-headings mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={newFirstAidLog.date}
                    onChange={(e) => setNewFirstAidLog({ ...newFirstAidLog, date: e.target.value })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-headings mb-2">Time *</label>
                  <input
                    type="time"
                    required
                    value={newFirstAidLog.time}
                    onChange={(e) => setNewFirstAidLog({ ...newFirstAidLog, time: e.target.value })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-headings mb-2">Location *</label>
                <input
                  type="text"
                  required
                  value={newFirstAidLog.location}
                  onChange={(e) => setNewFirstAidLog({ ...newFirstAidLog, location: e.target.value })}
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                  placeholder="Location where incident occurred"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-headings mb-2">Injured Person *</label>
                <input
                  type="text"
                  required
                  value={newFirstAidLog.injuredPerson}
                  onChange={(e) => setNewFirstAidLog({ ...newFirstAidLog, injuredPerson: e.target.value })}
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                  placeholder="Name of injured person"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-headings mb-2">Injury Description *</label>
                <textarea
                  required
                  rows={3}
                  value={newFirstAidLog.injuryDescription}
                  onChange={(e) => setNewFirstAidLog({ ...newFirstAidLog, injuryDescription: e.target.value })}
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                  placeholder="Describe the injury..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-headings mb-2">First Aid Provided *</label>
                <textarea
                  required
                  rows={3}
                  value={newFirstAidLog.firstAidProvided}
                  onChange={(e) => setNewFirstAidLog({ ...newFirstAidLog, firstAidProvided: e.target.value })}
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                  placeholder="Describe the first aid treatment provided..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-headings mb-2">Treated By *</label>
                <input
                  type="text"
                  required
                  value={newFirstAidLog.treatedBy}
                  onChange={(e) => setNewFirstAidLog({ ...newFirstAidLog, treatedBy: e.target.value })}
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                  placeholder="Name of person who provided first aid"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-headings mb-2">Related Incident (Optional)</label>
                <input
                  type="text"
                  value={newFirstAidLog.relatedIncident}
                  onChange={(e) => setNewFirstAidLog({ ...newFirstAidLog, relatedIncident: e.target.value })}
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                  placeholder="Incident number or reference"
                />
              </div>

              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFirstAidLog.followUpRequired}
                    onChange={(e) => setNewFirstAidLog({ ...newFirstAidLog, followUpRequired: e.target.checked })}
                    className="w-5 h-5 text-[#A855F7] focus:ring-red-500 rounded"
                  />
                  <span className="font-medium text-headings">Follow-up Required</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                <button
                  type="button"
                  onClick={() => {
                    setShowFirstAidForm(false);
                    setEditingFirstAid(null);
                  }}
                  className="px-4 py-2 bg-card border border-theme text-primary rounded-xl font-semibold hover:bg-gray-300"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 !text-white rounded-xl font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--accent-navyblue)]"

                >
                  <FaSave /> {submitting ? 'Saving...' : (editingFirstAid ? 'Update Log' : 'Save Log')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen p-6 bg-main" >
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-headings" >
            <FaAmbulance className="inline mr-3" />
            Emergency Procedures & Response
          </h1>
          <p className="text-lg text-secondary">
            Manage emergency contacts, response procedures, and first aid logs for quick access during emergencies.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-theme">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 px-6 py-4 font-semibold transition ${activeTab === 'contacts'
                ? 'border-b-2 text-[#A855F7]'
                : 'text-secondary hover:text-primary'
                }`}
              style={activeTab === 'contacts' ? { borderColor: CUSTOM_COLORS.primary } : {}}
            >
              <FaPhone className="inline mr-2" />
              Emergency Contacts
            </button>
            <button
              onClick={() => setActiveTab('procedures')}
              className={`flex-1 px-6 py-4 font-semibold transition ${activeTab === 'procedures'
                ? 'border-b-2 text-[#F59E0B]'
                : 'text-secondary hover:text-primary'
                }`}
              style={activeTab === 'procedures' ? { borderColor: CUSTOM_COLORS.primary } : {}}
            >
              <FaClipboardList className="inline mr-2" />
              Response Procedures
            </button>
            <button
              onClick={() => setActiveTab('firstaid')}
              className={`flex-1 px-6 py-4 font-semibold transition ${activeTab === 'firstaid'
                ? 'border-b-2 text-[#A855F7]'
                : 'text-secondary hover:text-primary'
                }`}
              style={activeTab === 'firstaid' ? { borderColor: CUSTOM_COLORS.primary } : {}}
            >
              <FaAmbulance className="inline mr-2" />
              First Aid Logs
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'contacts' && renderEmergencyContacts()}
        {activeTab === 'procedures' && renderEmergencyProcedures()}
        {activeTab === 'firstaid' && renderFirstAidLogs()}

        {/* Info Panel */}
        <div className="mt-6 bg-card border-2 border-theme rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <FaExclamationTriangle /> Emergency Procedures Compliance
          </h3>
          <ul className="text-sm text-white space-y-1">
            <li>✅ All emergency contacts accessible 24/7</li>
            <li>✅ Response procedures documented and up-to-date</li>
            <li>✅ First aid logs maintained for audit compliance</li>
            <li>✅ Quick reference guides for rapid response</li>
            <li>✅ Mobile-friendly access for field employees</li>
          </ul>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 flex justify-center items-center z-[11000] p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationTriangle className="text-red-500 text-3xl" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-2">
                {deleteItemType === 'contact' ? 'Delete Contact?' :
                  deleteItemType === 'procedure' ? 'Delete Procedure?' :
                    'Delete Log?'}
              </h2>
              <p className="text-secondary">
                Are you sure you want to delete <span className="font-semibold text-primary">
                  "{deleteItemType === 'contact' ? itemToDelete.name :
                    deleteItemType === 'procedure' ? itemToDelete.title :
                      `Log from ${new Date(itemToDelete.date).toLocaleDateString()}`}"
                </span>?
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
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 !text-white rounded-xl font-semibold hover:bg-red-700 transition shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First Aid Log Detail Modal */}
      {showDetailModal && selectedFirstAidLog && (
        <div className="fixed inset-0 z-[10003] flex justify-center items-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 px-6 py-4 border-b flex justify-between items-center" style={{ background: CUSTOM_COLORS.gradient }}>
              <h2 className="text-xl font-bold text-white">First Aid Log Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-white hover:bg-card/20 p-2 rounded-lg transition"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Date</label>
                  <div className="mt-1 text-base text-primary font-medium">
                    {new Date(selectedFirstAidLog.date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Time</label>
                  <div className="mt-1 text-base text-primary font-medium">{selectedFirstAidLog.time}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Location</label>
                <div className="mt-1 text-base text-primary flex items-center gap-2">
                  <FaMapMarkerAlt className="text-secondary" />
                  {selectedFirstAidLog.location}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Injured Person</label>
                  <div className="mt-1 text-base text-primary font-medium">{selectedFirstAidLog.injuredPerson}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Treated By</label>
                  <div className="mt-1 text-base text-primary font-medium">{selectedFirstAidLog.treatedBy}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Injury Description</label>
                <div className="mt-1 text-base text-primary bg-card p-4 rounded-lg">
                  {selectedFirstAidLog.injuryDescription}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider">First Aid Provided</label>
                <div className="mt-1 text-base text-primary bg-card p-4 rounded-lg">
                  {selectedFirstAidLog.firstAidProvided}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Follow-up Required</label>
                <div className="mt-1">
                  {selectedFirstAidLog.followUpRequired ? (
                    <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                      Yes - Follow-up Required
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      No Follow-up Needed
                    </span>
                  )}
                </div>
              </div>

              {selectedFirstAidLog.relatedIncident && (
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Related Incident</label>
                  <div className="mt-1 text-base text-primary font-medium">{selectedFirstAidLog.relatedIncident}</div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-card flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-200 text-primary rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[10001] space-y-2">
        {notifications.map((notification) => (
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

export default EmergencyProcedures;

