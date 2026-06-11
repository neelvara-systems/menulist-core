export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAnalyticsReport, getRealTimeUsers } from '@lib/analytics/server/index';
import { PERMISSIONS } from '@constant/permissions';
import { requireConfiguredGoogleAnalyticsProperty, toGoogleAnalyticsPropertyResource } from '@lib/analytics/googlePropertyAccess';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { withAuth } from '../../../../middleware/auth';

export const GET = withAuth(async (request, session) => {
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
        console.error('Analytics API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch analytics data' },
            { status: error.code === 7 ? 403 : 500 }
        );
    }
});
