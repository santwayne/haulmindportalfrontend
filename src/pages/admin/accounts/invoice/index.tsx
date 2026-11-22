import { todayLocalISO } from '../../../../utils/fuelDate';
import React, { useState, useEffect } from 'react';
import {
    FileText, Plus, Eye, Edit, Filter, Calendar, DollarSign, Users, TrendingUp,
    Trash2, X, CheckCircle, AlertCircle, Building2, Download,
    Paperclip, Mail,
} from 'lucide-react';
import { createInvoice, listInvoices, updateInvoice, deleteInvoice, listTrips, downloadInvoicePacket, emailInvoicePacket, getInvoiceSettings, updateInvoiceSettings } from "../../../../axios/api/account.invoices";
import jsPDF from 'jspdf';
import DocLogo from '../../../../assets/doclogo.png';
import { FLEET_COLORS } from '../../fleetMaintenance/colorUtils';
import type { Trip } from '../../../../axios/api/main.dashboard';

interface CompanyInfo {
    _id?: string;
    companyName?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    taxNumber?: string;
    logoUrl?: string;
    invoiceNotes?: string;
}

interface ServiceBreakdownItem {
    description: string;
    quantity?: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
}

interface Invoice {
    _id: string;
    clientName: string;
    clientEmail: string;
    clientCompany?: string;
    clientAddress?: string;
    clientPhone?: string;
    loadId?: string; // Legacy field
    tripId?: string | Trip; // New field - can be populated
    orderId?: Order | {
        orderNumber: string;
        customerOrderNo?: string;
        pickupLocation?: { place?: string };
        deliveryLocation?: { place?: string };
        driver?: {
            _id: string;
            name: string;
            email?: string;
            phone?: string;
        };
        coDriver?: {
            _id: string;
            name: string;
            email?: string;
            phone?: string;
        };
        truck?: {
            _id: string;
            unitNumber?: string;
            plateNumber?: string;
            licensePlate?: string;
            internalId?: string;
            make?: string;
            model?: string;
            makeModel?: string;
            type?: string;
            unitType?: string;
        };
        trailer?: {
            _id: string;
            unitNumber?: string;
            plateNumber?: string;
            licensePlate?: string;
            make?: string;
            model?: string;
            makeModel?: string;
            type?: string;
            unitType?: string;
            capacity?: string;
        };
    };
    amount: number | string;
    currency: string;
    status: 'paid' | 'pending';
    invoiceDate: string;
    dueDate: string;
    paymentDate: string | null;
    paymentTerms?: string;
    invoiceUrl: string;
    notes: string;
    serviceBreakdown?: ServiceBreakdownItem[];
    subtotal?: number;
    taxAmount?: number;
    taxNumber?: string;
    gst?: number;
    gstRate?: number;
    pst?: number;
    pstRate?: number;
    company?: CompanyInfo | string;
    createdAt: string;
    updatedAt: string;
}

interface Order {
    _id: string;
    orderNumber: string;
    customerOrderNo?: string;
    status: string;
    driver?: {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    coDriver?: {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    truck?: {
        _id: string;
        unitNumber?: string;
        plateNumber?: string;
        licensePlate?: string; // Legacy field
        internalId?: string;
        make?: string;
        model?: string;
        makeModel?: string; // Legacy field
        type?: string;
        unitType?: string; // Legacy field
    };
    trailer?: {
        _id: string;
        unitNumber?: string;
        plateNumber?: string;
        licensePlate?: string; // Legacy field
        make?: string;
        model?: string;
        makeModel?: string; // Legacy field
        type?: string;
        unitType?: string; // Legacy field
        capacity?: string;
    };
    customer?: {
        _id: string;
        name: string;
        email: string;
        phone?: string;
        address?: string;
        company?: string;
        city?: string;
        state?: string;
        country?: string;
        location?: {
            address?: string;
            city?: string;
            state?: string;
            postalCode?: string;
        };
    };
    pickupLocation?: {
        place?: string;
        placeId?: {
            name?: string;
            currentLocation?: {
                address?: string;
                city?: string;
                state?: string;
            };
        };
    };
    deliveryLocation?: {
        place?: string;
        placeId?: {
            name?: string;
            currentLocation?: {
                address?: string;
                city?: string;
                state?: string;
            };
        };
    };
    commodity?: string;
    weight?: number;
    weightUnit?: string;
    orderType?: string;
    equipment?: string[];
    noOfPackages?: number;
    noOfPackagesType?: string;
    temperature?: number;
    additionalInfo?: {
        HAZMAT?: boolean;
        TARP?: boolean;
        OverDimension?: boolean;
        CSA?: boolean;
    };
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
        unit?: string;
    };
    pickupDate?: string;
    deliveryDate?: string;
    createdAt?: string;
    updatedAt?: string;
    notes?: string;
}

type TabType = 'list' | 'view' | 'edit' | 'create';
type StatusFilter = 'all' | 'paid' | 'pending';

interface Notification {
    id: number;
    type: 'success' | 'error';
    message: string;
}

const InvoiceManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('list');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; invoiceId: string | null }>({ show: false, invoiceId: null });
    const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);

    const pageBackgroundStyle = {
        background: `linear-gradient(180deg, ${FLEET_COLORS.focusRing} 0%, rgba(255,255,255,0.98) 40%, #f8fafc 100%)`,
    };



    const primaryButtonStyle: React.CSSProperties = {
        background: FLEET_COLORS.gradient,
        color: '#fff',
        border: 'none',
        boxShadow: `0 12px 25px ${FLEET_COLORS.focusRing}`,
    };

    useEffect(() => {
        // Check authentication state
        const userInfo = localStorage.getItem('userInfo');
        const token = localStorage.getItem('token');
        console.log('🔐 User Info from localStorage:', userInfo);
        console.log('🔑 Token from localStorage:', token);

        if (!token || !userInfo) {
            console.log('❌ User not authenticated - redirecting to login');
            showNotification('error', 'Please log in to access this page');
            // You might want to redirect to login page here
            return;
        }

        fetchInvoices();
        fetchOrders();
    }, []);

    const showNotification = (type: 'success' | 'error', message: string) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const getLocalUserInfo = () => {
        const userInfoString = localStorage.getItem('userInfo');
        if (!userInfoString) {
            return null;
        }
        try {
            return JSON.parse(userInfoString);
        } catch (error) {
            console.error('Error parsing userInfo from localStorage:', error);
            return null;
        }
    };

    // Invoice PDF in the client's layout (their Telerik "InvoiceBatch" sample): company header +
    // logo, Bill To box with invoice facts, Shipper / Consignee sections with commodity lines,
    // Charges table and Notes. Truck, trailer and driver details are not on a customer invoice.
    const buildInvoicePdf = async (invoice: Invoice): Promise<{ doc: jsPDF; fileBase: string }> => {
        type Party = { name?: string; address?: string; unit?: string; city?: string; province?: string; postalCode?: string; country?: string; contact?: string; phone?: string; primaryPhone?: string };
        type Stop = { shipper?: string; receiver?: string; address?: string; date?: string; contact?: string; dropOffNumber?: string };
        type OrderDetails = {
            orderNumber?: string; customerOrderNo?: string; tripNo?: string;
            pickupLocation?: { place?: string }; deliveryLocation?: { place?: string };
            pickupDate?: string; deliveryDate?: string; pickupRefNo?: string; deliveryRefNo?: string; dropOffNumber?: string;
            commodity?: string; noOfPackages?: number; noOfPackagesType?: string; weight?: number; weightUnit?: string;
            dimensions?: { length?: number; width?: number; height?: number }; equipment?: string[] | string;
            shipper?: Party; receiver?: Party; stops?: Stop[]; receiverStops?: Stop[];
            invoiceNotes?: string; customerAddress?: string; customerCity?: string; customerProvince?: string;
            customerPostalCode?: string; customerCountry?: string; customerPrimaryPhone?: string; payableEmail?: string;
        };
        const order = (invoice.orderId || {}) as unknown as OrderDetails;
        const company = typeof invoice.company === 'object' ? invoice.company : null;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();
        const M = 12;
        const CW = W - M * 2;
        const black: [number, number, number] = [0, 0, 0];
        const headerGray: [number, number, number] = [110, 110, 110];
        const lightGray: [number, number, number] = [225, 225, 225];
        const usDate = (v?: string | null) => {
            if (!v) return '';
            const d = new Date(v);
            if (Number.isNaN(d.getTime())) return String(v);
            return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`;
        };
        const money = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(2);
        const join = (...parts: Array<string | undefined>) => parts.map((p) => (p || '').trim()).filter(Boolean).join(', ');
        const cur = invoice.currency || 'CAD';
        const total = Number(invoice.amount) || 0;
        let y = M;

        // ── Header: company left, logo + "Invoice" right ──
        doc.setTextColor(...black);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text(company?.companyName || '', M, y + 5);
        doc.setFontSize(9);
        let hy = y + 11;
        // Street on the first line (bold), city / province / postal code on the next, like the sample
        const rawAddress = String(company?.address || '').trim();
        const addressLines = (rawAddress.includes('\n')
            ? rawAddress.split('\n')
            : rawAddress.includes(',') ? [rawAddress.slice(0, rawAddress.indexOf(',')), rawAddress.slice(rawAddress.indexOf(',') + 1)] : [rawAddress]
        ).map((s) => s.trim()).filter(Boolean);
        addressLines.forEach((line, i) => {
            doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
            doc.text(doc.splitTextToSize(line, 95), M, hy);
            hy += 4.6;
        });
        doc.setFont('helvetica', 'normal');
        if (company?.contactEmail) { doc.text(company.contactEmail, M, hy); hy += 4.6; }
        if (company?.contactPhone) { doc.text(`PH : ${company.contactPhone}`, M, hy); hy += 4.6; }

        const logoSrc = company?.logoUrl || DocLogo;
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = logoSrc;
            await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });
            if (img.width && img.height) {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                canvas.getContext('2d')?.drawImage(img, 0, 0);
                const logoW = 55;
                const logoH = Math.min(22, (img.height / img.width) * logoW);
                doc.addImage(canvas.toDataURL('image/png'), 'PNG', W - M - logoW, y, logoW, logoH);
            }
        } catch { /* logo is optional */ }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('Invoice', W - M, y + 33, { align: 'right' });
        y = Math.max(hy, y + 36) + 6;

        // ── Bill To + invoice facts box ──
        const boxTop = y;
        const half = CW / 2;
        const billLines = [
            invoice.clientCompany || invoice.clientName,
            ...(invoice.clientAddress || join(order.customerAddress, order.customerCity) ? doc.splitTextToSize(invoice.clientAddress || join(order.customerAddress), half - 8) : []),
            join(order.customerCity, order.customerProvince, order.customerPostalCode, order.customerCountry),
            `Tel: ${invoice.clientPhone || order.customerPrimaryPhone || ''}`,
            `Email: ${invoice.clientEmail || order.payableEmail || ''}`,
        ].filter((l, i) => i === 0 || l !== '');
        const facts: Array<[string, string]> = [
            ['Invoice #', order.orderNumber || invoice._id.slice(-8)],
            ['Invoice Date', usDate(invoice.invoiceDate)],
            ['Ship Date', usDate(order.pickupDate)],
            ['Delivery Date', usDate(order.deliveryDate)],
            ['Terms', invoice.paymentTerms || ''],
            ['Amount', `${money(total)} (${cur})`],
            ['Cust. Order #', order.customerOrderNo || ''],
            ['Order #', order.orderNumber || ''],
            ['Container #', ''],
            ['Scale Ticket #', ''],
        ];
        const rowH = 5;
        const boxH = Math.max(billLines.length * 4.6 + 12, facts.length * rowH + 6);
        doc.setDrawColor(150); doc.setLineWidth(0.3);
        doc.rect(M, boxTop, CW, boxH);
        doc.line(M + half, boxTop, M + half, boxTop + boxH);
        doc.setFontSize(9.5); doc.setFont('helvetica', 'bold');
        doc.text('Bill To', M + 3, boxTop + 5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        billLines.forEach((l, i) => doc.text(String(l || ''), M + 3, boxTop + 11 + i * 4.6));
        facts.forEach(([label, value], i) => {
            const fy = boxTop + 5 + i * rowH;
            doc.setFont('helvetica', 'bold'); doc.text(label, M + half + 6, fy);
            doc.text(':', M + half + 48, fy);
            doc.setFont('helvetica', 'normal'); doc.text(value, M + half + 52, fy);
        });
        y = boxTop + boxH + 5;

        // ── Shipper / Consignee sections ──
        const cols = [0, 0.27, 0.53, 0.66, 0.84].map((f) => M + f * CW); // name, address, date, contact, phone
        const cCols = [0, 0.23, 0.33, 0.48, 0.6, 0.73, 0.87].map((f) => M + f * CW); // commodity row
        const equipment = Array.isArray(order.equipment) ? order.equipment.join(', ') : (order.equipment || '');
        const dims = order.dimensions || {};
        const commodityRow = (ref: string) => [
            order.commodity || '', money(Number(order.noOfPackages) || 0), `${(Number(order.weight) || 0).toFixed(3)}${order.weight && order.weightUnit ? ` ${order.weightUnit}` : ''}`,
            `${money(Number(dims.length) || 0)}X${money(Number(dims.width) || 0)}X${money(Number(dims.height) || 0)}`, equipment, '', ref,
        ];
        const section = (title: string, party: Party | undefined, stop: Stop | undefined, fallbackPlace: string | undefined, date: string | undefined, refLabel: string, ref: string) => {
            const name = party?.name || stop?.shipper || stop?.receiver || '';
            const addr = join(party?.address || stop?.address || fallbackPlace, party?.city, party?.province, party?.postalCode, party?.country);
            const addrLines = doc.splitTextToSize(addr, cols[2] - cols[1] - 2);
            const nameLines = doc.splitTextToSize(name, cols[1] - cols[0] - 3);
            const bodyH = Math.max(addrLines.length, nameLines.length, 1) * 3.8 + 3;
            if (y + bodyH + 24 > H - M) { doc.addPage(); y = M; }
            // header bar
            doc.setFillColor(...lightGray); doc.rect(M, y, CW, 5, 'F');
            doc.setFillColor(...headerGray); doc.rect(M, y, cols[1] - M, 5, 'F');
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
            doc.setTextColor(255, 255, 255); doc.text(title, M + 1.5, y + 3.6);
            doc.setTextColor(...black);
            ['Address', 'Date', 'Contact Person', 'Phone'].forEach((h, i) => doc.text(h, cols[i + 1] + 1, y + 3.6));
            y += 5;
            doc.setFontSize(8);
            doc.text(nameLines, cols[0] + 1.5, y + bodyH / 2);
            doc.text(addrLines, cols[1] + 1, y + 3.5);
            doc.text(usDate(date || stop?.date), cols[2] + 1, y + 3.5);
            doc.text(party?.contact || stop?.contact || '', cols[3] + 1, y + 3.5);
            doc.text(party?.phone || party?.primaryPhone || '', cols[4] + 1, y + 3.5);
            y += bodyH;
            doc.text('Notes:', M + 1.5, y + 3); y += 4.5;
            // commodity header + row
            doc.setFillColor(...lightGray); doc.rect(M, y, CW, 4.6, 'F');
            doc.setFontSize(8);
            ['Commodity', 'PKG', 'Weight', 'LxBxH', 'Equipment', 'Rate Method', refLabel].forEach((h, i) => doc.text(h, cCols[i] + 1.5, y + 3.3));
            y += 4.6;
            doc.setFontSize(7.5);
            commodityRow(ref).forEach((v, i) => doc.text(doc.splitTextToSize(String(v), (cCols[i + 1] ?? M + CW) - cCols[i] - 2)[0] || '', cCols[i] + 1.5, y + 3.2));
            y += 4.6;
            doc.setDrawColor(170); doc.line(M, y, M + CW, y);
            y += 1;
        };
        section('Shipper', order.shipper, order.stops?.[0], order.pickupLocation?.place, order.pickupDate, 'Pickup#', order.pickupRefNo || '');
        section('Consignee', order.receiver, order.receiverStops?.[0], order.deliveryLocation?.place, order.deliveryDate, 'Delivery#', order.deliveryRefNo || order.dropOffNumber || order.receiverStops?.[0]?.dropOffNumber || '');

        // ── Charges ──
        y += 6;
        const charges: Array<[string, number]> = [];
        const lines = (invoice.serviceBreakdown || []).filter((s) => s && (s.amount || s.unitPrice));
        if (lines.length) {
            lines.forEach((s) => {
                const qty = Number(s.quantity ?? 1) || 1;
                charges.push([`${s.description || 'Freight Charge'} - (Flat)(${money(Number(s.unitPrice) || Number(s.amount) || 0)} * ${qty.toFixed(2)})`, Number(s.amount) || (Number(s.unitPrice) || 0) * qty]);
            });
        } else {
            const sub = Number(invoice.subtotal ?? invoice.amount) || 0;
            charges.push([`Freight Charge - (Flat)(${money(sub)} * 1.00)`, sub]);
        }
        const gst = Number(invoice.gst) || 0;
        const pst = Number(invoice.pst) || 0;
        if (gst) charges.push([`GST (${money(Number(invoice.gstRate) || 0)} %)`, gst]);
        if (pst) charges.push([`PST (${money(Number(invoice.pstRate) || 0)} %)`, pst]);
        if (!gst && !pst) charges.push(['Exempt (0.00 %)', 0]);
        const cX = M + CW * 0.45;
        const aX = M + CW * 0.86;
        const cRow = 5.2;
        if (y + (charges.length + 2) * cRow + 40 > H - M) { doc.addPage(); y = M; }
        doc.setDrawColor(120);
        doc.rect(cX, y, M + CW - cX, (charges.length + 2) * cRow);
        doc.line(aX, y, aX, y + (charges.length + 2) * cRow);
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text('Charges', cX + 2, y + 3.8);
        doc.text('Amount', M + CW - 1.5, y + 3.8, { align: 'right' });
        doc.line(cX, y + cRow, M + CW, y + cRow);
        charges.forEach(([label, amt], i) => {
            const ry = y + cRow * (i + 1);
            doc.text(doc.splitTextToSize(label, aX - cX - 3)[0], cX + 2, ry + 3.8);
            doc.text(money(amt), M + CW - 1.5, ry + 3.8, { align: 'right' });
            doc.line(cX, ry + cRow, M + CW, ry + cRow);
        });
        const ty = y + cRow * (charges.length + 1);
        doc.text(`Total (${cur})`, cX + 2, ty + 3.8);
        doc.text(money(total), M + CW - 1.5, ty + 3.8, { align: 'right' });
        y = ty + cRow + 8;

        // ── Notes (e.g. factoring Notice of Assignment) ──
        // The invoice's own notes; when it has none, the company's default (e.g. factoring notice)
        const ownNotes = [invoice.notes, order.invoiceNotes].map((n) => (n || '').trim()).filter(Boolean).join('\n\n');
        const notesText = ownNotes || (company?.invoiceNotes || defaultInvoiceNotes || '').trim();
        const noteLines = notesText ? doc.splitTextToSize(notesText, CW / 2 - 6) : [];
        const notesH = Math.max(30, noteLines.length * 4.2 + 12);
        if (y + notesH > H - M) { doc.addPage(); y = M; }
        doc.setDrawColor(150);
        doc.rect(M, y, CW, notesH);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
        doc.text('Notes:', M + 3, y + 6);
        doc.setLineWidth(0.2); doc.line(M + 3, y + 7, M + 15, y + 7);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        if (noteLines.length) doc.text(noteLines, M + 3, y + 12);

        return { doc, fileBase: `Invoice_${order.orderNumber || invoice._id.slice(-8)}` };
    };

    const handleDownloadPDF = async (invoice: Invoice) => {
        try {
            const { doc, fileBase } = await buildInvoicePdf(invoice);
            doc.save(`${fileBase}.pdf`);
        } catch (err) {
            console.error(err);
            showNotification('error', 'Could not create the invoice PDF');
        }
    };

    // Company default invoice notes (factoring Notice of Assignment etc.)
    const [defaultInvoiceNotes, setDefaultInvoiceNotes] = useState('');
    const [notesEditorOpen, setNotesEditorOpen] = useState(false);
    const [notesDraft, setNotesDraft] = useState('');
    const [notesSaving, setNotesSaving] = useState(false);
    useEffect(() => {
        getInvoiceSettings().then((r) => setDefaultInvoiceNotes(r.invoiceNotes));
    }, []);
    const saveDefaultNotes = async () => {
        setNotesSaving(true);
        const res = await updateInvoiceSettings(notesDraft);
        setNotesSaving(false);
        if (res.success) {
            setDefaultInvoiceNotes(notesDraft);
            setNotesEditorOpen(false);
            showNotification('success', 'Default invoice notes saved');
        } else {
            showNotification('error', res.message || 'Could not save');
        }
    };

    // Email the invoice + POD & Manifest packet to the customer
    const [emailBusyId, setEmailBusyId] = useState<string | null>(null);
    const handleEmailPacket = async (invoice: Invoice) => {
        const to = window.prompt('Send the invoice with POD & Manifest to:', invoice.clientEmail || '');
        if (to === null) return;
        if (!to.trim()) {
            showNotification('error', 'Enter an email address');
            return;
        }
        setEmailBusyId(invoice._id);
        try {
            const { doc } = await buildInvoicePdf(invoice);
            const res = await emailInvoicePacket(invoice._id, doc.output('blob'), to.trim());
            if (!res.success) {
                showNotification('error', res.message || 'Email could not be sent');
                return;
            }
            const notes = (res.notes || []).join(' ');
            showNotification(notes ? 'error' : 'success', notes ? `Sent, but: ${notes}` : res.message);
        } catch (err) {
            console.error(err);
            showNotification('error', 'Email could not be sent');
        } finally {
            setEmailBusyId(null);
        }
    };

    // Invoice + the trip's POD and border manifest in one PDF, for the customer / factor
    const [packetBusyId, setPacketBusyId] = useState<string | null>(null);
    const handleDownloadPacket = async (invoice: Invoice) => {
        setPacketBusyId(invoice._id);
        try {
            const { doc, fileBase } = await buildInvoicePdf(invoice);
            const res = await downloadInvoicePacket(invoice._id, doc.output('blob'));
            if (!res.ok) {
                showNotification('error', res.message || 'Could not build the invoice packet');
                return;
            }
            const url = URL.createObjectURL(res.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileBase}_with_POD_Manifest.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            if (res.missing) showNotification('error', `Packet downloaded, but: ${res.missing}`);
            else showNotification('success', 'Invoice with POD & Manifest downloaded');
        } catch (err) {
            console.error(err);
            showNotification('error', 'Could not build the invoice packet');
        } finally {
            setPacketBusyId(null);
        }
    };




    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const userInfo: any = getLocalUserInfo();

            // Handle different userInfo structures (userData.company or direct company)
            const userRole = userInfo?.role || userInfo?.userData?.role;
            const userCompany = userInfo?.company || userInfo?.userData?.company;
            const isSuperadmin = userRole === 'superadmin';
            const isHR = userRole === 'hr';
            const hasCompany = Boolean(userCompany);

            // Allow HR and dispatchers to call API even if company is not visible in localStorage
            // The backend will handle company filtering based on the authenticated user
            if (!isSuperadmin && !isHR && !hasCompany) {
                setEmptyStateMessage(null);
                setInvoices([]);
                return;
            }

            const response = await listInvoices();
            const message = (response as any)?.message;

            if (response && response.success && Array.isArray(response.data)) {
                setInvoices(response.data);
                if (message && response.data.length === 0) {
                    setEmptyStateMessage(message);
                } else {
                    setEmptyStateMessage(null);
                }
            } else {
                setInvoices([]);
                setEmptyStateMessage(message || 'Failed to fetch invoices.');
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
            setInvoices([]);
            setEmptyStateMessage('Failed to fetch invoices.');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        try {
            const userInfo: any = getLocalUserInfo();

            // Handle different userInfo structures (userData.company or direct company)
            const userRole = userInfo?.role || userInfo?.userData?.role;
            const userCompany = userInfo?.company || userInfo?.userData?.company;
            const isSuperadmin = userRole === 'superadmin';
            const isHR = userRole === 'hr';
            const hasCompany = Boolean(userCompany);

            // Allow HR and dispatchers to call API even if company is not visible in localStorage
            // The backend will handle company filtering based on the authenticated user
            if (!isSuperadmin && !isHR && !hasCompany) {
                setOrders([]);
                return;
            }

            console.log('🔍 Starting to fetch orders...');
            const response = await listTrips();
            console.log('📡 Order API Response:', response);
            console.log('📡 Response type:', typeof response);
            console.log('📡 Response keys:', response ? Object.keys(response) : 'null');

            // Handle different response structures
            let orderData = null;
            if (response && response.data) {
                orderData = response.data;
                console.log('✅ Found data in response.data:', orderData);
            } else if (response && Array.isArray(response)) {
                orderData = response;
                console.log('✅ Response is array:', orderData);
            } else if (response && response.success && response.data) {
                orderData = response.data;
                console.log('✅ Found data in response.success.data:', orderData);
            } else {
                console.log('❌ No data found in response structure');
            }

            if (orderData && Array.isArray(orderData)) {
                console.log('✅ Setting orders with data:', orderData);
                console.log('✅ Number of orders:', orderData.length);
                setOrders(orderData);
            } else {
                console.log('❌ No valid order data found in response:', response);
                setOrders([]);
            }
        } catch (error) {
            console.error('❌ Error fetching orders:', error);
            console.error('❌ Error details:', error);
            setOrders([]);
        }
    };

    const filteredInvoices = statusFilter === 'all'
        ? invoices
        : invoices.filter(invoice => invoice.status === statusFilter);

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusColor = (status: string): string => {
        switch (status.toLowerCase()) {
            case 'paid':
                return 'text-green-400 bg-green-400/10 border border-green-400/20';

            case 'pending':
                return 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20';

            case 'overdue':
                return 'text-red-400 bg-red-400/10 border border-red-400/20';

            case 'draft':
                return 'text-gray-400 bg-gray-400/10 border border-gray-400/20';

            case 'cancelled':
                return 'text-purple-400 bg-purple-400/10 border border-purple-400/20';

            default:
                return 'text-secondary bg-[rgba(15,31,23,0.05)] border border-[rgba(15,31,23,0.08)]';
        }
    };

    const calculateStats = () => {
        const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount), 0);
        const pendingAmount = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + Number(inv.amount), 0);
        const paidCount = invoices.filter(inv => inv.status === 'paid').length;
        const pendingCount = invoices.filter(inv => inv.status === 'pending').length;

        return { totalAmount, paidAmount, pendingAmount, paidCount, pendingCount };
    };

    const stats = calculateStats();

    const NotificationContainer: React.FC = () => (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-card border border-red-200'
                        }`}
                >
                    {notification.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                        <AlertCircle className="h-5 w-5 text-[#A855F7]" />
                    )}
                    <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                        {notification.message}
                    </p>
                    <button
                        onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                        className="ml-2"
                    >
                        <X className={`h-4 w-4 ${notification.type === 'success' ? 'text-green-600' : 'text-[#A855F7]'}`} />
                    </button>
                </div>
            ))}
        </div>
    );

    const DeleteConfirmationModal: React.FC = () => {
        if (!deleteModal.show) return null;

        const handleConfirmDelete = async () => {
            if (!deleteModal.invoiceId) return;

            try {
                await deleteInvoice(deleteModal.invoiceId);
                showNotification('success', 'Invoice deleted successfully');
                fetchInvoices();
            } catch (error) {
                showNotification('error', 'Failed to delete invoice');
            } finally {
                setDeleteModal({ show: false, invoiceId: null });
            }
        };

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40  ">
                <div className="bg-[#ffffff] rounded-xl shadow-2xl border border-[rgba(5,150,105,0.1)] max-w-md w-full mx-4">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                                <Trash2 className="h-5 w-5 text-rose-400" />
                            </div>
                            <h3 className="text-base font-semibold text-[#0f1f17]">Delete Invoice</h3>
                        </div>
                        <p className="text-[#5a7066] text-sm mb-6">
                            Are you sure you want to delete this invoice? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteModal({ show: false, invoiceId: null })}
                                className="px-4 py-2 text-[#5a7066] bg-[rgba(15,31,23,0.05)] border border-[rgba(15,31,23,0.08)] rounded-lg hover:bg-[rgba(15,31,23,0.08)] transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 text-white bg-rose-500/80 border border-rose-500/30 rounded-lg hover:bg-rose-500 transition-colors text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const DashboardOverview: React.FC = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Revenue */}
            <div className="bg-[#ffffff] rounded-xl p-5 border border-[rgba(5,150,105,0.12)] shadow-[0_0_20px_rgba(5,150,105,0.05)] hover:border-[rgba(5,150,105,0.25)] transition-all">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-[var(--accent-blue)] uppercase tracking-wider">Total Revenue</p>
                    <div className="p-2 rounded-lg bg-[#059669]/10 shadow-[0_0_12px_rgba(5,150,105,0.2)]">
                        <DollarSign className="h-4 w-4 text-[#059669]" />
                    </div>
                </div>
                <p className="text-2xl font-bold text-[#0f1f17]">{formatCurrency(stats.totalAmount)}</p>
                <p className="text-xs text-[#5a7066] mt-1">{invoices.length} invoices total</p>
            </div>

            {/* Paid */}
            <div className="bg-[#ffffff] rounded-xl p-5 border border-[rgba(5,150,105,0.12)] shadow-[0_0_20px_rgba(5,150,105,0.05)] hover:border-[rgba(5,150,105,0.25)] transition-all">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-[var(--accent-green)] uppercase tracking-wider">Paid</p>
                    <div className="p-2 rounded-lg bg-[#059669]/10 shadow-[0_0_12px_rgba(5,150,105,0.2)]">
                        <TrendingUp className="h-4 w-4 text-[#059669]" />
                    </div>
                </div>
                <p className="text-2xl font-bold text-[#0f1f17]">{formatCurrency(stats.paidAmount)}</p>
                <p className="text-xs text-[#5a7066] mt-1">{stats.paidCount} invoices paid</p>
            </div>

            {/* Pending */}
            <div className="bg-[#ffffff] rounded-xl p-5 border border-[rgba(245,158,11,0.12)] shadow-[0_0_20px_rgba(245,158,11,0.05)] hover:border-[rgba(245,158,11,0.25)] transition-all">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-[var(--accent-orange)] uppercase tracking-wider">Pending</p>
                    <div className="p-2 rounded-lg bg-[#F59E0B]/10 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                        <Calendar className="h-4 w-4 text-[#d97706]" />
                    </div>
                </div>
                <p className="text-2xl font-bold text-[#0f1f17]">{formatCurrency(stats.pendingAmount)}</p>
                <p className="text-xs text-[#5a7066] mt-1">{stats.pendingCount} invoices pending</p>
            </div>

            {/* Collection Rate */}
            <div className="bg-[#ffffff] rounded-xl p-5 border border-[rgba(168,85,247,0.12)] shadow-[0_0_20px_rgba(168,85,247,0.05)] hover:border-[rgba(168,85,247,0.25)] transition-all">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-[var(--accent-purple)] uppercase tracking-wider">Collection Rate</p>
                    <div className="p-2 rounded-lg bg-[#A855F7]/10 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                        <Users className="h-4 w-4 text-[#A855F7]" />
                    </div>
                </div>
                <p className="text-2xl font-bold text-[#0f1f17]">
                    {stats.totalAmount > 0 ? ((stats.paidAmount / stats.totalAmount) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-[#5a7066] mt-1">Payment efficiency</p>
            </div>
        </div>
    );

    const InvoiceList: React.FC = () => (
        <div className="bg-card rounded-lg" >
            <div className="p-6 border-b border-theme">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold text-primary mb-4 sm:mb-0">Invoice List</h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-secondary" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                className="bg-[#f2f7f4] border border-[rgba(5,150,105,0.15)] text-[#0f1f17] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[rgba(5,150,105,0.3)] transition-colors"
                            >
                                <option value="all">All Status</option>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                {loading ? (
                    <div className="p-8 text-center text-secondary">Loading invoices...</div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="p-8 text-center text-secondary">No invoices found</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-card">
                            <tr>
                                <th className="text-left py-3 px-6 font-medium text-headings">Invoice ID</th>
                                <th className="text-left py-3 px-6 font-medium text-headings">Client</th>
                                <th className="text-left py-3 px-6 font-medium text-headings">Trip Details</th>
                                <th className="text-left py-3 px-6 font-medium text-headings">Amount</th>
                                <th className="text-left py-3 px-6 font-medium text-headings">Due Date</th>
                                <th className="text-left py-3 px-6 font-medium text-headings">Status</th>
                                <th className="text-left py-3 px-6 font-medium text-headings">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme divide-black/5">
                            {filteredInvoices.map((invoice) => {
                                // Extract trip number from notes if tripId is null
                                const extractTripNumberFromNotes = (notes: string): string | null => {
                                    if (!notes) return null;
                                    const match = notes.match(/trip\s+([A-Z0-9]+)/i);
                                    return match ? match[1] : null;
                                };

                                const trip = typeof invoice.tripId === 'object' && invoice.tripId ? invoice.tripId : null;
                                const order = invoice.orderId;
                                const tripNumberFromNotes = !trip && invoice.notes ? extractTripNumberFromNotes(invoice.notes) : null;
                                const displayId = trip?.tripNumber || order?.orderNumber || tripNumberFromNotes || (typeof invoice.tripId === 'string' ? invoice.tripId.slice(-8) : null);
                                const startLocation = trip?.startLocation?.place || trip?.orders?.[0]?.pickupLocation?.place || order?.pickupLocation?.place || 'N/A';
                                const endLocation = trip?.endLocation?.place || trip?.orders?.[trip?.orders?.length - 1]?.deliveryLocation?.place || order?.deliveryLocation?.place || 'N/A';
                                const ordersCount = trip?.orders?.length || (order ? 1 : 0);

                                return (
                                    <tr
                                        key={invoice._id}
                                        className="hover:bg-[rgba(15,31,23,0.03)] cursor-pointer transition-colors"
                                        onClick={() => {
                                            setSelectedInvoice(invoice);
                                            setActiveTab('view');
                                        }}
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center">
                                                <FileText className="h-4 w-4 text-secondary mr-2" />
                                                <span className="font-mono text-sm">{invoice._id.slice(-8)}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div>
                                                <div className="font-medium text-secondary">{invoice.clientName}</div>
                                                <div className="text-sm text-secondary">{invoice.clientEmail}</div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            {trip ? (
                                                <div className="space-y-1">
                                                    {trip?.tripNumber && (
                                                        <div className="font-medium text-secondary text-sm">
                                                            {trip?.tripNumber}
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-secondary">
                                                        {startLocation} → {endLocation}
                                                    </div>
                                                    {ordersCount > 0 && (
                                                        <div className="text-xs text-secondary">
                                                            {ordersCount} {ordersCount === 1 ? 'order' : 'orders'}
                                                        </div>
                                                    )}
                                                    {trip.truck && (
                                                        <div className="text-xs text-secondary">
                                                            Truck: {trip.truck.plateNumber || trip.truck.licensePlate || trip.truck.unitNumber || trip.truck.internalId || 'N/A'}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : displayId ? (
                                                <div className="space-y-1">
                                                    <div className="font-medium text-secondary text-sm">
                                                        {displayId}
                                                    </div>
                                                    <div className="text-xs text-secondary">
                                                        {startLocation} → {endLocation}
                                                    </div>
                                                    {order && (
                                                        <div className="text-xs text-secondary">
                                                            Order Invoice
                                                        </div>
                                                    )}
                                                    {invoice.notes && invoice.notes.includes('Auto-generated') && (
                                                        <div className="text-xs text-secondary">
                                                            Auto-generated
                                                        </div>
                                                    )}
                                                </div>
                                            ) : invoice.tripId ? (
                                                <div className="text-sm text-secondary">
                                                    Trip: {typeof invoice.tripId === 'string' ? invoice.tripId.slice(-8) : 'N/A'}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-secondary">-</div>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="font-medium text-secondary">{formatCurrency(Number(invoice.amount))}</span>
                                            {!(Number(invoice.amount) > 0) && (
                                                <span className="block text-[10px] text-yellow-500" title="The order has no rate. Set the rate on the order (the invoice updates) or edit this invoice.">No rate on order</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-sm text-secondary">
                                            {formatDate(invoice.dueDate)}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedInvoice(invoice);
                                                        setActiveTab('view');
                                                    }}
                                                    className="text-[#059669] hover:text-blue-800 transition-colors"
                                                    title="View Invoice"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownloadPDF(invoice);
                                                    }}
                                                    className="p-2 text-primary hover:text-[#059669] hover:bg-[rgba(5,150,105,0.08)] rounded-lg transition-all"
                                                    title="Download PDF"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownloadPacket(invoice);
                                                    }}
                                                    disabled={packetBusyId === invoice._id}
                                                    className="p-2 text-primary hover:text-[#059669] hover:bg-[rgba(5,150,105,0.08)] rounded-lg transition-all disabled:opacity-50"
                                                    title="Invoice + POD & Manifest (one PDF)"
                                                >
                                                    <Paperclip className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEmailPacket(invoice);
                                                    }}
                                                    disabled={emailBusyId === invoice._id}
                                                    className="p-2 text-primary hover:text-[#059669] hover:bg-[rgba(5,150,105,0.08)] rounded-lg transition-all disabled:opacity-50"
                                                    title="Email invoice with POD & Manifest"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedInvoice(invoice);
                                                        setActiveTab('edit');
                                                    }}
                                                    className="text-secondary hover:text-primary transition-colors"
                                                    title="Edit Invoice"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteModal({ show: true, invoiceId: invoice._id })}
                                                    className="text-[#A855F7] hover:text-red-800 transition-colors"
                                                    title="Delete Invoice"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );

    const InvoiceView: React.FC = () => {
        if (!selectedInvoice) return null;

        const company = typeof selectedInvoice.company === "object" && selectedInvoice.company
            ? selectedInvoice.company
            : null;

        const subtotal = Number(selectedInvoice.subtotal || selectedInvoice.amount);
        const gstRate = selectedInvoice.gstRate || 0;
        const pstRate = selectedInvoice.pstRate || 0;
        const gstAmount = selectedInvoice.gst || (subtotal * (gstRate / 100));
        const pstAmount = selectedInvoice.pst || (subtotal * (pstRate / 100));
        const totalAmount = Number(selectedInvoice.amount);

        // Get trip/order details for description
        const trip = typeof selectedInvoice.tripId === 'object' && selectedInvoice.tripId ? selectedInvoice.tripId : null;
        const order = selectedInvoice.orderId;
        // Type guard to check if order is a full Order object
        const isFullOrder = (o: any): o is Order => {
            return o && typeof o === 'object' && '_id' in o;
        };
        const tripNumber = trip?.tripNumber || order?.orderNumber || null;
        const description = tripNumber
            ? `Freight Charges - Order #${tripNumber}`
            : selectedInvoice.serviceBreakdown?.[0]?.description || 'Freight Service';


        return (
            <div className="bg-card rounded-lg">
                <div className="p-6 border-b border-theme">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-primary">Invoice Preview</h2>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleDownloadPDF(selectedInvoice)}
                                className="px-5 py-2.5 bg-[var(--accent-navyblue)] !text-white rounded-md hover:from-gray-800 hover:to-gray-900 transition-all flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 duration-200 font-medium"
                            >
                                <Download className="h-4 w-4" />
                                Download PDF
                            </button>
                            <button
                                onClick={() => handleDownloadPacket(selectedInvoice)}
                                disabled={packetBusyId === selectedInvoice._id}
                                className="px-5 py-2.5 border border-theme text-primary rounded-md hover:bg-[rgba(5,150,105,0.08)] transition-all flex items-center gap-2 font-medium disabled:opacity-50"
                                title="The invoice followed by the driver's POD and border manifest, in one PDF"
                            >
                                <Paperclip className="h-4 w-4" />
                                {packetBusyId === selectedInvoice._id ? 'Preparing...' : 'Invoice + POD & Manifest'}
                            </button>
                            <button
                                onClick={() => handleEmailPacket(selectedInvoice)}
                                disabled={emailBusyId === selectedInvoice._id}
                                className="px-5 py-2.5 border border-theme text-primary rounded-md hover:bg-[rgba(5,150,105,0.08)] transition-all flex items-center gap-2 font-medium disabled:opacity-50"
                                title="Email the invoice with the POD and border manifest attached"
                            >
                                <Mail className="h-4 w-4" />
                                {emailBusyId === selectedInvoice._id ? 'Sending...' : 'Email with POD & Manifest'}
                            </button>
                            <button
                                onClick={() => setActiveTab('list')}
                                className="text-[#5a7066] bg-[var(--accent-navyblue)] hover:text-[#059669] transition-colors px-3 py-2 hover:bg-[rgba(5,150,105,0.08)] rounded-lg text-sm"
                            >
                                ← Back to List
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-[#f2f7f4]">
                    {/* Invoice Document Preview */}
                    <div className="max-w-4xl mx-auto bg-card shadow-2xl rounded-sm overflow-hidden border border-theme">
                        {/* Header - White Background with Logo and Title */}
                        <div className="bg-card px-10 py-6 border-b-2 border-theme flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {company?.logoUrl && (
                                    <img
                                        src={company.logoUrl}
                                        alt="Company Logo"
                                        className="h-16 w-auto object-contain max-w-[200px]"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                )}
                            </div>
                            <h1 className="text-5xl font-bold text-primary tracking-wider uppercase" style={{ letterSpacing: '0.1em' }}>INVOICE</h1>
                        </div>

                        {/* Body */}
                        <div className="px-10 py-8">
                            {/* Company Details (Left) & Bill To (Right) */}
                            <div className="grid grid-cols-2 gap-12 mb-8">
                                {/* Left Column - Company Details */}
                                {company && (
                                    <div className="space-y-1.5">
                                        <h3 className="font-bold text-primary text-base leading-tight mb-3">{company.companyName || 'Company Name'}</h3>
                                        {company.address && (
                                            <p className="text-sm text-primary leading-relaxed">{company.address}</p>
                                        )}
                                        {company.contactPhone && (
                                            <p className="text-sm text-primary">Phone: {company.contactPhone}</p>
                                        )}
                                        {company.contactEmail && (
                                            <p className="text-sm text-primary">Email: {company.contactEmail}</p>
                                        )}
                                        {company.taxNumber && (
                                            <p className="text-sm text-primary">GST No: {company.taxNumber}</p>
                                        )}
                                    </div>
                                )}

                                {/* Right Column - Bill To Section */}
                                <div>
                                    <h3 className="font-bold text-primary mb-3 text-base">Bill To:</h3>
                                    <div className="space-y-1.5">
                                        <p className="text-sm font-semibold text-primary">{selectedInvoice.clientName}</p>
                                        {selectedInvoice.clientAddress && (
                                            <p className="text-sm text-primary leading-relaxed">{selectedInvoice.clientAddress}</p>
                                        )}
                                        {selectedInvoice.clientEmail && (
                                            <p className="text-sm text-primary">{selectedInvoice.clientEmail}</p>
                                        )}
                                        {selectedInvoice.clientPhone && (
                                            <p className="text-sm text-primary">Phone: {selectedInvoice.clientPhone}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Load/Trip Details Section */}
                            {(trip || order) && (
                                <div className="mt-8 p-5 border border-theme">
                                    <h3 className="font-bold text-primary mb-4 text-base">Load Details:</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Trip/Order Number */}
                                        {(trip?.tripNumber || order?.orderNumber) && (
                                            <div>
                                                <p className="text-xs text-secondary mb-1">Trip/Order Number</p>
                                                <p className="text-sm font-semibold text-primary">
                                                    {trip?.tripNumber || order?.orderNumber}
                                                </p>
                                            </div>
                                        )}

                                        {/* Customer Order Number */}
                                        {order?.customerOrderNo && (
                                            <div>
                                                <p className="text-xs text-secondary mb-1">Customer PO Number</p>
                                                <p className="text-sm font-semibold text-primary">{order.customerOrderNo}</p>
                                            </div>
                                        )}

                                        {/* Pickup Location */}
                                        {(trip?.startLocation?.place || trip?.orders?.[0]?.pickupLocation?.place || order?.pickupLocation?.place) && (
                                            <div>
                                                <p className="text-xs text-secondary mb-1">Pickup Location</p>
                                                <p className="text-sm text-primary">
                                                    {trip?.startLocation?.place || trip?.orders?.[0]?.pickupLocation?.place || order?.pickupLocation?.place}
                                                </p>
                                            </div>
                                        )}

                                        {/* Dropoff Location */}
                                        {(trip?.endLocation?.place || trip?.orders?.[trip?.orders?.length - 1]?.deliveryLocation?.place || order?.deliveryLocation?.place) && (
                                            <div>
                                                <p className="text-xs text-secondary mb-1">Dropoff Location</p>
                                                <p className="text-sm text-primary">
                                                    {trip?.endLocation?.place || trip?.orders?.[trip?.orders?.length - 1]?.deliveryLocation?.place || order?.deliveryLocation?.place}
                                                </p>
                                            </div>
                                        )}

                                    </div>

                                    {/* Truck Details Section */}
                                    {(() => {
                                        // Check multiple sources for truck data
                                        let truckInfo = trip?.truck;
                                        if (!truckInfo && isFullOrder(order) && order.truck) {
                                            truckInfo = order.truck;
                                        }
                                        // Also check trip's orders for truck data
                                        if (!truckInfo && trip?.orders && trip.orders.length > 0) {
                                            truckInfo = trip.orders[0]?.truck;
                                        }
                                        // Show section if truck object exists (even if empty)
                                        return truckInfo ? (
                                            <div className="mt-6 pt-6 border-t border-theme">
                                                <h4 className="font-semibold text-primary mb-4 text-sm uppercase tracking-wide">
                                                    Truck Details
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    <div>
                                                        <p className="text-xs text-secondary mb-1">Unit/Plate Number</p>
                                                        <p className="text-sm font-semibold text-primary">
                                                            {truckInfo.plateNumber || truckInfo.licensePlate || truckInfo.unitNumber || truckInfo.internalId || (truckInfo._id ? truckInfo._id.slice(-8) : 'N/A')}
                                                        </p>
                                                    </div>
                                                    {truckInfo.make && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">Make</p>
                                                            <p className="text-sm text-primary">{truckInfo.make}</p>
                                                        </div>
                                                    )}
                                                    {truckInfo.model && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">Model</p>
                                                            <p className="text-sm text-primary">{truckInfo.model}</p>
                                                        </div>
                                                    )}
                                                    {truckInfo.makeModel && !truckInfo.make && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">Make/Model</p>
                                                            <p className="text-sm text-primary">{truckInfo.makeModel}</p>
                                                        </div>
                                                    )}
                                                    {(truckInfo.type || truckInfo.unitType) && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">Type</p>
                                                            <p className="text-sm text-primary">{truckInfo.type || truckInfo.unitType}</p>
                                                        </div>
                                                    )}
                                                    {truckInfo.year && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">Year</p>
                                                            <p className="text-sm text-primary">{truckInfo.year}</p>
                                                        </div>
                                                    )}
                                                    {truckInfo.vin && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">VIN</p>
                                                            <p className="text-sm text-primary font-mono">{truckInfo.vin}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}

                                    {/* Trailer Details Section */}
                                    {(() => {
                                        // Check multiple sources for trailer data
                                        let trailerInfo = trip?.trailer;
                                        if (!trailerInfo && isFullOrder(order) && order.trailer) {
                                            trailerInfo = order.trailer;
                                        }
                                        // Also check trip's orders for trailer data
                                        if (!trailerInfo && trip?.orders && trip.orders.length > 0) {
                                            trailerInfo = trip.orders[0]?.trailer;
                                        }
                                        // Show section if trailer object exists (even if empty)
                                        return trailerInfo ? (
                                            <div className="mt-6 pt-6 border-t border-theme">
                                                <h4 className="font-semibold text-primary mb-4 text-sm uppercase tracking-wide">
                                                    Trailer Details
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    <div>
                                                        <p className="text-xs text-secondary mb-1">Unit/Plate Number</p>
                                                        <p className="text-sm font-semibold text-primary">
                                                            {trailerInfo.plateNumber || trailerInfo.licensePlate || trailerInfo.unitNumber || trailerInfo.internalId || (trailerInfo._id ? trailerInfo._id.slice(-8) : 'N/A')}
                                                        </p>
                                                    </div>
                                                    {trailerInfo.make && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">Make</p>
                                                            <p className="text-sm text-primary">{trailerInfo.make}</p>
                                                        </div>
                                                    )}
                                                    {trailerInfo.model && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">Model</p>
                                                            <p className="text-sm text-primary">{trailerInfo.model}</p>
                                                        </div>
                                                    )}
                                                    {trailerInfo.makeModel && !trailerInfo.make && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">Make/Model</p>
                                                            <p className="text-sm text-primary">{trailerInfo.makeModel}</p>
                                                        </div>
                                                    )}
                                                    {trailerInfo.type && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">Type</p>
                                                            <p className="text-sm text-primary">{trailerInfo.type}</p>
                                                        </div>
                                                    )}
                                                    {trailerInfo.capacity && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">Capacity</p>
                                                            <p className="text-sm text-primary">{trailerInfo.capacity}</p>
                                                        </div>
                                                    )}
                                                    {trailerInfo.year && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">Year</p>
                                                            <p className="text-sm text-primary">{trailerInfo.year}</p>
                                                        </div>
                                                    )}
                                                    {trailerInfo.vin && (
                                                        <div>
                                                            <p className="text-xs text-secondary mb-1">VIN</p>
                                                            <p className="text-sm text-primary font-mono">{trailerInfo.vin}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}

                                    {/* Driver & Co-Driver Section */}
                                    {(() => {
                                        // Check multiple sources for driver data
                                        let driverInfo = trip?.driver;
                                        let coDriverInfo = trip?.coDriver;

                                        if (!driverInfo && isFullOrder(order) && order.driver) {
                                            driverInfo = order.driver;
                                        }
                                        if (!coDriverInfo && isFullOrder(order) && order.coDriver) {
                                            coDriverInfo = order.coDriver;
                                        }

                                        // Also check trip's orders for driver data
                                        if ((!driverInfo || !coDriverInfo) && trip?.orders && trip.orders.length > 0) {
                                            if (!driverInfo) driverInfo = trip.orders[0]?.driver;
                                            if (!coDriverInfo) coDriverInfo = trip.orders[0]?.coDriver;
                                        }

                                        // Show section if driver or coDriver exists
                                        return (driverInfo || coDriverInfo) ? (
                                            <div className="mt-6 pt-6 border-t border-theme">
                                                <h4 className="font-semibold text-primary mb-4 text-sm uppercase tracking-wide">
                                                    Driver Information
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Driver */}
                                                    {driverInfo && (
                                                        <div className="bg-card rounded-md p-4 border border-theme">
                                                            <p className="text-xs text-secondary mb-3 font-semibold uppercase">Driver</p>
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <p className="text-xs text-secondary mb-1">Name</p>
                                                                    <p className="text-sm font-semibold text-primary">
                                                                        {typeof driverInfo === 'object' ? (driverInfo?.name || 'N/A') : (driverInfo || 'N/A')}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-secondary mb-1">Driver ID</p>
                                                                    <p className="text-sm text-primary font-mono">
                                                                        {(() => {
                                                                            if (typeof driverInfo === 'string') {
                                                                                return driverInfo.slice(-8) || 'N/A';
                                                                            }
                                                                            const driverId = driverInfo?._id;
                                                                            const driverInternalId = driverInfo?.internalId;
                                                                            return driverId ? driverId.slice(-8) : (driverInternalId || 'N/A');
                                                                        })()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Co-Driver */}
                                                    {coDriverInfo && (
                                                        <div className="bg-card rounded-md p-4 border border-theme">
                                                            <p className="text-xs text-secondary mb-3 font-semibold uppercase">Co-Driver</p>
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <p className="text-xs text-secondary mb-1">Name</p>
                                                                    <p className="text-sm font-semibold text-primary">
                                                                        {coDriverInfo.name || 'N/A'}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-secondary mb-1">Driver ID</p>
                                                                    <p className="text-sm text-primary font-mono">
                                                                        {(() => {
                                                                            const coDriverId = coDriverInfo._id;
                                                                            const coDriverInternalId = (coDriverInfo as any)?.internalId;
                                                                            return coDriverId ? coDriverId.slice(-8) : (coDriverInternalId || 'N/A');
                                                                        })()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}

                                    {/* Additional Trip Information */}
                                    {(trip?.route?.totalDistance || trip?.plannedStartDate || trip?.actualStartDate) && (
                                        <div className="mt-6 pt-6 border-t border-gray-300">
                                            <h4 className="font-semibold text-primary mb-4 text-sm uppercase tracking-wide">
                                                Trip Information
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {trip?.route?.totalDistance && (
                                                    <div>
                                                        <p className="text-xs text-secondary mb-1">Total Distance</p>
                                                        <p className="text-sm text-primary">
                                                            {trip.route.totalDistance.toFixed(2)} km ({(trip.route.totalDistance * 0.621371).toFixed(2)} miles)
                                                        </p>
                                                    </div>
                                                )}
                                                {trip?.plannedStartDate && (
                                                    <div>
                                                        <p className="text-xs text-secondary mb-1">Planned Start Date</p>
                                                        <p className="text-sm text-primary">{formatDate(trip.plannedStartDate)}</p>
                                                    </div>
                                                )}
                                                {trip?.actualStartDate && (
                                                    <div>
                                                        <p className="text-xs text-secondary mb-1">Actual Start Date</p>
                                                        <p className="text-sm text-primary">{formatDate(trip.actualStartDate)}</p>
                                                    </div>
                                                )}
                                                {trip?.plannedEndDate && (
                                                    <div>
                                                        <p className="text-xs text-secondary mb-1">Planned End Date</p>
                                                        <p className="text-sm text-primary">{formatDate(trip.plannedEndDate)}</p>
                                                    </div>
                                                )}
                                                {trip?.actualEndDate && (
                                                    <div>
                                                        <p className="text-xs text-secondary mb-1">Actual End Date</p>
                                                        <p className="text-sm text-primary">{formatDate(trip.actualEndDate)}</p>
                                                    </div>
                                                )}
                                                {trip?.status && (
                                                    <div>
                                                        <p className="text-xs text-secondary mb-1">Trip Status</p>
                                                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            trip.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-blue-100 text-blue-800'
                                                            }`}>
                                                            {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Invoice Details Table */}
                            <div className="mt-10">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-theme">
                                            <th className="text-left py-4 px-5 font-bold text-primary text-sm uppercase tracking-wide">Description</th>
                                            <th className="text-center py-4 px-5 font-bold text-primary text-sm uppercase tracking-wide">Qty</th>
                                            <th className="text-right py-4 px-5 font-bold text-primary text-sm uppercase tracking-wide">Unit Price</th>
                                            <th className="text-right py-4 px-5 font-bold text-primary text-sm uppercase tracking-wide">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedInvoice.serviceBreakdown && selectedInvoice.serviceBreakdown.length > 0 ? (
                                            selectedInvoice.serviceBreakdown.map((item, index) => (
                                                <tr key={index} className="border-b border-theme hover:bg-[rgba(15,31,23,0.03)] transition-colors">
                                                    <td className="py-4 px-5 text-sm text-primary">{item.description || 'Service'}</td>
                                                    <td className="py-4 px-5 text-sm text-primary text-center">{item.quantity || 1}</td>
                                                    <td className="py-4 px-5 text-sm text-primary text-right font-mono">
                                                        {selectedInvoice.currency} {item.unitPrice.toFixed(2)}
                                                    </td>
                                                    <td className="py-4 px-5 text-sm text-primary text-right font-semibold font-mono">
                                                        {selectedInvoice.currency} {(item.amount || item.unitPrice * (item.quantity || 1)).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr className="border-b border-theme hover:bg-[rgba(15,31,23,0.03)] transition-colors">
                                                <td className="py-4 px-5 text-sm text-primary">{description}</td>
                                                <td className="py-4 px-5 text-sm text-primary text-center">1</td>
                                                <td className="py-4 px-5 text-sm text-primary text-right font-mono">
                                                    {selectedInvoice.currency} {subtotal.toFixed(2)}
                                                </td>
                                                <td className="py-4 px-5 text-sm text-primary text-right font-semibold font-mono">
                                                    {selectedInvoice.currency} {subtotal.toFixed(2)}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals Section */}
                            <div className="mt-8 flex justify-end">
                                <div className="w-72 space-y-3">
                                    <div className="flex justify-between text-sm py-1">
                                        <span className="font-semibold text-primary">Subtotal:</span>
                                        <span className="text-primary font-mono">{selectedInvoice.currency} {subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm py-1">
                                        <span className="font-semibold text-primary">GST ({gstRate > 0 ? `${gstRate}%` : '0%'}):</span>
                                        <span className="text-primary font-mono">{selectedInvoice.currency} {gstAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm py-1">
                                        <span className="font-semibold text-primary">PST ({pstRate > 0 ? `${pstRate}%` : '0%'}):</span>
                                        <span className="text-primary font-mono">{selectedInvoice.currency} {pstAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Total Amount Box */}
                            <div className="mt-6 border-2 border-gray-900 rounded-sm p-5 bg-card">
                                <div className="flex justify-between items-center">
                                    <span className="text-primary font-bold text-lg uppercase tracking-wide">Total Amount Due</span>
                                    <span className="text-primary font-bold text-2xl font-mono">
                                        {selectedInvoice.currency} {totalAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* GST Details Section */}
                            {company && (company.taxNumber || gstRate > 0 || pstRate > 0) && (
                                <div className="mt-8 pt-6 border-t border-theme">
                                    <h4 className="font-semibold text-primary mb-4 text-sm uppercase tracking-wide">
                                        Tax Information
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {company.taxNumber && (
                                            <div>
                                                <p className="text-xs text-secondary mb-1">GST/HST Number</p>
                                                <p className="text-sm font-semibold text-primary">{company.taxNumber}</p>
                                            </div>
                                        )}
                                        {gstRate > 0 && (
                                            <div>
                                                <p className="text-xs text-secondary mb-1">GST Rate</p>
                                                <p className="text-sm font-semibold text-primary">{gstRate}%</p>
                                            </div>
                                        )}
                                        {pstRate > 0 && (
                                            <div>
                                                <p className="text-xs text-secondary mb-1">PST Rate</p>
                                                <p className="text-sm font-semibold text-primary">{pstRate}%</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-xs text-secondary mb-1">GST Amount</p>
                                            <p className="text-sm font-semibold text-primary">{selectedInvoice.currency} {gstAmount.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-secondary mb-1">PST Amount</p>
                                            <p className="text-sm font-semibold text-primary">{selectedInvoice.currency} {pstAmount.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Invoice Metadata */}
                            <div className="mt-10 pt-6 border-t-2 border-theme grid grid-cols-2 gap-6 text-sm">
                                <div>
                                    <span className="font-semibold text-primary">Invoice Date:</span>
                                    <span className="ml-2 text-primary">{formatDate(selectedInvoice.invoiceDate)}</span>
                                </div>
                                <div>
                                    <span className="font-semibold text-primary">Due Date:</span>
                                    <span className="ml-2 text-primary">{formatDate(selectedInvoice.dueDate)}</span>
                                </div>
                                <div>
                                    <span className="font-semibold text-primary">Invoice ID:</span>
                                    <span className="ml-2 text-primary font-mono">{selectedInvoice._id.slice(-8)}</span>
                                </div>
                                <div>
                                    <span className="font-semibold text-primary">Status:</span>{' '}
                                    <span className={`ml-2 px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                                        {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                                    </span>
                                </div>
                            </div>

                            {/* Notes */}
                            {selectedInvoice.notes && (
                                <div className="mt-8 pt-6 border-t-2 border-theme">
                                    <h4 className="font-semibold text-primary mb-3 text-sm uppercase tracking-wide">Notes:</h4>
                                    <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">{selectedInvoice.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Additional Details Section (Collapsible) */}
                    {(selectedInvoice.tripId || selectedInvoice.orderId) && (
                        <div className="max-w-4xl mx-auto mt-6 bg-card rounded-lg shadow-lg p-6">
                            <details className="group">
                                <summary className="cursor-pointer flex items-center justify-between text-lg font-semibold text-primary hover:text-primary transition-colors">
                                    <span>{selectedInvoice.orderId ? 'Order Details' : 'Trip Details'}</span>
                                    <span className="text-secondary group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <div className="mt-4 space-y-4">
                                    {selectedInvoice.orderId ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-secondary">Order Number</label>
                                                    <p className="text-sm font-medium">{selectedInvoice.orderId.orderNumber}</p>
                                                </div>
                                                {selectedInvoice.orderId.customerOrderNo && (
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Customer Ref</label>
                                                        <p className="text-sm">{selectedInvoice.orderId.customerOrderNo}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {selectedInvoice.orderId.pickupLocation?.place && (
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Pickup Location</label>
                                                        <p className="text-sm">{selectedInvoice.orderId.pickupLocation.place}</p>
                                                    </div>
                                                )}
                                                {selectedInvoice.orderId.deliveryLocation?.place && (
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Delivery Location</label>
                                                        <p className="text-sm">{selectedInvoice.orderId.deliveryLocation.place}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : typeof selectedInvoice.tripId === 'object' && selectedInvoice.tripId ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {selectedInvoice.tripId.tripNumber && (
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Trip Number</label>
                                                        <p className="text-sm font-medium">{selectedInvoice.tripId.tripNumber}</p>
                                                    </div>
                                                )}
                                                {selectedInvoice.tripId.status && (
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Trip Status</label>
                                                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${selectedInvoice.tripId.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            selectedInvoice.tripId.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-blue-100 text-blue-800'
                                                            }`}>
                                                            {selectedInvoice.tripId.status.charAt(0).toUpperCase() + selectedInvoice.tripId.status.slice(1)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {selectedInvoice.tripId.truck && (
                                                <div>
                                                    <label className="text-sm font-medium text-secondary">Truck</label>
                                                    <p className="text-sm">
                                                        {selectedInvoice.tripId.truck.plateNumber || selectedInvoice.tripId.truck.licensePlate || selectedInvoice.tripId.truck.unitNumber || selectedInvoice.tripId.truck.internalId || 'N/A'}
                                                        {(() => {
                                                            const makeModel = selectedInvoice.tripId.truck.make && selectedInvoice.tripId.truck.model
                                                                ? `${selectedInvoice.tripId.truck.make} ${selectedInvoice.tripId.truck.model}`
                                                                : (selectedInvoice.tripId.truck.makeModel || '');
                                                            return makeModel ? ` - ${makeModel}` : '';
                                                        })()}
                                                        {(selectedInvoice.tripId.truck.type || selectedInvoice.tripId.truck.unitType) && ` (${selectedInvoice.tripId.truck.type || selectedInvoice.tripId.truck.unitType})`}
                                                    </p>
                                                </div>
                                            )}

                                            {selectedInvoice.tripId.trailer && (
                                                <div>
                                                    <label className="text-sm font-medium text-secondary">Trailer</label>
                                                    <p className="text-sm">
                                                        {selectedInvoice.tripId.trailer.plateNumber || selectedInvoice.tripId.trailer.licensePlate || selectedInvoice.tripId.trailer.unitNumber || 'N/A'}
                                                        {(() => {
                                                            const makeModel = selectedInvoice.tripId.trailer.make && selectedInvoice.tripId.trailer.model
                                                                ? `${selectedInvoice.tripId.trailer.make} ${selectedInvoice.tripId.trailer.model}`
                                                                : (selectedInvoice.tripId.trailer.makeModel || '');
                                                            return makeModel ? ` - ${makeModel}` : '';
                                                        })()}
                                                        {selectedInvoice.tripId.trailer.type && ` (${selectedInvoice.tripId.trailer.type})`}
                                                        {selectedInvoice.tripId.trailer.capacity && ` - ${selectedInvoice.tripId.trailer.capacity}`}
                                                    </p>
                                                </div>
                                            )}

                                            {selectedInvoice.tripId.startLocation?.place && (
                                                <div>
                                                    <label className="text-sm font-medium text-secondary">Pickup Location</label>
                                                    <p className="text-sm">{selectedInvoice.tripId.startLocation.place}</p>
                                                </div>
                                            )}

                                            {selectedInvoice.tripId.endLocation?.place && (
                                                <div>
                                                    <label className="text-sm font-medium text-secondary">Delivery Location</label>
                                                    <p className="text-sm">{selectedInvoice.tripId.endLocation.place}</p>
                                                </div>
                                            )}

                                            {selectedInvoice.tripId.route?.totalDistance && (
                                                <div>
                                                    <label className="text-sm font-medium text-secondary">Distance</label>
                                                    <p className="text-sm">
                                                        {selectedInvoice.tripId.route.totalDistance.toFixed(2)} km
                                                        ({(selectedInvoice.tripId.route.totalDistance * 0.621371).toFixed(2)} miles)
                                                    </p>
                                                </div>
                                            )}

                                            {selectedInvoice.tripId.orders && selectedInvoice.tripId.orders.length > 0 && (
                                                <div>
                                                    <label className="text-sm font-medium text-secondary mb-2 block">Orders ({selectedInvoice.tripId.orders.length})</label>
                                                    <div className="space-y-2">
                                                        {selectedInvoice.tripId.orders.map((order: any, index: number) => (
                                                            <div key={order._id || index} className="p-3 bg-card rounded-md">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="font-medium text-sm">{order.orderNumber || `Order ${index + 1}`}</span>
                                                                    {order.customerOrderNo && (
                                                                        <span className="text-xs text-secondary">PO: {order.customerOrderNo}</span>
                                                                    )}
                                                                </div>
                                                                {order.commodity && (
                                                                    <p className="text-xs text-secondary">Commodity: {order.commodity}</p>
                                                                )}
                                                                {order.weight && (
                                                                    <p className="text-xs text-secondary">
                                                                        Weight: {order.weight} {order.weightUnit || 'lbs'}
                                                                    </p>
                                                                )}
                                                                {order.pickupLocation?.place && (
                                                                    <p className="text-xs text-secondary">Pickup: {order.pickupLocation.place}</p>
                                                                )}
                                                                {order.deliveryLocation?.place && (
                                                                    <p className="text-xs text-secondary">Delivery: {order.deliveryLocation.place}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {(selectedInvoice.tripId.plannedStartDate || selectedInvoice.tripId.actualStartDate) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {selectedInvoice.tripId.plannedStartDate && (
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Planned Start Date</label>
                                                            <p className="text-sm">{formatDate(selectedInvoice.tripId.plannedStartDate)}</p>
                                                        </div>
                                                    )}
                                                    {selectedInvoice.tripId.actualStartDate && (
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Actual Start Date</label>
                                                            <p className="text-sm">{formatDate(selectedInvoice.tripId.actualStartDate)}</p>
                                                        </div>
                                                    )}
                                                    {selectedInvoice.tripId.plannedEndDate && (
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Planned End Date</label>
                                                            <p className="text-sm">{formatDate(selectedInvoice.tripId.plannedEndDate)}</p>
                                                        </div>
                                                    )}
                                                    {selectedInvoice.tripId.actualEndDate && (
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Actual End Date</label>
                                                            <p className="text-sm">{formatDate(selectedInvoice.tripId.actualEndDate)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : selectedInvoice.tripId ? (
                                        <div>
                                            <p className="text-sm text-secondary">Trip ID: {typeof selectedInvoice.tripId === 'string' ? selectedInvoice.tripId : String(selectedInvoice.tripId)}</p>
                                            <p className="text-xs text-secondary mt-1">Trip details not loaded. Please refresh the invoice.</p>
                                        </div>
                                    ) : selectedInvoice.notes && selectedInvoice.notes.includes('Auto-generated invoice for trip') ? (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-sm font-medium text-secondary">Trip Number</label>
                                                <p className="text-sm font-medium">
                                                    {(() => {
                                                        const match = selectedInvoice.notes.match(/trip\s+([A-Z0-9]+)/i);
                                                        return match ? match[1] : 'N/A';
                                                    })()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-secondary italic">
                                                    Trip details are not available. This invoice was auto-generated when the trip was completed.
                                                </p>
                                                <p className="text-xs text-secondary mt-1">
                                                    {selectedInvoice.notes}
                                                </p>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </details>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const InvoiceEdit: React.FC = () => {
        if (!selectedInvoice) return null;

        const [editForm, setEditForm] = useState<Invoice>({ ...selectedInvoice });

        const handleInputChange = (field: keyof Invoice, value: any) => {
            setEditForm(prev => ({
                ...prev,
                [field]: value
            }));
        };

        const handleSave = async () => {
            setLoading(true);
            try {
                // Calculate GST and PST amounts
                const subtotal = parseFloat(editForm.subtotal?.toString() || editForm.amount.toString()) || 0;
                const gstRate = editForm.gstRate || 0;
                const pstRate = editForm.pstRate || 0;
                const gstAmount = subtotal * (gstRate / 100);
                const pstAmount = subtotal * (pstRate / 100);
                const totalAmount = subtotal + gstAmount + pstAmount;

                const updateData = {
                    clientName: editForm.clientName,
                    clientEmail: editForm.clientEmail,
                    amount: totalAmount.toString(),
                    currency: editForm.currency,
                    status: editForm.status,
                    dueDate: editForm.dueDate,
                    paymentDate: editForm.paymentDate,
                    notes: editForm.notes,
                    subtotal: subtotal,
                    gst: gstAmount,
                    gstRate: gstRate,
                    pst: pstAmount,
                    pstRate: pstRate,
                    taxAmount: gstAmount + pstAmount
                };

                const response = await updateInvoice(editForm._id, updateData);
                if (response && response.success) {
                    showNotification('success', 'Invoice updated successfully');
                    await fetchInvoices();
                    setSelectedInvoice(editForm);
                    setActiveTab('view');
                } else {
                    showNotification('error', 'Failed to update invoice');
                }
            } catch (error) {
                showNotification('error', 'Failed to update invoice');
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="bg-card rounded-lg" >
                <div className="p-6 border-b border-theme">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-primary">Edit Invoice</h2>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setActiveTab('view')}
                                className="text-secondary hover:text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-4 py-2 rounded-md transition-colors disabled:bg-gray-400 bg-[var(--accent-navyblue)]"

                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-primary mb-1">Client Name</label>
                                <input
                                    type="text"
                                    value={editForm.clientName}
                                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                                    className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-1">Client Email</label>
                                <input
                                    type="email"
                                    value={editForm.clientEmail}
                                    onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                                    className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>


                            <div>
                                <label className="block text-sm font-medium text-primary mb-1">Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editForm.amount}
                                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                                    className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-1">GST Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={editForm.gstRate || ''}
                                    onChange={(e) => handleInputChange('gstRate', parseFloat(e.target.value) || 0)}
                                    className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-1">PST Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={editForm.pstRate || ''}
                                    onChange={(e) => handleInputChange('pstRate', parseFloat(e.target.value) || 0)}
                                    className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-primary mb-1">Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => handleInputChange('status', e.target.value)}
                                    className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option className='form-option' value="pending">Pending</option>
                                    <option className='form-option' value="paid">Paid</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={editForm.dueDate.split('T')[0]}
                                    onChange={(e) => handleInputChange('dueDate', e.target.value + 'T00:00:00Z')}
                                    className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {editForm.status === 'paid' && (
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Payment Date</label>
                                    <input
                                        type="date"
                                        value={editForm.paymentDate ? editForm.paymentDate.split('T')[0] : ''}
                                        onChange={(e) => handleInputChange('paymentDate', e.target.value ? e.target.value + 'T00:00:00Z' : null)}
                                        className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            )}

                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-medium text-primary mb-1">Notes</label>
                        <textarea
                            value={editForm.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            rows={4}
                            className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>
        );
    };

    const CreateInvoice: React.FC = () => {
        const [newInvoice, setNewInvoice] = useState({
            clientName: '',
            clientEmail: '',
            clientAddress: '',
            clientPhone: '',
            tripId: '',
            orderId: '',
            amount: '',
            currency: 'USD',
            dueDate: '',
            notes: '',
            gstRate: '',
            pstRate: ''
        });

        const handleInputChange = (field: string, value: string) => {
            setNewInvoice(prev => ({
                ...prev,
                [field]: value
            }));
        };

        const handleOrderSelect = (orderId: string) => {
            console.log('Selected order ID:', orderId);
            const selectedOrder = orders.find(order => order._id === orderId);
            console.log('Selected order data:', selectedOrder);

            if (selectedOrder) {
                const customer = selectedOrder.customer;

                const customerName = customer?.name || '';
                const customerEmail = customer?.email || '';
                // Get customer address from customer.address or customer.location.address
                const customerAddress = customer?.address || customer?.location?.address || '';
                const customerPhone = customer?.phone || '';

                console.log('Auto-filling customer details from order:', {
                    customerName,
                    customerEmail,
                    customerAddress,
                    customerPhone,
                    orderNumber: selectedOrder.orderNumber
                });

                setNewInvoice(prev => ({
                    ...prev,
                    tripId: orderId, // Keep tripId field name for backend compatibility
                    orderId: orderId, // Also set orderId
                    clientName: customerName,
                    clientEmail: customerEmail,
                    clientAddress: customerAddress,
                    clientPhone: customerPhone,
                }));
            } else {
                console.log('No order found with ID:', orderId);
                setNewInvoice(prev => ({
                    ...prev,
                    tripId: orderId, // Keep tripId field name for backend compatibility
                    orderId: orderId
                }));
            }
        };

        const handleCreate = async () => {
            if (!newInvoice.clientName || !newInvoice.amount || !newInvoice.dueDate) {
                showNotification('error', 'Please fill in all required fields: Client Name, Amount, and Due Date');
                return;
            }

            setLoading(true);
            try {
                // Calculate GST and PST amounts
                const subtotal = parseFloat(newInvoice.amount) || 0;
                const gstRate = parseFloat(newInvoice.gstRate) || 0;
                const pstRate = parseFloat(newInvoice.pstRate) || 0;
                const gstAmount = subtotal * (gstRate / 100);
                const pstAmount = subtotal * (pstRate / 100);
                const totalAmount = subtotal + gstAmount + pstAmount;

                const invoiceData = {
                    ...newInvoice,
                    amount: totalAmount.toString(),
                    subtotal: subtotal,
                    gst: gstAmount,
                    gstRate: gstRate,
                    pst: pstAmount,
                    pstRate: pstRate,
                    taxAmount: gstAmount + pstAmount
                };

                const response = await createInvoice(invoiceData);
                if (response && response.success) {
                    showNotification('success', 'Invoice created successfully');
                    await fetchInvoices();
                    setActiveTab('list');
                    setNewInvoice({
                        clientName: '',
                        clientEmail: '',
                        clientAddress: '',
                        clientPhone: '',
                        tripId: '',
                        orderId: '',
                        amount: '',
                        currency: 'USD',
                        dueDate: '',
                        notes: '',
                        gstRate: '',
                        pstRate: ''
                    });
                } else {
                    showNotification('error', response?.message || 'Failed to create invoice');
                }
            } catch (error) {
                console.error('Create invoice error:', error);
                showNotification('error', 'Failed to create invoice');
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="bg-card rounded-lg">
                <div className="p-6 border-b border-theme">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-headings">Create New Invoice</h2>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setActiveTab('list')}
                                className="text-secondary hover:text-headings transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={loading}
                                className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 bg-[var(--accent-navyblue)]"

                            >
                                <Plus className="h-4 w-4" />
                                {loading ? 'Creating...' : 'Create Invoice'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">
                                    Select Order (Optional)
                                </label>
                                <select
                                    value={newInvoice.tripId}
                                    onChange={(e) => handleOrderSelect(e.target.value)}
                                    disabled={loading}
                                    className="w-full border border-theme rounded-md px-3 py-2 text-sm
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all
  disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <option
                                        value=""
                                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                                    >
                                        {loading
                                            ? "Loading orders..."
                                            : orders.length === 0
                                                ? "No completed orders available"
                                                : "Select an order..."}
                                    </option>

                                    {orders.map((order) => {
                                        const orderId = order._id;
                                        const orderNumber = order.orderNumber || 'Unknown Order';
                                        const pickupLocation =
                                            order.pickupLocation?.place ||
                                            order.pickupLocation?.placeId?.name ||
                                            order.pickupLocation?.placeId?.currentLocation?.address ||
                                            "N/A";

                                        const deliveryLocation =
                                            order.deliveryLocation?.place ||
                                            order.deliveryLocation?.placeId?.name ||
                                            order.deliveryLocation?.placeId?.currentLocation?.address ||
                                            "N/A";

                                        const customer = order.customer;
                                        const customerName = customer?.name || '';
                                        const customerEmail = customer?.email || '';
                                        const customerOrderNo = order.customerOrderNo || '';

                                        return (
                                            <option
                                                key={orderId}
                                                value={orderId}
                                                className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                                            >
                                                {orderNumber} {customerOrderNo && `(PO: ${customerOrderNo})`} - {pickupLocation} → {deliveryLocation}
                                                {customerName && ` (${customerName})`}
                                                {customerEmail && ` [${customerEmail}]`}
                                            </option>
                                        );
                                    })}
                                </select>

                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-secondary">
                                        Selecting an order will auto-fill customer details if available
                                        {orders.length > 0 && ` (${orders.length} completed orders available)`}
                                    </p>
                                    {newInvoice.tripId && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewInvoice(prev => ({
                                                    ...prev,
                                                    tripId: '',
                                                    orderId: '',
                                                    clientName: '',
                                                    clientEmail: '',
                                                    clientAddress: '',
                                                    clientPhone: ''
                                                }));
                                            }}
                                            className="text-xs text-[#A855F7] hover:text-red-800 underline"
                                        >
                                            Clear Selection
                                        </button>
                                    )}
                                </div>
                                {newInvoice.tripId && !newInvoice.clientName && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        ⚠️ Selected order has no customer name - please fill manually
                                    </p>
                                )}
                                {newInvoice.tripId && newInvoice.clientName && !newInvoice.clientEmail && (
                                    <p className="text-xs text-[#059669] mt-1">
                                        ℹ️ Customer name found, but no email available - please add email manually if needed
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">
                                    Client Name *
                                    {newInvoice.tripId && newInvoice.clientName && (
                                        <span className="text-xs text-green-600 ml-2">✓ Auto-filled from order</span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    value={newInvoice.clientName}
                                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                                    className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${newInvoice.tripId && newInvoice.clientName
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-theme'
                                        }`}
                                    placeholder="Enter client name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">
                                    Client Email
                                    {newInvoice.tripId && newInvoice.clientEmail && (
                                        <span className="text-xs text-green-600 ml-2">✓ Auto-filled from order</span>
                                    )}
                                </label>
                                <input
                                    type="email"
                                    value={newInvoice.clientEmail}
                                    onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                                    className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${newInvoice.tripId && newInvoice.clientEmail
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-theme'
                                        }`}
                                    placeholder="client@example.com"
                                />
                            </div>


                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">Amount *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={newInvoice.amount}
                                    onChange={(e) => handleInputChange('amount', e.target.value)}
                                    className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">GST Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={newInvoice.gstRate}
                                    onChange={(e) => handleInputChange('gstRate', e.target.value)}
                                    className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">PST Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={newInvoice.pstRate}
                                    onChange={(e) => handleInputChange('pstRate', e.target.value)}
                                    className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">Currency</label>
                                <select
                                    value={newInvoice.currency}
                                    onChange={(e) => handleInputChange('currency', e.target.value)}
                                    className="w-full border border-theme rounded-md px-3 py-2 text-sm
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                                >
                                    <option value="USD" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                                        USD - US Dollar
                                    </option>
                                    <option value="EUR" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                                        EUR - Euro
                                    </option>
                                    <option value="GBP" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                                        GBP - British Pound
                                    </option>
                                    <option value="CAD" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                                        CAD - Canadian Dollar
                                    </option>
                                    <option value="AUD" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                                        AUD - Australian Dollar
                                    </option>
                                    <option value="INR" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                                        INR - Indian Rupee
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">Due Date *</label>
                                <input
                                    type="date"
                                    value={newInvoice.dueDate}
                                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                                    className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                                    min={todayLocalISO()}
                                    style={{ colorScheme: 'light', color: 'var(--text-primary, #5a7066)', backgroundColor: 'var(--bg-input, #1e293b)' }}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">Notes</label>
                                <textarea
                                    value={newInvoice.notes}
                                    onChange={(e) => handleInputChange('notes', e.target.value)}
                                    rows={8}
                                    className="w-full border border-theme rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Add any additional notes or details about this invoice..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'view':
                return <InvoiceView />;
            case 'edit':
                return <InvoiceEdit />;
            case 'create':
                return <CreateInvoice />;
            default:
                return (
                    <>
                        <DashboardOverview />
                        <InvoiceList />
                    </>
                );
        }
    };

    if (!loading && emptyStateMessage) {
        return (
            <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center space-y-5" style={pageBackgroundStyle}>
                <NotificationContainer />
                <Building2 className="h-16 w-16 text-secondary" />
                <div className="space-y-3 max-w-md">
                    <h2 className="text-2xl font-semibold text-primary">No invoice data available</h2>
                    <p className="text-secondary">{emptyStateMessage}</p>
                </div>
                <button
                    onClick={fetchInvoices}
                    className="px-4 py-2 rounded-lg shadow text-sm font-medium"
                    style={primaryButtonStyle}
                >
                    Refresh
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 bg-main" >
            <NotificationContainer />
            <DeleteConfirmationModal />
            <div className="w-full mx-auto">
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold" style={{ background: 'var(--accent-navyblue)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Invoice Management</h1>
                            <p className="mt-2 text-secondary">Manage invoices, track payments, and monitor revenue</p>
                        </div>
                        {activeTab === 'list' && (
                            <div className="mt-4 sm:mt-0 flex items-center gap-2">
                                <button
                                    onClick={() => { setNotesDraft(defaultInvoiceNotes); setNotesEditorOpen(true); }}
                                    className="px-4 py-2 rounded-lg border border-theme text-primary hover:bg-[rgba(5,150,105,0.08)] transition-all flex items-center gap-2"
                                    title="Notes printed on every invoice that has no notes of its own"
                                >
                                    <FileText className="h-4 w-4" />
                                    Default Invoice Notes
                                </button>
                                <button
                                    onClick={() => setActiveTab('create')}
                                    className="px-4 py-2 rounded-lg transition-all flex items-center gap-2 hover:shadow-lg hover:scale-105 transform duration-200 !text-white"
                                    style={{
                                        background: 'var(--accent-navyblue)'
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                    New Invoice
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {renderContent()}

                {notesEditorOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setNotesEditorOpen(false)}>
                        <div className="w-full max-w-lg rounded-xl bg-card border border-theme p-6" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-semibold text-primary mb-1">Default Invoice Notes</h3>
                            <p className="text-sm text-secondary mb-3">
                                Printed in the Notes box of every invoice that has no notes of its own, for example the factoring company's Notice of Assignment.
                            </p>
                            <textarea
                                value={notesDraft}
                                onChange={(e) => setNotesDraft(e.target.value)}
                                rows={10}
                                maxLength={2000}
                                className="w-full border border-theme rounded-lg p-3 text-sm bg-card text-primary"
                                placeholder={'Notice of Assignment\nThis invoice has been assigned to\nand must be paid directly to\n...'}
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <button onClick={() => setNotesEditorOpen(false)} className="px-4 py-2 rounded-lg border border-theme text-primary">Cancel</button>
                                <button onClick={saveDefaultNotes} disabled={notesSaving} className="px-4 py-2 rounded-lg !text-white disabled:opacity-50" style={{ background: 'var(--accent-navyblue)' }}>
                                    {notesSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default InvoiceManagement;