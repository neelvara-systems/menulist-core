import { CAMPAIGNCUE_CHANNELS } from "@constant/campaigncue/channels";
import {
    CAMPAIGNCUE_CAMPAIGN_MEMORY_MAX_COUNTER,
    CAMPAIGNCUE_CAMPAIGN_MEMORY_MAX_RECIPE_SIGNALS,
    CAMPAIGNCUE_CAMPAIGN_MEMORY_METRIC_KEYS,
    CAMPAIGNCUE_CAMPAIGN_MEMORY_NEGATIVE_SIGNAL_ID,
    CAMPAIGNCUE_CAMPAIGN_MEMORY_NOT_USED_SIGNAL_ID,
    CAMPAIGNCUE_CAMPAIGN_MEMORY_SCHEMA_VERSION,
} from "@constant/campaigncue/campaignMemory";
import { CAMPAIGNCUE_DAILY_DESK_RECIPES } from "@constant/campaigncue/dailyDesk";
import type {
    CampaignCueAnalyticsSummary,
    CampaignCueCampaign,
    CampaignCueCampaignMemoryConfidence,
    CampaignCueCampaignMemorySignal,
    CampaignCueCampaignMemorySummary,
    CampaignCueCampaignMemoryView,
    CampaignCueChannel,
    CampaignCueResultMetrics,
} from "@type/campaigncue";

const boundedCount = (value: unknown) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return 0;
    return Math.min(CAMPAIGNCUE_CAMPAIGN_MEMORY_MAX_COUNTER, Math.max(0, Math.trunc(value)));
};

const addCount = (left: unknown, right: unknown) => boundedCount(boundedCount(left) + boundedCount(right));

const toEpoch = (value: unknown) => {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    if (typeof value === "string" || typeof value === "number") {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }
    if (value && typeof value === "object" && typeof (value as { toDate?: unknown }).toDate === "function") {
        const date = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }
    return 0;
};

const normalizeMetrics = (metrics?: CampaignCueResultMetrics): CampaignCueResultMetrics => {
    const normalized: CampaignCueResultMetrics = {};
    CAMPAIGNCUE_CAMPAIGN_MEMORY_METRIC_KEYS.forEach((key) => {
        const value = boundedCount(metrics?.[key]);
        if (value > 0) normalized[key] = value;
    });
    return normalized;
};

const addMetrics = (left?: CampaignCueResultMetrics, right?: CampaignCueResultMetrics) => {
    const combined: CampaignCueResultMetrics = {};
    CAMPAIGNCUE_CAMPAIGN_MEMORY_METRIC_KEYS.forEach((key) => {
        const value = addCount(left?.[key], right?.[key]);
        if (value > 0) combined[key] = value;
    });
    return combined;
};

export const campaignCueCampaignMemoryMetricTotal = (metrics?: CampaignCueResultMetrics) => (
    CAMPAIGNCUE_CAMPAIGN_MEMORY_METRIC_KEYS.reduce((total, key) => addCount(total, metrics?.[key]), 0)
);

export function getCampaignCueCampaignMemoryConfidence(
    usefulCount: number,
    notUsefulCount: number,
): CampaignCueCampaignMemoryConfidence {
    const useful = boundedCount(usefulCount);
    const notUseful = boundedCount(notUsefulCount);
    const evaluated = addCount(useful, notUseful);
    if (evaluated < 2) return "not_enough_results";
    const dominant = Math.max(useful, notUseful);
    if (dominant >= 3 && dominant / evaluated >= 0.75) return "repeated_signal";
    return "early_signal";
}

export const campaignCueResultSignalKind = (signalId: string) => {
    if (signalId === CAMPAIGNCUE_CAMPAIGN_MEMORY_NOT_USED_SIGNAL_ID) return "not_used" as const;
    if (signalId === CAMPAIGNCUE_CAMPAIGN_MEMORY_NEGATIVE_SIGNAL_ID) return "not_useful" as const;
    return "useful" as const;
};

export const campaignCueResultSignalIdsForRecipe = (recipeId?: string) => {
    if (!recipeId) return new Set<string>();
    const recipe = CAMPAIGNCUE_DAILY_DESK_RECIPES.find((candidate) => candidate.id === recipeId);
    return new Set((recipe?.resultOptions || []).map((option) => option.id));
};

export const isCampaignCueResultSignalAllowed = (signalId: string, recipeId?: string) => (
    campaignCueResultSignalIdsForRecipe(recipeId).has(signalId)
);

export const emptyCampaignCueCampaignMemorySummary = (
    coverage: CampaignCueCampaignMemorySummary["coverage"] = "from_activation",
): CampaignCueCampaignMemorySummary => ({
    schemaVersion: CAMPAIGNCUE_CAMPAIGN_MEMORY_SCHEMA_VERSION,
    sourceConfidence: "owner_reported",
    coverage,
    totalReceiptCount: 0,
    usefulCount: 0,
    notUsefulCount: 0,
    notUsedCount: 0,
    metrics: {},
    confidence: "not_enough_results",
    recipeSignals: [],
    channelSignals: [],
});

const signalSort = (left: CampaignCueCampaignMemorySignal, right: CampaignCueCampaignMemorySignal) => (
    right.sampleCount - left.sampleCount
    || Math.max(right.usefulCount, right.notUsefulCount) - Math.max(left.usefulCount, left.notUsefulCount)
    || campaignCueCampaignMemoryMetricTotal(right.metrics) - campaignCueCampaignMemoryMetricTotal(left.metrics)
    || toEpoch(right.lastRecordedAt) - toEpoch(left.lastRecordedAt)
    || left.key.localeCompare(right.key)
);

const updateSignals = (params: {
    campaignId: string;
    dimension: CampaignCueCampaignMemorySignal["dimension"];
    key?: string;
    metrics: CampaignCueResultMetrics;
    notUsedDelta: number;
    notUsefulDelta: number;
    recordedAt?: unknown;
    signalId?: string;
    signals: CampaignCueCampaignMemorySignal[];
    usefulDelta: number;
}) => {
    if (!params.key) return [...params.signals];
    const previous = params.signals.find((signal) => (
        signal.dimension === params.dimension && signal.key === params.key
    ));
    const usefulCount = addCount(previous?.usefulCount, params.usefulDelta);
    const notUsefulCount = addCount(previous?.notUsefulCount, params.notUsefulDelta);
    const notUsedCount = addCount(previous?.notUsedCount, params.notUsedDelta);
    const next: CampaignCueCampaignMemorySignal = {
        dimension: params.dimension,
        key: params.key,
        sampleCount: addCount(addCount(usefulCount, notUsefulCount), notUsedCount),
        usefulCount,
        notUsefulCount,
        notUsedCount,
        metrics: addMetrics(previous?.metrics, params.metrics),
        confidence: getCampaignCueCampaignMemoryConfidence(usefulCount, notUsefulCount),
        lastCampaignId: params.campaignId,
        lastSignalId: params.signalId,
        lastRecordedAt: params.recordedAt,
    };
    const limit = params.dimension === "recipe"
        ? CAMPAIGNCUE_CAMPAIGN_MEMORY_MAX_RECIPE_SIGNALS
        : CAMPAIGNCUE_CHANNELS.length;
    return [
        ...params.signals.filter((signal) => !(
            signal.dimension === params.dimension && signal.key === params.key
        )),
        next,
    ].sort(signalSort).slice(0, limit);
};

export function applyCampaignCueCampaignMemoryResult(params: {
    campaignId: string;
    channel?: CampaignCueChannel;
    existing?: CampaignCueCampaignMemorySummary;
    metrics?: CampaignCueResultMetrics;
    recipeId?: string;
    recordedAt?: unknown;
    resultSignalId: string;
}): CampaignCueCampaignMemorySummary {
    const current = params.existing || emptyCampaignCueCampaignMemorySummary();
    const kind = campaignCueResultSignalKind(params.resultSignalId);
    const usefulDelta = kind === "useful" ? 1 : 0;
    const notUsefulDelta = kind === "not_useful" ? 1 : 0;
    const notUsedDelta = kind === "not_used" ? 1 : 0;
    const metrics = kind === "not_used" ? {} : normalizeMetrics(params.metrics);
    const usefulCount = addCount(current.usefulCount, usefulDelta);
    const notUsefulCount = addCount(current.notUsefulCount, notUsefulDelta);
    const notUsedCount = addCount(current.notUsedCount, notUsedDelta);

    return {
        schemaVersion: CAMPAIGNCUE_CAMPAIGN_MEMORY_SCHEMA_VERSION,
        sourceConfidence: "owner_reported",
        coverage: current.coverage,
        totalReceiptCount: addCount(current.totalReceiptCount, 1),
        usefulCount,
        notUsefulCount,
        notUsedCount,
        metrics: addMetrics(current.metrics, metrics),
        confidence: getCampaignCueCampaignMemoryConfidence(usefulCount, notUsefulCount),
        recipeSignals: updateSignals({
            campaignId: params.campaignId,
            dimension: "recipe",
            key: params.recipeId,
            metrics,
            notUsedDelta,
            notUsefulDelta,
            recordedAt: params.recordedAt,
            signalId: params.resultSignalId,
            signals: current.recipeSignals,
            usefulDelta,
        }),
        channelSignals: updateSignals({
            campaignId: params.campaignId,
            dimension: "channel",
            key: params.channel,
            metrics,
            notUsedDelta,
            notUsefulDelta,
            recordedAt: params.recordedAt,
            signalId: params.resultSignalId,
            signals: current.channelSignals,
            usefulDelta,
        }),
        lastCampaignId: params.campaignId,
        lastSignalId: params.resultSignalId,
        lastRecordedAt: params.recordedAt,
    };
}

const campaignRecipeId = (campaign: CampaignCueCampaign) => (
    campaign.pack?.recipeId || campaign.pack?.decision?.recipeId
);

export function buildCampaignCueRecentCampaignMemory(
    campaigns: CampaignCueCampaign[],
): CampaignCueCampaignMemorySummary {
    let summary = emptyCampaignCueCampaignMemorySummary("bounded_recent_campaigns");
    campaigns.forEach((campaign) => {
        const usefulCount = boundedCount(campaign.resultMemory?.usefulCount);
        const notUsefulCount = boundedCount(campaign.resultMemory?.notUsefulCount);
        const lastSignalId = campaign.resultMemory?.lastSignalId;
        const notUsedCount = lastSignalId === CAMPAIGNCUE_CAMPAIGN_MEMORY_NOT_USED_SIGNAL_ID ? 1 : 0;
        const total = addCount(addCount(usefulCount, notUsefulCount), notUsedCount);
        if (!total) return;
        const metrics = normalizeMetrics(campaign.resultMemory?.lastReceipt?.metrics);
        const recordedAt = campaign.resultMemory?.lastRecordedAt || campaign.updatedAt || campaign.createdAt;
        const recipeId = campaignRecipeId(campaign);
        const channel = campaign.resultMemory?.lastReceipt?.channel || campaign.channels[0];
        summary = {
            ...summary,
            totalReceiptCount: addCount(summary.totalReceiptCount, total),
            usefulCount: addCount(summary.usefulCount, usefulCount),
            notUsefulCount: addCount(summary.notUsefulCount, notUsefulCount),
            notUsedCount: addCount(summary.notUsedCount, notUsedCount),
            metrics: addMetrics(summary.metrics, metrics),
            recipeSignals: updateSignals({
                campaignId: campaign.id,
                dimension: "recipe",
                key: recipeId,
                metrics,
                notUsedDelta: notUsedCount,
                notUsefulDelta: notUsefulCount,
                recordedAt,
                signalId: lastSignalId,
                signals: summary.recipeSignals,
                usefulDelta: usefulCount,
            }),
            channelSignals: updateSignals({
                campaignId: campaign.id,
                dimension: "channel",
                key: channel,
                metrics,
                notUsedDelta: notUsedCount,
                notUsefulDelta: notUsefulCount,
                recordedAt,
                signalId: lastSignalId,
                signals: summary.channelSignals,
                usefulDelta: usefulCount,
            }),
        };
        if (toEpoch(recordedAt) >= toEpoch(summary.lastRecordedAt)) {
            summary.lastCampaignId = campaign.id;
            summary.lastSignalId = lastSignalId;
            summary.lastRecordedAt = recordedAt;
        }
    });
    return {
        ...summary,
        confidence: getCampaignCueCampaignMemoryConfidence(summary.usefulCount, summary.notUsefulCount),
    };
}

export const resolveCampaignCueCampaignMemorySummary = (params: {
    analytics: CampaignCueAnalyticsSummary;
    campaigns: CampaignCueCampaign[];
}) => params.analytics.campaignMemory || buildCampaignCueRecentCampaignMemory(params.campaigns);

const campaignActionTotal = (
    campaigns: CampaignCueCampaign[],
    actions: Array<keyof CampaignCueCampaign["actionCounts"]>,
) => campaigns.reduce((total, campaign) => (
    actions.reduce((campaignTotal, action) => addCount(campaignTotal, campaign.actionCounts[action]), total)
), 0);

export function buildCampaignCueVisibleCampaignAnalytics(params: {
    campaigns: CampaignCueCampaign[];
    workspaceId: string;
}): CampaignCueAnalyticsSummary {
    if (params.campaigns.some((campaign) => campaign.workspaceId !== params.workspaceId)) {
        throw new Error("CampaignCue visible analytics cannot cross workspace scope.");
    }
    const latestCampaign = params.campaigns.reduce<CampaignCueCampaign | undefined>((latest, campaign) => (
        !latest || toEpoch(campaign.updatedAt || campaign.createdAt) > toEpoch(latest.updatedAt || latest.createdAt)
            ? campaign
            : latest
    ), undefined);
    const earliestCampaign = params.campaigns.reduce<CampaignCueCampaign | undefined>((earliest, campaign) => (
        !earliest || toEpoch(campaign.createdAt) < toEpoch(earliest.createdAt)
            ? campaign
            : earliest
    ), undefined);

    return {
        id: "dashboard",
        workspaceId: params.workspaceId,
        campaignCount: boundedCount(params.campaigns.length),
        usedCount: campaignActionTotal(params.campaigns, ["mark_used"]),
        exportCount: campaignActionTotal(params.campaigns, ["download", "export", "archive_export"]),
        approvalRequestCount: campaignActionTotal(params.campaigns, ["request_approval"]),
        manualFallbackCount: 0,
        ownerReportedOutcomeCount: campaignActionTotal(params.campaigns, ["record_outcome"]),
        latestEventAt: latestCampaign?.updatedAt || latestCampaign?.createdAt || null,
        confidence: "estimated",
        campaignMemory: buildCampaignCueRecentCampaignMemory(params.campaigns),
        createdAt: earliestCampaign?.createdAt,
        updatedAt: latestCampaign?.updatedAt || latestCampaign?.createdAt,
    };
}

export const findCampaignCueRecipeMemorySignal = (
    summary: CampaignCueCampaignMemorySummary | undefined,
    recipeId: string,
) => summary?.recipeSignals.find((signal) => signal.key === recipeId);

export function buildCampaignCueCampaignMemoryView(
    summary: CampaignCueCampaignMemorySummary,
): CampaignCueCampaignMemoryView {
    const topRecipe = [...summary.recipeSignals].sort(signalSort)[0];
    const topChannel = [...summary.channelSignals].sort(signalSort)[0];
    const evaluableCount = addCount(summary.usefulCount, summary.notUsefulCount);
    const negativeLeads = summary.notUsefulCount > summary.usefulCount;
    const status = !summary.totalReceiptCount
        ? "empty"
        : negativeLeads
            ? "review"
            : summary.confidence === "repeated_signal" && summary.usefulCount > summary.notUsefulCount
                ? "usable"
                : "learning";
    const ownerSummary = status === "empty"
        ? "No campaign result has been recorded yet."
        : status === "review"
            ? "Owner-reported results suggest reviewing the campaign before repeating it."
            : status === "usable"
                ? "Several owner-reported results point to a campaign pattern worth rebuilding from current facts."
                : `${summary.totalReceiptCount} owner-reported result${summary.totalReceiptCount === 1 ? " is" : "s are"} available, but the evidence is still early or mixed.`;
    const cautions = [
        "Owner-reported results are directional and do not prove attribution or revenue.",
        summary.coverage === "bounded_recent_campaigns"
            ? "This view uses only the bounded recent campaigns currently loaded."
            : "This summary covers results recorded after Campaign Memory was activated.",
        evaluableCount === 0 && summary.notUsedCount > 0
            ? "Prepared but unused packs do not show whether a campaign was useful."
            : undefined,
    ].filter(Boolean) as string[];
    const nextAction = status === "empty"
        ? "Use a campaign, then record one real result."
        : status === "review"
            ? "Review the offer, channel, photo, or timing and change only one thing next."
            : status === "usable"
                ? "Rebuild the useful recipe from current checked facts before using it again."
                : "Record another result or run one small one-variable test.";
    return {
        status,
        confidence: summary.confidence,
        coverage: summary.coverage,
        ownerSummary,
        sourceLabel: "Owner-reported results",
        topRecipe,
        topChannel,
        cautions,
        nextAction,
        costPolicy: {
            firestoreReads: 0,
            firestoreWrites: 0,
            providerCalls: 0,
            summary: "Derived from the dashboard summary or already-loaded bounded campaigns.",
        },
    };
}
