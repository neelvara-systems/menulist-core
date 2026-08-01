type SpecialMenuSummary = {
    active?: boolean;
    deleted?: boolean;
    isSpecialMenu?: boolean;
    specialMenuEndsAt?: unknown;
    specialMenuStartsAt?: unknown;
    specialMenuStatus?: unknown;
};

const ACTIVE_SPECIAL_MENU_STATUSES = new Set(['active', 'scheduled']);
const ISO_INSTANT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;

export function normalizeSpecialMenuInstant(value: unknown): string | null {
    if (typeof value !== 'string' || value.length > 64 || value !== value.trim()) return null;
    const match = value.match(ISO_INSTANT_PATTERN);
    if (!match) return null;
    const [, year, month, day, hour, minute, second, fraction = '', zone] = match;
    if (!year || !month || !day || !hour || !minute || !second || !zone) return null;
    const parts = [year, month, day, hour, minute, second].map(Number);
    const [yearNumber, monthNumber, dayNumber, hourNumber, minuteNumber, secondNumber] = parts;
    const millisecondNumber = Number(fraction.padEnd(3, '0'));
    const local = new Date(0);
    local.setUTCFullYear(yearNumber, monthNumber - 1, dayNumber);
    local.setUTCHours(hourNumber, minuteNumber, secondNumber, millisecondNumber);
    if (
        local.getUTCFullYear() !== yearNumber
        || local.getUTCMonth() !== monthNumber - 1
        || local.getUTCDate() !== dayNumber
        || local.getUTCHours() !== hourNumber
        || local.getUTCMinutes() !== minuteNumber
        || local.getUTCSeconds() !== secondNumber
        || local.getUTCMilliseconds() !== millisecondNumber
    ) {
        return null;
    }
    if (zone !== 'Z') {
        const offsetHour = Number(zone.slice(1, 3));
        const offsetMinute = Number(zone.slice(4, 6));
        if (offsetHour > 23 || offsetMinute > 59) return null;
    }
    const millis = Date.parse(value);
    return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
}

export function normalizeSpecialMenuScheduleRange(
    startsAt: unknown,
    endsAt: unknown,
): {
    endTime: number;
    endsAt: string;
    startTime: number;
    startsAt: string;
} | null {
    const normalizedStartsAt = normalizeSpecialMenuInstant(startsAt);
    const normalizedEndsAt = normalizeSpecialMenuInstant(endsAt);
    if (!normalizedStartsAt || !normalizedEndsAt) return null;
    const startTime = Date.parse(normalizedStartsAt);
    const endTime = Date.parse(normalizedEndsAt);
    return endTime > startTime
        ? {
            endTime,
            endsAt: normalizedEndsAt,
            startTime,
            startsAt: normalizedStartsAt,
        }
        : null;
}

function parseScheduleTime(value: unknown): number | null {
    const normalized = normalizeSpecialMenuInstant(value);
    return normalized ? Date.parse(normalized) : null;
}

/**
 * Returns the earliest lifecycle boundary for a store's current special menus.
 * A past boundary is intentionally retained so the due-work query keeps retrying
 * a blocked or interrupted transition until the state is repaired.
 */
export function resolveNextSpecialMenuTransitionAt(
    projects: Record<string, unknown>,
): string | null {
    let nextMillis: number | null = null;

    for (const value of Object.values(projects)) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
        const project = value as SpecialMenuSummary;
        if (
            project.active === false
            || project.deleted === true
            || project.isSpecialMenu !== true
            || typeof project.specialMenuStatus !== 'string'
            || !ACTIVE_SPECIAL_MENU_STATUSES.has(project.specialMenuStatus)
        ) {
            continue;
        }

        const endsAt = parseScheduleTime(project.specialMenuEndsAt);
        if (endsAt !== null && (nextMillis === null || endsAt < nextMillis)) {
            nextMillis = endsAt;
        }

        if (project.specialMenuStatus === 'scheduled') {
            const startsAt = parseScheduleTime(project.specialMenuStartsAt);
            if (startsAt !== null && (nextMillis === null || startsAt < nextMillis)) {
                nextMillis = startsAt;
            }
        }
    }

    return nextMillis === null ? null : new Date(nextMillis).toISOString();
}
