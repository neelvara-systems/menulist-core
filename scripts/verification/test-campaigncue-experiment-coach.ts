#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CAMPAIGNCUE_DAILY_DESK_RECIPES } from "../../src/constants/campaigncue/dailyDesk";
import { CAMPAIGNCUE_EXPORT_ACTIONS } from "../../src/constants/campaigncue/delivery";
import {
    acceptCampaignCueExperiment,
    completeCampaignCueExperimentForResult,
    getCampaignCueExperimentStatus,
} from "../../src/lib/campaigncue/experimentCoach";
import { buildCampaignCueExperimentSuggestion } from "../../src/lib/campaigncue/operatingLoop";
import { parseCampaignCueCampaignRecord } from "../../src/lib/campaigncue/recordBoundary";
import { CampaignCueCampaignActionSchema } from "../../src/lib/validation/campaigncueSchemas";
import type {
    CampaignCueAsset,
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueExperimentSuggestion,
} from "../../src/types/campaigncue";

const ROOT = path.resolve(__dirname, "..", "..");
let checks = 0;
const check = (condition: unknown, message: string) => {
    assert.ok(condition, message);
    checks += 1;
};

const recipe = CAMPAIGNCUE_DAILY_DESK_RECIPES.find((item) => item.id === "restaurant_slow_lunch_push");
check(recipe, "experiment fixture recipe must exist");
if (!recipe) throw new Error("Experiment fixture recipe unavailable");

const brain: CampaignCueBusinessBrain = {
    id: "default",
    workspaceId: "cc_experiment_workspace",
    businessBrainId: "default",
    businessType: "restaurant",
    name: "Experiment Cafe",
    contacts: { whatsapp: "+919876543210" },
    brandKit: {
        primaryColor: "#24564d",
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
    catalog: { items: [], services: [] },
    operatingPulse: { businessState: "quiet", capacityStatus: "available", stockStatus: "available" },
    commercialPolicy: {
        promotionsAllowed: true,
        discountsAllowed: true,
        discountApprovalRequired: false,
        currencyCode: "INR",
        doNotPromote: [],
    },
    presence: {},
    languagePolicy: { sourceLocale: "en-IN", targetLocales: [], protectedFactReviewRequired: true },
    sourceConfidence: 1,
    readiness: { status: "ready", blockers: [], warnings: [] },
};

const asset: CampaignCueAsset = {
    id: "cc_asset_ready_photo",
    workspaceId: brain.workspaceId,
    name: "Lunch photo",
    assetType: "image",
    status: "ready",
    source: "upload",
    rights: { status: "confirmed", consentType: "not_applicable" },
    tags: ["private-upload"],
    file: {
        storagePath: `campaigncue/assets/${brain.workspaceId}/upload/source.png`,
        storageGeneration: "123",
        mimeType: "image/png",
        sizeBytes: 1024,
    },
    usageRefs: [],
};

const campaign = (id: string, updatedAt: string, result: "positive" | "not_useful"): CampaignCueCampaign => ({
    id,
    workspaceId: brain.workspaceId,
    businessBrainId: "default",
    title: "Lunch campaign",
    brief: "Checked lunch details.",
    status: "used",
    channels: ["whatsapp"],
    outputs: [],
    trustGate: "clear",
    credits: { estimate: 0, reserved: 0, captured: 0, refunded: 0, currency: "credits" },
    actionCounts: {},
    ownerApprovalState: "approved",
    pack: {
        ownerGoal: recipe.ownerGoal,
        reason: "Lunch is ready.",
        recipeId: recipe.id,
        sourceFactIds: [],
        missingInputIds: [],
        deliveryCardIds: [],
        resultQuestion: recipe.resultQuestion,
    },
    resultMemory: result === "positive"
        ? { lastSignalId: "orders_or_inquiries", usefulCount: 1, notUsefulCount: 0, lastReceipt: { signalId: "orders_or_inquiries", metrics: { orders: 2 }, confidence: "owner_reported" } }
        : { lastSignalId: "not_useful", usefulCount: 0, notUsefulCount: 1, lastReceipt: { signalId: "not_useful", metrics: {}, confidence: "owner_reported" } },
    updatedAt,
});

const suggestion = buildCampaignCueExperimentSuggestion({
    assets: [asset],
    businessBrain: brain,
    campaigns: [
        campaign("cc_campaign_old", "2026-08-01T10:00:00.000Z", "not_useful"),
        campaign("cc_campaign_new", "2026-08-09T10:00:00.000Z", "positive"),
    ],
    recipe,
});
check(suggestion.variable === "timing", "latest matching owner result must drive the one-change suggestion");
check(suggestion.baselineCampaignId === "cc_campaign_new", "suggestion must reference the latest matching baseline");
check(suggestion.status === "suggested", "new suggestions must start in suggested state");
check(suggestion.source === "deterministic_rules", "model output must not own experiment selection");
check(suggestion.confidence === "owner_history", "owner history must be labelled separately from guidance-only suggestions");
check(suggestion.predictionBoundary === "no_performance_prediction", "suggestion must preserve the no-prediction boundary");
check(suggestion.keepConstant?.length === 5 && !suggestion.keepConstant.includes("timing"), "exactly one variable must be changed");
check(suggestion.measurement?.question === recipe.resultQuestion, "measurement must reuse the recipe result question");
check(suggestion.measurement?.resultSignalIds.includes("not_used"), "measurement must retain the recipe's not-used outcome");

const noCta = buildCampaignCueExperimentSuggestion({
    assets: [asset],
    businessBrain: { ...brain, contacts: {} },
    campaigns: [],
    recipe,
});
check(noCta.variable === "cta" && noCta.confidence === "guidance_only", "missing CTA must produce bounded guidance without claiming history");

const legacy: CampaignCueExperimentSuggestion = {
    variable: "format",
    instruction: "Use one format.",
    reason: "Establish a baseline.",
};
check(getCampaignCueExperimentStatus(legacy) === "suggested", "legacy experiments without status must remain readable as suggested");
const accepted = acceptCampaignCueExperiment(legacy, "2026-08-10T10:00:00.000Z");
check(accepted.status === "accepted" && Boolean(accepted.acceptedAt), "explicit acceptance must create accepted state");
check(completeCampaignCueExperimentForResult({
    completedAt: "2026-08-11T10:00:00.000Z",
    experiment: accepted,
    resultSignalId: "orders_or_inquiries",
}) === accepted, "missing tested variable must not complete or infer an experiment");
check(completeCampaignCueExperimentForResult({
    completedAt: "2026-08-11T10:00:00.000Z",
    experiment: accepted,
    experimentVariable: "channel",
    resultSignalId: "orders_or_inquiries",
}) === accepted, "a different tested variable must not complete the accepted experiment");
check(completeCampaignCueExperimentForResult({
    completedAt: "2026-08-11T10:00:00.000Z",
    experiment: accepted,
    experimentVariable: "format",
    resultSignalId: "not_used",
}) === accepted, "not-used result must not claim that a test completed");
const completed = completeCampaignCueExperimentForResult({
    completedAt: "2026-08-11T10:00:00.000Z",
    experiment: accepted,
    experimentVariable: "format",
    resultSignalId: "orders_or_inquiries",
});
check(completed?.status === "completed", "matching explicit result must complete an accepted experiment");
check(completed?.completedResultSignalId === "orders_or_inquiries", "completed experiment must retain its bounded result signal");

check(CAMPAIGNCUE_EXPORT_ACTIONS.includes("accept_experiment"), "existing campaign action contract must admit experiment acceptance");
check(CampaignCueCampaignActionSchema.safeParse({ action: "accept_experiment", idempotencyKey: "accept_experiment_123" }).success, "experiment acceptance must require the ordinary idempotent action envelope");

const parsed = parseCampaignCueCampaignRecord({
    ...campaign("cc_campaign_parse", "2026-08-09T10:00:00.000Z", "positive"),
    pack: {
        ...campaign("cc_campaign_parse", "2026-08-09T10:00:00.000Z", "positive").pack,
        experiment: suggestion,
    },
}, { campaignId: "cc_campaign_parse", workspaceId: brain.workspaceId });
check(parsed.pack?.experiment?.measurement?.resultSignalIds.length === recipe.resultOptions.length, "durable parser must preserve bounded measurement options");

const server = fs.readFileSync(path.join(ROOT, "src/lib/campaigncue/server.ts"), "utf8");
const ui = fs.readFileSync(path.join(ROOT, "src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), "utf8");
check(!server.includes("receipt?.experimentVariable || params.campaign.pack?.experiment?.variable"), "result recording must never default to a suggested variable");
check(server.includes('params.input.action !== "accept_experiment"'), "accepting a test must skip the unrelated dashboard-summary write");
check(server.includes("CAMPAIGNCUE_EXPERIMENT_ACCEPTANCE_ROLES"), "server must enforce experiment decision roles");
check(server.includes('"accept_experiment",\n    "record_outcome",\n    "record_result_evidence",'), "experiment acceptance and result writes recheck the current workspace in their transaction");
check(server.includes('params.input.action === "accept_experiment"') && server.includes("CAMPAIGNCUE_EXPERIMENT_ACCEPTANCE_ROLES.has(currentRole)"), "transaction rechecks the current experiment role before mutation");
check(ui.includes("Use this test"), "owner UI must expose explicit test acceptance");
check(ui.includes("Select this variable above only if it was the one thing you actually changed."), "result UI must explain explicit variable evidence");

process.stdout.write(`CampaignCue experiment coach verification passed (${checks} checks).\n`);
