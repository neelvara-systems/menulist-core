export const dynamic = 'force-dynamic';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { PERMISSIONS } from '@constant/permissions';
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';
import { requireConfiguredGoogleAnalyticsProperty, toGoogleAnalyticsPropertyResource } from '@lib/analytics/googlePropertyAccess';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';
import { applyAnalyticsReadRateLimit } from '../readRateLimit';

const analyticsClient = new BetaAnalyticsDataClient({
    credentials: {
        client_email: process.env.GA_CLIENT_EMAIL,
        private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }
});

export const GET = withAuth(async (request: NextRequest, session) => {
    const rateLimitResponse = await applyAnalyticsReadRateLimit(session, 'realtime');
    if (rateLimitResponse) return rateLimitResponse;

    const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.VIEW_ANALYTICS], 'Realtime analytics');
    if (permissionError) return permissionError;

    let propertyIdForLog: string | null = null;

    try {
        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get('propertyId');
        propertyIdForLog = propertyId;
        const propertyAccessError = await requireConfiguredGoogleAnalyticsProperty(request, session, propertyId);
        if (propertyAccessError) return propertyAccessError;
        const property = toGoogleAnalyticsPropertyResource(propertyId)!;

        const [response] = await analyticsClient.runRealtimeReport({
            property,
            metrics: [
                { name: 'activeUsers' },
                { name: 'screenPageViews' },
                { name: 'eventCount' }
            ],
            dimensions: [
                { name: 'unifiedScreenName' },
                { name: 'deviceCategory' }
            ]
        });

        return NextResponse.json(response);
    } catch (error) {
        logAnalyticsFailure('analytics_realtime_detail_api_failed', error, {
            ...getBoundedAnalyticsStringContext('endpoint', '/api/analytics/realtime'),
            ...getBoundedAnalyticsStringContext('propertyId', propertyIdForLog),
            ...getBoundedAnalyticsStringContext('userId', session?.uId || session?.user?.id || null),
        });
        return NextResponse.json({ error: 'Failed to fetch realtime data' }, { status: 500 });
    }
});
