type TimestampLike = {
    seconds?: unknown;
    toDate?: unknown;
    toMillis?: unknown;
};

export function isValidBillingPeriodKey(value: unknown): value is number {
    if (!Number.isSafeInteger(value)) return false;
    const period = Number(value);
    const year = Math.floor(period / 100);
    const month = period % 100;
    return year >= 2_000 && year <= 9_999 && month >= 1 && month <= 12;
}

function normalizeDate(value: unknown): Date | null {
    try {
        if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
        if (!value || typeof value !== 'object') return null;
        const source = value as TimestampLike;
        if (typeof source.toDate === 'function') {
            const date = source.toDate.call(value);
            return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
        }
        if (typeof source.toMillis === 'function') {
            const millis = Number(source.toMillis.call(value));
            const date = new Date(millis);
            return Number.isFinite(date.getTime()) ? date : null;
        }
        const seconds = Number(source.seconds);
        if (!Number.isFinite(seconds) || seconds <= 0) return null;
        const date = new Date(seconds * 1_000);
        return Number.isFinite(date.getTime()) ? date : null;
    } catch {
        return null;
    }
}

/**
 * Resolve the active YYYYMM billing-period key using the subscription anchor
 * day. The reference date is injectable so webhook/provider tests do not depend
 * on wall-clock time.
 */
export function getBillingPeriodKey(
    cycleStartDate: unknown,
    referenceDate: Date = new Date(),
): number | null {
    const start = normalizeDate(cycleStartDate);
    if (!start || !Number.isFinite(referenceDate.getTime())) return null;

    let year = referenceDate.getUTCFullYear();
    let month = referenceDate.getUTCMonth() + 1;
    const daysInCurrentMonth = new Date(Date.UTC(year, referenceDate.getUTCMonth() + 1, 0)).getUTCDate();
    const anchorDay = Math.min(start.getUTCDate(), daysInCurrentMonth);
    if (referenceDate.getUTCDate() < anchorDay) {
        month -= 1;
        if (month === 0) {
            month = 12;
            year -= 1;
        }
    }
    return (year * 100) + month;
}

/** The provider's `current_start` is the exact beginning of the paid cycle. */
export function getProviderCycleBillingPeriodKey(currentStartSeconds: unknown): number | null {
    if (typeof currentStartSeconds !== 'number' || !Number.isSafeInteger(currentStartSeconds) || currentStartSeconds <= 0) {
        return null;
    }
    const seconds = currentStartSeconds;
    const start = new Date(seconds * 1_000);
    if (!Number.isFinite(start.getTime())) return null;
    return (start.getUTCFullYear() * 100) + (start.getUTCMonth() + 1);
}
