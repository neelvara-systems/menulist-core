export const dynamic = 'force-dynamic';
/**
 * ROI Metrics API Endpoint
 * 
 * Fetches chat analytics data and calculates ROI metrics
 * Used by: ROI Calculator component
 * 
 * @route GET /api/analytics/roi-metrics
 */

import { getChatStatisticsOptimized } from '@database/chatAnalytics';
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';
import { calculateROI, ChatAnalyticsData, getDefaultROIParams, ROICalculationParams } from '@lib/analytics/roiCalculations';
import { withAuth } from '../../../../middleware/auth';
import { NextRequest, NextResponse } from 'next/server';
import { applyAnalyticsReadRateLimit } from '../readRateLimit';

const MAX_ROI_RANGE_DAYS = 90;

export const GET = withAuth(async (request: NextRequest, session) => {
    let userIdForLog: string | number | null | undefined;
    let tenantIdForLog: string | number | null | undefined;
    let daysForLog = 0;

    try {
        // withAuth handles authentication, CORS, role, and blocked-account checks.
        if (!session?.tId || !session?.sId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
        userIdForLog = session.uId || session.user?.id;
        tenantIdForLog = session.tId;

        const rateLimitResponse = await applyAnalyticsReadRateLimit(session, 'roi-metrics');
        if (rateLimitResponse) return rateLimitResponse;

        // Get date range from query params (default: last 30 days)
        const searchParams = request.nextUrl.searchParams;
        const daysParam = searchParams.get('days') || '30';
        const parsedDays = parseInt(daysParam, 10);
        const days = Number.isFinite(parsedDays)
            ? Math.min(Math.max(parsedDays, 1), MAX_ROI_RANGE_DAYS)
            : 30;
        daysForLog = days;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        // Fetch chat statistics from daily aggregates + today's bounded live data.
        const stats = await getChatStatisticsOptimized(session, days);

        // Transform stats to ChatAnalyticsData format
        const analyticsData: ChatAnalyticsData = {
            totalConversations: stats.totalChats || 0,
            resolvedConversations: stats.totalChats || 0, // Assume all are resolved for now
            averageResolutionTime: calculateAverageResolutionTime(stats),
            positiveFeedback: stats.positiveFeedback || 0,
            negativeFeedback: stats.negativeFeedback || 0,
            dateRange: {
                start: startDate,
                end: endDate
            }
        };

        // Get calculation parameters (allow user overrides via query params)
        const hourlyCostParam = searchParams.get('hourlyCost');
        const clvParam = searchParams.get('clv');
        const platformCostParam = searchParams.get('platformCost');

        const params: ROICalculationParams = {
            ...getDefaultROIParams(analyticsData),
            ...(hourlyCostParam && { avgSupportAgentHourlyCost: parseFloat(hourlyCostParam) }),
            ...(clvParam && { avgCustomerLifetimeValue: parseFloat(clvParam) }),
            ...(platformCostParam && { platformMonthlyCost: parseFloat(platformCostParam) }),
        };

        // Calculate ROI metrics
        const roiMetrics = calculateROI(params);

        return NextResponse.json({
            success: true,
            data: {
                metrics: roiMetrics,
                analyticsData,
                params: {
                    avgSupportAgentHourlyCost: params.avgSupportAgentHourlyCost,
                    avgCustomerLifetimeValue: params.avgCustomerLifetimeValue,
                    platformMonthlyCost: params.platformMonthlyCost,
                },
                dateRange: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    days
                }
            }
        });

    } catch (error) {
        logAnalyticsFailure('analytics_roi_metrics_api_failed', error, {
            ...getBoundedAnalyticsStringContext('endpoint', '/api/analytics/roi-metrics'),
            ...getBoundedAnalyticsStringContext('tenantId', tenantIdForLog),
            ...getBoundedAnalyticsStringContext('userId', userIdForLog),
            days: daysForLog,
        });
        return NextResponse.json(
            { error: 'Failed to calculate ROI metrics' },
            { status: 500 }
        );
    }
});

/**
 * Calculate average resolution time from stats
 * Uses average response time as proxy for resolution time
 */
function calculateAverageResolutionTime(stats: any): number {
    // If we have average response time, use it
    if (stats.averageResponseTime) {
        return stats.averageResponseTime;
    }

    // Otherwise, estimate based on mode
    // QnA mode: typically 2-3 minutes
    // Assistant mode: typically 5-10 minutes
    const qnaCount = stats.qnaModeCount || 0;
    const assistantCount = stats.assistantModeCount || 0;
    const total = qnaCount + assistantCount;

    if (total === 0) {
        return 5; // Default assumption
    }

    const qnaAvg = 2.5; // 2.5 minutes average for QnA
    const assistantAvg = 7; // 7 minutes average for Assistant

    const weightedAvg = ((qnaCount * qnaAvg) + (assistantCount * assistantAvg)) / total;
    return weightedAvg;
}
