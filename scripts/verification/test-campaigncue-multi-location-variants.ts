#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
    applyCampaignCueLocationToBusinessBrain,
    buildCampaignCueLocationRecordSourceHash,
    buildCampaignCueLocationSourceHash,
    buildCampaignCueLocationTruthSnapshot,
    buildCampaignCueLocationVariantCampaignId,
    buildCampaignCueLocationVariantGroupId,
} from "../../src/lib/campaigncue/locationVariants";
import { buildCampaignCueVisibleCampaignAnalytics } from "../../src/lib/campaigncue/campaignMemory";
import { CampaignCueLocationVariantBatchSchema } from "../../src/lib/validation/campaigncueSchemas";
import type { CampaignCueBusinessBrain, CampaignCueCampaign, CampaignCueLocation } from "../../src/types/campaigncue";

const ROOT = path.resolve(__dirname, "..", "..");
let checks = 0;
const check = (condition: unknown, message: string) => {
    assert.ok(condition, message);
    checks += 1;
};
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const brain: CampaignCueBusinessBrain = {
    id: "default",
    workspaceId: "cc_workspace_locations",
    businessBrainId: "default",
    businessType: "salon",
    name: "Branch Salon",
    locality: "Bengaluru",
    contacts: {
        phone: "+91 90000 00000",
        whatsapp: "+91 90000 00000",
        bookingUrl: "https://example.com/book",
        website: "https://example.com",
    },
    brandKit: {
        primaryColor: "#123F3A",
        voice: "friendly",
        playbook: { brandFeel: [], inspirationNotes: [], visualMotifs: [], avoidList: [], productFocus: [] },
    },
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    catalog: { items: [], services: [] },
    operatingPulse: { businessState: "normal", capacityStatus: "available", stockStatus: "unknown" },
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

const location: CampaignCueLocation = {
    id: "cc_location_indiranagar",
    workspaceId: brain.workspaceId,
    name: "Indiranagar branch",
    locality: "Indiranagar",
    contacts: { whatsapp: "+91 98888 88888" },
    status: "active",
    sourceRefs: ["owner_input"],
};

const branchBrain = applyCampaignCueLocationToBusinessBrain(brain, location);
check(branchBrain.locality === "Indiranagar", "branch locality overrides the shared locality");
check(branchBrain.contacts.whatsapp === "+91 98888 88888", "branch WhatsApp overrides the shared contact");
check(branchBrain.contacts.bookingUrl === brain.contacts.bookingUrl, "blank branch contact inherits confirmed shared truth");

const snapshot = buildCampaignCueLocationTruthSnapshot(brain, location);
check(snapshot.locationId === location.id && snapshot.contacts.bookingUrl === brain.contacts.bookingUrl, "snapshot stores effective branch truth");
check(snapshot.sourceHash === buildCampaignCueLocationRecordSourceHash(location), "snapshot hash is derived from the branch record only");
check(
    buildCampaignCueLocationRecordSourceHash({ ...location, name: "Changed branch" }) !== snapshot.sourceHash,
    "branch name changes invalidate the branch snapshot",
);
const contactsInAnotherInsertionOrder: CampaignCueLocation = {
    ...location,
    contacts: {
        website: "https://example.com",
        phone: "+91 90000 00000",
        whatsapp: "+91 98888 88888",
    },
};
const contactsInCanonicalOrder: CampaignCueLocation = {
    ...location,
    contacts: {
        whatsapp: "+91 98888 88888",
        phone: "+91 90000 00000",
        website: "https://example.com",
    },
};
check(
    buildCampaignCueLocationRecordSourceHash(contactsInAnotherInsertionOrder)
        === buildCampaignCueLocationRecordSourceHash(contactsInCanonicalOrder),
    "logical branch contacts hash identically regardless of object insertion order",
);
check(
    buildCampaignCueLocationSourceHash("global_one", snapshot) !== buildCampaignCueLocationSourceHash("global_two", snapshot),
    "global Business Brain changes invalidate a branch pack",
);
check(
    buildCampaignCueLocationSourceHash("global_one", snapshot) !== buildCampaignCueLocationSourceHash("global_one", {
        sourceHash: buildCampaignCueLocationRecordSourceHash({ ...location, contacts: { whatsapp: "+91 97777 77777" } }),
    }),
    "branch contact changes invalidate a branch pack",
);

const groupId = buildCampaignCueLocationVariantGroupId("request_hash:key_one");
check(groupId === buildCampaignCueLocationVariantGroupId("request_hash:key_one"), "variant group identity is deterministic for retries");
check(groupId !== buildCampaignCueLocationVariantGroupId("request_hash:key_two"), "a new retry key can intentionally create a fresh variant group");
check(
    buildCampaignCueLocationVariantCampaignId(groupId, location.id)
        !== buildCampaignCueLocationVariantCampaignId(groupId, "cc_location_koramangala"),
    "each branch gets a distinct deterministic campaign id",
);

const validBatch = {
    baseCampaignId: "cc_campaign_base",
    idempotencyKey: "location_variants_123",
    locationIds: ["cc_location_one", "cc_location_two"],
};
check(CampaignCueLocationVariantBatchSchema.safeParse(validBatch).success, "bounded branch batch is valid");
check(!CampaignCueLocationVariantBatchSchema.safeParse({ ...validBatch, locationIds: ["same", "same"] }).success, "duplicate locations are rejected");
check(!CampaignCueLocationVariantBatchSchema.safeParse({
    ...validBatch,
    locationIds: Array.from({ length: 9 }, (_, index) => `cc_location_${index}`),
}).success, "more than eight branches are rejected");

const visibleCampaigns: CampaignCueCampaign[] = [
    {
        id: "cc_campaign_location_one",
        workspaceId: brain.workspaceId,
        businessBrainId: brain.id,
        title: "Location one pack",
        brief: "Location one",
        status: "used",
        channels: [],
        outputs: [],
        trustGate: "clear",
        credits: { estimate: 0, reserved: 0, captured: 0, refunded: 0, currency: "credits" },
        actionCounts: { download: 1, mark_used: 2, record_outcome: 1, request_approval: 1 },
        ownerApprovalState: "approved",
        locationId: "cc_location_one",
        createdAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-02T10:00:00.000Z",
    },
    {
        id: "cc_campaign_location_two",
        workspaceId: brain.workspaceId,
        businessBrainId: brain.id,
        title: "Location two pack",
        brief: "Location two",
        status: "generated",
        channels: [],
        outputs: [],
        trustGate: "warning",
        credits: { estimate: 0, reserved: 0, captured: 0, refunded: 0, currency: "credits" },
        actionCounts: { archive_export: 1, export: 2, mark_used: 1 },
        ownerApprovalState: "not_requested",
        locationId: "cc_location_two",
        createdAt: "2026-08-03T10:00:00.000Z",
        updatedAt: "2026-08-04T10:00:00.000Z",
    },
];
const visibleAnalytics = buildCampaignCueVisibleCampaignAnalytics({
    campaigns: visibleCampaigns,
    workspaceId: brain.workspaceId,
});
check(visibleAnalytics.campaignCount === 2, "branch analytics count only supplied visible campaigns");
check(visibleAnalytics.usedCount === 3, "branch analytics sums visible mark-used actions");
check(visibleAnalytics.exportCount === 4, "branch analytics sums all visible export action types");
check(visibleAnalytics.approvalRequestCount === 1, "branch analytics sums visible approval requests");
check(visibleAnalytics.ownerReportedOutcomeCount === 1, "branch analytics sums visible owner results");
check(visibleAnalytics.confidence === "estimated", "bounded branch analytics identifies its estimated coverage");
assert.throws(() => buildCampaignCueVisibleCampaignAnalytics({
    campaigns: [{ ...visibleCampaigns[0], workspaceId: "cc_workspace_other" }],
    workspaceId: brain.workspaceId,
}), /cannot cross workspace scope/, "branch analytics rejects cross-workspace campaign input");
checks += 1;

const server = read("src/lib/campaigncue/server.ts");
const route = read("src/app/api/campaigncue/campaigns/variants/route.ts");
const offerPageServer = read("src/lib/campaigncue/offerPageServer.ts");
const ui = read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx");
const database = read("src/constants/campaigncue/database.ts");
check(server.includes("createCampaignCueLocationVariantsServer"), "server exposes the guarded branch batch operation");
check(server.includes("count: variants.length"), "dashboard campaign count increments once by the bounded batch size");
check(server.includes("ownerApprovalState: \"not_requested\""), "every branch variant starts a fresh approval lifecycle");
check(server.includes("CAMPAIGNCUE_LOCATION_MANAGEMENT_ROLES"), "only management roles can create location records");
check(server.includes("location.id,\n                    ...baseCampaign.outputs"), "each branch output keeps its own location first in bounded provenance");
check(server.includes(".slice(0, 500)"), "branch campaign titles stay within the persisted campaign contract");
check(server.includes(".slice(0, 4000)"), "branch campaign reasons stay within the persisted pack contract");
check(server.includes("location_variant_pack_batch_created"), "one aggregate audit event records the batch");
check(server.includes("campaignCueVisibleCampaignsForMember"), "local-manager overview filters branch campaigns");
check(server.includes("analytics: visibleAnalytics"), "local-manager recommendations and owner UI use branch-scoped analytics");
check(server.includes("buildCampaignCueVisibleCampaignAnalytics"), "standalone analytics derives a bounded local-manager summary");
check(server.includes("outside your assigned location access"), "campaign actions enforce assigned-location scope");
check(offerPageServer.includes("buildCampaignCueLocationSourceHash"), "hosted pages recheck branch and global truth");
check(route.includes("withCampaignCueAuth") && route.includes("CampaignCueLocationVariantBatchSchema"), "variant route has auth and runtime validation");
check(ui.includes("Create one checked pack per location"), "owner UI explains branch packs without design jargon");
check(!database.includes("LOCATION_VARIANT"), "branch variants add no Firestore collection");

process.stdout.write(`CampaignCue multi-location variant verification passed (${checks} checks).\n`);
