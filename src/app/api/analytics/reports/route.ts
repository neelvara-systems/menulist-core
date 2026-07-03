export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAnalyticsReport, getRealTimeUsers } from '@lib/analytics/server/index';
import { logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';
import { PERMISSIONS } from '@constant/permissions';
import { requireConfiguredGoogleAnalyticsProperty, toGoogleAnalyticsPropertyResource } from '@lib/analytics/googlePropertyAccess';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { withAuth } from '../../../../middleware/auth';
import { applyAnalyticsReadRateLimit } from '../readRateLimit';

export const GET = withAuth(async (request, session) => {
    const rateLimitResponse = await applyAnalyticsReadRateLimit(session, 'reports');
    if (rateLimitResponse) return rateLimitResponse;

    const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.VIEW_ANALYTICS], 'Analytics reports');
    if (permissionError) return permissionError;

    try {
        const { searchParams } = new URL(request.url);
        const rawPropertyId = searchParams.get('propertyId');
        const propertyAccessError = await requireConfiguredGoogleAnalyticsProperty(request, session, rawPropertyId);
        if (propertyAccessError) return propertyAccessError;
        const propertyId = toGoogleAnalyticsPropertyResource(rawPropertyId)!;
        const startDate = searchParams.get('startDate') || '7daysAgo';
        const endDate = searchParams.get('endDate') || 'today';

        const [reportData, realtimeData] = await Promise.all([
            getAnalyticsReport(propertyId, startDate, endDate),
            getRealTimeUsers(propertyId)
        ]);

        return NextResponse.json({
            report: reportData,
            realtime: realtimeData
        });
    } catch (error: any) {
        const status = error?.code === 7 ? 403 : 500;
        logAnalyticsFailure('analytics_reports_api_failed', error, {
            endpoint: '/api/analytics/reports',
            status,
        });
        return NextResponse.json(
            { error: status === 403 ? 'Analytics access is not available.' : 'Failed to fetch analytics data' },
            { status }
        );
    }
});
