export const MENU_DRIFT_SUMMARY_MAX_ITEMS = 1000;
export const MENU_DRIFT_ITEM_ID_MAX_LENGTH = 180;

export interface MenuDriftSummaryContribution {
    itemId: string;
    priceChanges: number;
    availabilityChanges: number;
}

export interface PriceStaleAssessment {
    value: boolean | null;
    status: 'measured' | 'unavailable_outside_rolling_window';
}

type DriftKind = 'price' | 'availability';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    value !== null && typeof value === 'object' && !Array.isArray(value)
);

const isValidItemId = (value: unknown): value is string => (
    typeof value === 'string'
    && value.length > 0
    && value.length <= MENU_DRIFT_ITEM_ID_MAX_LENGTH
    && value.trim() === value
    && !value.includes('/')
    && value !== '.'
    && value !== '..'
);

const getSingleChangeCount = (value: unknown): 0 | 1 | null => (
    value === 0 || value === 1 ? value : null
);

const getDetailedDriftKind = (value: Record<string, unknown>): DriftKind | null => {
    if (value.changeType === 'PRICE') return 'price';
    if (value.changeType === 'AVAILABILITY') return 'availability';
    if (value.changeType !== 'EXTRACTION_CORRECTION' || !isRecord(value.oldValue)) {
        return null;
    }
    return value.oldValue.field === 'price' ? 'price' : null;
};

export const addMenuDriftSummaryContribution = (
    contributions: MenuDriftSummaryContribution[],
    itemId: string,
    kind: DriftKind,
): boolean => {
    if (!isValidItemId(itemId)) return false;

    const existing = contributions.find(contribution => contribution.itemId === itemId);
    if (existing) {
        if (kind === 'price') existing.priceChanges = 1;
        else existing.availabilityChanges = 1;
        return true;
    }

    if (contributions.length >= MENU_DRIFT_SUMMARY_MAX_ITEMS) return false;
    contributions.push({
        itemId,
        priceChanges: kind === 'price' ? 1 : 0,
        availabilityChanges: kind === 'availability' ? 1 : 0,
    });
    return true;
};

export const readMenuDriftContributions = (
    value: unknown,
): MenuDriftSummaryContribution[] => {
    if (!isRecord(value)) return [];

    const detailedKind = getDetailedDriftKind(value);
    if (detailedKind && isValidItemId(value.itemId)) {
        return [{
            itemId: value.itemId,
            priceChanges: detailedKind === 'price' ? 1 : 0,
            availabilityChanges: detailedKind === 'availability' ? 1 : 0,
        }];
    }

    if (value.changeType !== 'MENU_REVISION_SUMMARY' || !isRecord(value.newValue)) {
        return [];
    }

    const rawContributions = value.newValue.itemDriftChanges;
    if (!Array.isArray(rawContributions)
        || rawContributions.length > MENU_DRIFT_SUMMARY_MAX_ITEMS) {
        return [];
    }

    // A revision can change each field at most once per item. Merge duplicate
    // item entries with max semantics so malformed payloads cannot inflate
    // nightly counters.
    const normalized = new Map<string, MenuDriftSummaryContribution>();
    for (const rawContribution of rawContributions) {
        if (!isRecord(rawContribution) || !isValidItemId(rawContribution.itemId)) continue;
        const priceChanges = getSingleChangeCount(rawContribution.priceChanges);
        const availabilityChanges = getSingleChangeCount(rawContribution.availabilityChanges);
        if (priceChanges === null
            || availabilityChanges === null
            || (priceChanges === 0 && availabilityChanges === 0)) {
            continue;
        }

        const existing = normalized.get(rawContribution.itemId);
        normalized.set(rawContribution.itemId, {
            itemId: rawContribution.itemId,
            priceChanges: Math.max(existing?.priceChanges ?? 0, priceChanges),
            availabilityChanges: Math.max(
                existing?.availabilityChanges ?? 0,
                availabilityChanges,
            ),
        });
    }
    return Array.from(normalized.values());
};

export const getPriceStaleAssessment = (
    daysSinceLastPriceChange: number | null,
    staleThresholdDays: number,
): PriceStaleAssessment => {
    if (daysSinceLastPriceChange === null
        || !Number.isSafeInteger(daysSinceLastPriceChange)
        || daysSinceLastPriceChange < 0
        || !Number.isSafeInteger(staleThresholdDays)
        || staleThresholdDays <= 0) {
        return {
            value: null,
            status: 'unavailable_outside_rolling_window',
        };
    }
    return {
        value: daysSinceLastPriceChange > staleThresholdDays,
        status: 'measured',
    };
};
