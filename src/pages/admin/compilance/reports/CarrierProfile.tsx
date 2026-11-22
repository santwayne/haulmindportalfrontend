import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, Download, Trash2, ShieldCheck, ShieldAlert, TrendingUp, TrendingDown, Minus,
  FileText, AlertTriangle, CheckCircle2, XCircle, Ban, Ticket, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import {
  uploadCarrierProfile, listCarrierProfiles, getCarrierProfileDashboard, deleteCarrierProfile,
  type ProfileCountry, type ProfileDashboard, type ProfileListItem, type MonthRow, type ProfileInspection
} from '../../../../axios/api/carrierProfiles';
import { downloadExcel } from '../../../../utils/excelExport';

// Carrier Profile: everything here comes from the uploaded carrier profile document itself
// (Canadian NSC profile or US FMCSA SMS profile). It is separate from CVSA inspections:
// uploading a profile never adds or changes CVSA inspection records.

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—');
const pct = (n?: number | null) => (n === null || n === undefined ? '—' : `${n}%`);

// Manitoba NSC threshold bands, as printed on the profile
const thresholdBand = (v?: number | null) => {
  if (v === null || v === undefined) return { label: '—', cls: 'text-secondary' };
  if (v <= 40) return { label: 'Acceptable', cls: 'text-green-500' };
  if (v <= 64) return { label: 'Minor Attention Required', cls: 'text-amber-500' };
  if (v <= 84) return { label: 'Major Attention Required', cls: 'text-orange-500' };
  return { label: 'Departmental Intervention', cls: 'text-red-500' };
};

/** Arrow + signed number. `goodWhenUp` decides the colour (pass rate up is good, OOS up is bad). */
const Delta: React.FC<{ value: number | null | undefined; suffix?: string; goodWhenUp: boolean }> = ({ value, suffix = '', goodWhenUp }) => {
  if (value === null || value === undefined) return <span className="text-secondary">—</span>;
  if (value === 0) return <span className="inline-flex items-center gap-1 text-secondary"><Minus size={14} /> no change</span>;
  const up = value > 0;
  const good = up === goodWhenUp;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${good ? 'text-green-500' : 'text-red-500'}`}>
      {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {up ? '+' : ''}{Math.round(value * 10) / 10}{suffix}
    </span>
  );
};

const Kpi: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; icon: React.ReactNode; tone: string }> = ({ label, value, sub, icon, tone }) => (
  <div className="bg-card border border-theme rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium text-secondary">{label}</span>
      <span className={tone}>{icon}</span>
    </div>
    <div className={`text-2xl font-bold ${tone}`}>{value}</div>
    {sub && <div className="text-xs text-secondary mt-1">{sub}</div>}
  </div>
);

const CarrierProfile: React.FC = () => {
  const [country, setCountry] = useState<ProfileCountry>('canada');
  const [dashboard, setDashboard] = useState<ProfileDashboard | null>(null);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAllInspections, setShowAllInspections] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isUsa = country === 'usa';
  const failLabel = isUsa ? 'With violations' : 'Fail';

  const load = useCallback(async (c: ProfileCountry, profileId?: string) => {
    setLoading(true);
    const [dash, list] = await Promise.all([getCarrierProfileDashboard(c, profileId), listCarrierProfiles(c)]);
    setDashboard(dash?.success ? dash.data : null);
    setProfiles(list?.success ? list.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    setSelectedId(undefined);
    setShowAllInspections(false);
    load(country);
  }, [country, load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setMessage({ type: 'error', text: 'Please upload the carrier profile as a PDF.' });
      return;
    }
    setUploading(true);
    setMessage(null);
    const res = await uploadCarrierProfile(file);
    setUploading(false);
    if (res?.success && res.data) {
      setMessage({ type: 'success', text: res.message || 'Carrier profile saved.' });
      // Show the tab the profile belongs to (a USA profile uploaded from the Canada tab, etc.)
      const c = res.data.profile.country;
      if (c !== country) setCountry(c);
      else load(c);
    } else {
      setMessage({ type: 'error', text: res?.message || 'Could not read this carrier profile.' });
    }
  };

  const handleDelete = async (p: ProfileListItem) => {
    if (!window.confirm(`Delete the carrier profile "${p.fileName || fmtDate(p.profileDate)}"? This only removes the uploaded profile; CVSA inspections are not affected.`)) return;
    const res = await deleteCarrierProfile(p._id);
    if (res?.success) {
      setMessage({ type: 'success', text: 'Carrier profile deleted.' });
      setSelectedId(undefined);
      load(country);
    } else {
      setMessage({ type: 'error', text: res?.message || 'Could not delete the profile.' });
    }
  };

  const viewProfile = (id: string) => {
    setSelectedId(id);
    load(country, id);
  };

  const exportExcel = async () => {
    if (!dashboard) return;
    const d = dashboard;
    const name = d.profile.country === 'usa' ? 'USA' : 'Canada';
    await downloadExcel(`Carrier-Profile-${name}-${(d.profile.profileDate || '').slice(0, 10)}`, [
      {
        name: 'Month by Month',
        rows: d.monthly,
        columns: [
          { header: 'Month', width: 12, value: (m: MonthRow) => m.label },
          { header: 'Inspections', width: 12, value: (m: MonthRow) => m.inspections },
          { header: 'Pass', width: 8, value: (m: MonthRow) => m.pass },
          { header: failLabel, width: 14, value: (m: MonthRow) => m.fail },
          { header: 'OOS', width: 8, value: (m: MonthRow) => m.oos },
          { header: 'Pass Rate %', width: 12, value: (m: MonthRow) => m.passRate ?? '' },
          { header: 'OOS Rate %', width: 12, value: (m: MonthRow) => m.oosRate ?? '' },
          { header: 'Change vs Previous Month (pts)', width: 16, value: (m: MonthRow) => m.passRateChange ?? '' },
          { header: 'Tickets', width: 9, value: (m: MonthRow) => m.tickets }
        ]
      },
      {
        name: 'Inspections',
        rows: d.inspections,
        columns: [
          { header: 'Date', width: 12, value: (r: ProfileInspection) => (r.date || '').slice(0, 10) },
          { header: 'Report #', width: 18, value: (r: ProfileInspection) => r.reportNumber },
          { header: isUsa ? 'State' : 'Prov./State', width: 8, value: (r: ProfileInspection) => r.jurisdiction },
          { header: 'Location', width: 24, value: (r: ProfileInspection) => r.location },
          { header: 'Level', width: 7, value: (r: ProfileInspection) => r.level },
          { header: 'Result', width: 14, value: (r: ProfileInspection) => (r.status === 'out-of-service' ? 'OOS' : r.status === 'warning' ? 'Violations' : r.status.toUpperCase()) },
          { header: 'Unit / Plate', width: 12, value: (r: ProfileInspection) => r.vehicleUnitNo },
          { header: 'Driver', width: 22, value: (r: ProfileInspection) => r.driverName },
          { header: 'Violations', width: 50, value: (r: ProfileInspection) => (r.violations || []).map((v) => `${v.code} ${v.description}`).join('; ') }
        ]
      },
      ...(d.convictions.length ? [{
        name: 'Tickets (Convictions)',
        rows: d.convictions,
        columns: [
          { header: 'Violation Date', width: 14, value: (c: ProfileDashboard['convictions'][number]) => c.violationDate },
          { header: 'Conviction Date', width: 14, value: (c: ProfileDashboard['convictions'][number]) => c.convictionDate },
          { header: 'Offence', width: 50, value: (c: ProfileDashboard['convictions'][number]) => c.description },
          { header: 'Ticket #', width: 12, value: (c: ProfileDashboard['convictions'][number]) => c.ticketNumber },
          { header: 'Juris.', width: 7, value: (c: ProfileDashboard['convictions'][number]) => c.jurisdiction },
          { header: 'Plate', width: 10, value: (c: ProfileDashboard['convictions'][number]) => c.plate },
          { header: 'Weight', width: 8, value: (c: ProfileDashboard['convictions'][number]) => c.weight }
        ]
      }] : [])
    ]);
  };

  const d = dashboard;
  const monthsWithData = d ? d.monthly.filter((m) => m.inspections > 0 || m.tickets > 0) : [];
  const chartData = d ? d.monthly.map((m) => ({ ...m, short: m.label.replace(' 20', " '") })) : [];
  const visibleInspections = d ? (showAllInspections ? d.inspections : d.inspections.slice(0, 15)) : [];

  return (
    <div className="min-h-screen bg-main p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-headings">Carrier Profile</h1>
          <p className="text-sm text-secondary">
            Performance from your uploaded carrier profile ({isUsa ? 'FMCSA SMS' : 'NSC'}), compared month by month. Kept separate from CVSA inspections.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold !text-white bg-[var(--accent-navyblue)] hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Reading profile...' : 'Upload Carrier Profile (PDF)'}
          </button>
          <button
            type="button"
            onClick={exportExcel}
            disabled={!d}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-theme text-primary hover:bg-[var(--accent-navyblue)]/10 disabled:opacity-40"
          >
            <Download size={16} /> Download Excel
          </button>
        </div>
      </div>

      {/* Country tabs */}
      <div className="flex gap-2">
        {(['canada', 'usa'] as ProfileCountry[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCountry(c)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${country === c ? '!text-white bg-[var(--accent-navyblue)]' : 'border border-theme text-primary hover:bg-[var(--accent-navyblue)]/10'}`}
          >
            {c === 'canada' ? 'Canada (NSC Profile)' : 'USA (FMCSA SMS Profile)'}
          </button>
        ))}
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-secondary"><Loader2 className="animate-spin mr-2" /> Loading carrier profile...</div>
      ) : !d ? (
        <div className="bg-card border border-theme rounded-xl p-10 text-center">
          <FileText size={40} className="mx-auto text-secondary mb-3" />
          <h2 className="text-lg font-semibold text-headings mb-1">No {isUsa ? 'USA' : 'Canadian'} carrier profile uploaded yet</h2>
          <p className="text-sm text-secondary mb-4">
            {isUsa
              ? 'Download your SMS profile from the FMCSA website as a PDF and upload it here.'
              : 'Upload the Carrier Profile PDF from Manitoba Motor Carrier (NSC).'}
          </p>
          <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg text-sm font-semibold !text-white bg-[var(--accent-navyblue)]">
            Upload Carrier Profile (PDF)
          </button>
        </div>
      ) : (
        <>
          {/* Profile header */}
          <div className="bg-card border border-theme rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="text-lg font-bold text-headings">{d.profile.carrierName || 'Carrier'}</div>
              <div className="text-sm text-secondary">
                {d.profile.nscNumber && <>NSC # {d.profile.nscNumber} · </>}
                {d.profile.usdotNumber && <>US DOT # {d.profile.usdotNumber} · </>}
                Profile {isUsa ? 'record ending' : 'dated'} {fmtDate(d.profile.profileDate)} · Uploaded {fmtDate(d.profile.uploadedAt)}
              </div>
              {d.profile.readBy === 'ai' && (
                <div className="text-xs text-amber-500 mt-1">This profile layout was read by AI. Compare the totals with the document.</div>
              )}
            </div>
            {!isUsa && (
              <div className="flex items-center gap-3">
                {d.profile.safetyRating && /satisfactory/i.test(d.profile.safetyRating) && !/un/i.test(d.profile.safetyRating)
                  ? <ShieldCheck className="text-green-500" size={28} />
                  : <ShieldAlert className="text-amber-500" size={28} />}
                <div>
                  <div className="text-xs text-secondary">Safety Rating</div>
                  <div className="text-lg font-bold text-headings">{d.profile.safetyRating || '—'}</div>
                </div>
              </div>
            )}
          </div>

          {d.profile.checks.length > 0 && (
            <div className="rounded-lg px-4 py-3 text-sm bg-amber-500/10 text-amber-600 border border-amber-500/30">
              <div className="font-semibold mb-1">Check against the document:</div>
              <ul className="list-disc pl-5">{d.profile.checks.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}

          {/* KPIs: straight from the profile */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi label="Inspections (24 months)" value={d.summary.inspections} icon={<FileText size={18} />} tone="text-headings" />
            <Kpi label="Pass" value={d.summary.pass} sub={`Pass rate ${pct(d.summary.passRate)}`} icon={<CheckCircle2 size={18} />} tone="text-green-500" />
            <Kpi label={failLabel} value={d.summary.fail} sub={isUsa ? 'Violations written, not OOS' : undefined} icon={<XCircle size={18} />} tone="text-amber-500" />
            <Kpi label="Out of Service" value={d.summary.oos} sub={`OOS rate ${pct(d.summary.oosRate)}`} icon={<Ban size={18} />} tone="text-red-500" />
            {isUsa ? (
              <Kpi label="Violations" value={d.summary.violations} sub="Across all inspections" icon={<AlertTriangle size={18} />} tone="text-orange-500" />
            ) : (
              <Kpi label="Tickets (Convictions)" value={d.summary.tickets} sub={`${d.summary.ticketsLast12} in the last 12 months`} icon={<Ticket size={18} />} tone="text-orange-500" />
            )}
            {isUsa ? (
              <Kpi label="Last 12 months" value={`${d.last12.inspections} insp.`} sub={`Pass ${pct(d.last12.passRate)} · OOS ${pct(d.last12.oosRate)}`} icon={<TrendingUp size={18} />} tone="text-headings" />
            ) : (
              <Kpi label="Accidents" value={d.profile.accidents ?? '—'} sub={d.profile.fleet?.current ? `Current MB fleet ${d.profile.fleet.current}` : undefined} icon={<AlertTriangle size={18} />} tone="text-headings" />
            )}
          </div>

          {/* Thresholds (Canadian NSC only) */}
          {!isUsa && d.profile.thresholds && (
            <div className="bg-card border border-theme rounded-xl p-5">
              <h2 className="text-base font-bold text-headings mb-3">Performance Rating (from the profile)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {([['Overall', d.profile.thresholds.overall], ['Inspection', d.profile.thresholds.inspection], ['Conviction', d.profile.thresholds.conviction], ['Accident', d.profile.thresholds.accident]] as [string, number | null][]).map(([label, v]) => {
                  const band = thresholdBand(v);
                  return (
                    <div key={label}>
                      <div className="text-xs text-secondary">{label} Threshold</div>
                      <div className="text-xl font-bold text-headings">{pct(v)}</div>
                      <div className="w-full h-2 rounded bg-gray-500/20 mt-1 overflow-hidden">
                        <div className="h-2 rounded bg-[var(--accent-navyblue)]" style={{ width: `${Math.min(100, v || 0)}%` }} />
                      </div>
                      <div className={`text-xs mt-1 ${band.cls}`}>{band.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Going up or down? */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-theme rounded-xl p-5">
              <h2 className="text-base font-bold text-headings mb-3">Last 12 months vs the 12 months before</h2>
              <table className="w-full text-sm">
                <thead className="text-secondary text-xs">
                  <tr><th className="text-left py-1"></th><th className="text-right">Last 12</th><th className="text-right">Prior 12</th><th className="text-right">Change</th></tr>
                </thead>
                <tbody className="text-primary">
                  <tr className="border-t border-theme"><td className="py-2">Inspections</td><td className="text-right">{d.last12.inspections}</td><td className="text-right">{d.prior12.inspections}</td><td className="text-right"><Delta value={d.last12.inspections - d.prior12.inspections} goodWhenUp={true} /></td></tr>
                  <tr className="border-t border-theme"><td className="py-2">Pass rate</td><td className="text-right">{pct(d.last12.passRate)}</td><td className="text-right">{pct(d.prior12.passRate)}</td><td className="text-right"><Delta value={d.last12.passRate !== null && d.prior12.passRate !== null ? d.last12.passRate - d.prior12.passRate : null} suffix=" pts" goodWhenUp={true} /></td></tr>
                  <tr className="border-t border-theme"><td className="py-2">OOS rate</td><td className="text-right">{pct(d.last12.oosRate)}</td><td className="text-right">{pct(d.prior12.oosRate)}</td><td className="text-right"><Delta value={d.last12.oosRate !== null && d.prior12.oosRate !== null ? d.last12.oosRate - d.prior12.oosRate : null} suffix=" pts" goodWhenUp={false} /></td></tr>
                  {!isUsa && <tr className="border-t border-theme"><td className="py-2">Tickets</td><td className="text-right">{d.last12.tickets}</td><td className="text-right">{d.prior12.tickets}</td><td className="text-right"><Delta value={d.last12.tickets - d.prior12.tickets} goodWhenUp={false} /></td></tr>}
                </tbody>
              </table>
            </div>

            <div className="bg-card border border-theme rounded-xl p-5">
              <h2 className="text-base font-bold text-headings mb-3">Compared with your previous upload</h2>
              {d.comparison ? (
                <>
                  <p className="text-xs text-secondary mb-2">Previous profile {isUsa ? 'ending' : 'dated'} {fmtDate(d.comparison.previousProfileDate)}</p>
                  <div className="grid grid-cols-2 gap-y-2 text-sm text-primary">
                    <span>Pass rate</span><Delta value={d.comparison.passRate} suffix=" pts" goodWhenUp={true} />
                    <span>OOS rate</span><Delta value={d.comparison.oosRate} suffix=" pts" goodWhenUp={false} />
                    <span>OOS inspections</span><Delta value={d.comparison.oos} goodWhenUp={false} />
                    {!isUsa && <><span>Tickets</span><Delta value={d.comparison.tickets} goodWhenUp={false} /></>}
                    {!isUsa && <><span>Overall threshold</span><Delta value={d.comparison.overallThreshold} suffix=" pts" goodWhenUp={false} /></>}
                    {!isUsa && d.comparison.safetyRatingBefore !== d.comparison.safetyRatingNow && (
                      <><span>Safety rating</span><span className="font-semibold">{d.comparison.safetyRatingBefore || '—'} → {d.comparison.safetyRatingNow || '—'}</span></>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-secondary">Upload next month's profile to see how this changes from one profile to the next.</p>
              )}
            </div>
          </div>

          {/* Month by month */}
          <div className="bg-card border border-theme rounded-xl p-5">
            <h2 className="text-base font-bold text-headings mb-1">Month by month</h2>
            <p className="text-xs text-secondary mb-4">Inspections per month by result, with the pass rate line. Arrows compare each month with the previous month that had inspections.</p>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey="short" minTickGap={12} tick={{ fontSize: 11, fill: 'var(--text-secondary, #94a3b8)' }} interval="preserveStartEnd" />
                  <YAxis yAxisId="n" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-secondary, #94a3b8)' }} />
                  <YAxis yAxisId="r" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: 'var(--text-secondary, #94a3b8)' }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="n" dataKey="pass" name="Pass" stackId="r" fill="#22c55e" />
                  <Bar yAxisId="n" dataKey="fail" name={failLabel} stackId="r" fill="#d97706" />
                  <Bar yAxisId="n" dataKey="oos" name="OOS" stackId="r" fill="#ef4444" />
                  <Line yAxisId="r" type="linear" dataKey="passRate" name="Pass rate %" stroke="#10B981" strokeWidth={2} connectNulls dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto mt-4">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-secondary text-xs uppercase">
                  <tr>
                    <th className="text-left py-2">Month</th><th className="text-right">Inspections</th><th className="text-right">Pass</th>
                    <th className="text-right">{failLabel}</th><th className="text-right">OOS</th><th className="text-right">Pass rate</th>
                    <th className="text-right">vs previous</th>{!isUsa && <th className="text-right">Tickets</th>}
                  </tr>
                </thead>
                <tbody className="text-primary">
                  {[...monthsWithData].reverse().map((m) => (
                    <tr key={m.month} className="border-t border-theme">
                      <td className="py-2">{m.label}</td>
                      <td className="text-right">{m.inspections}</td>
                      <td className="text-right text-green-500">{m.pass}</td>
                      <td className="text-right text-amber-500">{m.fail}</td>
                      <td className="text-right text-red-500">{m.oos}</td>
                      <td className="text-right">{pct(m.passRate)}</td>
                      <td className="text-right"><Delta value={m.passRateChange} suffix=" pts" goodWhenUp={true} /></td>
                      {!isUsa && <td className="text-right">{m.tickets || ''}</td>}
                    </tr>
                  ))}
                  {monthsWithData.length === 0 && <tr><td colSpan={8} className="py-4 text-center text-secondary">No inspections in this profile.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Defect / violation categories */}
            <div className="bg-card border border-theme rounded-xl p-5">
              <h2 className="text-base font-bold text-headings mb-3">{isUsa ? 'Violations by category' : 'CVSA defects by category'}</h2>
              {d.categories.length === 0 ? <p className="text-sm text-secondary">None listed on the profile.</p> : (
                <div className="space-y-2">
                  {d.categories.slice(0, 10).map((c) => {
                    const max = d.categories[0].count || 1;
                    return (
                      <div key={c.name}>
                        <div className="flex justify-between text-sm text-primary"><span>{c.name}</span><span className="font-semibold">{c.count}</span></div>
                        <div className="h-2 rounded bg-gray-500/20"><div className="h-2 rounded bg-orange-500" style={{ width: `${(c.count / max) * 100}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tickets (Canada) / profile list */}
            {!isUsa ? (
              <div className="bg-card border border-theme rounded-xl p-5">
                <h2 className="text-base font-bold text-headings mb-3">Tickets (convictions) on the profile</h2>
                {d.convictions.length === 0 ? <p className="text-sm text-secondary">No convictions listed.</p> : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {d.convictions.map((c) => (
                      <div key={c.ticketNumber} className="border-b border-theme pb-2">
                        <div className="text-sm font-semibold text-primary">{c.description}</div>
                        <div className="text-xs text-secondary">
                          Ticket {c.ticketNumber} · {c.jurisdiction} · Violation {fmtDate(c.violationDate)} · Convicted {fmtDate(c.convictionDate)} · Plate {c.plate} · Weight {c.weight}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card border border-theme rounded-xl p-5">
                <h2 className="text-base font-bold text-headings mb-3">How results are counted</h2>
                <p className="text-sm text-secondary">
                  The FMCSA SMS profile has no Pass/Fail column, so each inspection's result comes from its violations:
                  no violations = Pass, violations without an out-of-service order = With violations, any OOS violation = Out of Service.
                </p>
              </div>
            )}
          </div>

          {/* Inspections from the profile */}
          <div className="bg-card border border-theme rounded-xl p-5">
            <h2 className="text-base font-bold text-headings mb-3">Inspections listed on the profile ({d.inspections.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-secondary text-xs uppercase">
                  <tr>
                    <th className="text-left py-2">Date</th><th className="text-left">Report #</th><th className="text-left">{isUsa ? 'State' : 'Prov.'}</th>
                    <th className="text-left">Location</th>{!isUsa && <th className="text-left">Level</th>}<th className="text-left">Unit / Plate</th>
                    {!isUsa && <th className="text-left">Driver</th>}<th className="text-left">Result</th>{isUsa && <th className="text-left">Violations</th>}
                  </tr>
                </thead>
                <tbody className="text-primary">
                  {visibleInspections.map((r, i) => (
                    <tr key={`${r.reportNumber}-${i}`} className="border-t border-theme align-top">
                      <td className="py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td>{r.reportNumber}</td>
                      <td>{r.jurisdiction}</td>
                      <td>{r.location}</td>
                      {!isUsa && <td>{r.level}</td>}
                      <td>{r.vehicleUnitNo}</td>
                      {!isUsa && <td>{r.driverName}</td>}
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${r.status === 'pass' ? 'bg-green-100 text-green-700' : r.status === 'out-of-service' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.status === 'out-of-service' ? 'OOS' : r.status === 'warning' ? 'Violations' : r.status}
                        </span>
                      </td>
                      {isUsa && <td className="text-xs text-secondary">{(r.violations || []).map((v) => v.code).join(', ') || '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {d.inspections.length > 15 && (
              <button type="button" onClick={() => setShowAllInspections(!showAllInspections)} className="mt-3 text-sm font-semibold text-[var(--accent-blue)] flex items-center gap-1">
                {showAllInspections ? <><ChevronUp size={16} /> Show fewer</> : <><ChevronDown size={16} /> Show all {d.inspections.length}</>}
              </button>
            )}
          </div>
        </>
      )}

      {/* Uploaded profiles */}
      {!loading && profiles.length > 0 && (
        <div className="bg-card border border-theme rounded-xl p-5">
          <h2 className="text-base font-bold text-headings mb-3">Uploaded {isUsa ? 'USA' : 'Canadian'} profiles</h2>
          <div className="space-y-2">
            {profiles.map((p) => {
              const active = d?.profile._id === p._id || (!selectedId && profiles[0]._id === p._id);
              return (
                <div key={p._id} className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 border rounded-lg px-3 py-2 ${active ? 'border-[var(--accent-navyblue)]' : 'border-theme'}`}>
                  <div className="text-sm">
                    <div className="font-semibold text-primary break-all">{p.fileName || 'Carrier profile'}</div>
                    <div className="text-xs text-secondary">
                      {isUsa ? 'Record ending' : 'Profile dated'} {fmtDate(p.profileDate)} · {p.inspections} inspections{!isUsa ? ` · ${p.tickets} tickets` : ''} · uploaded {fmtDate(p.uploadedAt)}{p.uploadedBy ? ` by ${p.uploadedBy}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!active && (
                      <button type="button" onClick={() => viewProfile(p._id)} className="px-3 py-1 text-xs font-semibold rounded border border-theme text-primary">View</button>
                    )}
                    <button type="button" onClick={() => handleDelete(p)} className="px-3 py-1 text-xs font-semibold rounded border border-red-500/40 text-red-500 flex items-center gap-1">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CarrierProfile;
