type SpecialMenuSummary = {
    active?: boolean;
    deleted?: boolean;
    isSpecialMenu?: boolean;
    specialMenuEndsAt?: unknown;
    specialMenuStartsAt?: unknown;
    specialMenuStatus?: unknown;
};

const ACTIVE_SPECIAL_MENU_STATUSES = new Set(['active', 'scheduled']);

function parseScheduleTime(value: unknown): number | null {
    if (typeof value !== 'string' || value.length > 64) return null;
    const millis = Date.parse(value);
    return Number.isFinite(millis) ? millis : null;
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
            || !ACTIVE_SPECIAL_MENU_STATUSES.has(String(project.specialMenuStatus || ''))
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
