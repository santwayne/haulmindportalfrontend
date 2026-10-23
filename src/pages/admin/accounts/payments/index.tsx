import { useState } from 'react';
import { Search, Plus, Filter, Download, DollarSign, CreditCard, Calendar, CheckCircle, Clock, AlertCircle, MoreHorizontal } from 'lucide-react';

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for payments
  const [payments] = useState([
    { id: 'PAY-001', date: '2023-12-10', payee: 'Shell Station', amount: 450.00, method: 'Credit Card', status: 'Completed', reference: 'TXN-123456' },
    { id: 'PAY-002', date: '2023-12-11', payee: 'John Doe (Driver)', amount: 1200.50, method: 'ACH', status: 'Processing', reference: 'ACH-789012' },
    { id: 'PAY-003', date: '2023-12-12', payee: 'Truck Repair Inc.', amount: 890.75, method: 'Check', status: 'Pending', reference: 'CHK-1001' },
    { id: 'PAY-004', date: '2023-12-13', payee: 'State Permit Office', amount: 150.00, method: 'Wire', status: 'Completed', reference: 'WRE-456789' },
    { id: 'PAY-005', date: '2023-12-14', payee: 'Office Supplies Co.', amount: 75.25, method: 'Credit Card', status: 'Completed', reference: 'TXN-987654' },
  ]);

  const stats = {
    totalPaid: 2766.50,
    pendingAmount: 890.75,
    processingAmount: 1200.50,
    totalTransactions: 5
  };

  const summaryCards = [
    {
      title: 'Total Paid (Month)',
      value: `$${stats.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      change: '+12.5% vs last month',
      icon: DollarSign,
      color: 'blue'
    },
    {
      title: 'Pending Payments',
      value: `$${stats.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      change: '1 payment pending',
      icon: Clock,
      color: 'orange'
    },
    {
      title: 'Processing',
      value: `$${stats.processingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      change: 'In transit',
      icon: CreditCard,
      color: 'purple'
    },
    {
      title: 'Failed/Flagged',
      value: '$0.00',
      change: 'No issues detected',
      icon: AlertCircle,
      color: 'green' // Using green for "good" state of no errors, or red if errors exist
    }
  ];

  const filteredPayments = payments.filter(payment =>
    payment.payee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-main">
      {/* Header */}
      <div className="bg-card border-b border-theme">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ background: 'var(--accent-navyblue)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Payments Overview</h1>
              <p className="text-sm text-secondary mt-1">
                Manage and track outgoing payments, transaction history, and status
              </p>
            </div>
            <button
              className="px-4 py-2 hover:shadow-lg hover:scale-105 transform duration-200 text-white rounded-lg transition-all flex items-center gap-2"
              style={{ background: 'var(--accent-navyblue)' }}
            >
              <Plus className="w-4 h-4" />
              Record Payment
            </button>
          </div>
        </div>

        {/* Tabs - if needed in future */}
        <div className="px-6">
          <div className="flex gap-1 border-b border-theme">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'all'
                ? 'border-[var(--accent-blue)] text-[#016ab2]'
                : 'border-transparent text-secondary hover:text-primary hover:border-theme'
                }`}
            >
              <CreditCard className="w-4 h-4" />
              All Payments
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'scheduled'
                ? 'border-[var(--accent-blue)] text-[#016ab2]'
                : 'border-transparent text-secondary hover:text-primary hover:border-theme'
                }`}
            >
              <Calendar className="w-4 h-4" />
              Scheduled
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summaryCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className={`rounded-lg shadow-sm p-6 border ${card.color === 'blue' ? 'bg-[#E3F2FD] border-blue-100' :
                card.color === 'green' ? 'bg-[#E8F5E9] border-green-100' :
                  card.color === 'purple' ? 'bg-[#F3E5F5] border-purple-100' :
                    'bg-[#FFF3E0] border-orange-100'
                }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-card`}>
                    <Icon className={`w-6 h-6 ${card.color === 'blue' ? 'text-[var(--accent-blue)]' :
                      card.color === 'green' ? 'text-[rgba(0,209,255,0.15)]' :
                        card.color === 'purple' ? 'text-[var(--accent-blue)]' :
                          'text-orange-500'
                      }`} />
                  </div>
                  <span className="text-sm text-[#063f6f] font-medium">{card.change}</span>
                </div>
                <h3 className="text-[#063f6f] text-sm font-medium mb-1">{card.title}</h3>
                <p className="text-2xl font-bold text-[#016ab2]">{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="bg-card rounded-lg shadow">
          {/* Toolbar */}
          <div className="p-4 border-b border-theme">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search payments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-theme rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  />
                </div>
                <button className="p-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                  <Filter className="w-4 h-4 text-secondary" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 text-sm border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card border-b border-theme">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Payment ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Payee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-theme">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-[rgba(255,255,255,0.03)]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#00D1FF]">{payment.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{payment.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{payment.payee}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{payment.method}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${payment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        payment.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                        {payment.status === 'Completed' ? <CheckCircle className="w-3 h-3" /> :
                          payment.status === 'Processing' ? <Clock className="w-3 h-3" /> :
                            <AlertCircle className="w-3 h-3" />}
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{payment.reference}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="p-1 text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.03)] rounded">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div >
  );
}