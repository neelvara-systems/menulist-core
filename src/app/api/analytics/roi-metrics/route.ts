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
import {
    getAnswerlatticeScopedSession,
    resolveAnswerlatticeSessionScope,
} from '@lib/answerlattice/sessionScope';
import { withAuth } from '../../../../middleware/auth';
import { NextRequest, NextResponse } from 'next/server';
import { applyAnalyticsReadRateLimit } from '../readRateLimit';

const MAX_ROI_RANGE_DAYS = 90;
const DEFAULT_ROI_RANGE_DAYS = 30;
const MAX_ROI_HOURLY_COST = 1000;
const MAX_ROI_PLATFORM_MONTHLY_COST = 100_000;
const MAX_ROI_MINUTES_SAVED_PER_CONVERSATION = 480;
const ROI_DAYS_PARAM_PATTERN = /^\d{1,3}$/;
const ROI_MONEY_PARAM_PATTERN = /^\d+(?:\.\d{1,2})?$/;

function parseBoundedRoiDaysParam(rawDays: string | null): number {
    const trimmed = String(rawDays || DEFAULT_ROI_RANGE_DAYS).trim();
    if (!ROI_DAYS_PARAM_PATTERN.test(trimmed)) return DEFAULT_ROI_RANGE_DAYS;

    const parsed = Number(trimmed);
    return Math.min(Math.max(parsed, 1), MAX_ROI_RANGE_DAYS);
}

function parseBoundedRoiMoneyParam(rawValue: string | null, maxValue: number): number | undefined {
    const trimmed = String(rawValue || '').trim();
    if (!trimmed || !ROI_MONEY_PARAM_PATTERN.test(trimmed)) return undefined;

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return undefined;

    return Math.min(parsed, maxValue);
}

export const GET = withAuth(async (request: NextRequest, session) => {
    let userIdForLog: string | number | null | undefined;
    let tenantIdForLog: string | number | null | undefined;
    let daysForLog = 0;

    try {
        // withAuth handles authentication, CORS, role, and blocked-account checks.
        const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
        if (!answerlatticeScope) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }
        const scopedSession = getAnswerlatticeScopedSession(session);
        userIdForLog = session.uId || session.user?.id;
        tenantIdForLog = answerlatticeScope.tenantId;

        const rateLimitResponse = await applyAnalyticsReadRateLimit(scopedSession, 'roi-metrics');
        if (rateLimitResponse) return rateLimitResponse;

        // Get date range from query params (default: last 30 days)
        const searchParams = request.nextUrl.searchParams;
        const days = parseBoundedRoiDaysParam(searchParams.get('days'));
        daysForLog = days;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        // Fetch chat statistics from daily aggregates + today's bounded live data.
        const stats = await getChatStatisticsOptimized(scopedSession, days);

        // Transform stats to ChatAnalyticsData format
        const analyticsData: ChatAnalyticsData = {
            totalConversations: stats.totalChats || 0,
            qnaConversations: stats.qnaChats || 0,
            assistantConversations: stats.assistantChats || 0,
            positiveFeedback: stats.positiveFeedback || 0,
            negativeFeedback: stats.negativeFeedback || 0,
            dateRange: {
                start: startDate,
                end: endDate
            }
        };

        // Get calculation parameters (allow user overrides via query params)
        const hourlyCostParam = searchParams.get('hourlyCost');
        const minutesSavedParam = searchParams.get('minutesSaved');
        const platformCostParam = searchParams.get('platformCost');
        const hourlyCost = parseBoundedRoiMoneyParam(hourlyCostParam, MAX_ROI_HOURLY_COST);
        const minutesSavedPerConversation = parseBoundedRoiMoneyParam(
            minutesSavedParam,
            MAX_ROI_MINUTES_SAVED_PER_CONVERSATION,
        );
        const platformMonthlyCost = parseBoundedRoiMoneyParam(platformCostParam, MAX_ROI_PLATFORM_MONTHLY_COST);

        const params: ROICalculationParams = {
            ...getDefaultROIParams(analyticsData),
            ...(hourlyCost !== undefined && { avgSupportAgentHourlyCost: hourlyCost }),
            ...(minutesSavedPerConversation !== undefined && {
                assumedMinutesSavedPerConversation: minutesSavedPerConversation,
            }),
            ...(platformMonthlyCost !== undefined && { platformMonthlyCost }),
        };

        // Calculate ROI metrics
        const roiMetrics = calculateROI(params);

        return NextResponse.json({
            success: true,
            data: {
                tId: answerlatticeScope.tenantId,
                sId: answerlatticeScope.storeId,
                metrics: roiMetrics,
                params: {
                    avgSupportAgentHourlyCost: params.avgSupportAgentHourlyCost,
                    assumedMinutesSavedPerConversation: params.assumedMinutesSavedPerConversation,
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
