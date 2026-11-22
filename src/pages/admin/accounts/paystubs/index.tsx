import { useState, useEffect } from 'react';
import { Search, Download, Calendar, FileText, Users, X, Eye, Printer } from 'lucide-react';
import { getPaystubs, getPaystubById } from '../../../../axios/api/account.payroll';
import { outputPayStatement, paystubToStatement, settlementToStatement } from '../../../../utils/payStatementPdf';
import { getSettlementById } from '../../../../axios/api/account.settlement';
import { getCompany } from '../../../../axios/api/admin';

interface Paystub {
  _id: string;
  payrollId: string;
  userId: {
    _id: string;
    name: string;
    email?: string;
    role?: string;
    internalId?: string;
    companyFlag?: boolean;
    details?: {
      companyFlag?: boolean;
    };
  };
  employeeName: string;
  employeeId?: string;
  employeeEmail?: string;
  employeeRole?: string;
  workType?: 'Employee' | 'Driver' | 'Owner-Operator';
  // Owner-operator settlements are listed here too (backend sets source: 'settlement')
  source?: 'settlement';
  settlementId?: string;
  truckNumber?: string;
  payPeriod: {
    startDate: string;
    endDate: string;
    payDate: string;
  };
  paystubId?: string;
  summary: {
    grossPay: number;
    totalDeductions: number;
    totalTaxes: number;
    netPay: number;
  };
  status: 'draft' | 'issued' | 'void';
  createdAt: string;
  companyDetails?: {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
  };
}

const PaystubsList = () => {
  const [paystubs, setPaystubs] = useState<Paystub[]>([]);
  const [filteredPaystubs, setFilteredPaystubs] = useState<Paystub[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingBulk, setDownloadingBulk] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'employees' | 'drivers' | 'ownerOperators'>('all');
  const [showPaystubModal, setShowPaystubModal] = useState<boolean>(false);
  const [selectedPaystub, setSelectedPaystub] = useState<Paystub | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchPaystubs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [paystubs, searchQuery, activeTab]);

  const fetchPaystubs = async (dateParams?: { startDate?: string; endDate?: string }) => {
    setLoading(true);
    try {
      const params: any = {};
      // Use dateParams if provided, otherwise use state
      if (dateParams?.startDate || startDate) {
        params.startDate = dateParams?.startDate || startDate;
      }
      if (dateParams?.endDate || endDate) {
        params.endDate = dateParams?.endDate || endDate;
      }
      // Search is handled on frontend for better UX
      // if (searchQuery) params.search = searchQuery;

      const response = await getPaystubs(params);
      if (response?.success) {
        setPaystubs(response.data || []);
      } else {
        setPaystubs([]);
      }
    } catch (error) {
      console.error('Error fetching paystubs:', error);
      setPaystubs([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...paystubs];

    // Apply tab filter (employees/drivers/owner operators)
    if (activeTab === 'employees') {
      filtered = filtered.filter(paystub => {
        const role = paystub.employeeRole?.toLowerCase() || paystub.userId?.role?.toLowerCase() || '';
        const workType = paystub.workType?.toLowerCase() || '';
        return role !== 'driver' && workType !== 'owner-operator';
      });
    } else if (activeTab === 'drivers') {
      filtered = filtered.filter(paystub => {
        // Company drivers: must be a driver role AND companyFlag should be false
        // Note: Based on backend logic: companyFlag=true = Owner Operator, companyFlag=false = Company Driver
        const role = paystub.employeeRole?.toLowerCase() || paystub.userId?.role?.toLowerCase() || '';
        if (role !== 'driver') return false;
        // Check both direct property and nested details
        const companyFlag = paystub.userId?.companyFlag ?? paystub.userId?.details?.companyFlag ?? false;
        // Company drivers have companyFlag = false
        return companyFlag === false;
      });
    } else if (activeTab === 'ownerOperators') {
      filtered = filtered.filter(paystub => {
        // Owner operators: must be a driver role AND companyFlag should be true
        // Note: Based on backend logic: companyFlag=true = Owner Operator, companyFlag=false = Company Driver
        const role = paystub.employeeRole?.toLowerCase() || paystub.userId?.role?.toLowerCase() || '';
        if (role !== 'driver') return false;
        // Check both direct property and nested details
        const companyFlag = paystub.userId?.companyFlag ?? paystub.userId?.details?.companyFlag ?? false;
        // Owner operators have companyFlag = true
        return companyFlag === true;
      });
    }

    // Apply search filter (frontend filtering for instant results)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(paystub =>
        paystub.employeeName?.toLowerCase().includes(query) ||
        paystub.employeeId?.toLowerCase().includes(query) ||
        paystub.employeeEmail?.toLowerCase().includes(query) ||
        paystub.userId?.name?.toLowerCase().includes(query) ||
        paystub.userId?.internalId?.toLowerCase().includes(query)
      );
    }

    setFilteredPaystubs(filtered);
  };

  const handleViewPaystub = async (paystub: Paystub) => {
    setModalLoading(true);
    setShowPaystubModal(true);
    if (paystub.source === 'settlement') {
      setSelectedPaystub(paystub);
      setModalLoading(false);
      return;
    }
    try {
      const response = await getPaystubById(paystub._id);
      const fullPaystub = response?.success && response.data ? response.data : paystub;
      setSelectedPaystub(fullPaystub);
    } catch (error) {
      console.error('Error fetching paystub details:', error);
      setSelectedPaystub(paystub);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDateFilter = () => {
    fetchPaystubs({ startDate, endDate });
    setShowDateFilter(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    fetchPaystubs();
  };

  // Pay statement in the company's layout - same generator as Payroll and Driver Payroll
  const handleDownloadPDF = async (paystub: Paystub, mode: 'download' | 'print' = 'download') => {
    try {
      // Owner-operator settlement: same statement as Accounts > Settlements prints
      if (paystub.source === 'settlement') {
        const [stRes, companyRes] = await Promise.all([getSettlementById(paystub._id), getCompany()]);
        if (!stRes?.success || !stRes.data) throw new Error(stRes?.message || 'Settlement not found');
        const company = companyRes?.data || companyRes?.company || {};
        await outputPayStatement(settlementToStatement(stRes.data, company), mode);
        return;
      }
      // Full paystub (trip lines, memos, signed logo)
      const response = await getPaystubById(paystub._id);
      const fullPaystub = response?.success && response.data ? response.data : paystub;
      await outputPayStatement(paystubToStatement(fullPaystub), mode);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleBulkDownload = async () => {
    if (filteredPaystubs.length === 0) {
      alert('No paystubs to download.');
      return;
    }

    setDownloadingBulk(true);
    try {
      // Download all paystubs sequentially using the same handleDownloadPDF logic
      // This ensures all paystubs use the same PDF format
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < filteredPaystubs.length; i++) {
        const paystub = filteredPaystubs[i];
        try {
          // Use the same handleDownloadPDF function to ensure consistent PDF format
          await handleDownloadPDF(paystub);
          successCount++;

          // Small delay between downloads to prevent browser blocking
          if (i < filteredPaystubs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        } catch (error) {
          console.error(`Error downloading paystub ${paystub._id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        alert(`Successfully downloaded ${successCount} paystub(s).${errorCount > 0 ? ` ${errorCount} failed.` : ''}`);
      } else {
        alert('Failed to download paystubs. Please try again.');
      }
    } catch (error) {
      console.error('Error in bulk download:', error);
      alert('Error downloading paystubs. Please try again.');
    } finally {
      setDownloadingBulk(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-main px-6 py-8">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-headings flex items-center gap-2">
                <FileText className="text-[var(--accent-navyblue)]" size={28} />
                Gross Payroll
              </h1>
              <p className="text-sm text-secondary mt-1">View and download paystubs for employees, drivers, and owner operators</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-theme mb-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'all'
                ? 'border-blue-600 !text-[var(--accent-navyblue)]'
                : 'border-transparent text-secondary hover:text-primary'
                }`}
            >
              All Paystubs
              <span className="ml-2 px-2 py-0.5 bg-card rounded-full text-xs">
                {paystubs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'employees'
                ? 'border-blue-600 !text-[#059669]'
                : 'border-transparent text-secondary hover:text-primary'
                }`}
            >
              <Users size={18} />
              Employees
              <span className="ml-2 px-2 py-0.5 bg-card rounded-full text-xs">
                {paystubs.filter(p => {
                  const role = p.employeeRole?.toLowerCase() || p.userId?.role?.toLowerCase() || '';
                  return role !== 'driver';
                }).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'drivers'
                ? 'border-blue-600 text-[#059669]'
                : 'border-transparent text-secondary hover:text-primary'
                }`}
            >
              <Users size={18} />
              Drivers
              <span className="ml-2 px-2 py-0.5 bg-card rounded-full text-xs">
                {paystubs.filter(p => {
                  // Company drivers: must be a driver role AND companyFlag should be false
                  const role = p.employeeRole?.toLowerCase() || p.userId?.role?.toLowerCase() || '';
                  if (role !== 'driver') return false;
                  const companyFlag = p.userId?.companyFlag ?? p.userId?.details?.companyFlag ?? false;
                  return companyFlag === false;
                }).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('ownerOperators')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'ownerOperators'
                ? 'border-blue-600 text-[#059669]'
                : 'border-transparent text-secondary hover:text-primary'
                }`}
            >
              <Users size={18} />
              Owner Operators
              <span className="ml-2 px-2 py-0.5 bg-card rounded-full text-xs">
                {paystubs.filter(p => {
                  // Owner operators: must be a driver role AND companyFlag should be true
                  const role = p.employeeRole?.toLowerCase() || p.userId?.role?.toLowerCase() || '';
                  if (role !== 'driver') return false;
                  const companyFlag = p.userId?.companyFlag ?? p.userId?.details?.companyFlag ?? false;
                  return companyFlag === true;
                }).length}
              </span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl shadow-sm border border-theme p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, employee ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Date Filter Toggle */}
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(15,31,23,0.03)] flex items-center gap-2 transition-colors"
            >
              <Calendar size={18} />
              Date Filter
            </button>

            {/* Bulk Download */}
            {filteredPaystubs.length > 0 && (
              <button
                onClick={handleBulkDownload}
                disabled={downloadingBulk}
                className="px-4 py-2 bg-[var(--accent-navyblue)] hover:bg-blue-700 !text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {downloadingBulk ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download All ({filteredPaystubs.length})
                  </>
                )}
              </button>
            )}

            {/* Clear Filters */}
            {(searchQuery || startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(15,31,23,0.03)] flex items-center gap-2 transition-colors text-[#A855F7]"
              >
                <X size={18} />
                Clear
              </button>
            )}
          </div>

          {/* Date Filter Panel */}
          {showDateFilter && (
            <div className="mt-4 pt-4 border-t border-theme">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-primary mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-primary mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleDateFilter}
                  className="px-6 py-2 bg-[var(--accent-navyblue)] hover:bg-[#047857] !text-white rounded-lg font-medium transition-colors"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Paystubs Table */}
        <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-navyblue)]"></div>
            </div>
          ) : filteredPaystubs.length === 0 ? (
            <div className="text-center py-12 text-secondary">
              <FileText className="mx-auto mb-4 text-secondary" size={48} />
              <p className="text-lg font-medium">
                No {activeTab === 'employees' ? 'employee' : activeTab === 'drivers' ? 'driver' : activeTab === 'ownerOperators' ? 'owner operator' : ''} paystubs found
              </p>
              <p className="text-sm">Try adjusting your filters, search query, or date range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card border-b border-theme">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Employee / Driver</th>
                    {activeTab !== 'employees' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Employee Code</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Pay Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Pay Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Net Pay</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme divide-black/5">
                  {filteredPaystubs.map((paystub) => (
                    <tr key={paystub._id} className="hover:bg-[rgba(15,31,23,0.03)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium bg-[var(--accent-navyblue)]">
                            {paystub.employeeName?.charAt(0) || 'N'}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-primary">{paystub.employeeName || 'Unknown'}</div>
                            {paystub.employeeEmail && (
                              <div className="text-sm text-secondary">{paystub.employeeEmail}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {activeTab !== 'employees' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-primary font-medium">
                            {paystub.employeeId || paystub.userId?.internalId || 'N/A'}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${paystub.employeeRole?.toLowerCase() === 'driver'
                            ? 'bg-[rgba(5,150,105,0.12)] text-[var(--accent-green)]'
                            : 'bg-[rgba(5,150,105,0.12)] text-[var(--accent-navyblue)]'
                            }`}>
                            {paystub.employeeRole || paystub.userId?.role || 'N/A'}
                          </span>
                          {paystub.employeeRole?.toLowerCase() === 'driver' || paystub.userId?.role?.toLowerCase() === 'driver' ? (
                            (() => {
                              // Determine workType based on companyFlag (not stored workType which may be incorrect)
                              const companyFlag = paystub.userId?.companyFlag ?? paystub.userId?.details?.companyFlag ?? false;
                              // companyFlag=false = Company Driver, companyFlag=true = Owner Operator
                              const displayWorkType = companyFlag === false ? 'Driver' : 'Owner-Operator';
                              return (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-card text-primary">
                                  {displayWorkType}
                                </span>
                              );
                            })()
                          ) : paystub.workType ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-card text-primary">
                              {paystub.workType}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-primary">
                          {new Date(paystub.payPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-secondary">to {new Date(paystub.payPeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-primary">
                          {new Date(paystub.payPeriod.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-primary">
                          ${paystub.summary.netPay.toFixed(2)}
                        </div>
                        <div className="text-xs text-secondary">
                          Gross: ${paystub.summary.grossPay.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${paystub.status === 'issued'
                          ? 'bg-[rgba(5,150,105,0.12)] text-[var(--accent-green)]'
                          : paystub.status === 'void'
                            ? 'bg-[rgba(244,63,94,0.12)] text-[var(--accent-red)]'
                            : 'bg-card text-primary'
                          }`}>
                          {paystub.status.charAt(0).toUpperCase() + paystub.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewPaystub(paystub)}
                            className="p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[rgba(5,150,105,0.08)]"
                            title="View Details"
                          >
                            <Eye size={18} />
                            <span className="hidden md:inline">View</span>
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(paystub, 'print')}
                            className="p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-navyblue)] hover:bg-[rgba(5,150,105,0.08)]"
                            title="Print"
                          >
                            <Printer size={18} />
                            <span className="hidden md:inline">Download</span>
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(paystub)}
                            className="p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-navyblue)] hover:bg-[rgba(5,150,105,0.08)]"
                            title="Download PDF"
                          >
                            <Download size={18} />
                            <span className="hidden md:inline">Download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Footer */}
          {filteredPaystubs.length > 0 && (
            <div className="bg-card px-6 py-4 border-t border-theme">
              <div className="flex items-center justify-between text-sm">
                <div className="text-secondary">
                  Showing <span className="font-semibold text-primary">{filteredPaystubs.length}</span> paystub{filteredPaystubs.length !== 1 ? 's' : ''}
                  {activeTab !== 'all' && (
                    <span className="ml-2 text-[#059669]">
                      ({activeTab === 'employees' ? 'Employees' : activeTab === 'drivers' ? 'Drivers' : activeTab === 'ownerOperators' ? 'Owner Operators' : ''})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-secondary">
                    Total Net Pay: <span className="font-semibold text-primary">
                      ${filteredPaystubs.reduce((sum, p) => sum + p.summary.netPay, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-secondary">
                    Total Gross: <span className="font-semibold text-primary">
                      ${filteredPaystubs.reduce((sum, p) => sum + p.summary.grossPay, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Paystub Detail Modal */}
    {showPaystubModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[rgba(5,150,105,0.15)]">

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(15,31,23,0.06)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgba(5,150,105,0.15)] flex items-center justify-center">
                <FileText size={18} className="text-[var(--accent-navyblue)]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Paystub Details</h2>
                {selectedPaystub?.paystubId && (
                  <p className="text-xs text-secondary">#{selectedPaystub.paystubId}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => { setShowPaystubModal(false); setSelectedPaystub(null); }}
              className="p-2 rounded-lg text-secondary hover:text-[var(--text-primary)] hover:bg-[rgba(15,31,23,0.06)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {modalLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-navyblue)]" />
            </div>
          ) : selectedPaystub ? (
            <div className="px-6 py-5 space-y-5">

              {/* Company Header */}
              {selectedPaystub.companyDetails?.companyName && (
                <div className="text-center py-3 border-b border-[rgba(15,31,23,0.05)]">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {selectedPaystub.companyDetails.companyName}
                  </h3>
                  {selectedPaystub.companyDetails.companyAddress && (
                    <p className="text-xs text-secondary mt-1">{selectedPaystub.companyDetails.companyAddress}</p>
                  )}
                  {(selectedPaystub.companyDetails.companyPhone || selectedPaystub.companyDetails.companyEmail) && (
                    <p className="text-xs text-secondary">
                      {selectedPaystub.companyDetails.companyPhone}
                      {selectedPaystub.companyDetails.companyPhone && selectedPaystub.companyDetails.companyEmail && ' · '}
                      {selectedPaystub.companyDetails.companyEmail}
                    </p>
                  )}
                </div>
              )}

              {/* Pay Period */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[var(--bg-card-light)] rounded-xl p-3">
                  <p className="text-xs text-secondary mb-1">Period Start</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {new Date(selectedPaystub.payPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-[var(--bg-card-light)] rounded-xl p-3">
                  <p className="text-xs text-secondary mb-1">Period End</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {new Date(selectedPaystub.payPeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-[var(--bg-card-light)] rounded-xl p-3">
                  <p className="text-xs text-secondary mb-1">Pay Date</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {new Date(selectedPaystub.payPeriod.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Employee Information */}
              <div className="bg-[var(--bg-card-light)] rounded-xl p-4">
                <p className="text-xs text-secondary uppercase tracking-wider mb-3">Employee Information</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-navyblue)] flex items-center justify-center text-white font-semibold text-sm">
                    {selectedPaystub.employeeName?.charAt(0) || 'N'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedPaystub.employeeName}</p>
                    {selectedPaystub.employeeEmail && (
                      <p className="text-xs text-secondary">{selectedPaystub.employeeEmail}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {(selectedPaystub.employeeId || selectedPaystub.userId?.internalId) && (
                    <div>
                      <span className="text-secondary text-xs">Employee ID</span>
                      <p className="text-[var(--text-primary)] font-medium">{selectedPaystub.employeeId || selectedPaystub.userId?.internalId}</p>
                    </div>
                  )}
                  {(selectedPaystub.employeeRole || selectedPaystub.userId?.role) && (
                    <div>
                      <span className="text-secondary text-xs">Role</span>
                      <p className="text-[var(--text-primary)] font-medium capitalize">{selectedPaystub.employeeRole || selectedPaystub.userId?.role}</p>
                    </div>
                  )}
                  {selectedPaystub.workType && (
                    <div>
                      <span className="text-secondary text-xs">Work Type</span>
                      <p className="text-[var(--text-primary)] font-medium">{selectedPaystub.workType}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pay Summary */}
              <div className="rounded-xl overflow-hidden border border-[rgba(5,150,105,0.2)]">
                <div className="bg-[rgba(5,150,105,0.1)] px-4 py-2">
                  <p className="text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">Pay Summary</p>
                </div>
                <div className="divide-y divide-[rgba(15,31,23,0.05)]">
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-secondary">Gross Pay</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">${selectedPaystub.summary.grossPay.toFixed(2)}</span>
                  </div>
                  {selectedPaystub.summary.totalTaxes > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-sm text-secondary">Total Taxes</span>
                      <span className="text-sm font-medium text-[var(--accent-red)]">- ${selectedPaystub.summary.totalTaxes.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedPaystub.summary.totalDeductions > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-sm text-secondary">Total Deductions</span>
                      <span className="text-sm font-medium text-[var(--accent-red)]">- ${selectedPaystub.summary.totalDeductions.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-3 bg-[rgba(5,150,105,0.05)]">
                    <span className="text-sm font-bold text-[var(--text-primary)]">Net Pay</span>
                    <span className="text-base font-bold text-[var(--accent-green)]">${selectedPaystub.summary.netPay.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Status & Issued Date */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-secondary">Status:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    selectedPaystub.status === 'issued'
                      ? 'bg-[rgba(5,150,105,0.12)] text-[var(--accent-green)]'
                      : selectedPaystub.status === 'void'
                        ? 'bg-[rgba(244,63,94,0.12)] text-[var(--accent-red)]'
                        : 'bg-[rgba(15,31,23,0.07)] text-[var(--text-primary)]'
                  }`}>
                    {selectedPaystub.status.charAt(0).toUpperCase() + selectedPaystub.status.slice(1)}
                  </span>
                </div>
                <div className="text-secondary text-xs">
                  Generated: {new Date(selectedPaystub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

            </div>
          ) : null}

          {/* Footer with Download PDF and Close Button */}
          <div className="p-6 border-t-2 border-theme bg-card">
            <div className="flex justify-between items-center">
              {selectedPaystub ? (
                <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(selectedPaystub)}
                  className="px-6 py-3 bg-[var(--accent-navyblue)] hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Download size={18} />
                  Download PDF
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedPaystub, 'print')}
                  className="px-6 py-3 bg-[var(--accent-navyblue)] hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Printer size={18} />
                  Print
                </button>
                </div>
              ) : (
                <div />
              )}
              <button
                onClick={() => { setShowPaystubModal(false); setSelectedPaystub(null); }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-headings rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <X size={18} />
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    )}
    </>
  );
};

export default PaystubsList;

