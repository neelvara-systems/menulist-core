#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildCampaignCueLocalVisibilityActions } from "../../src/lib/campaigncue/localVisibility";
import type {
    CampaignCueAsset,
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueLocation,
    CampaignCueSourceInput,
} from "../../src/types/campaigncue";

const ROOT = path.resolve(__dirname, "..", "..");
const NOW = new Date("2026-08-10T10:00:00.000Z");
let checks = 0;
const check = (condition: unknown, message: string) => {
    assert.ok(condition, message);
    checks += 1;
};

const brain: CampaignCueBusinessBrain = {
    id: "default",
    workspaceId: "cc_visibility_workspace",
    businessBrainId: "default",
    businessType: "restaurant",
    name: "Visibility Cafe",
    locality: "Indiranagar",
    contacts: { whatsapp: "+919876543210", website: "https://example.com" },
    brandKit: {
        primaryColor: "#24564d",
        voice: "friendly",
        playbook: { brandFeel: [], inspirationNotes: [], visualMotifs: [], avoidList: [], productFocus: [] },
    },
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    catalog: { items: [], services: [] },
    operatingPulse: { businessState: "normal", capacityStatus: "unknown", stockStatus: "unknown" },
    commercialPolicy: { promotionsAllowed: true, discountsAllowed: true, discountApprovalRequired: false, currencyCode: "INR", doNotPromote: [] },
    presence: {
        googleBusinessProfileUrl: "https://business.google.com/example",
        googleReviewUrl: "https://g.page/r/example/review",
    },
    languagePolicy: { sourceLocale: "en-IN", targetLocales: [], protectedFactReviewRequired: true },
    sourceConfidence: 1,
    readiness: { status: "ready", blockers: [], warnings: [] },
};

const image: CampaignCueAsset = {
    id: "cc_asset_visibility_image",
    workspaceId: brain.workspaceId,
    name: "Storefront",
    assetType: "image",
    status: "ready",
    source: "upload",
    rights: { status: "confirmed", consentType: "owner_confirmed" },
    tags: ["private-upload"],
    file: {
        storagePath: `campaigncue/assets/${brain.workspaceId}/photo/source.jpg`,
        storageGeneration: "101",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
    },
    usageRefs: [],
};

const googleCampaign: CampaignCueCampaign = {
    id: "cc_campaign_visibility",
    workspaceId: brain.workspaceId,
    businessBrainId: "default",
    title: "Local update",
    brief: "Current local handoff.",
    status: "generated",
    channels: ["google_local"],
    outputs: [{
        id: "cc_output_google",
        channel: "google_local",
        label: "Google update",
        mode: "manual_export",
        text: "Current local update",
        sourceReferences: ["cc_source_current"],
        providerMode: "manual_export",
        trustGate: "clear",
        fields: {
            headline: "Current local update",
            body: "Current local update",
            cta: "View details",
            dimensions: "1200x900",
            imageBrief: "Use the approved storefront image.",
            postType: "google_update",
            consentNote: "Use only approved owner media.",
            policyNote: "Review facts before manual use.",
            destination: "https://example.com",
            utm: "",
            approvalNote: "Owner approved.",
            ownerUseCase: "Copy into the owner-managed Google profile.",
            manualSteps: ["Copy after checking facts."],
        },
    }],
    trustGate: "clear",
    credits: { estimate: 0, reserved: 0, captured: 0, refunded: 0, currency: "credits" },
    actionCounts: {},
    ownerApprovalState: "approved",
    pack: {
        ownerGoal: "prepare_local_pack",
        reason: "Keep local details current.",
        sourceFactIds: [],
        missingInputIds: [],
        deliveryCardIds: [],
        resultQuestion: "Did this help local visibility?",
        freshness: {
            sourceHash: "source_hash",
            status: "current",
            expiresAt: "2026-08-11T10:00:00.000Z",
            recheckActions: ["download", "export", "archive_export", "mark_used", "schedule"],
        },
    },
    updatedAt: "2026-08-10T09:00:00.000Z",
};

const currentInput: CampaignCueSourceInput = {
    id: "cc_source_current",
    workspaceId: brain.workspaceId,
    sourceType: "event",
    label: "Current weekend event",
    value: "Owner-confirmed weekend event",
    status: "active",
    confidence: "manual",
    sourceRefs: ["owner_input"],
    facts: [],
    expiresAt: "2026-08-12T10:00:00.000Z",
};

const expiredInput: CampaignCueSourceInput = {
    ...currentInput,
    id: "cc_source_expired",
    label: "Old offer",
    expiresAt: "2026-08-09T10:00:00.000Z",
};

const build = (overrides: Partial<Parameters<typeof buildCampaignCueLocalVisibilityActions>[0]> = {}) => (
    buildCampaignCueLocalVisibilityActions({
        assets: [image],
        businessBrain: brain,
        campaigns: [googleCampaign],
        locations: [],
        now: NOW,
        sourceInputs: [currentInput, expiredInput],
        ...overrides,
    })
);

const actions = build();
check(actions[0]?.id === "visibility_expired_inputs", "review-needed actions must sort before ready actions");
check(actions[0]?.priority === "review", "expired owner input must be a review action");
check(actions.find((item) => item.id === "visibility_fresh_google_pack")?.status === "ready", "trust-clear non-expired Google output must be ready");
check(actions.find((item) => item.id === "visibility_fresh_google_pack")?.actionKind === "open_tab", "ready Google output must open handoff instead of generating again");
check(actions.find((item) => item.id === "visibility_approved_image")?.status === "ready", "durable rights-confirmed image must satisfy local image readiness");
check(actions.find((item) => item.id === "visibility_review_destination")?.status === "ready", "saved owner-managed review destination must be ready");
check(actions.every((item) => item.evidence.length <= 5 && item.manualSteps.length <= 4 && item.sourceReferences.length <= 8), "action payloads must remain bounded");

const missingTruth = build({
    businessBrain: { ...brain, locality: undefined, contacts: {}, presence: {} },
    campaigns: [],
    sourceInputs: [],
});
check(missingTruth[0]?.priority === "do_now", "missing truth must rank ahead of review and ready actions");
check(missingTruth.find((item) => item.id === "visibility_identity")?.status === "missing", "missing locality must be explicit");
check(missingTruth.find((item) => item.id === "visibility_customer_destination")?.status === "missing", "missing customer destination must be explicit");
check(missingTruth.find((item) => item.id === "visibility_fresh_google_pack")?.actionKind === "create_visibility_pack", "missing Google output must route to the deterministic pack builder");

const expiredGoogle = build({ now: new Date("2026-08-12T10:00:00.000Z") });
check(expiredGoogle.find((item) => item.id === "visibility_fresh_google_pack")?.status === "needs_review", "caller clock must deterministically expire a Google-ready pack");
check(expiredGoogle.find((item) => item.id === "visibility_fresh_google_pack")?.actionKind === "create_visibility_pack", "expired Google pack must route to fresh pack creation");

const videoOnly = build({ assets: [{ ...image, id: "cc_video", assetType: "video", file: { ...image.file!, mimeType: "video/mp4" } }] });
check(videoOnly.find((item) => item.id === "visibility_approved_image")?.status === "needs_review", "ready video must not masquerade as a profile image");

const locations: CampaignCueLocation[] = [
    { id: "cc_location_one", workspaceId: brain.workspaceId, name: "Central", locality: "Indiranagar", status: "active", sourceRefs: [] },
    { id: "cc_location_two", workspaceId: brain.workspaceId, name: "North", status: "active", sourceRefs: [] },
];
const branchActions = build({ locations });
check(branchActions.find((item) => item.id === "visibility_branch_context")?.status === "needs_review", "multi-location action must expose incomplete branch locality");
check(branchActions.find((item) => item.id === "visibility_branch_context")?.completionSource === "location", "branch action must identify location truth as completion source");

const source = fs.readFileSync(path.join(ROOT, "src/lib/campaigncue/localVisibility.ts"), "utf8");
const ui = fs.readFileSync(path.join(ROOT, "src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), "utf8");
check(!source.includes("fetch("), "local visibility decisions must not call external profiles");
check(!source.toLowerCase().includes("firebase"), "local visibility decisions must not add Firebase access");
check(!source.includes("Date.now()"), "local visibility expiry must use the caller-provided clock");
check(ui.includes("CampaignCue does not inspect or update external profiles."), "owner UI must state the external-profile boundary");
check(ui.includes("What this unlocks"), "owner UI must explain why an action matters");

process.stdout.write(`CampaignCue local visibility verification passed (${checks} checks).\n`);
