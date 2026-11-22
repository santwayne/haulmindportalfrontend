import jsPDF from 'jspdf';

// PDF reports for Health & Safety incidents: one incident in full, or a register
// of many. Built with plain jsPDF so no extra dependency is needed.

type AnyIncident = Record<string, any>;

const fmtDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
};

const label = (value?: string | null) => (value ? String(value).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—');

class PdfWriter {
  doc = new jsPDF();
  margin = 16;
  y = 16;
  pageWidth = this.doc.internal.pageSize.width;
  pageHeight = this.doc.internal.pageSize.height;

  ensure(space: number) {
    if (this.y + space > this.pageHeight - 16) {
      this.doc.addPage();
      this.y = this.margin;
    }
  }

  header(title: string, subtitle: string) {
    this.doc.setFillColor(30, 58, 138);
    this.doc.rect(0, 0, this.pageWidth, 28, 'F');
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(17);
    this.doc.text(title, this.margin, 13);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.text(subtitle, this.margin, 21);
    this.y = 38;
  }

  section(title: string) {
    this.ensure(16);
    this.doc.setTextColor(30, 41, 59);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text(title, this.margin, this.y);
    this.y += 2;
    this.doc.setDrawColor(30, 58, 138);
    this.doc.setLineWidth(0.4);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 6;
  }

  fields(rows: Array<[string, any]>) {
    this.doc.setFontSize(9.5);
    for (const [k, v] of rows) {
      const value = v === undefined || v === null || v === '' ? '—' : String(v);
      const lines = this.doc.splitTextToSize(value, this.pageWidth - this.margin * 2 - 55);
      this.ensure(lines.length * 5 + 2);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(k, this.margin, this.y);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(15, 23, 42);
      this.doc.text(lines, this.margin + 55, this.y);
      this.y += lines.length * 5 + 1.5;
    }
    this.y += 3;
  }

  paragraph(text?: string | null) {
    const lines = this.doc.splitTextToSize(text && text.trim() ? text : '—', this.pageWidth - this.margin * 2);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(15, 23, 42);
    for (const line of lines) {
      this.ensure(5);
      this.doc.text(line, this.margin, this.y);
      this.y += 5;
    }
    this.y += 3;
  }

  table(headers: string[], widths: number[], rows: string[][]) {
    const rowH = 6;
    const totalW = widths.reduce((a, b) => a + b, 0);
    const drawHeader = () => {
      this.doc.setFillColor(226, 232, 240);
      this.doc.rect(this.margin, this.y - 4.5, totalW, rowH, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8);
      this.doc.setTextColor(30, 41, 59);
      let x = this.margin;
      headers.forEach((h, i) => {
        this.doc.text(h, x + 1.5, this.y);
        x += widths[i];
      });
      this.y += rowH;
    };
    this.ensure(rowH * 3);
    drawHeader();
    rows.forEach((row, r) => {
      if (this.y + rowH > this.pageHeight - 16) {
        this.doc.addPage();
        this.y = this.margin;
        drawHeader();
      }
      if (r % 2 === 1) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(this.margin, this.y - 4.5, totalW, rowH, 'F');
      }
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(15, 23, 42);
      let x = this.margin;
      row.forEach((cell, i) => {
        const text = this.doc.splitTextToSize(cell || '—', widths[i] - 3)[0] || '';
        this.doc.text(text, x + 1.5, this.y);
        x += widths[i];
      });
      this.y += rowH;
    });
    this.y += 4;
  }

  save(fileName: string) {
    const pages = this.doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      this.doc.setPage(i);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(148, 163, 184);
      this.doc.text(`Generated ${new Date().toLocaleString()} · Page ${i} of ${pages}`, this.pageWidth - this.margin, this.pageHeight - 8, { align: 'right' });
    }
    this.doc.save(fileName);
  }
}

/** Full report for a single incident. */
export const downloadIncidentReport = (incident: AnyIncident) => {
  const w = new PdfWriter();
  w.header(`Incident Report — ${incident.incidentNumber || ''}`, `${incident.type || 'Incident'} · Status: ${label(incident.status)}`);

  w.section('Incident Details');
  w.fields([
    ['Incident #', incident.incidentNumber],
    ['Type', incident.type],
    ['Date & time', `${fmtDate(incident.date)}${incident.time ? ` ${incident.time}` : ''}`],
    ['Location', incident.location],
    ['Location type', label(incident.locationType)],
    ['Severity', label(incident.severity)],
    ['Status', label(incident.status)],
    ['Injury involved', incident.hasInjury ? 'Yes' : 'No'],
    ['Reported by', `${incident.reportedBy || '—'}${incident.reportedByRole ? ` (${incident.reportedByRole})` : ''}`],
  ]);

  w.section('Description');
  w.paragraph(incident.description);
  if (incident.immediateActionTaken) {
    w.section('Immediate Action Taken');
    w.paragraph(incident.immediateActionTaken);
  }

  const inv = incident.investigation;
  if (inv) {
    w.section('Investigation & Root Cause');
    w.fields([
      ['Investigation lead', inv.investigationLead],
      ['Method', inv.rootCauseType === '5-why' || inv.rootCauseAnalysisMethod === '5-why' ? '5-Why' : label(inv.rootCauseType || inv.rootCauseAnalysisMethod)],
      ['Root cause', inv.rootCause],
      ['Completed', fmtDate(inv.completedDate)],
    ]);
    if (Array.isArray(inv.fiveWhys) && inv.fiveWhys.some(Boolean)) {
      w.fields(inv.fiveWhys.filter(Boolean).map((why: string, i: number) => [`Why ${i + 1}`, why] as [string, string]));
    }
    if (inv.fishboneData) {
      w.fields(Object.entries(inv.fishboneData).filter(([, v]) => v).map(([k, v]) => [label(k), v] as [string, any]));
    }
    if (inv.analysis) w.paragraph(inv.analysis);
  }

  if (incident.capa) {
    w.section('Corrective Action (CAPA)');
    w.fields([
      ['CAPA #', incident.capa.capaNumber],
      ['Assigned to', incident.capa.assignedToName || incident.capa.assignedTo?.name],
      ['Due date', fmtDate(incident.capa.dueDate)],
      ['Status', label(incident.capa.status)],
      ['Description', incident.capa.description],
    ]);
  }

  const inj = incident.injuryRecord;
  if (inj) {
    w.section('Injury & Return to Work');
    w.fields([
      ['Injured worker', inj.injuredWorker],
      ['Injury date', fmtDate(inj.injuryDate)],
      ['Injury type', inj.injuryType],
      ['Body part', inj.bodyPart],
      ['Severity', label(inj.severity)],
      ['WCB/WSIB claim #', inj.wcbClaimNumber || incident.wcbClaimNumber],
      ['Doctor restrictions', inj.doctorRestrictions],
      ['Modified duty plan', inj.modifiedDutyPlan],
    ]);
    if (Array.isArray(inj.progressNotes) && inj.progressNotes.length) {
      w.table(['Date', 'Note', 'By'], [28, 120, 30], inj.progressNotes.map((n: any) => [fmtDate(n.date), n.note || '', n.enteredBy || '']));
    }
  }

  const statements = [...(incident.workerStatements || []), ...(incident.witnessReports || []), ...(incident.witnessStatements || [])];
  if (statements.length) {
    w.section('Statements');
    statements.forEach((st: any) => {
      w.fields([['Name', `${st.witnessName || st.name || '—'}${st.witnessRole ? ` (${st.witnessRole})` : ''}`], ['Date', fmtDate(st.dateProvided || st.date)]]);
      w.paragraph(st.statement);
    });
  }

  const evidence = [...(incident.photoEvidence || []), ...(incident.videoEvidence || [])];
  if (evidence.length) {
    w.section('Evidence on File');
    w.table(['File', 'Type', 'Uploaded'], [110, 30, 38], evidence.map((e: any) => [e.fileName || 'File', label(e.fileType), fmtDate(e.uploadedAt)]));
  }

  if (incident.status === 'closed' || incident.closedAt) {
    w.section('Closure');
    w.fields([
      ['Closed on', fmtDate(incident.closedAt)],
      ['Closed by', incident.closedByName],
      ['Closure notes', incident.closureNotes],
    ]);
  }

  w.save(`incident-${incident.incidentNumber || 'report'}.pdf`);
};

/** Register of incidents (e.g. the filtered list on the page). */
export const downloadIncidentRegister = (incidents: AnyIncident[], filterSummary: string) => {
  const w = new PdfWriter();
  w.header('Incident Register', filterSummary);

  const count = (fn: (i: AnyIncident) => boolean) => incidents.filter(fn).length;
  w.section('Summary');
  w.fields([
    ['Incidents', incidents.length],
    ['Open / investigating', count((i) => ['open', 'investigating', 'action-required'].includes(i.status))],
    ['Resolved / closed', count((i) => ['resolved', 'closed'].includes(i.status))],
    ['With injury', count((i) => i.hasInjury)],
    ['High / critical severity', count((i) => ['high', 'critical'].includes(i.severity))],
  ]);

  w.section('Incidents');
  w.table(
    ['Incident #', 'Date', 'Type', 'Location', 'Severity', 'Status', 'Injury'],
    [26, 22, 32, 50, 18, 18, 12],
    incidents.map((i) => [
      i.incidentNumber || '',
      fmtDate(i.date),
      i.type || '',
      i.location || '',
      label(i.severity),
      label(i.status),
      i.hasInjury ? 'Yes' : 'No',
    ])
  );

  w.save(`incident-register-${new Date().toISOString().split('T')[0]}.pdf`);
};
