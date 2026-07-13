import type {
    CampaignsSummaryDocument,
    CampaignType,
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

export function getCampaignTodayState(
    summary: Partial<CampaignsSummaryDocument> | null,
    date: string,
): CampaignTodayState {
    return summary?.today?.date === date
        ? summary.today
        : emptyToday(date);
}

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
    summary: Partial<CampaignsSummaryDocument> | null,
    date: string,
    campaignId: string,
): CampaignActionState {
    const currentStats = summary?.stats || emptyStats();
    const today = removeCampaignFromToday(getCampaignTodayState(summary, date), campaignId);

    return {
        today,
        stats: {
            ...currentStats,
            totalCompleted: (currentStats.totalCompleted || 0) + 1,
            totalSkipped: currentStats.totalSkipped || 0,
            lastCampaignDate: date,
            typeSkipCounts: currentStats.typeSkipCounts || {},
        },
    };
}

export function buildCampaignSkipState(
    summary: Partial<CampaignsSummaryDocument> | null,
    date: string,
    campaignId: string,
    campaignType: CampaignType,
): CampaignActionState {
    const currentStats = summary?.stats || emptyStats();
    const currentTypeSkipCounts = currentStats.typeSkipCounts || {};
    const today = removeCampaignFromToday(getCampaignTodayState(summary, date), campaignId);

    return {
        today,
        stats: {
            ...currentStats,
            totalCompleted: currentStats.totalCompleted || 0,
            totalSkipped: (currentStats.totalSkipped || 0) + 1,
            lastCampaignDate: date,
            typeSkipCounts: {
                ...currentTypeSkipCounts,
                [campaignType]: (currentTypeSkipCounts[campaignType] || 0) + 1,
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
