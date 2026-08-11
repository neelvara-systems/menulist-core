#!/usr/bin/env ts-node

import fs from "fs";
import path from "path";
import { CAMPAIGNCUE_DAILY_DESK_RECIPES } from "../../src/constants/campaigncue/dailyDesk";
import { CAMPAIGNCUE_PRODUCT_CODE } from "../../src/constants/campaigncue/product";
import { CAMPAIGNCUE_WINNING_PACK_MAX_REFRESH_GENERATION } from "../../src/constants/campaigncue/winningPackRefresh";
import { buildCampaignCueCampaignRhythm } from "../../src/lib/campaigncue/operatingLoop";
import { parseCampaignCueCampaignRecord } from "../../src/lib/campaigncue/recordBoundary";
import type {
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueWorkspace,
} from "../../src/types/campaigncue";

const ROOT = path.resolve(__dirname, "..", "..");
const NOW = new Date("2026-08-10T10:00:00.000Z");
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

const workspace: CampaignCueWorkspace = {
    id: "cc_refresh_workspace",
    workspaceId: "cc_refresh_workspace",
    productId: CAMPAIGNCUE_PRODUCT_CODE,
    tId: "tenant_refresh",
    sId: "store_refresh",
    name: "Refresh Cafe",
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

const businessBrain = (validUntil = "2026-08-10T12:00:00.000Z"): CampaignCueBusinessBrain => ({
    id: "default",
    workspaceId: workspace.workspaceId,
    businessBrainId: "default",
    businessType: "restaurant",
    name: "Refresh Cafe",
    locality: "Indiranagar",
    contacts: { whatsapp: "+919876543210" },
    brandKit: {
        primaryColor: "#24564d",
        voice: "friendly",
        playbook: {
            brandFeel: ["clear"],
            inspirationNotes: [],
            visualMotifs: [],
            avoidList: [],
            productFocus: ["Lunch"],
        },
    },
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    catalog: { items: [], services: [] },
    operatingPulse: {
        businessState: "quiet",
        capacityStatus: "available",
        stockStatus: "available",
        localMoment: "Neighbourhood festival weekend",
        validUntil,
    },
    commercialPolicy: {
        promotionsAllowed: true,
        discountsAllowed: true,
        discountApprovalRequired: false,
        currencyCode: "INR",
        doNotPromote: [],
    },
    presence: {},
    languagePolicy: {
        sourceLocale: "en-IN",
        targetLocales: [],
        protectedFactReviewRequired: true,
    },
    sourceConfidence: 1,
    readiness: { status: "ready", blockers: [], warnings: [] },
});

const campaign = (overrides: Partial<CampaignCueCampaign> = {}): CampaignCueCampaign => ({
    id: "cc_refresh_source",
    workspaceId: workspace.workspaceId,
    businessBrainId: "default",
    title: "Useful lunch pack",
    brief: "Use checked lunch details.",
    status: "used",
    channels: ["whatsapp"],
    outputs: [],
    trustGate: "clear",
    credits: { estimate: 0, reserved: 0, captured: 0, refunded: 0, currency: "credits" },
    actionCounts: {},
    ownerApprovalState: "approved",
    pack: {
        ownerGoal: "bring_people_today",
        reason: "Lunch was ready.",
        recipeId: "restaurant_slow_lunch_push",
        sourceFactIds: [],
        missingInputIds: [],
        deliveryCardIds: [],
        resultQuestion: "What happened?",
        sourceTemplateId: "template_lunch",
    },
    resultMemory: {
        lastSignalId: "orders_or_inquiries",
        lastRecordedAt: "2026-08-09T10:00:00.000Z",
        usefulCount: 1,
        notUsefulCount: 0,
        lastReceipt: {
            signalId: "orders_or_inquiries",
            channel: "whatsapp",
            metrics: { orders: 2 },
            confidence: "owner_reported",
        },
    },
    createdAt: "2026-08-08T10:00:00.000Z",
    updatedAt: "2026-08-09T10:00:00.000Z",
    ...overrides,
});

const lunchRecipe = CAMPAIGNCUE_DAILY_DESK_RECIPES.find((recipe) => recipe.id === "restaurant_slow_lunch_push");
assert(lunchRecipe, "lunch refresh fixture recipe must exist");

const rhythm = buildCampaignCueCampaignRhythm({
    businessBrain: businessBrain(),
    campaigns: [campaign()],
    recommendedRecipeId: lunchRecipe.id,
    recipe: lunchRecipe,
    schedules: [],
    workspace,
    now: NOW,
});
assert(rhythm.status === "reuse_ready", "eligible useful pack must become the next refresh action");
assert(rhythm.reuseCandidate?.currentFit === "recommended_now", "matching current recipe must be labelled recommended now");
assert(rhythm.reuseCandidate?.sourceConfidence === "owner_reported", "refresh evidence must disclose owner source");
assert(rhythm.reuseCandidate?.confidence === "not_enough_results", "one useful result must not be overstated");
assert(rhythm.reuseCandidate?.seasonalContext === "Neighbourhood festival weekend", "current owner-entered moment must be shown");
assert(rhythm.reuseCandidate?.refreshRootCampaignId === "cc_refresh_source", "first refresh must use source as root");
assert(rhythm.reuseCandidate?.refreshGeneration === 1, "first refresh generation must be one");
assert(rhythm.reuseCandidate?.recheckActions.length === 5, "refresh must disclose all current-use rechecks");
assert(rhythm.reuseCandidate?.recheckActions.includes("archive_export"), "refresh must disclose the cloud archive freshness recheck");

const higherScoreOtherRecipe = campaign({
    id: "cc_other_recipe",
    pack: { ...campaign().pack!, recipeId: "restaurant_today_item_push" },
    resultMemory: { ...campaign().resultMemory!, usefulCount: 8 },
});
const currentFitWins = buildCampaignCueCampaignRhythm({
    campaigns: [higherScoreOtherRecipe, campaign()],
    recommendedRecipeId: lunchRecipe.id,
    recipe: lunchRecipe,
    schedules: [],
    workspace,
    now: NOW,
});
assert(currentFitWins.reuseCandidate?.campaignId === "cc_refresh_source", "current recipe fit must outrank a higher raw score from another recipe");

const reviewFit = buildCampaignCueCampaignRhythm({
    campaigns: [higherScoreOtherRecipe],
    recommendedRecipeId: lunchRecipe.id,
    recipe: lunchRecipe,
    schedules: [],
    workspace,
    now: NOW,
});
assert(reviewFit.reuseCandidate?.currentFit === "available_after_review", "non-current recipe must require timing review");

for (const ineligible of [
    campaign({ id: "cc_archived", status: "archived" }),
    campaign({ id: "cc_blocked", trustGate: "blocked" }),
    campaign({ id: "cc_negative", resultMemory: { ...campaign().resultMemory!, usefulCount: 1, notUsefulCount: 2 } }),
    campaign({ id: "cc_retired", pack: { ...campaign().pack!, recipeId: "retired_recipe" } }),
]) {
    const candidate = buildCampaignCueCampaignRhythm({
        campaigns: [ineligible],
        recipe: lunchRecipe,
        schedules: [],
        workspace,
        now: NOW,
    }).reuseCandidate;
    assert(!candidate, `${ineligible.id} must not become a refresh candidate`);
}

const expiredContext = buildCampaignCueCampaignRhythm({
    businessBrain: businessBrain("2026-08-10T09:59:59.000Z"),
    campaigns: [campaign()],
    recipe: lunchRecipe,
    schedules: [],
    workspace,
    now: NOW,
});
assert(!expiredContext.reuseCandidate?.seasonalContext, "expired owner pulse must not supply seasonal context");

const chained = campaign({
    pack: {
        ...campaign().pack!,
        reuseRootCampaignId: "cc_original_root",
        refreshGeneration: CAMPAIGNCUE_WINNING_PACK_MAX_REFRESH_GENERATION,
    },
});
const chainedCandidate = buildCampaignCueCampaignRhythm({
    campaigns: [chained],
    recipe: lunchRecipe,
    schedules: [],
    workspace,
    now: NOW,
}).reuseCandidate;
assert(chainedCandidate?.refreshRootCampaignId === "cc_original_root", "refresh chain must retain the original root");
assert(chainedCandidate?.refreshGeneration === CAMPAIGNCUE_WINNING_PACK_MAX_REFRESH_GENERATION, "refresh generation must remain bounded");

const persisted = parseCampaignCueCampaignRecord(chained, {
    campaignId: chained.id,
    workspaceId: workspace.workspaceId,
});
assert(persisted.pack?.reuseRootCampaignId === "cc_original_root", "persisted boundary must accept bounded refresh provenance");
assertThrows(() => parseCampaignCueCampaignRecord({
    ...chained,
    pack: { ...chained.pack, refreshGeneration: CAMPAIGNCUE_WINNING_PACK_MAX_REFRESH_GENERATION + 1 },
}, { campaignId: chained.id, workspaceId: workspace.workspaceId }), "persisted boundary must reject unbounded generation");

const serverSource = fs.readFileSync(path.join(ROOT, "src/lib/campaigncue/server.ts"), "utf8");
const databaseSource = fs.readFileSync(path.join(ROOT, "src/constants/campaigncue/database.ts"), "utf8");
const featureSource = fs.readFileSync(path.join(ROOT, "src/config/features.ts"), "utf8");
assert(featureSource.includes("ENABLE_CAMPAIGNCUE_WINNING_PACK_REFRESH: true"), "refresh feature gate must be explicit");
assert(serverSource.includes("!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_WINNING_PACK_REFRESH"), "server must enforce the refresh feature gate");
assert(serverSource.includes("reuseCampaign.pack?.reuseRootCampaignId || reuseCampaign.id"), "server must own refresh root provenance");
assert(serverSource.includes("reuseCampaign?.pack?.sourceTemplateId || params.input.sourceTemplateId"), "refresh must preserve template provenance");
assert(serverSource.includes("buildCampaignCuePackFreshness"), "refresh must rebuild current freshness");
assert(!databaseSource.includes("WINNING_PACK"), "refresh must not add a collection constant");

console.log(`CampaignCue Winning Pack Refresh tests passed (${checks} checks).`);
