import jsPDF from 'jspdf';
import { getCompany } from '../axios/api/admin';

/**
 * HOS Progressive Disciplinary Action form as a printable PDF.
 *
 * Client (13 Nov): "HOS form is working fine but how am I supposed to print it or get the driver
 * to sign it? It should look like the payroll or invoice PDFs."
 * Same look as the fleet invoice: blue header bar with the company's name and contact details,
 * blue section titles, boxed fields. Signature lines are left blank for a pen signature, with the
 * printed name and date under each one.
 */

export type HosFormRow = {
  driverName?: string;
  driverId?: string;
  reportingTo?: string;
  auditDate?: string;
  incidentDate?: string;
  incidentTime?: string;
  incidentLocation?: string;
  incidentTypes?: string[];
  priorCounseling?: string;
  notes?: string;
  correctiveActionType?: string;
  correctiveActionComments?: string;
  eldMalfunction?: boolean;
  eldMalfunctionType?: string;
  violations?: string[];
  auditorName?: string;
};

export type HosFormExtras = {
  noticeToEmployee: string;
  employeeComments: string;
  managerSignature: string; // printed name of the manager
  managerDate: string;
  employeeSignature: string; // printed name of the employee
  employeeDate: string;
};

const BLUE: [number, number, number] = [1, 106, 178];
const DARK: [number, number, number] = [31, 41, 55];
const GRAY: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [209, 213, 219];
const LIGHT: [number, number, number] = [235, 246, 255];

const fmtDay = (v?: string) => {
  if (!v || v === '—') return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  // stored as calendar dates (UTC midnight): read the UTC day so Canada doesn't show the day before
  return d.toLocaleDateString('en-CA', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
};

const matches = (list: string[] | undefined, option: string) =>
  (list || []).some((t) => {
    const a = String(t).toLowerCase();
    const b = option.toLowerCase();
    return a === b || b.startsWith(a) || a.startsWith(b.split(' ')[0]);
  });

async function loadLogo(url?: string): Promise<{ data: string; w: number; h: number; fmt: 'PNG' | 'JPEG' } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const data = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width || 1, h: img.height || 1 });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = data;
    });
    return { data, ...dims, fmt: data.startsWith('data:image/jp') ? 'JPEG' : 'PNG' };
  } catch {
    return null;
  }
}

export async function buildHosDisciplinaryPdf(
  row: HosFormRow,
  extras: HosFormExtras,
  incidentTypeOptions: string[],
  correctiveActionOptions: string[],
): Promise<jsPDF> {
  let company: { companyName?: string; address?: string; contactPhone?: string; contactEmail?: string; logoUrl?: string } | null = null;
  try {
    const res = await getCompany();
    if (res?.success && res?.data) company = res.data;
  } catch { /* no company details */ }

  const doc = new jsPDF('p', 'mm', 'a4');
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15;
  const CW = W - 2 * M;
  let y = 0;

  const ensure = (h: number) => {
    if (y + h > H - 16) { doc.addPage(); y = M; }
  };
  const section = (label: string) => {
    ensure(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BLUE);
    doc.text(label.toUpperCase(), M, y);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.4);
    doc.line(M, y + 1.5, W - M, y + 1.5);
    y += 6.5;
    doc.setTextColor(...DARK);
  };
  const field = (label: string, value: string, x: number, width: number, labelW = 26) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(label, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    const lines: string[] = doc.splitTextToSize(value || '—', width - labelW);
    doc.text(lines[0] || '—', x + labelW, y);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(x + labelW - 1, y + 1.5, x + width - 2, y + 1.5);
  };
  const checkbox = (x: number, yy: number, checked: boolean) => {
    doc.setDrawColor(...DARK);
    doc.setLineWidth(0.25);
    doc.rect(x, yy - 3, 3.2, 3.2);
    if (checked) {
      doc.setLineWidth(0.5);
      doc.line(x + 0.5, yy - 1.5, x + 1.3, yy - 0.5);
      doc.line(x + 1.3, yy - 0.5, x + 2.8, yy - 2.7);
    }
  };
  const options = (opts: string[], selected: (o: string) => boolean, colW: number) => {
    let x = M;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    opts.forEach((o) => {
      if (x + colW > W - M + 1) { x = M; y += 5.5; ensure(8); }
      checkbox(x, y, selected(o));
      doc.setTextColor(...DARK);
      doc.text(o, x + 5, y);
      x += colW;
    });
    y += 6;
  };
  const paragraph = (text: string, size = 9) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...DARK);
    const lines: string[] = doc.splitTextToSize(text || '—', CW);
    lines.forEach((l) => { ensure(5); doc.text(l, M, y); y += 4.2; });
    y += 1.5;
  };
  const writeBox = (text: string, minLines: number) => {
    // A boxed area: filled with text when there is some, otherwise blank lines to write on
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines: string[] = text ? doc.splitTextToSize(text, CW - 6) : [];
    const rows = Math.max(minLines, lines.length);
    const h = rows * 5.5 + 3;
    ensure(h + 2);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.rect(M, y - 4, CW, h);
    for (let i = 0; i < rows; i++) {
      const ly = y + i * 5.5;
      if (lines[i]) { doc.setTextColor(...DARK); doc.text(lines[i], M + 3, ly); }
      else { doc.setDrawColor(230, 232, 236); doc.line(M + 3, ly + 1, W - M - 3, ly + 1); }
    }
    y += h + 2;
  };
  const signature = (role: string, printedName: string, date: string) => {
    ensure(21);
    const sigW = 95;
    y += 7;
    doc.setDrawColor(...DARK);
    doc.setLineWidth(0.35);
    doc.line(M, y, M + sigW, y); // blank: signed by hand
    doc.line(W - M - 50, y, W - M, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(`${role} signature`, M, y + 4.5);
    doc.text('Date', W - M - 50, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    if (date) doc.text(fmtDay(date), W - M - 50, y - 1.5);
    doc.setFontSize(9);
    doc.text(`Printed name: ${printedName || '______________________________'}`, M, y + 10);
    y += 17;
  };

  // ── Header bar ───────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 34, 'F');
  let textX = M;
  const logo = await loadLogo(company?.logoUrl);
  if (logo) {
    const box = 24;
    const s = Math.min((box - 4) / logo.w, (box - 4) / logo.h);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(M, 5, box, box, 2, 2, 'F');
    try { doc.addImage(logo.data, logo.fmt, M + (box - logo.w * s) / 2, 5 + (box - logo.h * s) / 2, logo.w * s, logo.h * s); } catch { /* skip */ }
    textX = M + box + 5;
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(company?.companyName || 'Company', textX, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const contact = [company?.address, company?.contactPhone, company?.contactEmail].filter(Boolean).join('  |  ');
  if (contact) {
    const lines: string[] = doc.splitTextToSize(contact, W - M - textX - 70);
    lines.slice(0, 3).forEach((l, i) => doc.text(l, textX, 19 + i * 3.6));
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('HOS PROGRESSIVE', W - M, 14, { align: 'right' });
  doc.text('DISCIPLINARY ACTION', W - M, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Form date: ${fmtDay(row.auditDate) || '—'}`, W - M, 27, { align: 'right' });
  y = 41;

  // ── Employee ─────────────────────────────────────────────────
  section('Employee information');
  const half = CW / 2;
  field('Employee:', row.driverName || '', M, half);
  field('Driver ID:', row.driverId || '', M + half + 2, half - 2, 22);
  y += 7;
  field('Reporting to:', row.reportingTo || '', M, half);
  field('Date:', fmtDay(row.auditDate), M + half + 2, half - 2, 22);
  y += 9;

  // ── Incident ─────────────────────────────────────────────────
  section('Incident information');
  field('Date:', fmtDay(row.incidentDate), M, half);
  field('Time:', row.incidentTime || '', M + half + 2, half - 2, 22);
  y += 7;
  field('Location:', row.incidentLocation || '', M, CW);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text('Incident type', M, y);
  y += 6;
  options(incidentTypeOptions, (o) => matches(row.incidentTypes, o), CW / 3);
  if ((row.violations || []).length) {
    doc.setFillColor(...LIGHT);
    const vText: string[] = doc.splitTextToSize(`HOS violations: ${(row.violations || []).join(', ')}`, CW - 6);
    ensure(vText.length * 5 + 4);
    doc.rect(M, y - 4, CW, vText.length * 5 + 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(vText, M + 3, y);
    y += vText.length * 5 + 4;
  }

  // ── Details ──────────────────────────────────────────────────
  section('Incident details');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Has the employee been counselled before on this or a similar HOS occurrence?', M, y);
  const prior = String(row.priorCounseling || '').toLowerCase();
  checkbox(W - M - 34, y, prior === 'yes');
  doc.text('Yes', W - M - 29, y);
  checkbox(W - M - 16, y, prior === 'no');
  doc.text('No', W - M - 11, y);
  y += 7;
  writeBox(row.notes && row.notes !== '—' ? row.notes : '', 2);

  // ── Corrective action ────────────────────────────────────────
  section('Corrective action taken');
  options(correctiveActionOptions, (o) => {
    const t = String(row.correctiveActionType || '').toLowerCase();
    return !!t && (t === o.toLowerCase() || o.toLowerCase().startsWith(t.split(' ')[0]));
  }, CW / 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text('Comments', M, y);
  y += 5;
  writeBox(row.correctiveActionComments || (row.eldMalfunction ? `ELD MALFUNCTION${row.eldMalfunctionType ? ` (${row.eldMalfunctionType})` : ''}` : ''), 2);
  signature('Manager', extras.managerSignature || row.auditorName || '', extras.managerDate);

  // ── Notice and employee comments ─────────────────────────────
  section('Notice to employee');
  paragraph(extras.noticeToEmployee.replace(/^Notice to employee:\s*/i, ''), 8.5);
  section("Employee's comments");
  const comments = extras.employeeComments && !/^employee'?s comments:?\s*$/i.test(extras.employeeComments.trim()) ? extras.employeeComments : '';
  writeBox(comments, 2);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  ensure(8);
  doc.text('My signature confirms that I have received this notice. It does not necessarily mean I agree with it.', M, y + 2);
  y += 2;
  signature('Employee', extras.employeeSignature || row.driverName || '', extras.employeeDate);

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(`${company?.companyName || ''}  ·  HOS Progressive Disciplinary Action  ·  ${row.driverName || ''}`, M, H - 8);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 8, { align: 'right' });
  }
  return doc;
}

export const hosFormFileName = (row: HosFormRow) =>
  `HOS-Disciplinary-Form-${(row.driverName || 'Driver').replace(/\s+/g, '-')}-${row.auditDate ? new Date(row.auditDate).toISOString().split('T')[0] : 'export'}.pdf`;
