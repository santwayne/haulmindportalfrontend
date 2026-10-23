import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Download, Sparkles } from 'lucide-react';
import { getMonthlySalaryReport } from '../../../../axios/api/account.payroll';

interface EmployeeReport {
    employeeId: string;
    name: string;
    role: string;
    baseSalary: number;
    bonus: number;
    deductions: number;
    calculatedSalary: number;
    attendance: {
        present: number;
        absent: number;
        leave: number;
        late: number;
        totalHours: number;
        attendanceScore: number;
    };
    hasPayroll: boolean;
    payrollId?: string;
}

interface MonthlyReport {
    month: number;
    year: number;
    employees: EmployeeReport[];
    summary: {
        totalEmployees: number;
        totalPayroll: number;
        averageAttendance: number;
        totalAbsentDays: number;
        totalLeaveDays: number;
        totalPresentDays: number;
    };
    aiInsights?: {
        summary: {
            totalEmployees: number;
            totalPayroll: number;
            averageAttendance: number;
            totalAbsentDays: number;
            totalLeaveDays: number;
        };
        insights: string[];
        recommendations: string[];
        reportDate: string;
    };
}

const MonthlySalaryReport = () => {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<MonthlyReport | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [error, setError] = useState<string | null>(null);
    const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

    const fetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getMonthlySalaryReport(selectedMonth, selectedYear);
            if (response?.success) {
                setReport(response.data);
            } else {
                setError(response?.message || 'Failed to generate report');
            }
        } catch (err: any) {
            setError(err?.message || 'Error generating report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [selectedMonth, selectedYear]);

    const handleExport = () => {
        if (!report) return;

        const csvContent = [
            ['Employee Name', 'Role', 'Base Salary', 'Bonus', 'Deductions', 'Total Salary', 'Present Days', 'Absent Days', 'Leave Days', 'Late Days', 'Total Hours', 'Attendance Score'],
            ...report.employees.map(emp => [
                emp.name,
                emp.role,
                emp.baseSalary.toFixed(2),
                emp.bonus.toFixed(2),
                emp.deductions.toFixed(2),
                emp.calculatedSalary.toFixed(2),
                emp.attendance.present,
                emp.attendance.absent,
                emp.attendance.leave,
                emp.attendance.late,
                emp.attendance.totalHours.toFixed(2),
                emp.attendance.attendanceScore.toFixed(1)
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monthly-salary-report-${selectedMonth}-${selectedYear}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getAttendanceBadgeColor = (score: number) => {
        if (score >= 95) return 'bg-green-100 text-green-800 border-green-200';
        if (score >= 80) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
        <div className="min-h-screen bg-card p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-2">
                                <Sparkles className="text-[#00D1FF]" size={32} />
                                Monthly Salary Report
                            </h1>
                            <p className="text-secondary">AI-powered salary calculation with attendance details</p>
                        </div>
                        <button
                            onClick={handleExport}
                            disabled={!report || loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={20} />
                            Export CSV
                        </button>
                    </div>

                    {/* Date Selector */}
                    <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <Calendar className="text-secondary" size={20} />
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {monthNames.map((month, idx) => (
                                    <option key={idx} value={idx + 1}>{month}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={fetchReport}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all font-medium disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-card border border-red-200 rounded-lg p-4 flex items-center gap-2">
                        <AlertCircle className="text-[#A855F7]" size={20} />
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {loading && (
                    <div className="bg-card rounded-xl shadow-sm border border-theme p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-secondary">Generating report...</p>
                    </div>
                )}

                {report && !loading && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-secondary mb-1">Total Employees</p>
                                        <p className="text-3xl font-bold text-primary">{report.summary.totalEmployees}</p>
                                    </div>
                                    <div className="p-3 bg-blue-100 rounded-full">
                                        <Users className="text-[#00D1FF]" size={24} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-secondary mb-1">Total Payroll</p>
                                        <p className="text-3xl font-bold text-green-600">
                                            ${report.summary.totalPayroll.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-green-100 rounded-full">
                                        <DollarSign className="text-green-600" size={24} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-secondary mb-1">Avg Attendance</p>
                                        <p className="text-3xl font-bold text-[#00D1FF]">
                                            {report.summary.averageAttendance.toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="p-3 bg-blue-100 rounded-full">
                                        <TrendingUp className="text-[#00D1FF]" size={24} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-secondary mb-1">Absent Days</p>
                                        <p className="text-3xl font-bold text-[#A855F7]">{report.summary.totalAbsentDays}</p>
                                    </div>
                                    <div className="p-3 bg-red-100 rounded-full">
                                        <XCircle className="text-[#A855F7]" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Insights */}
                        {report.aiInsights && (
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-sm border border-blue-200 p-6">
                                <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                                    <Sparkles className="text-[#00D1FF]" size={24} />
                                    AI Insights & Recommendations
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-semibold text-primary mb-2">Key Insights</h3>
                                        <ul className="space-y-2">
                                            {report.aiInsights.insights.map((insight, idx) => (
                                                <li key={idx} className="text-sm text-primary flex items-start gap-2">
                                                    <CheckCircle className="text-[#00D1FF] mt-0.5 flex-shrink-0" size={16} />
                                                    {insight}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-primary mb-2">Recommendations</h3>
                                        <ul className="space-y-2">
                                            {report.aiInsights.recommendations.map((rec, idx) => (
                                                <li key={idx} className="text-sm text-primary flex items-start gap-2">
                                                    <AlertCircle className="text-purple-600 mt-0.5 flex-shrink-0" size={16} />
                                                    {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Employee Details Table */}
                        <div className="bg-card rounded-xl shadow-sm border border-theme">
                            <div className="p-6 border-b border-theme">
                                <h2 className="text-xl font-bold text-primary">Employee Details</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-card border-b border-theme">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Employee</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Base Salary</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Bonus</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Deductions</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Total Salary</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Attendance</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-theme">
                                        {report.employees.map((employee) => (
                                            <React.Fragment key={employee.employeeId}>
                                                <tr className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div>
                                                            <div className="font-medium text-primary">{employee.name}</div>
                                                            <div className="text-sm text-secondary">{employee.role}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                                                        ${employee.baseSalary.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                                        +${employee.bonus.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#A855F7] font-medium">
                                                        -${employee.deductions.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                                        ${employee.calculatedSalary.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getAttendanceBadgeColor(employee.attendance.attendanceScore)}`}>
                                                            {employee.attendance.attendanceScore.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => setExpandedEmployee(
                                                                expandedEmployee === employee.employeeId ? null : employee.employeeId
                                                            )}
                                                            className="text-[#00D1FF] hover:text-blue-800 font-medium text-sm"
                                                        >
                                                            {expandedEmployee === employee.employeeId ? 'Hide' : 'Show'} Details
                                                        </button>
                                                    </td>
                                                </tr>
                                                {expandedEmployee === employee.employeeId && (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-4 bg-card">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <CheckCircle className="text-green-600" size={16} />
                                                                    <span className="text-sm text-primary">
                                                                        <strong>Present:</strong> {employee.attendance.present} days
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <XCircle className="text-[#A855F7]" size={16} />
                                                                    <span className="text-sm text-primary">
                                                                        <strong>Absent:</strong> {employee.attendance.absent} days
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <AlertCircle className="text-purple-600" size={16} />
                                                                    <span className="text-sm text-primary">
                                                                        <strong>Leave:</strong> {employee.attendance.leave} days
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Clock className="text-[#00FFA3]" size={16} />
                                                                    <span className="text-sm text-primary">
                                                                        <strong>Late:</strong> {employee.attendance.late} days
                                                                    </span>
                                                                </div>
                                                                <div className="col-span-4 mt-2">
                                                                    <span className="text-sm text-primary">
                                                                        <strong>Total Hours:</strong> {employee.attendance.totalHours.toFixed(2)} hours
                                                                    </span>
                                                                    {employee.hasPayroll && (
                                                                        <span className="ml-4 text-sm text-green-600 font-medium">
                                                                            ✓ Payroll Created
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MonthlySalaryReport;

