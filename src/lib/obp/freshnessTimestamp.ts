const getFiniteTimestampDate = (milliseconds: number): Date | null => {
    if (!Number.isFinite(milliseconds)) return null;
    const date = new Date(milliseconds);
    return Number.isFinite(date.getTime()) ? date : null;
};

/**
 * Normalizes every timestamp representation admitted by persisted Store data
 * without trusting callable or scalar properties on legacy objects.
 */
export function normalizeOBPFreshnessDate(value: unknown): Date | null {
    try {
        if (value instanceof Date) {
            return getFiniteTimestampDate(value.getTime());
        }
        if (typeof value === 'string') {
            return getFiniteTimestampDate(Date.parse(value));
        }
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }

        const toDate = Reflect.get(value, 'toDate');
        if (typeof toDate === 'function') {
            const converted = toDate.call(value);
            return converted instanceof Date
                ? getFiniteTimestampDate(converted.getTime())
                : null;
        }

        const seconds = Reflect.get(value, 'seconds') ?? Reflect.get(value, '_seconds');
        const nanoseconds = Reflect.get(value, 'nanoseconds') ?? Reflect.get(value, '_nanoseconds') ?? 0;
        if (
            typeof seconds !== 'number'
            || !Number.isFinite(seconds)
            || typeof nanoseconds !== 'number'
            || !Number.isFinite(nanoseconds)
            || nanoseconds < 0
            || nanoseconds >= 1_000_000_000
        ) {
            return null;
        }

        return getFiniteTimestampDate(
            (seconds * 1000) + Math.floor(nanoseconds / 1_000_000),
        );
    } catch {
        return null;
    }
}
