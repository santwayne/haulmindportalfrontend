import { useState, useEffect } from 'react';
import { FaDollarSign, FaFilter, FaTruck, FaCheckCircle } from 'react-icons/fa';
import PaymentStatusBadge from '../../../../components/dispatch/PaymentStatusBadge';

interface Load {
  _id: string;
  loadNumber?: string;
  orderNumber?: string;
  customer?: string;
  customerName?: string;
  amount?: number;
  rate?: number;
  status: 'available' | 'planned' | 'assigned' | 'in-delivery' | 'delivered' | 'paid';
  paymentStatus?: 'pending' | 'due' | 'paid';
  deliveryDate?: string;
  paidDate?: string;
}

const AccountsSection = () => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  useEffect(() => {
    fetchLoads();
  }, []);

  const fetchLoads = () => {
    setLoading(true);
    // Static mock data - only delivered/paid loads
    const mockLoads: Load[] = [
      {
        _id: '4',
        loadNumber: 'L-004',
        orderNumber: 'ORD-004',
        customer: 'Global Transport',
        customerName: 'Global Transport',
        amount: 4500,
        rate: 4500,
        status: 'delivered',
        paymentStatus: 'due',
        deliveryDate: '2024-01-18'
      },
      {
        _id: '5',
        loadNumber: 'L-005',
        orderNumber: 'ORD-005',
        customer: 'Express Logistics',
        customerName: 'Express Logistics',
        amount: 2900,
        rate: 2900,
        status: 'paid',
        paymentStatus: 'paid',
        deliveryDate: '2024-01-15',
        paidDate: '2024-01-16'
      },
      {
        _id: '6',
        loadNumber: 'L-006',
        orderNumber: 'ORD-006',
        customer: 'Speed Freight',
        customerName: 'Speed Freight',
        amount: 3500,
        rate: 3500,
        status: 'delivered',
        paymentStatus: 'due',
        deliveryDate: '2024-01-19'
      },
      {
        _id: '7',
        loadNumber: 'L-007',
        orderNumber: 'ORD-007',
        customer: 'Pacific Logistics',
        customerName: 'Pacific Logistics',
        amount: 2200,
        rate: 2200,
        status: 'paid',
        paymentStatus: 'paid',
        deliveryDate: '2024-01-12',
        paidDate: '2024-01-13'
      },
      {
        _id: '8',
        loadNumber: 'L-008',
        orderNumber: 'ORD-008',
        customer: 'Northern Freight',
        customerName: 'Northern Freight',
        amount: 3100,
        rate: 3100,
        status: 'delivered',
        paymentStatus: 'due',
        deliveryDate: '2024-01-20'
      }
    ];
    setLoads(mockLoads);
    setLoading(false);
  };

  const handleMarkPaid = (loadId: string) => {
    const updatedLoads = loads.map(l => 
      l._id === loadId 
        ? { 
            ...l, 
            status: 'paid' as const,
            paymentStatus: 'paid' as const,
            paidDate: new Date().toISOString()
          } 
        : l
    );
    setLoads(updatedLoads);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredLoads = paymentFilter === 'all' 
    ? loads 
    : loads.filter(load => load.paymentStatus === paymentFilter);

  const totalDue = loads
    .filter(load => load.paymentStatus === 'due')
    .reduce((sum, load) => sum + (load.amount || load.rate || 0), 0);
  
  const totalPaid = loads
    .filter(load => load.paymentStatus === 'paid')
    .reduce((sum, load) => sum + (load.amount || load.rate || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary">Accounts Section</h1>
        <p className="text-secondary mt-1">Payment Tracking & Management</p>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-card rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary text-sm mb-1">Total Due</p>
              <p className="text-3xl font-bold text-[#A855F7]">{formatCurrency(totalDue)}</p>
              <p className="text-xs text-secondary mt-1">
                {loads.filter(l => l.paymentStatus === 'due').length} loads
              </p>
            </div>
            <PaymentStatusBadge status="due" />
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary text-sm mb-1">Total Paid</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-secondary mt-1">
                {loads.filter(l => l.paymentStatus === 'paid').length} loads
              </p>
            </div>
            <PaymentStatusBadge status="paid" />
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary text-sm mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-[#00D1FF]">
                {formatCurrency(totalDue + totalPaid)}
              </p>
              <p className="text-xs text-secondary mt-1">
                {loads.length} total loads
              </p>
            </div>
            <FaDollarSign className="text-[#00D1FF]" size={32} />
          </div>
        </div>
      </div>

      {/* Payment Tracking Table */}
      <div className="bg-card rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-primary">Payment Tracking</h3>
          <div className="flex items-center gap-3">
            <FaFilter className="text-secondary" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Payments</option>
              <option value="due">Due</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card border-b border-theme">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase">Load #</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase">Order #</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase">Delivery Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase">Payment Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase">Paid Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {filteredLoads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-secondary">
                    <FaTruck className="mx-auto mb-3 text-gray-300" size={48} />
                    <p>No payments to track</p>
                  </td>
                </tr>
              ) : (
                filteredLoads.map((load) => (
                  <tr key={load._id} className="hover:bg-blue-50">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-[#00D1FF]">
                      {load.loadNumber || load._id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {load.orderNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                      {load.customer || load.customerName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-green-600 font-bold">
                        {formatCurrency(load.amount || load.rate || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {load.deliveryDate ? new Date(load.deliveryDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PaymentStatusBadge status={load.paymentStatus || 'due'} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {load.paidDate ? new Date(load.paidDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {load.paymentStatus === 'due' ? (
                        <button
                          onClick={() => handleMarkPaid(load._id)}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                        >
                          <FaCheckCircle size={12} /> Mark Paid
                        </button>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1 text-sm">
                          <FaCheckCircle /> Paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountsSection;

