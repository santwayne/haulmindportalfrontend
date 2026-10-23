import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertTriangle, CheckCircle, Lightbulb, Target, RefreshCw, Sparkles } from 'lucide-react';
import { getCashFlowInsights, type CashFlowInsightsResponse } from '../../../../axios/api/account.cashflow';

interface CashFlowInsightsPageProps { }

const CashFlowInsightsPage: React.FC<CashFlowInsightsPageProps> = () => {
    const [loading, setLoading] = useState(false);
    const [insightsData, setInsightsData] = useState<CashFlowInsightsResponse['data'] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<number>(90);
    const [customDateRange, setCustomDateRange] = useState<{ start?: string; end?: string }>({});



    const fetchInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            const params: any = { period };
            if (customDateRange.start) params.startDate = customDateRange.start;
            if (customDateRange.end) params.endDate = customDateRange.end;

            const response = await getCashFlowInsights(params);

            if (response.success && response.data) {
                setInsightsData(response.data);
            } else {
                setError(response.message || 'Failed to fetch cash flow insights');
            }
        } catch (err: any) {
            console.error('Error fetching cash flow insights:', err);
            setError(err.message || 'An error occurred while fetching insights');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'positive':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'negative':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-card text-primary border-theme';
        }
    };

 
 

    return (
        <div className="min-h-screen p-6 bg-main">
            <div className="w-full mx-auto p-2">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">

                            <div>
                                <h1 className="text-3xl font-bold flex items-center gap-2" style={{ background: 'var(--accent-navyblue)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>

                                    Cash Flow Insights
                                </h1>
                                <p className="text-secondary mt-1">AI-powered financial analysis and predictions</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchInsights}
                            disabled={loading}
                            className="bg-[var(--accent-navyblue)] px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors "

                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Loading...' : 'Refresh Insights'}
                        </button>
                    </div>

                    {/* Date Range Selector */}
                    <div className="bg-card p-4 rounded-lg border border-theme shadow-sm">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-primary">Period:</label>
                                <select
                                    value={period}
                                    onChange={(e) => {
                                        setPeriod(Number(e.target.value));
                                        setCustomDateRange({});
                                    }}
                                    className="border border-theme rounded-md px-3 py-2 text-sm
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                                >
                                    <option value={30} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                                        Last 30 Days
                                    </option>

                                    <option value={60} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                                        Last 60 Days
                                    </option>

                                    <option value={90} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                                        Last 90 Days
                                    </option>

                                    <option value={180} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                                        Last 6 Months
                                    </option>

                                    <option value={365} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                                        Last Year
                                    </option>

                                    <option value={0} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                                        Custom Range
                                    </option>
                                </select>
                            </div>
                            {period === 0 && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-primary">Start Date:</label>
                                        <input
                                            type="date"
                                            value={customDateRange.start || ''}
                                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                            className="border border-theme rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-primary">End Date:</label>
                                        <input
                                            type="date"
                                            value={customDateRange.end || ''}
                                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                            className="border border-theme rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <button
                                        onClick={fetchInsights}
                                        disabled={loading || !customDateRange.start || !customDateRange.end}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Apply
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && !insightsData && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-secondary">Analyzing cash flow data with AI...</p>
                        <p className="text-sm text-secondary mt-2">This may take a few moments</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-card border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-[#A855F7]" />
                            <p className="text-red-800 font-medium">Error: {error}</p>
                        </div>
                    </div>
                )}

                {/* Insights Data */}
                {insightsData && !loading && (
                    <div className="space-y-6">
                        {/* AI Summary Card */}
                        {insightsData.aiInsights && (
                            <div className="bg-card border-2 border-theme rounded-xl p-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2  rounded-lg">
                                        <Sparkles className="h-6 w-6 text-[var(--accent-purple)]" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-[var(--accent-purple)]">AI Analysis Summary</h2>
                                        <p className="text-sm text-secondary">Powered by o3-mini</p>
                                    </div>
                                </div>

                                {/* Cash Flow Status */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-[var(--accent-blue)]/20 rounded-lg p-4 border-2 border-theme">
                                        <div className="text-sm text-[var(--accent-blue)] mb-1">Current Cash Position</div>
                                        <div className={`text-2xl font-bold ${insightsData.aiInsights.summary.currentCashPosition >= 0 ? 'text-green-600' : 'text-[var(--accent-blue)]'}`}>
                                            {formatCurrency(insightsData.aiInsights.summary.currentCashPosition)}
                                        </div>
                                    </div>
                                    <div className="bg-[var(--accent-green)]/20 rounded-lg p-4 border-2 border-theme">
                                        <div className="text-sm text-[var(--accent-green)] mb-1">Cash Flow Status</div>
                                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(insightsData.aiInsights.summary.cashFlowStatus)}`}>
                                            {insightsData.aiInsights.summary.cashFlowStatus.charAt(0).toUpperCase() + insightsData.aiInsights.summary.cashFlowStatus.slice(1)}
                                        </div>
                                        <div className="text-xs text-[var(--accent-green)] mt-2">
                                            {insightsData.aiInsights.summary.daysCashOnHand} days cash on hand
                                        </div>
                                    </div>
                                    <div className="bg-[var(--accent-red)]/20 rounded-lg p-4 border-2 border-theme">
                                        <div className="text-sm text-[var(--accent-red)] mb-1">Total Obligations</div>
                                        <div className="text-2xl font-bold text-[var(--accent-red)]">
                                            {formatCurrency(insightsData.aiInsights.summary.totalObligations)}
                                        </div>
                                    </div>
                                </div>

                                {/* Key Insights */}
                                {insightsData.aiInsights.insights && insightsData.aiInsights.insights.length > 0 && (
                                    <div className="bg-card rounded-lg p-4 border border-theme mb-4">
                                        <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                                            Key Insights
                                        </h3>
                                        <ul className="space-y-2">
                                            {insightsData.aiInsights.insights.map((insight, index) => (
                                                <li key={index} className="text-sm text-primary flex items-start gap-2">
                                                    <span className="text-blue-500 mt-1">•</span>
                                                    <span>{insight}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* AI Reasoning */}
                                {insightsData.aiInsights.reasoning && (
                                    <div className="bg-card rounded-lg p-4 border border-theme">
                                        <h3 className="font-semibold text-primary mb-2">Analysis Reasoning</h3>
                                        <p className="text-sm text-primary leading-relaxed">{insightsData.aiInsights.reasoning}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Financial Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-[var(--accent-green)]/20 rounded-lg p-6 border border-theme shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-[var(--accent-green)]">Total Revenue</span>
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                </div>
                                <div className="text-2xl font-bold text-[var(--accent-green)]">{formatCurrency(insightsData.totalRevenue)}</div>
                                <div className="text-xs text-[var(--accent-green)] mt-1">{insightsData.paidInvoices.count} paid invoices</div>
                            </div>

                            <div className="bg-[var(--accent-amber)]/20 rounded-lg p-6 border border-theme shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-[var(--accent-amber)]">Pending Invoices</span>
                                    <DollarSign className="h-5 w-5 text-amber-500" />
                                </div>
                                <div className="text-2xl font-bold text-[var(--accent-amber)]">{formatCurrency(insightsData.pendingInvoices.totalAmount)}</div>
                                <div className="text-xs text-[var(--accent-amber)] mt-1">{insightsData.pendingInvoices.count} outstanding</div>
                            </div>

                            <div className="bg-[var(--accent-red)]/20 rounded-lg p-6 border border-theme shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-[var(--accent-red)]">Total Expenses</span>
                                    <TrendingDown className="h-5 w-5 text-red-500" />
                                </div>
                                <div className="text-2xl font-bold text-[var(--accent-red)]">{formatCurrency(insightsData.totalExpenses)}</div>
                                <div className="text-xs text-[var(--accent-red)] mt-1">Expense management</div>
                            </div>

                            <div className="bg-[var(--accent-blue)]/20 rounded-lg p-6 border border-theme shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-[var(--accent-blue)]">Total Payroll</span>
                                    <DollarSign className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="text-2xl font-bold text-[var(--accent-blue)]">{formatCurrency(insightsData.totalPayroll)}</div>
                                <div className="text-xs text-[var(--accent-blue)] mt-1">Employee costs</div>
                            </div>
                        </div>

                        {/* Predictions */}
                        {insightsData.aiInsights?.predictions && (
                            <div className="bg-card rounded-lg p-6 border border-theme shadow-sm">
                                <h3 className="text-lg font-bold text-headings mb-4 flex items-center gap-2">
                                    <Target className="h-5 w-5 text-headings" />
                                    Cash Flow Predictions
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {['next30Days', 'next60Days', 'next90Days'].map((periodKey) => {
                                        const prediction = insightsData.aiInsights?.predictions[periodKey as keyof typeof insightsData.aiInsights.predictions];
                                        if (!prediction) return null;

                                        return (
                                            <div key={periodKey} className="bg-card rounded-lg p-4 border-2 border-theme">
                                                <div className="text-sm font-medium text-primary mb-3">
                                                    {periodKey === 'next30Days' ? 'Next 30 Days' : periodKey === 'next60Days' ? 'Next 60 Days' : 'Next 90 Days'}
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-secondary">Projected Inflow:</span>
                                                        <span className="font-medium text-green-600">{formatCurrency(prediction.projectedInflow)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-secondary">Projected Outflow:</span>
                                                        <span className="font-medium text-[#A855F7]">{formatCurrency(prediction.projectedOutflow)}</span>
                                                    </div>
                                                    <div className="border-t border-theme pt-2 mt-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-sm font-medium text-primary">Net Cash Flow:</span>
                                                            <span className={`font-bold ${prediction.projectedCashFlow >= 0 ? 'text-green-600' : 'text-[#A855F7]'}`}>
                                                                {formatCurrency(prediction.projectedCashFlow)}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-secondary mt-1">
                                                            Confidence: {prediction.confidence}%
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Risks & Recommendations */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Risks */}
                            {insightsData.aiInsights?.risks && insightsData.aiInsights.risks.length > 0 && (
                                <div className="bg-card rounded-lg p-6 border border-theme shadow-sm">
                                    <h3 className="text-lg font-bold text-[var(--accent-red)] mb-4 flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-[var(--accent-red)]" />
                                        Risk Alerts
                                    </h3>
                                    <div className="space-y-3">
                                        {insightsData.aiInsights.risks.map((risk, index) => (
                                            <div key={index} className={`p-4 rounded-lg  border border-gray-700`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <span className="text-xs font-medium uppercase">{risk.severity} Risk</span>
                                                    <span className="text-xs font-medium">{risk.category}</span>
                                                </div>
                                                <p className="text-sm font-medium mb-1">{risk.description}</p>
                                                <p className="text-xs text-[var(--accent-red)] mb-2">{risk.impact}</p>
                                                <p className="text-xs font-medium">Recommended: {risk.recommendedAction}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            {insightsData.aiInsights?.recommendations && insightsData.aiInsights.recommendations.length > 0 && (
                                <div className="bg-card rounded-lg p-6 border border-theme shadow-sm">
                                    <h3 className="text-lg font-bold text-[var(--accent-green)] mb-4 flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-[var(--accent-green)]" />
                                        Recommendations
                                    </h3>
                                    <div className="space-y-3">
                                        {insightsData.aiInsights.recommendations.map((rec, index) => (
                                            <div key={index} className={`p-4 rounded-lg  border border-gray-700`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <span className="text-xs font-medium uppercase">{rec.priority} Priority</span>
                                                    <span className="text-xs font-medium">{rec.category}</span>
                                                </div>
                                                <p className="text-sm font-medium mb-1">{rec.recommendation}</p>
                                                <p className="text-xs text-[var(--accent-green)] mb-2">{rec.rationale}</p>
                                                <p className="text-xs font-medium">Expected Impact: {rec.expectedImpact}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Opportunities */}
                        {insightsData.aiInsights?.opportunities && insightsData.aiInsights.opportunities.length > 0 && (
                            <div className="bg-card rounded-lg p-6 border border-theme shadow-sm">
                                <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                                    Opportunities
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {insightsData.aiInsights.opportunities.map((opp, index) => (
                                        <div key={index} className="bg-gradient-to-br from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                                            <div className="text-xs font-medium text-green-800 mb-1 uppercase">{opp.category}</div>
                                            <p className="text-sm font-medium text-primary mb-2">{opp.description}</p>
                                            <p className="text-xs text-primary mb-1">Potential Benefit: {opp.potentialBenefit}</p>
                                            <p className="text-xs font-medium text-green-700">Action: {opp.actionRequired}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Key Metrics */}
                        {insightsData.aiInsights?.keyMetrics && (
                            <div className="bg-card rounded-lg p-6 border border-theme shadow-sm">
                                <h3 className="text-lg font-bold text-headings mb-4">Key Financial Metrics</h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="text-center p-3 bg-card rounded-lg">
                                        <div className="text-xs text-secondary mb-1">Collection Rate</div>
                                        <div className="text-lg font-bold text-primary">
                                            {typeof insightsData.aiInsights.keyMetrics.collectionRate === 'number'
                                                ? `${insightsData.aiInsights.keyMetrics.collectionRate.toFixed(1)}%`
                                                : `${insightsData.aiInsights.keyMetrics.collectionRate}%`}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-card rounded-lg">
                                        <div className="text-xs text-secondary mb-1">Avg Payment Delay</div>
                                        <div className="text-lg font-bold text-primary">{insightsData.aiInsights.keyMetrics.averagePaymentDelay} days</div>
                                    </div>
                                    <div className="text-center p-3 bg-card rounded-lg">
                                        <div className="text-xs text-secondary mb-1">Expense Ratio</div>
                                        <div className="text-lg font-bold text-primary">
                                            {typeof insightsData.aiInsights.keyMetrics.expenseToRevenueRatio === 'number'
                                                ? `${insightsData.aiInsights.keyMetrics.expenseToRevenueRatio.toFixed(1)}%`
                                                : `${insightsData.aiInsights.keyMetrics.expenseToRevenueRatio}%`}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-card rounded-lg">
                                        <div className="text-xs text-secondary mb-1">Payroll Ratio</div>
                                        <div className="text-lg font-bold text-primary">
                                            {typeof insightsData.aiInsights.keyMetrics.payrollToRevenueRatio === 'number'
                                                ? `${insightsData.aiInsights.keyMetrics.payrollToRevenueRatio.toFixed(1)}%`
                                                : `${insightsData.aiInsights.keyMetrics.payrollToRevenueRatio}%`}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-card rounded-lg">
                                        <div className="text-xs text-secondary mb-1">Cash Cycle</div>
                                        <div className="text-lg font-bold text-primary">{insightsData.aiInsights.keyMetrics.cashConversionCycle} days</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Monthly Breakdown */}
                        {insightsData.monthlyBreakdown && insightsData.monthlyBreakdown.length > 0 && (
                            <div className="bg-card rounded-lg p-6 border border-theme shadow-sm">
                                <h3 className="text-lg font-bold text-headings mb-4 flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-headings" />
                                    Monthly Cash Flow Breakdown
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-card">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">Month</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-headings uppercase">Revenue</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-headings uppercase">Expenses</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-headings uppercase">Payroll</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-headings uppercase">Net Cash Flow</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-theme divide-white/5">
                                            {insightsData.monthlyBreakdown.map((month, index) => (
                                                <tr key={index} className="hover:bg-[rgba(255,255,255,0.03)]">
                                                    <td className="px-4 py-3 text-sm font-medium text-primary">{month.monthName}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(month.revenue)}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-[#A855F7]">{formatCurrency(month.expenses)}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-[#00D1FF]">{formatCurrency(month.payroll)}</td>
                                                    <td className={`px-4 py-3 text-sm text-right font-medium ${month.netCashFlow >= 0 ? 'text-green-600' : 'text-[#A855F7]'}`}>
                                                        {formatCurrency(month.netCashFlow)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Pending Invoices Aging */}
                        {insightsData.pendingInvoices && insightsData.pendingInvoices.totalAmount > 0 && (
                            <div className="bg-card rounded-lg p-6 border border-theme shadow-sm">
                                <h3 className="text-lg font-bold text-headings mb-4">Pending Invoices Aging Analysis</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(insightsData.pendingInvoices.agingBreakdown).map(([bucket, data]) => (
                                        <div key={bucket} className="bg-card rounded-lg p-4 border border-theme">
                                            <div className="text-sm font-medium text-secondary mb-1">{bucket} Days</div>
                                            <div className="text-lg font-bold text-primary">{formatCurrency(data.amount)}</div>
                                            <div className="text-xs text-secondary mt-1">{data.count} invoices</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CashFlowInsightsPage;

