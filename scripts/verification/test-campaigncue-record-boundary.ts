import assert from "node:assert/strict";
import {
    parseCampaignCueAnalyticsSummaryRecord,
    parseCampaignCueCampaignRecord,
    parseCampaignCueLocationRecord,
    parseCampaignCueScheduleRecord,
    parseCampaignCueSourceInputRecord,
    parseCampaignCueSourceSnapshotRecord,
} from "@lib/campaigncue/recordBoundary";

const workspaceId = "cc_workspace_10_20";
const campaign = {
    id: "cc_campaign_123",
    workspaceId,
    businessBrainId: "default",
    title: "Lunch offer",
    brief: "Prepare the checked lunch offer.",
    status: "generated",
    channels: ["whatsapp"],
    outputs: [{
        id: "output_1",
        channel: "whatsapp",
        label: "WhatsApp message",
        mode: "manual_export",
        text: "Lunch offer",
        sourceReferences: ["store_profile"],
        providerMode: "manual_export",
        trustGate: "clear",
        fields: {
            headline: "Lunch offer",
            body: "Lunch offer",
            cta: "View menu",
            imageBrief: "Use the checked menu image.",
            dimensions: "1080x1080",
            postType: "whatsapp_message",
            consentNote: "Owner supplied.",
            policyNote: "Manual export only.",
            destination: "WhatsApp",
            utm: "",
            approvalNote: "Review before use.",
            manualSteps: ["Download", "Review", "Share"],
        },
    }],
    trustGate: "clear",
    credits: {
        estimate: 0,
        reserved: 0,
        captured: 0,
        refunded: 0,
        currency: "credits",
    },
    actionCounts: {},
    ownerApprovalState: "not_requested",
};

assert.equal(
    parseCampaignCueCampaignRecord(campaign, { campaignId: campaign.id, workspaceId }).id,
    campaign.id,
);
assert.equal(
    parseCampaignCueCampaignRecord({
        ...campaign,
        locationId: null,
        pack: null,
        resultMemory: null,
    }, { campaignId: campaign.id, workspaceId }).id,
    campaign.id,
    "legacy nulls in optional Firestore fields normalize to absence",
);
assert.throws(
    () => parseCampaignCueCampaignRecord({ ...campaign, workspaceId: "cc_workspace_99_99" }, {
        campaignId: campaign.id,
        workspaceId,
    }),
    /scope is invalid/,
);
assert.throws(
    () => parseCampaignCueCampaignRecord({ ...campaign, actionCounts: { export: "1" } }, {
        campaignId: campaign.id,
        workspaceId,
    }),
);
assert.throws(
    () => parseCampaignCueCampaignRecord({
        ...campaign,
        outputs: [{ ...campaign.outputs[0], trustGate: "trusted" }],
    }, { campaignId: campaign.id, workspaceId }),
);
assert.throws(
    () => parseCampaignCueCampaignRecord({
        ...campaign,
        pack: {
            ownerGoal: "invented_goal",
            reason: "Invalid legacy goal.",
            sourceFactIds: [],
            missingInputIds: [],
            deliveryCardIds: [],
            resultQuestion: "Did this help?",
        },
    }, { campaignId: campaign.id, workspaceId }),
);
assert.throws(
    () => parseCampaignCueCampaignRecord({
        ...campaign,
        outputs: [{
            ...campaign.outputs[0],
            metadata: { privateOwnerNote: "must not cross the persisted output contract" },
        }],
    }, { campaignId: campaign.id, workspaceId }),
);

const summary = {
    id: "dashboard",
    workspaceId,
    campaignCount: 1,
    usedCount: 0,
    exportCount: 0,
    approvalRequestCount: 0,
    manualFallbackCount: 0,
    ownerReportedOutcomeCount: 0,
    confidence: "observed",
};
assert.equal(parseCampaignCueAnalyticsSummaryRecord(summary, workspaceId).campaignCount, 1);
assert.throws(() => parseCampaignCueAnalyticsSummaryRecord({ ...summary, campaignCount: "1" }, workspaceId));
assert.throws(() => parseCampaignCueAnalyticsSummaryRecord({ ...summary, campaignCount: -1 }, workspaceId));

const sourceSnapshot = {
    id: "current",
    workspaceId,
    sourceType: "manual",
    sourceHash: "source_hash_123",
    sourceRefs: ["owner_input"],
    confidence: 1,
    freshness: "fresh",
    summary: "Owner supplied facts.",
    facts: [],
    missingFacts: [],
    verticalRisks: [],
};
assert.equal(parseCampaignCueSourceSnapshotRecord(sourceSnapshot, workspaceId).sourceHash, "source_hash_123");
assert.throws(() => parseCampaignCueSourceSnapshotRecord({ ...sourceSnapshot, confidence: 2 }, workspaceId));

assert.equal(parseCampaignCueLocationRecord({
    id: "location_1",
    workspaceId,
    name: "Main outlet",
    status: "active",
    sourceRefs: ["owner_input"],
}, workspaceId).status, "active");
assert.throws(() => parseCampaignCueLocationRecord({
    id: "location_1",
    workspaceId: "cc_workspace_99_99",
    name: "Foreign outlet",
    status: "active",
    sourceRefs: ["owner_input"],
}, workspaceId));

const schedule = {
    id: "schedule_1",
    workspaceId,
    campaignId: campaign.id,
    channel: "whatsapp",
    mode: "manual_task",
    status: "scheduled",
    scheduledAt: "2026-07-28T10:00:00.000Z",
    timezone: "Asia/Kolkata",
    note: "Share after owner review.",
};
assert.equal(parseCampaignCueScheduleRecord(schedule, workspaceId).status, "scheduled");
assert.throws(() => parseCampaignCueScheduleRecord({ ...schedule, scheduledAt: undefined }, workspaceId));
assert.throws(() => parseCampaignCueScheduleRecord({ ...schedule, scheduledAt: null }, workspaceId));

const patternSource = {
    id: "source_pattern_1",
    workspaceId,
    sourceType: "inspiration_pattern",
    label: "Owner-approved format reference",
    value: "Use the abstract format only.",
    status: "active",
    confidence: "manual",
    sourceRefs: ["owner_input"],
    facts: [],
    patternCue: {
        schemaVersion: 1,
        sourceUrl: "https://www.instagram.com/reel/example",
        sourceHash: "a".repeat(24),
        platform: "instagram",
        rightsStatus: "reference_only",
        analysisMode: "deterministic",
        hookType: "question",
        format: "talking_head",
        pacing: "steady",
        durationBand: "15_to_30_seconds",
        structure: ["Open with one current owner-approved fact."],
        visualBeats: ["Show the real item."],
        ctaPattern: "visit",
        candidateHooks: ["Looking for today's current menu?"],
        adaptationGuardrails: ["Do not copy source wording or footage."],
        summary: "Question-led talking-head reference.",
    },
};
assert.equal(parseCampaignCueSourceInputRecord(patternSource, workspaceId).patternCue?.platform, "instagram");
assert.throws(() => parseCampaignCueSourceInputRecord({
    ...patternSource,
    patternCue: { ...patternSource.patternCue, rightsStatus: "copied_with_permission_unknown" },
}, workspaceId));
assert.throws(() => parseCampaignCueSourceInputRecord({
    ...patternSource,
    patternCue: { ...patternSource.patternCue, sourceUrl: "https://localhost/private" },
}, workspaceId));

console.log("CampaignCue persisted record boundary tests passed.");
