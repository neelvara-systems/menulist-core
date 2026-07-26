import type { DigitalScreenState } from "@type/campaigns";

export type DigitalScreenSeenTimestamp = DigitalScreenState["screenLastSeenAt"] | null;

const validDateOrNull = (value: unknown): Date | null => (
    value instanceof Date && !Number.isNaN(value.getTime()) ? value : null
);

export function screenTimestampToDate(value: unknown): Date | null {
    if (value === undefined || value === null) return null;
    if (value instanceof Date) return validDateOrNull(value);

    if (typeof value === "object" && !Array.isArray(value)) {
        const timestamp = value as {
            _seconds?: unknown;
            seconds?: unknown;
            toDate?: unknown;
            toMillis?: unknown;
        };
        try {
            if (typeof timestamp.toDate === "function") {
                return validDateOrNull(timestamp.toDate());
            }
            if (typeof timestamp.toMillis === "function") {
                const milliseconds = timestamp.toMillis();
                return typeof milliseconds === "number" && Number.isFinite(milliseconds)
                    ? validDateOrNull(new Date(milliseconds))
                    : null;
            }
        } catch {
            return null;
        }

        const seconds = timestamp.seconds ?? timestamp._seconds;
        return typeof seconds === "number" && Number.isFinite(seconds)
            ? validDateOrNull(new Date(seconds * 1000))
            : null;
    }

    if (
        (typeof value === "number" && Number.isFinite(value))
        || (typeof value === "string" && value.length > 0 && value.trim() === value)
    ) {
        return validDateOrNull(new Date(value));
    }

    return null;
}

export const screenTimestampToMillis = (value: unknown): number | null => (
    screenTimestampToDate(value)?.getTime() ?? null
);

export function isScreenExpiryValueExpired(
    value: unknown,
    nowMilliseconds = Date.now(),
): boolean {
    if (value === undefined || value === null) return false;
    const expiryMilliseconds = screenTimestampToMillis(value);
    return expiryMilliseconds === null || expiryMilliseconds < nowMilliseconds;
}
