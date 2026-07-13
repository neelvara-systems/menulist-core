import type { CampaignCueDailyDeskRecipe } from "@constant/campaigncue/dailyDesk";
import type {
    CampaignCueAsset,
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueCampaignRhythm,
    CampaignCueCommercialGate,
    CampaignCueCommercialPolicy,
    CampaignCueExperimentSuggestion,
    CampaignCueLanguagePolicy,
    CampaignCueOperatingPulse,
    CampaignCuePackFreshness,
    CampaignCuePresencePassportItem,
    CampaignCuePresenceProfile,
    CampaignCueSchedule,
    CampaignCueSourceInput,
    CampaignCueWorkspace,
} from "@type/campaigncue";

export const CAMPAIGNCUE_PACK_RECHECK_ACTIONS: CampaignCuePackFreshness["recheckActions"] = [
    "download",
    "export",
    "mark_used",
    "schedule",
];

const asRecord = (value: unknown): Record<string, unknown> => (
    value && typeof value === "object" ? value as Record<string, unknown> : {}
);

const compactString = (value: unknown) => typeof value === "string" ? value.trim() : "";

const compactList = (value: unknown, limit: number) => (
    Array.isArray(value)
        ? Array.from(new Set(value.map(compactString).filter(Boolean))).slice(0, limit)
        : []
);

const compactSortedList = (value: unknown, limit: number) => (
    compactList(value, limit).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }))
);

const optionalNumber = (value: unknown) => (
    typeof value === "number" && Number.isFinite(value) ? value : undefined
);

const toTime = (value: unknown) => {
    if (!value) return 0;
    const date = value instanceof Date
        ? value
        : typeof value === "string" || typeof value === "number"
            ? new Date(value)
            : typeof (value as { toDate?: unknown }).toDate === "function"
                ? (value as { toDate: () => Date }).toDate()
                : null;
    return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

export const normalizeCampaignCueOperatingPulse = (value: unknown): CampaignCueOperatingPulse => {
    const pulse = asRecord(value);
    const businessState = pulse.businessState;
    const capacityStatus = pulse.capacityStatus;
    const stockStatus = pulse.stockStatus;
    return {
        businessState: businessState === "quiet" || businessState === "busy" || businessState === "closed"
            ? businessState
            : "normal",
        capacityStatus: capacityStatus === "available" || capacityStatus === "limited" || capacityStatus === "full"
            ? capacityStatus
            : "unknown",
        stockStatus: stockStatus === "available" || stockStatus === "low" || stockStatus === "unavailable"
            ? stockStatus
            : "unknown",
        localMoment: compactString(pulse.localMoment) || undefined,
        note: compactString(pulse.note) || undefined,
        validUntil: pulse.validUntil || undefined,
        updatedAt: pulse.updatedAt || undefined,
    };
};

export const normalizeCampaignCueCommercialPolicy = (value: unknown): CampaignCueCommercialPolicy => {
    const policy = asRecord(value);
    return {
        promotionsAllowed: policy.promotionsAllowed !== false,
        discountsAllowed: policy.discountsAllowed !== false,
        discountApprovalRequired: policy.discountApprovalRequired !== false,
        maxDiscountPercent: optionalNumber(policy.maxDiscountPercent),
        minimumPromotedPrice: optionalNumber(policy.minimumPromotedPrice),
        currencyCode: /^[A-Z]{3}$/.test(compactString(policy.currencyCode).toUpperCase())
            ? compactString(policy.currencyCode).toUpperCase()
            : "INR",
        doNotPromote: compactSortedList(policy.doNotPromote, 20),
    };
};

export const normalizeCampaignCuePresenceProfile = (value: unknown): CampaignCuePresenceProfile => {
    const presence = asRecord(value);
    return {
        googleBusinessProfileUrl: compactString(presence.googleBusinessProfileUrl) || undefined,
        googleReviewUrl: compactString(presence.googleReviewUrl) || undefined,
        appleBusinessConnectUrl: compactString(presence.appleBusinessConnectUrl) || undefined,
        instagramUrl: compactString(presence.instagramUrl) || undefined,
        facebookUrl: compactString(presence.facebookUrl) || undefined,
        whatsappCatalogUrl: compactString(presence.whatsappCatalogUrl) || undefined,
    };
};

export const normalizeCampaignCueLanguagePolicy = (value: unknown, sourceLocale: string): CampaignCueLanguagePolicy => {
    const policy = asRecord(value);
    return {
        sourceLocale: compactString(sourceLocale) || compactString(policy.sourceLocale) || "en-US",
        targetLocales: compactSortedList(policy.targetLocales, 8),
        protectedFactReviewRequired: true,
    };
};

export const isCampaignCueOperatingPulseCurrent = (pulse: CampaignCueOperatingPulse, now = new Date()) => {
    const validUntil = toTime(pulse.validUntil);
    return !validUntil || validUntil >= now.getTime();
};

export const isCampaignCueSourceInputCurrent = (input: CampaignCueSourceInput, now = new Date()) => {
    if (input.status !== "active") return false;
    const expiresAt = toTime(input.expiresAt);
    return !expiresAt || expiresAt >= now.getTime();
};

export const isCampaignCueDecisionSourceInput = (input: CampaignCueSourceInput, now = new Date()) => (
    input.sourceType !== "inspiration_pattern" && isCampaignCueSourceInputCurrent(input, now)
);

const hasPromotionIntent = (recipe: CampaignCueDailyDeskRecipe) => ![
    "review_push",
    "asset_reuse",
    "local_visibility",
].includes(recipe.scenario);

const sourceText = (inputs: CampaignCueSourceInput[], now: Date) => inputs
    .filter((input) => isCampaignCueDecisionSourceInput(input, now))
    .map((input) => `${input.label} ${input.value}`)
    .join(" ")
    .toLowerCase();

const extractDiscountPercentages = (text: string) => Array.from(text.matchAll(/\b(\d{1,3}(?:\.\d+)?)\s*%/g))
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);

const extractExplicitPrices = (text: string) => {
    const values: number[] = [];
    const pattern = /(?:₹|rs\.?|inr|\$|usd|€|eur|£|gbp)\s*([0-9]+(?:[.,][0-9]{1,2})?)|price\s*[:=-]?\s*([0-9]+(?:[.,][0-9]{1,2})?)/gi;
    for (const match of Array.from(text.matchAll(pattern))) {
        const value = Number(String(match[1] || match[2] || "").replace(",", "."));
        if (Number.isFinite(value)) values.push(value);
    }
    return values;
};

export interface CampaignCueCommercialGateEvaluation extends CampaignCueCommercialGate {
    blockedFindings: string[];
    reviewFindings: string[];
}

export function evaluateCampaignCueCommercialGate(params: {
    businessBrain: CampaignCueBusinessBrain;
    recipe: CampaignCueDailyDeskRecipe;
    sourceInputs: CampaignCueSourceInput[];
    now?: Date;
}): CampaignCueCommercialGateEvaluation {
    const policy = normalizeCampaignCueCommercialPolicy(params.businessBrain.commercialPolicy);
    const pulse = normalizeCampaignCueOperatingPulse(params.businessBrain.operatingPulse);
    const now = params.now || new Date();
    const pulseCurrent = isCampaignCueOperatingPulseCurrent(pulse, now);
    const text = sourceText(params.sourceInputs, now);
    const blockedFindings: string[] = [];
    const reviewFindings: string[] = [];
    const promotional = hasPromotionIntent(params.recipe);

    if (!policy.promotionsAllowed && promotional) {
        blockedFindings.push("Promotional campaigns are paused in Business Brain.");
    }
    if (pulseCurrent && pulse.businessState === "closed" && promotional) {
        blockedFindings.push("The business is marked closed for this operating window.");
    }
    if (pulseCurrent && pulse.capacityStatus === "full" && promotional) {
        blockedFindings.push("Capacity is marked full, so a demand campaign should not be used now.");
    } else if (pulseCurrent && pulse.capacityStatus === "limited" && promotional) {
        reviewFindings.push("Capacity is limited. Confirm the pack will not create more demand than the business can handle.");
    }
    if (pulseCurrent && pulse.stockStatus === "unavailable" && ["sell_product", "bring_people_today"].includes(params.recipe.ownerGoal)) {
        blockedFindings.push("Stock or the promoted item is marked unavailable.");
    } else if (pulseCurrent && pulse.stockStatus === "low" && ["sell_product", "bring_people_today"].includes(params.recipe.ownerGoal)) {
        reviewFindings.push("Stock is low. Confirm availability before export or staff sharing.");
    }

    const discountPercentages = extractDiscountPercentages(text);
    const hasDiscountLanguage = discountPercentages.length > 0 || /\b(discount|off|save|sale)\b/.test(text);
    if (hasDiscountLanguage && !policy.discountsAllowed) {
        blockedFindings.push("Discount language is present, but discounts are disabled in the commercial policy.");
    }
    const excessiveDiscount = discountPercentages.find((value) => (
        policy.maxDiscountPercent != null && value > policy.maxDiscountPercent
    ));
    if (excessiveDiscount != null) {
        blockedFindings.push(`${excessiveDiscount}% exceeds the saved maximum discount of ${policy.maxDiscountPercent}%.`);
    } else if (hasDiscountLanguage && policy.discountApprovalRequired) {
        reviewFindings.push("The discount needs owner approval before public use.");
    }

    const explicitPrices = extractExplicitPrices(text);
    const belowFloor = explicitPrices.find((value) => (
        policy.minimumPromotedPrice != null && value < policy.minimumPromotedPrice
    ));
    if (belowFloor != null) {
        blockedFindings.push(`The explicit price ${belowFloor} is below the saved minimum promoted price of ${policy.minimumPromotedPrice} ${policy.currencyCode}.`);
    }

    const blockedItem = policy.doNotPromote.find((item) => text.includes(item.toLowerCase()));
    if (blockedItem) {
        blockedFindings.push(`${blockedItem} is on the do-not-promote list.`);
    }
    if (!pulseCurrent && pulse.validUntil) {
        reviewFindings.push("The owner pulse has expired. Confirm current stock, slots, or capacity.");
    }

    const status = blockedFindings.length ? "blocked" : reviewFindings.length ? "needs_review" : "ready";
    return {
        status,
        findings: [...blockedFindings, ...reviewFindings],
        blockedFindings,
        reviewFindings,
    };
}

export function buildCampaignCuePulseEvidence(businessBrain: CampaignCueBusinessBrain, now = new Date()) {
    const pulse = normalizeCampaignCueOperatingPulse(businessBrain.operatingPulse);
    const current = isCampaignCueOperatingPulseCurrent(pulse, now);
    return [
        current ? `Business state: ${pulse.businessState}.` : "Owner pulse needs refresh.",
        pulse.capacityStatus !== "unknown" ? `Capacity: ${pulse.capacityStatus}.` : undefined,
        pulse.stockStatus !== "unknown" ? `Stock: ${pulse.stockStatus}.` : undefined,
        pulse.localMoment ? `Local moment: ${pulse.localMoment}.` : undefined,
        pulse.note || undefined,
    ].filter(Boolean) as string[];
}

const resultMetricTotal = (campaign?: CampaignCueCampaign) => {
    const metrics = campaign?.resultMemory?.lastReceipt?.metrics || {};
    return Object.values(metrics).reduce((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
};

const positiveResultScore = (campaign: CampaignCueCampaign) => (
    Number(campaign.resultMemory?.usefulCount || 0) * 100
    + resultMetricTotal(campaign)
);

const resultEvidenceForCampaign = (campaign: CampaignCueCampaign) => {
    const evidence: string[] = [];
    const usefulCount = Number(campaign.resultMemory?.usefulCount || 0);
    const metricTotal = resultMetricTotal(campaign);
    if (usefulCount) {
        evidence.push(`${usefulCount} useful owner result${usefulCount === 1 ? "" : "s"} recorded.`);
    }
    if (metricTotal) {
        evidence.push(`${metricTotal} owner-entered response${metricTotal === 1 ? "" : "s"} recorded.`);
    }
    if (campaign.resultMemory?.lastSignalId) {
        evidence.push(`Latest result: ${campaign.resultMemory.lastSignalId.replace(/_/g, " ")}.`);
    }
    return evidence.slice(0, 3);
};

export function buildCampaignCueCampaignRhythm(params: {
    campaigns: CampaignCueCampaign[];
    recipe: CampaignCueDailyDeskRecipe;
    schedules: CampaignCueSchedule[];
    workspace: CampaignCueWorkspace;
    now?: Date;
}): CampaignCueCampaignRhythm {
    const now = params.now || new Date();
    const nowMs = now.getTime();
    const activeSchedules = params.schedules.filter((schedule) => (
        schedule.status === "scheduled" || schedule.status === "due"
    ));
    const dueSchedules = activeSchedules.filter((schedule) => (
        schedule.status === "due"
        || (toTime(schedule.scheduledAt) > 0 && toTime(schedule.scheduledAt) <= nowMs)
    ));
    const futureSchedules = activeSchedules
        .filter((schedule) => toTime(schedule.scheduledAt) > nowMs)
        .sort((left, right) => toTime(left.scheduledAt) - toTime(right.scheduledAt));
    const requestedApproval = params.campaigns.find((campaign) => (
        campaign.status !== "archived"
        && campaign.status !== "used"
        && campaign.ownerApprovalState === "requested"
    ));
    const rejectedApproval = params.campaigns.find((campaign) => (
        campaign.status !== "archived"
        && campaign.status !== "used"
        && campaign.ownerApprovalState === "rejected"
    ));
    const agencyApprovalNeeded = params.workspace.agencyMode
        ? params.campaigns.find((campaign) => (
            ["draft", "generated", "scheduled"].includes(campaign.status)
            && campaign.ownerApprovalState !== "approved"
        ))
        : undefined;
    const approvalCampaign = requestedApproval || rejectedApproval || agencyApprovalNeeded;
    const resultCampaign = params.campaigns.find((campaign) => (
        campaign.status === "used" && !campaign.resultMemory?.lastRecordedAt
    ));
    const reuseSource = params.campaigns
        .filter((campaign) => (
            campaign.status !== "archived"
            && campaign.trustGate !== "blocked"
            && campaign.trustGate !== "needs_fix"
            && Boolean(campaign.pack?.recipeId)
            && positiveResultScore(campaign) > 0
            && Number(campaign.resultMemory?.usefulCount || 0) > Number(campaign.resultMemory?.notUsefulCount || 0)
        ))
        .sort((left, right) => (
            positiveResultScore(right) - positiveResultScore(left)
            || toTime(right.resultMemory?.lastRecordedAt || right.updatedAt || right.createdAt)
                - toTime(left.resultMemory?.lastRecordedAt || left.updatedAt || left.createdAt)
        ))[0];
    const reuseCandidate = reuseSource?.pack?.recipeId ? {
        campaignId: reuseSource.id,
        title: reuseSource.title,
        recipeId: reuseSource.pack.recipeId,
        reason: "A useful owner-reported result exists. Rebuild this recipe from current checked facts instead of copying old output.",
        positiveEvidence: resultEvidenceForCampaign(reuseSource),
        actionLabel: "Reuse safely" as const,
        mode: "rebuild_from_current_truth" as const,
    } : undefined;
    const readyUnusedCampaign = params.campaigns.find((campaign) => (
        campaign.status === "generated"
        && campaign.ownerApprovalState !== "requested"
        && campaign.ownerApprovalState !== "rejected"
        && campaign.trustGate !== "blocked"
        && campaign.trustGate !== "needs_fix"
        && evaluateCampaignCuePackFreshness({ freshness: campaign.pack?.freshness, now }).status === "current"
    ));
    const nextSchedule = futureSchedules[0];
    const base = {
        dueTaskCount: dueSchedules.length,
        scheduledTaskCount: futureSchedules.length,
        nextScheduledAt: nextSchedule?.scheduledAt,
        reuseCandidate,
        suggestedUse: nextSchedule
            ? "Use the next owner-scheduled manual task at its saved local time."
            : params.recipe.whenToUse,
        followUp: "After manual use, record one owner-observed result before changing more than one campaign variable.",
        costPolicy: {
            firestoreReads: 0 as const,
            firestoreWrites: 0 as const,
            providerCalls: 0 as const,
            summary: "Derived from the already-loaded bounded campaign and schedule lists. No Firebase or provider operation is added.",
        },
    };

    if (approvalCampaign) {
        const requested = approvalCampaign.ownerApprovalState === "requested";
        const rejected = approvalCampaign.ownerApprovalState === "rejected";
        return {
            ...base,
            status: "approval_due",
            title: requested ? "Review the waiting approval" : rejected ? "Resolve the rejected pack" : "Request approval before use",
            detail: requested
                ? `${approvalCampaign.title} is waiting for owner, reviewer, or local-manager approval.`
                : rejected
                    ? `${approvalCampaign.title} was rejected. Review the reason before rebuilding or requesting approval again.`
                    : `${approvalCampaign.title} needs approval because this is an agency workspace.`,
            primaryAction: {
                label: requested ? "Review approval" : rejected ? "Open approvals" : "Request approval",
                targetTab: "agency",
                kind: "approval",
            },
            approvalCampaignId: approvalCampaign.id,
        };
    }
    if (dueSchedules.length) {
        return {
            ...base,
            status: "task_due",
            title: "A manual campaign task is due",
            detail: `${dueSchedules.length} manual task${dueSchedules.length === 1 ? " is" : "s are"} due. CampaignCue will not post automatically.`,
            primaryAction: { label: "Open calendar", targetTab: "calendar", kind: "manual_post" },
        };
    }
    if (resultCampaign) {
        return {
            ...base,
            status: "result_due",
            title: "Record what happened",
            detail: `${resultCampaign.title} was marked used but has no result receipt yet.`,
            primaryAction: { label: "Record result", targetTab: "analytics", kind: "result_memory" },
            resultCampaignId: resultCampaign.id,
        };
    }
    if (nextSchedule) {
        return {
            ...base,
            status: "scheduled",
            title: "Next manual task is scheduled",
            detail: "Review the saved time, assignee, channel, and current truth before manual use.",
            primaryAction: { label: "Open calendar", targetTab: "calendar", kind: "manual_post" },
        };
    }
    if (readyUnusedCampaign) {
        return {
            ...base,
            status: "pack_ready",
            title: "Use the ready campaign pack",
            detail: `${readyUnusedCampaign.title} is ready for final checks and manual use.`,
            primaryAction: { label: "Open pack", targetTab: "campaigns", kind: "campaign_pack" },
        };
    }
    if (reuseCandidate) {
        return {
            ...base,
            status: "reuse_ready",
            title: "Reuse a campaign that helped before",
            detail: reuseCandidate.reason,
            primaryAction: { label: reuseCandidate.actionLabel, targetTab: "campaigns", kind: "asset_reuse" },
        };
    }
    return {
        ...base,
        status: "prepare_next",
        title: "Prepare the next useful pack",
        detail: "No approval, result, due task, or proven pack is waiting. Use the current recommendation.",
        primaryAction: { label: "Open recommendation", targetTab: "cues", kind: "campaign_pack" },
    };
}

export function buildCampaignCueExperimentSuggestion(params: {
    assets: CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
    campaigns: CampaignCueCampaign[];
    recipe: CampaignCueDailyDeskRecipe;
}): CampaignCueExperimentSuggestion {
    const matching = params.campaigns.find((campaign) => (
        campaign.pack?.recipeId === params.recipe.id || campaign.pack?.ownerGoal === params.recipe.ownerGoal
    ));
    const wasNotUseful = Number(matching?.resultMemory?.notUsefulCount || 0) > 0;
    const hadMeasuredResponse = resultMetricTotal(matching) > 0 || Number(matching?.resultMemory?.usefulCount || 0) > 0;
    const hasConfirmedAsset = params.assets.some((asset) => asset.status === "ready" && asset.rights.status === "confirmed");
    const hasCta = Boolean(
        params.businessBrain.contacts.bookingUrl
        || params.businessBrain.contacts.publicMenuUrl
        || params.businessBrain.contacts.website
        || params.businessBrain.contacts.whatsapp
        || params.businessBrain.contacts.phone,
    );

    if (!hasCta) {
        return { variable: "cta", instruction: "Add one confirmed customer next step and keep the rest of the pack unchanged.", reason: "A clear CTA is missing." };
    }
    if (!hasConfirmedAsset) {
        return { variable: "photo", instruction: "Use one approved real business photo and keep the offer, copy, and channel unchanged.", reason: "No rights-confirmed visual is available yet." };
    }
    if (wasNotUseful) {
        return { variable: "channel", instruction: "Try one different owner-used channel while keeping the offer, photo, and CTA unchanged.", reason: "A similar campaign was marked not useful." };
    }
    if (hadMeasuredResponse) {
        return { variable: "timing", instruction: "Repeat the same campaign pattern at one different useful time and change nothing else.", reason: "A similar campaign had a positive owner-reported result." };
    }
    return { variable: "format", instruction: "Use one primary format first and keep the message, offer, photo, and CTA unchanged.", reason: "A single-variable test will make the first result easier to interpret." };
}

export function buildCampaignCuePresencePassport(businessBrain: CampaignCueBusinessBrain): CampaignCuePresencePassportItem[] {
    const presence = normalizeCampaignCuePresenceProfile(businessBrain.presence);
    const entries: Array<[string, string, string | undefined, string]> = [
        ["google", "Google Business Profile", presence.googleBusinessProfileUrl, "Review or update the profile manually"],
        ["google_review", "Google review destination", presence.googleReviewUrl, "Verify the review link before customer handoff"],
        ["apple", "Apple Business Connect", presence.appleBusinessConnectUrl, "Review the Apple place card manually"],
        ["instagram", "Instagram", presence.instagramUrl, "Use the owner-managed Instagram account"],
        ["facebook", "Facebook", presence.facebookUrl, "Use the owner-managed Facebook page"],
        ["whatsapp_catalog", "WhatsApp catalog", presence.whatsappCatalogUrl, "Use the owner-managed catalog or business profile"],
        ["website", "Website or menu", businessBrain.contacts.website || businessBrain.contacts.publicMenuUrl, "Check the customer destination manually"],
    ];
    return entries.map(([id, label, destination, manualAction]) => ({
        id: `presence_${id}`,
        label,
        destination,
        status: destination ? "ready" : "missing",
        manualAction,
    }));
}

const validityHoursForRecipe = (recipe: CampaignCueDailyDeskRecipe) => {
    if (["slow_period", "slot_fill", "new_offer"].includes(recipe.scenario)) return 24;
    if (recipe.scenario === "daily_default") return 48;
    if (recipe.scenario === "asset_reuse") return 24 * 30;
    return 24 * 7;
};

export function buildCampaignCuePackFreshness(params: {
    businessBrain?: CampaignCueBusinessBrain;
    now?: Date;
    recipe: CampaignCueDailyDeskRecipe;
    sourceHash: string;
    sourceInputs?: CampaignCueSourceInput[];
}): CampaignCuePackFreshness {
    const now = params.now || new Date();
    const recipeExpiry = now.getTime() + validityHoursForRecipe(params.recipe) * 60 * 60 * 1000;
    const pulseExpiry = params.businessBrain
        ? toTime(normalizeCampaignCueOperatingPulse(params.businessBrain.operatingPulse).validUntil)
        : 0;
    const sourceExpiries = (params.sourceInputs || [])
        .filter((input) => isCampaignCueDecisionSourceInput(input, now))
        .map((input) => toTime(input.expiresAt))
        .filter((value) => value > 0);
    const expiresAt = Math.min(
        recipeExpiry,
        ...(pulseExpiry ? [pulseExpiry] : []),
        ...sourceExpiries,
    );
    return {
        sourceHash: params.sourceHash,
        status: expiresAt < now.getTime() ? "expired" : "current",
        validatedAt: now.toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        recheckActions: [...CAMPAIGNCUE_PACK_RECHECK_ACTIONS],
    };
}

export function evaluateCampaignCuePackFreshness(params: {
    currentSourceHash?: string;
    freshness?: CampaignCuePackFreshness;
    now?: Date;
}): CampaignCuePackFreshness {
    const freshness = params.freshness;
    if (!freshness?.sourceHash) {
        return {
            sourceHash: "",
            status: "unknown",
            recheckActions: [...CAMPAIGNCUE_PACK_RECHECK_ACTIONS],
        };
    }
    const now = params.now || new Date();
    const expired = Boolean(toTime(freshness.expiresAt) && toTime(freshness.expiresAt) < now.getTime());
    const stale = Boolean(params.currentSourceHash && params.currentSourceHash !== freshness.sourceHash);
    const preservedStatus = !params.currentSourceHash && (freshness.status === "stale" || freshness.status === "expired")
        ? freshness.status
        : undefined;
    return {
        ...freshness,
        status: stale ? "stale" : expired ? "expired" : preservedStatus || "current",
    };
}
