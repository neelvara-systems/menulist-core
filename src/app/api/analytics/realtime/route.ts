export const dynamic = 'force-dynamic';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { PERMISSIONS } from '@constant/permissions';
import { requireConfiguredGoogleAnalyticsProperty, toGoogleAnalyticsPropertyResource } from '@lib/analytics/googlePropertyAccess';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const analyticsClient = new BetaAnalyticsDataClient({
    credentials: {
        client_email: process.env.GA_CLIENT_EMAIL,
        private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }
});

export const GET = withAuth(async (request: NextRequest, session) => {
    const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.VIEW_ANALYTICS], 'Realtime analytics');
    if (permissionError) return permissionError;

    try {
        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get('propertyId');
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
        console.error('Realtime Analytics Error:', error);
        return NextResponse.json({ error: 'Failed to fetch realtime data' }, { status: 500 });
    }
});
