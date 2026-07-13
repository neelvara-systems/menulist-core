import { CAMPAIGNCUE_DAILY_DESK_RECIPES } from "@constant/campaigncue/dailyDesk";
import { FEATURE_FLAGS } from "@config/features";
import {
    buildCampaignCueExperimentSuggestion,
    buildCampaignCuePulseEvidence,
    evaluateCampaignCueCommercialGate,
    isCampaignCueOperatingPulseCurrent,
    isCampaignCueDecisionSourceInput,
    normalizeCampaignCueLanguagePolicy,
    normalizeCampaignCueOperatingPulse,
    normalizeCampaignCuePresenceProfile,
} from "@lib/campaigncue/operatingLoop";
import type {
    CampaignCueAnalyticsSummary,
    CampaignCueAsset,
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueDecision,
    CampaignCueDecisionMissingInput,
    CampaignCueDecisionOutputType,
    CampaignCueLocation,
    CampaignCueOpportunity,
    CampaignCueSchedule,
    CampaignCueSourceFact,
    CampaignCueSourceInput,
    CampaignCueWorkspace,
} from "@type/campaigncue";

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const compact = (value: unknown) => (typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim());

const hasBusinessCta = (businessBrain: CampaignCueBusinessBrain) => Boolean(
    businessBrain.contacts.bookingUrl
    || businessBrain.contacts.publicMenuUrl
    || businessBrain.contacts.website
    || businessBrain.contacts.whatsapp
    || businessBrain.contacts.phone,
);

const isServiceBusiness = (businessType: CampaignCueBusinessBrain["businessType"]) => (
    businessType === "salon"
    || businessType === "local_service"
    || businessType === "fitness"
    || businessType === "clinic"
);

const hasPriceDateOrAvailability = (sourceInputs: CampaignCueSourceInput[]) => sourceInputs.some((input) => {
    const text = `${input.label} ${input.value}`.toLowerCase();
    return Boolean(input.expiresAt)
        || input.sourceType === "offer"
        || input.sourceType === "event"
        || /(\$|₹|rs\.?|price|offer|off|discount|stock|slot|available|today|tomorrow|weekend|date|time|\b\d{1,2}\s?(am|pm)\b|\b\d{1,3}%\b)/.test(text);
});

const sourceInputText = (input: CampaignCueSourceInput) => `${input.label} ${input.value}`;

const containsLikelyPhoneNumber = (value: string) => {
    const candidates: string[] = value.match(/\+?[0-9][0-9 ()-]{7,}[0-9]/g) || [];
    return candidates.some((candidate) => candidate.replace(/\D/g, "").length >= 10);
};

const hasCompletedCustomerInteraction = (sourceInputs: CampaignCueSourceInput[]) => sourceInputs.some((input) => (
    /\b(completed|fulfilled|served|after (?:a |the )?(?:visit|order|booking|appointment|service)|recent customers? (?:visited|ordered|booked|completed))\b/i
        .test(sourceInputText(input))
));

const isOwnerManagedAudienceDescription = (input: CampaignCueSourceInput) => {
    const text = sourceInputText(input);
    const describesAudience = /\b(customer|customers|audience|client|clients|member|members|past buyer|recent buyer|return)\b/i.test(text);
    const containsContactData = /\b(?:paste|import|upload|store|save|attach)\b.{0,32}\b(?:contacts?|customers?|clients?|phone numbers?|email addresses?|csv|spreadsheet)\b/i.test(text)
        || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
        || containsLikelyPhoneNumber(text);
    return describesAudience && !containsContactData;
};

const toTime = (value: unknown) => {
    if (!value) return 0;
    const date = typeof value === "string" || typeof value === "number" || value instanceof Date
        ? new Date(value)
        : typeof (value as { toDate?: unknown }).toDate === "function"
            ? (value as { toDate: () => Date }).toDate()
            : null;
    return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const weekdayForTimeZone = (date: Date, timeZone: string) => {
    try {
        return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
    } catch {
        return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
    }
};

const resultReceiptMetricTotal = (campaigns: CampaignCueCampaign[]) => campaigns.reduce((total, campaign) => {
    const metrics = campaign.resultMemory?.lastReceipt?.metrics || {};
    return total + Object.values(metrics).reduce((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
}, 0);

const outputTypeForLabel = (label: string): CampaignCueDecisionOutputType => {
    const normalized = label.toLowerCase();
    if (/whatsapp/.test(normalized) && /image/.test(normalized)) return "whatsapp_image";
    if (/whatsapp/.test(normalized)) return "whatsapp_message";
    if (/story/.test(normalized)) return "instagram_story";
    if (/instagram|square|social/.test(normalized)) return "instagram_square";
    if (/google.*offer|offer.*google/.test(normalized)) return "google_offer";
    if (/google/.test(normalized)) return "google_update";
    if (/poster|counter|window/.test(normalized)) return "poster_pdf";
    if (/flyer|a4/.test(normalized)) return "flyer_pdf";
    if (/staff/.test(normalized)) return "staff_share_text";
    if (/ad/.test(normalized)) return "ad_handoff_copy";
    if (/script|creator|ugc/.test(normalized)) return "creator_script";
    if (/reel|video/.test(normalized)) return "reel_brief";
    return "manual_task";
};

const outputTypesForRecipe = (recipe: typeof CAMPAIGNCUE_DAILY_DESK_RECIPES[number]) => (
    Array.from(new Set([
        ...recipe.outputFormats.map(outputTypeForLabel),
        ...recipe.printFormats.slice(0, 2).map(outputTypeForLabel),
    ])).slice(0, 8)
);

const opportunityIdForRecipe = (
    recipe: typeof CAMPAIGNCUE_DAILY_DESK_RECIPES[number],
    opportunities: CampaignCueOpportunity[],
    businessType: CampaignCueBusinessBrain["businessType"],
) => {
    if (recipe.id === "google_local_visibility_refresh") return opportunities.find((opportunity) => opportunity.id === "cue_local_visibility_refresh")?.id;
    if (recipe.id === "local_review_request") return opportunities.find((opportunity) => opportunity.id === "cue_review_request")?.id;
    if (recipe.id === "return_customer_reminder") return opportunities.find((opportunity) => opportunity.id === "cue_return_customer")?.id;
    if (recipe.id === "asset_reuse_old_poster") return opportunities.find((opportunity) => opportunity.id === "cue_asset_rights")?.id
        || opportunities.find((opportunity) => opportunity.id === "cue_weekly_pack")?.id;
    if (recipe.ownerGoal === "fill_slots" || isServiceBusiness(businessType)) return opportunities.find((opportunity) => opportunity.id === "cue_booking_fill")?.id;
    if (recipe.ownerGoal === "bring_people_today" || recipe.ownerGoal === "sell_product") return opportunities.find((opportunity) => opportunity.id === "cue_menu_push")?.id;
    return opportunities.find((opportunity) => opportunity.id === "cue_weekly_pack")?.id || opportunities[0]?.id;
};

const missingInput = (params: {
    ownerQuestion: string;
    required: boolean;
    type: CampaignCueDecisionMissingInput["type"];
    unlocks: CampaignCueDecisionOutputType[];
}): CampaignCueDecisionMissingInput => ({
    ownerQuestion: params.ownerQuestion,
    required: params.required,
    type: params.type,
    unlocks: params.unlocks.slice(0, 4),
});

const buildMissingInputsForRecipe = (params: {
    activeInputs: CampaignCueSourceInput[];
    confirmedAssets: CampaignCueAsset[];
    reviewAssets: CampaignCueAsset[];
    restrictedAssets: CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
    recipe: typeof CAMPAIGNCUE_DAILY_DESK_RECIPES[number];
}) => {
    const outputs = outputTypesForRecipe(params.recipe);
    const missing: CampaignCueDecisionMissingInput[] = [];
    const requiresPhoto = params.recipe.requiredInputs.some((input) => /photo|image|poster|asset/i.test(input));
    const requiresLocality = params.recipe.requiredInputs.some((input) => /location|locality|area|branch/i.test(input))
        || params.recipe.scenario === "local_visibility";
    const requiresCurrentInput = params.recipe.requiredInputs.some((input) => /item|service|offer|product|event|slot|class|current|poster/i.test(input));
    const presence = normalizeCampaignCuePresenceProfile(params.businessBrain.presence);
    const languagePolicy = normalizeCampaignCueLanguagePolicy(params.businessBrain.languagePolicy, params.businessBrain.locale);

    if (!hasBusinessCta(params.businessBrain)) {
        missing.push(missingInput({
            type: "business_cta",
            ownerQuestion: "Add one phone, WhatsApp, booking link, menu link, or website before preparing the final pack.",
            required: true,
            unlocks: outputs,
        }));
    }
    if (requiresLocality && !params.businessBrain.locality) {
        missing.push(missingInput({
            type: "location_detail",
            ownerQuestion: "Add the area, city, or branch detail so the campaign does not feel generic.",
            required: true,
            unlocks: ["google_update", "whatsapp_message", "instagram_square"],
        }));
    }
    if (requiresCurrentInput && !params.activeInputs.length && params.recipe.scenario !== "asset_reuse") {
        missing.push(missingInput({
            type: "current_offer",
            ownerQuestion: "Add one current offer, service, item, event, or owner note for this campaign.",
            required: true,
            unlocks: outputs,
        }));
    }
    if (params.activeInputs.length && !hasPriceDateOrAvailability(params.activeInputs) && params.recipe.scenario !== "review_push") {
        missing.push(missingInput({
            type: params.recipe.scenario === "slot_fill" ? "available_time_slot" : "price_or_date",
            ownerQuestion: params.recipe.scenario === "slot_fill"
                ? "Confirm the available slot, date, or time window before final export."
                : "Confirm price, date, availability, or offer terms before using promotional copy.",
            required: params.recipe.scenario !== "local_visibility",
            unlocks: outputs,
        }));
    }
    if (requiresPhoto && !params.confirmedAssets.length) {
        missing.push(missingInput({
            type: params.reviewAssets.length ? "asset_rights" : "photo",
            ownerQuestion: params.reviewAssets.length
                ? "Confirm photo rights before using this asset publicly."
                : "Add one approved real business photo or logo if the pack needs a visual.",
            required: false,
            unlocks: ["whatsapp_image", "instagram_square", "instagram_story", "poster_pdf"],
        }));
    }
    if (params.restrictedAssets.length) {
        missing.push(missingInput({
            type: "asset_rights",
            ownerQuestion: "Remove or replace restricted assets before public use.",
            required: true,
            unlocks: ["whatsapp_image", "instagram_square", "poster_pdf"],
        }));
    }
    if (params.recipe.scenario === "review_push" && !presence.googleReviewUrl) {
        missing.push(missingInput({
            type: "review_destination",
            ownerQuestion: "Add and verify the customer review destination before using the review-request pack.",
            required: true,
            unlocks: ["whatsapp_message", "staff_share_text", "poster_pdf"],
        }));
    }
    if (params.recipe.scenario === "review_push" && !hasCompletedCustomerInteraction(params.activeInputs)) {
        missing.push(missingInput({
            type: "completed_customer_interaction",
            ownerQuestion: "Add a non-identifying note confirming a real customer visit, order, booking, or service was completed.",
            required: true,
            unlocks: ["whatsapp_message", "staff_share_text", "poster_pdf"],
        }));
    }
    if (params.recipe.scenario === "retention" && !params.activeInputs.some(isOwnerManagedAudienceDescription)) {
        missing.push(missingInput({
            type: "owner_managed_audience",
            ownerQuestion: "Describe the owner-managed customer group without adding names, phone numbers, or a contact list.",
            required: true,
            unlocks: ["whatsapp_message", "staff_share_text", "manual_task"],
        }));
    }
    if (languagePolicy.targetLocales.length) {
        missing.push(missingInput({
            type: "target_language",
            ownerQuestion: `Review protected business facts in the ${languagePolicy.targetLocales.join(", ")} handoff before use.`,
            required: false,
            unlocks: outputs,
        }));
    }
    return missing;
};

export const campaignCueRecipeById = (recipeId?: string) => (
    CAMPAIGNCUE_DAILY_DESK_RECIPES.find((recipe) => recipe.id === recipeId)
    || CAMPAIGNCUE_DAILY_DESK_RECIPES[0]
);

export function buildCampaignCueDecisions(params: {
    analytics: CampaignCueAnalyticsSummary;
    assets: CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
    campaigns: CampaignCueCampaign[];
    locations: CampaignCueLocation[];
    opportunities: CampaignCueOpportunity[];
    schedules: CampaignCueSchedule[];
    sourceFacts: CampaignCueSourceFact[];
    sourceInputs: CampaignCueSourceInput[];
    workspace: CampaignCueWorkspace;
    now?: Date;
}): CampaignCueDecision[] {
    const now = params.now || new Date();
    const activeInputs = params.sourceInputs.filter((input) => isCampaignCueDecisionSourceInput(input, now));
    const confirmedAssets = params.assets.filter((asset) => asset.status === "ready" && asset.rights.status === "confirmed");
    const reviewAssets = params.assets.filter((asset) => asset.rights.status === "needs_review");
    const restrictedAssets = params.assets.filter((asset) => asset.status === "blocked" || asset.rights.status === "restricted");
    const blockedFacts = params.sourceFacts.filter((fact) => fact.risk === "blocked");
    const reviewFacts = params.sourceFacts.filter((fact) => fact.risk === "needs_review");
    const usefulCampaigns = params.campaigns.filter((campaign) => Number(campaign.resultMemory?.usefulCount || 0) > 0);
    const notUsefulCampaigns = params.campaigns.filter((campaign) => Number(campaign.resultMemory?.notUsefulCount || 0) > 0);
    const nowMs = now.getTime();
    const weekday = weekdayForTimeZone(now, params.businessBrain.timezone);
    const isWeekend = weekday === "Sat" || weekday === "Sun";
    const isWeekday = !isWeekend;
    const latestCampaignTime = Math.max(...params.campaigns.map((campaign) => toTime(campaign.createdAt)), 0);
    const recentCampaignPenalty = latestCampaignTime && nowMs - latestCampaignTime < 1000 * 60 * 60 * 24 * 2 ? 18 : 0;
    const operatingPulse = normalizeCampaignCueOperatingPulse(params.businessBrain.operatingPulse);
    const pulseCurrent = isCampaignCueOperatingPulseCurrent(operatingPulse, now);

    const matchingRecipes = CAMPAIGNCUE_DAILY_DESK_RECIPES
        .filter((recipe) => recipe.businessTypes.includes(params.businessBrain.businessType) || recipe.businessTypes.includes("other"));
    const recipes = matchingRecipes.length ? matchingRecipes : CAMPAIGNCUE_DAILY_DESK_RECIPES;

    return recipes
        .map((recipe) => {
            const commercialGate = FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_OPERATING_LOOP
                ? evaluateCampaignCueCommercialGate({
                    businessBrain: params.businessBrain,
                    now,
                    recipe,
                    sourceInputs: activeInputs,
                })
                : { status: "ready" as const, findings: [], blockedFindings: [], reviewFindings: [] };
            const missingInputs = buildMissingInputsForRecipe({
                activeInputs,
                businessBrain: params.businessBrain,
                confirmedAssets,
                recipe,
                restrictedAssets,
                reviewAssets,
            });
            commercialGate.blockedFindings.forEach((finding) => missingInputs.push(missingInput({
                type: /capacity|stock|closed/i.test(finding) ? "capacity_or_stock" : "commercial_policy",
                ownerQuestion: finding,
                required: true,
                unlocks: outputTypesForRecipe(recipe),
            })));
            commercialGate.reviewFindings.forEach((finding) => missingInputs.push(missingInput({
                type: /capacity|stock|pulse/i.test(finding) ? "capacity_or_stock" : "commercial_policy",
                ownerQuestion: finding,
                required: /pulse has expired/i.test(finding),
                unlocks: outputTypesForRecipe(recipe),
            })));
            const requiredMissing = missingInputs.filter((input) => input.required);
            const matchingUseful = usefulCampaigns.filter((campaign) => campaign.pack?.recipeId === recipe.id || campaign.pack?.ownerGoal === recipe.ownerGoal);
            const matchingNotUseful = notUsefulCampaigns.filter((campaign) => campaign.pack?.recipeId === recipe.id || campaign.pack?.ownerGoal === recipe.ownerGoal);
            const recipeUsedRecently = params.campaigns.some((campaign) => (
                (campaign.pack?.recipeId === recipe.id || campaign.pack?.ownerGoal === recipe.ownerGoal)
                && nowMs - toTime(campaign.createdAt) < 1000 * 60 * 60 * 24 * 7
            ));
            const timingBoost = recipe.scenario === "slow_period" && isWeekday
                ? 18
                : recipe.scenario === "slot_fill" && (weekday === "Thu" || weekday === "Fri" || isWeekend)
                    ? 18
                    : recipe.scenario === "local_visibility"
                        ? 10
                        : 6;
            const pulseBoost = pulseCurrent
                ? (operatingPulse.businessState === "quiet" && ["slow_period", "daily_default", "review_push", "retention"].includes(recipe.scenario) ? 16 : 0)
                    + (operatingPulse.capacityStatus === "available" && recipe.scenario === "slot_fill" ? 18 : 0)
                    + (operatingPulse.stockStatus === "available" && ["new_offer", "daily_default"].includes(recipe.scenario) ? 12 : 0)
                    + (operatingPulse.localMoment ? 8 : 0)
                    - (operatingPulse.businessState === "busy" && !["review_push", "asset_reuse", "local_visibility"].includes(recipe.scenario) ? 18 : 0)
                : 0;
            const relevance = clampScore((recipe.businessTypes.includes(params.businessBrain.businessType) ? 78 : 52)
                + (recipe.scenario === "asset_reuse" && params.assets.length ? 18 : 0)
                + (recipe.scenario === "local_visibility" && (!params.businessBrain.locality || !params.campaigns.some((campaign) => campaign.outputs.some((output) => output.channel === "google_local"))) ? 15 : 0));
            const urgency = clampScore(45 + timingBoost + pulseBoost + (params.schedules.some((schedule) => schedule.status === "due") ? 14 : 0));
            const expectedImpact = clampScore(58 + matchingUseful.length * 16 - matchingNotUseful.length * 10);
            const factReadiness = clampScore(100 - requiredMissing.length * 32 - reviewFacts.length * 8 - blockedFacts.length * 25 - commercialGate.reviewFindings.length * 8);
            const assetReadiness = clampScore(confirmedAssets.length ? 88 : reviewAssets.length ? 58 : recipe.scenario === "asset_reuse" && params.assets.length ? 64 : 42);
            const channelReadiness = clampScore(55 + (hasBusinessCta(params.businessBrain) ? 28 : 0) + (recipe.recommendedChannels.includes("google_local") && params.businessBrain.locality ? 8 : 0));
            const resultMemoryBoost = clampScore(matchingUseful.length * 18 + Math.min(24, resultReceiptMetricTotal(matchingUseful) * 2));
            const ownerEffortPenalty = clampScore(requiredMissing.length * 28 + missingInputs.filter((input) => !input.required).length * 8);
            const repetitionPenalty = clampScore((recipeUsedRecently ? 18 : 0) + recentCampaignPenalty + matchingNotUseful.length * 12);
            const trustRiskPenalty = clampScore(blockedFacts.length * 35 + restrictedAssets.length * 35 + reviewFacts.length * 8 + reviewAssets.length * 10 + commercialGate.blockedFindings.length * 40 + commercialGate.reviewFindings.length * 10);
            const finalScore = clampScore(
                relevance * 0.20
                + urgency * 0.15
                + expectedImpact * 0.20
                + factReadiness * 0.15
                + assetReadiness * 0.10
                + channelReadiness * 0.10
                + resultMemoryBoost * 0.10
                - trustRiskPenalty * 0.20
                - ownerEffortPenalty * 0.10
                - repetitionPenalty * 0.10,
            );
            const trustStatus = blockedFacts.length || restrictedAssets.length || commercialGate.status === "blocked"
                ? "blocked"
                : requiredMissing.length || reviewFacts.length || reviewAssets.length || commercialGate.status === "needs_review"
                    ? "needs_review"
                    : "ready";
            const decisionStatus = trustStatus === "blocked"
                ? "blocked"
                : requiredMissing.length
                    ? "needs_owner_input"
                    : finalScore < 45
                        ? "safe_evergreen_only"
                        : "ready_to_prepare";
            const confidence = trustStatus === "blocked" || finalScore < 45
                ? "low"
                : requiredMissing.length || finalScore < 68
                    ? "medium"
                    : "high";
            const outputTypes = outputTypesForRecipe(recipe);
            const experiment = buildCampaignCueExperimentSuggestion({
                assets: params.assets,
                businessBrain: params.businessBrain,
                campaigns: params.campaigns,
                recipe,
            });
            const pulseEvidence = buildCampaignCuePulseEvidence(params.businessBrain, now);

            return {
                decisionId: `decision_${recipe.id}`,
                workspaceId: params.workspace.workspaceId,
                businessBrainId: params.businessBrain.businessBrainId,
                recommendationTitle: recipe.title,
                ownerGoal: recipe.ownerGoal,
                recipeId: recipe.id,
                opportunityId: opportunityIdForRecipe(recipe, params.opportunities, params.businessBrain.businessType),
                decisionStatus,
                confidence,
                factsUsed: {
                    businessFactRefs: params.sourceFacts.filter((fact) => fact.sourceType === "business_profile").map((fact) => fact.id),
                    offerFactRefs: params.sourceFacts.filter((fact) => fact.sourceType === "offer" || fact.sourceType === "event" || fact.sourceType === "manual").map((fact) => fact.id),
                    contactFactRefs: params.sourceFacts.filter((fact) => fact.sourceType === "contact").map((fact) => fact.id),
                    locationFactRefs: [
                        ...params.sourceFacts.filter((fact) => /location|area|city|branch/i.test(`${fact.label} ${fact.value}`)).map((fact) => fact.id),
                        ...params.locations.filter((location) => location.status === "active").map((location) => location.id),
                    ],
                    assetRefs: confirmedAssets.slice(0, 6).map((asset) => asset.id),
                    resultMemoryRefs: matchingUseful.concat(matchingNotUseful).slice(0, 4).map((campaign) => campaign.id),
                },
                missingInputs,
                score: {
                    relevance,
                    urgency,
                    expectedImpact,
                    factReadiness,
                    assetReadiness,
                    channelReadiness,
                    resultMemoryBoost,
                    ownerEffortPenalty,
                    repetitionPenalty,
                    trustRiskPenalty,
                    finalScore,
                },
                explanation: {
                    whyThis: [
                        `${recipe.ownerOutcome}`,
                        params.businessBrain.locality ? `${params.businessBrain.locality} is available for local context.` : "Local area can be added for stronger context.",
                        hasBusinessCta(params.businessBrain) ? "A customer next step is available." : "A customer next step is still missing.",
                        matchingUseful.length ? "Similar campaign result memory was useful before." : "No strong result memory exists yet for this recipe.",
                    ],
                    whyNow: [
                        recipe.whenToUse,
                        isWeekend ? "Weekend timing may affect bookings and walk-ins." : "Weekday timing can support a practical same-day update.",
                        activeInputs.length ? "A current owner input is available." : "A current owner input would improve the recommendation.",
                        ...pulseEvidence.slice(0, 2),
                    ],
                    whyNotOthers: [
                        requiredMissing.length ? "Recipes needing fewer missing facts are safer to prepare first." : "This recipe has enough facts to prepare safely.",
                        recipeUsedRecently ? "Repeated campaigns are penalized so owners do not overuse the same cue." : "No recent same-recipe fatigue is blocking this cue.",
                    ],
                    risks: [
                        ...requiredMissing.map((input) => input.ownerQuestion),
                        ...blockedFacts.slice(0, 3).map((fact) => `${fact.label} is blocked.`),
                        ...restrictedAssets.slice(0, 3).map((asset) => `${asset.name} has restricted rights.`),
                        ...commercialGate.findings,
                    ].slice(0, 6),
                },
                recommendedOutputs: outputTypes.map((outputType) => ({
                    outputType,
                    reason: `Included because ${recipe.title} recommends ${outputType.replace(/_/g, " ")} for manual use.`,
                })),
                trustPreflight: {
                    status: trustStatus,
                    findings: [
                        ...requiredMissing.map((input) => input.ownerQuestion),
                        ...reviewFacts.slice(0, 3).map((fact) => `${fact.label} needs review.`),
                        ...blockedFacts.slice(0, 3).map((fact) => `${fact.label} is blocked.`),
                        ...reviewAssets.slice(0, 3).map((asset) => `${asset.name} rights need review.`),
                        ...restrictedAssets.slice(0, 3).map((asset) => `${asset.name} cannot be used.`),
                        ...commercialGate.findings,
                    ].slice(0, 8),
                },
                ownerPrimaryActionLabel: decisionStatus === "needs_owner_input"
                    ? "Confirm details"
                    : decisionStatus === "blocked"
                        ? "Review risk"
                        : "Create pack",
                commercialGate: {
                    status: commercialGate.status,
                    findings: commercialGate.findings,
                },
                experiment,
                pulseEvidence,
            } satisfies CampaignCueDecision;
        })
        .sort((a, b) => b.score.finalScore - a.score.finalScore);
}
