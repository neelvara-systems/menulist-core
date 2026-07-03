import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

interface DateRange {
    startDate: string;
    endDate: string;
}

type LegacyAnalyticsEndpoint = 'realtime' | 'reports' | 'menu' | 'locations';

type GoogleAnalyticsCellValue = {
    value?: string | null;
};

type GoogleAnalyticsReportRow = {
    dimensionValues?: GoogleAnalyticsCellValue[];
    metricValues?: GoogleAnalyticsCellValue[];
};

export type GoogleAnalyticsReportResponse = {
    rows?: GoogleAnalyticsReportRow[];
    [key: string]: unknown;
};

const LEGACY_ANALYTICS_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;
const LEGACY_ANALYTICS_REQUEST_FAILED = 'Failed to fetch analytics data';

type LegacyAnalyticsResponseLogContext = Record<string, boolean | number | string | null | undefined>;
type LegacyAnalyticsClientError = Error & { endpoint?: string; status?: number };

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isAnalyticsValueArray = (value: unknown): value is GoogleAnalyticsCellValue[] => (
    value === undefined
    || (
        Array.isArray(value)
        && value.every((entry) => (
            isRecord(entry)
            && (entry.value === undefined || entry.value === null || typeof entry.value === 'string')
        ))
    )
);

const isAnalyticsReportRow = (value: unknown): value is GoogleAnalyticsReportRow => (
    isRecord(value)
    && isAnalyticsValueArray(value.dimensionValues)
    && isAnalyticsValueArray(value.metricValues)
);

const isAnalyticsReportResponse = (value: unknown): value is GoogleAnalyticsReportResponse => (
    isRecord(value)
    && (value.rows === undefined || (Array.isArray(value.rows) && value.rows.every(isAnalyticsReportRow)))
);

const getLegacyAnalyticsResponseLogContext = (
    endpoint: LegacyAnalyticsEndpoint,
    propertyId: string,
    response?: Response,
    params?: Record<string, string>,
): LegacyAnalyticsResponseLogContext => ({
    endpoint,
    maxBytes: LEGACY_ANALYTICS_RESPONSE_JSON_MAX_BYTES,
    responseOk: response?.ok,
    responseStatus: response?.status,
    ...getBoundedAnalyticsStringContext('propertyId', propertyId),
    ...getBoundedAnalyticsStringContext('startDate', params?.startDate),
    ...getBoundedAnalyticsStringContext('endDate', params?.endDate),
});

const createLegacyAnalyticsClientError = (
    endpoint: LegacyAnalyticsEndpoint,
    response?: Response,
): LegacyAnalyticsClientError => {
    const error = new Error(LEGACY_ANALYTICS_REQUEST_FAILED) as LegacyAnalyticsClientError;
    error.endpoint = endpoint;
    if (response) {
        error.status = response.status;
    }
    return error;
};

const readLegacyAnalyticsResponseJson = async (
    endpoint: LegacyAnalyticsEndpoint,
    propertyId: string,
    response: Response,
    params?: Record<string, string>,
): Promise<unknown> => {
    try {
        return await readJsonResponseWithLimit<unknown>(
            response,
            LEGACY_ANALYTICS_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logAnalyticsFailure(
            'legacy_analytics_response_parse_failed',
            error,
            getLegacyAnalyticsResponseLogContext(endpoint, propertyId, response, params),
        );
        return null;
    }
};

const normalizeLegacyAnalyticsResponse = (
    endpoint: LegacyAnalyticsEndpoint,
    payload: unknown,
    propertyId: string,
    response: Response,
    params?: Record<string, string>,
): GoogleAnalyticsReportResponse => {
    if (endpoint === 'reports') {
        if (isRecord(payload) && isAnalyticsReportResponse(payload.report)) {
            return payload.report;
        }
    } else if (isAnalyticsReportResponse(payload)) {
        return payload;
    }

    const error = createLegacyAnalyticsClientError(endpoint, response);
    logAnalyticsFailure(
        'legacy_analytics_response_invalid',
        error,
        getLegacyAnalyticsResponseLogContext(endpoint, propertyId, response, params),
    );
    throw error;
};

const getAnalyticsData = async (
    endpoint: LegacyAnalyticsEndpoint,
    propertyId: string,
    params?: Record<string, string>,
): Promise<GoogleAnalyticsReportResponse> => {
    if (!propertyId) {
        throw new Error('Analytics not configured');
    }

    const searchParams = new URLSearchParams({
        propertyId,
        ...params
    });

    const response = await fetch(`/api/analytics/${endpoint}?${searchParams}`, {
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'manual',
    });
    const payload = await readLegacyAnalyticsResponseJson(endpoint, propertyId, response, params);

    if (!response.ok) {
        throw createLegacyAnalyticsClientError(endpoint, response);
    }

    return normalizeLegacyAnalyticsResponse(endpoint, payload, propertyId, response, params);
};

export const fetchRealTimeStats = async (propertyId: string) => {
    return getAnalyticsData('realtime', propertyId);
};

export const fetchDateRangeStats = async (propertyId: string, dateRange: DateRange) => {
    return getAnalyticsData('reports', propertyId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
    });
};

export const fetchMenuItemStats = async (propertyId: string, dateRange: DateRange) => {
    return getAnalyticsData('menu', propertyId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
    });
};

export const fetchLocationStats = async (propertyId: string, dateRange: DateRange) => {
    return getAnalyticsData('locations', propertyId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
    });
};
