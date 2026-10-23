import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface Error {
    message?: string;
    response?: {
        data?: {
            message: string;
        };
    };
}

export interface CashFlowInsightsResponse {
    success: boolean;
    data?: {
        totalRevenue: number;
        totalExpenses: number;
        totalPayroll: number;
        pendingInvoices: {
            totalAmount: number;
            count: number;
            agingBreakdown: {
                '0-30': { count: number; amount: number };
                '31-60': { count: number; amount: number };
                '61-90': { count: number; amount: number };
                '90+': { count: number; amount: number };
            };
        };
        paidInvoices: {
            totalAmount: number;
            count: number;
        };
        monthlyBreakdown: Array<{
            month: string;
            monthName: string;
            revenue: number;
            expenses: number;
            payroll: number;
            netCashFlow: number;
        }>;
        upcomingExpenses: number;
        upcomingPayroll: number;
        averageCollectionDays: number;
        paymentTrends: Array<{
            month: string;
            monthName: string;
            amount: number;
            count: number;
        }>;
        aiInsights: {
            summary: {
                currentCashPosition: number;
                cashFlowStatus: 'positive' | 'negative' | 'critical';
                availableCash: number;
                totalObligations: number;
                daysCashOnHand: number;
            };
            trends: {
                revenueTrend: string;
                expenseTrend: string;
                cashFlowTrend: string;
                collectionTrend: string;
            };
            predictions: {
                next30Days: {
                    projectedInflow: number;
                    projectedOutflow: number;
                    projectedCashFlow: number;
                    confidence: number;
                };
                next60Days: {
                    projectedInflow: number;
                    projectedOutflow: number;
                    projectedCashFlow: number;
                    confidence: number;
                };
                next90Days: {
                    projectedInflow: number;
                    projectedOutflow: number;
                    projectedCashFlow: number;
                    confidence: number;
                };
            };
            risks: Array<{
                severity: 'high' | 'medium' | 'low';
                category: string;
                description: string;
                impact: string;
                recommendedAction: string;
            }>;
            opportunities: Array<{
                category: string;
                description: string;
                potentialBenefit: string;
                actionRequired: string;
            }>;
            recommendations: Array<{
                priority: 'high' | 'medium' | 'low';
                category: string;
                recommendation: string;
                rationale: string;
                expectedImpact: string;
            }>;
            insights: string[];
            keyMetrics: {
                collectionRate: number | string;
                averagePaymentDelay: number;
                expenseToRevenueRatio: number | string;
                payrollToRevenueRatio: number | string;
                cashConversionCycle: number;
            };
            reasoning: string;
        } | null;
        metadata: {
            period: string;
            startDate: string;
            endDate: string;
            generatedAt: string;
        };
    };
    message?: string;
}

// Get Cash Flow Insights with AI Analysis
export const getCashFlowInsights = async (params?: { startDate?: string; endDate?: string; period?: number }): Promise<CashFlowInsightsResponse> => {
    try {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        if (params?.period) queryParams.append('period', params.period.toString());

        const queryString = queryParams.toString();
        const url = `hr/cash-flow-insights${queryString ? `?${queryString}` : ''}`;
        
        const res: AxiosResponse = await apiClient.get(url);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return {
            success: false,
            message: err.response?.data?.message || err.message || 'Failed to fetch cash flow insights',
            data: undefined
        };
    }
};

