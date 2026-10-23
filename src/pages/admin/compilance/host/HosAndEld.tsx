import { useState, useEffect, useRef } from 'react';
import {
    RefreshCw, ShieldCheck,
    Download, Upload, FileText, X, FileCheck, Plus, Eye, Pencil, Check
} from 'lucide-react';
import jsPDF from 'jspdf';
import {
    getHOSEldData,
    syncHOSFromSamsara,
    createHosAuditForm,
    getHosAuditForms,
    getHosAuditDocumentUrl,
    uploadELogFile,
    getELogs,
    deleteELog,
    downloadELog
} from '../../../../axios/api/compliance.hosEld';
import { getAllDrivers } from '../../../../axios/api/driver';


interface Driver {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    internalId?: string;
}

interface ELogFile {
    _id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    driverId?: string | {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    driverName?: string;
    uploadedAt: string;
    uploadedBy?: string | {
        _id: string;
        name: string;
        email?: string;
    };
}

interface AuditTableRow {
    id: string;
    driverName: string;
    driverId: string;
    reportingTo: string;
    auditDate: string;
    incidentDate: string;
    incidentTime?: string;
    incidentLocation?: string;
    drivingHours: number;
    onDutyHours: number;
    offDutyHours: number;
    incidentTypes: string[];
    priorCounseling: string;
    correctiveActionType: string;
    violations: string[];
    notes: string;
    auditorName: string;
    documents: { name: string; size: number; url?: string; key?: string; mimeType?: string }[];
}

const ELOG_DISPLAY_NAMES_KEY = 'compliance-elog-display-names';

// Default static content for HOS Progressive Disciplinary Action form (user can edit before download)
const DEFAULT_NOTICE_TO_EMPLOYEE = `Notice to employee: You have been given this notice to impress upon you the seriousness of the incident noted above. We are confident that you will correct this situation. However, if this type of incident re-occurs, you will be subject to further disciplinary action, up to and including termination of employment.`;
const DEFAULT_EMPLOYEE_COMMENTS = `By signing below, I acknowledge that I have received a copy of the above notice of discipline and that the job performance requirements have been explained to me.`;

// Incident type options matching HOS Progressive Disciplinary Action form
const DISCIPLINARY_INCIDENT_TYPES = ['Job Performance', 'Competence', 'Professionalism', 'Attendance/Reliability', 'Hours of Service Violation', 'Other'];
const DISCIPLINARY_CORRECTIVE_ACTIONS = ['Verbal warning (documented)', 'Written warning (documented)', 'Suspension', 'Termination', 'Other (including documentation)'];

const VehicleEldMonitor = () => {
    const [activeTab, setActiveTab] = useState<'tracker' | 'audit-form' | 'e-logs'>('tracker');
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [viewLogModalOpen, setViewLogModalOpen] = useState(false);
    const [selectedHosLog, setSelectedHosLog] = useState<any | null>(null);
    const [summary, setSummary] = useState({
        totalVehicles: 0,
        activeVehicles: 0,
        totalDrivers: 0,
        compliantDrivers: 0,
        activeViolations: 0,
        uncertifiedLogs: 0
    });

    // HOS Audit Form State
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [auditFormData, setAuditFormData] = useState({
        driverId: '',
        driverIdDisplay: '',       // Driver ID (text)
        reportingTo: '',           // Reporting To (text)
        auditDate: new Date().toISOString().split('T')[0],
        incidentDate: '',          // Incident Date (distinct from Audit Date)
        incidentTime: '',          // Incident Time
        incidentLocation: '',      // Incident Location
        drivingHours: 0,
        onDutyHours: 0,
        offDutyHours: 0,
        violations: [] as string[],
        incidentTypes: [] as string[],           // Incident Type checkboxes
        incidentTypeCustomOptions: [] as string[], // User-added incident type options
        priorCounseling: '' as '' | 'yes' | 'no', // Prior Counseling Yes/No
        correctiveActionType: '',                 // Corrective Action Type
        correctiveActionCustomOptions: [] as string[], // User-added corrective action options
        notes: '',
        auditorName: ''
    });

    // Static options for Incident Type (user can add more)
    const defaultIncidentTypeOptions = ['Performance', 'Attendance', 'Safety', 'Documentation', 'Other'];
    const defaultCorrectiveActionOptions = ['Verbal Warning', 'Written Warning', 'Training', 'Suspension', 'Termination', 'Other'];

    // HOS Audit Form table data from API
    const [auditTableData, setAuditTableData] = useState<AuditTableRow[]>([]);
    const [auditTableLoading, setAuditTableLoading] = useState(false);
    const [detailSidebarOpen, setDetailSidebarOpen] = useState(false);
    const [selectedAuditDetail, setSelectedAuditDetail] = useState<AuditTableRow | null>(null);
    const [submittingAudit, setSubmittingAudit] = useState(false);
    const [newIncidentTypeOption, setNewIncidentTypeOption] = useState('');
    const [newCorrectiveActionOption, setNewCorrectiveActionOption] = useState('');
    const [auditFormDocuments, setAuditFormDocuments] = useState<File[]>([]);

    // Download form modal: HOS Progressive Disciplinary Action form (editable static sections)
    const [downloadFormOpen, setDownloadFormOpen] = useState(false);
    const [downloadFormRow, setDownloadFormRow] = useState<AuditTableRow | null>(null);
    const [editableFormState, setEditableFormState] = useState({
        noticeToEmployee: DEFAULT_NOTICE_TO_EMPLOYEE,
        employeeComments: DEFAULT_EMPLOYEE_COMMENTS,
        managerSignature: '',
        managerDate: '',
        employeeSignature: '',
        employeeDate: ''
    });
    const hosFormPrintRef = useRef<HTMLDivElement>(null);

    // E-Logs State
    const [eLogs, setELogs] = useState<ELogFile[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedDriverForLog, setSelectedDriverForLog] = useState('');
    const [eLogsLoading, setELogsLoading] = useState(false);
    const [eLogDisplayNames, setELogDisplayNames] = useState<Record<string, string>>({});
    const [editingELogId, setEditingELogId] = useState<string | null>(null);
    const [editingELogValue, setEditingELogValue] = useState('');

    // Fetch HOS/ELD data
    const fetchHOSData = async () => {
        setLoading(true);
        try {
            const response = await getHOSEldData();
            if (response?.success && response?.data) {
                setAuditLogs(response.data.auditLogs || []);
                setSummary(response.data.summary || {
                    totalVehicles: 0,
                    activeVehicles: 0,
                    totalDrivers: 0,
                    compliantDrivers: 0,
                    activeViolations: 0,
                    uncertifiedLogs: 0
                });
            }
        } catch (error) {
            console.error('Error fetching HOS/ELD data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch drivers for audit form
    const fetchDrivers = async () => {
        try {
            const response = await getAllDrivers(1, 1000);
            if (response?.success && response?.data) {
                setDrivers(response.data.map((d: any) => ({
                    _id: d._id,
                    name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Unknown Driver',
                    email: d.email,
                    phone: d.phone || d.mobile,
                    internalId: d.internalId || d.details?.internalId || ''
                })));
            }
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    // Fetch E-Logs
    const fetchELogs = async () => {
        setELogsLoading(true);
        try {
            const response = await getELogs();
            if (response?.success && response?.data) {
                setELogs(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching E-Logs:', error);
        } finally {
            setELogsLoading(false);
        }
    };

    // Fetch HOS Audit Form list from API
    const fetchAuditForms = async () => {
        setAuditTableLoading(true);
        try {
            const response = await getHosAuditForms({ page: 1, limit: 100 });
            if (response?.success && Array.isArray(response?.data)) {
                const rows: AuditTableRow[] = response.data.map((row: any) => ({
                    id: row.id || row._id?.toString() || '',
                    driverName: row.driverName || 'Unknown',
                    driverId: row.driverIdDisplay ?? row.driverId?._id ?? '',
                    reportingTo: row.reportingTo ?? '',
                    auditDate: typeof row.auditDate === 'string' ? row.auditDate : row.auditDate?.toISOString?.()?.split('T')[0] ?? '',
                    incidentDate: row.incidentDate ? (typeof row.incidentDate === 'string' ? row.incidentDate : row.incidentDate?.toISOString?.()?.split('T')[0]) : '—',
                    incidentTime: row.incidentTime ?? '',
                    incidentLocation: row.incidentLocation ?? '',
                    drivingHours: row.drivingHours ?? 0,
                    onDutyHours: row.onDutyHours ?? 0,
                    offDutyHours: row.offDutyHours ?? 0,
                    incidentTypes: Array.isArray(row.incidentTypes) ? row.incidentTypes : [],
                    priorCounseling: row.priorCounseling ?? '—',
                    correctiveActionType: row.correctiveActionType ?? '—',
                    violations: Array.isArray(row.violations) ? row.violations : [],
                    notes: row.notes ?? '',
                    auditorName: row.auditorName ?? '',
                    documents: Array.isArray(row.documents) ? row.documents.map((doc: any) => ({
                        name: doc.name || 'Unknown',
                        size: doc.size || 0,
                        url: doc.url || undefined,
                        key: doc.key || undefined,
                        mimeType: doc.mimeType || undefined
                    })) : []
                }));
                setAuditTableData(rows);
            } else {
                setAuditTableData([]);
            }
        } catch (error) {
            console.error('Error fetching HOS audit forms:', error);
            setAuditTableData([]);
        } finally {
            setAuditTableLoading(false);
        }
    };

    // Sync HOS data from Samsara
    const handleSyncHOS = async () => {
        setSyncing(true);
        try {
            const response = await syncHOSFromSamsara();
            if (response?.success) {
                await fetchHOSData();
                alert('HOS data synced successfully from Samsara!');
            } else {
                alert(response?.message || 'Failed to sync HOS data from Samsara');
            }
        } catch (error) {
            console.error('Error syncing HOS data from Samsara:', error);
            alert('Error syncing HOS data from Samsara');
        } finally {
            setSyncing(false);
        }
    };

    // Submit HOS Audit (saves via audit-form API and refreshes list)
    const handleSubmitAudit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auditFormData.driverId) {
            alert('Please select a driver');
            return;
        }

        setSubmittingAudit(true);
        try {
            // Create FormData for file upload
            const formData = new FormData();

            // Append all form fields
            formData.append('driverId', auditFormData.driverId);
            if (auditFormData.driverIdDisplay) formData.append('driverIdDisplay', auditFormData.driverIdDisplay);
            if (auditFormData.reportingTo) formData.append('reportingTo', auditFormData.reportingTo);
            formData.append('auditDate', auditFormData.auditDate);
            if (auditFormData.incidentDate) formData.append('incidentDate', auditFormData.incidentDate);
            if (auditFormData.incidentTime) formData.append('incidentTime', auditFormData.incidentTime);
            if (auditFormData.incidentLocation) formData.append('incidentLocation', auditFormData.incidentLocation);

            // Append arrays
            auditFormData.violations.forEach(v => formData.append('violations[]', v));
            auditFormData.incidentTypes.forEach(t => formData.append('incidentTypes[]', t));

            if (auditFormData.priorCounseling) formData.append('priorCounseling', auditFormData.priorCounseling);
            if (auditFormData.correctiveActionType) formData.append('correctiveActionType', auditFormData.correctiveActionType);
            if (auditFormData.notes) formData.append('notes', auditFormData.notes);
            if (auditFormData.auditorName) formData.append('auditorName', auditFormData.auditorName);

            // Append files
            auditFormDocuments.forEach((file) => {
                formData.append('documents', file);
            });

            const response = await createHosAuditForm(formData);

            if (response?.success) {
                alert('HOS Audit submitted successfully!');
                setAuditFormDocuments([]);
                setAuditFormData({
                    driverId: '',
                    driverIdDisplay: '',
                    reportingTo: '',
                    auditDate: new Date().toISOString().split('T')[0],
                    incidentDate: '',
                    incidentTime: '',
                    incidentLocation: '',
                    drivingHours: 0,
                    onDutyHours: 0,
                    offDutyHours: 0,
                    violations: [],
                    incidentTypes: [],
                    incidentTypeCustomOptions: auditFormData.incidentTypeCustomOptions,
                    priorCounseling: '',
                    correctiveActionType: '',
                    correctiveActionCustomOptions: auditFormData.correctiveActionCustomOptions,
                    notes: '',
                    auditorName: ''
                });
                await fetchAuditForms();
                await fetchHOSData();
            } else {
                alert(response?.message || 'Failed to submit audit');
            }
        } catch (error) {
            console.error('Error submitting audit:', error);
            alert('Error submitting audit');
        } finally {
            setSubmittingAudit(false);
        }
    };

    // Handle file upload for E-Logs
    const handleFileUpload = async () => {
        if (!selectedFile) {
            alert('Please select a file to upload');
            return;
        }

        setUploadingFile(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            if (selectedDriverForLog) {
                formData.append('driverId', selectedDriverForLog);
            }

            const response = await uploadELogFile(formData);
            if (response?.success) {
                alert('E-Log file uploaded successfully!');
                setSelectedFile(null);
                setSelectedDriverForLog('');
                await fetchELogs();
            } else {
                alert(response?.message || 'Failed to upload file');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file');
        } finally {
            setUploadingFile(false);
        }
    };

    // Delete E-Log
    const handleDeleteELog = async (logId: string) => {
        if (!confirm('Are you sure you want to delete this E-Log file?')) {
            return;
        }

        try {
            const response = await deleteELog(logId);
            if (response?.success) {
                alert('E-Log deleted successfully!');
                await fetchELogs();
            } else {
                alert(response?.message || 'Failed to delete E-Log');
            }
        } catch (error) {
            console.error('Error deleting E-Log:', error);
            alert('Error deleting E-Log');
        }
    };

    // Download E-Log
    const handleDownloadELog = async (logId: string, fileName: string) => {
        try {
            const blob = await downloadELog(logId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading E-Log:', error);
            alert('Error downloading E-Log');
        }
    };


    useEffect(() => {
        if (activeTab === 'audit-form') {
            fetchDrivers();
            fetchAuditForms();
        }
        if (activeTab === 'e-logs') {
            fetchELogs();
            fetchDrivers();
        }
    }, [activeTab]);

    // Ensure HOS/ELD API is called on initial mount so it appears in Network tab (same as compliance dashboard)
    useEffect(() => {
        fetchHOSData();
    }, []);

    // Load E-Log display names from localStorage (renames)
    useEffect(() => {
        try {
            const stored = localStorage.getItem(ELOG_DISPLAY_NAMES_KEY);
            if (stored) setELogDisplayNames(JSON.parse(stored));
        } catch {
            // ignore
        }
    }, []);

    const violationOptions = [
        '11-Hour Driving Limit',
        '14-Hour On-Duty Limit',
        '70-Hour/8-Day Limit',
        '30-Minute Break Requirement',
        'Rest Break Violation',
        'Other'
    ];

    const getELogDisplayName = (log: ELogFile) => eLogDisplayNames[log._id] || log.fileName;

    const getFileExtension = (fileName: string) => {
        const i = fileName.lastIndexOf('.');
        return i > 0 ? fileName.slice(i) : '';
    };

    const startRenameELog = (log: ELogFile) => {
        setEditingELogId(log._id);
        const displayName = eLogDisplayNames[log._id] || log.fileName;
        const ext = getFileExtension(log.fileName);
        const nameOnly = ext && displayName.endsWith(ext) ? displayName.slice(0, -ext.length) : displayName;
        setEditingELogValue(nameOnly);
    };

    const saveRenameELog = (logId: string) => {
        const trimmed = editingELogValue.trim();
        if (!trimmed) {
            setEditingELogId(null);
            setEditingELogValue('');
            return;
        }
        const log = eLogs.find((l) => l._id === logId);
        const ext = log ? getFileExtension(log.fileName) : '';
        const finalName = ext && !trimmed.endsWith(ext) ? trimmed + ext : trimmed;
        const next = { ...eLogDisplayNames, [logId]: finalName };
        setELogDisplayNames(next);
        try {
            localStorage.setItem(ELOG_DISPLAY_NAMES_KEY, JSON.stringify(next));
        } catch {
            // ignore
        }
        setEditingELogId(null);
        setEditingELogValue('');
    };

    const cancelRenameELog = () => {
        setEditingELogId(null);
        setEditingELogValue('');
    };

    const openDownloadForm = (row: AuditTableRow) => {
        setDownloadFormRow(row);
        setEditableFormState({
            noticeToEmployee: DEFAULT_NOTICE_TO_EMPLOYEE,
            employeeComments: DEFAULT_EMPLOYEE_COMMENTS,
            managerSignature: '',
            managerDate: row.auditDate ? new Date(row.auditDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            employeeSignature: '',
            employeeDate: row.auditDate ? new Date(row.auditDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
        setDownloadFormOpen(true);
    };

    const closeDownloadForm = () => {
        setDownloadFormOpen(false);
        setDownloadFormRow(null);
    };

    const saveEditableFormState = () => {
        setEditableFormState(prev => ({ ...prev })); // trigger re-render if needed; state is already editable
        // Optional: could call API here to persist editable fields if backend supports it
    };

    const downloadHosFormPdf = () => {
        if (!downloadFormRow || !hosFormPrintRef.current) return;
        const row = downloadFormRow;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 14;
        let y = margin;
        const lineH = 6;
        const lineWd = 0.3;

        const addText = (text: string, x: number, fontSize: number = 10, font: 'normal' | 'bold' = 'normal') => {
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', font);
            const lines = doc.splitTextToSize(text, pageW - 2 * margin);
            lines.forEach((line: string) => {
                if (y > 270) { doc.addPage(); y = margin; }
                doc.text(line, x, y);
                y += lineH * (fontSize / 10);
            });
        };
        const drawCheckbox = (x: number, yPos: number, checked: boolean, size: number = 3) => {
            doc.rect(x, yPos - size, size, size);
            if (checked) {
                doc.setLineWidth(0.35);
                doc.setDrawColor(0, 0, 0);
                const pad = 0.25;
                const x1 = x + pad;
                const y1 = yPos - size * 0.55;
                const x2 = x + size * 0.45;
                const y2 = yPos - size * 0.15;
                const x3 = x + size - pad;
                const y3 = yPos - size * 0.9;
                doc.line(x1, y1, x2, y2);
                doc.line(x2, y2, x3, y3);
                doc.setLineWidth(0.1);
            }
        };
        const sectionSpacing = 6; // adjust this value to increase/decrease top padding
        const drawHorizontalLine = () => {
            doc.setLineWidth(lineWd);
            doc.setDrawColor(0, 0, 0);
            doc.line(margin, y, pageW - margin, y);
            y += 3;
        };

        const drawTableRow = (label: string, value: string, labelColW: number, tableW: number) => {
            const rowY = y + lineH - 2;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(label, margin + 2, rowY);
            doc.text(value || '—', margin + labelColW + 2, rowY);
            doc.setLineWidth(0.1);
            doc.setDrawColor(0, 0, 0);
            doc.line(margin, y, margin, y + lineH);
            doc.line(margin + labelColW, y, margin + labelColW, y + lineH);
            doc.line(margin + tableW, y, margin + tableW, y + lineH);
            doc.line(margin, y + lineH, margin + tableW, y + lineH);
            y += lineH;
        };

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('HOS PROGRESSIVE DISCIPLINARY ACTION FORM', pageW / 2, y, { align: 'center' });
        y += lineH + 4;

        const labelColW = 42;
        const tableW = pageW - 2 * margin;
        doc.setLineWidth(0.1);
        doc.setDrawColor(0, 0, 0);
        doc.line(margin, y, margin + tableW, y);
        drawTableRow('Employee Name:', row.driverName || '', labelColW, tableW);
        drawTableRow('Driver ID:', row.driverId || '', labelColW, tableW);
        drawTableRow('Reporting to:', row.reportingTo || '', labelColW, tableW);
        drawTableRow('Date:', row.auditDate ? new Date(row.auditDate).toLocaleDateString() : '', labelColW, tableW);
        drawHorizontalLine();

        y += sectionSpacing;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Incident Information', margin, y); y += lineH;
        doc.setLineWidth(0.1);
        doc.line(margin, y, margin + tableW, y);
        drawTableRow('Date:', row.incidentDate && row.incidentDate !== '—' ? new Date(row.incidentDate).toLocaleDateString() : '', labelColW, tableW);
        drawTableRow('Time:', row.incidentTime || '', labelColW, tableW);
        drawTableRow('Location:', row.incidentLocation || '', labelColW, tableW);
        y += 2;
        y += sectionSpacing;
        doc.setFont('helvetica', 'normal');
        doc.text('Incident type:', margin + 2, y); y += lineH;
        let cx = margin;
        DISCIPLINARY_INCIDENT_TYPES.forEach((opt) => {
            const checked = (row.incidentTypes || []).some((t: string) =>
                opt.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(opt.toLowerCase().split(' ')[0])
            );
            if (cx + 45 > pageW - margin) { cx = margin; y += 5; }
            drawCheckbox(cx, y, checked);
            doc.setFontSize(8);
            doc.text(opt, cx + 4, y);
            doc.setFontSize(9);
            cx += 45;
        });
        y += 5;
        drawHorizontalLine();
        y += sectionSpacing;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Incident details (has the employee been counselled before on this or a similar HOS occurrence?)', margin, y); y += lineH;
        doc.setFont('helvetica', 'normal');
        const priorYes = (row.priorCounseling || '').toString().toLowerCase() === 'yes';
        const priorNo = (row.priorCounseling || '').toString().toLowerCase() === 'no' || !row.priorCounseling || row.priorCounseling === '—';
        doc.text('Yes', margin + 4, y);
        drawCheckbox(margin, y, priorYes);
        doc.text('No', margin + 18, y);
        drawCheckbox(margin + 14, y, priorNo);
        y += lineH;
        addText(row.notes || '—', margin + 2); y += 2;
        drawHorizontalLine();
        y += sectionSpacing;
        doc.setFont('helvetica', 'bold');
        doc.text('Corrective action taken', margin, y); y += lineH;
        doc.setFont('helvetica', 'normal');
        let ax = margin;
        DISCIPLINARY_CORRECTIVE_ACTIONS.forEach((opt) => {
            const key = opt.split(' ')[0].toLowerCase();
            const checked = row.correctiveActionType && row.correctiveActionType.toLowerCase().includes(key);
            if (ax + 52 > pageW - margin) { ax = margin; y += 5; }
            drawCheckbox(ax, y, !!checked);
            doc.setFontSize(7);
            doc.text(opt, ax + 4, y);
            doc.setFontSize(9);
            ax += 52;
        });
        y += 5;
        doc.setFontSize(9);
        doc.text(`Comments: ${row.correctiveActionType || '—'}`, margin, y); y += lineH + 2;
        drawHorizontalLine();
        y += sectionSpacing;
        const sigLineW = 70;
        const dateX = pageW - margin - 35;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("Manager's Signature:", margin, y); y += lineH;
        doc.setFont('helvetica', 'normal');
        doc.setLineWidth(0.2);
        y += sectionSpacing;
        doc.line(margin, y, margin + sigLineW, y);
        doc.setLineWidth(0.1);
        doc.text(editableFormState.managerSignature || '', margin, y - 1);
        doc.text(`Date: ${editableFormState.managerDate || ''}`, dateX, y); y += lineH + 3;
        drawHorizontalLine();
        y += sectionSpacing;
        doc.setFont('helvetica', 'bold');
        doc.text('Notice to employee:', margin, y); y += lineH;
        doc.setFont('helvetica', 'normal');
        addText(editableFormState.noticeToEmployee, margin, 9); y += 4;
        drawHorizontalLine();
        y += sectionSpacing;
        doc.setFont('helvetica', 'bold');
        doc.text("Employee's comments:", margin, y); y += lineH;
        doc.setFont('helvetica', 'normal');
        addText(editableFormState.employeeComments, margin, 9); y += 4;
        drawHorizontalLine();
        y += sectionSpacing;
        doc.setFont('helvetica', 'bold');
        doc.text("Employee's Signature:", margin, y); y += lineH;
        doc.setFont('helvetica', 'normal');
        y += sectionSpacing;
        doc.setLineWidth(0.2);
        doc.line(margin, y, margin + sigLineW, y);

        doc.setLineWidth(0.1);
        doc.text(editableFormState.employeeSignature || '', margin, y - 1);
        doc.text(`Date: ${editableFormState.employeeDate || ''}`, dateX, y);

        const fileName = `HOS-Disciplinary-Form-${(row.driverName || 'Driver').replace(/\s+/g, '-')}-${row.auditDate ? new Date(row.auditDate).toISOString().split('T')[0] : 'export'}.pdf`;
        doc.save(fileName);
    };

    return (
        <div className="min-h-screen bg-main font-sans pb-12">
            {/* Header */}
            <div className="top-0 z-30 bg-card shadow-sm">
                <div className="px-8 py-5 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-headings flex items-center gap-3">
                            <ShieldCheck size={28} className="text-headings" />
                            Compliance Portal
                        </h1>
                        <p className="text-sm text-secondary mt-1 ml-10">ELD Mandate Monitoring & HOS Audit Tracking</p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="px-8 flex gap-6">
                    {[
                        { key: 'tracker', label: 'HOS Audit Tracker' },
                        { key: 'audit-form', label: 'HOS Audit Form' },
                        { key: 'e-logs', label: 'E-Logs' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.key
                                ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                                : 'border-transparent text-secondary hover:text-secondary'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full mx-auto px-4 mt-8">
                {/* HOS Audit Tracker Tab */}
                {activeTab === 'tracker' && (
                    <div className="space-y-6">
                        {/* HOS Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-card p-5 rounded-xl border-l-4 border-green-500 shadow-sm">
                                <p className="text-xs text-secondary font-bold uppercase">Fully Compliant</p>
                                <h3 className="text-2xl font-bold">{summary.compliantDrivers}%</h3>
                                <p className="text-xs text-secondary mt-1">{summary.totalDrivers} Drivers</p>
                            </div>
                            <div className="bg-card p-5 rounded-xl border-l-4 border-red-500 shadow-sm">
                                <p className="text-xs text-secondary font-bold uppercase">Active Violations</p>
                                <h3 className="text-2xl font-bold text-red-500">{summary.activeViolations}</h3>
                                <p className="text-xs text-secondary mt-1">Requires immediate audit</p>
                            </div>
                            <div className="bg-card p-5 rounded-xl border-l-4 border-amber-500 shadow-sm">
                                <p className="text-xs text-secondary font-bold uppercase">Uncertified Logs</p>
                                <h3 className="text-2xl font-bold text-amber-600">{summary.uncertifiedLogs}</h3>
                                <p className="text-xs text-secondary mt-1">Pending driver signature</p>
                            </div>
                        </div>

                        {/* Audit Table */}
                        <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
                            <div className="px-6 py-4 border-b flex justify-between items-center bg-card">
                                <h3 className="font-bold text-primary">Driver Log Audit (Last 7 Days)</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSyncHOS}
                                        disabled={syncing}

                                        className="flex items-center gap-2 text-sm font-semibold !text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--accent-navyblue)]">
                                        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                                        {syncing ? 'Syncing...' : 'Sync from Samsara'}
                                    </button>
                                    <button
                                        style={{
                                            background: 'var(--accent-navyblue)',
                                        }}
                                        className="flex items-center gap-2 text-sm font-semibold !text-white px-4 py-2 rounded-lg hover:opacity-90">
                                        <Download size={16} /> Export HOS Report
                                    </button>
                                </div>
                            </div>

                            <table className="w-full text-sm text-left">
                                <thead className="bg-card text-secondary uppercase text-[11px] font-bold">
                                    <tr>
                                        <th className="px-6 py-4 text-headings">Driver Name</th>
                                        <th className="px-6 py-4 text-headings">Log Date</th>
                                        <th className="px-6 py-4 text-headings">Driving Time</th>
                                        <th className="px-6 py-4 text-headings">On-Duty Time</th>
                                        <th className="px-6 py-4 text-headings">Violation Type</th>
                                        <th className="px-6 py-4 text-headings">Status</th>
                                        <th className="px-6 py-4 text-headings">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center">
                                                <div className="flex items-center justify-center text-secondary">
                                                    <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                                                    Loading HOS data...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center">
                                                <p className="text-secondary mb-2">No HOS logs found.</p>
                                                <p className="text-sm text-secondary">
                                                    Submit an <button type="button" onClick={() => setActiveTab('audit-form')} className="text-[var(--accent-blue)] hover:underline font-medium">HOS Audit Form</button> to add manual logs, or click &quot;Sync from Samsara&quot; if you have ELD integration.
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-[rgba(1,106,178,0.05)]">
                                                <td className="px-6 py-4 font-bold text-primary">{log.driver}</td>
                                                <td className="px-6 py-4 text-secondary">{log.date}</td>
                                                <td className="px-6 py-4 font-mono text-primary">{log.driveUsed}</td>
                                                <td className="px-6 py-4 font-mono text-primary">{log.dutyUsed}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-medium ${log.violation !== 'None' ? 'text-red-500' : 'text-secondary'}`}>
                                                        {log.violation}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${log.status === 'compliant' ? 'bg-green-100 text-green-700' :
                                                        log.status === 'violation' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedHosLog(log);
                                                            setViewLogModalOpen(true);
                                                        }}
                                                        className="text-[var(--accent-blue)] font-bold hover:underline"
                                                    >
                                                        View Log
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* View Log Modal */}
                        {viewLogModalOpen && selectedHosLog && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewLogModalOpen(false)}>
                                <div
                                    className="bg-card rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="px-6 py-4 border-b border-theme flex justify-between items-center bg-card">
                                        <h3 className="text-lg font-bold text-primary">HOS Log Details</h3>
                                        <button
                                            type="button"
                                            onClick={() => setViewLogModalOpen(false)}
                                            className="p-2 rounded-lg hover:bg-gray-200 text-secondary"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="p-6 overflow-y-auto flex-1">
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div>
                                                <p className="text-xs text-secondary font-medium uppercase">Driver</p>
                                                <p className="font-semibold text-primary">{selectedHosLog.driver}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-secondary font-medium uppercase">Log Date</p>
                                                <p className="font-semibold text-primary">{selectedHosLog.date}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-secondary font-medium uppercase">Vehicle</p>
                                                <p className="font-semibold text-primary">{selectedHosLog.vehicle}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-secondary font-medium uppercase">Status</p>
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedHosLog.status === 'compliant' ? 'bg-green-100 text-green-700' :
                                                    selectedHosLog.status === 'violation' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {selectedHosLog.status}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-secondary font-medium uppercase">Driving Time</p>
                                                <p className="font-mono font-semibold text-primary">{selectedHosLog.driveUsed}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-secondary font-medium uppercase">On-Duty Time</p>
                                                <p className="font-mono font-semibold text-primary">{selectedHosLog.dutyUsed}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-secondary font-medium uppercase">Violation</p>
                                                <p className={`font-medium ${selectedHosLog.violation !== 'None' ? 'text-red-500' : 'text-secondary'}`}>
                                                    {selectedHosLog.violation}
                                                </p>
                                            </div>
                                        </div>

                                        <h4 className="text-sm font-bold text-primary mb-3">Duty Status Breakdown</h4>
                                        {Array.isArray(selectedHosLog.logs) && selectedHosLog.logs.length > 0 ? (
                                            <div className="border border-theme rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-card">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left font-semibold text-secondary">Status</th>
                                                            <th className="px-4 py-2 text-left font-semibold text-secondary">Start</th>
                                                            <th className="px-4 py-2 text-left font-semibold text-secondary">End</th>
                                                            <th className="px-4 py-2 text-right font-semibold text-secondary">Duration</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {selectedHosLog.logs.map((entry: any, idx: number) => {
                                                            const start = entry.startTime ? new Date(entry.startTime) : null;
                                                            const end = entry.endTime ? new Date(entry.endTime) : null;
                                                            const durationMs = start && end ? end.getTime() - start.getTime() : 0;
                                                            const hours = Math.floor(durationMs / (1000 * 60 * 60));
                                                            const mins = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                                                            const durationStr = `${hours}h ${mins}m`;
                                                            return (
                                                                <tr key={idx} className="hover:bg-[rgba(255,255,255,0.03)]">
                                                                    <td className="px-4 py-2">
                                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${entry.status === 'Driving' ? 'bg-[rgba(1,106,178,0.1)] text-[var(--accent-blue)]' :
                                                                            entry.status === 'OnDuty' ? 'bg-amber-100 text-amber-700' :
                                                                                'bg-card text-primary'
                                                                            }`}>
                                                                            {entry.status || '—'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2 text-primary">
                                                                        {start ? start.toLocaleString() : '—'}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-primary">
                                                                        {end ? end.toLocaleString() : '—'}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right font-mono text-primary">
                                                                        {durationStr}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-secondary py-4">No duty status entries available for this log.</p>
                                        )}
                                    </div>
                                    <div className="px-6 py-4 border-t border-theme bg-card flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setViewLogModalOpen(false)}
                                            className="px-4 py-2 text-sm font-medium text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* HOS Audit Form Tab */}
                {activeTab === 'audit-form' && (
                    <div className="space-y-6">
                        <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
                            <h2 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                                <FileCheck size={24} className="text-[var(--accent-blue)]" />
                                HOS Audit Form
                            </h2>

                            <form onSubmit={handleSubmitAudit} className="space-y-6">
                                {/* Driver Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Driver <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={auditFormData.driverId}
                                        onChange={(e) => {
                                            const selectedId = e.target.value;
                                            const selectedDriver = drivers.find((d) => d._id === selectedId);
                                            setAuditFormData({
                                                ...auditFormData,
                                                driverId: selectedId,
                                                driverIdDisplay: selectedDriver ? (selectedDriver.internalId || selectedDriver._id) : ''
                                            });
                                        }}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                        required
                                    >
                                        <option className='form-option' value="">Select a driver</option>
                                        {drivers.map((driver) => (
                                            <option className='form-option' key={driver._id} value={driver._id}>
                                                {driver.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Driver ID */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Driver ID</label>
                                    <input
                                        type="text"
                                        value={auditFormData.driverIdDisplay}
                                        onChange={(e) => setAuditFormData({ ...auditFormData, driverIdDisplay: e.target.value })}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                        placeholder="e.g. DRV-001"
                                    />
                                </div>

                                {/* Reporting To */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Reporting To</label>
                                    <input
                                        type="text"
                                        value={auditFormData.reportingTo}
                                        onChange={(e) => setAuditFormData({ ...auditFormData, reportingTo: e.target.value })}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                        placeholder="Name or role of person reported to"
                                    />
                                </div>

                                {/* Audit Date */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Audit Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={auditFormData.auditDate}
                                        onChange={(e) => setAuditFormData({ ...auditFormData, auditDate: e.target.value })}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                        required
                                    />
                                </div>

                                {/* Incident Date (distinct from Audit Date) */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Incident Date</label>
                                    <input
                                        type="date"
                                        value={auditFormData.incidentDate}
                                        onChange={(e) => setAuditFormData({ ...auditFormData, incidentDate: e.target.value })}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                        placeholder="Date when incident occurred"
                                    />
                                    <p className="text-xs text-secondary mt-1">Date the incident occurred (may differ from audit date)</p>
                                </div>

                                {/* Incident Time */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Incident Time</label>
                                    <input
                                        type="time"
                                        value={auditFormData.incidentTime}
                                        onChange={(e) => setAuditFormData({ ...auditFormData, incidentTime: e.target.value })}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                    />
                                </div>

                                {/* Incident Location */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Incident Location</label>
                                    <input
                                        type="text"
                                        value={auditFormData.incidentLocation}
                                        onChange={(e) => setAuditFormData({ ...auditFormData, incidentLocation: e.target.value })}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                        placeholder="Location where incident occurred"
                                    />
                                </div>

                                {/* Incident Type (multi-select checkboxes + add option) */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Incident Type</label>
                                    <div className="space-y-2 flex flex-wrap gap-x-6 gap-y-2">
                                        {[...defaultIncidentTypeOptions, ...auditFormData.incidentTypeCustomOptions].map((option) => (
                                            <label key={option} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={auditFormData.incidentTypes.includes(option)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setAuditFormData({ ...auditFormData, incidentTypes: [...auditFormData.incidentTypes, option] });
                                                        } else {
                                                            setAuditFormData({ ...auditFormData, incidentTypes: auditFormData.incidentTypes.filter(t => t !== option) });
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-[var(--accent-blue)] border-theme rounded focus:ring-[var(--accent-blue)]"
                                                />
                                                <span className="text-sm text-primary">{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newIncidentTypeOption}
                                            onChange={(e) => setNewIncidentTypeOption(e.target.value)}
                                            placeholder="Add custom option"
                                            className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = newIncidentTypeOption.trim();
                                                    if (val && !auditFormData.incidentTypeCustomOptions.includes(val)) {
                                                        setAuditFormData({
                                                            ...auditFormData,
                                                            incidentTypeCustomOptions: [...auditFormData.incidentTypeCustomOptions, val]
                                                        });
                                                        setNewIncidentTypeOption('');
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const val = newIncidentTypeOption.trim();
                                                if (val && !auditFormData.incidentTypeCustomOptions.includes(val)) {
                                                    setAuditFormData({
                                                        ...auditFormData,
                                                        incidentTypeCustomOptions: [...auditFormData.incidentTypeCustomOptions, val]
                                                    });
                                                    setNewIncidentTypeOption('');
                                                }
                                            }}
                                            className="flex items-center gap-1 text-sm text-[var(--accent-blue)] hover:opacity-80 font-medium"
                                        >
                                            <Plus size={16} /> Add option
                                        </button>
                                    </div>
                                </div>

                                {/* Prior Counseling (Yes/No) */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Prior Counseling</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="priorCounseling"
                                                checked={auditFormData.priorCounseling === 'yes'}
                                                onChange={() => setAuditFormData({ ...auditFormData, priorCounseling: 'yes' })}
                                                className="w-4 h-4 text-[var(--accent-blue)] border-theme focus:ring-[var(--accent-blue)]"
                                            />
                                            <span className="text-sm text-primary">Yes</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="priorCounseling"
                                                checked={auditFormData.priorCounseling === 'no'}
                                                onChange={() => setAuditFormData({ ...auditFormData, priorCounseling: 'no' })}
                                                className="w-4 h-4 text-[var(--accent-blue)] border-theme focus:ring-[var(--accent-blue)]"
                                            />
                                            <span className="text-sm text-primary">No</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Corrective Action Type (dropdown + add option) */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Corrective Action Type</label>
                                    <div className="flex gap-2 flex-wrap items-center">
                                        <select
                                            value={auditFormData.correctiveActionType}
                                            onChange={(e) => setAuditFormData({ ...auditFormData, correctiveActionType: e.target.value })}
                                            className="px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]min-w-[200px]"
                                        >
                                            <option className='form-option' value="">Select corrective action</option>
                                            {[...defaultCorrectiveActionOptions, ...auditFormData.correctiveActionCustomOptions].map((opt) => (
                                                <option className='form-option' key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            value={newCorrectiveActionOption}
                                            onChange={(e) => setNewCorrectiveActionOption(e.target.value)}
                                            placeholder="Add new action type"
                                            className="px-3 py-1.5 text-sm border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]max-w-[180px]"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = newCorrectiveActionOption.trim();
                                                    if (val && !auditFormData.correctiveActionCustomOptions.includes(val)) {
                                                        setAuditFormData({
                                                            ...auditFormData,
                                                            correctiveActionCustomOptions: [...auditFormData.correctiveActionCustomOptions, val],
                                                            correctiveActionType: val
                                                        });
                                                        setNewCorrectiveActionOption('');
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const val = newCorrectiveActionOption.trim();
                                                if (val && !auditFormData.correctiveActionCustomOptions.includes(val)) {
                                                    setAuditFormData({
                                                        ...auditFormData,
                                                        correctiveActionCustomOptions: [...auditFormData.correctiveActionCustomOptions, val],
                                                        correctiveActionType: val
                                                    });
                                                    setNewCorrectiveActionOption('');
                                                }
                                            }}
                                            className="flex items-center gap-1 text-sm text-[var(--accent-blue)] hover:opacity-80 font-medium"
                                        >
                                            <Plus size={16} /> Add
                                        </button>
                                    </div>
                                </div>

                                {/* Violations */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Violations (if any)
                                    </label>
                                    <div className="space-y-2">
                                        {violationOptions.map((violation) => (
                                            <label key={violation} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={auditFormData.violations.includes(violation)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setAuditFormData({
                                                                ...auditFormData,
                                                                violations: [...auditFormData.violations, violation]
                                                            });
                                                        } else {
                                                            setAuditFormData({
                                                                ...auditFormData,
                                                                violations: auditFormData.violations.filter(v => v !== violation)
                                                            });
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-[var(--accent-blue)] border-theme rounded focus:ring-[var(--accent-blue)]"
                                                />
                                                <span className="text-sm text-primary">{violation}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Auditor Name */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Auditor Name
                                    </label>
                                    <input
                                        type="text"
                                        value={auditFormData.auditorName}
                                        onChange={(e) => setAuditFormData({ ...auditFormData, auditorName: e.target.value })}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                        placeholder="Enter auditor name"
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Notes
                                    </label>
                                    <textarea
                                        value={auditFormData.notes}
                                        onChange={(e) => setAuditFormData({ ...auditFormData, notes: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                        placeholder="Enter any additional notes or observations..."
                                    />
                                </div>

                                {/* Document Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Attach Documents
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex flex-col gap-2 cursor-pointer">
                                            <div className="px-4 py-3 border border-theme rounded-lg border-dashed hover:bg-[rgba(255,255,255,0.03)] text-center">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                                                    onChange={(e) => {
                                                        const files = e.target.files;
                                                        if (files && files.length > 0) {
                                                            const fileArray = Array.from(files);
                                                            setAuditFormDocuments(prev => {
                                                                // Create unique list by checking for duplicates
                                                                const existingNames = new Set(prev.map(f => `${f.name}-${f.size}`));
                                                                const newFiles = fileArray.filter(f => !existingNames.has(`${f.name}-${f.size}`));
                                                                return [...prev, ...newFiles];
                                                            });
                                                        }
                                                        // Reset input to allow selecting same file again
                                                        e.target.value = '';
                                                    }}
                                                    className="hidden"
                                                    id="audit-document-upload"
                                                />
                                                <label htmlFor="audit-document-upload" className="cursor-pointer">
                                                    <Upload size={24} className="mx-auto mb-1 text-secondary" />
                                                    <span className="text-sm text-secondary">Click to upload or drag and drop</span>
                                                    <p className="text-xs text-secondary mt-1">PDF, DOC, XLS, TXT, JPG, PNG (optional)</p>
                                                </label>
                                            </div>
                                        </label>
                                        {auditFormDocuments.length > 0 && (
                                            <div className="mt-2 space-y-2">
                                                <p className="text-xs text-secondary font-medium">Selected Documents ({auditFormDocuments.length}):</p>
                                                <ul className="space-y-1">
                                                    {auditFormDocuments.map((file, index) => (
                                                        <li key={`doc-${index}-${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between px-3 py-2 bg-card rounded-lg text-sm border border-theme">
                                                            <span className="flex items-center gap-2 text-primary flex-1 min-w-0">
                                                                <FileText size={16} className="text-[var(--accent-blue)] flex-shrink-0" />
                                                                <span className="truncate" title={file.name}>{file.name}</span>
                                                                <span className="text-secondary text-xs flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setAuditFormDocuments(prev => prev.filter((_, i) => i !== index));
                                                                }}
                                                                className="text-red-500 hover:text-red-700 p-1 ml-2 flex-shrink-0"
                                                                title="Remove"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="flex justify-end gap-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAuditFormData({
                                                driverId: '',
                                                driverIdDisplay: '',
                                                reportingTo: '',
                                                auditDate: new Date().toISOString().split('T')[0],
                                                incidentDate: '',
                                                incidentTime: '',
                                                incidentLocation: '',
                                                drivingHours: 0,
                                                onDutyHours: 0,
                                                offDutyHours: 0,
                                                violations: [],
                                                incidentTypes: [],
                                                incidentTypeCustomOptions: auditFormData.incidentTypeCustomOptions,
                                                priorCounseling: '',
                                                correctiveActionType: '',
                                                correctiveActionCustomOptions: auditFormData.correctiveActionCustomOptions,
                                                notes: '',
                                                auditorName: ''
                                            });
                                            setAuditFormDocuments([]);
                                        }}
                                        className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)]"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingAudit}
                                      
                                        className="px-6 py-2 !text-white bg-[var(--accent-navyblue)] font-semibold rounded-lg hover:bg-[var(--accent-navyblue)]/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submittingAudit ? 'Submitting...' : 'Submit Audit'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* HOS Audit Table (from API) */}
                        <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
                            <div className="px-6 py-4 border-b bg-card flex justify-between items-center">
                                <h3 className="font-bold text-primary">HOS Audit Records</h3>
                                <button
                                    type="button"
                                    onClick={fetchAuditForms}
                                    disabled={auditTableLoading}
                                    className="text-sm font-medium text-[var(--accent-blue)] hover:opacity-80 disabled:opacity-50 flex items-center gap-1"
                                >
                                    <RefreshCw size={16} className={auditTableLoading ? 'animate-spin' : ''} />
                                    Refresh
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-card text-secondary uppercase text-[11px] font-bold">
                                        <tr>
                                            <th className="px-6 py-4">Driver</th>
                                            <th className="px-6 py-4">Driver ID</th>
                                            <th className="px-6 py-4">Reporting To</th>
                                            <th className="px-6 py-4">Audit Date</th>
                                            <th className="px-6 py-4">Incident Date</th>
                                            <th className="px-6 py-4">Incident Type</th>
                                            <th className="px-6 py-4">Prior Counseling</th>
                                            <th className="px-6 py-4">Corrective Action</th>
                                            <th className="px-6 py-4">Documents</th>
                                            <th className="px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {auditTableLoading ? (
                                            <tr>
                                                <td colSpan={10} className="px-6 py-12 text-center text-secondary">
                                                    <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2" />
                                                    Loading audit records...
                                                </td>
                                            </tr>
                                        ) : auditTableData.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="px-6 py-12 text-center text-secondary">
                                                    No audit records yet. Submit the form above to create one.
                                                </td>
                                            </tr>
                                        ) : (
                                            auditTableData.map((row) => (
                                                <tr key={row.id} className="hover:bg-[rgba(1,106,178,0.05)]">
                                                    <td className="px-6 py-4 font-medium text-primary">{row.driverName}</td>
                                                    <td className="px-6 py-4 text-secondary">{row.driverId || '—'}</td>
                                                    <td className="px-6 py-4 text-secondary">{row.reportingTo || '—'}</td>
                                                    <td className="px-6 py-4 text-secondary">{row.auditDate ? new Date(row.auditDate).toLocaleDateString() : '—'}</td>
                                                    <td className="px-6 py-4 text-secondary">{row.incidentDate === '—' || !row.incidentDate ? '—' : new Date(row.incidentDate).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-secondary">{row.incidentTypes?.length ? row.incidentTypes.join(', ') : '—'}</td>
                                                    <td className="px-6 py-4 text-secondary capitalize">{row.priorCounseling || '—'}</td>
                                                    <td className="px-6 py-4 text-secondary">{row.correctiveActionType || '—'}</td>
                                                    <td className="px-6 py-4 text-secondary">
                                                        {row.documents?.length ? (
                                                            <button
                                                                type="button"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        const auditId = row.id;
                                                                        // Always fetch signed URL for the first document
                                                                        const response = await getHosAuditDocumentUrl(auditId, 0);
                                                                        if (response?.success && response?.data?.url) {
                                                                            window.open(response.data.url, '_blank');
                                                                        } else {
                                                                            // If no URL available, open details sidebar
                                                                            setSelectedAuditDetail(row);
                                                                            setDetailSidebarOpen(true);
                                                                        }
                                                                    } catch (error: any) {
                                                                        console.error('Error loading document:', error);
                                                                        // On error, open details sidebar as fallback
                                                                        setSelectedAuditDetail(row);
                                                                        setDetailSidebarOpen(true);
                                                                    }
                                                                }}
                                                                className="text-[var(--accent-blue)] hover:opacity-80 underline cursor-pointer text-sm font-medium"
                                                                title={row.documents.length === 1 ? `Open ${row.documents[0].name}` : `Click to view ${row.documents.length} files`}
                                                            >
                                                                {row.documents.length} file(s)
                                                            </button>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openDownloadForm(row);
                                                                }}
                                                                className="flex items-center gap-1 text-[var(--accent-blue)] hover:opacity-80 font-medium"
                                                                title="Download HOS Progressive Disciplinary Action form"
                                                            >
                                                                <Download size={16} /> Download form
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedAuditDetail(row);
                                                                    setDetailSidebarOpen(true);
                                                                }}
                                                                className="flex items-center gap-1 text-[var(--accent-blue)] hover:opacity-80 font-medium"
                                                            >
                                                                <Eye size={16} /> View details
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

                        {/* View Details Sidebar Modal */}
                        {detailSidebarOpen && selectedAuditDetail && (
                            <>
                                <div
                                    className="fixed inset-0 bg-black/40 z-40 !mb-0 !pb-0"
                                    onClick={() => { setDetailSidebarOpen(false); setSelectedAuditDetail(null); }}
                                    aria-hidden="true"
                                />
                                <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card shadow-xl z-50 flex flex-col !mb-0 !pb-0">
                                    <div className="flex-shrink-0 border-b border-theme px-6 py-4 flex justify-between items-center bg-gray-50/80">
                                        <h3 className="text-lg font-bold text-primary">Audit Details</h3>
                                        <button
                                            type="button"
                                            onClick={() => { setDetailSidebarOpen(false); setSelectedAuditDetail(null); }}
                                            className="p-2 text-secondary hover:text-primary hover:bg-gray-200 rounded-lg transition-colors"
                                            aria-label="Close"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6">
                                        <div className="space-y-6">
                                            {/* Driver & identification */}
                                            <section>
                                                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Driver & identification</h4>
                                                <div className="space-y-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-secondary">Driver</span>
                                                        <p className="text-primary font-medium">{selectedAuditDetail.driverName}</p>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-secondary">Driver ID</span>
                                                        <p className="text-primary">{selectedAuditDetail.driverId || '—'}</p>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-secondary">Reporting To</span>
                                                        <p className="text-primary">{selectedAuditDetail.reportingTo || '—'}</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <div className="border-t border-theme" />

                                            {/* Dates */}
                                            <section>
                                                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Dates</h4>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-secondary">Audit Date</span>
                                                        <p className="text-primary">{new Date(selectedAuditDetail.auditDate).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-secondary">Incident Date</span>
                                                        <p className="text-primary">{selectedAuditDetail.incidentDate === '—' ? '—' : new Date(selectedAuditDetail.incidentDate).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <div className="border-t border-theme" />

                                            {/* Hours */}
                                            <div className="border-t border-theme" />

                                            {/* Incident & action */}
                                            <section>
                                                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Incident & action</h4>
                                                <div className="space-y-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-secondary">Incident Type</span>
                                                        <p className="text-primary">{selectedAuditDetail.incidentTypes.length ? selectedAuditDetail.incidentTypes.join(', ') : '—'}</p>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-secondary">Prior Counseling</span>
                                                        <p className="text-primary capitalize">{selectedAuditDetail.priorCounseling || '—'}</p>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-secondary">Corrective Action Type</span>
                                                        <p className="text-primary">{selectedAuditDetail.correctiveActionType || '—'}</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <div className="border-t border-theme" />

                                            {/* Violations */}
                                            <section>
                                                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Violations</h4>
                                                <p className="text-primary">{selectedAuditDetail.violations.length ? selectedAuditDetail.violations.join(', ') : 'None'}</p>
                                            </section>

                                            <div className="border-t border-theme" />

                                            {/* Documents */}
                                            <section>
                                                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Documents</h4>
                                                {selectedAuditDetail.documents?.length ? (
                                                    <ul className="space-y-2">
                                                        {selectedAuditDetail.documents.map((d, i) => {
                                                            const doc = d as any;
                                                            const hasUrl = doc?.url || doc?.key;
                                                            return (
                                                                <li key={i} className="flex items-center justify-between gap-2 text-sm text-primary group">
                                                                    <button
                                                                        type="button"
                                                                        onClick={async (e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            try {
                                                                                const auditId = selectedAuditDetail.id;
                                                                                const response = await getHosAuditDocumentUrl(auditId, i);
                                                                                if (response?.success && response?.data?.url) {
                                                                                    window.open(response.data.url, '_blank');
                                                                                } else {
                                                                                    alert(response?.message || `File "${d.name}" is not available. The document was not uploaded with a file URL.`);
                                                                                }
                                                                            } catch (error: any) {
                                                                                console.error('Error loading document:', error);
                                                                                alert(`Error loading document: ${error?.response?.data?.message || error.message || 'Unknown error'}`);
                                                                            }
                                                                        }}
                                                                        className={`flex items-center gap-2 flex-1 text-left transition-colors ${hasUrl
                                                                            ? 'text-[var(--accent-blue)] hover:opacity-80 cursor-pointer hover:underline'
                                                                            : 'text-secondary cursor-not-allowed'
                                                                            }`}
                                                                        disabled={!hasUrl}
                                                                        title={hasUrl ? `Click to open ${d.name}` : `File "${d.name}" is not available`}
                                                                    >
                                                                        <FileText size={16} className={`flex-shrink-0 ${hasUrl ? 'text-[var(--accent-blue)]' : 'text-secondary'}`} />
                                                                        <span className="truncate">{d.name}</span>
                                                                        <span className="text-secondary text-xs flex-shrink-0">({(d.size / 1024).toFixed(1)} KB)</span>
                                                                    </button>
                                                                    {hasUrl && (
                                                                        <Download size={14} className="text-[var(--accent-blue)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                ) : (
                                                    <p className="text-secondary text-sm">None</p>
                                                )}
                                            </section>

                                            <div className="border-t border-theme" />

                                            {/* Auditor & notes */}
                                            <section>
                                                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Auditor & notes</h4>
                                                <div className="space-y-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-secondary">Auditor</span>
                                                        <p className="text-primary">{selectedAuditDetail.auditorName || '—'}</p>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-secondary">Notes</span>
                                                        <p className="text-primary text-sm leading-relaxed bg-card rounded-lg p-3 border border-theme">{selectedAuditDetail.notes || '—'}</p>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* HOS Progressive Disciplinary Action – Download Form Modal */}
                        {downloadFormOpen && downloadFormRow && (
                            <>
                                <div
                                    className="fixed inset-0 bg-black/40 z-40 !mb-0 !pb-0"
                                    onClick={closeDownloadForm}
                                    aria-hidden="true"
                                />
                                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto p-4 pt-8 pb-16">
                                    <div className="bg-card rounded-xl shadow-xl border border-theme w-full max-w-3xl my-4">
                                        <div className="top-0 z-10 flex items-center justify-between border-b border-theme px-6 py-4 bg-card rounded-t-xl">
                                            <h3 className="text-lg font-bold text-primary">HOS Progressive Disciplinary Action Form</h3>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={saveEditableFormState}
                                                    className="px-4 py-2 text-sm font-medium text-primary bg-card hover:bg-gray-200 rounded-lg"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={downloadHosFormPdf}
                                                    style={{
                                                        background: 'var(--accent-navyblue)'
                                                    }}
                                                    className="px-4 py-2 text-sm font-semibold !text-white rounded-lg hover:opacity-90"
                                                >
                                                    <Download size={16} className="inline-block mr-1 align-middle" /> Download PDF
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={closeDownloadForm}
                                                    className="p-2 text-secondary hover:text-primary hover:bg-gray-200 rounded-lg"
                                                    aria-label="Close"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>
                                        <div ref={hosFormPrintRef} className="p-6 space-y-6 text-sm print:block">
                                            {/* Form title */}
                                            <h2 className="text-center text-lg font-bold text-primary border-b border-theme pb-2">
                                                HOS PROGRESSIVE DISCIPLINARY ACTION FORM
                                            </h2>

                                            {/* Employee Information (from API) */}
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                                <div><span className="font-semibold text-secondary">Employee Name:</span> {downloadFormRow.driverName}</div>
                                                <div><span className="font-semibold text-secondary">Driver ID:</span> {downloadFormRow.driverId || '—'}</div>
                                                <div><span className="font-semibold text-secondary">Reporting to:</span> {downloadFormRow.reportingTo || '—'}</div>
                                                <div><span className="font-semibold text-secondary">Date:</span> {downloadFormRow.auditDate ? new Date(downloadFormRow.auditDate).toLocaleDateString() : '—'}</div>
                                            </div>

                                            {/* Incident Information (from API) */}
                                            <div>
                                                <h4 className="font-bold text-primary mb-2">Incident Information</h4>
                                                <div className="grid grid-cols-2 gap-2 mb-2">
                                                    <div><span className="font-semibold text-secondary">Date:</span> {downloadFormRow.incidentDate && downloadFormRow.incidentDate !== '—' ? new Date(downloadFormRow.incidentDate).toLocaleDateString() : '—'}</div>
                                                    <div><span className="font-semibold text-secondary">Time:</span> {downloadFormRow.incidentTime || '—'}</div>
                                                    <div><span className="font-semibold text-secondary">Location:</span> {downloadFormRow.incidentLocation || '—'}</div>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-secondary">Incident type:</span>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                        {DISCIPLINARY_INCIDENT_TYPES.map((opt) => {
                                                            const checked = (downloadFormRow.incidentTypes || []).some(t =>
                                                                opt.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(opt.toLowerCase().split(' ')[0])
                                                            );
                                                            return (
                                                                <label key={opt} className="flex items-center gap-1">
                                                                    <input type="checkbox" readOnly checked={checked} className="rounded border-gray-400" />
                                                                    <span>{opt}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Incident details (from API) */}
                                            <div>
                                                <h4 className="font-bold text-primary mb-1">Incident details (has the employee been counselled before on this or a similar HOS occurrence?)</h4>
                                                <div className="flex items-center gap-4 mb-2">
                                                    <label className="flex items-center gap-2">
                                                        <input type="checkbox" readOnly checked={(downloadFormRow.priorCounseling || '').toString().toLowerCase() === 'yes'} className="rounded border-gray-400" />
                                                        <span>Yes</span>
                                                    </label>
                                                    <label className="flex items-center gap-2">
                                                        <input type="checkbox" readOnly checked={(downloadFormRow.priorCounseling || '').toString().toLowerCase() === 'no' || !downloadFormRow.priorCounseling || downloadFormRow.priorCounseling === '—'} className="rounded border-gray-400" />
                                                        <span>No</span>
                                                    </label>
                                                </div>
                                                <div className="border border-theme rounded p-3 bg-card text-primary min-h-[80px]">
                                                    {downloadFormRow.notes || '—'}
                                                </div>
                                            </div>

                                            {/* Corrective action (from API) */}
                                            <div>
                                                <h4 className="font-bold text-primary mb-2">Corrective action taken</h4>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                                                    {DISCIPLINARY_CORRECTIVE_ACTIONS.map((opt) => {
                                                        const key = opt.split(' ')[0].toLowerCase();
                                                        const checked = downloadFormRow.correctiveActionType && downloadFormRow.correctiveActionType.toLowerCase().includes(key);
                                                        return (
                                                            <label key={opt} className="flex items-center gap-1">
                                                                <input type="checkbox" readOnly checked={!!checked} className="rounded border-gray-400" />
                                                                <span>{opt}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                                <p className="text-secondary"><span className="font-semibold">Comments:</span> {downloadFormRow.correctiveActionType || '—'}</p>
                                            </div>

                                            {/* Manager's Signature (editable) */}
                                            <div className="border-t border-theme pt-4">
                                                <label className="block font-bold text-primary mb-1">Manager's Signature</label>
                                                <div className="flex flex-wrap items-center gap-4">
                                                    <input
                                                        type="text"
                                                        value={editableFormState.managerSignature}
                                                        onChange={(e) => setEditableFormState(prev => ({ ...prev, managerSignature: e.target.value }))}
                                                        placeholder="Manager name or signature"
                                                        className="flex-1 min-w-[200px] px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                    />
                                                    <label className="flex items-center gap-2">
                                                        <span className="font-semibold text-secondary">Date:</span>
                                                        <input
                                                            type="date"
                                                            value={editableFormState.managerDate}
                                                            onChange={(e) => setEditableFormState(prev => ({ ...prev, managerDate: e.target.value }))}
                                                            className="px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                        />
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Notice to employee (editable) */}
                                            <div className="border-t border-theme pt-4">
                                                <label className="block font-bold text-primary mb-1">Notice to employee</label>
                                                <textarea
                                                    value={editableFormState.noticeToEmployee}
                                                    onChange={(e) => setEditableFormState(prev => ({ ...prev, noticeToEmployee: e.target.value }))}
                                                    rows={4}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]text-primary"
                                                />
                                            </div>

                                            {/* Employee's comments (editable) */}
                                            <div className="border-t border-theme pt-4">
                                                <label className="block font-bold text-primary mb-1">Employee's comments</label>
                                                <textarea
                                                    value={editableFormState.employeeComments}
                                                    onChange={(e) => setEditableFormState(prev => ({ ...prev, employeeComments: e.target.value }))}
                                                    rows={4}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]text-primary"
                                                />
                                            </div>

                                            {/* Employee's Signature (editable) */}
                                            <div className="border-t border-theme pt-4">
                                                <label className="block font-bold text-primary mb-1">Employee's Signature</label>
                                                <div className="flex flex-wrap items-center gap-4">
                                                    <input
                                                        type="text"
                                                        value={editableFormState.employeeSignature}
                                                        onChange={(e) => setEditableFormState(prev => ({ ...prev, employeeSignature: e.target.value }))}
                                                        placeholder="Employee name or signature"
                                                        className="flex-1 min-w-[200px] px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                    />
                                                    <label className="flex items-center gap-2">
                                                        <span className="font-semibold text-secondary">Date:</span>
                                                        <input
                                                            type="date"
                                                            value={editableFormState.employeeDate}
                                                            onChange={(e) => setEditableFormState(prev => ({ ...prev, employeeDate: e.target.value }))}
                                                            className="px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* E-Logs Tab */}
                {activeTab === 'e-logs' && (
                    <div className="space-y-6">
                        {/* Upload Section */}
                        <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
                            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                                <Upload size={24} className="text-[var(--accent-blue)]" />
                                Upload E-Log File
                            </h2>

                            <div className="space-y-4">
                                {/* Driver Selection (Optional) */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Driver (Optional)
                                    </label>
                                    <select
                                        value={selectedDriverForLog}
                                        onChange={(e) => setSelectedDriverForLog(e.target.value)}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                    >
                                        <option className='form-option' value="">All Drivers</option>
                                        {drivers.map((driver) => (
                                            <option className='form-option' key={driver._id} value={driver._id}>
                                                {driver.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* File Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Select E-Log File <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 cursor-pointer">
                                            <input
                                                type="file"
                                                accept=".pdf,.txt,.csv,.xlsx,.xls"
                                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                className="hidden"
                                            />
                                            <div className="px-4 py-3 border border-theme rounded-lg border-dashed hover:bg-[rgba(255,255,255,0.03)] text-center">
                                                {selectedFile ? (
                                                    <div className="flex items-center justify-center gap-2 text-[var(--accent-blue)]">
                                                        <FileText size={20} />
                                                        <span className="font-medium">{selectedFile.name}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedFile(null);
                                                            }}
                                                            className="ml-2 text-red-500 hover:text-red-700"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-secondary">
                                                        <Upload size={24} className="mx-auto mb-2" />
                                                        <span>Click to select file or drag and drop</span>
                                                        <p className="text-xs mt-1">PDF, TXT, CSV, XLSX (Max 20MB)</p>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Upload Button */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleFileUpload}
                                        disabled={!selectedFile || uploadingFile}
                                        style={{
                                            background: (!selectedFile || uploadingFile) ? '#9CA3AF' : 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)',
                                        }}
                                        className="px-6 py-2 !text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {uploadingFile ? (
                                            <>
                                                <RefreshCw size={16} className="animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={16} />
                                                Upload File
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* E-Logs List */}
                        <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
                            <div className="px-6 py-4 border-b bg-card">
                                <h3 className="font-bold text-primary flex items-center gap-2">
                                    <FileText size={20} className="text-[var(--accent-blue)]" />
                                    Uploaded E-Logs
                                </h3>
                            </div>

                            {eLogsLoading ? (
                                <div className="px-6 py-8 text-center">
                                    <RefreshCw className="animate-spin h-5 w-5 mx-auto text-secondary" />
                                </div>
                            ) : eLogs.length === 0 ? (
                                <div className="px-6 py-8 text-center text-secondary">
                                    No E-Log files uploaded yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-card text-secondary uppercase text-[11px] font-bold">
                                            <tr>
                                                <th className="px-6 py-4">File Name</th>
                                                <th className="px-6 py-4">Driver</th>
                                                <th className="px-6 py-4">File Size</th>
                                                <th className="px-6 py-4">Uploaded Date</th>
                                                <th className="px-6 py-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {eLogs.map((log) => (
                                                <tr key={log._id} className="hover:bg-[rgba(1,106,178,0.05)]">
                                                    <td className="px-6 py-4 font-medium text-primary">
                                                        {editingELogId === log._id ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={editingELogValue}
                                                                    onChange={(e) => setEditingELogValue(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') saveRenameELog(log._id);
                                                                        if (e.key === 'Escape') cancelRenameELog();
                                                                    }}
                                                                    className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => saveRenameELog(log._id)}
                                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                                                    title="Save"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={cancelRenameELog}
                                                                    className="p-1.5 text-secondary hover:bg-[rgba(255,255,255,0.03)] rounded"
                                                                    title="Cancel"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <FileText size={16} className="text-[var(--accent-blue)] flex-shrink-0" />
                                                                <span className="min-w-0 truncate">{getELogDisplayName(log)}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startRenameELog(log)}
                                                                    className="p-1 text-secondary hover:text-[var(--accent-blue)] hover:bg-[rgba(1,106,178,0.05)]rounded flex-shrink-0"
                                                                    title="Rename"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-secondary">
                                                        {typeof log.driverId === 'object' && log.driverId?.name
                                                            ? log.driverId.name
                                                            : log.driverName || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 text-secondary">
                                                        {(log.fileSize / 1024 / 1024).toFixed(2)} MB
                                                    </td>
                                                    <td className="px-6 py-4 text-secondary">
                                                        {new Date(log.uploadedAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleDownloadELog(log._id, log.fileName)}
                                                                className="text-[var(--accent-blue)] hover:opacity-80 font-medium"
                                                            >
                                                                <Download size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteELog(log._id)}
                                                                className="text-red-500 hover:text-red-700 font-medium"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default VehicleEldMonitor;
