import { useEffect, useState } from "react";

import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaFileInvoiceDollar,
  FaClipboardCheck,
  FaCarCrash,
  FaChartLine,
  FaTruck,
  FaTrailer,
  FaIdCard,
  FaSatelliteDish,
} from "react-icons/fa";
import { getCvsaInspectionStats, getTicketStats, getIncidentStats } from "../../../axios/api/admin";
import { fetchComplianceDashboard, type ComplianceAssetCounts } from "../../../axios/api/complianceDashboard";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface CvsaStats {
  total: number;
  pass: number;
  fail: number;
  warning: number;
  outOfService: number;
}

interface TicketStats {
  total: number;
  paid: number;
  unpaid: number;
  fight: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  fightAmount: number;
}

interface IncidentStats {
  total: number;
  open: number;
  underReview: number;
  closed: number;
}



function Dashboard() {
  const navigate = useNavigate();
  const [cvsaStats, setCvsaStats] = useState<CvsaStats>({
    total: 0,
    pass: 0,
    fail: 0,
    warning: 0,
    outOfService: 0,
  });
  const [ticketStats, setTicketStats] = useState<TicketStats>({
    total: 0,
    paid: 0,
    unpaid: 0,
    fight: 0,
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    fightAmount: 0,
  });
  const [incidentStats, setIncidentStats] = useState<IncidentStats>({
    total: 0,
    open: 0,
    underReview: 0,
    closed: 0,
  });
  const [assetCounts, setAssetCounts] = useState<ComplianceAssetCounts>({
    trucks: 0,
    trailers: 0,
    drivers: 0,
    gpsOnline: 0,
  });
  const [loading, setLoading] = useState(true);


  const fetchComplianceData = async () => {
    setLoading(true);
    try {
      const [cvsaRes, ticketRes, incidentRes, dashboardRes] = await Promise.all([
        getCvsaInspectionStats(),
        getTicketStats(),
        getIncidentStats(),
        fetchComplianceDashboard(),
      ]);

      if (cvsaRes?.success) {
        setCvsaStats(cvsaRes.data || { total: 0, pass: 0, fail: 0, warning: 0, outOfService: 0 });
      }

      if (ticketRes?.success) {
        setTicketStats(ticketRes.data || { total: 0, paid: 0, unpaid: 0, fight: 0, totalAmount: 0, paidAmount: 0, unpaidAmount: 0, fightAmount: 0 });
      }

      if (incidentRes?.success) {
        setIncidentStats(incidentRes.data || { total: 0, open: 0, underReview: 0, closed: 0 });
      }

      if (dashboardRes?.success && dashboardRes.data?.assetCounts) {
        setAssetCounts(dashboardRes.data.assetCounts);
      }


    } catch (error: any) {
      console.error("Error fetching compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    onClick,
    bgColor,
    iconColor,
    cardBg
  }: {
    title: string;
    value: number | string;
    subtitle: string;
    icon: React.ComponentType<any>;
    onClick?: () => void;
    bgColor: string;
    iconColor: string;
    cardBg?: string;
  }) => {
    return (
      <div
        onClick={onClick}
        className={`${cardBg || 'bg-card'} rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-theme hover:border-theme hover:scale-[1.02] active:scale-[0.98]`}
      >
        <div className="flex items-start justify-between mb-2">
          {/* Left side content */}
          <div className="flex-1">
            <h3 className="text-sm font-bold text-primary mb-1">{title}</h3>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xl font-bold text-primary">{value}</span>
            </div>
            <p className="text-xs text-secondary">{subtitle}</p>
          </div>

          {/* Right side icon */}
          <div className={`${bgColor} rounded-lg p-2 shadow-sm`}>
            {/* The icons from react-icons/fa usually don't accept strokeWidth, so we adjust sizing if needed */}
            <Icon className={iconColor} size={21} />
          </div>
        </div>
      </div>
    );
  };

  const DetailSection = ({ title, icon: Icon, children, onClickHeader }: { title: string, icon: any, children: React.ReactNode, onClickHeader?: () => void }) => (
    <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden mb-6">
      <div
        className={`px-6 py-4 border-b border-theme flex justify-between items-center ${onClickHeader ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors' : ''}`}
        onClick={onClickHeader}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-card`}>
            <Icon className="text-headings" size={18} />
          </div>
          <h3 className="text-lg font-bold text-headings">{title}</h3>
        </div>
        {onClickHeader && <ChevronRight className="text-secondary" size={20} />}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );

  // Reusing the smaller card style for inner grid items as well to match overall density
  const InnerGridCard = ({ label, value, colorClass, onClick, icon: Icon }: { label: string, value: string | number, colorClass: string, onClick?: () => void, icon: any }) => (
    <div
      onClick={onClick}
      className={`bg-card border border-theme rounded-lg p-4 flex items-center justify-between shadow-sm hover:shadow transition-all ${onClick ? 'cursor-pointer hover:border-[rgba(255,255,255,0.15)]' : ''}`}
    >
      <div>
        <p className="text-xs text-secondary font-medium uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
      </div>
      <div className={`p-2 rounded-full bg-card border border-theme`}>
        <Icon className={colorClass} size={16} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" >
        <div className="text-center">
          {/* Using simple loading text matching dispatch style */}
          <div className="w-12 h-12 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen pb-10 bg-main" >
        <div className="relative w-full mx-auto p-2">
          {/* Gradient band - Matching Dispatch */}
          <div
            className="absolute inset-x-0 top-0"

            aria-hidden="true"
          />

          {/* Main content */}
          <div className="relative z-10 px-4 pt-3 pb-6">
            {/* Header Section */}
            <div className="mb-4 relative z-10">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-headings">Compliance Overview</h1>
                <div className="flex items-center gap-2 text-secondary">
                  <span className="text-xs">Compliance Dashboard</span>

                </div>
              </div>
            </div>

            {/* Fleet Asset Stats - Trucks / Trailers / Drivers / GPS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard
                title="Trucks"
                value={assetCounts.trucks}
                subtitle="Total trucks in fleet"
                icon={FaTruck}
                bgColor=""
                iconColor="text-[var(--accent-blue)]"
                cardBg="bg-[var(--accent-blue)]/20"
                onClick={() => navigate("/admin/fleetmaintenance/trucks")}
              />
              <StatCard
                title="Trailers"
                value={assetCounts.trailers}
                subtitle="Total trailers in fleet"
                icon={FaTrailer}
                bgColor=""
                iconColor="text-[var(--accent-purple)]"
                cardBg="bg-[var(--accent-purple)]/20"
                onClick={() => navigate("/admin/fleetmaintenance/trailers")}
              />
              <StatCard
                title="Drivers"
                value={assetCounts.drivers}
                subtitle="Total active drivers"
                icon={FaIdCard}
                bgColor=""
                iconColor="text-[var(--accent-orange)]"
                cardBg="bg-[var(--accent-orange)]/20"
                onClick={() => navigate("/admin/gpsvehicle/drivers")}
              />
              <StatCard
                title="GPS"
                value={assetCounts.gpsOnline}
                subtitle="Units reporting location (24h)"
                icon={FaSatelliteDish}
                bgColor=""
                iconColor="text-green-600"
                cardBg="bg-green-600/20"
                onClick={() => navigate("/admin/gpsvehicle/livetracking/truck")}
              />
            </div>

            {/* Stats Cards - Matching Dispatch Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 -mt-2 mb-4">
              <StatCard
                title="Total Inspections"
                value={cvsaStats.total}
                subtitle={`Pass: ${cvsaStats.pass} | Fail: ${cvsaStats.fail}`}
                icon={FaClipboardCheck}
                bgColor=""
                iconColor="text-[var(--accent-blue)]"
                cardBg="bg-[var(--accent-blue)]/20"
                onClick={() => navigate("/admin/compliance/cvsa-inspection")}
              />
              <StatCard
                title="Total Tickets"
                value={ticketStats.total}
                subtitle={`Paid: ${ticketStats.paid} | Unpaid: ${ticketStats.unpaid}`}
                icon={FaFileInvoiceDollar}
                bgColor=""
                iconColor="text-[var(--accent-purple)]"
                cardBg="bg-[var(--accent-purple)]/20"
                onClick={() => navigate("/admin/compliance/tickets")}
              />
              <StatCard
                title="Total Incidents"
                value={incidentStats.total}
                subtitle={`Open: ${incidentStats.open} | Closed: ${incidentStats.closed}`}
                icon={FaCarCrash}
                bgColor=""
                iconColor="text-[var(--accent-orange)]"
                cardBg="bg-[var(--accent-orange)]/20"
                onClick={() => navigate("/admin/compliance/accidents")}
              />
            </div>

            {/* Feature Sections - Matching Table Container Style */}
            <div className="space-y-6">

              {/* CVSA Section */}
              <DetailSection
                title="CVSA Inspections Breakdown"
                icon={FaClipboardCheck}
                onClickHeader={() => navigate("/admin/compliance/cvsa-inspection")}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InnerGridCard
                    label="Pass"
                    value={cvsaStats.pass}
                    colorClass="text-green-600"
                    icon={FaCheckCircle}
                    onClick={() => navigate("/admin/compliance/cvsa-inspection?status=pass")}
                  />
                  <InnerGridCard
                    label="Fail"
                    value={cvsaStats.fail}
                    colorClass="text-[#A855F7]"
                    icon={FaTimesCircle}
                    onClick={() => navigate("/admin/compliance/cvsa-inspection?status=fail")}
                  />
                  <InnerGridCard
                    label="Warning"
                    value={cvsaStats.warning}
                    colorClass="text-[#00FFA3]"
                    icon={FaExclamationTriangle}
                    onClick={() => navigate("/admin/compliance/cvsa-inspection?status=warning")}
                  />
                  <InnerGridCard
                    label="Out of Service"
                    value={cvsaStats.outOfService}
                    colorClass="text-red-800"
                    icon={FaShieldAlt}
                    onClick={() => navigate("/admin/compliance/cvsa-inspection?status=out-of-service")}
                  />
                </div>
              </DetailSection>

              {/* Tickets Section */}
              <DetailSection
                title="Tickets Breakdown"
                icon={FaFileInvoiceDollar}
                onClickHeader={() => navigate("/admin/compliance/tickets")}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InnerGridCard
                    label="Paid"
                    value={ticketStats.paid}
                    colorClass="text-green-600"
                    icon={FaCheckCircle}
                    onClick={() => navigate("/admin/compliance/tickets?status=paid")}
                  />
                  <InnerGridCard
                    label="Unpaid"
                    value={ticketStats.unpaid}
                    colorClass="text-[#A855F7]"
                    icon={FaExclamationTriangle}
                    onClick={() => navigate("/admin/compliance/tickets?status=unpaid")}
                  />
                  <InnerGridCard
                    label="Fighting"
                    value={ticketStats.fight}
                    colorClass="text-[#F59E0B]"
                    icon={FaShieldAlt}
                    onClick={() => navigate("/admin/compliance/tickets?status=fight")}
                  />
                  <div className="bg-card border border-theme rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-secondary font-medium uppercase tracking-wider">Total Amount</p>
                      <p className="text-xl font-bold mt-1 text-primary">${ticketStats.totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-card border border-theme rounded-full">
                      <FaFileInvoiceDollar className="text-secondary" size={16} />
                    </div>
                  </div>
                </div>
              </DetailSection>

              {/* Incidents Section */}
              <DetailSection
                title="Incidents Breakdown"
                icon={FaCarCrash}
                onClickHeader={() => navigate("/admin/compliance/accidents")}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InnerGridCard
                    label="Open Cases"
                    value={incidentStats.open}
                    colorClass="text-[#A855F7]"
                    icon={FaExclamationTriangle}
                    onClick={() => navigate("/admin/compliance/accidents?status=open")}
                  />
                  <InnerGridCard
                    label="Under Review"
                    value={incidentStats.underReview}
                    colorClass="text-[#00FFA3]"
                    icon={FaClipboardCheck}
                    onClick={() => navigate("/admin/compliance/accidents?status=under-review")}
                  />
                  <InnerGridCard
                    label="Closed Cases"
                    value={incidentStats.closed}
                    colorClass="text-green-600"
                    icon={FaCheckCircle}
                    onClick={() => navigate("/admin/compliance/accidents?status=closed")}
                  />
                </div>
              </DetailSection>

              {/* Monthly Report Quick Link */}
              <div
                className="bg-card rounded-lg p-4 shadow-sm border border-theme flex items-center justify-between cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                onClick={() => navigate("/admin/compliance/monthly-report")}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-card rounded-lg">
                    <FaChartLine className="text-headings" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-headings">Monthly Compliance Report</h3>
                    <p className="text-sm text-secondary">View detailed reports and analytics</p>
                  </div>
                </div>
                <ChevronRight className="text-secondary" />
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
