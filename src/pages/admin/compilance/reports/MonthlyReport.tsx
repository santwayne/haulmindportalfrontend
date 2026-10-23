import React, { useState, useEffect } from 'react';
import {
  FaChartBar,
  FaChartPie,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaBan,
  FaFlag,
  FaFlagUsa,
  FaTruck,
  FaUser,
  FaDownload,
  FaShieldAlt,
  FaExclamationCircle,
  FaTachometerAlt,
  FaInfoCircle,
  FaCalendarAlt,
  FaDatabase,
  FaTrashAlt,
  FaUpload
} from 'react-icons/fa';
import { getCvsaMonthlyReport, deleteOldCvsaData, uploadCarrierProfileDocument, saveCarrierProfileData, getCarrierPerformance } from '../../../../axios/api/admin';
import { getViolationsForMonthlyReport, getViolationStats } from '../../../../axios/api/violations';
import jsPDF from 'jspdf';
import DocLogo from '../../../../assets/doclogo.png';

// Types
interface MonthlyStats {
  month: string;
  year: number;
  totalInspections: number;
  passCount: number;
  failCount: number;
  warningCount: number;
  outOfServiceCount: number;
  canadaInspections: number;
  usaInspections: number;
  vehiclesInspected: number;
  driversInspected: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    borderWidth: number;
  }[];
}

interface TwoYearData {
  year1: {
    totalInspections: number;
    passCount: number;
    failCount: number;
    warningCount: number;
    outOfServiceCount: number;
    passRate: number;
    year: number;
  };
  year2: {
    totalInspections: number;
    passCount: number;
    failCount: number;
    warningCount: number;
    outOfServiceCount: number;
    passRate: number;
    year: number;
  };
  summary: {
    totalInspections: number;
    totalPass: number;
    totalFail: number;
    totalWarning: number;
    totalOutOfService: number;
    overallPassRate: number;
    period: string;
  };
}


interface OldDataPreview {
  cutoffDate: string;
  inspections: {
    total: number;
    preview: Array<{
      _id: string;
      inspectionId: string;
      date: string;
      status: string;
      country: string;
      location: string;
      vehicle: { unitNo: string; licensePlate: string } | null;
      driver: { name: string; email: string } | null;
      inspectorName: string;
      violationsCount: number;
    }>;
    byStatus: {
      pass: number;
      fail: number;
      warning: number;
      outOfService: number;
    };
    oldestDate: string | null;
  };
  tickets: {
    total: number;
    preview: Array<{
      _id: string;
      ticketNumber: string;
      dateIssued: string;
      violationType: string;
      violationDescription: string;
      status: string;
      amount: number;
      country: string;
      location: string;
      vehicle: { unitNo: string; licensePlate: string } | null;
      driver: { name: string; email: string } | null;
      officerName: string;
    }>;
    byStatus: {
      paid: number;
      unpaid: number;
      fight: number;
      dismissed: number;
      reduced: number;
    };
    oldestDate: string | null;
  };
}


const sanitizeNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeMonthlyStat = (stat: Partial<MonthlyStats>): MonthlyStats => ({
  month: stat.month || '',
  year: sanitizeNumber(stat.year) || new Date().getFullYear(),
  totalInspections: sanitizeNumber(stat.totalInspections),
  passCount: sanitizeNumber(stat.passCount),
  failCount: sanitizeNumber(stat.failCount),
  warningCount: sanitizeNumber(stat.warningCount),
  outOfServiceCount: sanitizeNumber(stat.outOfServiceCount),
  canadaInspections: sanitizeNumber(stat.canadaInspections),
  usaInspections: sanitizeNumber(stat.usaInspections),
  vehiclesInspected: sanitizeNumber(stat.vehiclesInspected),
  driversInspected: sanitizeNumber(stat.driversInspected),
});

const MonthlyReport: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<'all' | 'canada' | 'usa'>('all');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [currentMonthData, setCurrentMonthData] = useState<MonthlyStats | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [violationStats, setViolationStats] = useState<any>(null);
  const [, setRealViolationsData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showExtractedDataModal, setShowExtractedDataModal] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);
  const [carrierPerformance, setCarrierPerformance] = useState<any>(null);
  const [performanceLoading, setPerformanceLoading] = useState<boolean>(false);

  // Calculate 2-year performance data statically from monthlyData
  const calculateTwoYearData = (): TwoYearData | null => {
    if (monthlyData.length === 0) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    // Filter data for last 2 years
    const year1Data = monthlyData.filter(d => d.year === lastYear);
    const year2Data = monthlyData.filter(d => d.year === currentYear);

    const year1Stats = {
      totalInspections: year1Data.reduce((sum, d) => sum + d.totalInspections, 0),
      passCount: year1Data.reduce((sum, d) => sum + d.passCount, 0),
      failCount: year1Data.reduce((sum, d) => sum + d.failCount, 0),
      warningCount: year1Data.reduce((sum, d) => sum + d.warningCount, 0),
      outOfServiceCount: year1Data.reduce((sum, d) => sum + d.outOfServiceCount, 0),
      passRate: 0,
      year: lastYear
    };
    year1Stats.passRate = year1Stats.totalInspections > 0
      ? Math.round((year1Stats.passCount / year1Stats.totalInspections) * 100)
      : 0;

    const year2Stats = {
      totalInspections: year2Data.reduce((sum, d) => sum + d.totalInspections, 0),
      passCount: year2Data.reduce((sum, d) => sum + d.passCount, 0),
      failCount: year2Data.reduce((sum, d) => sum + d.failCount, 0),
      warningCount: year2Data.reduce((sum, d) => sum + d.warningCount, 0),
      outOfServiceCount: year2Data.reduce((sum, d) => sum + d.outOfServiceCount, 0),
      passRate: 0,
      year: currentYear
    };
    year2Stats.passRate = year2Stats.totalInspections > 0
      ? Math.round((year2Stats.passCount / year2Stats.totalInspections) * 100)
      : 0;

    const totalInspections = year1Stats.totalInspections + year2Stats.totalInspections;
    const totalPass = year1Stats.passCount + year2Stats.passCount;

    return {
      year1: year1Stats,
      year2: year2Stats,
      summary: {
        totalInspections,
        totalPass,
        totalFail: year1Stats.failCount + year2Stats.failCount,
        totalWarning: year1Stats.warningCount + year2Stats.warningCount,
        totalOutOfService: year1Stats.outOfServiceCount + year2Stats.outOfServiceCount,
        overallPassRate: totalInspections > 0 ? Math.round((totalPass / totalInspections) * 100) : 0,
        period: `${lastYear} - ${currentYear}`
      }
    };
  };

  // Calculate audit compliance score with real violation data
  const calculateComplianceScore = () => {
    const twoYearData = calculateTwoYearData();
    if (!twoYearData) return null;

    const totalInspections = twoYearData.summary.totalInspections;
    const passCount = twoYearData.summary.totalPass;
    const failCount = twoYearData.summary.totalFail;
    const warningCount = twoYearData.summary.totalWarning;
    const outOfServiceCount = twoYearData.summary.totalOutOfService;

    // Calculate inspection score
    const inspectionScore = totalInspections > 0 ? (passCount / totalInspections) * 100 : 0;

    // Use real violation data if available, otherwise estimate
    let totalViolations = 0;
    let speedingCount = 0;
    let totalTickets = 0;
    let violationPenalty = 0;

    if (violationStats && violationStats.total > 0) {
      // Real data from Geotab/manual entries
      totalViolations = violationStats.total;
      speedingCount = violationStats.byType?.speeding || 0;

      // Count other serious violations as "tickets"
      const harshBraking = violationStats.byType?.['harsh-braking'] || 0;
      const harshAcceleration = violationStats.byType?.['harsh-acceleration'] || 0;
      const trafficLight = violationStats.byType?.['traffic-light'] || 0;
      const laneViolation = violationStats.byType?.['lane-violation'] || 0;
      totalTickets = harshBraking + harshAcceleration + trafficLight + laneViolation;

      // Calculate penalty based on severity
      const criticalCount = violationStats.bySeverity?.critical || 0;
      const majorCount = violationStats.bySeverity?.major || 0;
      const moderateCount = violationStats.bySeverity?.moderate || 0;

      // Weighted penalty: critical=5, major=3, moderate=1
      violationPenalty = Math.min((criticalCount * 5 + majorCount * 3 + moderateCount * 1), 30);
    } else {
      // Fallback to estimates if no real data
      totalTickets = Math.floor(totalInspections * 0.1);
      speedingCount = Math.floor(totalInspections * 0.05);
      violationPenalty = Math.min((totalTickets + speedingCount) * 2, 30);
      totalViolations = totalTickets + speedingCount;
    }

    const finalScore = Math.max(0, Math.min(100, inspectionScore - violationPenalty));

    return {
      score: Math.round(finalScore),
      eligibleForAudit: finalScore >= 80,
      usingRealData: violationStats && violationStats.total > 0,
      breakdown: {
        inspectionScore,
        violationPenalty,
        totalInspections,
        passCount,
        failCount,
        warningCount,
        outOfServiceCount,
        totalTickets,
        speedingCount,
        totalViolations
      }
    };
  };

  // Calculate old data statically (data older than 2 years from monthlyData)
  const calculateOldData = (): OldDataPreview | null => {
    if (monthlyData.length === 0) return null;

    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(now.getFullYear() - 2);
    twoYearsAgo.setHours(0, 0, 0, 0);

    // Get data older than 2 years
    const oldDataMonths = monthlyData.filter(d => {
      const monthDate = new Date(`${d.month} 1, ${d.year}`);
      return monthDate < twoYearsAgo;
    });

    if (oldDataMonths.length === 0) return null;

    const totalOldInspections = oldDataMonths.reduce((sum, d) => sum + d.totalInspections, 0);
    const oldPass = oldDataMonths.reduce((sum, d) => sum + d.passCount, 0);
    const oldFail = oldDataMonths.reduce((sum, d) => sum + d.failCount, 0);
    const oldWarning = oldDataMonths.reduce((sum, d) => sum + d.warningCount, 0);
    const oldOutOfService = oldDataMonths.reduce((sum, d) => sum + d.outOfServiceCount, 0);

    // Create sample preview data (static)
    const sampleInspections = Array.from({ length: Math.min(20, totalOldInspections) }, (_, i) => ({
      _id: `old-inspection-${i}`,
      inspectionId: `CVSA-${twoYearsAgo.getFullYear() - 1}-${String(i + 1).padStart(4, '0')}`,
      date: new Date(twoYearsAgo.getTime() - (i * 86400000)).toISOString(),
      status: i % 4 === 0 ? 'pass' : i % 4 === 1 ? 'fail' : i % 4 === 2 ? 'warning' : 'out-of-service',
      country: i % 2 === 0 ? 'canada' : 'usa',
      location: `Location ${i + 1}`,
      vehicle: { unitNo: `UNIT-${i + 1}`, licensePlate: `PLATE-${i + 1}` },
      driver: { name: `Driver ${i + 1}`, email: `driver${i + 1}@example.com` },
      inspectorName: `Inspector ${i + 1}`,
      violationsCount: i % 3
    }));

    const estimatedOldTickets = Math.floor(totalOldInspections * 0.1);
    const sampleTickets = Array.from({ length: Math.min(20, estimatedOldTickets) }, (_, i) => ({
      _id: `old-ticket-${i}`,
      ticketNumber: `TK-${twoYearsAgo.getFullYear() - 1}-${String(i + 1).padStart(4, '0')}`,
      dateIssued: new Date(twoYearsAgo.getTime() - (i * 86400000)).toISOString(),
      violationType: ['Speeding', 'Traffic Light', 'Parking', 'Lane Violation'][i % 4],
      violationDescription: `Violation description ${i + 1}`,
      status: ['paid', 'unpaid', 'dismissed', 'fight'][i % 4] as any,
      amount: (i + 1) * 50,
      country: i % 2 === 0 ? 'canada' : 'usa',
      location: `Location ${i + 1}`,
      vehicle: { unitNo: `UNIT-${i + 1}`, licensePlate: `PLATE-${i + 1}` },
      driver: { name: `Driver ${i + 1}`, email: `driver${i + 1}@example.com` },
      officerName: `Officer ${i + 1}`
    }));

    return {
      cutoffDate: twoYearsAgo.toISOString(),
      inspections: {
        total: totalOldInspections,
        preview: sampleInspections,
        byStatus: {
          pass: oldPass,
          fail: oldFail,
          warning: oldWarning,
          outOfService: oldOutOfService
        },
        oldestDate: oldDataMonths.length > 0 ? new Date(`${oldDataMonths[oldDataMonths.length - 1].month} 1, ${oldDataMonths[oldDataMonths.length - 1].year}`).toISOString() : null
      },
      tickets: {
        total: estimatedOldTickets,
        preview: sampleTickets,
        byStatus: {
          paid: Math.floor(estimatedOldTickets * 0.4),
          unpaid: Math.floor(estimatedOldTickets * 0.3),
          fight: Math.floor(estimatedOldTickets * 0.1),
          dismissed: Math.floor(estimatedOldTickets * 0.15),
          reduced: Math.floor(estimatedOldTickets * 0.05)
        },
        oldestDate: sampleTickets.length > 0 ? sampleTickets[sampleTickets.length - 1].dateIssued : null
      }
    };
  };

  const twoYearData = calculateTwoYearData();
  const complianceScore = calculateComplianceScore();
  const oldData = calculateOldData();

  // Fetch real violations data
  const fetchRealViolations = async () => {
    try {
      console.log('🔄 Fetching real violation data from backend...');
      const [violationsRes, statsRes] = await Promise.all([
        getViolationsForMonthlyReport(),
        getViolationStats()
      ]);

      if (violationsRes.success && statsRes.success) {
        setRealViolationsData(violationsRes.data);
        setViolationStats(statsRes.data);
        console.log('✅ Real violation data fetched:', {
          totalViolations: violationsRes.data.length,
          stats: statsRes.data
        });
      }
    } catch (error) {
      console.error('Error fetching real violations:', error);
      // Violations are optional, don't block the page
    }
  };

  // Fetch carrier performance data
  const fetchCarrierPerformance = async () => {
    setPerformanceLoading(true);
    try {
      const response = await getCarrierPerformance();
      if (response?.success && response?.data) {
        setCarrierPerformance(response.data);
        console.log('✅ Carrier performance data fetched:', response.data);
      }
    } catch (error) {
      console.error('Error fetching carrier performance:', error);
    } finally {
      setPerformanceLoading(false);
    }
  };

  // Fetch monthly report data (defined at component level so handlers can call it)
  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const countryFilter = selectedCountry === 'all' ? undefined : selectedCountry;
      const res = await getCvsaMonthlyReport(selectedYear, countryFilter);

      if (res?.success && Array.isArray(res?.data?.monthlyData)) {
        const sanitized = res.data.monthlyData.map(normalizeMonthlyStat);
        setMonthlyData(sanitized);
        const currentSelectedMonth = selectedMonth;
        if (!currentSelectedMonth || !sanitized.find((d: MonthlyStats) => d.month === currentSelectedMonth)) {
          const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
          const monthExists = sanitized.find((d: MonthlyStats) => d.month === currentMonthName);
          setSelectedMonth(monthExists ? currentMonthName : (sanitized[sanitized.length - 1]?.month || ''));
        }
      } else {
        setMonthlyData([]);
        setSelectedMonth('');
        setCurrentMonthData(null);
      }
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      setMonthlyData([]);
      setSelectedMonth('');
      setCurrentMonthData(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle save extracted data
  const handleSaveExtractedData = async () => {
    if (!extractedData) return;

    setIsSaving(true);
    try {
      const response = await saveCarrierProfileData(extractedData);

      if (response?.success) {
        setUploadMessage({
          type: 'success',
          text: `Successfully saved! Created ${response.data?.createdCount || 0} inspection record(s).`
        });

        // Close modal and refresh data
        setShowExtractedDataModal(false);
        setExtractedData(null);

        // Refresh data after successful save
        setTimeout(() => {
          fetchMonthlyReport();
          fetchCarrierPerformance();
        }, 1000);
      } else {
        setUploadMessage({
          type: 'error',
          text: response?.message || 'Failed to save data. Please try again.'
        });
      }
    } catch (error: any) {
      console.error('Error saving extracted data:', error);
      setUploadMessage({
        type: 'error',
        text: error?.response?.data?.message || 'An error occurred while saving the data.'
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setUploadMessage(null), 5000);
    }
  };

  // Handle cancel - close modal without saving
  const handleCancelSave = () => {
    setShowExtractedDataModal(false);
    setExtractedData(null);
    setDuplicateWarnings([]);
  };

  // Handle carrier profile document upload
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setUploadMessage({
        type: 'error',
        text: 'Invalid file type. Please upload an image (JPEG, PNG) or PDF file.'
      });
      setTimeout(() => setUploadMessage(null), 5000);
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    try {
      // Upload with preview mode (extract only, don't save)
      const response = await uploadCarrierProfileDocument(file, true);

      if (response?.success && response?.data?.preview) {
        // Show modal with extracted data
        setExtractedData(response.data.extractedData);
        setDuplicateWarnings(response.data.duplicateWarnings || []);
        setShowExtractedDataModal(true);
      } else if (response?.success) {
        // Legacy support: if not preview mode, save directly
        setUploadMessage({
          type: 'success',
          text: `Successfully processed document! Created ${response.data?.createdCount || 0} inspection record(s).`
        });

        // Refresh data after successful upload
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setUploadMessage({
          type: 'error',
          text: response?.message || 'Failed to process document. Please try again.'
        });
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      setUploadMessage({
        type: 'error',
        text: error?.response?.data?.message || 'An error occurred while processing the document.'
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
      setTimeout(() => setUploadMessage(null), 5000);
    }
  };

  // Fetch monthly report data
  useEffect(() => {
    fetchMonthlyReport();
    fetchRealViolations();
    fetchCarrierPerformance();
  }, [selectedYear, selectedCountry]);

  // Update current month data when selection changes
  useEffect(() => {
    const data = monthlyData.find(d => d.month === selectedMonth);
    setCurrentMonthData(data || null);
  }, [selectedMonth, monthlyData]);


  const getStatusChartData = (): ChartData => {
    if (!currentMonthData) return { labels: [], datasets: [] };

    return {
      labels: ['Pass', 'Fail', 'Warning', 'Out of Service'],
      datasets: [{
        label: 'Inspections by Status',
        data: [
          currentMonthData.passCount,
          currentMonthData.failCount,
          currentMonthData.warningCount,
          currentMonthData.outOfServiceCount
        ],
        backgroundColor: [
          '#10B981', // Green for pass
          '#EF4444', // Red for fail
          '#F59E0B', // Yellow for warning
          '#DC2626'  // Dark red for out of service
        ],
        borderColor: [
          '#059669',
          '#DC2626',
          '#D97706',
          '#991B1B'
        ],
        borderWidth: 2
      }]
    };
  };

  const getCountryChartData = (): ChartData => {
    if (!currentMonthData) return { labels: [], datasets: [] };

    return {
      labels: ['Canada', 'USA'],
      datasets: [{
        label: 'Inspections by Country',
        data: [
          currentMonthData.canadaInspections,
          currentMonthData.usaInspections
        ],
        backgroundColor: [
          '#3B82F6', // Blue for Canada
          '#EF4444'  // Red for USA
        ],
        borderColor: [
          '#2563EB',
          '#DC2626'
        ],
        borderWidth: 2
      }]
    };
  };

  const getMonthlyTrendData = (): ChartData => {
    const filteredData = selectedCountry === 'all'
      ? monthlyData
      : monthlyData.map(d => ({
        ...d,
        totalInspections: selectedCountry === 'canada' ? d.canadaInspections : d.usaInspections
      }));

    return {
      labels: filteredData.map(d => d.month),
      datasets: [{
        label: `Total Inspections (${selectedCountry.toUpperCase()})`,
        data: filteredData.map(d => d.totalInspections),
        backgroundColor: ['#9793E4'],
        borderColor: ['#8783D4'],
        borderWidth: 2
      }]
    };
  };

  // Simple chart rendering (in a real app, you'd use Chart.js or similar)
  const renderPieChart = (data: ChartData, title: string) => {
    const total = data.datasets[0]?.data.reduce((sum, value) => sum + value, 0) || 0;

    if (total === 0) {
      return (
        <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
          <h3 className="text-lg font-bold text-primary mb-4">{title}</h3>
          <div className="flex items-center justify-center h-64">
            <p className="text-secondary">No data available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
        <h3 className="text-lg font-bold text-primary mb-4">{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative w-64 h-64">
            {/* Simple pie chart representation */}
            <div className="absolute inset-0 rounded-full border-8 border-theme"></div>
            {data.datasets[0]?.data.map((value, index) => {
              const percentage = (value / total) * 100;
              const rotation = data.datasets[0]?.data.slice(0, index).reduce((sum, v) => sum + (v / total) * 360, 0) || 0;

              return (
                <div
                  key={index}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(from ${rotation}deg, ${data.datasets[0].backgroundColor[index]} ${percentage * 3.6}deg, transparent ${percentage * 3.6}deg)`
                  }}
                ></div>
              );
            })}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{total}</div>
                <div className="text-sm text-secondary">Total</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {data.labels.map((label, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: data.datasets[0].backgroundColor[index] }}
                ></div>
                <span className="text-sm text-primary">{label}</span>
              </div>
              <span className="text-sm font-semibold text-primary">
                {data.datasets[0].data[index]} ({((data.datasets[0].data[index] / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBarChart = (data: ChartData, title: string) => {
    const maxValue = Math.max(...data.datasets[0]?.data || [0]);
    const total = data.datasets[0]?.data.reduce((sum, value) => sum + value, 0) || 0;

    if (total === 0) {
      return (
        <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
          <h3 className="text-lg font-bold text-primary mb-4">{title}</h3>
          <div className="flex items-center justify-center h-64">
            <p className="text-secondary">No data available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
        <h3 className="text-lg font-bold text-primary mb-4">{title}</h3>
        <div className="space-y-4">
          {data.labels.map((label, index) => {
            const value = data.datasets[0]?.data[index] || 0;
            const percentage = (value / maxValue) * 100;

            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-primary">{label}</span>
                  <span className="text-sm font-semibold text-primary">{value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: data.datasets[0].backgroundColor[index]
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLineChart = (data: ChartData, title: string) => {
    const values = data.datasets[0]?.data || [];
    const labels = data.labels || [];
    const maxValue = Math.max(...values, 10);
    const width = 800;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const xStep = chartWidth / Math.max(labels.length - 1, 1);
    const yScale = (v: number) => chartHeight - (v / maxValue) * chartHeight;

    const points = values.map((v, i) => ({ x: padding.left + i * xStep, y: padding.top + yScale(v) }));
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

    const gridLines = Array.from({ length: 5 }).map((_, i) => {
      const y = padding.top + (i * chartHeight) / 4;
      const value = Math.round(maxValue - (i * maxValue) / 4);
      return { y, value };
    });

    return (
      <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-primary">{title}</h3>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.datasets[0]?.backgroundColor[0] }}></span>
              <span className="text-secondary">{data.datasets[0]?.label}</span>
            </div>
          </div>
        </div>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
          {/* Axes */}
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#E5E7EB" />
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#E5E7EB" />

          {/* Gridlines and Y labels */}
          {gridLines.map((g, idx) => (
            <g key={idx}>
              <line x1={padding.left} y1={g.y} x2={width - padding.right} y2={g.y} stroke="#F3F4F6" />
              <text x={padding.left - 10} y={g.y + 4} fontSize="10" fill="#6B7280" textAnchor="end">{g.value}</text>
            </g>
          ))}

          {/* Line path */}
          <path d={pathD} fill="none" stroke={data.datasets[0]?.borderColor[0] || '#6366F1'} strokeWidth={2} />

          {/* Area under curve */}
          {points.length > 1 && (
            <path d={`${pathD} L ${points[points.length - 1].x},${height - padding.bottom} L ${points[0].x},${height - padding.bottom} Z`} fill={(data.datasets[0]?.backgroundColor[0] as string) || '#A5B4FC'} opacity={0.15} />
          )}

          {/* Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3} fill={data.datasets[0]?.borderColor[0] || '#6366F1'} />
              {/* X labels */}
              <text x={p.x} y={height - padding.bottom + 15} fontSize="10" fill="#6B7280" textAnchor="middle">{labels[i]}</text>
              {/* Value labels */}
              <text x={p.x} y={p.y - 8} fontSize="10" fill="#111827" textAnchor="middle">{values[i]}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // Handle delete old data - Show confirmation modal
  const handleDeleteOldData = () => {
    if (!oldData || (oldData.inspections.total === 0 && oldData.tickets.total === 0)) {
      setDeleteMessage({ type: 'error', text: 'No old data found to delete' });
      setTimeout(() => setDeleteMessage(null), 3000);
      return;
    }
    setShowDeleteConfirm(true);
  };

  // Confirm and execute deletion
  const confirmDelete = async () => {
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    try {
      const response = await deleteOldCvsaData();

      if (response?.success) {
        setDeleteMessage({
          type: 'success',
          text: `Successfully deleted ${response.data.deletedCount} old record(s)`
        });

        // Refresh data after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setDeleteMessage({
          type: 'error',
          text: response?.message || 'Failed to delete old data'
        });
      }
    } catch (error: any) {
      console.error('Error deleting old data:', error);
      setDeleteMessage({
        type: 'error',
        text: error?.message || 'An error occurred while deleting old data'
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setDeleteMessage(null), 5000);
    }
  };

  // Cancel deletion
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    let yPos = margin;

    // Pre-load doclogo for header
    let docLogoBase64 = '';
    let docLogoW = 22, docLogoH = 11;
    try {
      const logoImg = new Image();
      logoImg.src = DocLogo;
      await new Promise<void>((resolve) => {
        logoImg.onload = () => {
          try {
            const cv = document.createElement('canvas');
            cv.width = logoImg.width; cv.height = logoImg.height;
            const ctx = cv.getContext('2d');
            if (ctx) {
              ctx.drawImage(logoImg, 0, 0);
              docLogoBase64 = cv.toDataURL('image/png');
              docLogoW = 22;
              docLogoH = (logoImg.height / logoImg.width) * docLogoW;
            }
          } catch { }
          resolve();
        };
        logoImg.onerror = () => resolve();
      });
    } catch { }

    // Header
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Platform logo in top-left of header
    if (docLogoBase64) {
      doc.addImage(docLogoBase64, 'PNG', margin, 4, docLogoW, docLogoH);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Carrier Profile Report', pageWidth / 2, 25, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 35, { align: 'center' });

    yPos = 50;

    // 2-Year Performance Summary
    if (twoYearData) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('2-Year Performance Summary', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Period: ${twoYearData.summary.period}`, margin, yPos);
      yPos += 7;
      doc.text(`Total Inspections: ${twoYearData.summary.totalInspections}`, margin, yPos);
      yPos += 7;
      doc.text(`Pass: ${twoYearData.summary.totalPass} | Fail: ${twoYearData.summary.totalFail} | Warning: ${twoYearData.summary.totalWarning} | Out of Service: ${twoYearData.summary.totalOutOfService}`, margin, yPos);
      yPos += 7;
      doc.text(`Overall Pass Rate: ${twoYearData.summary.overallPassRate}%`, margin, yPos);
      yPos += 15;

      // Year 1
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Year ${twoYearData.year1.year}:`, margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`  Inspections: ${twoYearData.year1.totalInspections} | Pass Rate: ${twoYearData.year1.passRate}%`, margin, yPos);
      yPos += 10;

      // Year 2
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Year ${twoYearData.year2.year}:`, margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`  Inspections: ${twoYearData.year2.totalInspections} | Pass Rate: ${twoYearData.year2.passRate}%`, margin, yPos);
      yPos += 15;
    }

    // Driver Violations (static estimate)
    if (twoYearData) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Driver Violations (Estimated)', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const estimatedSpeeding = Math.floor(twoYearData.summary.totalInspections * 0.05);
      const estimatedTickets = Math.floor(twoYearData.summary.totalInspections * 0.1);
      doc.text(`Speeding Violations: ${estimatedSpeeding}`, margin, yPos);
      yPos += 7;
      doc.text(`Traffic Tickets: ${estimatedTickets}`, margin, yPos);
      yPos += 10;
    }

    // Audit Compliance Score
    if (complianceScore) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Audit Compliance Score', margin, yPos);
      yPos += 10;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const scoreColor = complianceScore.score >= 80 ? [34, 197, 94] : [239, 68, 68];
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.text(`Score: ${complianceScore.score}%`, margin, yPos);
      yPos += 8;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Eligible for Detailed Audits: ${complianceScore.eligibleForAudit ? 'Yes' : 'No'}`, margin, yPos);
      yPos += 7;
      doc.text(`Inspection Score: ${complianceScore.breakdown.inspectionScore.toFixed(1)}%`, margin, yPos);
      yPos += 7;
      doc.text(`Violation Penalty: ${complianceScore.breakdown.violationPenalty.toFixed(1)}%`, margin, yPos);
    }

    // Save PDF
    doc.save(`carrier-profile-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    onClick,
    bgColor,
    iconColor,
    background
  }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ReactNode;
    onClick?: () => void;
    bgColor: string;
    iconColor: string;
    background?: string;
  }) => {
    return (
      <div
        onClick={onClick}
        className={`bg-[${background}]/20 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-[var(--accent-blue)]/20 hover:scale-[1.02] active:scale-[0.98]`}
      >
        <div className="flex items-start justify-between mb-2">
          {/* Left side content */}
          <div className="flex-1">
            <h3 className="text-sm font-bold text-primary mb-1">{title}</h3>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xl font-bold text-primary">{value}</span>
            </div>
            {subtitle && <p className="text-xs text-secondary">{subtitle}</p>}
          </div>

          {/* Right side icon */}
          <div className={`${bgColor} rounded-lg p-2 shadow-sm`}>
            {/* Render the icon directly if it's an element, or as component if passed as ref */}
            {React.isValidElement(Icon) ? React.cloneElement(Icon as React.ReactElement<any>, { className: iconColor, size: 21 }) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-2xl max-w-2xl w-full p-6 animate-fade-in">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FaExclamationTriangle className="text-[#A855F7]" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-primary mb-2">Confirm Permanent Deletion</h3>
                <p className="text-primary mb-4">
                  You are about to <strong className="text-[#A855F7]">permanently delete</strong> the following data:
                </p>
                {oldData && (
                  <div className="bg-card border-2 border-red-200 rounded-lg p-4 mb-4">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center justify-between">
                        <span className="font-medium text-primary">CVSA Inspections:</span>
                        <span className="font-bold text-red-700">{oldData.inspections.total} records</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="font-medium text-primary">Traffic Tickets:</span>
                        <span className="font-bold text-red-700">{oldData.tickets.total} records</span>
                      </li>
                      <li className="flex items-center justify-between border-t border-red-300 pt-2 mt-2">
                        <span className="font-bold text-primary">Total Records:</span>
                        <span className="font-bold text-red-900 text-lg">{oldData.inspections.total + oldData.tickets.total}</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="font-medium text-primary">Cutoff Date:</span>
                        <span className="font-semibold text-primary">{new Date(oldData.cutoffDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </li>
                    </ul>
                  </div>
                )}
                <div className="bg-card border-2 border-yellow-300 rounded-lg p-4">
                  <p className="text-sm text-yellow-900 font-semibold flex items-start gap-2">
                    <FaExclamationCircle className="text-[#00FFA3] mt-0.5 flex-shrink-0" size={16} />
                    <span>This action cannot be undone. All selected records will be permanently removed from the database.</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-gray-200 text-primary rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <FaTrashAlt size={16} />
                    Yes, Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Notification */}
      {deleteMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl ${deleteMessage.type === 'success'
            ? 'bg-green-50 border-2 border-green-500'
            : 'bg-card border-2 border-red-500'
            }`}>
            {deleteMessage.type === 'success' ? (
              <FaCheckCircle className="text-green-600 flex-shrink-0" size={24} />
            ) : (
              <FaTimesCircle className="text-[#A855F7] flex-shrink-0" size={24} />
            )}
            <div className="flex-1">
              <p className={`font-semibold ${deleteMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                }`}>
                {deleteMessage.text}
              </p>
            </div>
            <button
              onClick={() => setDeleteMessage(null)}
              className="text-secondary hover:text-primary"
            >
              <FaTimesCircle size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Upload Success/Error Notification */}
      {uploadMessage && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl ${uploadMessage.type === 'success'
            ? 'bg-green-50 border-2 border-green-500'
            : 'bg-card border-2 border-red-500'
            }`}>
            {uploadMessage.type === 'success' ? (
              <FaCheckCircle className="text-green-600 flex-shrink-0" size={24} />
            ) : (
              <FaTimesCircle className="text-[#A855F7] flex-shrink-0" size={24} />
            )}
            <div className="flex-1">
              <p className={`font-semibold ${uploadMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                }`}>
                {uploadMessage.text}
              </p>
            </div>
            <button
              onClick={() => setUploadMessage(null)}
              className="text-secondary hover:text-primary"
            >
              <FaTimesCircle size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Extracted Data Review Modal */}
      {showExtractedDataModal && extractedData && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}>
          <div className="bg-card rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-theme">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-theme flex items-center justify-between bg-card">
              <div>
                <h2 className="text-xl font-bold text-primary">Review Extracted Data</h2>
                <p className="text-sm text-secondary mt-1">Please review the extracted data before saving</p>
              </div>
              <button
                onClick={handleCancelSave}
                className="text-secondary hover:text-secondary transition-colors"
                disabled={isSaving}
              >
                <FaTimesCircle size={24} />
              </button>
            </div>

            {/* Duplicate Warnings */}
            {duplicateWarnings && duplicateWarnings.length > 0 && (
              <div className="px-6 py-3 bg-card border-b border-yellow-200">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="text-[#00FFA3] flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-900 mb-1">
                      Duplicate Warnings ({duplicateWarnings.length})
                    </p>
                    <ul className="text-xs text-yellow-800 space-y-1 max-h-32 overflow-y-auto">
                      {duplicateWarnings.slice(0, 5).map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                      {duplicateWarnings.length > 5 && (
                        <li className="text-[#00FFA3] italic">... and {duplicateWarnings.length - 5} more</li>
                      )}
                    </ul>
                    <p className="text-xs text-yellow-700 mt-2 font-medium">
                      ⚠️ These inspections may already exist in the database. Duplicates will be skipped during save.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Body */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {/* Summary Section */}
              {extractedData.summary && (() => {
                // Helper function to infer country from location
                const inferCountryFromLocation = (location: string | null | undefined): string | null => {
                  if (!location) return null;
                  const locationUpper = location.toUpperCase();
                  const locationLower = location.toLowerCase();

                  // Canadian province/territory codes (2-letter) - most reliable
                  const canadaProvinceCodes = ['MB', 'BC', 'ON', 'AB', 'SK', 'QC', 'NS', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU'];

                  // US state codes (2-letter)
                  const usaStateCodes = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];

                  // Check for province/state codes first (most reliable)
                  for (const code of canadaProvinceCodes) {
                    // Check if location contains the code as a standalone word or at start/end
                    if (locationUpper.includes(` ${code} `) || locationUpper.startsWith(`${code} `) || locationUpper.endsWith(` ${code}`) || locationUpper === code) {
                      return 'canada';
                    }
                  }

                  for (const code of usaStateCodes) {
                    if (locationUpper.includes(` ${code} `) || locationUpper.startsWith(`${code} `) || locationUpper.endsWith(` ${code}`) || locationUpper === code) {
                      return 'usa';
                    }
                  }

                  // Canada indicators (full names and cities)
                  const canadaIndicators = ['ontario', 'quebec', 'british columbia', 'alberta', 'manitoba', 'saskatchewan', 'nova scotia', 'new brunswick', 'newfoundland', 'prince edward island', 'yukon', 'northwest territories', 'nunavut', 'toronto', 'vancouver', 'montreal', 'calgary', 'edmonton', 'ottawa', 'winnipeg', 'halifax', 'quebec city', 'canada', 'cad', 'cbsa'];

                  // USA indicators
                  const usaIndicators = ['california', 'texas', 'florida', 'new york', 'illinois', 'pennsylvania', 'ohio', 'georgia', 'north carolina', 'michigan', 'new jersey', 'virginia', 'washington', 'arizona', 'massachusetts', 'tennessee', 'indiana', 'missouri', 'maryland', 'wisconsin', 'colorado', 'minnesota', 'south carolina', 'alabama', 'louisiana', 'kentucky', 'oregon', 'oklahoma', 'connecticut', 'utah', 'iowa', 'nevada', 'arkansas', 'mississippi', 'kansas', 'new mexico', 'nebraska', 'west virginia', 'idaho', 'hawaii', 'new hampshire', 'maine', 'montana', 'rhode island', 'delaware', 'south dakota', 'north dakota', 'alaska', 'vermont', 'wyoming', 'usa', 'us', 'united states', 'dot', 'federal', 'cvs'];

                  for (const indicator of canadaIndicators) {
                    if (locationLower.includes(indicator)) return 'canada';
                  }

                  for (const indicator of usaIndicators) {
                    if (locationLower.includes(indicator)) return 'usa';
                  }

                  return null;
                };

                // Calculate Canada/USA counts from individual inspections if summary values are missing or 0
                let canadaCount = extractedData.summary.canadaInspections || 0;
                let usaCount = extractedData.summary.usaInspections || 0;

                // If counts are 0, try to calculate from individual inspections
                if ((canadaCount === 0 && usaCount === 0) && extractedData.inspections && Array.isArray(extractedData.inspections) && extractedData.inspections.length > 0) {
                  let calculatedCanada = 0;
                  let calculatedUSA = 0;

                  for (const inspection of extractedData.inspections) {
                    let country: string | null = null;

                    // Check explicit country field first
                    if (inspection.country) {
                      country = inspection.country.toLowerCase();
                    }
                    // Check province/state codes (most reliable)
                    else if (inspection.province) {
                      // Canadian provinces
                      const canadaProvinces = ['MB', 'BC', 'ON', 'AB', 'SK', 'QC', 'NS', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU'];
                      if (canadaProvinces.includes(inspection.province.toUpperCase())) {
                        country = 'canada';
                      }
                    } else if (inspection.state) {
                      // US states (2-letter codes)
                      const usaStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];
                      if (usaStates.includes(inspection.state.toUpperCase())) {
                        country = 'usa';
                      }
                    }
                    // Infer from location if country/province/state not set
                    else if (inspection.location) {
                      country = inferCountryFromLocation(inspection.location);
                    }

                    if (country === 'canada') {
                      calculatedCanada++;
                    } else if (country === 'usa') {
                      calculatedUSA++;
                    }
                  }

                  canadaCount = calculatedCanada;
                  usaCount = calculatedUSA;
                }

                return (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
                      <FaChartBar /> Summary Statistics
                    </h3>
                    <div className="bg-card rounded-lg p-4 border border-theme">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-card rounded p-3 border border-theme">
                          <p className="text-sm text-secondary mb-1">Total Inspections</p>
                          <p className="text-2xl font-bold text-primary">{extractedData.summary.totalInspections || 0}</p>
                        </div>
                        <div className="bg-card rounded p-3 border border-theme">
                          <p className="text-sm text-secondary mb-1">Pass</p>
                          <p className="text-2xl font-bold text-green-600">{extractedData.summary.totalPass || 0}</p>
                        </div>
                        <div className="bg-card rounded p-3 border border-theme">
                          <p className="text-sm text-secondary mb-1">Fail</p>
                          <p className="text-2xl font-bold text-[#A855F7]">{extractedData.summary.totalFail || 0}</p>
                        </div>
                        <div className="bg-card rounded p-3 border border-theme">
                          <p className="text-sm text-secondary mb-1">Out of Service</p>
                          <p className="text-2xl font-bold text-[#F59E0B]">{extractedData.summary.totalOutOfService || 0}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        {extractedData.summary.totalWarning !== undefined && extractedData.summary.totalWarning > 0 && (
                          <div className="bg-card rounded p-3 border border-theme">
                            <p className="text-sm text-secondary mb-1">Warning</p>
                            <p className="text-xl font-bold text-[#00FFA3]">{extractedData.summary.totalWarning || 0}</p>
                          </div>
                        )}
                        <div className="bg-card rounded p-3 border border-theme">
                          <p className="text-sm text-secondary mb-1 flex items-center gap-2">
                            <FaFlag /> Canada Inspections
                          </p>
                          <p className="text-xl font-bold text-[#00D1FF]">{canadaCount}</p>
                          {canadaCount === 0 && usaCount === 0 && (!extractedData.inspections || extractedData.inspections.length === 0) && (
                            <p className="text-xs text-[#F59E0B] mt-1 italic">⚠️ Individual inspections not extracted - cannot calculate country breakdown</p>
                          )}
                          {canadaCount === 0 && usaCount === 0 && extractedData.inspections && extractedData.inspections.length > 0 && (
                            <p className="text-xs text-secondary mt-1 italic">Country not specified in document</p>
                          )}
                        </div>
                        <div className="bg-card rounded p-3 border border-theme">
                          <p className="text-sm text-secondary mb-1 flex items-center gap-2">
                            <FaFlagUsa /> USA Inspections
                          </p>
                          <p className="text-xl font-bold text-[#00D1FF]">{usaCount}</p>
                          {canadaCount === 0 && usaCount === 0 && (!extractedData.inspections || extractedData.inspections.length === 0) && (
                            <p className="text-xs text-[#F59E0B] mt-1 italic">⚠️ Individual inspections not extracted - cannot calculate country breakdown</p>
                          )}
                          {canadaCount === 0 && usaCount === 0 && extractedData.inspections && extractedData.inspections.length > 0 && (
                            <p className="text-xs text-secondary mt-1 italic">Country not specified in document</p>
                          )}
                        </div>
                      </div>
                      {extractedData.summary.period && (
                        <div className="mt-4 pt-4 border-t border-theme">
                          <p className="text-sm text-secondary mb-1">Period</p>
                          <p className="text-lg font-semibold text-primary">{extractedData.summary.period}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Inspections List */}
              {extractedData.inspections && Array.isArray(extractedData.inspections) && extractedData.inspections.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
                    <FaTruck /> Individual Inspections ({extractedData.inspections.length})
                  </h3>
                  <div className="bg-card rounded-lg p-4 border border-theme max-h-96 overflow-y-auto">
                    <div className="space-y-3">
                      {extractedData.inspections.map((inspection: any, index: number) => (
                        <div key={index} className="bg-card rounded-lg p-4 border border-theme shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-primary">
                                {inspection.inspectionId || `Inspection ${index + 1}`}
                              </span>
                              {inspection.reportNumber && (
                                <span className="text-sm text-secondary">Report #: {inspection.reportNumber}</span>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded text-xs font-semibold ${inspection.status === 'pass' ? 'bg-green-100 text-green-800' :
                              inspection.status === 'fail' ? 'bg-red-100 text-red-800' :
                                inspection.status === 'out-of-service' ? 'bg-orange-100 text-orange-800' :
                                  'bg-yellow-100 text-yellow-800'
                              }`}>
                              {inspection.status ? inspection.status.toUpperCase().replace('-', ' ') : 'UNKNOWN'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              {inspection.date && (
                                <p className="text-secondary">
                                  <span className="font-medium">Date:</span> {new Date(inspection.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                              )}
                              {inspection.location && (
                                <p className="text-secondary mt-1">
                                  <span className="font-medium">Location:</span> {inspection.location}
                                </p>
                              )}
                              {inspection.country && (
                                <p className="text-secondary mt-1">
                                  <span className="font-medium">Country:</span> {inspection.country.toUpperCase()}
                                </p>
                              )}
                            </div>
                            <div>
                              {inspection.inspectionType && (
                                <p className="text-secondary">
                                  <span className="font-medium">Type:</span> {inspection.inspectionType.replace('-', ' ').toUpperCase()}
                                </p>
                              )}
                              {inspection.inspectorName && (
                                <p className="text-secondary mt-1">
                                  <span className="font-medium">Inspector:</span> {inspection.inspectorName}
                                </p>
                              )}
                              {inspection.driverName && (
                                <p className="text-secondary mt-1">
                                  <span className="font-medium">Driver:</span> {inspection.driverName}
                                </p>
                              )}
                              {inspection.vehicleUnitNo && (
                                <p className="text-secondary mt-1">
                                  <span className="font-medium">Vehicle:</span> {inspection.vehicleUnitNo}
                                </p>
                              )}
                            </div>
                          </div>
                          {inspection.violations && Array.isArray(inspection.violations) && inspection.violations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-theme">
                              <p className="text-sm font-medium text-primary mb-2">Violations ({inspection.violations.length}):</p>
                              <div className="space-y-1">
                                {inspection.violations.slice(0, 3).map((violation: any, vIndex: number) => (
                                  <p key={vIndex} className="text-xs text-secondary">
                                    • {violation.code || 'N/A'}: {violation.description || 'No description'}
                                    {violation.severity && <span className="ml-2 text-[#F59E0B]">({violation.severity})</span>}
                                  </p>
                                ))}
                                {inspection.violations.length > 3 && (
                                  <p className="text-xs text-secondary italic">... and {inspection.violations.length - 3} more violations</p>
                                )}
                              </div>
                            </div>
                          )}
                          {inspection.notes && (
                            <div className="mt-3 pt-3 border-t border-theme">
                              <p className="text-sm font-medium text-primary mb-1">Notes:</p>
                              <p className="text-xs text-secondary">{inspection.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(!extractedData.summary && (!extractedData.inspections || extractedData.inspections.length === 0)) && (
                <div className="text-center py-8 text-secondary">
                  <FaInfoCircle size={48} className="mx-auto mb-4 text-secondary" />
                  <p>No data extracted from the document.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-theme flex items-center justify-end gap-3 bg-card">
              <button
                onClick={handleCancelSave}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-200 text-primary rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExtractedData}
                disabled={isSaving}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    Save to Database
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen pb-10 bg-main" >
        <div className="relative w-full mx-auto p-2">


          {/* Main content */}
          <div className="relative z-10 px-4 pt-3 pb-6">
            {/* Header Section */}
            <div className="mb-4 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-headings">Carrier Profile</h1>
                  <div className="flex items-center gap-2 text-secondary">
                    <span className="text-xs">Analytics and insights for CVSA inspections - Past 2 Years Performance</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-navyblue)] text-white rounded-lg hover:bg-[var(--accent-navyblue)]/80 transition-colors shadow-sm cursor-pointer">
                    <FaUpload size={16} />
                    {isUploading ? 'Processing...' : 'Upload Carrier Profile'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      onChange={handleDocumentUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[var(--accent-navyblue)]/80 transition-colors shadow-sm"
                  >
                    <FaDownload size={16} />
                    Download PDF
                  </button>
                  <button
                    onClick={handleDeleteOldData}
                    disabled={!oldData || (oldData.inspections.total === 0 && oldData.tickets.total === 0)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm ${oldData && (oldData.inspections.total > 0 || oldData.tickets.total > 0)
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-300 text-secondary cursor-not-allowed'
                      }`}
                    title={
                      oldData && (oldData.inspections.total > 0 || oldData.tickets.total > 0)
                        ? `Delete ${oldData.inspections.total + oldData.tickets.total} old records (>2 years)`
                        : 'No old data to delete (data must be older than 2 years)'
                    }
                  >
                    <FaTrashAlt size={16} />
                    {oldData && (oldData.inspections.total > 0 || oldData.tickets.total > 0)
                      ? `Delete Old Data (${oldData.inspections.total + oldData.tickets.total})`
                      : 'Delete Old Data'}
                  </button>
                </div>
              </div>
            </div>

            {/* Country Tabs */}
            <div className="mb-6 bg-card rounded-lg shadow-sm border border-theme p-4">
              <div className="flex gap-2 border-b border-theme pb-4">
                <button
                  onClick={() => setSelectedCountry('all')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${selectedCountry === 'all'
                    ? 'bg-[var(--accent-navyblue)] text-white'
                    : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedCountry('canada')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${selectedCountry === 'canada'
                    ? 'bg-[var(--accent-navyblue)] text-white'
                    : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                    }`}
                >
                  <FaFlag className="text-primary" size={14} />
                  Canada
                </button>
                <button
                  onClick={() => setSelectedCountry('usa')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${selectedCountry === 'usa'
                    ? 'bg-[var(--accent-navyblue)] text-white'
                    : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                    }`}
                >
                  <FaFlagUsa className="text-primary" size={14} />
                  USA
                </button>
              </div>
            </div>

            {/* Carrier Performance Dashboard - Auto-Tracked from Documents */}
            {carrierPerformance && (
              <div className="mb-6 bg-card rounded-lg shadow-sm border border-theme p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3  rounded-lg">
                      <FaTachometerAlt className="text-[var(--accent-navyblue)]" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-headings">Carrier Performance Dashboard</h2>
                      <p className="text-sm text-secondary">Automatically tracked from carrier profile documents</p>
                    </div>
                  </div>
                  {carrierPerformance.trends && (
                    <div className={`px-4 py-2 rounded-lg font-semibold border ${carrierPerformance.trends.isImproving
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : carrierPerformance.trends.isDeclining
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}>
                      {carrierPerformance.trends.isImproving && '↗ Improving'}
                      {carrierPerformance.trends.isDeclining && '↘ Declining'}
                      {!carrierPerformance.trends.isImproving && !carrierPerformance.trends.isDeclining && '→ Stable'}
                    </div>
                  )}
                </div>

                {/* Latest Performance Summary */}
                {carrierPerformance.summary?.latestRecord && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-card rounded-lg p-4 border border-theme">
                      <p className="text-xs text-secondary mb-1">Latest Month</p>
                      <p className="text-lg font-bold text-primary">
                        {new Date(carrierPerformance.summary.latestRecord.year, carrierPerformance.summary.latestRecord.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="bg-card rounded-lg p-4 border border-theme">
                      <p className="text-xs text-secondary mb-1">Pass Rate</p>
                      <p className={`text-2xl font-bold ${carrierPerformance.summary.latestRecord.passRate >= 80 ? 'text-green-400' : carrierPerformance.summary.latestRecord.passRate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {carrierPerformance.summary.latestRecord.passRate}%
                      </p>
                    </div>
                    <div className="bg-card rounded-lg p-4 border border-theme">
                      <p className="text-xs text-secondary mb-1">OOS Rate</p>
                      <p className={`text-2xl font-bold ${carrierPerformance.summary.latestRecord.ossRate <= 10 ? 'text-green-400' : carrierPerformance.summary.latestRecord.ossRate <= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {carrierPerformance.summary.latestRecord.ossRate}%
                      </p>
                    </div>
                    <div className="bg-card rounded-lg p-4 border border-theme">
                      <p className="text-xs text-secondary mb-1">Safety Rating</p>
                      <p className={`text-lg font-bold ${carrierPerformance.summary.latestRecord.safetyRating === 'Satisfactory' ? 'text-green-400' :
                        carrierPerformance.summary.latestRecord.safetyRating === 'Conditional' ? 'text-yellow-400' :
                          carrierPerformance.summary.latestRecord.safetyRating === 'Unsatisfactory' ? 'text-red-400' :
                            'text-secondary'
                        }`}>
                        {carrierPerformance.summary.latestRecord.safetyRating || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Performance Trends */}
                {carrierPerformance.trends && (
                  <div className="bg-card rounded-lg p-4 border border-theme mb-4">
                    <h3 className="text-sm font-bold text-headings mb-3">Performance Trend (Last 3 Months vs Previous 3 Months)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-secondary">Recent Avg Pass Rate</p>
                        <p className="text-lg font-bold text-primary">{carrierPerformance.trends.recentAvgPassRate}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary">Previous Avg Pass Rate</p>
                        <p className="text-lg font-bold text-primary">{carrierPerformance.trends.previousAvgPassRate}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary">Change</p>
                        <p className={`text-lg font-bold ${carrierPerformance.trends.passRateTrend > 0 ? 'text-green-400' :
                          carrierPerformance.trends.passRateTrend < 0 ? 'text-red-400' :
                            'text-secondary'
                          }`}>
                          {carrierPerformance.trends.passRateTrend > 0 ? '+' : ''}{carrierPerformance.trends.passRateTrend}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary">Overall Avg Pass Rate</p>
                        <p className="text-lg font-bold text-primary">{carrierPerformance.summary?.avgPassRate || 0}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Monthly Performance Chart */}
                {carrierPerformance.monthlyData && carrierPerformance.monthlyData.length > 0 && (
                  <div className="bg-card rounded-lg p-4 border border-theme">
                    <h3 className="text-sm font-bold text-headings mb-4">12-Month Performance History</h3>
                    <div className="space-y-2">
                      {carrierPerformance.monthlyData.slice(-6).map((month: any, index: number) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="w-24 text-xs text-secondary flex-shrink-0">
                            {month.monthName} {month.year}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-700/40 rounded-full h-6 relative overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${month.passRate >= 80 ? 'bg-green-500/80' :
                                    month.passRate >= 60 ? 'bg-yellow-500/80' :
                                      'bg-red-500/80'
                                    }`}
                                  style={{ width: `${Math.min(month.passRate, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-primary w-12 text-right">
                                {month.passRate}%
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-secondary w-20 text-right">
                            {month.totalInspections} inspections
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {performanceLoading && (
                  <div className="text-center py-8 text-secondary">
                    <FaInfoCircle className="mx-auto mb-2" size={24} />
                    <p>Loading carrier performance data...</p>
                  </div>
                )}

                {!performanceLoading && (!carrierPerformance || !carrierPerformance.summary?.latestRecord) && (
                  <div className="text-center py-8 text-secondary bg-card rounded-lg border border-theme">
                    <FaInfoCircle className="mx-auto mb-2" size={24} />
                    <p className="font-semibold mb-1">No Performance Data Yet</p>
                    <p className="text-sm">Upload a carrier profile document to automatically track performance metrics.</p>
                  </div>
                )}
              </div>
            )}

            {/* Audit Compliance Score Card */}
            {complianceScore && (
              <div className="mb-6 bg-card rounded-lg shadow-sm border border-theme p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${complianceScore.eligibleForAudit ? '' : ''}`}>
                      <FaShieldAlt className={complianceScore.eligibleForAudit ? 'text-headings' : 'text-headings'} size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-headings">Audit Compliance Score</h3>
                      <p className="text-sm text-secondary">Based on inspections and violations from the past 2 years</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-4xl font-bold ${complianceScore.score >= 80 ? 'text-green-600' : 'text-[#00FFA3]'}`}>
                      {complianceScore.score}%
                    </div>
                    <div className={`text-sm font-semibold ${complianceScore.eligibleForAudit ? 'text-green-600' : 'text-[#00FFA3]'}`}>
                      {complianceScore.eligibleForAudit ? '✓ Eligible for Detailed Audits' : '⚠ Not Eligible'}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-theme grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-secondary">Inspection Score:</span>
                    <span className="font-semibold ml-2">{complianceScore.breakdown.inspectionScore.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-secondary">Violation Penalty:</span>
                    <span className="font-semibold ml-2">-{complianceScore.breakdown.violationPenalty.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-secondary">Total Inspections:</span>
                    <span className="font-semibold ml-2">{complianceScore.breakdown.totalInspections}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Total Violations:</span>
                    <span className="font-semibold ml-2">{complianceScore.breakdown.totalTickets + complianceScore.breakdown.speedingCount}</span>
                  </div>
                </div>
              </div>
            )}


            {/* Monthly Stats Cards */}
            {!loading && currentMonthData && monthlyData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 -mt-2 mb-6 relative z-10">
                <StatCard
                  title="Total Inspections"
                  value={currentMonthData.totalInspections}
                  icon={<FaChartBar />}
                  bgColor=""
                  iconColor="text-headings"
                  subtitle={`${selectedMonth} ${currentMonthData.year}`}
                  background="var(--accent-navyblue)"
                />
                <StatCard
                  title="Pass Rate"
                  value={`${currentMonthData.totalInspections > 0
                    ? Math.round((currentMonthData.passCount / currentMonthData.totalInspections) * 100)
                    : 0}%`}
                  icon={<FaCheckCircle />}
                  bgColor=""
                  iconColor="text-[var(--accent-green)]"
                  subtitle={`${currentMonthData.passCount} passed`}
                  background="var(--accent-green)"
                />
                <StatCard
                  title="Vehicles"
                  value={currentMonthData.vehiclesInspected}
                  icon={<FaTruck />}
                  bgColor=""
                  iconColor="text-[var(--accent-purple)]"
                  subtitle="Unique vehicles"
                  background="var(--accent-purple)"
                />
                <StatCard
                  title="Drivers"
                  value={currentMonthData.driversInspected}
                  icon={<FaUser />}
                  bgColor=""
                  iconColor="text-[var(--accent-orange)]"
                  subtitle="Unique drivers"
                  background="var(--accent-orange)"
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full mx-auto px-4 -mt-4">
          {/* 2-Year Performance View - Static */}
          {twoYearData && (
            <div className="mb-6 bg-card rounded-lg shadow-sm border border-theme p-6">
              <h2 className="text-2xl font-bold text-headings mb-4">2-Year Performance Summary</h2>
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    title="Total Inspections"
                    value={twoYearData.summary.totalInspections}
                    icon={<FaChartBar />}
                    bgColor=""
                    iconColor="text-[var(--accent-blue)]"
                    subtitle={twoYearData.summary.period}
                    background="var(--accent-blue)"
                  />
                  <StatCard
                    title="Overall Pass Rate"
                    value={`${twoYearData.summary.overallPassRate}%`}
                    icon={<FaCheckCircle />}
                    bgColor=""
                    iconColor="text-[var(--accent-green)]"
                    subtitle={`${twoYearData.summary.totalPass} passed`}
                    background="var(--accent-green)"
                  />
                  <StatCard
                    title="Total Failures"
                    value={twoYearData.summary.totalFail}
                    icon={<FaTimesCircle />}
                    bgColor=""
                    iconColor="text-[var(--accent-purple)]"
                    subtitle={`${twoYearData.summary.totalWarning} warnings`}
                    background="var(--accent-purple)"
                  />
                  <StatCard
                    title="Out of Service"
                    value={twoYearData.summary.totalOutOfService}
                    icon={<FaBan />}
                    bgColor=""
                    iconColor="text-[var(--accent-red)]"
                    subtitle="Critical violations"
                    background="var(--accent-red)"
                  />
                </div>

                {/* Year Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Year 1 */}
                  <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                    <h3 className="text-xl font-bold text-headings mb-4">Year {twoYearData.year1.year}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-secondary">Total Inspections:</span>
                        <span className="font-semibold">{twoYearData.year1.totalInspections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Pass Rate:</span>
                        <span className="font-semibold text-green-600">{twoYearData.year1.passRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Passed:</span>
                        <span className="font-semibold">{twoYearData.year1.passCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Failed:</span>
                        <span className="font-semibold text-[#A855F7]">{twoYearData.year1.failCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Warnings:</span>
                        <span className="font-semibold text-[#00FFA3]">{twoYearData.year1.warningCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Out of Service:</span>
                        <span className="font-semibold text-red-800">{twoYearData.year1.outOfServiceCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Year 2 */}
                  <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                    <h3 className="text-xl font-bold text-headings mb-4">Year {twoYearData.year2.year}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-secondary">Total Inspections:</span>
                        <span className="font-semibold">{twoYearData.year2.totalInspections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Pass Rate:</span>
                        <span className="font-semibold text-green-600">{twoYearData.year2.passRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Passed:</span>
                        <span className="font-semibold">{twoYearData.year2.passCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Failed:</span>
                        <span className="font-semibold text-[#A855F7]">{twoYearData.year2.failCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Warnings:</span>
                        <span className="font-semibold text-[#00FFA3]">{twoYearData.year2.warningCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Out of Service:</span>
                        <span className="font-semibold text-red-800">{twoYearData.year2.outOfServiceCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Driver Violations Section - Real Data from Geotab */}
                {violationStats && (
                  <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-headings">Driver Violations (Past 2 Years - Real Data)</h3>
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                        {violationStats.bySource?.geotab ? 'Geotab Integrated' : 'Live Data'}
                      </span>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-card p-4 rounded-lg border-2 border-theme">
                        <div className="text-2xl font-bold text-red-800">{violationStats.total || 0}</div>
                        <div className="text-sm text-red-800 mt-1">Total Violations</div>
                      </div>
                      <div className="bg-card p-4 rounded-lg border-2 border-theme">
                        <div className="text-2xl font-bold text-orange-800">{violationStats.byType?.speeding || 0}</div>
                        <div className="text-sm text-orange-800 mt-1">Speeding</div>
                      </div>
                      <div className="bg-card p-4 rounded-lg border-2 border-theme">
                        <div className="text-2xl font-bold text-yellow-800">
                          {(violationStats.byType?.['harsh-braking'] || 0) + (violationStats.byType?.['harsh-acceleration'] || 0)}
                        </div>
                        <div className="text-sm text-yellow-800 mt-1">Harsh Driving</div>
                      </div>
                      <div className="bg-card p-4 rounded-lg border-2 border-theme">
                        <div className="text-2xl font-bold text-purple-800">{violationStats.byType?.other || 0}</div>
                        <div className="text-sm text-purple-800 mt-1">Other</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Violation Types Breakdown */}
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <FaExclamationCircle className="text-[var(--accent-purple)]" size={20} />
                          <h4 className="text-lg font-semibold text-[var(--accent-purple)]">Violation Types</h4>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(violationStats.byType || {}).map(([type, count]) => (
                            <div key={type} className="flex justify-between p-3 bg-card rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition">
                              <span className="font-medium text-[var(--accent-purple)] capitalize">{type.replace(/-/g, ' ')}</span>
                              <span className="font-bold text-[var(--accent-purple)]">{count as number}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Severity Breakdown */}
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <FaShieldAlt className="text-[var(--accent-orange)]" size={20} />
                          <h4 className="text-lg font-semibold text-[var(--accent-orange)]">Severity Levels</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between p-3 bg-card rounded-lg">
                            <span className="font-medium text-primary">Critical</span>
                            <span className="font-bold text-red-800">{violationStats.bySeverity?.critical || 0}</span>
                          </div>
                          <div className="flex justify-between p-3 bg-card rounded-lg">
                            <span className="font-medium text-primary">Major</span>
                            <span className="font-bold text-orange-800">{violationStats.bySeverity?.major || 0}</span>
                          </div>
                          <div className="flex justify-between p-3 bg-card rounded-lg">
                            <span className="font-medium text-primary">Moderate</span>
                            <span className="font-bold text-yellow-800">{violationStats.bySeverity?.moderate || 0}</span>
                          </div>
                          <div className="flex justify-between p-3 bg-card rounded-lg">
                            <span className="font-medium text-primary">Minor</span>
                            <span className="font-bold text-blue-800">{violationStats.bySeverity?.minor || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top Violators */}
                    {violationStats.topViolators && violationStats.topViolators.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold text-primary mb-4">Top 5 Drivers with Most Violations</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-theme">
                            <thead className="bg-card">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Driver</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Violations</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Points</th>
                              </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-theme">
                              {violationStats.topViolators.slice(0, 5).map((violator: any, index: number) => (
                                <tr key={index} className="hover:bg-[rgba(255,255,255,0.03)]">
                                  <td className="px-4 py-3 text-sm">
                                    <div>
                                      <div className="font-medium text-primary">{violator.driver?.name}</div>
                                      <div className="text-secondary text-xs">{violator.driver?.internalId}</div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-primary">{violator.count}</td>
                                  <td className="px-4 py-3 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${violator.totalPoints > 20 ? 'bg-red-100 text-red-800' :
                                      violator.totalPoints > 10 ? 'bg-orange-100 text-orange-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                      {violator.totalPoints} pts
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-secondary mt-4">
                      * Data automatically synced from Geotab telematics system and manual entries
                    </p>
                  </div>
                )}

                {/* Show estimated violations as fallback if no real data */}
                {!violationStats && twoYearData && (
                  <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-primary">Driver Violations (Past 2 Years)</h3>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                        Estimated Data
                      </span>
                    </div>
                    <p className="text-sm text-secondary mb-6 bg-card p-4 rounded-lg border border-blue-200">
                      <FaInfoCircle className="inline mr-2 text-[#00D1FF]" />
                      No real violation data available. Please sync with Geotab or add violations manually to see actual data.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Estimated Speeding */}
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <FaTachometerAlt className="text-[#A855F7]" size={20} />
                          <h4 className="text-lg font-semibold text-primary">Estimated Speeding</h4>
                        </div>
                        <div className="flex justify-between p-3 bg-card rounded-lg">
                          <span className="font-medium text-primary">Est. Speeding Events</span>
                          <span className="font-bold text-red-800">{Math.floor(twoYearData.summary.totalInspections * 0.05)}</span>
                        </div>
                      </div>
                      {/* Estimated Tickets */}
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <FaExclamationCircle className="text-[#F59E0B]" size={20} />
                          <h4 className="text-lg font-semibold text-primary">Estimated Tickets</h4>
                        </div>
                        <div className="flex justify-between p-3 bg-card rounded-lg">
                          <span className="font-medium text-primary">Est. Traffic Tickets</span>
                          <span className="font-bold text-orange-800">{Math.floor(twoYearData.summary.totalInspections * 0.1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Monthly View */}
          <div>
            {/* Filters */}
            <div className="bg-card rounded-lg shadow-sm border border-theme p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">Select Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <option
                          key={year}
                          value={year}
                          className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                        >
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-headings mb-2">Select Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    disabled={loading || monthlyData.length === 0}
                    className="w-full px-3 py-2 text-sm border border-theme rounded-lg
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
                      Select a month
                    </option>

                    {monthlyData.map((month) => (
                      <option
                        key={month.month}
                        value={month.month}
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        {month.month} {month.year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">Chart Type</label>
                  <div className="flex bg-card rounded-lg p-1">
                    <button
                      onClick={() => setChartType('pie')}
                      className={`flex items-center gap-2 px-3 py-1 rounded-md font-medium transition-all ${chartType === 'pie'
                        ? 'bg-card text-[#9793E4] shadow-sm'
                        : 'text-secondary hover:text-primary'
                        }`}
                    >
                      <FaChartPie size={14} />
                      Pie
                    </button>
                    <button
                      onClick={() => setChartType('bar')}
                      className={`flex items-center gap-2 px-3 py-1 rounded-md font-medium transition-all ${chartType === 'bar'
                        ? 'bg-card text-[#9793E4] shadow-sm'
                        : 'text-secondary hover:text-primary'
                        }`}
                    >
                      <FaChartBar size={14} />
                      Bar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9793E4] mx-auto mb-4"></div>
                <p className="text-xl font-semibold text-secondary">Loading monthly report...</p>
              </div>
            )}

            {!loading && monthlyData.length === 0 && (
              <div className="bg-card rounded-xl shadow-lg p-12 text-center text-secondary border border-dashed border-theme">
                <p className="text-xl font-semibold">No inspection data available for the selected filters.</p>
                <p className="text-sm mt-2">Try choosing a different year or expanding the country filter.</p>
              </div>
            )}

            {/* Stats were moved up */}

            {/* Charts Grid */}
            {!loading && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Status Chart */}
                  {currentMonthData && (chartType === 'pie'
                    ? renderPieChart(getStatusChartData(), 'Inspection Status Distribution')
                    : renderBarChart(getStatusChartData(), 'Inspection Status Distribution')
                  )}

                  {/* Country Chart */}
                  {currentMonthData && (chartType === 'pie'
                    ? renderPieChart(getCountryChartData(), 'Inspections by Country')
                    : renderBarChart(getCountryChartData(), 'Inspections by Country')
                  )}
                </div>

                {/* Monthly Trend Chart */}
                {monthlyData.length > 0 && (
                  <div className="mb-6">
                    {renderLineChart(getMonthlyTrendData(), 'Monthly Inspection Trends')}
                  </div>
                )}
              </>
            )}

            {/* Detailed Breakdown */}
            {!loading && currentMonthData && (
              <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                <h3 className="text-xl font-bold text-headings mb-6">Detailed Breakdown - {selectedMonth} {currentMonthData.year}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Status Breakdown */}
                  <div>
                    <h4 className="text-lg font-semibold text-primary mb-4">Status Breakdown</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-card border-2 border-theme rounded-lg">
                        <div className="flex items-center gap-3">
                          <FaCheckCircle className="text-green-600" size={20} />
                          <span className="font-medium text-primary">Passed</span>
                        </div>
                        <span className="font-bold text-green-800">{currentMonthData.passCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg border-2 border-theme">
                        <div className="flex items-center gap-3">
                          <FaTimesCircle className="text-red-600" size={20} />
                          <span className="font-medium text-primary">Failed</span>
                        </div>
                        <span className="font-bold text-red-800">{currentMonthData.failCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg border-2 border-theme">
                        <div className="flex items-center gap-3">
                          <FaExclamationTriangle className="text-yellow-600" size={20} />
                          <span className="font-medium text-primary">Warning</span>
                        </div>
                        <span className="font-bold text-yellow-800">{currentMonthData.warningCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg border-2 border-theme">
                        <div className="flex items-center gap-3">
                          <FaBan className="text-red-800" size={20} />
                          <span className="font-medium text-primary">Out of Service</span>
                        </div>
                        <span className="font-bold text-red-900">{currentMonthData.outOfServiceCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Country Breakdown */}
                  <div>
                    <h4 className="text-lg font-semibold text-headings mb-4">Country Breakdown</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg">
                        <div className="flex items-center gap-3">
                          <FaFlag className="text-primary" size={20} />
                          <span className="font-medium text-primary">Canada</span>
                        </div>
                        <span className="font-bold text-primary">{currentMonthData.canadaInspections}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg">
                        <div className="flex items-center gap-3">
                          <FaFlagUsa className="text-primary" size={20} />
                          <span className="font-medium text-primary">USA</span>
                        </div>
                        <span className="font-bold text-primary">{currentMonthData.usaInspections}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Old Data Section - Static Display */}
          {oldData && (oldData.inspections.total > 0 || oldData.tickets.total > 0) && (
            <div className="mt-6 bg-card rounded-lg shadow-sm border-2 border-red-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-primary flex items-center gap-2 mb-2">
                    <FaExclamationCircle className="text-[#A855F7]" />
                    Old Data to be Deleted (Older than 2 Years)
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-secondary">
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-[#00D1FF]" />
                      <span><strong>Cutoff Date:</strong> {new Date(oldData.cutoffDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaDatabase className="text-[#F59E0B]" />
                      <span><strong>Total Records:</strong> {oldData.inspections.total + oldData.tickets.total}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaInfoCircle className="text-[#00D1FF]" />
                      <span>All data before the cutoff date will be permanently deleted</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-card border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                      <FaExclamationCircle className="text-[#A855F7]" size={18} />
                      CVSA Inspections
                    </h3>
                    <span className="text-3xl font-bold text-[#A855F7]">{oldData.inspections.total}</span>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs text-secondary mb-2">Status Breakdown:</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-secondary">Pass:</span>
                        <span className="font-semibold text-green-700">
                          {oldData.inspections.byStatus.pass}
                          ({oldData.inspections.total > 0 ? Math.round((oldData.inspections.byStatus.pass / oldData.inspections.total) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-secondary">Fail:</span>
                        <span className="font-semibold text-red-700">
                          {oldData.inspections.byStatus.fail}
                          ({oldData.inspections.total > 0 ? Math.round((oldData.inspections.byStatus.fail / oldData.inspections.total) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-secondary">Warning:</span>
                        <span className="font-semibold text-yellow-700">
                          {oldData.inspections.byStatus.warning}
                          ({oldData.inspections.total > 0 ? Math.round((oldData.inspections.byStatus.warning / oldData.inspections.total) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-secondary">Out of Service:</span>
                        <span className="font-semibold text-red-800">
                          {oldData.inspections.byStatus.outOfService}
                          ({oldData.inspections.total > 0 ? Math.round((oldData.inspections.byStatus.outOfService / oldData.inspections.total) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>
                  {oldData.inspections.oldestDate && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-xs text-secondary">
                        <strong>Oldest Record:</strong> {new Date(oldData.inspections.oldestDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-secondary mt-1">
                        <strong>Date Range:</strong> {new Date(oldData.inspections.oldestDate).toLocaleDateString()} - {new Date(oldData.cutoffDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-card border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                      <FaExclamationCircle className="text-[#F59E0B]" size={18} />
                      Traffic Tickets
                    </h3>
                    <span className="text-3xl font-bold text-[#F59E0B]">{oldData.tickets.total}</span>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs text-secondary mb-2">Status Breakdown:</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-secondary">Paid:</span>
                        <span className="font-semibold text-green-700">
                          {oldData.tickets.byStatus.paid}
                          ({oldData.tickets.total > 0 ? Math.round((oldData.tickets.byStatus.paid / oldData.tickets.total) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-secondary">Unpaid:</span>
                        <span className="font-semibold text-red-700">
                          {oldData.tickets.byStatus.unpaid}
                          ({oldData.tickets.total > 0 ? Math.round((oldData.tickets.byStatus.unpaid / oldData.tickets.total) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-secondary">Fight:</span>
                        <span className="font-semibold text-yellow-700">
                          {oldData.tickets.byStatus.fight}
                          ({oldData.tickets.total > 0 ? Math.round((oldData.tickets.byStatus.fight / oldData.tickets.total) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-secondary">Dismissed:</span>
                        <span className="font-semibold text-blue-700">
                          {oldData.tickets.byStatus.dismissed}
                          ({oldData.tickets.total > 0 ? Math.round((oldData.tickets.byStatus.dismissed / oldData.tickets.total) * 100) : 0}%)
                        </span>
                      </div>
                      {oldData.tickets.byStatus.reduced > 0 && (
                        <div className="flex items-center justify-between p-2 bg-card rounded">
                          <span className="text-secondary">Reduced:</span>
                          <span className="font-semibold text-purple-700">
                            {oldData.tickets.byStatus.reduced}
                            ({oldData.tickets.total > 0 ? Math.round((oldData.tickets.byStatus.reduced / oldData.tickets.total) * 100) : 0}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {oldData.tickets.oldestDate && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <p className="text-xs text-secondary">
                        <strong>Oldest Record:</strong> {new Date(oldData.tickets.oldestDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-secondary mt-1">
                        <strong>Date Range:</strong> {new Date(oldData.tickets.oldestDate).toLocaleDateString()} - {new Date(oldData.cutoffDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Inspections Table */}
              {oldData && oldData.inspections.total > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-primary mb-3">
                    CVSA Inspections ({oldData.inspections.preview.length} of {oldData.inspections.total} shown)
                  </h3>
                  <div className="border border-theme rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="bg-card sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Inspection ID</th>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Date</th>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Status</th>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Location</th>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Vehicle</th>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Driver</th>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Violations</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-theme">
                          {oldData.inspections.preview.map((inspection) => (
                            <tr key={inspection._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                              <td className="px-4 py-2 text-primary">{inspection.inspectionId}</td>
                              <td className="px-4 py-2 text-secondary">{new Date(inspection.date).toLocaleDateString()}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${inspection.status === 'pass' ? 'bg-green-100 text-green-800' :
                                  inspection.status === 'fail' ? 'bg-red-100 text-red-800' :
                                    inspection.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-200 text-red-900'
                                  }`}>
                                  {inspection.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-secondary">{inspection.location}</td>
                              <td className="px-4 py-2 text-secondary">{inspection.vehicle?.unitNo || 'N/A'}</td>
                              <td className="px-4 py-2 text-secondary">{inspection.driver?.name || 'N/A'}</td>
                              <td className="px-4 py-2 text-secondary">{inspection.violationsCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tickets Table */}
              {oldData && oldData.tickets.total > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-primary mb-3">
                    Traffic Tickets ({oldData.tickets.preview.length} of {oldData.tickets.total} shown)
                  </h3>
                  <div className="border border-theme rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="bg-card sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Ticket #</th>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Date Issued</th>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Violation Type</th>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Amount</th>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Status</th>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Vehicle</th>
                            <th className="px-4 py-2 text-left font-semibold text-primary">Driver</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-theme">
                          {oldData.tickets.preview.map((ticket) => (
                            <tr key={ticket._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                              <td className="px-4 py-2 text-primary">{ticket.ticketNumber}</td>
                              <td className="px-4 py-2 text-secondary">{new Date(ticket.dateIssued).toLocaleDateString()}</td>
                              <td className="px-4 py-2 text-secondary">{ticket.violationType}</td>
                              <td className="px-4 py-2 text-secondary">${ticket.amount.toFixed(2)}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${ticket.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  ticket.status === 'unpaid' ? 'bg-red-100 text-red-800' :
                                    ticket.status === 'dismissed' ? 'bg-blue-100 text-blue-800' :
                                      'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {ticket.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-secondary">{ticket.vehicle?.unitNo || 'N/A'}</td>
                              <td className="px-4 py-2 text-secondary">{ticket.driver?.name || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Button Section */}
              {oldData && (
                <div className="mt-6 pt-6 border-t-2 border-red-300">
                  <div className="bg-card border border-red-300 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <FaInfoCircle className="text-[#A855F7] mt-1 flex-shrink-0" size={20} />
                      <div className="flex-1">
                        <h4 className="font-bold text-red-900 mb-2">⚠️ Important: Data Deletion Warning</h4>
                        <p className="text-sm text-primary mb-2">
                          This action will permanently delete <strong>{oldData.inspections.total + oldData.tickets.total} records</strong> from the database:
                        </p>
                        <ul className="text-sm text-primary list-disc list-inside space-y-1 mb-2">
                          <li><strong>{oldData.inspections.total} CVSA Inspection records</strong> older than {new Date(oldData.cutoffDate).toLocaleDateString()}</li>
                          <li><strong>{oldData.tickets.total} Traffic Ticket records</strong> older than {new Date(oldData.cutoffDate).toLocaleDateString()}</li>
                        </ul>
                        <p className="text-sm text-red-700 font-semibold">
                          ⚠️ This action cannot be undone. Please ensure you have backed up any necessary data before proceeding.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-secondary">
                      <p><strong>Total Records to Delete:</strong> {oldData.inspections.total + oldData.tickets.total}</p>
                      <p><strong>Cutoff Date:</strong> {new Date(oldData.cutoffDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <button
                      onClick={handleDeleteOldData}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg font-semibold text-lg"
                    >
                      <FaTrashAlt size={18} />
                      Delete All Old Data ({oldData.inspections.total + oldData.tickets.total} records)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MonthlyReport;
