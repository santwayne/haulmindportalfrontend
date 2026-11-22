/* eslint-disable @typescript-eslint/no-explicit-any -- API payloads (paystubs, settlements, bills) are untyped JSON */
import jsPDF from 'jspdf';

// One pay statement layout for employee payroll, driver payroll, paystubs and owner-operator
// settlements, matching the statements Black River Logistics already uses:
// logo, company / payee box, trip or hours table, additions and deductions with their memo,
// gross / additions / deductions / taxes, net pay. Can be downloaded or printed.

export interface StatementTripLine {
    truck?: string;
    payType?: string;
    load?: string;
    type?: string;
    from?: string | Date;
    to?: string | Date;
    origin?: string;
    destination?: string;
    driver?: string;
    rate?: number;
    qty?: number; // miles or hours
    cad?: number;
    usd?: number;
}

export interface StatementAdjustment {
    load?: string;
    date?: string | Date;
    memo: string;
    amount: number;
    per?: string;
    gst?: number;
    total?: number;
}

export interface PayStatementData {
    title: string;
    company: { name?: string; address?: string; phone?: string; email?: string; logoUrl?: string };
    payee: { name: string; address?: string; id?: string };
    billLine?: string;
    gstNumber?: string;
    period: { start?: string | Date; end?: string | Date };
    payDue?: string | Date;
    chequeNumber?: string;
    tripLines?: StatementTripLine[];
    hourLines?: { period: string; rate: number; hours: number; amount: number }[];
    earningLines?: { label: string; amount: number }[];
    additions: StatementAdjustment[];
    deductions: StatementAdjustment[];
    taxes: { label: string; amount: number }[];
    totals: { gross: number; additions: number; deductions: number; taxes: number; net: number };
    notes?: string;
    fileName: string;
}

const money = (n: number | undefined, sign = true) => {
    const v = Number(n) || 0;
    const s = v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return sign ? `$${s}` : s;
};
const mdy = (d?: string | Date) => {
    if (!d) return '';
    const t = new Date(d);
    if (isNaN(t.getTime())) return '';
    // Dates saved as UTC midnight (pay periods) must not shift a day in Winnipeg
    const useUtc = typeof d === 'string' && (/^\d{4}-\d{2}-\d{2}$/.test(d) || /T00:00:00(\.000)?Z$/.test(d));
    const mm = String((useUtc ? t.getUTCMonth() : t.getMonth()) + 1).padStart(2, '0');
    const dd = String(useUtc ? t.getUTCDate() : t.getDate()).padStart(2, '0');
    const yy = useUtc ? t.getUTCFullYear() : t.getFullYear();
    return `${mm}/${dd}/${yy}`;
};

const loadImage = async (url?: string): Promise<{ data: string; w: number; h: number } | null> => {
    if (!url) return null;
    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return null;
        const blob = await res.blob();
        const data: string = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.onerror = reject;
            r.readAsDataURL(blob);
        });
        const dims: { w: number; h: number } = await new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve({ w: img.width || 1, h: img.height || 1 });
            img.onerror = () => resolve({ w: 1, h: 1 });
            img.src = data;
        });
        return { data, ...dims };
    } catch {
        return null;
    }
};

type Col = { title: string; width: number; align?: 'left' | 'right' };

export const buildPayStatementPdf = async (data: PayStatementData): Promise<jsPDF> => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const m = 12;
    const contentW = pageW - m * 2;
    let y = m;

    const newPageIfNeeded = (space: number) => {
        if (y + space > pageH - m) {
            doc.addPage();
            y = m;
            return true;
        }
        return false;
    };

    // ---- Logo / company name
    const logo = await loadImage(data.company.logoUrl);
    if (logo) {
        const h = 16;
        const w = Math.min(50, (logo.w / logo.h) * h);
        try { doc.addImage(logo.data, logo.data.includes('image/png') ? 'PNG' : 'JPEG', m, y, w, h); } catch { /* ignore bad image */ }
        y += h + 4;
    } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(data.company.name || '', m, y + 7);
        y += 12;
    }

    // ---- Company / payee box
    const boxTop = y;
    const half = contentW / 2;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    let ly = boxTop + 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text((data.company.name || '').toUpperCase(), m + 3, ly);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    ly += 5;
    if (data.company.address) {
        const lines = doc.splitTextToSize(data.company.address, half - 6);
        doc.text(lines, m + 3, ly); ly += lines.length * 4;
    }
    if (data.company.phone) { doc.text(data.company.phone, m + 3, ly); ly += 4; }
    if (data.company.email) { doc.text(data.company.email, m + 3, ly); ly += 4; }

    const rx = pageW - m - 3;
    let ry = boxTop + 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text(data.title, rx, ry, { align: 'right' });
    ry += 6;
    doc.setFontSize(12);
    const payeeLines = doc.splitTextToSize((data.payee.name || '').toUpperCase(), half - 6);
    doc.text(payeeLines, rx, ry, { align: 'right' }); ry += payeeLines.length * 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    if (data.payee.address) {
        const lines = doc.splitTextToSize(data.payee.address.toUpperCase(), half - 6);
        doc.text(lines, rx, ry, { align: 'right' }); ry += lines.length * 3.8;
    }
    if (data.billLine) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
        ry += 1; doc.text(data.billLine, rx, ry, { align: 'right' }); ry += 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    }
    doc.text(`PAY PERIOD ${mdy(data.period.start)} - ${mdy(data.period.end)}`, rx, ry, { align: 'right' }); ry += 3.8;
    if (data.gstNumber) { doc.text(`GST No. ${data.gstNumber}`, rx, ry, { align: 'right' }); ry += 3.8; }
    if (data.payDue) { doc.text(`PAYROLL DUE: ${mdy(data.payDue)}`, rx, ry, { align: 'right' }); ry += 3.8; }
    if (data.chequeNumber) { doc.text(`CHEQUE #: ${data.chequeNumber}`, rx, ry, { align: 'right' }); ry += 3.8; }

    const boxBottom = Math.max(ly, ry) + 3;
    doc.rect(m, boxTop, contentW, boxBottom - boxTop);
    doc.line(m + half, boxTop, m + half, boxBottom);
    y = boxBottom + 8;

    // ---- generic table
    const table = (cols: Col[], rows: string[][], opts: { fontSize?: number; boldLast?: boolean } = {}) => {
        const fs = opts.fontSize ?? 7.5;
        const scale = contentW / cols.reduce((s, c) => s + c.width, 0);
        const widths = cols.map(c => c.width * scale);
        const drawHeader = () => {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(fs);
            let x = m;
            cols.forEach((c, i) => {
                const tx = c.align === 'right' ? x + widths[i] - 1 : x + 1;
                doc.text(c.title, tx, y, { align: c.align === 'right' ? 'right' : 'left' });
                x += widths[i];
            });
            y += 1.5;
            doc.setLineWidth(0.3); doc.line(m, y, m + contentW, y);
            y += 4;
        };
        drawHeader();
        rows.forEach(row => {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(fs);
            const cellLines = row.map((cell, i) => doc.splitTextToSize(cell ?? '', widths[i] - 2));
            const h = Math.max(...cellLines.map(l => l.length)) * (fs * 0.42) + 3;
            if (newPageIfNeeded(h + 6)) drawHeader();
            let x = m;
            cellLines.forEach((lines, i) => {
                const c = cols[i];
                const tx = c.align === 'right' ? x + widths[i] - 1 : x + 1;
                doc.text(lines, tx, y, { align: c.align === 'right' ? 'right' : 'left' });
                x += widths[i];
            });
            y += h;
            doc.setDrawColor(210); doc.setLineWidth(0.1); doc.line(m, y - 2, m + contentW, y - 2); doc.setDrawColor(0);
        });
        doc.setFont('helvetica', 'normal');
    };

    // ---- Earnings
    if (data.tripLines && data.tripLines.length > 0) {
        const hasDriver = data.tripLines.some(t => t.driver);
        const cols: Col[] = [
            { title: 'Truck #', width: 13 }, { title: 'Pay Type', width: 17 }, { title: 'Load #', width: 13 },
            { title: 'Type', width: 15 }, ...(hasDriver ? [{ title: 'Driver', width: 18 } as Col] : []),
            { title: 'Period', width: 19 }, { title: 'From', width: 20 }, { title: 'To', width: 20 },
            { title: 'Pay Rate', width: 12, align: 'right' }, { title: 'Miles/Hours', width: 15, align: 'right' },
            { title: 'CAD', width: 15, align: 'right' }, { title: 'USD', width: 12, align: 'right' },
        ];
        table(cols, data.tripLines.map(t => [
            t.truck ? `#${String(t.truck).replace(/^#/, '')}` : '', t.payType || 'Paid Per Mile',
            t.load ? `#${String(t.load).replace(/^#/, '')}` : '', t.type || '',
            ...(hasDriver ? [t.driver || ''] : []),
            `${mdy(t.from)} -\n${mdy(t.to)}`, t.origin || '', t.destination || '',
            money(t.rate), (Number(t.qty) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            t.cad ? money(t.cad) : '', t.usd ? money(t.usd) : '',
        ]));
        const totalMiles = data.tripLines.reduce((s, t) => s + (Number(t.qty) || 0), 0);
        newPageIfNeeded(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
        doc.text('Total Miles:', pageW - m, y + 2, { align: 'right' });
        doc.text(totalMiles.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), pageW - m, y + 6, { align: 'right' });
        y += 12;
    } else if (data.hourLines && data.hourLines.length > 0) {
        table(
            [{ title: 'Period', width: 40 }, { title: 'Pay Rate', width: 20, align: 'right' }, { title: 'Hours', width: 20, align: 'right' }, { title: 'Amount', width: 25, align: 'right' }],
            data.hourLines.map(h => [h.period, money(h.rate), (Number(h.hours) || 0).toFixed(2), money(h.amount)]),
            { fontSize: 8.5 },
        );
        y += 4;
    } else if (data.earningLines && data.earningLines.length > 0) {
        table(
            [{ title: 'Earnings', width: 80 }, { title: 'Amount', width: 25, align: 'right' }],
            data.earningLines.map(e => [e.label, money(e.amount)]),
            { fontSize: 8.5 },
        );
        y += 4;
    }

    const adjTable = (label: string, rows: StatementAdjustment[]) => {
        if (!rows.length) return;
        newPageIfNeeded(20);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text(label, m, y); y += 6;
        table(
            [{ title: 'Load', width: 14 }, { title: 'Date', width: 16 }, { title: 'Memo', width: 52 }, { title: 'Amount', width: 15, align: 'right' },
            { title: 'Per', width: 14 }, { title: 'GST', width: 12, align: 'right' }, { title: 'Total (CAD)', width: 17, align: 'right' }],
            rows.map(r => [r.load || '', mdy(r.date), r.memo, money(r.amount), r.per || 'One Time', money(r.gst || 0), money(r.total ?? r.amount)]),
        );
        y += 4;
    };
    adjTable('Additions', data.additions);
    adjTable('Deductions', data.deductions);

    // ---- Totals
    newPageIfNeeded(45);
    const tx = pageW - m;
    const lx = pageW - m - 70;
    doc.setLineWidth(0.3);
    doc.line(lx, y, tx, y); y += 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('Amount', tx, y, { align: 'right' }); y += 2;
    doc.line(lx, y, tx, y); y += 5;
    const row = (label: string, value: string) => {
        doc.text(label, tx - 32, y, { align: 'right' });
        doc.text(value, tx, y, { align: 'right' });
        y += 5;
    };
    row('Gross Pay', money(data.totals.gross, false));
    if (data.totals.additions) row('Additions (+)', money(data.totals.additions, false));
    if (data.totals.deductions) row('Deductions (-)', money(data.totals.deductions, false));
    data.taxes.filter(t => t.amount > 0).forEach(t => row(`${t.label} (-)`, money(t.amount, false)));
    y += 3;
    doc.setLineWidth(0.4);
    doc.line(m, y, tx, y); y += 6;
    doc.setFontSize(9);
    doc.text('Net Pay', m, y);
    doc.text(money(data.totals.net), tx, y, { align: 'right' });
    y += 3;
    doc.line(m, y, tx, y);

    if (data.notes) {
        y += 8; newPageIfNeeded(15);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        doc.text(doc.splitTextToSize(`Notes: ${data.notes}`, contentW), m, y);
    }
    return doc;
};

/** Print without a pop-up (pop-up blockers stop window.open after an await). */
const printPdf = (doc: jsPDF) => {
    doc.autoPrint();
    const url = doc.output('bloburl') as unknown as string;
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.src = url;
    frame.onload = () => {
        try {
            frame.contentWindow?.focus();
            frame.contentWindow?.print();
        } catch {
            window.open(url, '_blank');
        }
        setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 60_000);
    };
    document.body.appendChild(frame);
};

export const outputPayStatement = async (data: PayStatementData, mode: 'download' | 'print') => {
    const doc = await buildPayStatementPdf(data);
    if (mode === 'print') printPdf(doc);
    else doc.save(data.fileName);
};

// ---------------------------------------------------------------------------------------
// Paystub (from the API) -> statement
// ---------------------------------------------------------------------------------------

const TAX_LABELS_CA: [string, string][] = [
    ['federalIncomeTax', 'Federal Income Tax'], ['provincialIncomeTax', 'Provincial Income Tax'],
    ['cpp', 'CPP'], ['ei', 'EI'], ['provincialHealthTax', 'Provincial Health Tax'],
];
const TAX_LABELS_US: [string, string][] = [
    ['federalIncomeTax', 'Federal Income Tax'], ['stateIncomeTax', 'State Income Tax'],
    ['socialSecurityTax', 'Social Security'], ['medicareTax', 'Medicare'],
    ['stateDisabilityInsurance', 'State Disability Ins.'], ['localTax', 'Local Tax'],
];

export const paystubToStatement = (p: any): PayStatementData => {
    const isOO = p.workType === 'Owner-Operator';
    const name = p.employeeName || p.userId?.name || 'Employee';
    const trips = Array.isArray(p.tripDetails) ? p.tripDetails : [];
    const additions: StatementAdjustment[] = (p.additions || []).map((a: any) => ({
        date: a.loadDate, memo: a.memo || 'Addition', amount: Number(a.amount) || 0, per: a.per, gst: a.gst, total: a.totalCAD ?? a.amount,
    }));
    const deductionItems: StatementAdjustment[] = (p.deductionItems || []).map((d: any) => ({
        date: d.loadDate, memo: d.memo || 'Deduction', amount: Number(d.amount) || 0, per: d.per, gst: d.gst, total: d.totalCAD ?? d.amount,
    }));

    const country = p.country || 'USA';
    const taxSrc = country === 'Canada' ? (p.taxesCA || {}) : (p.taxesUS || {});
    const taxes = (country === 'Canada' ? TAX_LABELS_CA : TAX_LABELS_US)
        .map(([k, label]) => ({ label, amount: Number(taxSrc[k]) || 0 }))
        .filter(t => t.amount > 0);
    const taxTotal = taxes.reduce((s, t) => s + t.amount, 0);

    // Legacy paystubs: one "Other Deductions" line with no memo
    const taxLabels = new Set(taxes.map(t => t.label).concat(['Federal Income Tax', 'Provincial Income Tax', 'CPP', 'EI', 'Provincial Health Tax', 'State Income Tax', 'Social Security Tax', 'Medicare Tax', 'State Disability Insurance', 'Local Tax']));
    const deductions = deductionItems.length > 0 ? deductionItems
        : (p.deductions?.deductionsBreakdown || [])
            .filter((d: any) => !taxLabels.has(d.type) && Number(d.amount) > 0)
            .map((d: any) => ({ memo: d.type || 'Deduction', amount: Number(d.amount) || 0 }));

    const earnings = p.earnings || {};
    const base = Number(earnings.baseSalary) || 0;
    const mileage = Number(earnings.mileageEarnings) || 0;
    const additionsTotal = additions.reduce((s, a) => s + a.amount, 0);
    const bonusOnly = Math.round(((Number(earnings.bonus) || 0) - additionsTotal) * 100) / 100;
    if (bonusOnly > 0.009) additions.unshift({ memo: 'Bonus', amount: bonusOnly, per: 'One Time', total: bonusOnly });

    const hours = Number(p.hoursWorked?.totalHours) || Number(earnings.regularHours) || 0;
    const rate = Number(p.hoursWorked?.hourlyRate) || Number(earnings.hourlyRate) || 0;
    const periodLabel = `${mdy(p.payPeriod?.startDate)} - ${mdy(p.payPeriod?.endDate)}`;
    // Show "rate x hours" only when it really is how the pay was worked out
    const hourly = hours > 0 && rate > 0 && Math.abs(hours * rate - base) < 0.5;

    const deductionsTotal = deductions.reduce((s: number, d: StatementAdjustment) => s + d.amount, 0);
    const gross = base + mileage;
    const net = Number(p.summary?.netPay ?? (gross + additions.reduce((s, a) => s + a.amount, 0) - deductionsTotal - taxTotal));
    const truck = trips.find((t: any) => t.truckNumber && t.truckNumber !== 'N/A')?.truckNumber;

    return {
        title: isOO ? 'OWNER OPERATOR PAY STATEMENT' : 'COMPANY PAY STATEMENT',
        company: {
            name: p.companyDetails?.companyName,
            address: p.companyDetails?.companyAddress,
            phone: p.companyDetails?.companyPhone,
            email: p.companyDetails?.companyEmail,
            logoUrl: p.companyDetails?.companyLogo,
        },
        payee: { name, address: p.employeeAddress, id: p.employeeId },
        billLine: p.billNumber || truck ? `BILL: ${p.billNumber ? `#${p.billNumber}` : ''}${p.billNumber && truck ? ' | ' : ''}${truck ? `#${String(truck).replace(/^#/, '')}` : ''}` : undefined,
        gstNumber: isOO ? p.companyDetails?.gstNumber : undefined,
        period: { start: p.payPeriod?.startDate, end: p.payPeriod?.endDate },
        payDue: p.payPeriod?.payDate,
        chequeNumber: p.chequeNumber,
        tripLines: trips.map((t: any) => ({
            truck: t.truckNumber !== 'N/A' ? t.truckNumber : '', payType: t.payType, load: t.loadNumber !== 'N/A' ? t.loadNumber : '',
            type: t.tripType, from: t.periodFrom, to: t.periodTo, origin: t.origin, destination: t.destination,
            rate: t.payRate, qty: t.miles || t.hours, cad: t.amountCAD, usd: t.amountUSD,
        })),
        hourLines: trips.length === 0 && hourly ? [{ period: periodLabel, rate, hours, amount: base }] : undefined,
        earningLines: trips.length === 0 && !hourly
            ? [{ label: `Salary (${periodLabel})`, amount: base }, ...(mileage ? [{ label: 'Mileage', amount: mileage }] : [])]
            : undefined,
        additions,
        deductions,
        taxes,
        totals: {
            gross,
            additions: additions.reduce((s, a) => s + a.amount, 0),
            deductions: deductionsTotal,
            taxes: taxTotal,
            net,
        },
        notes: p.notes,
        fileName: `Payroll_${mdy(p.payPeriod?.startDate).replace(/\//g, '_')}_${mdy(p.payPeriod?.endDate).replace(/\//g, '_')}_${name.replace(/\s+/g, '_')}.pdf`,
    };
};

// ---------------------------------------------------------------------------------------
// Settlement (owner-operator, by truck or driver) -> statement
// ---------------------------------------------------------------------------------------
export const settlementToStatement = (st: any, company: any = {}): PayStatementData => {
    const truck = st.truckNumber || st.truck?.internalId || st.truck?.unitNumber || st.truck?.plateNumber || '';
    const payee = st.payeeName || st.driver?.name || 'Owner Operator';
    const lines: StatementTripLine[] = (st.lineItems || []).map((l: any) => ({
        truck, payType: l.payType || 'Paid Per Mile', load: l.loadNumber, type: l.tripType, driver: l.driverNames,
        from: l.periodFrom, to: l.periodTo, origin: l.origin, destination: l.destination,
        rate: l.rate, qty: l.miles, cad: l.amount,
    }));
    const additions: StatementAdjustment[] = (st.additionItems || []).map((a: any) => ({ load: a.load, date: a.date, memo: a.memo, amount: a.amount, gst: a.gst, total: a.amount }));
    const deductions: StatementAdjustment[] = (st.deductionItems || []).map((d: any) => ({ load: d.load, date: d.date, memo: d.memo, amount: d.amount, gst: d.gst, total: d.amount }));
    // Older settlements only have totals
    if (!additions.length && st.additions > 0) additions.push({ memo: 'Additions', amount: st.additions, total: st.additions });
    if (!deductions.length && st.deductions > 0) deductions.push({ memo: 'Deductions', amount: st.deductions, total: st.deductions });
    const start = st.payPeriod?.startDate;
    const end = st.payPeriod?.endDate;
    return {
        title: 'OWNER OPERATOR PAY STATEMENT',
        company: {
            name: company.companyName, address: company.address, phone: company.contactPhone,
            email: company.contactEmail, logoUrl: company.logoUrl,
        },
        payee: { name: payee, address: st.payeeAddress },
        billLine: st.billNumber || truck ? `BILL: ${st.billNumber ? `#${st.billNumber}` : ''}${st.billNumber && truck ? ' | ' : ''}${truck ? `#${truck}` : ''}` : undefined,
        gstNumber: st.gstNumber,
        period: { start, end },
        payDue: st.paymentDate,
        chequeNumber: st.chequeNumber,
        tripLines: lines,
        earningLines: lines.length ? undefined : [{ label: `Settlement ${st.settlementId || ''}`, amount: st.grossPay || 0 }],
        additions,
        deductions,
        taxes: [],
        totals: {
            gross: st.grossPay || 0,
            additions: additions.reduce((s, a) => s + a.amount, 0),
            deductions: deductions.reduce((s, d) => s + d.amount, 0),
            taxes: 0,
            net: st.netPay || 0,
        },
        notes: st.notes,
        fileName: `Settlement_${st.settlementId || ''}_${truck ? `Truck_${truck}_` : ''}${payee.replace(/[^A-Za-z0-9]+/g, '_')}.pdf`,
    };
};
