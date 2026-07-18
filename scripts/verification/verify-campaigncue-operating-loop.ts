#!/usr/bin/env ts-node

import fs from "fs";
import path from "path";
import { CAMPAIGNCUE_DAILY_DESK_RECIPES } from "../../src/constants/campaigncue/dailyDesk";
import { CAMPAIGNCUE_PRODUCT_CODE } from "../../src/constants/campaigncue/product";
import { buildCampaignCueDecisions } from "../../src/lib/campaigncue/decisionEngine";
import { buildCampaignCueDailyDesk, buildCampaignCuePackReadiness } from "../../src/lib/campaigncue/dailyDesk";
import {
    assertCampaignCueIdempotencyClaimOwnership,
    buildCampaignCueIdempotencyRequestHash,
    getCampaignCueIdempotencyClaimDecision,
    getCampaignCueIdempotencyReplay,
} from "../../src/lib/campaigncue/idempotency";
import {
    buildCampaignCueCampaignRhythm,
    buildCampaignCuePackFreshness,
    evaluateCampaignCueCommercialGate,
    evaluateCampaignCuePackFreshness,
    isCampaignCueSourceInputCurrent,
} from "../../src/lib/campaigncue/operatingLoop";
import {
    CampaignCueBusinessPatchSchema,
    CampaignCueCampaignActionSchema,
    CampaignCueCreateCampaignSchema,
    CampaignCueSourceInputSchema,
} from "../../src/lib/validation/campaigncueSchemas";
import type {
    CampaignCueAnalyticsSummary,
    CampaignCueAsset,
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueDailyDeskTask,
    CampaignCueManualDeliveryCard,
    CampaignCueSchedule,
    CampaignCueSourceFact,
    CampaignCueSourceInput,
    CampaignCueWorkspace,
} from "../../src/types/campaigncue";

const ROOT = path.resolve(__dirname, "..", "..");
let checks = 0;

const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
    if (!condition) throw new Error(message);
    checks += 1;
};

const assertIncludes = (content: string, token: string, label: string) => {
    assert(content.includes(token), `${label} must include ${token}`);
};

const assertThrows = (callback: () => unknown, message: string) => {
    let threw = false;
    try {
        callback();
    } catch {
        threw = true;
    }
    assert(threw, message);
};

const assertExcludes = (content: string, token: string, label: string) => {
    assert(!content.includes(token), `${label} must not include ${token}`);
};

const NOW = new Date("2026-07-10T05:00:00.000Z");

const businessBrain = (overrides: Partial<CampaignCueBusinessBrain> = {}): CampaignCueBusinessBrain => ({
    id: "default",
    workspaceId: "cc_test_workspace",
    businessBrainId: "default",
    businessType: "restaurant",
    name: "Test Cafe",
    locality: "Indiranagar",
    contacts: {
        whatsapp: "+919876543210",
        website: "https://example.com",
    },
    brandKit: {
        primaryColor: "#0B1F54",
        voice: "friendly",
        playbook: {
            brandFeel: ["clear"],
            inspirationNotes: [],
            visualMotifs: [],
            avoidList: [],
            productFocus: ["Lunch combo"],
        },
    },
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    catalog: {
        items: [{ id: "item_1", name: "Lunch combo", available: true, sourceRefs: ["owner"] }],
        services: [],
    },
    operatingPulse: {
        businessState: "quiet",
        capacityStatus: "available",
        stockStatus: "available",
        validUntil: "2026-07-10T11:00:00.000Z",
    },
    commercialPolicy: {
        promotionsAllowed: true,
        discountsAllowed: true,
        discountApprovalRequired: false,
        maxDiscountPercent: 20,
        minimumPromotedPrice: 300,
        currencyCode: "INR",
        doNotPromote: ["Alcohol"],
    },
    presence: {
        googleBusinessProfileUrl: "https://business.google.com/example",
        googleReviewUrl: "https://g.page/r/example/review",
    },
    languagePolicy: {
        sourceLocale: "en-IN",
        targetLocales: ["hi-IN"],
        protectedFactReviewRequired: true,
    },
    sourceConfidence: 0.9,
    readiness: { status: "ready", blockers: [], warnings: [] },
    sourceSnapshotId: "current",
    ...overrides,
});

const sourceInput = (overrides: Partial<CampaignCueSourceInput> = {}): CampaignCueSourceInput => ({
    id: "cc_source_lunch",
    workspaceId: "cc_test_workspace",
    sourceType: "offer",
    label: "Lunch combo",
    value: "Lunch combo price INR 399, available today",
    status: "active",
    confidence: "manual",
    sourceRefs: ["owner_input"],
    facts: [],
    expiresAt: "2026-07-10T07:00:00.000Z",
    ...overrides,
});

const workspace: CampaignCueWorkspace = {
    id: "cc_test_workspace",
    workspaceId: "cc_test_workspace",
    productId: CAMPAIGNCUE_PRODUCT_CODE,
    tId: "tenant_1",
    sId: "store_1",
    name: "Test Cafe",
    status: "active",
    billingStatus: "manual_beta",
    defaultRole: "owner",
    agencyMode: false,
    multiLocationMode: false,
    settings: {
        timezone: "Asia/Kolkata",
        locale: "en-IN",
        deliveryMode: "export_download_only",
        billingEnabled: false,
    },
    members: {},
};

const analytics: CampaignCueAnalyticsSummary = {
    id: "dashboard",
    workspaceId: workspace.workspaceId,
    campaignCount: 0,
    usedCount: 0,
    exportCount: 0,
    approvalRequestCount: 0,
    manualFallbackCount: 0,
    ownerReportedOutcomeCount: 0,
    confidence: "observed",
};

const asset: CampaignCueAsset = {
    id: "asset_1",
    workspaceId: workspace.workspaceId,
    name: "Approved lunch photo",
    assetType: "image",
    status: "ready",
    source: "upload",
    rights: { status: "confirmed", consentType: "owner_confirmed" },
    tags: ["food"],
    usageRefs: [],
};

const sourceFacts: CampaignCueSourceFact[] = [{
    id: "business_name",
    label: "Business name",
    value: "Test Cafe",
    sourceRef: "store_profile",
    sourceType: "business_profile",
    confidence: "observed",
    freshness: "fresh",
    risk: "low",
}];

const campaign = (overrides: Partial<CampaignCueCampaign> = {}): CampaignCueCampaign => ({
    id: "cc_campaign_test",
    workspaceId: workspace.workspaceId,
    businessBrainId: "default",
    opportunityId: "cue_menu_push",
    title: "Lunch combo push",
    brief: "Use current checked lunch details.",
    status: "generated",
    channels: ["whatsapp", "google_local"],
    outputs: [],
    trustGate: "clear",
    credits: { estimate: 0, reserved: 0, captured: 0, refunded: 0, currency: "credits" },
    actionCounts: {},
    ownerApprovalState: "not_requested",
    pack: {
        ownerGoal: "bring_people_today",
        reason: "Lunch details are current.",
        recipeId: "restaurant_slow_lunch_push",
        sourceFactIds: ["business_name"],
        missingInputIds: [],
        deliveryCardIds: [],
        resultQuestion: "What happened after the lunch push?",
        freshness: {
            sourceHash: "source_hash_1",
            status: "current",
            validatedAt: NOW.toISOString(),
            expiresAt: "2026-07-12T07:00:00.000Z",
            recheckActions: ["download", "export", "mark_used", "schedule"],
        },
        commercialGate: { status: "ready", findings: [] },
    },
    createdAt: "2026-07-10T04:00:00.000Z",
    updatedAt: "2026-07-10T04:00:00.000Z",
    ...overrides,
});

const schedule = (overrides: Partial<CampaignCueSchedule> = {}): CampaignCueSchedule => ({
    id: "cc_schedule_test",
    workspaceId: workspace.workspaceId,
    campaignId: "cc_campaign_test",
    channel: "whatsapp",
    mode: "manual_task",
    status: "scheduled",
    scheduledAt: "2026-07-10T06:00:00.000Z",
    timezone: "Asia/Kolkata",
    note: "Post manually",
    taskType: "post",
    ...overrides,
});

const recipe = (id: string) => {
    const found = CAMPAIGNCUE_DAILY_DESK_RECIPES.find((item) => item.id === id);
    assert(found, `recipe ${id} must exist`);
    return found;
};

const decisionsFor = (brain: CampaignCueBusinessBrain, inputs: CampaignCueSourceInput[]) => buildCampaignCueDecisions({
    analytics,
    assets: [asset],
    businessBrain: brain,
    campaigns: [],
    locations: [],
    opportunities: [],
    schedules: [],
    sourceFacts,
    sourceInputs: inputs,
    workspace,
    now: NOW,
});

const verifyRecipesAndDecisions = () => {
    assert(CAMPAIGNCUE_DAILY_DESK_RECIPES.length === 14, "CampaignCue must keep fourteen bounded action recipes");
    recipe("local_review_request");
    recipe("return_customer_reminder");

    const expiredInput = sourceInput({ expiresAt: "2026-07-10T04:59:59.000Z" });
    assert(!isCampaignCueSourceInputCurrent(expiredInput, NOW), "expired source input must not remain current");
    const lunchDecision = decisionsFor(businessBrain(), [expiredInput])
        .find((decision) => decision.recipeId === "restaurant_slow_lunch_push");
    assert(lunchDecision?.missingInputs.some((input) => input.type === "current_offer" && input.required), "expired offer must create a required current-input gate");

    const expiredPulseDecision = decisionsFor(businessBrain({
        operatingPulse: {
            businessState: "quiet",
            capacityStatus: "available",
            stockStatus: "available",
            validUntil: "2026-07-10T04:59:59.000Z",
        },
    }), [sourceInput()]).find((decision) => decision.recipeId === "restaurant_slow_lunch_push");
    assert(expiredPulseDecision?.missingInputs.some((input) => input.type === "capacity_or_stock" && input.required), "expired pulse must require owner refresh");

    const reviewInput = sourceInput({
        id: "cc_source_review",
        sourceType: "manual_note",
        label: "Completed customer visits",
        value: "Recent customers completed their visits and services this week",
        expiresAt: undefined,
    });
    const reviewDecision = decisionsFor(businessBrain(), [reviewInput])
        .find((decision) => decision.recipeId === "local_review_request");
    assert(!reviewDecision?.missingInputs.some((input) => input.type === "review_destination"), "verified review destination must clear destination gate");
    assert(!reviewDecision?.missingInputs.some((input) => input.type === "completed_customer_interaction"), "completed interaction note must clear review interaction gate");

    const retentionInputs = [
        sourceInput({
            id: "cc_source_audience",
            sourceType: "manual_note",
            label: "Owner-managed audience",
            value: "Past customers who visited this month, selected in the owner's existing WhatsApp workflow",
            expiresAt: undefined,
        }),
        sourceInput(),
    ];
    const retentionDecision = decisionsFor(businessBrain(), retentionInputs)
        .find((decision) => decision.recipeId === "return_customer_reminder");
    assert(!retentionDecision?.missingInputs.some((input) => input.type === "owner_managed_audience"), "non-identifying audience description must clear retention gate");

    const contactPayloadDecision = decisionsFor(businessBrain(), [
        sourceInput({
            id: "cc_source_contact_payload",
            sourceType: "manual_note",
            label: "Past customer audience",
            value: "Paste customer contacts: +91 98765 43210",
            expiresAt: undefined,
        }),
        sourceInput(),
    ]).find((decision) => decision.recipeId === "return_customer_reminder");
    assert(
        contactPayloadDecision?.missingInputs.some((input) => input.type === "owner_managed_audience" && input.required),
        "phone-number payload must not satisfy the owner-managed audience gate",
    );

    const dailyDesk = buildCampaignCueDailyDesk({
        analytics,
        assets: [asset],
        businessBrain: businessBrain(),
        campaigns: [],
        locations: [],
        opportunities: [],
        schedules: [],
        sourceFacts,
        sourceInputs: [sourceInput()],
        workspace,
        now: NOW,
    });
    assert(dailyDesk.aiAssistance.items.length === 6, "AI assistance plan must expose six bounded owner-help stages");
    assert(dailyDesk.aiAssistance.costPolicy.firestoreReads === 0, "AI assistance plan must add zero Firestore reads");
    assert(dailyDesk.aiAssistance.costPolicy.firestoreWrites === 0, "AI assistance plan must add zero Firestore writes");
    assert(dailyDesk.aiAssistance.costPolicy.firestoreDeletes === 0, "AI assistance plan must add zero Firestore deletes");
    assert(dailyDesk.aiAssistance.costPolicy.providerCalls === 0, "AI assistance plan must add zero provider calls");
    assert(dailyDesk.aiAssistance.items.every((item) => !item.providerCallAllowed), "AI assistance items must keep provider calls disabled");
};

const verifyCommercialAndFreshnessGates = () => {
    const lunchRecipe = recipe("restaurant_slow_lunch_push");
    const closed = evaluateCampaignCueCommercialGate({
        businessBrain: businessBrain({ operatingPulse: { businessState: "closed", capacityStatus: "unknown", stockStatus: "unknown", validUntil: "2026-07-10T11:00:00.000Z" } }),
        recipe: lunchRecipe,
        sourceInputs: [sourceInput()],
        now: NOW,
    });
    assert(closed.status === "blocked", "closed business must block a demand recipe");

    const unsafeOffer = evaluateCampaignCueCommercialGate({
        businessBrain: businessBrain(),
        recipe: lunchRecipe,
        sourceInputs: [sourceInput({ value: "Alcohol lunch offer 25% off, price INR 199" })],
        now: NOW,
    });
    assert(unsafeOffer.blockedFindings.length === 3, "discount maximum, price floor, and do-not-promote term must all block");

    const freshness = buildCampaignCuePackFreshness({
        businessBrain: businessBrain(),
        now: NOW,
        recipe: lunchRecipe,
        sourceHash: "source_hash_1",
        sourceInputs: [sourceInput()],
    });
    assert(freshness.expiresAt === "2026-07-10T07:00:00.000Z", "pack expiry must use earliest current source validity");
    assert(evaluateCampaignCuePackFreshness({ currentSourceHash: "source_hash_1", freshness, now: NOW }).status === "current", "matching unexpired hash must stay current");
    assert(evaluateCampaignCuePackFreshness({ currentSourceHash: "source_hash_2", freshness, now: NOW }).status === "stale", "changed source hash must stale pack");
    assert(evaluateCampaignCuePackFreshness({ currentSourceHash: "source_hash_1", freshness, now: new Date("2026-07-10T07:00:01.000Z") }).status === "expired", "elapsed validity must expire pack");
};

const verifyCampaignRhythmAndReadiness = () => {
    const lunchRecipe = recipe("restaurant_slow_lunch_push");
    const requested = campaign({ ownerApprovalState: "requested" });
    const approvalRhythm = buildCampaignCueCampaignRhythm({
        campaigns: [requested],
        recipe: lunchRecipe,
        schedules: [],
        workspace,
        now: NOW,
    });
    assert(approvalRhythm.status === "approval_due", "requested approval must be the first rhythm action");
    assert(approvalRhythm.approvalCampaignId === requested.id, "approval rhythm must retain the campaign id");

    const completedAgencyCampaign = campaign({
        id: "cc_campaign_completed",
        status: "used",
        ownerApprovalState: "not_requested",
        resultMemory: {
            usefulCount: 0,
            notUsefulCount: 1,
            lastRecordedAt: "2026-07-10T04:30:00.000Z",
            lastSignalId: "not_useful",
        },
    });
    const approvedAgencyCampaign = campaign({ id: "cc_campaign_ready", ownerApprovalState: "approved" });
    const agencyHistoryRhythm = buildCampaignCueCampaignRhythm({
        campaigns: [completedAgencyCampaign, approvedAgencyCampaign],
        recipe: lunchRecipe,
        schedules: [],
        workspace: { ...workspace, agencyMode: true },
        now: NOW,
    });
    assert(agencyHistoryRhythm.status === "pack_ready", "completed agency campaigns must not create stale approval reminders");

    const resultDue = campaign({ status: "used", resultMemory: undefined });
    const resultRhythm = buildCampaignCueCampaignRhythm({
        campaigns: [resultDue],
        recipe: lunchRecipe,
        schedules: [],
        workspace,
        now: NOW,
    });
    assert(resultRhythm.status === "result_due", "used pack without receipt must be the next rhythm action");

    const dueRhythm = buildCampaignCueCampaignRhythm({
        campaigns: [],
        recipe: lunchRecipe,
        schedules: [schedule({ scheduledAt: "2026-07-10T04:59:00.000Z" })],
        workspace,
        now: NOW,
    });
    assert(dueRhythm.status === "task_due", "elapsed scheduled task must derive as due without a status write");
    assert(dueRhythm.dueTaskCount === 1, "rhythm must count due tasks from loaded schedules");
    const dueBeforeResultRhythm = buildCampaignCueCampaignRhythm({
        campaigns: [resultDue],
        recipe: lunchRecipe,
        schedules: [schedule({ scheduledAt: "2026-07-10T04:59:00.000Z" })],
        workspace,
        now: NOW,
    });
    assert(dueBeforeResultRhythm.status === "task_due", "time-sensitive due task must outrank an older missing result receipt");

    const stalePackRhythm = buildCampaignCueCampaignRhythm({
        campaigns: [campaign({
            pack: {
                ...campaign().pack!,
                freshness: {
                    ...campaign().pack!.freshness!,
                    status: "stale",
                },
            },
        })],
        recipe: lunchRecipe,
        schedules: [],
        workspace,
        now: NOW,
    });
    assert(stalePackRhythm.status === "prepare_next", "stale campaign pack must not be presented as ready for use");

    const useful = campaign({
        status: "used",
        resultMemory: {
            usefulCount: 1,
            notUsefulCount: 0,
            lastRecordedAt: "2026-07-10T04:30:00.000Z",
            lastSignalId: "got_orders",
            lastReceipt: {
                signalId: "got_orders",
                metrics: { orders: 3 },
                confidence: "owner_reported",
            },
        },
    });
    const reuseRhythm = buildCampaignCueCampaignRhythm({
        campaigns: [useful],
        recipe: lunchRecipe,
        schedules: [],
        workspace,
        now: NOW,
    });
    assert(reuseRhythm.status === "reuse_ready", "positive completed pack must nominate safe reuse");
    assert(reuseRhythm.reuseCandidate?.campaignId === useful.id, "reuse candidate must retain the proven source campaign");
    assert(reuseRhythm.reuseCandidate?.mode === "rebuild_from_current_truth", "reuse must rebuild from current truth");
    assert(reuseRhythm.costPolicy.firestoreReads === 0, "rhythm must add zero Firestore reads");
    assert(reuseRhythm.costPolicy.firestoreWrites === 0, "rhythm must add zero Firestore writes");

    const missingTask: CampaignCueDailyDeskTask = {
        id: "missing_price",
        kind: "source_input",
        label: "Confirm price",
        detail: "Confirm the current price.",
        actionLabel: "Confirm",
        targetTab: "sources",
        severity: "needs_fix",
        sourceReferences: [],
        inputType: "price_or_date",
    };
    const readyDeliveryCard: CampaignCueManualDeliveryCard = {
        id: "handoff_1",
        campaignId: useful.id,
        channel: "whatsapp",
        title: "WhatsApp handoff",
        ownerUseCase: "Copy manually",
        status: "ready",
        fields: [],
        instructions: ["Copy manually"],
    };
    const missingReadiness = buildCampaignCuePackReadiness({
        campaign: useful,
        deliveryCards: [readyDeliveryCard],
        missingInputs: [missingTask],
        trustSummary: [],
        workspace,
        now: NOW,
    });
    assert(missingReadiness.status === "needs_input", "required fact must keep readiness in needs-input state");
    assert(missingReadiness.checks.length === 5, "readiness must contain five bounded checks");
    assert(missingReadiness.predictionBoundary === "readiness_only_no_engagement_prediction", "readiness must reject prediction semantics");

    const agencyReadiness = buildCampaignCuePackReadiness({
        campaign: campaign({ ownerApprovalState: "not_requested" }),
        deliveryCards: [readyDeliveryCard],
        missingInputs: [],
        trustSummary: [],
        workspace: { ...workspace, agencyMode: true },
        now: NOW,
    });
    assert(agencyReadiness.status === "blocked", "agency pack without approval must be blocked");
    assert(agencyReadiness.checks.find((check) => check.id === "approval")?.points === 0, "missing agency approval must contribute zero readiness points");

    const approvedReadiness = buildCampaignCuePackReadiness({
        campaign: campaign({ ownerApprovalState: "approved" }),
        deliveryCards: [readyDeliveryCard],
        missingInputs: [],
        trustSummary: [],
        workspace,
        now: NOW,
    });
    const approvedCheck = approvedReadiness.checks.find((check) => check.id === "approval");
    assert(approvedCheck?.status === "ready", "approved non-agency pack must keep a ready approval check");
    assert(approvedCheck?.detail === "The pack is approved.", "approved non-agency pack must show its actual approval state");

    const elapsedExpiredCampaign = campaign({
        pack: {
            ...campaign().pack!,
            freshness: {
                ...campaign().pack!.freshness!,
                status: "current",
                expiresAt: "2026-07-10T04:59:59.000Z",
            },
        },
    });
    const elapsedExpiredReadiness = buildCampaignCuePackReadiness({
        campaign: elapsedExpiredCampaign,
        deliveryCards: [readyDeliveryCard],
        missingInputs: [],
        trustSummary: [],
        workspace,
        now: NOW,
    });
    assert(elapsedExpiredReadiness.status === "blocked", "elapsed-expired freshness must block readiness even when saved status is current");
    const elapsedExpiredDesk = buildCampaignCueDailyDesk({
        analytics,
        assets: [asset],
        businessBrain: businessBrain(),
        campaigns: [elapsedExpiredCampaign],
        locations: [],
        opportunities: [],
        schedules: [],
        sourceFacts,
        sourceInputs: [sourceInput()],
        workspace,
        now: NOW,
    });
    assert(elapsedExpiredDesk.packReview?.outputPack?.freshness.status === "expired", "output pack must expose elapsed-expired freshness");
    assert(
        elapsedExpiredDesk.packReview?.outputPack?.downloadBundle.files.find((file) => file.path === "decision/decision-card.md")?.status === "blocked",
        "output pack decision card must inherit elapsed-expired blocking status",
    );

    const legacyCampaign = campaign();
    legacyCampaign.pack = {
        ...legacyCampaign.pack!,
        decision: undefined,
        recipeId: "local_review_request",
    };
    const legacyDesk = buildCampaignCueDailyDesk({
        analytics,
        assets: [asset],
        businessBrain: businessBrain(),
        campaigns: [legacyCampaign],
        locations: [],
        opportunities: [],
        schedules: [],
        sourceFacts,
        sourceInputs: [sourceInput()],
        workspace,
        now: NOW,
    });
    assert(
        !legacyDesk.packReview?.decision || legacyDesk.packReview.decision.recipeId === legacyCampaign.pack.recipeId,
        "legacy pack must not borrow a decision from a different recipe",
    );
};

const verifyRequestBoundaries = () => {
    assert(CampaignCueCreateCampaignSchema.safeParse({
        reuseCampaignId: "cc_campaign_test",
    }).success, "campaign create must accept a bounded reuse campaign id");
    assert(!CampaignCueCampaignActionSchema.safeParse({
        action: "record_outcome",
    }).success, "record-outcome action must require a result signal");
    assert(CampaignCueCampaignActionSchema.safeParse({
        action: "record_outcome",
        resultSignalId: "got_orders",
    }).success, "record-outcome action with a result signal must validate");
    assert(!CampaignCueCampaignActionSchema.safeParse({
        action: "schedule",
        taskType: "staff_share",
    }).success, "manual schedule action must require a date and time");
    assert(CampaignCueCampaignActionSchema.safeParse({
        action: "schedule",
        scheduledAt: "2026-07-11T05:00:00.000Z",
        taskType: "staff_share",
    }).success, "manual schedule action with a date and time must validate");
    assert(CampaignCueCampaignActionSchema.safeParse({ action: "approve" }).success, "approve action must validate");
    assert(!CampaignCueCampaignActionSchema.safeParse({ action: "reject" }).success, "reject action must require a reason");
    assert(CampaignCueCampaignActionSchema.safeParse({ action: "reject", note: "Price needs correction." }).success, "reject action with a reason must validate");
    assert(CampaignCueSourceInputSchema.safeParse({
        sourceType: "manual_note",
        label: "Past customer audience",
        value: "Past customers who visited this month, selected in our existing workflow",
        status: "active",
    }).success, "non-identifying audience description must validate");
    assert(!CampaignCueSourceInputSchema.safeParse({
        sourceType: "manual_note",
        label: "Past customer audience",
        value: "Paste customer contacts from customers.csv: owner@example.com, +91 98765 43210",
        status: "active",
    }).success, "customer contact payload must fail validation");
    assert(!CampaignCueBusinessPatchSchema.safeParse({
        presence: { googleReviewUrl: "javascript:alert(1)" },
    }).success, "non-HTTP review destination must fail validation");
    assert(CampaignCueBusinessPatchSchema.safeParse({
        presence: { googleReviewUrl: "https://g.page/r/example/review" },
    }).success, "HTTPS review destination must validate");
    assert(!CampaignCueBusinessPatchSchema.safeParse({
        targetLocales: ["Hindi language"],
    }).success, "invalid target locale must fail validation");
    assert(CampaignCueBusinessPatchSchema.safeParse({
        targetLocales: ["hi-IN", "kn-IN"],
    }).success, "valid target locales must validate");
};

const verifyIdempotencyBoundaries = () => {
    const firstHash = buildCampaignCueIdempotencyRequestHash({
        campaignId: "cc_campaign_test",
        input: { action: "record_outcome", resultSignalId: "got_orders" },
    });
    const reorderedHash = buildCampaignCueIdempotencyRequestHash({
        input: { resultSignalId: "got_orders", action: "record_outcome" },
        campaignId: "cc_campaign_test",
    });
    const changedHash = buildCampaignCueIdempotencyRequestHash({
        campaignId: "cc_campaign_test",
        input: { action: "record_outcome", resultSignalId: "not_useful" },
    });
    assert(firstHash === reorderedHash, "idempotency request hashing must ignore object key order");
    assert(firstHash !== changedHash, "idempotency request hashing must bind the full request payload");
    assert(getCampaignCueIdempotencyReplay({
        action: "record_outcome",
        actorId: "owner_test",
        requestHash: firstHash,
        resultId: "cc_campaign_test",
        status: "completed",
    }, {
        action: "record_outcome",
        actorId: "owner_test",
        requestHash: firstHash,
    }).resultId === "cc_campaign_test", "completed exact-identity retries must replay");
    assertThrows(() => getCampaignCueIdempotencyReplay({
        action: "record_outcome",
        actorId: "another_owner",
        requestHash: firstHash,
        resultId: "cc_campaign_test",
        status: "completed",
    }, {
        action: "record_outcome",
        actorId: "owner_test",
        requestHash: firstHash,
    }), "idempotency replay must reject actor changes");
    assertThrows(() => getCampaignCueIdempotencyReplay({
        action: "record_outcome",
        actorId: "owner_test",
        requestHash: changedHash,
        resultId: "cc_campaign_test",
        status: "completed",
    }, {
        action: "record_outcome",
        actorId: "owner_test",
        requestHash: firstHash,
    }), "idempotency replay must reject payload changes");
    assertThrows(() => getCampaignCueIdempotencyReplay({
        action: "record_outcome",
        actorId: "owner_test",
        requestHash: firstHash,
        status: "in_progress",
    }, {
        action: "record_outcome",
        actorId: "owner_test",
        requestHash: firstHash,
    }), "in-progress retries must fail closed");
    const expected = { action: "record_outcome", actorId: "owner_test", requestHash: firstHash };
    const activeClaim = {
        ...expected,
        claimId: "claim_test",
        leaseExpiresAt: { seconds: 20, nanoseconds: 0 },
        status: "in_progress" as const,
    };
    assert(getCampaignCueIdempotencyClaimDecision(null, expected, 10_000).kind === "claim", "missing claims must be claimable");
    assert(getCampaignCueIdempotencyClaimDecision({ ...expected, status: "in_progress" }, expected, 10_000).kind === "claim", "legacy claims must recover");
    assert(getCampaignCueIdempotencyClaimDecision(activeClaim, expected, 10_000).kind === "conflict", "active claims must conflict");
    assert(getCampaignCueIdempotencyClaimDecision(activeClaim, expected, 20_000).kind === "claim", "expired claims must recover");
    assert(assertCampaignCueIdempotencyClaimOwnership(activeClaim, expected, "claim_test").claimId === "claim_test", "exact claim ownership must pass");
    assertThrows(() => assertCampaignCueIdempotencyClaimOwnership(activeClaim, expected, "claim_replaced"), "replaced claims must not complete");
};

const verifyStaticBoundaries = () => {
    const packageJson = JSON.parse(read("package.json"));
    const operatingLoop = read("src/lib/campaigncue/operatingLoop.ts");
    const decisionEngine = read("src/lib/campaigncue/decisionEngine.ts");
    const dailyDesk = read("src/lib/campaigncue/dailyDesk.ts");
    const server = read("src/lib/campaigncue/server.ts");
    const database = read("src/constants/campaigncue/database.ts");
    const featureFlags = read("src/config/features.ts");
    const workspaceUi = read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx");
    const docs = read("__docs__/campaigncue/campaign-operating-loop/campaign-operating-loop_validation.md");
    const aiDocs = read("__docs__/campaigncue/ai-assistance-layer/ai-assistance-layer_validation.md");
    const actionServerBlock = server.slice(
        server.indexOf("export async function recordCampaignCueActionServer"),
        server.indexOf("export async function createCampaignCueAssetServer"),
    );

    assert(packageJson.scripts?.["verify:campaigncue-operating-loop"]?.includes("verify-campaigncue-operating-loop.ts"), "package must expose operating-loop verifier");
    assert(packageJson.scripts?.["verify:campaigncue"]?.includes("verify:campaigncue-operating-loop"), "CampaignCue aggregate verifier must run operating-loop verifier");
    assertIncludes(featureFlags, "ENABLE_CAMPAIGNCUE_OPERATING_LOOP: true", "CampaignCue operating-loop feature flag");
    assertIncludes(featureFlags, "ENABLE_CAMPAIGNCUE_AI_ASSISTANCE_PLAN: true", "CampaignCue AI assistance feature flag");
    assertIncludes(featureFlags, "ENABLE_CAMPAIGNCUE_AI_PROVIDER_CALLS: false", "CampaignCue AI provider-call gate");
    [operatingLoop, decisionEngine].forEach((content, index) => {
        const label = index === 0 ? "operating loop" : "decision engine";
        assertExcludes(content, "fetch(", label);
        assertExcludes(content, "firebase", label);
        assertExcludes(content, "@google", label);
    });
    ["PULSES", "RESULT_RECEIPTS", "EXPERIMENTS", "PRESENCE_PASSPORTS", "RETENTION_AUDIENCES", "STAFF_TASKS"]
        .forEach((token) => assertExcludes(database, token, "CampaignCue collection registry"));
    assertIncludes(server, "readSourceSnapshot(workspaceId)", "public-use truth recheck");
    assertIncludes(server, "reusedFromCampaignId: reuseCampaign?.id", "current-truth campaign reuse provenance");
    assertIncludes(server, "campaignCueApprovalId(params.campaignId)", "deterministic approval document id");
    assertIncludes(server, "recordCampaignCueApprovalActionTransactional", "transactional approval lifecycle");
    assertIncludes(server, "buildCampaignCueIdempotencyRequestHash", "request-bound idempotency identity");
    assertIncludes(server, "actorId: params.scope.userId", "actor-bound idempotency identity");
    assertIncludes(actionServerBlock, "return firestoreAdmin.runTransaction", "ordinary action final transaction");
    assertIncludes(actionServerBlock, "const currentSnap = await transaction.get(campaignRef)", "ordinary action current campaign re-read");
    assertIncludes(actionServerBlock, "transaction.set(summaryRef", "ordinary action atomic dashboard summary");
    assertIncludes(actionServerBlock, "transaction.set(idempotencyRef", "ordinary action atomic idempotency completion");
    assertIncludes(server, "current.ownerApprovalState !== \"requested\"", "atomic approval state recheck");
    assertIncludes(server, "Completed or archived campaign packs cannot start a new approval request.", "closed campaign approval guard");
    assertIncludes(server, "current.ownerApprovalState === \"not_requested\"", "approval created-at preservation guard");
    assert(
        actionServerBlock.indexOf("CAMPAIGNCUE_APPROVAL_ACTIONS.has") < actionServerBlock.indexOf("const idempotency = await checkIdempotency"),
        "approval actions must enter their dedicated path before ordinary action idempotency and mutation",
    );
    assertIncludes(server, "workspace.agencyMode && campaign.ownerApprovalState !== \"approved\"", "agency approval public-use gate");
    assertIncludes(dailyDesk, "|| rhythm.status === \"result_due\"", "result-due Daily Desk priority");
    assertIncludes(server, "usedAt: isNotUsed ? undefined", "not-used receipt handling");
    assertIncludes(server, "metrics: isNotUsed ? {}", "not-used metric handling");
    assertIncludes(server, "metrics: updates.resultMemory?.lastReceipt?.metrics || {}", "result-event normalized metrics");
    assertIncludes(server, "confidence: params.input.action === \"record_outcome\" ? \"owner_reported\"", "owner-reported event confidence");
    assertIncludes(workspaceUi, "source.status === \"active\" ? \"expired\"", "expired source owner label");
    assertIncludes(workspaceUi, "CampaignCue does not post, send, or spend", "manual delivery boundary");
    assertIncludes(workspaceUi, "AI assistance plan", "AI assistance owner section");
    assertIncludes(workspaceUi, "Campaign rhythm", "Campaign rhythm owner section");
    assertIncludes(workspaceUi, "Reuse safely", "safe pack reuse owner action");
    assertIncludes(workspaceUi, "canRequestCampaignApproval", "shared approval request eligibility");
    assertIncludes(workspaceUi, "resultCampaignId", "campaign-specific result targeting");
    assertIncludes(workspaceUi, "!selectedOutcomeSignalId", "result choice required before result write");
    assertIncludes(workspaceUi, "experimentVariable: resultReceiptDraft.experimentVariable || undefined", "optional tested-variable result field");
    assertIncludes(workspaceUi, "isCampaignApprovalBusy", "duplicate approval action guard");
    assertIncludes(workspaceUi, "isCampaignActionBusy(scheduleCampaign.id, \"schedule\")", "duplicate manual reminder guard");
    assertIncludes(workspaceUi, "recordAction(editorContext.campaign as CampaignCueCampaign, \"export\")", "editor server-first export gate");
    assertExcludes(workspaceUi, "downloadCampaignPackZip(editorContext.campaign", "editor pre-authorization download path");
    assertIncludes(workspaceUi, "This measures completeness and safety, not predicted engagement or reach.", "readiness prediction boundary copy");
    assertIncludes(workspaceUi, "The model does not choose campaigns, change protected facts, or post anywhere.", "AI assistance owner boundary copy");
    assertIncludes(docs, "No signed URL, base64, customer contact list", "operating-loop validation boundary");
    assertIncludes(aiDocs, "Additional Firestore reads | 0", "AI assistance validation cost boundary");
    assertIncludes(decisionEngine, "const candidates: string[] = value.match", "target-compatible phone-number candidate narrowing");
};

const main = () => {
    verifyRecipesAndDecisions();
    verifyCommercialAndFreshnessGates();
    verifyCampaignRhythmAndReadiness();
    verifyRequestBoundaries();
    verifyIdempotencyBoundaries();
    verifyStaticBoundaries();
    process.stdout.write(`CampaignCue operating loop verification passed (${checks} checks).\n`);
};

main();
