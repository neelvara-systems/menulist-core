import type {
    CampaignsSummaryDocument,
    CampaignKind,
    CampaignStatus,
    CampaignType,
    ExecutionSurface,
    OutputIntent,
    TodayCampaignSummary,
} from '@type/campaigns';

export type CampaignTodayState = CampaignsSummaryDocument['today'];
export type CampaignStatsState = CampaignsSummaryDocument['stats'];

export type CampaignActionState = {
    stats: CampaignStatsState;
    today: CampaignTodayState;
};

const emptyStats = (): CampaignStatsState => ({
    totalCompleted: 0,
    totalSkipped: 0,
    typeSkipCounts: {},
});

const emptyToday = (date: string): CampaignTodayState => ({
    date,
    primary: undefined,
    operational: [],
    isEmpty: true,
});

const CAMPAIGN_TYPE_VALUES: CampaignType[] = [
    'meal_push',
    'bestseller_boost',
    'slow_item_rescue',
    'festival',
    'new_item',
    'todays_special',
    'weekend_pick',
    'now_available',
    'menu_highlight',
];
const CAMPAIGN_TYPES = new Set<CampaignType>(CAMPAIGN_TYPE_VALUES);
const CAMPAIGN_KINDS = new Set<CampaignKind>(['active', 'passive']);
const CAMPAIGN_STATUSES = new Set<CampaignStatus>(['suggested', 'completed', 'skipped', 'suppressed']);
const OUTPUT_INTENTS = new Set<OutputIntent>([
    'broadcast_attention',
    'in_store_reinforcement',
    'direct_customer_notify',
]);
const EXECUTION_SURFACES = new Set<ExecutionSurface>([
    'whatsapp_status',
    'whatsapp_message',
    'print_poster',
    'qr_tent',
    'digital_screen',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

const isFiniteUnitNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
);

const isCalendarDate = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const isTodayCampaignSummary = (value: unknown): value is TodayCampaignSummary => {
    if (!isRecord(value) || !isRecord(value.subject)) return false;
    return isNonEmptyString(value.campaignId)
        && isNonEmptyString(value.projectId)
        && CAMPAIGN_TYPES.has(value.type as CampaignType)
        && CAMPAIGN_KINDS.has(value.kind as CampaignKind)
        && OUTPUT_INTENTS.has(value.intent as OutputIntent)
        && EXECUTION_SURFACES.has(value.primarySurface as ExecutionSurface)
        && CAMPAIGN_STATUSES.has(value.status as CampaignStatus)
        && isFiniteUnitNumber(value.confidence)
        && (
            value.subject.itemId === undefined
            || typeof value.subject.itemId === 'string'
        )
        && (
            value.subject.itemName === undefined
            || typeof value.subject.itemName === 'string'
        )
        && (
            value.subject.itemImageUrl === undefined
            || typeof value.subject.itemImageUrl === 'string'
        );
};

const normalizeNonNegativeInteger = (value: unknown): number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
        ? value
        : 0
);

export function getCampaignStatsState(summary: unknown): CampaignStatsState {
    if (!isRecord(summary) || !isRecord(summary.stats)) return emptyStats();

    const typeSkipCounts: Partial<Record<CampaignType, number>> = {};
    if (isRecord(summary.stats.typeSkipCounts)) {
        for (const campaignType of CAMPAIGN_TYPE_VALUES) {
            const count = summary.stats.typeSkipCounts[campaignType];
            if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0) {
                typeSkipCounts[campaignType] = count;
            }
        }
    }

    return {
        totalCompleted: normalizeNonNegativeInteger(summary.stats.totalCompleted),
        totalSkipped: normalizeNonNegativeInteger(summary.stats.totalSkipped),
        ...(isCalendarDate(summary.stats.lastCampaignDate)
            ? { lastCampaignDate: summary.stats.lastCampaignDate }
            : {}),
        typeSkipCounts,
    };
}

export function getCampaignTodayState(
    summary: unknown,
    date: string,
): CampaignTodayState {
    if (!isRecord(summary) || !isRecord(summary.today) || summary.today.date !== date) {
        return emptyToday(date);
    }

    const primary = isTodayCampaignSummary(summary.today.primary)
        ? summary.today.primary
        : undefined;
    const operational = Array.isArray(summary.today.operational)
        ? summary.today.operational.filter(isTodayCampaignSummary)
        : [];

    return {
        date,
        primary,
        operational,
        isEmpty: !primary && operational.length === 0,
    };
}

export const isCampaignTodayState = (value: unknown): value is CampaignTodayState => {
    if (!isRecord(value) || !isNonEmptyString(value.date) || !Array.isArray(value.operational)) {
        return false;
    }
    return (value.primary === undefined || value.primary === null || isTodayCampaignSummary(value.primary))
        && value.operational.every(isTodayCampaignSummary)
        && typeof value.isEmpty === 'boolean'
        && value.isEmpty === (!value.primary && value.operational.length === 0);
};

export function removeCampaignFromToday(
    currentToday: CampaignTodayState,
    campaignId: string,
): CampaignTodayState {
    const primary = currentToday.primary?.campaignId === campaignId
        ? undefined
        : currentToday.primary;
    const operational = (currentToday.operational || []).filter(
        (campaign) => campaign.campaignId !== campaignId,
    );

    return {
        date: currentToday.date,
        primary,
        operational,
        isEmpty: !primary && operational.length === 0,
    };
}

export function buildCampaignCompletionState(
    summary: unknown,
    date: string,
    campaignId: string,
): CampaignActionState {
    const currentStats = getCampaignStatsState(summary);
    const today = removeCampaignFromToday(getCampaignTodayState(summary, date), campaignId);

    return {
        today,
        stats: {
            ...currentStats,
            totalCompleted: currentStats.totalCompleted + 1,
            totalSkipped: currentStats.totalSkipped,
            lastCampaignDate: date,
            typeSkipCounts: currentStats.typeSkipCounts || {},
        },
    };
}

export function buildCampaignSkipState(
    summary: unknown,
    date: string,
    campaignId: string,
    campaignType: CampaignType,
): CampaignActionState {
    const currentStats = getCampaignStatsState(summary);
    const currentTypeSkipCounts = currentStats.typeSkipCounts;
    const today = removeCampaignFromToday(getCampaignTodayState(summary, date), campaignId);

    return {
        today,
        stats: {
            ...currentStats,
            totalCompleted: currentStats.totalCompleted,
            totalSkipped: currentStats.totalSkipped + 1,
            lastCampaignDate: date,
            typeSkipCounts: {
                ...currentTypeSkipCounts,
                [campaignType]: (currentTypeSkipCounts[campaignType] ?? 0) + 1,
            },
        },
    };
}

export function campaignTodayContains(
    today: CampaignTodayState,
    campaignId: string,
): boolean {
    return today.primary?.campaignId === campaignId
        || today.operational.some((campaign) => campaign.campaignId === campaignId);
}
