import {
    CAMPAIGNCUE_DAILY_DESK_DEFAULT_RECIPE_ID,
    CAMPAIGNCUE_DAILY_DESK_MAX_ASSET_REUSE_TASKS,
    CAMPAIGNCUE_DAILY_DESK_MAX_MANUAL_DELIVERY_TASKS,
    CAMPAIGNCUE_DAILY_DESK_MAX_MISSING_INPUTS,
    CAMPAIGNCUE_DAILY_DESK_MAX_OUTPUT_FORMATS,
    CAMPAIGNCUE_DAILY_DESK_MAX_PHOTO_TASKS,
    CAMPAIGNCUE_DAILY_DESK_MAX_PRINT_FORMATS,
    CAMPAIGNCUE_DAILY_DESK_MAX_RESULT_OPTIONS,
    CAMPAIGNCUE_DAILY_DESK_RECIPES,
} from "@constant/campaigncue/dailyDesk";
import { getCampaignCueOutputPickerItem } from "@constant/campaigncue/outputPicker";
import { buildCampaignCueDecisions, campaignCueRecipeById } from "@lib/campaigncue/decisionEngine";
import {
    buildCampaignCueCampaignRhythm,
    buildCampaignCueExperimentSuggestion,
    buildCampaignCuePresencePassport,
    evaluateCampaignCueCommercialGate,
    evaluateCampaignCuePackFreshness,
    isCampaignCueDecisionSourceInput,
    normalizeCampaignCueLanguagePolicy,
    normalizeCampaignCueOperatingPulse,
} from "@lib/campaigncue/operatingLoop";
import type {
    CampaignCueAIAssistancePlan,
    CampaignCueAnalyticsSummary,
    CampaignCueAsset,
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueCampaignPackReview,
    CampaignCueDailyDesk,
    CampaignCueDailyDeskTask,
    CampaignCueLocation,
    CampaignCueLocalVisibilityCue,
    CampaignCueManualDeliveryCard,
    CampaignCueManualDeliveryField,
    CampaignCueOpportunity,
    CampaignCueOutputPack,
    CampaignCueOutputPackCopyBlock,
    CampaignCueOutputPackCopyChannel,
    CampaignCueOutputPackFile,
    CampaignCueOutputPackStatus,
    CampaignCuePackFreshness,
    CampaignCuePackReadiness,
    CampaignCueSchedule,
    CampaignCueSourceFact,
    CampaignCueSourceInput,
    CampaignCueWorkspace,
} from "@type/campaigncue";

const compactString = (value: unknown, fallback = ""): string => {
    if (typeof value === "string") return value.trim() || fallback;
    if (value == null) return fallback;
    return String(value).trim() || fallback;
};

export const uniqueCompactStrings = (values: Array<string | undefined>, limit: number) => (
    Array.from(new Set(values.map((value) => compactString(value)).filter(Boolean))).slice(0, limit)
);

export function dailyDeskRecipeForBusiness(businessType: CampaignCueBusinessBrain["businessType"]) {
    return CAMPAIGNCUE_DAILY_DESK_RECIPES.find((recipe) => recipe.businessTypes.includes(businessType))
        || CAMPAIGNCUE_DAILY_DESK_RECIPES.find((recipe) => recipe.id === CAMPAIGNCUE_DAILY_DESK_DEFAULT_RECIPE_ID)
        || CAMPAIGNCUE_DAILY_DESK_RECIPES[0];
}

function businessHasCta(businessBrain: CampaignCueBusinessBrain) {
    return Boolean(
        businessBrain.contacts.bookingUrl
        || businessBrain.contacts.publicMenuUrl
        || businessBrain.contacts.website
        || businessBrain.contacts.whatsapp
        || businessBrain.contacts.phone,
    );
}

function buildMissingDailyDeskFacts(businessBrain: CampaignCueBusinessBrain) {
    const missing: string[] = [];
    if (!businessHasCta(businessBrain)) {
        missing.push("Add one phone, WhatsApp, booking, menu, or website next step before using campaign copy.");
    }
    if (businessBrain.businessType === "restaurant" && !businessBrain.contacts.publicMenuUrl) {
        missing.push("Add a public menu link so menu details stay easy to check.");
    }
    if (businessBrain.businessType === "salon" && !businessBrain.contacts.bookingUrl && !businessBrain.contacts.whatsapp) {
        missing.push("Add a booking link or WhatsApp number before booking-slot campaigns.");
    }
    return missing;
}

function buildDailyDeskTask(params: {
    actionLabel: string;
    detail: string;
    id: string;
    kind: CampaignCueDailyDeskTask["kind"];
    label: string;
    severity: CampaignCueDailyDeskTask["severity"];
    inputType?: CampaignCueDailyDeskTask["inputType"];
    ownerGoal?: CampaignCueDailyDeskTask["ownerGoal"];
    resultOptions?: CampaignCueDailyDeskTask["resultOptions"];
    sourceReferences?: string[];
    targetTab: CampaignCueDailyDeskTask["targetTab"];
}): CampaignCueDailyDeskTask {
    return {
        id: params.id,
        kind: params.kind,
        label: params.label,
        detail: params.detail,
        actionLabel: params.actionLabel,
        targetTab: params.targetTab,
        severity: params.severity,
        sourceReferences: params.sourceReferences || [],
        inputType: params.inputType,
        ownerGoal: params.ownerGoal,
        resultOptions: params.resultOptions,
    };
}

function dailyDeskTargetForMissingFact(message: string): CampaignCueDailyDeskTask["targetTab"] {
    const normalized = message.toLowerCase();
    if (/contact|booking|menu|website|phone|whatsapp|link/.test(normalized)) return "details";
    return "sources";
}

function dailyDeskTargetForDecisionInput(type: CampaignCueDailyDeskTask["inputType"]): CampaignCueDailyDeskTask["targetTab"] {
    if (!type) return "sources";
    if (type === "business_cta" || type === "booking_link" || type === "destination_url") return "details";
    if (type === "location_detail" || type === "branch_location" || type === "local_visibility" || type === "review_destination") return "visibility";
    if (type === "commercial_policy" || type === "capacity_or_stock") return "details";
    if (type === "target_language") return "settings";
    if (type === "approved_asset" || type === "asset_rights" || type === "photo" || type === "logo") return "assets";
    if (type === "result_note") return "analytics";
    return "sources";
}

function dailyDeskKindForDecisionInput(type: CampaignCueDailyDeskTask["inputType"]): CampaignCueDailyDeskTask["kind"] {
    if (type === "approved_asset" || type === "asset_rights" || type === "photo" || type === "logo") return "asset_rights";
    if (type === "location_detail" || type === "branch_location") return "location_variant";
    if (type === "local_visibility") return "local_visibility";
    if (type === "commercial_policy") return "commercial_safety";
    if (type === "capacity_or_stock") return "operating_pulse";
    if (type === "review_destination") return "local_visibility";
    if (type === "business_cta" || type === "booking_link" || type === "destination_url") return "business_detail";
    if (type === "result_note") return "result_memory";
    return "source_input";
}

const fieldStatus = (value: string, required = true): CampaignCueManualDeliveryField["status"] => {
    if (compactString(value)) return "ready";
    return required ? "missing" : "needs_review";
};

function deliveryField(params: {
    id: string;
    label: string;
    value?: string;
    copyable?: boolean;
    required?: boolean;
}): CampaignCueManualDeliveryField {
    const value = compactString(params.value);
    const required = params.required !== false;
    return {
        id: params.id,
        label: params.label,
        value: value || (required ? "Needs owner input" : "Optional"),
        copyable: params.copyable !== false && Boolean(value),
        required,
        status: fieldStatus(value, required),
    };
}

function buildOutputHandoffFields(campaign: CampaignCueCampaign, output: CampaignCueCampaign["outputs"][number]) {
    const fields = output.fields;
    if (fields.handoffFields?.length) return fields.handoffFields;
    if (output.channel === "google_local") {
        return [
            deliveryField({ id: "post_type", label: "Post type", value: fields.postType === "google_update" ? "Update / Offer / Event" : fields.postType }),
            deliveryField({ id: "title", label: "Title", value: fields.headline }),
            deliveryField({ id: "description", label: "Description", value: fields.body }),
            deliveryField({ id: "dates", label: "Dates", value: "Confirm offer or event date before posting", required: false }),
            deliveryField({ id: "photo", label: "Photo", value: fields.imageBrief, required: false }),
            deliveryField({ id: "button_link", label: "Button link", value: fields.destination }),
            deliveryField({ id: "terms", label: "Terms", value: fields.policyNote, required: false }),
        ];
    }
    if (output.channel === "whatsapp") {
        return [
            deliveryField({ id: "image", label: "Image", value: fields.imageBrief, required: false }),
            deliveryField({ id: "short_message", label: "Short message", value: output.text }),
            deliveryField({ id: "status_text", label: "Status text", value: fields.headline }),
            deliveryField({ id: "reply_text", label: "Customer reply text", value: fields.cta }),
            deliveryField({ id: "catalog_link", label: "Catalog or menu link", value: fields.destination, required: false }),
        ];
    }
    if (output.channel === "creative") {
        return [
            deliveryField({ id: "square", label: "Square post", value: fields.outputFormats?.find((format) => /square/i.test(format)) || fields.dimensions, required: false }),
            deliveryField({ id: "story", label: "Story", value: fields.outputFormats?.find((format) => /story/i.test(format)) || "Use the story format when needed", required: false }),
            deliveryField({ id: "caption", label: "Caption", value: fields.body }),
            deliveryField({ id: "poster", label: "Poster or flyer", value: fields.printFormats?.[0], required: false }),
            deliveryField({ id: "cta", label: "CTA", value: fields.cta }),
        ];
    }
    if (output.channel === "ads") {
        return [
            deliveryField({ id: "headline", label: "Headline", value: fields.headline }),
            deliveryField({ id: "copy", label: "Ad copy", value: fields.body }),
            deliveryField({ id: "destination", label: "Destination", value: fields.destination }),
            deliveryField({ id: "budget", label: "Budget", value: "Owner approves budget outside CampaignCue", required: false }),
            deliveryField({ id: "utm", label: "UTM", value: fields.utm, required: false }),
        ];
    }
    return [
        deliveryField({ id: "title", label: "Title", value: fields.headline || campaign.title }),
        deliveryField({ id: "copy", label: "Copy", value: fields.body || output.text }),
        deliveryField({ id: "cta", label: "CTA", value: fields.cta }),
        deliveryField({ id: "destination", label: "Destination", value: fields.destination, required: false }),
    ];
}

function buildManualDeliveryCard(campaign: CampaignCueCampaign, output: CampaignCueCampaign["outputs"][number]): CampaignCueManualDeliveryCard {
    const fields = buildOutputHandoffFields(campaign, output);
    const hasBlockedTrust = output.trustGate === "blocked" || output.trustGate === "needs_fix";
    const hasMissingRequired = fields.some((field) => field.required && field.status === "missing");
    return {
        id: `${campaign.id}_${output.id}_handoff`,
        campaignId: campaign.id,
        outputId: output.id,
        channel: output.channel,
        title: output.label,
        ownerUseCase: output.fields.ownerUseCase || "Use this output manually after checking business facts.",
        status: hasBlockedTrust ? "blocked" : hasMissingRequired || output.trustGate === "warning" ? "needs_review" : "ready",
        fields,
        instructions: output.fields.manualSteps || [],
    };
}

function buildLocalVisibilityCues(params: {
    assets: CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
    campaigns: CampaignCueCampaign[];
    locations: CampaignCueLocation[];
    sourceInputs: CampaignCueSourceInput[];
}): CampaignCueLocalVisibilityCue[] {
    const confirmedAssets = params.assets.filter((asset) => asset.status === "ready" && asset.rights.status === "confirmed");
    const activeLocations = params.locations.filter((location) => location.status === "active");
    const hasGoogleOutput = params.campaigns.some((campaign) => campaign.outputs.some((output) => output.channel === "google_local"));
    const hasCurrentInput = params.sourceInputs.some((input) => isCampaignCueDecisionSourceInput(input));
    const presencePassport = buildCampaignCuePresencePassport(params.businessBrain);
    const readyPresenceCount = presencePassport.filter((profile) => profile.status === "ready").length;
    const reviewDestination = presencePassport.find((profile) => profile.id === "presence_google_review");
    const expiredInputs = params.sourceInputs.filter((input) => {
        const value = input.expiresAt;
        if (!value) return false;
        const date = typeof value === "string" || typeof value === "number" || value instanceof Date
            ? new Date(value)
            : typeof (value as { toDate?: unknown }).toDate === "function"
                ? (value as { toDate: () => Date }).toDate()
                : null;
        return Boolean(date && !Number.isNaN(date.getTime()) && date.getTime() < Date.now());
    });
    return [
        {
            id: "visibility_locality",
            label: "Local area is clear",
            detail: params.businessBrain.locality || activeLocations.length
                ? "Campaigns can mention the saved area or branch when needed."
                : "Add area, city, or active branch so local posts do not feel generic.",
            actionLabel: params.businessBrain.locality || activeLocations.length ? "Review details" : "Add area",
            status: params.businessBrain.locality || activeLocations.length ? "ready" : "missing",
            targetTab: params.businessBrain.locality || activeLocations.length ? "details" : "details",
            sourceReferences: activeLocations.map((location) => location.id),
        },
        {
            id: "visibility_recent_update",
            label: "Fresh Google update",
            detail: hasGoogleOutput
                ? "A Google-ready draft exists in the latest packs."
                : "Prepare a Google update, offer, or event draft from current facts.",
            actionLabel: hasGoogleOutput ? "Open Google" : "Create visibility pack",
            status: hasGoogleOutput ? "ready" : "needs_review",
            targetTab: hasGoogleOutput ? "google" : "cues",
            sourceReferences: params.campaigns.slice(0, 2).map((campaign) => campaign.id),
        },
        {
            id: "visibility_current_fact",
            label: "Current fact available",
            detail: hasCurrentInput
                ? "A current owner input can support today's update."
                : "Add one current offer, service, event, or owner note before a local visibility update.",
            actionLabel: hasCurrentInput ? "Review inputs" : "Add input",
            status: hasCurrentInput ? "ready" : "missing",
            targetTab: "sources",
            sourceReferences: params.sourceInputs.slice(0, 3).map((input) => input.id),
        },
        {
            id: "visibility_expired_offer",
            label: "Expired offers checked",
            detail: expiredInputs.length
                ? `${expiredInputs.length} saved input${expiredInputs.length === 1 ? "" : "s"} may be expired. Review before reuse.`
                : "No expired offer or event input is currently blocking local visibility.",
            actionLabel: expiredInputs.length ? "Review inputs" : "Open inputs",
            status: expiredInputs.length ? "needs_review" : "ready",
            targetTab: "sources",
            sourceReferences: expiredInputs.map((input) => input.id),
        },
        {
            id: "visibility_approved_image",
            label: "Approved image ready",
            detail: confirmedAssets.length
                ? "A confirmed image or logo can be reused in a local update."
                : "Add or confirm one real business photo, logo, or storefront image.",
            actionLabel: confirmedAssets.length ? "Open assets" : "Add photo",
            status: confirmedAssets.length ? "ready" : "needs_review",
            targetTab: "assets",
            sourceReferences: confirmedAssets.slice(0, 3).map((asset) => asset.id),
        },
        {
            id: "visibility_presence_passport",
            label: "Local presence passport",
            detail: readyPresenceCount
                ? `${readyPresenceCount} owner-managed destination${readyPresenceCount === 1 ? " is" : "s are"} saved for manual handoff.`
                : "Add the owner-managed profiles customers use to find, contact, or review the business.",
            actionLabel: "Review destinations",
            status: readyPresenceCount ? "ready" : "missing",
            targetTab: "visibility",
            sourceReferences: presencePassport.filter((profile) => profile.destination).map((profile) => profile.id),
        },
        {
            id: "visibility_review_destination",
            label: "Review destination verified",
            detail: reviewDestination?.destination
                ? "A saved review destination can be used in the reputation pack after owner review."
                : "Add the exact customer review destination before preparing a review request.",
            actionLabel: reviewDestination?.destination ? "Review link" : "Add review link",
            status: reviewDestination?.destination ? "ready" : "missing",
            targetTab: "visibility",
            sourceReferences: reviewDestination?.destination ? [reviewDestination.id] : [],
        },
    ];
}

function buildTrustSummary(params: {
    businessBrain: CampaignCueBusinessBrain;
    campaign: CampaignCueCampaign;
    missingInputs: CampaignCueDailyDeskTask[];
    sourceFacts: CampaignCueSourceFact[];
    localVisibilityCues: CampaignCueLocalVisibilityCue[];
    now?: Date;
}): CampaignCueCampaignPackReview["trustSummary"] {
    const blockerCount = params.missingInputs.filter((task) => task.severity === "needs_fix").length;
    const warningCount = params.missingInputs.filter((task) => task.severity === "warning").length;
    const blockedFacts = params.sourceFacts.filter((fact) => fact.risk === "blocked");
    const reviewFacts = params.sourceFacts.filter((fact) => fact.risk === "needs_review");
    const missingVisibility = params.localVisibilityCues.filter((cue) => cue.status === "missing");
    const hasBrandPlaybook = hasBrandPlaybookSignal(params.businessBrain);
    const freshness = evaluateCampaignCuePackFreshness({
        freshness: params.campaign.pack?.freshness,
        now: params.now,
    });
    const commercialGate = params.campaign.pack?.commercialGate || { status: "ready" as const, findings: [] };
    return [
        {
            id: "pack_gate",
            label: "Campaign pack",
            detail: params.campaign.trustGate === "clear"
                ? "Pack checks are clear."
                : "Review the pack before public use.",
            status: params.campaign.trustGate === "blocked" || params.campaign.trustGate === "needs_fix"
                ? "blocked"
                : params.campaign.trustGate === "warning"
                    ? "needs_review"
                    : "ready",
        },
        {
            id: "pack_freshness",
            label: "Current business truth",
            detail: freshness.status === "current"
                ? "Pack is inside its saved truth window. Facts are rechecked again before public-use actions."
                : freshness.status === "expired"
                    ? "The pack has expired. Confirm current facts and create a fresh pack."
                    : freshness.status === "stale"
                        ? "Business facts changed after this pack was created. Create a fresh pack before use."
                        : "This older pack has no freshness receipt. Review current facts before use.",
            status: freshness.status === "expired" || freshness.status === "stale" ? "blocked" : freshness.status === "current" ? "ready" : "needs_review",
        },
        {
            id: "commercial_safety",
            label: "Commercial safety",
            detail: commercialGate.findings.length
                ? commercialGate.findings[0]
                : "Promotion, discount, stock, and capacity rules are clear for this pack.",
            status: commercialGate.status === "blocked" ? "blocked" : commercialGate.status === "needs_review" ? "needs_review" : "ready",
        },
        {
            id: "protected_facts",
            label: "Business facts",
            detail: blockedFacts.length
                ? `${blockedFacts.length} fact${blockedFacts.length === 1 ? "" : "s"} should not be used.`
                : reviewFacts.length
                    ? `${reviewFacts.length} fact${reviewFacts.length === 1 ? "" : "s"} need review.`
                    : `${params.sourceFacts.length} saved fact${params.sourceFacts.length === 1 ? "" : "s"} are available.`,
            status: blockedFacts.length ? "blocked" : reviewFacts.length ? "needs_review" : "ready",
        },
        {
            id: "missing_inputs",
            label: "Missing details",
            detail: blockerCount
                ? `${blockerCount} detail${blockerCount === 1 ? "" : "s"} must be added.`
                : warningCount
                    ? `${warningCount} detail${warningCount === 1 ? "" : "s"} should be checked.`
                    : "No urgent detail is waiting.",
            status: blockerCount ? "blocked" : warningCount ? "needs_review" : "ready",
        },
        {
            id: "brand_playbook",
            label: "Brand Playbook",
            detail: hasBrandPlaybook
                ? "Brand direction is available for campaign proof and creative checks."
                : "Add Brand Playbook details to keep the proof deck and creative briefs from looking generic.",
            status: hasBrandPlaybook ? "ready" : "needs_review",
        },
        {
            id: "local_visibility",
            label: "Local visibility",
            detail: missingVisibility.length
                ? `${missingVisibility.length} local visibility detail${missingVisibility.length === 1 ? "" : "s"} missing.`
                : "Local visibility basics are ready for manual use.",
            status: missingVisibility.length ? "needs_review" : "ready",
        },
        {
            id: "manual_delivery",
            label: "Manual delivery",
            detail: "CampaignCue prepares fields and files. The owner posts, sends, or spends manually outside CampaignCue.",
            status: "ready",
        },
    ];
}

const slugifyPackPart = (value: string, fallback = "campaign") => (
    compactString(value, fallback)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        || fallback
);

const displaySnakeValue = (value: string) => value.replace(/_/g, " ");

const buildLanguageHandoffNote = (businessBrain: CampaignCueBusinessBrain, sourceFacts: CampaignCueSourceFact[]) => {
    const languagePolicy = normalizeCampaignCueLanguagePolicy(businessBrain.languagePolicy, businessBrain.locale);
    const preferredLocale = compactString(languagePolicy.sourceLocale, "workspace default");
    const protectedFacts = uniqueCompactStrings(
        sourceFacts
            .filter((fact) => fact.sourceType === "contact" || fact.sourceType === "offer" || fact.sourceType === "event" || fact.sourceType === "business_profile" || fact.sourceType === "menu_or_service")
            .map((fact) => `${fact.label}: ${fact.value}`),
        8,
    );
    return [
        `Preferred language or locale: ${preferredLocale}`,
        `Requested local-language variants: ${languagePolicy.targetLocales.length ? languagePolicy.targetLocales.join(", ") : "None saved"}`,
        "",
        "Local-language variants are a handoff item in this export/download runtime. CampaignCue does not auto-translate this pack yet.",
        "If the owner, staff, or agency translates the copy manually, keep protected facts unchanged: business name, prices, dates, phone, WhatsApp number, address, links, service or item names, offer terms, and CTA destination.",
        "",
        "Protected facts to keep exact:",
        ...(protectedFacts.length ? protectedFacts.map((fact) => `- ${fact}`) : ["- No protected fact list is available. Confirm business details before translation."]),
    ].join("\n");
};

const hasBrandPlaybookSignal = (businessBrain: CampaignCueBusinessBrain) => {
    const playbook = businessBrain.brandKit.playbook;
    return Boolean(
        playbook.targetAudience
        || playbook.typographyNotes
        || playbook.brandFeel.length
        || playbook.inspirationNotes.length
        || playbook.visualMotifs.length
        || playbook.avoidList.length
        || playbook.productFocus.length,
    );
};

const brandListOrFallback = (values: string[], fallback: string) => (
    values.length ? values.join(", ") : fallback
);

const buildBrandPlaybookSummary = (businessBrain: CampaignCueBusinessBrain) => {
    const playbook = businessBrain.brandKit.playbook;
    return [
        `Target audience: ${playbook.targetAudience || "Needs owner input"}`,
        `Brand feel: ${brandListOrFallback(playbook.brandFeel, "Needs owner input")}`,
        `Inspiration: ${brandListOrFallback(playbook.inspirationNotes, "Not set")}`,
        `Visual motifs: ${brandListOrFallback(playbook.visualMotifs, "Needs owner input")}`,
        `Product or service focus: ${brandListOrFallback(playbook.productFocus, "Use the current campaign focus")}`,
        `Typography notes: ${playbook.typographyNotes || "Not set"}`,
        `Avoid: ${brandListOrFallback(playbook.avoidList, "Unsupported claims, fake testimonials, unavailable items, and off-brand creative")}`,
    ].join("\n");
};

const outputPackStatusFromTrust = (
    status: CampaignCueManualDeliveryCard["status"] | CampaignCueManualDeliveryField["status"] | CampaignCueOutputPackStatus,
): CampaignCueOutputPackStatus => {
    if (status === "blocked") return "blocked";
    if (status === "missing") return "needs_input";
    if (status === "needs_review") return "needs_review";
    return status;
};

const outputPackStatusFromCampaign = (
    campaign: CampaignCueCampaign,
    missingInputs: CampaignCueDailyDeskTask[],
    freshnessStatus?: CampaignCuePackFreshness["status"],
): CampaignCueOutputPackStatus => {
    if (campaign.trustGate === "blocked" || campaign.trustGate === "needs_fix") return "blocked";
    const effectiveFreshnessStatus = freshnessStatus || campaign.pack?.freshness?.status;
    if (effectiveFreshnessStatus === "stale" || effectiveFreshnessStatus === "expired") return "blocked";
    if (missingInputs.some((input) => input.severity === "needs_fix")) return "needs_input";
    if (campaign.trustGate === "warning" || missingInputs.some((input) => input.severity === "warning")) return "needs_review";
    return "ready";
};

const readinessPoints = (status: CampaignCueOutputPackStatus): 0 | 10 | 20 => (
    status === "ready" ? 20 : status === "needs_review" ? 10 : 0
);

export function buildCampaignCuePackReadiness(params: {
    campaign: CampaignCueCampaign;
    deliveryCards: CampaignCueManualDeliveryCard[];
    missingInputs: CampaignCueDailyDeskTask[];
    trustSummary: CampaignCueCampaignPackReview["trustSummary"];
    workspace: CampaignCueWorkspace;
    now?: Date;
}): CampaignCuePackReadiness {
    const requiredInputs = params.missingInputs.filter((input) => input.severity === "needs_fix");
    const reviewInputs = params.missingInputs.filter((input) => input.severity === "warning");
    const blockedTrust = params.trustSummary.filter((item) => item.status === "blocked");
    const reviewTrust = params.trustSummary.filter((item) => item.status === "needs_review");
    const freshness = evaluateCampaignCuePackFreshness({
        freshness: params.campaign.pack?.freshness,
        now: params.now,
    });
    const approvalRequired = params.workspace.agencyMode
        || params.campaign.ownerApprovalState !== "not_requested";
    const factsStatus: CampaignCueOutputPackStatus = requiredInputs.length
        ? "needs_input"
        : reviewInputs.length ? "needs_review" : "ready";
    const trustStatus: CampaignCueOutputPackStatus = blockedTrust.length
        ? "blocked"
        : reviewTrust.length ? "needs_review" : "ready";
    const freshnessStatus: CampaignCueOutputPackStatus = freshness.status === "stale" || freshness.status === "expired"
        ? "blocked"
        : freshness.status === "unknown" ? "needs_review" : "ready";
    const approvalStatus: CampaignCueOutputPackStatus = !approvalRequired
        ? "ready"
        : params.campaign.ownerApprovalState === "approved" ? "ready" : "blocked";
    const deliveryStatus: CampaignCueOutputPackStatus = !params.deliveryCards.length
        ? "needs_input"
        : params.deliveryCards.some((card) => card.status === "blocked")
            ? "blocked"
            : params.deliveryCards.some((card) => card.status === "needs_review")
                ? "needs_review"
                : "ready";
    const checks: CampaignCuePackReadiness["checks"] = [
        {
            id: "facts",
            label: "Required facts",
            detail: requiredInputs.length
                ? `${requiredInputs.length} required detail${requiredInputs.length === 1 ? " is" : "s are"} missing.`
                : reviewInputs.length
                    ? `${reviewInputs.length} detail${reviewInputs.length === 1 ? " needs" : "s need"} review.`
                    : "Required campaign details are present.",
            status: factsStatus,
            points: readinessPoints(factsStatus),
        },
        {
            id: "trust",
            label: "Trust checks",
            detail: blockedTrust[0]?.detail || reviewTrust[0]?.detail || "No blocked trust finding is present.",
            status: trustStatus,
            points: readinessPoints(trustStatus),
        },
        {
            id: "freshness",
            label: "Current business truth",
            detail: freshness.status === "current"
                ? "The pack is inside its saved truth window."
                : freshness.status === "unknown"
                    ? "This pack needs a current-truth review."
                    : `The pack is ${freshness.status}; rebuild it before use.`,
            status: freshnessStatus,
            points: readinessPoints(freshnessStatus),
        },
        {
            id: "approval",
            label: "Owner approval",
            detail: !approvalRequired
                ? "No approval gate is active for this pack."
                : params.campaign.ownerApprovalState === "approved"
                    ? "The pack is approved."
                    : params.campaign.ownerApprovalState === "rejected"
                        ? "The pack was rejected and cannot be used."
                        : params.campaign.ownerApprovalState === "requested"
                            ? "Approval is waiting."
                            : "Approval is required before use.",
            status: approvalStatus,
            points: readinessPoints(approvalStatus),
        },
        {
            id: "delivery",
            label: "Manual handoff",
            detail: !params.deliveryCards.length
                ? "Create channel handoff fields before use."
                : deliveryStatus === "ready"
                    ? "Required manual handoff fields are ready."
                    : "One or more handoff fields need review.",
            status: deliveryStatus,
            points: readinessPoints(deliveryStatus),
        },
    ];
    const status: CampaignCueOutputPackStatus = checks.some((check) => check.status === "blocked")
        ? "blocked"
        : checks.some((check) => check.status === "needs_input")
            ? "needs_input"
            : checks.some((check) => check.status === "needs_review")
                ? "needs_review"
                : "ready";
    const score = checks.reduce((total, check) => total + check.points, 0);
    return {
        label: "Pack readiness",
        score,
        status,
        summary: status === "ready"
            ? "Facts, trust, freshness, approval, and manual handoff are ready."
            : status === "blocked"
                ? "Resolve the blocked check before manual use."
                : status === "needs_input"
                    ? "Add the required detail before manual use."
                    : "Review the flagged checks before manual use.",
        checks,
        predictionBoundary: "readiness_only_no_engagement_prediction",
    };
}

const outputPackChannelFolder = (channel: CampaignCueOutputPackCopyChannel) => {
    if (channel === "google_local") return "google-business-profile";
    if (channel === "creative") return "instagram";
    if (channel === "email_sms") return "email-sms";
    if (channel === "mini_page") return "mini-page";
    if (channel === "proof_deck") return "proof-deck";
    if (channel === "result_memory") return "result";
    if (channel === "ads") return "ads-handoff";
    return slugifyPackPart(channel);
};

const outputPackFile = (params: {
    content: string;
    fileType?: CampaignCueOutputPackFile["fileType"];
    label: string;
    path: string;
    sourceOutputId?: string;
    status?: CampaignCueOutputPackStatus;
}): CampaignCueOutputPackFile => ({
    content: params.content.trim() ? `${params.content.trim()}\n` : "Needs owner input.\n",
    fileType: params.fileType || "text",
    label: params.label,
    path: params.path,
    sourceOutputId: params.sourceOutputId,
    status: params.status || "ready",
});

const outputPackCopyBlock = (params: {
    channel: CampaignCueOutputPackCopyChannel;
    id: string;
    label: string;
    sourceOutputId?: string;
    status?: CampaignCueOutputPackStatus;
    value: string;
}): CampaignCueOutputPackCopyBlock => ({
    channel: params.channel,
    id: params.id,
    label: params.label,
    sourceOutputId: params.sourceOutputId,
    status: params.status || (compactString(params.value) ? "ready" : "needs_input"),
    value: compactString(params.value, "Needs owner input"),
});

const outputPackBlocksForCard = (card: CampaignCueManualDeliveryCard): CampaignCueOutputPackCopyBlock[] => (
    card.fields.map((field) => outputPackCopyBlock({
        channel: card.channel,
        id: `${card.id}_${field.id}`,
        label: field.label,
        sourceOutputId: card.outputId,
        status: outputPackStatusFromTrust(field.status),
        value: field.value,
    }))
);

function aiAssistanceStatusFromTask(task?: CampaignCueDailyDeskTask): CampaignCueOutputPackStatus {
    if (!task) return "ready";
    if (task.severity === "needs_fix") return "needs_input";
    if (task.severity === "warning") return "needs_review";
    if (task.severity === "ready") return "ready";
    return "needs_review";
}

function buildCampaignCueAIAssistancePlan(params: {
    assets: CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
    campaign?: CampaignCueCampaign;
    decision?: CampaignCueCampaignPackReview["decision"];
    missingInputs: CampaignCueDailyDeskTask[];
    recipe: CampaignCueDailyDesk["recipe"];
    readyPack?: CampaignCueDailyDesk["readyPack"];
    sourceFacts: CampaignCueSourceFact[];
    sourceInputs: CampaignCueSourceInput[];
    trustSummary?: CampaignCueCampaignPackReview["trustSummary"];
}): CampaignCueAIAssistancePlan {
    const activeInputs = params.sourceInputs.filter((input) => isCampaignCueDecisionSourceInput(input));
    const reviewInputs = params.sourceInputs.filter((input) => input.status === "needs_review");
    const confirmedAssets = params.assets.filter((asset) => asset.status === "ready" && asset.rights.status === "confirmed");
    const reviewAssets = params.assets.filter((asset) => asset.rights.status === "needs_review");
    const primaryMissingInput = params.missingInputs.find((task) => task.severity === "needs_fix")
        || params.missingInputs.find((task) => task.severity === "warning")
        || params.missingInputs[0];
    const trustItems = params.trustSummary || [];
    const blockedTrust = trustItems.filter((item) => item.status === "blocked");
    const reviewTrust = trustItems.filter((item) => item.status === "needs_review");
    const sourceReferences = uniqueCompactStrings([
        params.businessBrain.sourceSnapshotId || "current",
        ...activeInputs.slice(0, 4).map((input) => input.id),
        ...params.sourceFacts.slice(0, 4).map((fact) => fact.id),
    ], 8);
    const providerDisabledGuardrail = "No provider call runs in this runtime; AI candidates stay review-only until the provider flag is explicitly enabled.";
    const protectedFactGuardrail = "Prices, dates, contacts, locations, claims, and destinations come only from confirmed business facts.";
    const approvalGuardrail = "Owner approval is required before a generated suggestion changes a campaign, editor document, or export pack.";
    const items: CampaignCueAIAssistancePlan["items"] = [
        {
            id: "ai_source_intake",
            stage: "source_intake",
            label: "Turn rough inputs into usable facts",
            ownerValue: "Owner notes, old posters, website text, and uploaded details become a short checklist of confirmed facts and missing details.",
            currentInput: activeInputs.length
                ? `${activeInputs.length} current input${activeInputs.length === 1 ? "" : "s"} available.`
                : reviewInputs.length
                    ? `${reviewInputs.length} input${reviewInputs.length === 1 ? "" : "s"} need review.`
                    : "No current campaign input is available.",
            suggestedAction: activeInputs.length ? "Use the current inputs for the next safe pack." : "Add one current offer, event, item, slot, or owner note.",
            targetTab: "sources",
            status: activeInputs.length ? "ready" : reviewInputs.length ? "needs_review" : "needs_input",
            authority: "deterministic",
            providerCallAllowed: false,
            costTier: "none",
            sourceReferences,
            guardrails: [providerDisabledGuardrail, protectedFactGuardrail],
        },
        {
            id: "ai_missing_input",
            stage: "missing_input",
            label: "Ask only the next missing detail",
            ownerValue: "Instead of asking for a prompt, CampaignCue asks the smallest fact needed to unlock the campaign pack.",
            currentInput: primaryMissingInput?.detail || "No required input is waiting.",
            suggestedAction: primaryMissingInput?.actionLabel || "Continue with the current pack.",
            targetTab: primaryMissingInput?.targetTab || "campaigns",
            status: aiAssistanceStatusFromTask(primaryMissingInput),
            authority: "deterministic",
            providerCallAllowed: false,
            costTier: "none",
            sourceReferences: primaryMissingInput?.sourceReferences || sourceReferences,
            guardrails: [protectedFactGuardrail, "The missing-input gate blocks final pack creation when required facts are absent."],
        },
        {
            id: "ai_pack_drafting",
            stage: "pack_drafting",
            label: "Draft the pack from approved facts",
            ownerValue: "AI can later help phrase WhatsApp, Google, Instagram, staff, and print handoff copy from the same checked facts.",
            currentInput: params.campaign
                ? `${params.campaign.outputs.length} output${params.campaign.outputs.length === 1 ? "" : "s"} are in the latest pack.`
                : "No generated pack is available yet.",
            suggestedAction: params.campaign ? "Review the generated pack and export manually." : "Create the recommended pack after required inputs are ready.",
            targetTab: params.campaign ? "campaigns" : "cues",
            status: params.campaign ? (params.readyPack ? "ready" : "needs_review") : "needs_input",
            authority: "model_candidate_only",
            providerCallAllowed: false,
            costTier: "none",
            sourceReferences: params.campaign ? [params.campaign.id] : sourceReferences,
            guardrails: [providerDisabledGuardrail, approvalGuardrail, "The decision engine, not the model, chooses the campaign recipe."],
        },
        {
            id: "ai_trust_explainer",
            stage: "trust_explainer",
            label: "Explain what is safe, risky, or blocked",
            ownerValue: "Trust findings become plain owner language so the business knows whether it can use the pack today.",
            currentInput: blockedTrust.length
                ? `${blockedTrust.length} blocked check${blockedTrust.length === 1 ? "" : "s"} found.`
                : reviewTrust.length
                    ? `${reviewTrust.length} check${reviewTrust.length === 1 ? "" : "s"} need review.`
                    : "No blocked trust check is present.",
            suggestedAction: blockedTrust[0]?.detail || reviewTrust[0]?.detail || "Keep the checked facts with the pack.",
            targetTab: "trust",
            status: blockedTrust.length ? "blocked" : reviewTrust.length ? "needs_review" : "ready",
            authority: "deterministic",
            providerCallAllowed: false,
            costTier: "none",
            sourceReferences: trustItems.slice(0, 6).map((item) => item.id),
            guardrails: [protectedFactGuardrail, "Trust findings are computed from CampaignCue checks and are not model verdicts."],
        },
        {
            id: "ai_result_interpreter",
            stage: "result_interpreter",
            label: "Learn from what happened",
            ownerValue: "A short owner result can later improve recommendations without connecting social accounts or reading customer conversations.",
            currentInput: params.recipe.resultQuestion,
            suggestedAction: params.campaign ? "Record the result after using this pack." : "Create and use a pack before recording a result.",
            targetTab: "analytics",
            status: params.campaign ? "ready" : "needs_input",
            authority: "deterministic",
            providerCallAllowed: false,
            costTier: "none",
            sourceReferences: params.campaign ? [params.campaign.id] : [],
            guardrails: [providerDisabledGuardrail, "Do not paste customer contact lists, private chats, or unsupported evidence."],
        },
        {
            id: "ai_photo_coach",
            stage: "photo_coach",
            label: "Guide the next useful photo",
            ownerValue: "CampaignCue points the owner toward real photos and old assets before generic visuals.",
            currentInput: confirmedAssets.length
                ? `${confirmedAssets.length} approved asset${confirmedAssets.length === 1 ? "" : "s"} can be reused.`
                : reviewAssets.length
                    ? `${reviewAssets.length} asset${reviewAssets.length === 1 ? "" : "s"} need rights review.`
                    : "No approved campaign photo is available.",
            suggestedAction: confirmedAssets.length ? "Reuse the approved photo in the pack." : (params.recipe.photoTasks[0] || "Add one clear business photo and confirm rights."),
            targetTab: "assets",
            status: confirmedAssets.length ? "ready" : reviewAssets.length ? "needs_review" : "needs_input",
            authority: "deterministic",
            providerCallAllowed: false,
            costTier: "none",
            sourceReferences: [...confirmedAssets, ...reviewAssets].slice(0, 4).map((asset) => asset.id),
            guardrails: ["Real business photos and confirmed rights come before generic image generation.", providerDisabledGuardrail],
        },
    ];
    const planStatus: CampaignCueOutputPackStatus = items.some((item) => item.status === "blocked")
        ? "blocked"
        : items.some((item) => item.status === "needs_input")
            ? "needs_input"
            : items.some((item) => item.status === "needs_review")
                ? "needs_review"
                : "ready";
    const nextItem = items.find((item) => item.status === "blocked")
        || items.find((item) => item.status === "needs_input")
        || items.find((item) => item.status === "needs_review")
        || items[0];
    return {
        status: planStatus,
        items,
        nextBestAction: {
            label: nextItem.label,
            targetTab: nextItem.targetTab,
            detail: nextItem.suggestedAction,
        },
        costPolicy: {
            firestoreReads: 0,
            firestoreWrites: 0,
            firestoreDeletes: 0,
            storageWrites: 0,
            providerCalls: 0,
            summary: "Built from the already-loaded CampaignCue overview, Daily Desk, output pack, trust summary, and asset metadata. It adds no Firebase read, write, delete, Storage artifact, or provider call.",
        },
        providerPolicy: {
            modelDecidesCampaign: false,
            modelMutatesFacts: false,
            ownerApprovalRequired: true,
            summary: "AI is treated as a candidate helper for wording, interpretation, and coaching only. Facts, campaign decisions, safety gates, patches, exports, and result memory remain deterministic and owner-approved.",
        },
    };
}

function buildCampaignCueOutputPack(params: {
    assets: CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
    campaign: CampaignCueCampaign;
    campaigns: CampaignCueCampaign[];
    deliveryCards: CampaignCueManualDeliveryCard[];
    decision?: CampaignCueCampaignPackReview["decision"];
    localVisibilityCues: CampaignCueLocalVisibilityCue[];
    missingInputs: CampaignCueDailyDeskTask[];
    readyPack?: CampaignCueDailyDesk["readyPack"];
    recipe: CampaignCueDailyDesk["recipe"];
    rhythm: CampaignCueDailyDesk["rhythm"];
    sourceFacts: CampaignCueSourceFact[];
    sourceInputs: CampaignCueSourceInput[];
    trustSummary: CampaignCueCampaignPackReview["trustSummary"];
    workspace: CampaignCueWorkspace;
    now?: Date;
}): CampaignCueOutputPack {
    const slug = slugifyPackPart(params.campaign.title);
    const decision = params.decision;
    const outputIntent = getCampaignCueOutputPickerItem(params.campaign.pack?.outputIntentId);
    const freshness = evaluateCampaignCuePackFreshness({
        freshness: params.campaign.pack?.freshness,
        now: params.now,
    });
    const packStatus = outputPackStatusFromCampaign(params.campaign, params.missingInputs, freshness.status);
    const allBlocks = params.deliveryCards.flatMap((card) => outputPackBlocksForCard(card));
    const blocksFor = (channel: CampaignCueOutputPackCopyChannel) => allBlocks.filter((block) => block.channel === channel);
    const destination = params.businessBrain.contacts.bookingUrl
        || params.businessBrain.contacts.publicMenuUrl
        || params.businessBrain.contacts.website
        || params.businessBrain.contacts.whatsapp
        || params.businessBrain.contacts.phone
        || "";
    const primaryOutput = params.campaign.outputs[0];
    const primaryCopy = primaryOutput?.text || params.campaign.brief;
    const trustReady = params.trustSummary.filter((item) => item.status === "ready").map((item) => `${item.label}: ${item.detail}`);
    const trustWarnings = params.trustSummary.filter((item) => item.status === "needs_review").map((item) => `${item.label}: ${item.detail}`);
    const trustBlocked = params.trustSummary.filter((item) => item.status === "blocked").map((item) => `${item.label}: ${item.detail}`);
    const readiness = buildCampaignCuePackReadiness({
        campaign: params.campaign,
        deliveryCards: params.deliveryCards,
        missingInputs: params.missingInputs,
        trustSummary: params.trustSummary,
        workspace: params.workspace,
        now: params.now,
    });
    const commercialEvaluation = evaluateCampaignCueCommercialGate({
        businessBrain: params.businessBrain,
        recipe: params.recipe,
        sourceInputs: params.sourceInputs,
    });
    const commercialSafety = {
        status: commercialEvaluation.status,
        findings: commercialEvaluation.findings,
    };
    const languagePolicy = normalizeCampaignCueLanguagePolicy(params.businessBrain.languagePolicy, params.businessBrain.locale);
    const presenceProfiles = buildCampaignCuePresencePassport(params.businessBrain);
    const readyPresenceCount = presenceProfiles.filter((profile) => profile.status === "ready").length;
    const operatingPulse = normalizeCampaignCueOperatingPulse(params.businessBrain.operatingPulse);
    const learning = params.campaign.pack?.experiment || buildCampaignCueExperimentSuggestion({
        assets: params.assets,
        businessBrain: params.businessBrain,
        campaigns: params.campaigns,
        recipe: params.recipe,
    });
    const missingInputs = params.missingInputs.map((input) => {
        const matchingDecisionInput = decision?.missingInputs.find((item) => item.type === input.inputType);
        return {
            type: input.inputType || "current_offer",
            ownerQuestion: input.detail,
            required: input.severity === "needs_fix",
            unlocks: uniqueCompactStrings([
                ...(matchingDecisionInput?.unlocks || []).map((unlock) => displaySnakeValue(unlock)),
                ...params.recipe.outputFormats.slice(0, 2),
                ...params.recipe.printFormats.slice(0, 1),
            ], 5),
        };
    });
    const confirmedAssetRefs = params.assets
        .filter((asset) => asset.status === "ready" && asset.rights.status === "confirmed")
        .map((asset) => asset.id);
    const editableDocumentRef = params.campaign.outputs.find((output) => output.channel === "creative")?.id
        ? `campaign-output://${params.campaign.id}/creative`
        : undefined;
    const visualAssets = params.campaign.outputs.map((output) => ({
        channel: output.channel,
        size: output.fields.dimensions,
        exportFormat: "text_brief" as const,
        assetRef: `campaign-output://${params.campaign.id}/${output.id}`,
        status: output.trustGate === "clear"
            ? "ready" as const
            : output.trustGate === "warning"
                ? "needs_review" as const
                : "blocked" as const,
        note: output.fields.imageBrief,
    }));
    const emailSmsBlocks: CampaignCueOutputPackCopyBlock[] = [
        outputPackCopyBlock({
            channel: "email_sms",
            id: "email_subject",
            label: "Email subject",
            value: params.campaign.title,
        }),
        outputPackCopyBlock({
            channel: "email_sms",
            id: "email_preview",
            label: "Preview text",
            value: decision?.explanation.whyThis[0] || params.recipe.plainAction,
        }),
        outputPackCopyBlock({
            channel: "email_sms",
            id: "email_body",
            label: "Email body",
            value: `${primaryCopy}\n\nNext step: ${destination || "Add a phone, booking, menu, or website link before sending."}`,
        }),
        outputPackCopyBlock({
            channel: "email_sms",
            id: "sms_text",
            label: "SMS text",
            value: `${params.campaign.title}: ${primaryOutput?.fields.cta || "Reply for details."}`,
        }),
    ];
    const staffBlocks: CampaignCueOutputPackCopyBlock[] = [
        outputPackCopyBlock({
            channel: "staff",
            id: "staff_share_message",
            label: "Staff share message",
            value: `Please share today's campaign: ${params.campaign.title}. Use this text: ${primaryCopy}`,
        }),
        outputPackCopyBlock({
            channel: "staff",
            id: "counter_script",
            label: "Counter script",
            value: `If customers ask, say: "${primaryOutput?.fields.cta || "The owner has the current details and next step ready."}"`,
        }),
        outputPackCopyBlock({
            channel: "staff",
            id: "owner_instruction",
            label: "Owner-to-staff instruction",
            value: "Use only the checked details in this pack. Do not add prices, dates, or claims that are not confirmed.",
        }),
    ];
    const miniPageBlocks: CampaignCueOutputPackCopyBlock[] = [
        outputPackCopyBlock({
            channel: "mini_page",
            id: "mini_page_title",
            label: "Mini-page title",
            value: params.campaign.title,
        }),
        outputPackCopyBlock({
            channel: "mini_page",
            id: "mini_page_details",
            label: "Offer/page details",
            value: primaryCopy,
        }),
        outputPackCopyBlock({
            channel: "mini_page",
            id: "mini_page_cta",
            label: "CTA button",
            value: primaryOutput?.fields.cta || destination,
        }),
        outputPackCopyBlock({
            channel: "mini_page",
            id: "mini_page_destination",
            label: "Destination link or contact",
            status: destination ? "ready" : "needs_input",
            value: destination,
        }),
        outputPackCopyBlock({
            channel: "mini_page",
            id: "mini_page_terms",
            label: "Terms",
            value: primaryOutput?.fields.policyNote || "Check terms before sharing.",
        }),
    ];
    const instructionBlocks: CampaignCueOutputPackCopyBlock[] = [
        outputPackCopyBlock({
            channel: "instructions",
            id: "use_this_campaign",
            label: "Use this campaign",
            value: "Download the pack, copy the channel fields, post or send manually from the owner-controlled channel, then record what happened.",
        }),
        outputPackCopyBlock({
            channel: "instructions",
            id: "manual_boundary",
            label: "Manual boundary",
            value: "CampaignCue does not directly post, send WhatsApp messages, connect provider accounts, or start ad spend in this runtime.",
        }),
        outputPackCopyBlock({
            channel: "instructions",
            id: "language_handoff",
            label: "Language handoff",
            value: buildLanguageHandoffNote(params.businessBrain, params.sourceFacts),
        }),
    ];
    const proofDeckStatus: CampaignCueOutputPackStatus = hasBrandPlaybookSignal(params.businessBrain) ? "ready" : "needs_review";
    const outputLabels = uniqueCompactStrings(
        params.campaign.outputs.map((output) => `${output.label}: ${output.fields.postType}`),
        10,
    );
    const proofDeckSections: CampaignCueOutputPackCopyBlock[] = [
        outputPackCopyBlock({
            channel: "proof_deck",
            id: "proof_brand_system",
            label: "Brand system",
            status: proofDeckStatus,
            value: buildBrandPlaybookSummary(params.businessBrain),
        }),
        outputPackCopyBlock({
            channel: "proof_deck",
            id: "proof_campaign_creatives",
            label: "Campaign and social creative set",
            value: [
                `Campaign: ${params.campaign.title}`,
                `Outputs: ${outputLabels.join(", ") || "Use the current campaign outputs"}`,
                `ZIP root: ${slug}-campaign-pack`,
                "Social creative remains source-backed and manually exported. CampaignCue does not pretend a final rendered file exists before export.",
            ].join("\n"),
        }),
        outputPackCopyBlock({
            channel: "proof_deck",
            id: "proof_product_focus",
            label: "Product or service focus",
            value: [
                `Primary headline: ${primaryOutput?.fields.headline || params.campaign.title}`,
                `Owner CTA: ${primaryOutput?.fields.cta || destination || "Needs owner input"}`,
                `Focus notes: ${brandListOrFallback(params.businessBrain.brandKit.playbook.productFocus, params.recipe.plainAction)}`,
            ].join("\n"),
        }),
        outputPackCopyBlock({
            channel: "proof_deck",
            id: "proof_ugc_reel_reference",
            label: "UGC and reel reference",
            value: [
                "UGC and reel entries are script, shot-list, dialogue/action beat sheet, camera-plan, product-placement, or B-roll references only.",
                "Use real staff, owner, creator, or customer experiences only with consent.",
                "Do not present an AI avatar, stock person, or fictional customer as a real customer experience.",
                "Do not turn the brief into a fake testimonial, fake review, or unsupported result claim.",
            ].join("\n"),
        }),
        outputPackCopyBlock({
            channel: "proof_deck",
            id: "proof_review_checklist",
            label: "Review checklist",
            value: [
                `Trust status: ${trustBlocked.length ? "blocked" : trustWarnings.length ? "needs review" : "ready"}`,
                "Confirm business facts, CTA, dates, prices, photo rights, brand direction, avoid list, and manual delivery boundary.",
                "Keep hosted mini-page publishing, provider posting, WhatsApp sending, and ad spend off until their separate gates are enabled.",
            ].join("\n"),
        }),
        outputPackCopyBlock({
            channel: "proof_deck",
            id: "proof_brief_trace",
            label: "Brief trace",
            value: [
                `Decision: ${decision?.recommendationTitle || params.recipe.title}`,
                `Why this: ${(decision?.explanation.whyThis.length ? decision.explanation.whyThis : [params.recipe.plainAction]).join(" | ")}`,
                `Source facts: ${params.sourceFacts.map((fact) => `${fact.label}: ${fact.value}`).join(" | ") || "No source facts available"}`,
            ].join("\n"),
        }),
    ];
    const proofDeckContent = [
        "# Campaign proof deck",
        "",
        "This is a review brief for agency/client approval and manual export. It is not a final rendered PDF, website, social post, or generated video.",
        "",
        ...proofDeckSections.map((block) => `## ${block.label}\n${block.value}`),
    ].join("\n\n");
    const aiAssistance = buildCampaignCueAIAssistancePlan({
        assets: params.assets,
        businessBrain: params.businessBrain,
        campaign: params.campaign,
        decision,
        missingInputs: params.missingInputs,
        readyPack: params.readyPack,
        recipe: params.recipe,
        sourceFacts: params.sourceFacts,
        sourceInputs: params.sourceInputs,
        trustSummary: params.trustSummary,
    });
    const aiAssistanceContent = [
        "# CampaignCue assistant work plan",
        "",
        "This plan shows where AI can reduce owner work without becoming the campaign authority.",
        "",
        `Overall status: ${aiAssistance.status}`,
        `Next action: ${aiAssistance.nextBestAction.label} - ${aiAssistance.nextBestAction.detail}`,
        "",
        "## Cost and provider policy",
        aiAssistance.costPolicy.summary,
        aiAssistance.providerPolicy.summary,
        "",
        "## Work items",
        ...aiAssistance.items.map((item) => [
            `### ${item.label}`,
            `Stage: ${item.stage}`,
            `Status: ${item.status}`,
            `Current input: ${item.currentInput}`,
            `Suggested action: ${item.suggestedAction}`,
            `Authority: ${item.authority}`,
            `Provider call allowed: ${item.providerCallAllowed ? "yes" : "no"}`,
            `Cost tier: ${item.costTier}`,
            `Guardrails: ${item.guardrails.join(" | ")}`,
        ].join("\n")),
    ].join("\n\n");
    const copy = {
        whatsapp: blocksFor("whatsapp"),
        googleBusinessProfile: blocksFor("google_local"),
        instagram: blocksFor("creative"),
        emailSms: emailSmsBlocks,
        adsHandoff: blocksFor("ads"),
        staff: staffBlocks,
        instructions: instructionBlocks,
    };
    const fileBlocks = [
        ...allBlocks,
        ...emailSmsBlocks,
        ...staffBlocks,
        ...miniPageBlocks,
        ...instructionBlocks,
    ];
    const channelFiles = fileBlocks.map((block) => outputPackFile({
        content: block.value,
        label: block.label,
        path: `${outputPackChannelFolder(block.channel)}/${slugifyPackPart(block.label, block.id)}.txt`,
        sourceOutputId: block.sourceOutputId,
        status: block.status,
    }));
    const printContent = [
        "# Print and offline pack",
        ...uniqueCompactStrings([
            ...(params.readyPack?.printFormats || []),
            ...params.recipe.printFormats,
        ], CAMPAIGNCUE_DAILY_DESK_MAX_PRINT_FORMATS).map((format) => `- ${format}`),
        "",
        "Use the checked CTA and the same business facts from this pack. Generate or export flattened print files from the editor before printing.",
    ].join("\n");
    const files: CampaignCueOutputPackFile[] = [
        outputPackFile({
            content: [
                `# ${params.campaign.title}`,
                "",
                `Decision: ${decision?.recommendationTitle || params.recipe.title}`,
                `Confidence: ${decision?.confidence || "medium"}`,
                "",
                "## Why this",
                ...(decision?.explanation.whyThis.length ? decision.explanation.whyThis : [params.recipe.plainAction]).map((item) => `- ${item}`),
                "",
                "## Why now",
                ...(decision?.explanation.whyNow.length ? decision.explanation.whyNow : [params.recipe.whenToUse]).map((item) => `- ${item}`),
            ].join("\n"),
            fileType: "markdown",
            label: "Decision card",
            path: "decision/decision-card.md",
            status: packStatus,
        }),
        outputPackFile({
            content: missingInputs.length
                ? missingInputs.map((input, index) => `${index + 1}. ${input.ownerQuestion}\n   Unlocks: ${input.unlocks.join(", ") || "Campaign pack review"}`).join("\n")
                : "No blocking input is waiting.",
            label: "Missing input checklist",
            path: "missing-inputs/missing-input-checklist.txt",
            status: missingInputs.some((input) => input.required) ? "needs_input" : "ready",
        }),
        outputPackFile({
            content: [
                `Business state: ${operatingPulse.businessState}`,
                `Capacity: ${operatingPulse.capacityStatus}`,
                `Stock: ${operatingPulse.stockStatus}`,
                operatingPulse.localMoment ? `Local moment: ${operatingPulse.localMoment}` : "Local moment: Not set",
                operatingPulse.note ? `Owner note: ${operatingPulse.note}` : "Owner note: Not set",
                `Commercial status: ${commercialSafety.status}`,
                ...(commercialSafety.findings.length ? commercialSafety.findings.map((finding) => `- ${finding}`) : ["- No commercial blocker recorded."]),
            ].join("\n"),
            label: "Operating and commercial check",
            path: "trust/operating-and-commercial-check.txt",
            status: commercialSafety.status === "blocked" ? "blocked" : commercialSafety.status === "needs_review" ? "needs_review" : "ready",
        }),
        outputPackFile({
            content: [
                "# Local presence passport",
                "",
                ...presenceProfiles.map((profile) => `- ${profile.label}: ${profile.destination || "Needs owner input"}. ${profile.manualAction}.`),
            ].join("\n"),
            fileType: "markdown",
            label: "Local presence passport",
            path: "instructions/local-presence-passport.md",
            status: readyPresenceCount ? "needs_review" : "needs_input",
        }),
        outputPackFile({
            content: [
                `Change one variable: ${learning.variable}`,
                learning.instruction,
                `Reason: ${learning.reason}`,
            ].join("\n"),
            label: "Next campaign test",
            path: "result/next-one-variable-test.txt",
            status: "ready",
        }),
        ...channelFiles,
        outputPackFile({
            content: printContent,
            fileType: "pdf_brief",
            label: "Print and offline pack",
            path: "print/print-formats-and-qr-card-brief.md",
            status: params.recipe.printFormats.length ? "ready" : "needs_review",
        }),
        outputPackFile({
            content: proofDeckContent,
            fileType: "pdf_brief",
            label: "Campaign proof deck",
            path: "proof-deck/campaign-proof-deck.md",
            status: proofDeckStatus,
        }),
        outputPackFile({
            content: [
                "# Trust summary",
                "",
                "## Ready",
                ...(trustReady.length ? trustReady : ["No ready checks recorded."]).map((item) => `- ${item}`),
                "",
                "## Needs review",
                ...(trustWarnings.length ? trustWarnings : ["No review warnings recorded."]).map((item) => `- ${item}`),
                "",
                "## Blocked",
                ...(trustBlocked.length ? trustBlocked : ["No blocked checks recorded."]).map((item) => `- ${item}`),
            ].join("\n"),
            fileType: "markdown",
            label: "Trust summary",
            path: "trust/trust-summary.md",
            status: trustBlocked.length ? "blocked" : trustWarnings.length ? "needs_review" : "ready",
        }),
        outputPackFile({
            content: [
                "# Pack readiness",
                "",
                `Score: ${readiness.score}/100`,
                `Status: ${readiness.status}`,
                readiness.summary,
                "",
                ...readiness.checks.map((check) => `- ${check.label}: ${check.points}/20, ${check.status}. ${check.detail}`),
                "",
                "This score measures facts, trust, freshness, approval, and manual handoff completeness. It does not predict engagement, reach, or performance.",
            ].join("\n"),
            fileType: "markdown",
            label: "Pack readiness",
            path: "trust/pack-readiness.md",
            status: readiness.status,
        }),
        outputPackFile({
            content: [
                "# Use this campaign",
                "",
                ...instructionBlocks.map((block) => `## ${block.label}\n${block.value}`),
                "",
                "## Manual steps",
                ...(params.readyPack?.manualSteps.length ? params.readyPack.manualSteps : params.recipe.manualDeliveryTasks).map((step, index) => `${index + 1}. ${step}`),
            ].join("\n"),
            fileType: "markdown",
            label: "Use this campaign",
            path: "instructions/use-this-campaign.md",
            status: "ready",
        }),
        outputPackFile({
            content: aiAssistanceContent,
            fileType: "markdown",
            label: "Assistant work plan",
            path: "instructions/assistant-work-plan.md",
            status: aiAssistance.status,
        }),
        outputPackFile({
            content: [
                "# Campaign rhythm",
                "",
                `Next action: ${params.rhythm.title}`,
                params.rhythm.detail,
                `Manual use: ${params.rhythm.suggestedUse}`,
                `Follow-up: ${params.rhythm.followUp}`,
                `Due tasks: ${params.rhythm.dueTaskCount}`,
                `Scheduled tasks: ${params.rhythm.scheduledTaskCount}`,
                params.rhythm.reuseCandidate
                    ? `Safe reuse candidate: ${params.rhythm.reuseCandidate.title}. Rebuild from current truth.`
                    : "Safe reuse candidate: None.",
                "",
                "CampaignCue does not post automatically or predict a perfect posting time.",
            ].join("\n"),
            fileType: "markdown",
            label: "Campaign rhythm",
            path: "instructions/campaign-rhythm.md",
            status: params.rhythm.status === "approval_due" ? "blocked" : params.rhythm.status === "result_due" || params.rhythm.status === "task_due" ? "needs_review" : "ready",
        }),
        outputPackFile({
            content: [
                params.recipe.resultQuestion,
                "",
                ...params.recipe.resultOptions.map((option) => `- ${option.label}: ${option.note}`),
            ].join("\n"),
            label: "Result memory prompt",
            path: "result/result-memory.txt",
            status: "ready",
        }),
        outputPackFile({
            content: [
                "# Editable and reusable source",
                editableDocumentRef ? `Editable document: ${editableDocumentRef}` : "Editable document: Open the campaign output in the shared editor when visual editing is needed.",
                confirmedAssetRefs.length ? `Confirmed assets: ${confirmedAssetRefs.join(", ")}` : "Confirmed assets: Add or confirm a real business photo before final visual use.",
                "CueLayers: Use Reuse old poster when an uploaded flat image needs safe editable layers.",
            ].join("\n"),
            label: "Reuse source notes",
            path: "reuse/reuse-this-pack.txt",
            status: confirmedAssetRefs.length ? "ready" : "needs_review",
        }),
    ];
    const bundleManifest = outputPackFile({
        content: JSON.stringify({
            campaignId: params.campaign.id,
            outputIntentId: outputIntent?.id,
            requestedOutputTypes: params.campaign.pack?.requestedOutputTypes || [],
            rootFolder: `${slug}-campaign-pack`,
            files: files.map((file) => ({
                path: file.path,
                status: file.status,
                type: file.fileType,
            })),
        }, null, 2),
        fileType: "json",
        label: "Bundle manifest",
        path: "bundle-manifest.json",
        status: "ready",
    });
    const filesWithManifest = [...files, bundleManifest];
    const staffSteps = params.readyPack?.manualSteps.length
        ? params.readyPack.manualSteps
        : params.recipe.manualDeliveryTasks;
    return {
        packId: `${params.campaign.id}_output_pack`,
        campaignId: params.campaign.id,
        businessBrainId: params.campaign.businessBrainId,
        title: params.campaign.title,
        decision: {
            title: decision?.recommendationTitle || params.recipe.title,
            ownerGoal: params.recipe.ownerGoal,
            whyThis: decision?.explanation.whyThis.length ? decision.explanation.whyThis : [params.recipe.plainAction],
            whyNow: decision?.explanation.whyNow.length ? decision.explanation.whyNow : [params.recipe.whenToUse],
            confidence: decision?.confidence === "high" ? "ready" : decision?.confidence === "medium" ? "needs_review" : "blocked",
            riskState: readiness.status,
            outputIntent: outputIntent ? {
                id: outputIntent.id,
                title: outputIntent.title,
                requestedOutputTypes: params.campaign.pack?.requestedOutputTypes || outputIntent.outputTypes,
            } : undefined,
        },
        facts: {
            usedFactRefs: uniqueCompactStrings([
                ...(decision?.factsUsed.businessFactRefs || []),
                ...(decision?.factsUsed.offerFactRefs || []),
                ...(decision?.factsUsed.contactFactRefs || []),
                ...(decision?.factsUsed.locationFactRefs || []),
                ...params.sourceFacts.map((fact) => fact.id),
            ], 24),
            missingInputs,
        },
        creative: {
            editableDocumentRef,
            visualAssets,
        },
        copy,
        deliveryCards: params.deliveryCards.map((card) => ({
            id: card.id,
            channel: card.channel,
            title: card.title,
            files: filesWithManifest.filter((file) => file.path.startsWith(outputPackChannelFolder(card.channel))).map((file) => file.path),
            copyBlocks: outputPackBlocksForCard(card).map((block) => block.id),
            manualSteps: card.instructions,
            status: outputPackStatusFromTrust(card.status),
        })),
        readiness,
        trustReport: {
            status: trustBlocked.length ? "blocked" : trustWarnings.length ? "needs_review" : "ready",
            checked: trustReady,
            warnings: trustWarnings,
            blockedReasons: trustBlocked,
        },
        freshness,
        commercialSafety,
        language: {
            ...languagePolicy,
            manualNote: languagePolicy.targetLocales.length
                ? "Review names, prices, dates, links, and offer terms in every translated version before use."
                : "The source-language copy remains the checked version. Add target languages only when a person can review protected facts before use.",
        },
        presencePassport: {
            status: readyPresenceCount > 0
                ? readyPresenceCount === presenceProfiles.length ? "ready" : "needs_review"
                : "needs_input",
            profiles: presenceProfiles,
        },
        staffExecution: {
            steps: staffSteps,
            completionPrompt: params.recipe.resultQuestion,
        },
        learning,
        reuse: {
            assetLibraryRefs: confirmedAssetRefs,
            cueLayersSourcePackageRefs: [],
            editableAgain: Boolean(editableDocumentRef),
            notes: [
                "Reuse this pack later by opening the saved campaign output in the shared editor.",
                "Use CueLayers for uploaded flat posters only when safe editable approximation is needed.",
                params.campaign.pack?.reusedFromCampaignId
                    ? `This pack was rebuilt from ${params.campaign.pack.reusedFromCampaignId} using current checked truth; old output, approval, and result memory were not copied.`
                    : "Use Reuse safely only after a useful owner-reported result; CampaignCue rebuilds current truth instead of copying old output.",
            ],
        },
        miniPage: {
            status: destination ? "needs_review" : "needs_input",
            slug: `${slug}-offer`,
            title: params.campaign.title,
            fields: miniPageBlocks,
            qrCodeStatus: destination ? "needs_review" : "needs_input",
            manualNote: "This runtime prepares the mini-page and QR content brief only. Hosted public mini-page publishing stays off until a dedicated route, approval gate, and tracking policy are enabled.",
        },
        proofDeck: {
            status: proofDeckStatus,
            title: "Campaign proof deck",
            sections: proofDeckSections,
            filePath: "proof-deck/campaign-proof-deck.md",
            manualNote: "This runtime prepares a proof deck brief only. Review it with the owner or client before exporting final visuals, scripts, or handoff files.",
        },
        calendar: {
            suggestedUse: params.rhythm.suggestedUse,
            followUp: params.rhythm.followUp,
            resultReminder: params.recipe.resultQuestion,
        },
        rhythm: params.rhythm,
        resultMemory: {
            question: params.recipe.resultQuestion,
            options: params.recipe.resultOptions.slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_RESULT_OPTIONS),
        },
        aiAssistance,
        nextActions: params.missingInputs.slice(0, 4),
        downloadBundle: {
            rootFolder: `${slug}-campaign-pack`,
            files: filesWithManifest,
        },
    };
}

export function buildCampaignCueDailyDesk(params: {
    analytics: CampaignCueAnalyticsSummary;
    assets: CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
    campaigns: CampaignCueCampaign[];
    locations: CampaignCueLocation[];
    opportunities: CampaignCueOpportunity[];
    schedules: CampaignCueSchedule[];
    sourceFacts?: CampaignCueSourceFact[];
    sourceInputs: CampaignCueSourceInput[];
    workspace: CampaignCueWorkspace;
    now?: Date;
}): CampaignCueDailyDesk {
    const sourceFacts = params.sourceFacts || [];
    const candidateDecisions = buildCampaignCueDecisions({
        analytics: params.analytics,
        assets: params.assets,
        businessBrain: params.businessBrain,
        campaigns: params.campaigns,
        locations: params.locations,
        opportunities: params.opportunities,
        schedules: params.schedules,
        sourceFacts,
        sourceInputs: params.sourceInputs,
        workspace: params.workspace,
    });
    const decision = candidateDecisions[0];
    const recipe = decision ? campaignCueRecipeById(decision.recipeId) : dailyDeskRecipeForBusiness(params.businessBrain.businessType);
    const latestCampaign = params.campaigns[0];
    const packRecipe = latestCampaign?.pack?.recipeId
        ? campaignCueRecipeById(latestCampaign.pack.recipeId)
        : recipe;
    const packDecision = latestCampaign?.pack?.decision
        || (decision?.recipeId === packRecipe.id ? decision : undefined);
    const taskRecipe = latestCampaign ? packRecipe : recipe;
    const primaryOpportunity = params.opportunities.find((opportunity) => opportunity.id === decision?.opportunityId) || params.opportunities[0];
    const sourceRefs = [
        params.businessBrain.sourceSnapshotId || "current",
        ...params.sourceInputs.slice(0, 4).map((input) => input.id),
    ];
    const activeInputs = params.sourceInputs.filter((input) => isCampaignCueDecisionSourceInput(input));
    const needsReviewInputs = params.sourceInputs.filter((input) => input.status === "needs_review");
    const hasPriceDateOrAvailability = activeInputs.some((input) => {
        const text = `${input.label} ${input.value}`.toLowerCase();
        return Boolean(input.expiresAt)
            || input.sourceType === "offer"
            || input.sourceType === "event"
            || /(\$|₹|rs\.?|price|offer|off|discount|stock|slot|today|tomorrow|weekend|date|time|\b\d{1,2}\s?(am|pm)\b|\b\d{1,3}%\b)/.test(text);
    });
    const confirmedAssets = params.assets.filter((asset) => asset.status === "ready" && asset.rights.status === "confirmed");
    const reviewAssets = params.assets.filter((asset) => asset.rights.status === "needs_review");
    const restrictedAssets = params.assets.filter((asset) => asset.status === "blocked" || asset.rights.status === "restricted");
    const missingInputs: CampaignCueDailyDeskTask[] = [];

    buildMissingDailyDeskFacts(params.businessBrain).forEach((message, index) => {
        const targetTab = dailyDeskTargetForMissingFact(message);
        missingInputs.push(buildDailyDeskTask({
            id: `missing_fact_${index}`,
            kind: targetTab === "details" ? "business_detail" : "source_input",
            label: targetTab === "details" ? "Add next step" : "Add current input",
            detail: message,
            actionLabel: targetTab === "details" ? "Open details" : "Open inputs",
            targetTab,
            severity: "needs_fix",
            inputType: targetTab === "details" ? "business_cta" : "current_offer",
            ownerGoal: recipe.ownerGoal,
            sourceReferences: sourceRefs,
        }));
    });

    if (!activeInputs.length) {
        missingInputs.push(buildDailyDeskTask({
            id: "current_input_needed",
            kind: "source_input",
            label: "Add something current",
            detail: "Add one ready offer, event, service, menu item, or owner note before preparing today's pack.",
            actionLabel: "Add input",
            targetTab: "sources",
            severity: needsReviewInputs.length ? "warning" : "needs_fix",
            inputType: "current_offer",
            ownerGoal: recipe.ownerGoal,
            sourceReferences: needsReviewInputs.map((input) => input.id),
        }));
    }

    if (activeInputs.length && !hasPriceDateOrAvailability) {
        missingInputs.push(buildDailyDeskTask({
            id: "price_date_or_availability_needed",
            kind: "source_input",
            label: "Add price, date, or availability if needed",
            detail: "If this campaign mentions an offer, slot, item, class, or product, add the current price, date, time, stock, or availability before using it.",
            actionLabel: "Add input",
            targetTab: "sources",
            severity: "warning",
            inputType: "price_or_date",
            ownerGoal: recipe.ownerGoal,
            sourceReferences: activeInputs.slice(0, 3).map((input) => input.id),
        }));
    }

    if (!confirmedAssets.length) {
        missingInputs.push(buildDailyDeskTask({
            id: "approved_photo_needed",
            kind: "asset_rights",
            label: "Add an approved photo",
            detail: "A real business photo makes the pack easier to use. Mark rights as confirmed before using it publicly.",
            actionLabel: "Open assets",
            targetTab: "assets",
            severity: reviewAssets.length ? "warning" : "info",
            inputType: "approved_asset",
            ownerGoal: recipe.ownerGoal,
            sourceReferences: reviewAssets.map((asset) => asset.id),
        }));
    }

    if (restrictedAssets.length) {
        missingInputs.push(buildDailyDeskTask({
            id: "restricted_asset_review",
            kind: "asset_rights",
            label: "Remove restricted photo",
            detail: `${restrictedAssets.length} asset${restrictedAssets.length === 1 ? "" : "s"} cannot be used in campaign packs.`,
            actionLabel: "Review assets",
            targetTab: "assets",
            severity: "needs_fix",
            inputType: "asset_rights",
            ownerGoal: recipe.ownerGoal,
            sourceReferences: restrictedAssets.map((asset) => asset.id),
        }));
    }

    const commonMissingInputs = [...missingInputs];
    const tasksForDecision = (selectedDecision?: CampaignCueDailyDesk["decision"]) => {
        if (!selectedDecision) return [];
        return selectedDecision.missingInputs.map((input, index) => {
            const targetTab = dailyDeskTargetForDecisionInput(input.type);
            return buildDailyDeskTask({
                id: `decision_missing_${selectedDecision.recipeId}_${index}_${input.type}`,
                kind: dailyDeskKindForDecisionInput(input.type),
                label: input.required ? "Confirm required detail" : "Review optional detail",
                detail: input.ownerQuestion,
                actionLabel: input.required ? "Confirm detail" : "Review detail",
                targetTab,
                severity: input.required ? "needs_fix" : "warning",
                inputType: input.type,
                ownerGoal: selectedDecision.ownerGoal,
                sourceReferences: [
                    ...selectedDecision.factsUsed.businessFactRefs,
                    ...selectedDecision.factsUsed.contactFactRefs,
                    ...selectedDecision.factsUsed.offerFactRefs,
                    ...selectedDecision.factsUsed.assetRefs,
                ].slice(0, 8),
            });
        });
    };
    tasksForDecision(decision).forEach((task) => {
        if (!missingInputs.some((existing) => existing.inputType === task.inputType)) {
            missingInputs.push(task);
        }
    });
    const packMissingInputs = packDecision && packDecision.recipeId !== decision?.recipeId
        ? [
            ...commonMissingInputs,
            ...tasksForDecision(packDecision).filter((task) => (
                !commonMissingInputs.some((existing) => existing.inputType === task.inputType)
            )),
        ]
        : packRecipe.id === recipe.id
            ? missingInputs
            : commonMissingInputs;

    const readyPack: CampaignCueDailyDesk["readyPack"] = latestCampaign ? {
        campaignId: latestCampaign.id,
        title: latestCampaign.title,
        trustGate: latestCampaign.trustGate,
        status: latestCampaign.status,
        outputsReady: latestCampaign.outputs.length,
        outputFormats: uniqueCompactStrings([
            ...latestCampaign.outputs.flatMap((output) => output.fields.outputFormats || []),
            ...packRecipe.outputFormats,
        ], CAMPAIGNCUE_DAILY_DESK_MAX_OUTPUT_FORMATS),
        printFormats: uniqueCompactStrings([
            ...latestCampaign.outputs.flatMap((output) => output.fields.printFormats || []),
            ...packRecipe.printFormats,
        ], CAMPAIGNCUE_DAILY_DESK_MAX_PRINT_FORMATS),
        photoTasks: uniqueCompactStrings([
            ...latestCampaign.outputs.flatMap((output) => output.fields.photoTasks || []),
            ...packRecipe.photoTasks,
        ], CAMPAIGNCUE_DAILY_DESK_MAX_PHOTO_TASKS),
        manualSteps: uniqueCompactStrings(latestCampaign.outputs.flatMap((output) => output.fields.manualSteps), 6),
        manualDeliveryTasks: uniqueCompactStrings([
            ...packRecipe.manualDeliveryTasks,
            ...latestCampaign.outputs.flatMap((output) => output.fields.manualSteps).slice(0, 3),
        ], CAMPAIGNCUE_DAILY_DESK_MAX_MANUAL_DELIVERY_TASKS),
        ownerGoal: packRecipe.ownerGoal,
        plainAction: packRecipe.plainAction,
        resultQuestion: packRecipe.resultQuestion,
        resultOptions: packRecipe.resultOptions.slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_RESULT_OPTIONS),
        primaryOutputId: latestCampaign.outputs[0]?.id,
    } : undefined;

    const manualDeliveryTasks = taskRecipe.manualDeliveryTasks
        .slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_MANUAL_DELIVERY_TASKS)
        .map((task, index) => buildDailyDeskTask({
            id: `manual_delivery_${index}`,
            kind: "manual_delivery",
            label: index === 0 ? "Use the pack manually" : "Manual use check",
            detail: task,
            actionLabel: readyPack ? "Open exports" : "Create pack",
            targetTab: readyPack ? "delivery" : "cues",
            severity: readyPack ? "ready" : "info",
            ownerGoal: taskRecipe.ownerGoal,
            sourceReferences: readyPack ? [readyPack.campaignId] : taskRecipe.recommendedChannels,
        }));

    const assetReuseTasks = [
        confirmedAssets.length || reviewAssets.length
            ? buildDailyDeskTask({
                id: "asset_reuse_saved_image",
                kind: "asset_reuse",
                label: "Reuse a saved image",
                detail: "Use a real saved photo, logo, or old campaign image before asking CampaignCue for a generic visual.",
                actionLabel: "Open assets",
                targetTab: "assets",
                severity: confirmedAssets.length ? "ready" : "warning",
                inputType: confirmedAssets.length ? undefined : "asset_rights",
                ownerGoal: taskRecipe.ownerGoal,
                sourceReferences: [...confirmedAssets, ...reviewAssets].slice(0, 3).map((asset) => asset.id),
            })
            : undefined,
        readyPack
            ? buildDailyDeskTask({
                id: "asset_reuse_editor",
                kind: "asset_reuse",
                label: "Edit the current pack only if needed",
                detail: "Open the shared editor for last-mile changes, or upload a flat image to CueLayers when an old image needs safe editable layers.",
                actionLabel: "Open editor",
                targetTab: "editor",
                severity: "info",
                ownerGoal: taskRecipe.ownerGoal,
                sourceReferences: [readyPack.campaignId],
            })
            : undefined,
    ].filter(Boolean).slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_ASSET_REUSE_TASKS) as CampaignCueDailyDeskTask[];

    const photoTasks = taskRecipe.photoTasks.slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_PHOTO_TASKS).map((task, index) => buildDailyDeskTask({
        id: `photo_task_${index}`,
        kind: "photo_task",
        label: index === 0 ? "Take one useful photo" : "Photo check",
        detail: task,
        actionLabel: confirmedAssets.length ? "Review assets" : "Add photo note",
        targetTab: "assets",
        severity: confirmedAssets.length ? "ready" : "info",
        sourceReferences: confirmedAssets.slice(0, 3).map((asset) => asset.id),
    }));

    const printTasks = taskRecipe.printFormats.slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_PRINT_FORMATS).map((format, index) => buildDailyDeskTask({
        id: `print_task_${index}`,
        kind: "print_export",
        label: format,
        detail: "Use the same campaign pack text and CTA for this in-store format.",
        actionLabel: readyPack ? "Open pack" : "Create pack",
        targetTab: readyPack ? "campaigns" : "cues",
        severity: readyPack ? "ready" : "info",
        sourceReferences: readyPack ? [readyPack.campaignId] : taskRecipe.recommendedChannels,
    }));

    const resultPrompt = (params.analytics.usedCount || 0) > (params.analytics.ownerReportedOutcomeCount || 0)
        ? buildDailyDeskTask({
            id: "result_memory_needed",
            kind: "result_memory",
            label: "Record what happened",
            detail: "One used pack has no result note yet. A short note is enough.",
            actionLabel: "Record result",
            targetTab: "analytics",
            severity: "warning",
            inputType: "result_note",
            ownerGoal: packRecipe.ownerGoal,
            resultOptions: packRecipe.resultOptions.slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_RESULT_OPTIONS),
            sourceReferences: latestCampaign ? [latestCampaign.id] : [],
        })
        : undefined;

    const approvalPrompt = latestCampaign && (params.workspace.agencyMode || latestCampaign.ownerApprovalState === "requested")
        ? buildDailyDeskTask({
            id: "approval_prompt",
            kind: "approval",
            label: latestCampaign.ownerApprovalState === "requested" ? "Approval requested" : "Approval available",
            detail: "Use approval before the owner, client, or local manager posts the pack.",
            actionLabel: "Open approval",
            targetTab: "agency",
            severity: latestCampaign.ownerApprovalState === "requested" ? "warning" : "info",
            inputType: "approval",
            ownerGoal: packRecipe.ownerGoal,
            sourceReferences: [latestCampaign.id],
        })
        : undefined;

    const activeLocations = params.locations.filter((location) => location.status === "active");
    const locationPrompt = params.workspace.multiLocationMode || activeLocations.length > 1
        ? buildDailyDeskTask({
            id: "location_variant_prompt",
            kind: "location_variant",
            label: "Check location detail",
            detail: activeLocations.length > 1
                ? `${activeLocations.length} active locations can use the pack with local area or contact changes.`
                : "Add active locations before preparing branch-specific packs.",
            actionLabel: "Open locations",
            targetTab: "locations",
            severity: activeLocations.length > 1 ? "info" : "warning",
            inputType: "location_detail",
            ownerGoal: recipe.ownerGoal,
            sourceReferences: activeLocations.map((location) => location.id),
        })
        : undefined;

    const rhythm = buildCampaignCueCampaignRhythm({
        campaigns: params.campaigns,
        recipe: packRecipe,
        schedules: params.schedules,
        workspace: params.workspace,
        now: params.now,
    });

    const localVisibilityCues = buildLocalVisibilityCues({
        assets: params.assets,
        businessBrain: params.businessBrain,
        campaigns: params.campaigns,
        locations: params.locations,
        sourceInputs: params.sourceInputs,
    });
    const deliveryCards = latestCampaign
        ? latestCampaign.outputs.map((output) => buildManualDeliveryCard(latestCampaign, output))
        : [];
    const trustSummary = latestCampaign ? buildTrustSummary({
        businessBrain: params.businessBrain,
        campaign: latestCampaign,
        localVisibilityCues,
        missingInputs: packMissingInputs,
        now: params.now,
        sourceFacts,
    }) : [];
    const outputPack = latestCampaign ? buildCampaignCueOutputPack({
        assets: params.assets,
        businessBrain: params.businessBrain,
        campaign: latestCampaign,
        campaigns: params.campaigns,
        deliveryCards,
        decision: packDecision,
        localVisibilityCues,
        missingInputs: packMissingInputs.slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_MISSING_INPUTS),
        readyPack,
        recipe: packRecipe,
        rhythm,
        sourceFacts: sourceFacts.slice(0, 16),
        sourceInputs: params.sourceInputs,
        trustSummary,
        workspace: params.workspace,
        now: params.now,
    }) : undefined;
    const packReview: CampaignCueCampaignPackReview | undefined = latestCampaign && outputPack ? {
        campaignId: latestCampaign.id,
        title: latestCampaign.title,
        ownerGoal: packRecipe.ownerGoal,
        decision: packDecision,
        reason: params.opportunities.find((opportunity) => opportunity.id === latestCampaign.opportunityId)?.reason
            || latestCampaign.brief
            || packRecipe.ownerOutcome,
        sourceFacts: sourceFacts.slice(0, 16),
        missingInputs: packMissingInputs.slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_MISSING_INPUTS),
        trustSummary,
        deliveryCards,
        resultQuestion: packRecipe.resultQuestion,
        resultOptions: packRecipe.resultOptions.slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_RESULT_OPTIONS),
        localVisibilityCues,
        outputPack,
    } : undefined;
    const aiAssistance = outputPack?.aiAssistance || buildCampaignCueAIAssistancePlan({
        assets: params.assets,
        businessBrain: params.businessBrain,
        campaign: latestCampaign,
        decision: packDecision,
        missingInputs: latestCampaign
            ? packMissingInputs.slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_MISSING_INPUTS)
            : missingInputs.slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_MISSING_INPUTS),
        readyPack,
        recipe: latestCampaign ? packRecipe : recipe,
        sourceFacts: sourceFacts.slice(0, 16),
        sourceInputs: params.sourceInputs,
        trustSummary,
    });

    const blockerCount = missingInputs.filter((task) => task.severity === "needs_fix").length;
    const warningCount = missingInputs.filter((task) => task.severity === "warning").length
        + (resultPrompt ? 1 : 0)
        + (approvalPrompt?.severity === "warning" ? 1 : 0)
        + (locationPrompt?.severity === "warning" ? 1 : 0);
    const readyOutputCount = readyPack?.outputsReady || 0;
    const blockingTask = missingInputs.find((task) => task.severity === "needs_fix");
    const rhythmNeedsAction = rhythm.status === "approval_due"
        || rhythm.status === "task_due"
        || rhythm.status === "result_due"
        || rhythm.status === "scheduled"
        || rhythm.status === "reuse_ready";

    const summary = blockingTask ? {
        title: "Confirm the missing campaign detail",
        detail: blockingTask.detail,
        actionLabel: blockingTask.actionLabel,
        targetTab: blockingTask.targetTab,
        actionKind: blockingTask.kind,
    } : rhythmNeedsAction ? {
        title: rhythm.title,
        detail: rhythm.detail,
        actionLabel: rhythm.primaryAction.label,
        targetTab: rhythm.primaryAction.targetTab,
        actionKind: rhythm.primaryAction.kind,
    } : !readyPack ? {
        title: decision?.recommendationTitle || recipe.title,
        detail: decision?.explanation.whyThis[0] || primaryOpportunity?.ownerBenefit || recipe.plainAction || recipe.ownerOutcome,
        actionLabel: decision?.ownerPrimaryActionLabel || primaryOpportunity?.actionLabel || "Create pack",
        targetTab: "cues" as const,
        actionKind: "campaign_pack" as const,
    } : resultPrompt ? {
        title: resultPrompt.label,
        detail: resultPrompt.detail,
        actionLabel: resultPrompt.actionLabel,
        targetTab: resultPrompt.targetTab,
        actionKind: resultPrompt.kind,
    } : readyPack.trustGate === "needs_fix" || readyPack.trustGate === "blocked" ? {
        title: "Fix pack checks",
        detail: "The latest pack has a check that needs review before public use.",
        actionLabel: "Open checks",
        targetTab: "trust" as const,
        actionKind: "campaign_pack" as const,
    } : {
        title: "Use the latest pack",
        detail: `${readyPack.outputsReady} output${readyPack.outputsReady === 1 ? "" : "s"} are ready for download, print planning, or manual posting.`,
        actionLabel: "Open pack",
        targetTab: "campaigns" as const,
        actionKind: "manual_post" as const,
    };

    return {
        generatedAt: new Date().toISOString(),
        recipe,
        decision,
        candidateDecisions: candidateDecisions.slice(0, 5),
        primaryOpportunity,
        missingInputs: missingInputs.slice(0, CAMPAIGNCUE_DAILY_DESK_MAX_MISSING_INPUTS),
        assetReuseTasks,
        manualDeliveryTasks,
        photoTasks,
        printTasks,
        localVisibilityCues,
        packReview,
        outputPack,
        readyPack,
        aiAssistance,
        rhythm,
        resultPrompt,
        approvalPrompt,
        locationPrompt,
        summary: {
            ...summary,
            blockerCount,
            warningCount,
            readyOutputCount,
        },
    };
}
