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
    const rateLimitResponse = await applyAnalyticsReadRateLimit(session, 'menu');
    if (rateLimitResponse) return rateLimitResponse;

    const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.VIEW_ANALYTICS], 'Menu analytics');
    if (permissionError) return permissionError;

    let propertyIdForLog: string | null = null;
    let startDateForLog: string | null = null;
    let endDateForLog: string | null = null;

    try {
        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get('propertyId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        propertyIdForLog = propertyId;
        startDateForLog = startDate;
        endDateForLog = endDate;
        
        if (!startDate || !endDate) {
            return NextResponse.json({ 
                error: 'Property ID, start date, and end date are required' 
            }, { status: 400 });
        }
        const propertyAccessError = await requireConfiguredGoogleAnalyticsProperty(request, session, propertyId);
        if (propertyAccessError) return propertyAccessError;
        const property = toGoogleAnalyticsPropertyResource(propertyId)!;

        const [response] = await analyticsClient.runReport({
            property,
            dateRanges: [{ startDate, endDate }],
            dimensions: [
                { name: 'eventName' },
                { name: 'customEvent:menuItem' }  // Custom dimension for menu items
            ],
            metrics: [
                { name: 'eventCount' },          // Number of views/interactions
                { name: 'ecommercePurchases' },  // Number of orders
                { name: 'totalRevenue' }         // Revenue generated
            ]
        });

        return NextResponse.json(response);
    } catch (error) {
        logAnalyticsFailure('analytics_menu_api_failed', error, {
            ...getBoundedAnalyticsStringContext('endpoint', '/api/analytics/menu'),
            ...getBoundedAnalyticsStringContext('endDate', endDateForLog),
            ...getBoundedAnalyticsStringContext('propertyId', propertyIdForLog),
            ...getBoundedAnalyticsStringContext('startDate', startDateForLog),
            ...getBoundedAnalyticsStringContext('userId', session?.uId || session?.user?.id || null),
        });
        return NextResponse.json({ error: 'Failed to fetch menu analytics' }, { status: 500 });
    }
});
