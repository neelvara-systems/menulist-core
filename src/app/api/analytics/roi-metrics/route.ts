export const dynamic = 'force-dynamic';
/**
 * ROI Metrics API Endpoint
 * 
 * Fetches chat analytics data and calculates ROI metrics
 * Used by: ROI Calculator component
 * 
 * @route GET /api/analytics/roi-metrics
 */

import { getChatStatistics } from '@database/chatSessions';
import { calculateROI, ChatAnalyticsData, getDefaultROIParams, ROICalculationParams } from '@lib/analytics/roiCalculations';
import getActiveSession from '@lib/auth/getActiveSession';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Get active session
        const session = await getActiveSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Rate limiting
        const rateLimitConfig = getRateLimitForFeature('DATA_READ');
        const rateLimit = await checkRateLimit({ key: `roi-metrics:${session.uId}:${session.tId}`, ...rateLimitConfig });

        if (!rateLimit.allowed) {
            const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
            return NextResponse.json(
                {
                    error: `Too many requests. Please wait ${waitSeconds} seconds.`,
                    retryAfter: waitSeconds,
                    resetAt: rateLimit.resetAt
                },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': String(rateLimitConfig.limit),
                        'X-RateLimit-Remaining': String(rateLimit.remaining),
                        'X-RateLimit-Reset': String(rateLimit.resetAt),
                        'Retry-After': String(waitSeconds)
                    }
                }
            );
        }

        // Get date range from query params (default: last 30 days)
        const searchParams = request.nextUrl.searchParams;
        const daysParam = searchParams.get('days') || '30';
        const days = parseInt(daysParam, 10);

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        // Fetch chat statistics from existing function
        const stats = await getChatStatistics(session, { start: startDate, end: endDate });

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
        console.error('[ROI Metrics API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to calculate ROI metrics' },
            { status: 500 }
        );
    }
}

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
