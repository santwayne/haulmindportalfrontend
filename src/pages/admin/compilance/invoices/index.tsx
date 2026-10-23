import { useMemo, useState, useEffect, useRef } from "react";
import ExcelJS from "exceljs";
import {
  Download,
  Filter,
  Search,
  X,
  Trash2,
} from "lucide-react";
import { FaFileInvoiceDollar, FaClipboardList, FaTools, FaExclamationCircle } from "react-icons/fa";
import { getComplianceInvoices, deleteComplianceInvoice } from "../../../../axios/api/admin";

const StatCard = ({ title, value, subtitle, icon: Icon, bgColor, iconColor }: any) => (
  <div className="bg-card rounded-xl p-4 border border-theme shadow-sm flex items-start justify-between">
    <div>
      <p className="text-xs font-medium text-secondary uppercase tracking-wide">{title}</p>
      <h3 className="text-2xl font-bold text-primary mt-1">{value}</h3>
      <p className="text-xs text-secondary mt-1">{subtitle}</p>
    </div>
    <div className={`p-3 rounded-lg ${bgColor}`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
  </div>
);

type MechanicInvoice = {
  id: string;
  type?: 'general' | 'scheduled' | 'safety';
  serviceDate: string;
  unitNumber: string;
  makeModel: string;
  vinOrPlate: string;
  description: string;
  odometer: number;
  parts: Array<{ name?: string; partName?: string; partNumber?: string; quantity?: number; cost?: number }>;
  notes: string;
  serviceProvider: string;
  invoiceNumber: string;
  passedInspection: boolean;
  driver: string;
  serviceCategory: string;
  location: string;
  amount?: number;
  customer?: string;
  taxes?: Array<{ name: string; percentage: number }>;
  taxAmount?: number;
  totalAmount?: number;
};

// Removed static data - now fetching from API

const ComplianceInvoices = () => {
  const [truckFilter, setTruckFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [mechanicFilter, setMechanicFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<MechanicInvoice[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<MechanicInvoice | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<MechanicInvoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Refs for scrollbar synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);



  // Fetch invoices from API
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const params: any = {
          page: currentPage,
          limit: pageSize
        };

        if (truckFilter !== "all") params.unitNumber = truckFilter;
        if (driverFilter !== "all") params.driver = driverFilter;
        if (mechanicFilter !== "all") params.serviceProvider = mechanicFilter;
        if (searchTerm.trim()) params.search = searchTerm.trim();

        const response = await getComplianceInvoices(params);

        if (response?.success && response?.data) {
          // Map API response to MechanicInvoice format
          const mappedInvoices: MechanicInvoice[] = response.data.map((invoice: any) => ({
            id: invoice.id || invoice._id || '',
            type: invoice.type || 'general',
            serviceDate: invoice.serviceDate || new Date().toISOString(),
            unitNumber: invoice.unitNumber || 'N/A',
            makeModel: invoice.makeModel || 'N/A',
            vinOrPlate: invoice.vinOrPlate || 'N/A',
            description: invoice.description || '',
            odometer: invoice.odometer || 0,
            parts: invoice.parts || [],
            notes: invoice.notes || '',
            serviceProvider: invoice.serviceProvider || 'N/A',
            invoiceNumber: invoice.invoiceNumber || 'N/A',
            passedInspection: invoice.passedInspection !== false,
            driver: invoice.driver || 'N/A',
            serviceCategory: invoice.serviceCategory || 'N/A',
            location: invoice.location || 'N/A',
            customer: invoice.customer || 'N/A',
            amount: invoice.amount || 0,
            taxes: invoice.taxes || [],
            taxAmount: invoice.taxAmount || 0,
            totalAmount: invoice.totalAmount || invoice.amount || 0
          }));

          setInvoices(mappedInvoices);

          if (response.pagination) {
            setTotalPages(response.pagination.totalPages || 1);
            setTotal(response.pagination.total || 0);
          }
        } else {
          setInvoices([]);
        }
      } catch (error) {
        console.error('Error fetching fleet invoices:', error);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [truckFilter, driverFilter, mechanicFilter, searchTerm, currentPage]);

  // Sync scroll between top and bottom scrollbars
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;

    if (!topScroll || !bottomScroll) return;

    let isScrolling = false;

    const handleTopScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      bottomScroll.scrollLeft = topScroll.scrollLeft;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    const handleBottomScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      topScroll.scrollLeft = bottomScroll.scrollLeft;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    // Sync scroll widths
    const syncScrollWidths = () => {
      const bottomScrollWidth = bottomScroll.scrollWidth;
      const topInner = topScroll.querySelector('.top-scroll-content') as HTMLElement;
      if (topInner && bottomScrollWidth > 0) {
        topInner.style.width = `${bottomScrollWidth}px`;
        topScroll.scrollLeft = bottomScroll.scrollLeft;
      }
    };

    // Initial sync - wait for table to render
    const timeoutId = setTimeout(syncScrollWidths, 100);
    const timeoutId2 = setTimeout(syncScrollWidths, 300);
    const timeoutId3 = setTimeout(syncScrollWidths, 500);

    // Observe table changes
    const tableObserver = new MutationObserver(() => {
      syncScrollWidths();
    });

    const bottomTable = bottomScroll.querySelector('table');
    if (bottomTable) {
      tableObserver.observe(bottomTable, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    topScroll.addEventListener('scroll', handleTopScroll, { passive: true });
    bottomScroll.addEventListener('scroll', handleBottomScroll, { passive: true });
    window.addEventListener('resize', syncScrollWidths);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      tableObserver.disconnect();
      topScroll.removeEventListener('scroll', handleTopScroll);
      bottomScroll.removeEventListener('scroll', handleBottomScroll);
      window.removeEventListener('resize', syncScrollWidths);
    };
  }, [invoices, searchTerm, truckFilter, driverFilter, mechanicFilter]);

  // Get unique values for filters
  const uniqueTrucks = useMemo(
    () => ["all", ...new Set(invoices.map((invoice) => invoice.unitNumber))],
    [invoices]
  );
  const uniqueDrivers = useMemo(
    () => ["all", ...new Set(invoices.map((invoice) => invoice.driver))],
    [invoices]
  );
  const uniqueMechanics = useMemo(
    () => ["all", ...new Set(invoices.map((invoice) => invoice.serviceProvider))],
    [invoices]
  );

  const filteredInvoices = invoices; // Already filtered by API

  const summary = useMemo(() => {
    const passed = filteredInvoices.filter((invoice) => invoice.passedInspection).length;
    const followUps = filteredInvoices.length - passed;
    const totalPartsSpend = filteredInvoices.reduce((sum, invoice) => {
      return (
        sum +
        (invoice.parts || []).reduce((partsSum, part) => partsSum + (Number(part.cost) || 0), 0)
      );
    }, 0);
    const totalAmount = filteredInvoices.reduce((sum, invoice) => {
      return sum + (invoice.totalAmount || invoice.amount || 0);
    }, 0);
    return {
      total: filteredInvoices.length,
      passed,
      followUps,
      totalPartsSpend,
      totalAmount,
    };
  }, [filteredInvoices]);

  // Removed serviceReminders - can be added later if needed

  const handleExport = async () => {
    if (!filteredInvoices.length) {
      alert("No invoice data available for the current filters.");
      return;
    }

    try {
      setExporting(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Fleet Invoices");

      worksheet.columns = [
        { header: "Invoice Number", key: "invoiceNumber", width: 18 },
        { header: "Service Date", key: "serviceDate", width: 16 },
        { header: "Unit Number", key: "unitNumber", width: 14 },
        { header: "Driver", key: "driver", width: 16 },
        { header: "Make / Model", key: "makeModel", width: 24 },
        { header: "VIN / License Plate", key: "vinOrPlate", width: 24 },
        { header: "Description", key: "description", width: 32 },
        { header: "Odometer", key: "odometer", width: 14 },
        { header: "Parts Used", key: "parts", width: 32 },
        { header: "Service Provider (Mechanic)", key: "serviceProvider", width: 26 },
        { header: "Location", key: "location", width: 20 },
        { header: "Passed Inspection", key: "passedInspection", width: 18 },
        { header: "Notes", key: "notes", width: 40 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0EA5E9" },
      };

      filteredInvoices.forEach((invoice) => {
        worksheet.addRow({
          invoiceNumber: invoice.invoiceNumber || "N/A",
          serviceDate: invoice.serviceDate ? new Date(invoice.serviceDate).toLocaleDateString() : "N/A",
          unitNumber: invoice.unitNumber || "N/A",
          driver: invoice.driver || "N/A",
          makeModel: invoice.makeModel || "N/A",
          vinOrPlate: invoice.vinOrPlate || "N/A",
          description: invoice.description || "N/A",
          odometer: invoice.odometer ? invoice.odometer.toLocaleString() : "N/A",
          parts: invoice.parts && invoice.parts.length > 0
            ? invoice.parts.map((part: any) => {
              const partName = part.partName || part.name || part.partNumber || 'Part';
              const quantity = part.quantity || 1;
              const cost = part.cost || 0;
              return `${partName}${quantity > 1 ? ` (Qty: ${quantity})` : ''}${cost > 0 ? ` ($${cost.toFixed(2)})` : ''}`;
            }).join(", ")
            : "No parts listed",
          serviceProvider: invoice.serviceProvider || "N/A",
          location: invoice.location || "N/A",
          passedInspection: invoice.passedInspection ? "Passed" : "Follow-up Required",
          notes: invoice.notes || "",
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Fleet_Invoices_${new Date()
        .toISOString()
        .split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export invoices:", error);
      alert("Unable to export invoices. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setTruckFilter("all");
    setDriverFilter("all");
    setMechanicFilter("all");
    setSearchTerm("");
  };

  const handleDeleteInvoice = (invoice: MechanicInvoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteModal(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    setDeleting(true);
    try {
      const invoiceType = invoiceToDelete.type || 'general';
      const response = await deleteComplianceInvoice(invoiceToDelete.id, invoiceType);

      if (response?.success) {
        setShowDeleteModal(false);
        setInvoiceToDelete(null);
        // Refresh the invoices list
        const params: any = {
          page: currentPage,
          limit: pageSize
        };
        if (truckFilter !== "all") params.unitNumber = truckFilter;
        if (driverFilter !== "all") params.driver = driverFilter;
        if (mechanicFilter !== "all") params.serviceProvider = mechanicFilter;
        if (searchTerm.trim()) params.search = searchTerm.trim();

        const res = await getComplianceInvoices(params);
        if (res?.success && res?.data) {
          const mappedInvoices: MechanicInvoice[] = res.data.map((invoice: any) => ({
            id: invoice.id || invoice._id || '',
            type: invoice.type || 'general',
            serviceDate: invoice.serviceDate || new Date().toISOString(),
            unitNumber: invoice.unitNumber || 'N/A',
            makeModel: invoice.makeModel || 'N/A',
            vinOrPlate: invoice.vinOrPlate || 'N/A',
            description: invoice.description || '',
            odometer: invoice.odometer || 0,
            parts: invoice.parts || [],
            notes: invoice.notes || '',
            serviceProvider: invoice.serviceProvider || 'N/A',
            invoiceNumber: invoice.invoiceNumber || 'N/A',
            passedInspection: invoice.passedInspection !== false,
            driver: invoice.driver || 'N/A',
            serviceCategory: invoice.serviceCategory || 'N/A',
            location: invoice.location || 'N/A',
            customer: invoice.customer || 'N/A',
            amount: invoice.amount || 0,
            taxes: invoice.taxes || [],
            taxAmount: invoice.taxAmount || 0,
            totalAmount: invoice.totalAmount || invoice.amount || 0
          }));
          setInvoices(mappedInvoices);
          if (res.pagination) {
            setTotalPages(res.pagination.totalPages || 1);
            setTotal(res.pagination.total || 0);
          }
        }
        alert('Service deleted successfully');
      } else {
        alert(response?.message || 'Failed to delete service');
      }
    } catch (error: any) {
      console.error('Error deleting service:', error);
      alert(error?.message || 'Error deleting service');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen pb-10" >
      <div className="relative w-full mx-auto p-2">
        {/* Header Section - Always visible */}
        <div className="relative px-4 pt-3 pb-6" style={{ backgroundColor: '#EDF8FF', position: 'relative' }}>
          <div className="mb-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black">Fleet Invoices</h1>
                <div className="flex items-center gap-2 text-black/90">
                  <span className="text-xs">Manage maintenance invoices</span>
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-card text-[rgba(0,209,255,0.15)] rounded-lg hover:bg-card/90 shadow-sm transition-all font-bold text-sm"
              >
                <Download className="w-4 h-4" />
                {exporting ? "Exporting..." : "Export to Excel"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 -mt-2 mb-4">
            <StatCard title="Total Invoices" value={summary.total} subtitle="All time" icon={FaClipboardList} bgColor="bg-card" iconColor="text-[#00D1FF]" />
            <StatCard title="Total Parts Spend" value={`$${summary.totalPartsSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subtitle="Parts & Materials" icon={FaFileInvoiceDollar} bgColor="bg-green-50" iconColor="text-green-600" />
            <StatCard title="Total Amount (with GST)" value={`$${summary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subtitle="Including all taxes" icon={FaFileInvoiceDollar} bgColor="bg-card" iconColor="text-purple-600" />
            <StatCard title="Follow-up Required" value={summary.followUps} subtitle="Pending inspections" icon={FaTools} bgColor="bg-card" iconColor="text-[#F59E0B]" />
          </div>

          {/* Filters */}
          <div className="bg-card rounded-xl shadow-lg border border-theme p-4 mb-4">
            <div className="flex items-center gap-2 text-primary font-semibold mb-3 text-sm">
              <Filter className="w-4 h-4 text-[#00D1FF]" />
              Filter Invoices
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wide">
                  Trucks (Unit Number)
                </label>
                <select
                  value={truckFilter}
                  onChange={(event) => setTruckFilter(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-theme px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {uniqueTrucks.map((truck) => (
                    <option key={truck} value={truck}>
                      {truck === "all" ? "All Trucks" : truck}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wide">
                  Drivers
                </label>
                <select
                  value={driverFilter}
                  onChange={(event) => setDriverFilter(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-theme px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {uniqueDrivers.map((driver) => (
                    <option key={driver} value={driver}>
                      {driver === "all" ? "All Drivers" : driver}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wide">
                  Mechanics
                </label>
                <select
                  value={mechanicFilter}
                  onChange={(event) => setMechanicFilter(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-theme px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {uniqueMechanics.map((mechanic) => (
                    <option key={mechanic} value={mechanic}>
                      {mechanic === "all" ? "All Mechanics" : mechanic}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wide">
                  Quick Search
                </label>
                <div className="mt-1 flex items-center rounded-lg border border-theme px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <Search className="w-3.5 h-3.5 text-secondary" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Invoice #, Unit, Mechanic..."
                    className="ml-2 w-full border-none text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              <button
                onClick={resetFilters}
                className="rounded-lg border border-theme px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-[rgba(255,255,255,0.03)]"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden mb-6">
            {/* Top Scrollbar - Only visible horizontal scrollbar */}
            <style>{`
              .top-scrollbar-container::-webkit-scrollbar {
                height: 8px;
              }
              .top-scrollbar-container::-webkit-scrollbar-track {
                background: #f7fafc;
              }
              .top-scrollbar-container::-webkit-scrollbar-thumb {
                background: #cbd5e0;
                border-radius: 4px;
              }
              .top-scrollbar-container::-webkit-scrollbar-thumb:hover {
                background: #a0aec0;
              }
              .table-container-hidden-scrollbar {
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE and Edge */
              }
              .table-container-hidden-scrollbar::-webkit-scrollbar {
                display: none; /* Chrome, Safari, Opera */
              }
            `}</style>
            <div
              ref={topScrollRef}
              className="overflow-x-auto overflow-y-hidden top-scrollbar-container"
              style={{
                maxHeight: '20px',
                marginBottom: '2px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e0 #f7fafc' /* Firefox */
              }}
            >
              <div className="top-scroll-content" style={{ height: '1px' }}></div>
            </div>
            {/* Main Table - Scrollbar hidden, controlled by top scrollbar */}
            <div
              ref={bottomScrollRef}
              className="overflow-x-auto overflow-y-visible table-container-hidden-scrollbar"
            >
              <table className="w-full divide-y divide-theme" style={{ minWidth: '1400px' }}>
                <thead className="bg-card">
                  <tr>
                    {[
                      "Service Date",
                      "Unit",
                      "Service Provider",
                      "Customer",
                      "Description",
                      "Service Performed",
                      "Odometer",
                      "Parts",
                      "Invoice #",
                      "Location / Notes",
                      "Total Amount",
                      "Passed",
                      "Actions",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-secondary"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setShowInvoiceDetails(true);
                      }}
                    >
                      <td className="px-6 py-2 text-xs font-semibold text-primary">
                        {invoice.serviceDate ? new Date(invoice.serviceDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-2 text-xs text-primary">
                        <div className="font-semibold">{invoice.unitNumber && invoice.unitNumber !== 'N/A' ? invoice.unitNumber : '—'}</div>
                        {invoice.makeModel && invoice.makeModel !== 'N/A' && (
                          <div className="text-[10px] text-secondary">{invoice.makeModel}</div>
                        )}
                        {invoice.vinOrPlate && invoice.vinOrPlate !== 'N/A' && (
                          <div className="text-[10px] text-secondary">{invoice.vinOrPlate}</div>
                        )}
                      </td>
                      <td className="px-6 py-2 text-xs text-primary">
                        <span className="inline-flex items-center rounded-full border border-blue-100 bg-card px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          {invoice.serviceProvider && invoice.serviceProvider !== 'N/A' ? invoice.serviceProvider : '—'}
                        </span>
                        {invoice.location && invoice.location !== 'N/A' && (
                          <div className="text-[10px] text-secondary mt-0.5">{invoice.location}</div>
                        )}
                      </td>
                      <td className="px-6 py-2 text-xs text-primary">
                        {invoice.customer && invoice.customer !== 'N/A' ? invoice.customer : '—'}
                      </td>
                      <td className="px-6 py-2 text-xs text-primary">
                        <div className="font-medium text-primary">{invoice.description || '—'}</div>
                      </td>
                      <td className="px-6 py-2 text-xs text-primary">
                        <div className="font-semibold">{invoice.serviceCategory && invoice.serviceCategory !== 'N/A' ? invoice.serviceCategory : '—'}</div>
                        <div className="text-[10px] text-secondary mt-0.5">Captured via fleet log</div>
                      </td>
                      <td className="px-6 py-2 text-xs text-primary">
                        {invoice.odometer && invoice.odometer > 0 ? `${invoice.odometer.toLocaleString()} km` : "—"}
                      </td>
                      <td className="px-6 py-2 text-xs text-primary">
                        {invoice.parts && invoice.parts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {invoice.parts.map((part, idx) => {
                              const partName = part.partName || part.name || part.partNumber || 'Part';
                              const quantity = part.quantity || 1;
                              const cost = part.cost || 0;
                              return (
                                <span
                                  key={`${invoice.id}-${partName}-${idx}`}
                                  className="rounded-full bg-card px-1.5 py-0.5 text-[10px] font-medium text-primary"
                                  title={cost > 0 ? `${partName} (Qty: ${quantity}) - $${cost.toFixed(2)}` : `${partName} (Qty: ${quantity})`}
                                >
                                  {partName} {quantity > 1 ? `(Qty: ${quantity})` : ''} {cost > 0 ? `$${cost.toFixed(2)}` : ''}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-secondary text-[10px]">No parts listed</span>
                        )}
                      </td>
                      <td className="px-6 py-2 text-xs font-semibold text-primary">
                        {invoice.invoiceNumber && invoice.invoiceNumber !== 'N/A' ? invoice.invoiceNumber : '—'}
                      </td>
                      <td className="px-6 py-2 text-xs text-primary">
                        {invoice.location && invoice.location !== 'N/A' ? (
                          <div className="font-semibold">{invoice.location}</div>
                        ) : invoice.notes ? (
                          <div className="font-semibold">{invoice.notes}</div>
                        ) : (
                          <div className="font-semibold text-secondary">—</div>
                        )}
                      </td>
                      <td className="px-6 py-2 text-xs text-primary">
                        <div className="font-semibold">
                          {invoice.totalAmount && invoice.totalAmount > 0 ? (
                            <>
                              ${invoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {invoice.taxes && invoice.taxes.length > 0 && (
                                <div className="text-[10px] text-secondary mt-0.5">
                                  {invoice.amount && invoice.amount > 0 && (
                                    <>Subtotal: ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br /></>
                                  )}
                                  {invoice.taxes.map((tax: any, idx: number) => (
                                    <span key={idx}>
                                      {tax.name || 'Tax'}: {tax.percentage}% (${((invoice.amount || 0) * (tax.percentage || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                      {idx < (invoice.taxes?.length ?? 0) - 1 ? <br /> : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            '—'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-2 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${invoice.passedInspection
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                            }`}
                        >
                          {invoice.passedInspection ? "Passed" : "Follow-up"}
                        </span>
                      </td>
                      <td className="px-6 py-2 text-xs" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteInvoice(invoice)}
                          className="p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Service"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {loading && (
                    <tr>
                      <td className="px-6 py-8 text-center text-xs text-secondary" colSpan={13}>
                        Loading invoices...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredInvoices.length === 0 && (
                    <tr>
                      <td className="px-6 py-8 text-center text-xs text-secondary" colSpan={13}>
                        No invoices found. {total > 0 ? 'Try adjusting your filters.' : 'No invoices have been created yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Details Sidebar */}
          {showInvoiceDetails && selectedInvoice && (
            <>
              <div
                className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[1001]"
                onClick={() => {
                  setShowInvoiceDetails(false);
                  setTimeout(() => setSelectedInvoice(null), 300);
                }}
              />

              {/* Sidebar Panel */}
              <div
                className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2
    bg-card shadow-2xl overflow-y-auto
    z-[1001]
    transform transition-transform duration-300 translate-x-0"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-theme">
                    <h2 className="text-2xl font-bold text-primary">Invoice Details</h2>
                    <button
                      onClick={() => {
                        setShowInvoiceDetails(false);
                        setTimeout(() => setSelectedInvoice(null), 300);
                      }}
                      className="p-2 rounded-lg text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] transition-all"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Invoice Header */}
                    <div className="bg-gradient-to-r from-[#4A90E2] to-[#357ABD] text-white p-6 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold mb-1">{selectedInvoice.invoiceNumber || 'N/A'}</h3>
                          <p className="text-blue-100 text-sm mb-2">
                            Unit: {selectedInvoice.unitNumber}
                          </p>
                          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${selectedInvoice.passedInspection
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 text-white'
                            }`}>
                            {selectedInvoice.passedInspection ? 'Passed Inspection' : 'Follow-up Required'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Information */}
                    <div className="bg-card p-6 rounded-lg border border-theme">
                      <h4 className="font-semibold text-primary mb-4 text-lg">Invoice Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-secondary mb-1">Invoice Number</p>
                          <p className="font-medium text-primary">{selectedInvoice.invoiceNumber || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Service Date</p>
                          <p className="font-medium text-primary">
                            {selectedInvoice.serviceDate ? new Date(selectedInvoice.serviceDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Unit Number</p>
                          <p className="font-medium text-primary">{selectedInvoice.unitNumber || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Make / Model</p>
                          <p className="font-medium text-primary">{selectedInvoice.makeModel || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">VIN / License Plate</p>
                          <p className="font-medium text-primary">{selectedInvoice.vinOrPlate || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Odometer</p>
                          <p className="font-medium text-primary">
                            {selectedInvoice.odometer ? `${selectedInvoice.odometer.toLocaleString()} km` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Service Provider</p>
                          <p className="font-medium text-primary">{selectedInvoice.serviceProvider || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Driver</p>
                          <p className="font-medium text-primary">{selectedInvoice.driver || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Service Category</p>
                          <p className="font-medium text-primary">{selectedInvoice.serviceCategory || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Location</p>
                          <p className="font-medium text-primary">{selectedInvoice.location || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Inspection Status</p>
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${selectedInvoice.passedInspection
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                            }`}>
                            {selectedInvoice.passedInspection ? 'Passed' : 'Follow-up Required'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedInvoice.description && (
                      <div className="bg-card p-6 rounded-lg border border-theme">
                        <h4 className="font-semibold text-primary mb-2 text-lg">Description</h4>
                        <p className="text-sm text-primary">{selectedInvoice.description}</p>
                      </div>
                    )}

                    {/* Parts */}
                    {selectedInvoice.parts && selectedInvoice.parts.length > 0 && (
                      <div className="bg-card p-6 rounded-lg border border-theme">
                        <h4 className="font-semibold text-primary mb-4 text-lg">Parts Used</h4>
                        <div className="space-y-3">
                          {selectedInvoice.parts.map((part, idx) => {
                            const partName = part.partName || part.name || part.partNumber || 'Part';
                            const quantity = part.quantity || 1;
                            const cost = part.cost || 0;
                            return (
                              <div key={idx} className="bg-card rounded-lg p-4 border border-theme">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-primary">{partName}</div>
                                    {quantity > 1 && (
                                      <div className="text-sm text-secondary mt-1">Quantity: {quantity}</div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    {cost > 0 && (
                                      <div className="font-medium text-primary">
                                        ${cost.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-theme">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-primary">Total Parts Cost:</span>
                            <span className="font-bold text-primary">
                              ${selectedInvoice.parts.reduce((sum, part) => sum + (Number(part.cost) || 0), 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedInvoice.notes && (
                      <div className="bg-card p-6 rounded-lg border border-theme">
                        <h4 className="font-semibold text-primary mb-2 text-lg">Notes</h4>
                        <p className="text-sm text-primary">{selectedInvoice.notes}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                      <button
                        onClick={() => {
                          setShowInvoiceDetails(false);
                          setTimeout(() => setSelectedInvoice(null), 300);
                        }}
                        className="px-6 py-2.5 bg-gray-200 text-primary font-medium rounded-lg hover:bg-gray-300 transition-all"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && invoiceToDelete && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[1002] flex items-center justify-center p-4">
              <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-full">
                      <FaExclamationCircle className="text-[#A855F7]" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-primary">Delete Service</h3>
                  </div>

                  <p className="text-secondary mb-6">
                    Are you sure you want to delete this service record? This action cannot be undone.
                  </p>

                  <div className="bg-card p-3 rounded-lg mb-6">
                    <p className="text-sm text-primary">
                      <span className="font-semibold">Unit:</span> {invoiceToDelete.unitNumber}
                    </p>
                    <p className="text-sm text-primary">
                      <span className="font-semibold">Service:</span> {invoiceToDelete.serviceCategory}
                    </p>
                    <p className="text-sm text-primary">
                      <span className="font-semibold">Date:</span> {invoiceToDelete.serviceDate ? new Date(invoiceToDelete.serviceDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setInvoiceToDelete(null);
                      }}
                      className="px-4 py-2 bg-card text-primary rounded-lg hover:bg-gray-200 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteInvoice}
                      disabled={deleting}
                      className="px-4 py-2 bg-red-600 !text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                      {deleting ? 'Deleting...' : 'Delete Service'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-card border-t border-theme rounded-b-lg shadow-sm">
              <div className="text-xs text-primary">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} invoices
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-1.5 text-xs font-medium text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-xs font-medium text-primary">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="px-3 py-1.5 text-xs font-medium text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplianceInvoices;
