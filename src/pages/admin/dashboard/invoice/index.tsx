import { useState, useEffect, useRef } from "react";
import { Eye, X, CheckCircle, Clock, Truck, Package, MapPin, Search, Filter } from "lucide-react";
import { listInvoices, getInvoiceById } from "../../../../axios/api/invoice";
import { message } from "antd";

interface Invoice {
  _id: string;
  clientName: string;
  clientCompany?: { companyName: string };
  company?: {
    companyName: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
  };
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  amount: string;
  currency?: string;
  status: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentDate?: string;
  tripId?: any;
  serviceBreakdown?: any[];
  notes?: string;
  invoiceUrl?: string;
  taxAmount?: number;
  paymentTerms?: string;
}

const InvoiceList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  // Fetch invoices from API
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await listInvoices();
      if (response && response.success) {
        setInvoices(response.data || []);
      } else {
        message.error(response?.message || 'Failed to fetch invoices');
        setInvoices([]);
      }
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      message.error('Failed to fetch invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch invoices on mount
  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filter invoices
  useEffect(() => {
    let filtered = invoices;

    if (statusFilter !== "all") {
      filtered = filtered.filter((inv) => inv.status === statusFilter);
    }

    if (clientFilter.trim() !== "") {
      filtered = filtered.filter((inv) =>
        inv.clientName.toLowerCase().includes(clientFilter.toLowerCase())
      );
    }

    setFilteredInvoices(filtered);
  }, [statusFilter, clientFilter, invoices]);

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

    const timeoutId = setTimeout(syncScrollWidths, 100);
    const timeoutId2 = setTimeout(syncScrollWidths, 300);
    const timeoutId3 = setTimeout(syncScrollWidths, 500);

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
  }, [filteredInvoices, loading]);

  const handleViewInvoice = async (invoiceId: string) => {
    setViewLoading(true);
    setShowSidebar(true);

    const invoiceFromList = invoices.find(inv => inv._id === invoiceId);

    if (invoiceFromList) {
      setSelectedInvoice(invoiceFromList);
      setViewLoading(false);
    } else {
      try {
        const response = await getInvoiceById(invoiceId);
        if (response && response.success) {
          setSelectedInvoice(response.data);
        } else {
          message.error(response?.message || 'Failed to fetch invoice details');
          setShowSidebar(false);
        }
      } catch (error: any) {
        console.error('Error fetching invoice:', error);
        if (invoiceFromList) {
          setSelectedInvoice(invoiceFromList);
          message.warning('Using cached invoice data');
        } else {
          message.error('Failed to fetch invoice details');
          setShowSidebar(false);
        }
      } finally {
        setViewLoading(false);
      }
    }
  };

  const handleCloseSidebar = () => {
    setShowSidebar(false);
    setTimeout(() => setSelectedInvoice(null), 300);
  };

  return (
    <div className="p-6 bg-main min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-primary">Invoices</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">

        {/* LEFT → Search */}
        <div className="relative w-full md:w-80">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--accent-navyblue)]"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by Client Name"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg
              bg-[var(--bg-card)] text-primary placeholder-[#8B9BB4]
              border border-[rgba(6,55,122,0.4)]
              focus:ring-1 focus:ring-[rgba(26,109,184,0.4)] focus:border-[#1a6db8]
              outline-none transition-all"
          />
        </div>

        {/* RIGHT → Status Filter */}
        <div className="relative w-full md:w-48">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--accent-navyblue)]" size={18} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg
              bg-[var(--bg-card)] text-primary border border-[rgba(6,55,122,0.4)]
              focus:ring-1 focus:ring-[rgba(26,109,184,0.4)] focus:border-[#1a6db8]
              outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>

      </div>

      {/* Invoice Table */}
      <div className="bg-card shadow-lg rounded-lg overflow-hidden border border-[rgba(255,255,255,0.06)]">
        {/* Top Scrollbar */}
        <style>{`
          .top-scrollbar-container::-webkit-scrollbar {
            height: 6px;
          }
          .top-scrollbar-container::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.03);
          }
          .top-scrollbar-container::-webkit-scrollbar-thumb {
            background: rgba(6,55,122,0.4);
            border-radius: 3px;
          }
          .top-scrollbar-container::-webkit-scrollbar-thumb:hover {
            background: rgba(6,55,122,0.65);
          }
        `}</style>
        <div
          ref={topScrollRef}
          className="overflow-x-auto overflow-y-hidden top-scrollbar-container"
          style={{
            maxHeight: '20px',
            marginBottom: '2px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0,209,255,0.2) rgba(255,255,255,0.03)'
          }}
        >
          <div className="top-scroll-content" style={{ height: '1px' }}></div>
        </div>

        {/* Main Table */}
        <style>{`
          .table-container-hidden-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .table-container-hidden-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div
          ref={bottomScrollRef}
          className="overflow-x-auto table-container-hidden-scrollbar"
        >
          <table className="w-full text-sm">
            <thead className="bg-[rgba(0,209,255,0.08)] border-b border-[rgba(0,209,255,0.15)]">
              <tr>
                <th className="p-4 text-left font-semibold text-[var(--accent-navyblue)]">Client</th>
                <th className="p-4 text-left font-semibold text-[var(--accent-navyblue)]">Company</th>
                <th className="p-4 text-left font-semibold text-[var(--accent-navyblue)]">Email</th>
                <th className="p-4 text-left font-semibold text-[var(--accent-navyblue)]">Amount</th>
                <th className="p-4 text-left font-semibold text-[var(--accent-navyblue)]">Status</th>
                <th className="p-4 text-left font-semibold text-[var(--accent-navyblue)]">Invoice Date</th>
                <th className="p-4 text-left font-semibold text-[var(--accent-navyblue)]">Due Date</th>
                <th className="p-4 text-left font-semibold text-[var(--accent-navyblue)]">Payment Date</th>
                <th className="p-4 text-center font-semibold text-[var(--accent-navyblue)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
              {loading ? (
                <tr>
                  <td className="p-8 text-center text-secondary" colSpan={9}>
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D1FF]"></div>
                      <span className="ml-3">Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv._id}
                    className="hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    <td className="p-4 font-medium text-primary">
                      {inv.clientName}
                    </td>
                    <td className="p-4 text-primary">
                      {inv.clientCompany?.companyName || inv.company?.companyName || "—"}
                    </td>
                    <td className="p-4 text-secondary">{inv.clientEmail || "—"}</td>
                    <td className="p-4 font-semibold text-primary">
                      {inv.currency} {inv.amount}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${inv.status === "paid"
                          ? "bg-[rgba(0,255,163,0.1)] text-[#00FFA3] border-[rgba(0,255,163,0.25)]"
                          : "bg-[rgba(245,158,11,0.1)] text-[#FCD34D] border-[rgba(245,158,11,0.25)]"
                          }`}
                      >
                        {inv.status === "paid" ? (
                          <>
                            <CheckCircle size={14} />
                            Paid
                          </>
                        ) : (
                          <>
                            <Clock size={14} />
                            Pending
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-secondary">
                      {inv.invoiceDate
                        ? new Date(inv.invoiceDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-4 text-secondary">
                      {inv.dueDate
                        ? new Date(inv.dueDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-4 text-secondary">
                      {inv.paymentDate
                        ? new Date(inv.paymentDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleViewInvoice(inv._id)}
                        className="inline-flex items-center justify-center p-2 rounded-lg transition-all hover:scale-110 bg-[rgba(0,209,255,0.08)] text-[#00D1FF] hover:bg-[rgba(0,209,255,0.15)] border border-[rgba(0,209,255,0.15)]"
                        title="View Invoice"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-8 text-center text-secondary" colSpan={9}>
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={handleCloseSidebar}
          ></div>

          {/* Sidebar Panel */}
          <div
            className={`fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-[var(--bg-card)] shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 border-l border-[rgba(255,255,255,0.08)] ${showSidebar ? 'translate-x-0' : 'translate-x-full'
              }`}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-[rgba(255,255,255,0.08)]">
                <h2 className="text-2xl font-bold text-primary">Invoice Details</h2>
                <button
                  onClick={handleCloseSidebar}
                  className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.06)] transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {viewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D1FF]"></div>
                  <span className="ml-3 text-secondary">Loading invoice details...</span>
                </div>
              ) : selectedInvoice ? (
                <div className="space-y-6">
                  {/* Invoice Header */}
                  <div className="bg-[rgba(0,209,255,0.08)] border border-[rgba(0,209,255,0.2)] p-6 rounded-xl">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-primary mb-2">
                          Invoice #{selectedInvoice._id.slice(-8).toUpperCase()}
                        </h3>
                        {selectedInvoice.tripId?.tripNumber && (
                          <p className="text-secondary text-sm flex items-center gap-2">
                            <Truck size={16} className="text-[#00D1FF]" />
                            Trip: <span className="font-semibold text-[#00D1FF]">{selectedInvoice.tripId.tripNumber}</span>
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${selectedInvoice.status === "paid"
                          ? "bg-[rgba(0,255,163,0.12)] text-[#00FFA3] border-[rgba(0,255,163,0.3)]"
                          : "bg-[rgba(245,158,11,0.12)] text-[#FCD34D] border-[rgba(245,158,11,0.3)]"
                          }`}
                      >
                        {selectedInvoice.status === "paid" ? (
                          <>
                            <CheckCircle size={16} />
                            Paid
                          </>
                        ) : (
                          <>
                            <Clock size={16} />
                            Pending
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Client Information */}
                  <div className="bg-[rgba(255,255,255,0.03)] p-6 rounded-xl border border-[rgba(255,255,255,0.08)]">
                    <h4 className="font-semibold text-primary mb-4 text-lg">Client Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-secondary mb-1">Client Name</p>
                        <p className="font-medium text-primary">{selectedInvoice.clientName}</p>
                      </div>
                      {selectedInvoice.clientEmail && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Email</p>
                          <p className="font-medium text-primary">{selectedInvoice.clientEmail}</p>
                        </div>
                      )}
                      {selectedInvoice.clientPhone && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Phone</p>
                          <p className="font-medium text-primary">{selectedInvoice.clientPhone}</p>
                        </div>
                      )}
                      {selectedInvoice.company && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Company</p>
                          <p className="font-medium text-primary">{selectedInvoice.company.companyName}</p>
                        </div>
                      )}
                      {selectedInvoice.clientAddress && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-secondary mb-1">Address</p>
                          <p className="font-medium text-primary">{selectedInvoice.clientAddress}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="bg-[rgba(0,209,255,0.04)] p-6 rounded-xl border border-[rgba(0,209,255,0.15)]">
                    <h4 className="font-semibold text-primary mb-4 text-lg">Financial Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-secondary mb-1">Invoice Number</p>
                        <p className="font-medium text-primary">
                          #{selectedInvoice._id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Amount</p>
                        <p className="font-bold text-2xl text-[var(--accent-navyblue)]">
                          {selectedInvoice.currency} {selectedInvoice.amount}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Invoice Date</p>
                        <p className="font-medium text-primary">
                          {selectedInvoice.invoiceDate
                            ? new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Due Date</p>
                        <p className="font-medium text-primary">
                          {selectedInvoice.dueDate
                            ? new Date(selectedInvoice.dueDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                            : "—"}
                        </p>
                      </div>
                      {selectedInvoice.paymentDate && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-secondary mb-1">Payment Date</p>
                          <p className="font-medium text-primary">
                            {new Date(selectedInvoice.paymentDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trip Information */}
                  {selectedInvoice.tripId && (
                    <div className="bg-[rgba(255,255,255,0.03)] p-6 rounded-xl border border-[rgba(255,255,255,0.08)]">
                      <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                        <Truck size={20} className="text-[#00D1FF]" />
                        Trip Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-secondary mb-1">Trip Number</p>
                          <p className="font-medium text-primary">{selectedInvoice.tripId.tripNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Status</p>
                          <p className="font-medium text-primary capitalize">{selectedInvoice.tripId.status}</p>
                        </div>
                        {selectedInvoice.tripId.truck && (
                          <>
                            <div>
                              <p className="text-sm text-secondary mb-1">Truck Unit No</p>
                              <p className="font-medium text-primary">{selectedInvoice.tripId.truck.unitNo}</p>
                            </div>
                            <div>
                              <p className="text-sm text-secondary mb-1">Truck Model</p>
                              <p className="font-medium text-primary">{selectedInvoice.tripId.truck.makeModel}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Orders Information */}
                  {selectedInvoice.tripId?.orders && selectedInvoice.tripId.orders.length > 0 && (
                    <div className="bg-[rgba(255,255,255,0.03)] p-6 rounded-xl border border-[rgba(255,255,255,0.08)]">
                      <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                        <Package size={20} className="text-[#00D1FF]" />
                        Order Details
                      </h4>
                      {selectedInvoice.tripId.orders.map((order: any, index: number) => (
                        <div key={index} className="mb-4 last:mb-0 p-4 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.06)]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-secondary mb-1">Order Number</p>
                              <p className="font-medium text-primary">{order.orderNumber}</p>
                            </div>
                            <div>
                              <p className="text-secondary mb-1">Commodity</p>
                              <p className="font-medium text-primary">{order.commodity}</p>
                            </div>
                            {order.pickupLocation && (
                              <div className="md:col-span-2">
                                <p className="text-secondary mb-1 flex items-center gap-1">
                                  <MapPin size={14} className="text-[#00D1FF]" />
                                  Pickup Location
                                </p>
                                <p className="font-medium text-primary text-sm">{order.pickupLocation.place}</p>
                              </div>
                            )}
                            {order.deliveryLocation && (
                              <div className="md:col-span-2">
                                <p className="text-secondary mb-1 flex items-center gap-1">
                                  <MapPin size={14} className="text-[#00FFA3]" />
                                  Delivery Location
                                </p>
                                <p className="font-medium text-primary text-sm">{order.deliveryLocation.place}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <div className="bg-[rgba(245,158,11,0.05)] p-6 rounded-xl border border-[rgba(245,158,11,0.2)]">
                      <h4 className="font-semibold text-primary mb-2 text-lg">Notes</h4>
                      <p className="text-secondary whitespace-pre-wrap">{selectedInvoice.notes}</p>
                    </div>
                  )}

                  {/* Close Button */}
                  <div className="flex justify-end pt-4 border-t border-[rgba(255,255,255,0.08)]">
                    <button
                      onClick={handleCloseSidebar}
                      className="px-6 py-2.5 bg-[rgba(0,209,255,0.1)] text-[#00D1FF] border border-[rgba(0,209,255,0.25)] font-medium rounded-lg hover:bg-[rgba(0,209,255,0.18)] transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary">Failed to load invoice details</p>
                  <button
                    onClick={handleCloseSidebar}
                    className="mt-4 px-6 py-2.5 bg-[rgba(0,209,255,0.1)] text-[#00D1FF] border border-[rgba(0,209,255,0.25)] font-medium rounded-lg hover:bg-[rgba(0,209,255,0.18)] transition-all"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InvoiceList;
