import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type AnalyticsLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedAnalyticsStringContext = (
  label: string,
  value: unknown,
): AnalyticsLogContext => {
  return getBoundedLogValueContext(label, value);
};

const getAnalyticsErrorName = (error: unknown): string => {
    return getBoundedErrorName(error) || typeof error;
};

const getAnalyticsErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getAnalyticsErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
