import React, { useState, useEffect } from 'react';
import {
    FaAmbulance,
    FaPlus,
    FaEdit,
    FaTrash,
    FaSave,
    FaMapMarkerAlt,
    FaTimes,
    FaCheckCircle,
    FaTimesCircle,
    FaInfoCircle,
    FaExclamationTriangle,
    FaPrint
} from 'react-icons/fa';
import {
    createFirstAidLog,
    getFirstAidLogs,
    updateFirstAidLog,
    deleteFirstAidLog,
} from '../../../../axios/api/healthSafety';

const CUSTOM_COLORS = {
    background: '#EDF8FF',
    primary: '#016ab2',
    dark: '#063f6f',
    light: '#398bc3',
    gradient: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)',
};

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
    followUpNotes?: string;
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

const FirstAidLogsPage: React.FC = () => {
    const [firstAidLogs, setFirstAidLogs] = useState<FirstAidLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFirstAidForm, setShowFirstAidForm] = useState(false);
    const [editingFirstAid, setEditingFirstAid] = useState<FirstAidLog | null>(null);
    const [notifications, setNotifications] = useState<ToastNotification[]>([]);
    const [submitting, setSubmitting] = useState(false);

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
        followUpNotes: ''
    });

    // Delete Confirmation State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<FirstAidLog | null>(null);

    const addNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
    };

    const removeNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const fetchFirstAidLogsData = async () => {
        try {
            setLoading(true);
            const response = await getFirstAidLogs();
            if (response.success) {
                setFirstAidLogs(response.data || []);
            } else {
                addNotification('error', response.message || 'Failed to load first aid logs');
            }
        } catch (error: any) {
            addNotification('error', error.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFirstAidLogsData();
    }, []);

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            const result = await deleteFirstAidLog(itemToDelete._id);
            if (result && result.success) {
                addNotification('success', 'First aid log deleted successfully');
                setShowDeleteModal(false);
                setItemToDelete(null);
                await fetchFirstAidLogsData();
            } else {
                addNotification('error', result?.message || 'Failed to delete first aid log');
            }
        } catch (error: any) {
            addNotification('error', error.message || 'An error occurred');
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const data: any = { ...newFirstAidLog };

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
                    followUpNotes: ''
                });
                await fetchFirstAidLogsData();
            } else {
                addNotification('error', result.message || 'Failed to save first aid log');
            }
        } catch (error: any) {
            addNotification('error', error.message || 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: CUSTOM_COLORS.background }}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2" style={{ color: CUSTOM_COLORS.dark }}>
                        <FaAmbulance className="inline mr-3" style={{ color: CUSTOM_COLORS.primary }} />
                        First Aid Logs
                    </h1>
                    <p className="text-lg text-secondary">
                        Maintain accurate records of first aid administration and treatment for compliance and audit purposes.
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    <div className="bg-card rounded-2xl p-8 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-primary flex items-center gap-3">
                                <FaAmbulance className="text-[#A855F7]" />
                                First Aid Logs
                            </h2>
                            <div className="flex gap-3">
                                <button
                                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-semibold hover:bg-blue-200 transition-colors flex items-center gap-2"
                                    onClick={() => window.print()}
                                >
                                    <FaPrint /> Print Logs
                                </button>
                                <button
                                    onClick={() => {
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
                                            followUpNotes: ''
                                        });
                                        setShowFirstAidForm(true);
                                    }}
                                    className="px-6 py-3 bg-red-600 !text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                                >
                                    <FaPlus /> New First Aid Log
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-card">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Date / Time</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Location</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Injured Person</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Injury Description</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">First Aid Provided</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Treated By</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Follow-up</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-theme">
                                    {loading ? (
                                        <tr><td colSpan={8} className="text-center py-8">Loading logs...</td></tr>
                                    ) : firstAidLogs.length === 0 ? (
                                        <tr><td colSpan={8} className="text-center py-8 text-secondary">No first aid logs found.</td></tr>
                                    ) : (
                                        firstAidLogs.map((log) => (
                                            <tr key={log._id} className="hover:bg-[rgba(255,255,255,0.03)] transition">
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
                                                            onClick={() => {
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
                                                                    followUpNotes: log.followUpNotes || ''
                                                                });
                                                                setShowFirstAidForm(true);
                                                            }}
                                                            className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition" title="Edit"
                                                        >
                                                            <FaEdit />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setItemToDelete(log);
                                                                setShowDeleteModal(true);
                                                            }}
                                                            className="p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition" title="Delete"
                                                        >
                                                            <FaTrash />
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

                            <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-primary mb-2">Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={newFirstAidLog.date}
                                            onChange={(e) => setNewFirstAidLog({ ...newFirstAidLog, date: e.target.value })}
                                            className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-primary mb-2">Time *</label>
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
                                    <label className="block text-sm font-semibold text-primary mb-2">Location *</label>
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
                                    <label className="block text-sm font-semibold text-primary mb-2">Injured Person *</label>
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
                                    <label className="block text-sm font-semibold text-primary mb-2">Injury Description *</label>
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
                                    <label className="block text-sm font-semibold text-primary mb-2">First Aid Provided *</label>
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
                                    <label className="block text-sm font-semibold text-primary mb-2">Treated By *</label>
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
                                    <label className="block text-sm font-semibold text-primary mb-2">Related Incident (Optional)</label>
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
                                        <span className="font-medium text-primary">Follow-up Required</span>
                                    </label>
                                </div>

                                {newFirstAidLog.followUpRequired && (
                                    <div>
                                        <label className="block text-sm font-semibold text-primary mb-2">Follow-up Notes</label>
                                        <textarea
                                            rows={2}
                                            value={newFirstAidLog.followUpNotes}
                                            onChange={(e) => setNewFirstAidLog({ ...newFirstAidLog, followUpNotes: e.target.value })}
                                            className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>
                                )}


                                <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowFirstAidForm(false);
                                            setEditingFirstAid(null);
                                        }}
                                        className="px-4 py-2 bg-gray-200 text-primary rounded-xl font-semibold hover:bg-gray-300"
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-2 !text-white rounded-xl font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ background: CUSTOM_COLORS.gradient }}
                                    >
                                        <FaSave /> {submitting ? 'Saving...' : (editingFirstAid ? 'Update Log' : 'Save Log')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && itemToDelete && (
                    <div className="fixed inset-0 flex justify-center items-center z-[11000] p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
                        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FaExclamationTriangle className="text-red-500 text-3xl" />
                                </div>
                                <h2 className="text-2xl font-bold text-primary mb-2">
                                    Delete Log?
                                </h2>
                                <p className="text-secondary">
                                    Are you sure you want to delete <span className="font-semibold text-primary">
                                        "Log from {new Date(itemToDelete.date).toLocaleDateString()}"
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
        </div>
    );
};

export default FirstAidLogsPage;
