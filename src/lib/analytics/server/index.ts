import { BetaAnalyticsDataClient } from '@google-analytics/data';

let analyticsClient: BetaAnalyticsDataClient | null = null;

export const getAnalyticsClient = async () => {
    if (!analyticsClient) {
        try {
            analyticsClient = new BetaAnalyticsDataClient({
                credentials: {
                    client_email: process.env.GA_CLIENT_EMAIL,
                    private_key: process.env.GA_PRIVATE_KEY?.replace(/\n/g, '\n'),
                },
                projectId: process.env.GA_PROJECT_ID
            });
        } catch (error) {
            console.error('Failed to initialize Analytics client:', error);
            throw new Error('Analytics initialization failed');
        }
    }
    return analyticsClient;
};

export const getAnalyticsReport = async (propertyId: string, startDate: string, endDate: string) => {
    try {
        const client = await getAnalyticsClient();
        const [response] = await client.runReport({
            property: propertyId,
            dateRanges: [{ startDate, endDate }],
            metrics: [
                { name: 'activeUsers' },
                { name: 'screenPageViews' },
                { name: 'totalRevenue' }
            ],
            dimensions: [{ name: 'date' }]
        });
        return response;
    } catch (error: any) {
        console.error('Analytics Report Error:', error);
        if (error.code === 7) {
            throw new Error('Please verify your Google Analytics setup and permissions');
        }
        throw error;
    }
};

export const getRealTimeUsers = async (propertyId: string) => {
    try {
        const client = await getAnalyticsClient();
        const [response] = await client.runRealtimeReport({
            property: propertyId,
            metrics: [{ name: 'activeUsers' }],
            dimensions: [{ name: 'country' }]
        });
        return response;
    } catch (error: any) {
        console.error('Realtime Analytics Error:', error);
        if (error.code === 7) {
            throw new Error('Please verify your Google Analytics setup and permissions');
        }
        throw error;
    }
};