export interface PublicMenuFreshness {
    dateModified?: string;
    lastPublishedAt?: string;
    menuVersion?: number;
}

const safeRead = (value: object, key: string): unknown => {
    try {
        return Reflect.get(value, key);
    } catch {
        return undefined;
    }
};

const copyFiniteDate = (value: unknown): Date | null => {
    if (!(value instanceof Date)) return null;

    try {
        const millis = Date.prototype.getTime.call(value);
        return Number.isFinite(millis) ? new Date(millis) : null;
    } catch {
        return null;
    }
};

const toFiniteDate = (value: unknown): Date | null => {
    if (value === null || value === undefined || value === '') return null;

    if (value instanceof Date) {
        return copyFiniteDate(value);
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return Number.isFinite(date.getTime()) ? date : null;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
        const toDate = safeRead(value, 'toDate');
        if (typeof toDate === 'function') {
            try {
                const date = Reflect.apply(toDate, value, []);
                const copiedDate = copyFiniteDate(date);
                if (copiedDate) return copiedDate;
            } catch {
                // Fall through to the legacy seconds representation.
            }
        }

        const seconds = safeRead(value, 'seconds') ?? safeRead(value, '_seconds');
        if (typeof seconds === 'number' && Number.isFinite(seconds)) {
            const date = new Date(seconds * 1000);
            return Number.isFinite(date.getTime()) ? date : null;
        }
    }

    return null;
};

export const toPublicIsoDate = (value: unknown): string | undefined =>
    toFiniteDate(value)?.toISOString();

const readRecordField = (value: unknown, key: string): unknown => (
    value && typeof value === 'object' && !Array.isArray(value)
        ? safeRead(value, key)
        : undefined
);

const normalizeMenuVersion = (value: unknown): number | undefined => {
    const menuVersion = typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim().length > 0
            ? Number(value)
            : Number.NaN;

    return Number.isSafeInteger(menuVersion) && menuVersion > 0 ? menuVersion : undefined;
};

export function getPublicMenuFreshness(projectData: unknown, storeData: unknown): PublicMenuFreshness {
    const lastPublishedAt = toPublicIsoDate(readRecordField(projectData, 'lastPublishedAt'));
    const storeModifiedAt =
        toPublicIsoDate(readRecordField(storeData, 'modifiedOn')) ||
        toPublicIsoDate(readRecordField(storeData, 'updatedAt'));
    const menuVersion = normalizeMenuVersion(readRecordField(projectData, 'menuVersion'));

    return {
        dateModified: lastPublishedAt || storeModifiedAt,
        lastPublishedAt,
        menuVersion,
    };
}
