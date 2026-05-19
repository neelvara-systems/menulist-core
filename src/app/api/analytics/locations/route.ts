export const dynamic = 'force-dynamic';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { PERMISSIONS } from '@constant/permissions';
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
    const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.VIEW_ANALYTICS], 'Location analytics');
    if (permissionError) return permissionError;

    try {
        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get('propertyId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        
        if (!propertyId || !startDate || !endDate) {
            return NextResponse.json({ 
                error: 'Property ID, start date, and end date are required' 
            }, { status: 400 });
        }

        const [response] = await analyticsClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [
                { name: 'country' },
                { name: 'city' }
            ],
            metrics: [
                { name: 'totalUsers' },
                { name: 'screenPageViews' },
                { name: 'totalRevenue' }
            ]
        });

        return NextResponse.json(response);
    } catch (error) {
        console.error('Location Analytics Error:', error);
        return NextResponse.json({ error: 'Failed to fetch location analytics' }, { status: 500 });
    }
});
