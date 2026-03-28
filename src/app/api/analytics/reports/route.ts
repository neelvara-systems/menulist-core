export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAnalyticsReport, getRealTimeUsers } from '@lib/analytics/server/index';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawPropertyId = searchParams.get('propertyId');
        const propertyId = rawPropertyId?.startsWith('properties/') ? rawPropertyId : `properties/${rawPropertyId}`;
        const startDate = searchParams.get('startDate') || '7daysAgo';
        const endDate = searchParams.get('endDate') || 'today';

        if (!propertyId) {
            return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
        }

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
}
