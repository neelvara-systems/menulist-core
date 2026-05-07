export interface PublicMenuFreshness {
    dateModified?: string;
    lastPublishedAt?: string;
    menuVersion?: number;
}

const toFiniteDate = (value: unknown): Date | null => {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === 'object') {
        const maybeTimestamp = value as {
            toDate?: () => Date;
            seconds?: number;
            _seconds?: number;
        };

        if (typeof maybeTimestamp.toDate === 'function') {
            const date = maybeTimestamp.toDate();
            return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
        }

        const seconds = maybeTimestamp.seconds ?? maybeTimestamp._seconds;
        if (typeof seconds === 'number' && Number.isFinite(seconds)) {
            const date = new Date(seconds * 1000);
            return Number.isNaN(date.getTime()) ? null : date;
        }
    }

    return null;
};

export const toPublicIsoDate = (value: unknown): string | undefined =>
    toFiniteDate(value)?.toISOString();

export function getPublicMenuFreshness(projectData: any, storeData: any): PublicMenuFreshness {
    const lastPublishedAt = toPublicIsoDate(projectData?.lastPublishedAt);
    const storeModifiedAt =
        toPublicIsoDate(storeData?.modifiedOn) ||
        toPublicIsoDate(storeData?.updatedAt);
    const menuVersion = Number(projectData?.menuVersion);

    return {
        dateModified: lastPublishedAt || storeModifiedAt,
        lastPublishedAt,
        menuVersion: Number.isFinite(menuVersion) && menuVersion > 0 ? menuVersion : undefined,
    };
}

