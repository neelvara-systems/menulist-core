export const dynamic = 'force-dynamic';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextResponse } from 'next/server';

const analyticsClient = new BetaAnalyticsDataClient({
    credentials: {
        client_email: process.env.GA_CLIENT_EMAIL,
        private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }
});

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get('propertyId');
        
        if (!propertyId) {
            return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
        }

        const [response] = await analyticsClient.runRealtimeReport({
            property: `properties/${propertyId}`,
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
}
