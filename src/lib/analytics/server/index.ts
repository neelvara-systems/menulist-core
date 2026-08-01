import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';

let analyticsClient: BetaAnalyticsDataClient | null = null;

export const normalizeGoogleAnalyticsPrivateKey = (value?: string): string | undefined => (
    typeof value === 'string' ? value.replace(/\\n/g, '\n') : undefined
);

const getAnalyticsProviderCode = (error: unknown): number | string | undefined => {
    try {
        if (!error || typeof error !== 'object' || !Object.prototype.hasOwnProperty.call(error, 'code')) {
            return undefined;
        }
        const code = Reflect.get(error, 'code');
        return typeof code === 'number' || typeof code === 'string' ? code : undefined;
    } catch {
        return undefined;
    }
};

const isAnalyticsAccessDenied = (error: unknown): boolean => getAnalyticsProviderCode(error) === 7 || getAnalyticsProviderCode(error) === '7';

const createAnalyticsAccessError = (): Error & { code: number } => {
    const accessError = new Error('analytics_access_not_available') as Error & { code: number };
    accessError.code = 7;
    return accessError;
};

const getAnalyticsReportContext = (propertyId: string, startDate?: string, endDate?: string) => ({
    ...getBoundedAnalyticsStringContext('propertyId', propertyId),
    ...getBoundedAnalyticsStringContext('startDate', startDate),
    ...getBoundedAnalyticsStringContext('endDate', endDate),
});

export const getAnalyticsClient = async () => {
    if (!analyticsClient) {
        try {
            analyticsClient = new BetaAnalyticsDataClient({
                credentials: {
                    client_email: process.env.GA_CLIENT_EMAIL,
                    private_key: normalizeGoogleAnalyticsPrivateKey(process.env.GA_PRIVATE_KEY),
                },
                projectId: process.env.GA_PROJECT_ID
            });
        } catch (error) {
            logAnalyticsFailure('analytics_server_client_initialization_failed', error, {
                projectConfigured: Boolean(process.env.GA_PROJECT_ID),
                clientEmailConfigured: Boolean(process.env.GA_CLIENT_EMAIL),
                privateKeyConfigured: Boolean(process.env.GA_PRIVATE_KEY),
            });
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
    } catch (error: unknown) {
        logAnalyticsFailure(
            'analytics_server_report_failed',
            error,
            getAnalyticsReportContext(propertyId, startDate, endDate),
        );
        if (isAnalyticsAccessDenied(error)) {
            throw createAnalyticsAccessError();
        }
        throw new Error('Analytics report failed');
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
    } catch (error: unknown) {
        logAnalyticsFailure(
            'analytics_server_realtime_report_failed',
            error,
            getAnalyticsReportContext(propertyId),
        );
        if (isAnalyticsAccessDenied(error)) {
            throw createAnalyticsAccessError();
        }
        throw new Error('Analytics realtime report failed');
    }
};
