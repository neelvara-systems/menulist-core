/**
 * Scheduler Hour Utility (Server-Side)
 * 
 * Mirrors src/lib/utils/schedulerHour.ts for Cloud Functions.
 * Computes the UTC fallback hour for a store's analytics settlement window.
 * 
 * @see __docs__/patterns/nightly-scheduler-architecture.md
 */

import { getAnalyticsSettlementLocalMinutes } from './businessDay';
import { analyticsLogger, getAnalyticsErrorContext, getAnalyticsIdContext } from '../analytics/analyticsDiagnostics';

const MAX_SCHEDULER_HOUR_TIMEZONE_DIAGNOSTICS = 25;
const reportedSchedulerHourTimeZoneFailures = new Set<string>();

function logSchedulerHourTimeZoneFallback(error: unknown, timeZone: string, targetLocalHour: number): void {
    const failureKey = `${timeZone.length}:${targetLocalHour}`;
    if (reportedSchedulerHourTimeZoneFailures.has(failureKey)) return;
    if (reportedSchedulerHourTimeZoneFailures.size >= MAX_SCHEDULER_HOUR_TIMEZONE_DIAGNOSTICS) return;
    reportedSchedulerHourTimeZoneFailures.add(failureKey);

    analyticsLogger.warn('[SchedulerHour] Timezone validation failed, using UTC settlement hour', {
        failureCode: 'SCHEDULER_HOUR_TIMEZONE_VALIDATION_FAILED',
        timeZone: getAnalyticsIdContext(timeZone),
        fallbackPolicy: 'use_utc_settlement_hour',
        hasIntl: typeof Intl !== 'undefined',
        targetLocalHour,
        error: getAnalyticsErrorContext(error),
    });
}

function isSchedulerTimeZoneValid(timeZone: string, targetLocalHour: number): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
        return true;
    } catch (error) {
        logSchedulerHourTimeZoneFallback(error, timeZone, targetLocalHour);
        return false;
    }
}

/**
 * Compute the UTC hour that corresponds to businessDayEndTime + buffer in the
 * given timezone. Missing/invalid timezone is treated as UTC.
 */
export function computeSchedulerHour(timeZone?: string, businessDayEndTime?: string): number {
    const targetLocalHour = Math.floor(getAnalyticsSettlementLocalMinutes(businessDayEndTime) / 60);
    const fallbackHour = targetLocalHour;
    if (!timeZone) return fallbackHour;
    if (!isSchedulerTimeZoneValid(timeZone, targetLocalHour)) return fallbackHour;

    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = now.getDate();

        for (let utcHour = 0; utcHour < 24; utcHour++) {
            const testDate = new Date(Date.UTC(year, month, day, utcHour, 30));
            const localHour = getLocalHour(testDate, timeZone);
            if (localHour === targetLocalHour) return utcHour;
        }

        for (let utcHour = 0; utcHour < 24; utcHour++) {
            const testDate = new Date(Date.UTC(year, month, day, utcHour, 0));
            const localHour = getLocalHour(testDate, timeZone);
            if (localHour === targetLocalHour) return utcHour;
        }

        return fallbackHour;
    } catch (error) {
        logSchedulerHourTimeZoneFallback(error, timeZone, targetLocalHour);
        return fallbackHour;
    }
}

function getLocalHour(date: Date, timeZone: string): number {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour: 'numeric',
            hour12: false,
        });
        const parts = formatter.formatToParts(date);
        const hourPart = parts.find(p => p.type === 'hour');
        return hourPart ? parseInt(hourPart.value, 10) : -1;
    } catch {
        return -1;
    }
}
