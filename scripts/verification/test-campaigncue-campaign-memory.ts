#!/usr/bin/env ts-node

import fs from "fs";
import path from "path";
import { CAMPAIGNCUE_CAMPAIGN_MEMORY_MAX_RECIPE_SIGNALS } from "../../src/constants/campaigncue/campaignMemory";
import {
    applyCampaignCueCampaignMemoryResult,
    buildCampaignCueCampaignMemoryView,
    buildCampaignCueRecentCampaignMemory,
    emptyCampaignCueCampaignMemorySummary,
    getCampaignCueCampaignMemoryConfidence,
    isCampaignCueResultSignalAllowed,
} from "../../src/lib/campaigncue/campaignMemory";
import { parseCampaignCueAnalyticsSummaryRecord } from "../../src/lib/campaigncue/recordBoundary";
import { CampaignCueCampaignActionSchema } from "../../src/lib/validation/campaigncueSchemas";
import type { CampaignCueAnalyticsSummary, CampaignCueCampaign } from "../../src/types/campaigncue";

const ROOT = path.resolve(__dirname, "..", "..");
let checks = 0;

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
    if (!condition) throw new Error(message);
    checks += 1;
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

const campaign = (overrides: Partial<CampaignCueCampaign> = {}): CampaignCueCampaign => ({
    id: "cc_campaign_memory",
    workspaceId: "cc_workspace_memory",
    businessBrainId: "default",
    title: "Lunch campaign",
    brief: "Use current lunch facts.",
    status: "used",
    channels: ["whatsapp"],
    outputs: [],
    trustGate: "clear",
    credits: { estimate: 0, reserved: 0, captured: 0, refunded: 0, currency: "credits" },
    actionCounts: {},
    ownerApprovalState: "approved",
    pack: {
        ownerGoal: "bring_people_today",
        recipeId: "restaurant_today_item_push",
        reason: "Lunch is ready.",
        sourceFactIds: [],
        missingInputIds: [],
        deliveryCardIds: [],
        resultQuestion: "What happened?",
    },
    ...overrides,
});

const analyticsRecord = (campaignMemory?: CampaignCueAnalyticsSummary["campaignMemory"]) => ({
    id: "dashboard",
    workspaceId: "cc_workspace_memory",
    campaignCount: 1,
    usedCount: 1,
    exportCount: 1,
    approvalRequestCount: 0,
    manualFallbackCount: 0,
    ownerReportedOutcomeCount: campaignMemory?.totalReceiptCount || 0,
    confidence: "observed",
    campaignMemory,
});

assert(isCampaignCueResultSignalAllowed("orders_or_inquiries", "restaurant_today_item_push"), "recipe result must be allowed");
assert(!isCampaignCueResultSignalAllowed("bookings_received", "restaurant_today_item_push"), "another recipe result must be rejected");
assert(!isCampaignCueResultSignalAllowed("unknown_but_well_formed", "restaurant_today_item_push"), "unknown result must be rejected");
assert(!isCampaignCueResultSignalAllowed("orders_or_inquiries"), "missing recipe must fail closed");
assert(!isCampaignCueResultSignalAllowed("orders_or_inquiries", "retired_recipe"), "unknown recipe must fail closed");
assert(CampaignCueCampaignActionSchema.safeParse({
    action: "record_outcome",
    idempotencyKey: "result_action_123",
    resultSignalId: "orders_or_inquiries",
    resultReceipt: { usedAt: "2026-08-10T10:00:00.000Z" },
}).success, "an observed past use time must pass the result boundary");
assert(!CampaignCueCampaignActionSchema.safeParse({
    action: "record_outcome",
    idempotencyKey: "result_future_123",
    resultSignalId: "orders_or_inquiries",
    resultReceipt: { usedAt: "2999-08-10T10:00:00.000Z" },
}).success, "a future campaign use time must fail closed");
assert(!CampaignCueCampaignActionSchema.safeParse({
    action: "mark_used",
    idempotencyKey: "result_wrong_action_123",
    resultSignalId: "orders_or_inquiries",
}).success, "result details must not be silently accepted by another action");
assert(!CampaignCueCampaignActionSchema.safeParse({
    action: "mark_used",
    idempotencyKey: "schedule_wrong_action_123",
    scheduledAt: "2026-08-10T10:00:00.000Z",
}).success, "schedule details must not be silently accepted by another action");
assert(!CampaignCueCampaignActionSchema.safeParse({
    action: "approve",
    commentId: "comment_123",
    idempotencyKey: "comment_wrong_action_123",
}).success, "comment identifiers must not be silently accepted by another approval action");

let memory = applyCampaignCueCampaignMemoryResult({
    campaignId: "cc_campaign_memory",
    channel: "whatsapp",
    metrics: { orders: 2, replies: 3 },
    recipeId: "restaurant_today_item_push",
    recordedAt: "2026-08-10T10:00:00.000Z",
    resultSignalId: "orders_or_inquiries",
});
assert(memory.totalReceiptCount === 1, "first result must increment total receipts");
assert(memory.usefulCount === 1 && memory.notUsefulCount === 0, "useful result must increment only useful count");
assert(memory.metrics.orders === 2 && memory.metrics.replies === 3, "result metrics must be aggregated");
assert(memory.recipeSignals.length === 1 && memory.channelSignals.length === 1, "first result must create recipe and channel signals");
assert(memory.confidence === "not_enough_results", "one result must remain insufficient evidence");

memory = applyCampaignCueCampaignMemoryResult({
    campaignId: "cc_campaign_memory_2",
    channel: "whatsapp",
    existing: memory,
    metrics: { orders: 999 },
    recipeId: "restaurant_today_item_push",
    recordedAt: "2026-08-11T10:00:00.000Z",
    resultSignalId: "not_used",
});
assert(memory.notUsedCount === 1, "not-used result must be counted separately");
assert(memory.metrics.orders === 2, "not-used metrics must never enter aggregate totals");
assert(memory.recipeSignals[0].sampleCount === 2, "signal sample count must include not-used receipts");

memory = applyCampaignCueCampaignMemoryResult({
    campaignId: "cc_campaign_memory_3",
    channel: "whatsapp",
    existing: memory,
    recipeId: "restaurant_today_item_push",
    recordedAt: "2026-08-12T10:00:00.000Z",
    resultSignalId: "not_useful",
});
assert(memory.notUsefulCount === 1, "not-useful result must increment negative memory");
assert(memory.confidence === "early_signal", "one useful and one not-useful result must remain mixed early evidence");

let repeated = emptyCampaignCueCampaignMemorySummary();
for (let index = 0; index < 3; index += 1) {
    repeated = applyCampaignCueCampaignMemoryResult({
        campaignId: `cc_campaign_repeat_${index}`,
        channel: "whatsapp",
        existing: repeated,
        recipeId: "restaurant_today_item_push",
        recordedAt: `2026-08-${10 + index}T10:00:00.000Z`,
        resultSignalId: "orders_or_inquiries",
    });
}
assert(repeated.confidence === "repeated_signal", "three aligned useful receipts must become a repeated signal");
assert(getCampaignCueCampaignMemoryConfidence(0, 3) === "repeated_signal", "three aligned negative receipts must become repeated evidence");
assert(getCampaignCueCampaignMemoryConfidence(2, 2) === "early_signal", "mixed evidence must not become repeated");

let bounded = emptyCampaignCueCampaignMemorySummary();
for (let index = 0; index < CAMPAIGNCUE_CAMPAIGN_MEMORY_MAX_RECIPE_SIGNALS + 5; index += 1) {
    bounded = applyCampaignCueCampaignMemoryResult({
        campaignId: `cc_campaign_bound_${index}`,
        existing: bounded,
        recipeId: `recipe_${String(index).padStart(2, "0")}`,
        resultSignalId: "useful",
    });
}
assert(bounded.recipeSignals.length === CAMPAIGNCUE_CAMPAIGN_MEMORY_MAX_RECIPE_SIGNALS, "recipe signals must remain bounded");
assert(new Set(bounded.recipeSignals.map((signal) => signal.key)).size === bounded.recipeSignals.length, "recipe signals must remain unique");
assert(JSON.stringify(bounded).includes("owner_reported"), "summary must retain explicit owner-reported source confidence");
assert(!JSON.stringify(bounded).includes("private owner note"), "aggregate must not contain owner-note content");

const recent = buildCampaignCueRecentCampaignMemory([
    campaign({
        resultMemory: {
            lastSignalId: "orders_or_inquiries",
            usefulCount: 2,
            notUsefulCount: 0,
            lastRecordedAt: "2026-08-10T10:00:00.000Z",
            lastReceipt: {
                signalId: "orders_or_inquiries",
                channel: "whatsapp",
                metrics: { orders: 1 },
                confidence: "owner_reported",
            },
        },
    }),
]);
assert(recent.coverage === "bounded_recent_campaigns", "legacy fallback must disclose bounded recent coverage");
assert(recent.usefulCount === 2, "legacy fallback must retain campaign cumulative useful count");
assert(recent.metrics.orders === 1, "legacy fallback may use only the latest bounded metrics");

const emptyView = buildCampaignCueCampaignMemoryView(emptyCampaignCueCampaignMemorySummary());
assert(emptyView.status === "empty", "empty memory must produce an honest empty state");
const usefulView = buildCampaignCueCampaignMemoryView(repeated);
assert(usefulView.status === "usable", "repeated useful evidence must produce reusable status");
assert(usefulView.ownerSummary.includes("owner-reported"), "owner summary must disclose source");
assert(usefulView.costPolicy.firestoreReads === 0, "view projection must add no Firestore read");

const parsed = parseCampaignCueAnalyticsSummaryRecord(analyticsRecord(repeated), "cc_workspace_memory");
assert(parsed.campaignMemory?.totalReceiptCount === 3, "persisted boundary must accept valid bounded memory");
assertThrows(() => parseCampaignCueAnalyticsSummaryRecord(analyticsRecord({
    ...repeated,
    totalReceiptCount: 99,
}), "cc_workspace_memory"), "persisted boundary must reject inconsistent receipt totals");
assertThrows(() => parseCampaignCueAnalyticsSummaryRecord(analyticsRecord({
    ...repeated,
    recipeSignals: [repeated.recipeSignals[0], repeated.recipeSignals[0]],
}), "cc_workspace_memory"), "persisted boundary must reject duplicate recipe keys");

const serverSource = fs.readFileSync(path.join(ROOT, "src/lib/campaigncue/server.ts"), "utf8");
const databaseSource = fs.readFileSync(path.join(ROOT, "src/constants/campaigncue/database.ts"), "utf8");
const featureSource = fs.readFileSync(path.join(ROOT, "src/config/features.ts"), "utf8");
assert(featureSource.includes("ENABLE_CAMPAIGNCUE_CAMPAIGN_MEMORY: true"), "feature gate must be enabled explicitly");
assert(serverSource.includes("isCampaignCueResultSignalAllowed"), "server must validate result IDs against recipe options");
assert(
    serverSource.indexOf("if (CAMPAIGNCUE_CURRENT_WORKSPACE_RECHECK_ACTIONS.has(params.input.action))")
        < serverSource.indexOf("&& !isCampaignCueResultSignalAllowed(params.input.resultSignalId, resultRecipeId)"),
    "invalid result completion must follow the final current-workspace access recheck",
);
assert(serverSource.includes("evidenceNotePresent"), "event must store only note-presence metadata");
assert(!serverSource.includes('note: params.input.note || "Owner reported a result."'), "event must not duplicate raw owner notes");
assert(serverSource.includes("transaction.get(summaryRef)"), "outcome transaction must read current summary for concurrency safety");
assert(!databaseSource.includes("CAMPAIGN_MEMORY"), "campaign memory must not add a collection constant");

console.log(`CampaignCue Campaign Memory tests passed (${checks} checks).`);
