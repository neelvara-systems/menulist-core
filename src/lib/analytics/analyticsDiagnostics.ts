import { secureError } from '@lib/security/secureLogger';

type AnalyticsLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedAnalyticsStringContext = (
  label: string,
  value: unknown,
): AnalyticsLogContext => {
  const normalized = value === undefined || value === null ? '' : String(value);

  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
};

const getAnalyticsErrorName = (error: unknown): string => {
  if (error instanceof Error) return error.name || 'Error';
  return typeof error;
};

const getAnalyticsErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  if (code === undefined || code === null) return undefined;
  return String(code).slice(0, 64);
};

const getAnalyticsErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const statusValue = 'status' in error
    ? (error as { status?: unknown }).status
    : (error as { statusCode?: unknown }).statusCode;
  const status = Number(statusValue);
  return Number.isFinite(status) ? status : undefined;
};

export const getAnalyticsTrackingContext = (data?: Record<string, unknown>): AnalyticsLogContext => ({
  ...getBoundedAnalyticsStringContext('tenantId', data?.tenantId),
  ...getBoundedAnalyticsStringContext('storeId', data?.storeId),
  ...getBoundedAnalyticsStringContext('projectId', data?.projectId),
  ...getBoundedAnalyticsStringContext('sessionId', data?.sessionId),
  hasStoreTimeZone: Boolean(data?.storeTimeZone),
  hasBusinessDayEndTime: Boolean(data?.businessDayEndTime),
});

export const getAnalyticsQueueContext = (
  queueKey: string,
  queued?: {
    tenantId?: unknown;
    storeId?: unknown;
    projectId?: unknown;
    dateString?: unknown;
    storeTimeZone?: unknown;
    businessDayEndTime?: unknown;
    eventCount?: unknown;
  },
): AnalyticsLogContext => ({
  ...getBoundedAnalyticsStringContext('queueKey', queueKey),
  ...getBoundedAnalyticsStringContext('tenantId', queued?.tenantId),
  ...getBoundedAnalyticsStringContext('storeId', queued?.storeId),
  ...getBoundedAnalyticsStringContext('projectId', queued?.projectId),
  ...getBoundedAnalyticsStringContext('dateString', queued?.dateString),
  eventCount: typeof queued?.eventCount === 'number' ? queued.eventCount : 0,
  hasStoreTimeZone: Boolean(queued?.storeTimeZone),
  hasBusinessDayEndTime: Boolean(queued?.businessDayEndTime),
});

export const logAnalyticsFailure = (
  failureCode: string,
  error?: unknown,
  context: AnalyticsLogContext = {},
): void => {
  secureError('[Analytics] Operation failed', new Error(failureCode), {
    ...context,
    sourceErrorName: error === undefined ? undefined : getAnalyticsErrorName(error),
    sourceErrorCode: getAnalyticsErrorCode(error),
    sourceStatusCode: getAnalyticsErrorStatus(error),
  });
};
