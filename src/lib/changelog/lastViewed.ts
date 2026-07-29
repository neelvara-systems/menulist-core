export function parseChangelogLastViewedAt(
    value: string | null,
    now: number = Date.now(),
): number | null {
    if (
        value === null
        || !/^\d+$/.test(value)
        || !Number.isSafeInteger(now)
        || now <= 0
    ) {
        return null;
    }

    const parsed = Number(value);
    return Number.isSafeInteger(parsed)
        && parsed > 0
        && parsed <= now
        && String(parsed) === value
        ? parsed
        : null;
}
