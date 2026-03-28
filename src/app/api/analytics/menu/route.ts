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
        console.error('Menu Analytics Error:', error);
        return NextResponse.json({ error: 'Failed to fetch menu analytics' }, { status: 500 });
    }
}
