#!/usr/bin/env ts-node

import fs from "fs";
import path from "path";
import {
    CAMPAIGNCUE_OFFER_PAGE_MAX_TTL_DAYS,
    CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN,
} from "../../src/constants/campaigncue/offerPage";
import {
    CampaignCueOfferPageError,
    buildCampaignCuePublicOfferPage,
    normalizeCampaignCueOfferDestination,
    parseCampaignCuePublicOfferPageRecord,
} from "../../src/lib/campaigncue/offerPage";
import { parseCampaignCueCampaignRecord } from "../../src/lib/campaigncue/recordBoundary";
import { CampaignCueOfferPageMutationSchema } from "../../src/lib/validation/campaigncueOfferPageSchemas";
import type { CampaignCueBusinessBrain, CampaignCueCampaign } from "../../src/types/campaigncue";

const ROOT = path.resolve(__dirname, "..", "..");
const NOW = new Date("2026-08-10T10:00:00.000Z");
const SLUG = "0123456789abcdefabcd";
let checks = 0;

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
    if (!condition) throw new Error(message);
    checks += 1;
};

const assertOfferError = (callback: () => unknown, message: string) => {
    let error: unknown;
    try {
        callback();
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof CampaignCueOfferPageError, message);
};

const businessBrain = (overrides: Partial<CampaignCueBusinessBrain> = {}): CampaignCueBusinessBrain => ({
    id: "default",
    workspaceId: "cc_workspace_offer",
    businessBrainId: "default",
    businessType: "restaurant",
    name: "Green Table Cafe",
    locality: "Indiranagar",
    contacts: {
        bookingUrl: "https://green-table.example/book#tracking",
        phone: "+91 98765 43210",
        whatsapp: "+91 98765 43210",
    },
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
    operatingPulse: { businessState: "normal", capacityStatus: "available", stockStatus: "available" },
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
    ...overrides,
});

const campaign = (overrides: Partial<CampaignCueCampaign> = {}): CampaignCueCampaign => ({
    id: "cc_campaign_offer",
    workspaceId: "cc_workspace_offer",
    businessBrainId: "default",
    title: "Lunch combo today",
    brief: "Use the checked lunch details.",
    status: "generated",
    channels: ["whatsapp"],
    outputs: [{
        id: "output_whatsapp",
        channel: "whatsapp",
        label: "WhatsApp pack",
        mode: "manual_export",
        text: "Lunch combo is available today.",
        sourceReferences: ["lunch_item", "price"],
        providerMode: "manual_export",
        trustGate: "clear",
        fields: {
            headline: "Lunch combo today",
            body: "Lunch combo is available today at Green Table Cafe.",
            cta: "Book a table",
            imageBrief: "Use the owner-approved lunch photo.",
            dimensions: "1080x1080",
            postType: "whatsapp_message",
            consentNote: "Owner supplied.",
            policyNote: "Manual handoff only.",
            destination: "https://green-table.example/lunch#source",
            utm: "",
            approvalNote: "Checked.",
            manualSteps: ["Review", "Share manually"],
            handoffFields: [{ id: "terms", label: "Offer terms", value: "Available while stock lasts", status: "ready", copyable: true, required: false }],
        },
    }],
    trustGate: "clear",
    credits: { estimate: 0, reserved: 0, captured: 0, refunded: 0, currency: "credits" },
    actionCounts: {},
    ownerApprovalState: "approved",
    pack: {
        ownerGoal: "bring_people_today",
        reason: "Lunch is ready.",
        recipeId: "restaurant_slow_lunch_push",
        sourceFactIds: ["lunch_item", "price"],
        missingInputIds: [],
        deliveryCardIds: ["whatsapp"],
        resultQuestion: "Did this get lunch orders?",
        freshness: {
            sourceHash: "source_hash_current",
            status: "current",
            validatedAt: NOW.toISOString(),
            expiresAt: "2026-09-30T10:00:00.000Z",
            recheckActions: ["download", "export", "archive_export", "mark_used", "schedule"],
        },
        commercialGate: { status: "ready", findings: [] },
    },
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
});

assert(CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN.test(SLUG), "fixture slug must match the opaque public contract");
assert(normalizeCampaignCueOfferDestination("https://example.com/path#private") === "https://example.com/path", "HTTPS destinations must drop fragments");
assert(normalizeCampaignCueOfferDestination("tel:+91 98765 43210") === "tel:+919876543210", "phone destinations must normalize spacing");
for (const unsafe of ["http://example.com", "javascript:alert(1)", "data:text/html,test", "https://user:pass@example.com", "", "   "]) {
    assert(normalizeCampaignCueOfferDestination(unsafe) === null, `${unsafe || "empty"} must be rejected as a public destination`);
}

const offer = buildCampaignCuePublicOfferPage({
    businessBrain: businessBrain(),
    campaign: campaign(),
    now: NOW,
    publishedBy: "owner_1",
    slug: SLUG,
});
assert(offer.destination === "https://green-table.example/lunch", "checked output destination must outrank fallback contacts");
assert(offer.terms.length === 1, "bounded offer terms must be retained");
assert(offer.theme.primaryColor === "#24564d", "valid business color must be retained");
assert(Date.parse(offer.expiresAt) - NOW.getTime() <= CAMPAIGNCUE_OFFER_PAGE_MAX_TTL_DAYS * 86_400_000, "public page TTL must stay within thirty days");
assert(!JSON.stringify(offer).includes("#source"), "fragments must not persist in the public destination");

const parsed = parseCampaignCuePublicOfferPageRecord(offer, SLUG, NOW);
assert(parsed?.campaignId === campaign().id, "valid public record must round-trip");
assert(parseCampaignCuePublicOfferPageRecord({ ...offer, futureField: true }, SLUG, NOW) === null, "unknown public fields must fail closed");
assert(parseCampaignCuePublicOfferPageRecord({ ...offer, schemaVersion: 2 }, SLUG, NOW) === null, "future schema versions must fail closed");
assert(parseCampaignCuePublicOfferPageRecord({ ...offer, status: "unpublished" }, SLUG, NOW) === null, "unpublished pages must not resolve");
assert(parseCampaignCuePublicOfferPageRecord({ ...offer, destination: "javascript:alert(1)" }, SLUG, NOW) === null, "unsafe persisted destinations must fail closed");
assert(parseCampaignCuePublicOfferPageRecord(offer, "ffffffffffffffffffff", NOW) === null, "slug mismatch must fail closed");
assert(parseCampaignCuePublicOfferPageRecord({ ...offer, expiresAt: NOW.toISOString() }, SLUG, NOW) === null, "expired records must fail closed");
assert(parseCampaignCuePublicOfferPageRecord({ ...offer, terms: [...offer.terms, 7] }, SLUG, NOW) === null, "malformed term arrays must fail closed");

assertOfferError(() => buildCampaignCuePublicOfferPage({ businessBrain: businessBrain(), campaign: campaign({ trustGate: "warning" }), now: NOW, publishedBy: "owner", slug: SLUG }), "uncleared trust must block publishing");
assertOfferError(() => buildCampaignCuePublicOfferPage({ businessBrain: businessBrain(), campaign: campaign({ pack: { ...campaign().pack!, missingInputIds: ["price"] } }), now: NOW, publishedBy: "owner", slug: SLUG }), "missing required facts must block publishing");
assertOfferError(() => buildCampaignCuePublicOfferPage({ businessBrain: businessBrain(), campaign: campaign({ pack: { ...campaign().pack!, commercialGate: { status: "blocked", findings: ["price"] } } }), now: NOW, publishedBy: "owner", slug: SLUG }), "commercial blocks must stop publishing");
assertOfferError(() => buildCampaignCuePublicOfferPage({ businessBrain: businessBrain(), campaign: campaign({ pack: { ...campaign().pack!, freshness: { ...campaign().pack!.freshness!, status: "stale" } } }), now: NOW, publishedBy: "owner", slug: SLUG }), "stale facts must stop publishing");
assertOfferError(() => buildCampaignCuePublicOfferPage({ businessBrain: businessBrain(), campaign: campaign({ outputs: [] }), now: NOW, publishedBy: "owner", slug: SLUG }), "a checked output must be required");
assertOfferError(() => buildCampaignCuePublicOfferPage({ businessBrain: businessBrain({ contacts: {} }), campaign: campaign({ outputs: [{ ...campaign().outputs[0], fields: { ...campaign().outputs[0].fields, destination: "manual" } }] }), now: NOW, publishedBy: "owner", slug: SLUG }), "a verified destination must be required");

const campaignWithPointer = campaign({
    pack: {
        ...campaign().pack!,
        offerPage: { slug: SLUG, status: "published", publishedAt: offer.publishedAt, expiresAt: offer.expiresAt },
    },
});
assert(parseCampaignCueCampaignRecord(campaignWithPointer, { campaignId: campaignWithPointer.id, workspaceId: campaignWithPointer.workspaceId }).pack?.offerPage?.slug === SLUG, "canonical campaign parser must retain the hosted-page pointer after reload");
assertOfferError(() => buildCampaignCuePublicOfferPage({ businessBrain: businessBrain(), campaign: campaign(), now: NOW, publishedBy: "owner", slug: "predictable" }), "short or predictable slugs must fail");

assert(CampaignCueOfferPageMutationSchema.safeParse({ action: "publish", idempotencyKey: "offer_page_123" }).success, "valid publish input must pass");
assert(!CampaignCueOfferPageMutationSchema.safeParse({ action: "publish", idempotencyKey: "bad key", extra: true }).success, "unknown fields and unsafe idempotency keys must fail");

const featureSource = fs.readFileSync(path.join(ROOT, "src/config/features.ts"), "utf8");
const serverSource = fs.readFileSync(path.join(ROOT, "src/lib/campaigncue/offerPageServer.ts"), "utf8");
const routeSource = fs.readFileSync(path.join(ROOT, "src/app/api/campaigncue/campaigns/[campaignId]/offer-page/route.ts"), "utf8");
const publicPageSource = fs.readFileSync(path.join(ROOT, "src/app/sites/campaigncue/offer/[slug]/page.tsx"), "utf8");
const workspaceSource = fs.readFileSync(path.join(ROOT, "src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), "utf8");
const ruleSource = fs.readFileSync(path.join(ROOT, "firestore-campaigncue.rules"), "utf8");
assert(featureSource.includes("ENABLE_CAMPAIGNCUE_HOSTED_OFFER_PAGES: true"), "hosted pages must have an explicit feature gate");
assert(serverSource.includes("db.runTransaction"), "publish and campaign-pointer writes must share a transaction");
assert(serverSource.includes("const [idempotencySnap, workspaceSnap, campaignSnap]"), "base mutation reads only idempotency, workspace, and campaign before action-specific work");
assert(serverSource.includes('params.input.action === "publish" ? transaction.get(businessRef) : Promise.resolve(null)'), "unpublish skips the Business Brain read");
assert(serverSource.includes('params.input.action === "publish" ? transaction.get(sourceRef) : Promise.resolve(null)'), "unpublish skips the source-snapshot read");
assert(serverSource.indexOf('params.input.action === "unpublish" && !hasExistingSlug') < serverSource.indexOf("transaction.get(publicOfferRef)"), "invalid unpublish fails before a public-record read");
assert(serverSource.includes("evaluateCampaignCuePackFreshness"), "publish must recheck current business truth");
assert(serverSource.includes("workspace.agencyMode && campaign.ownerApprovalState !== \"approved\""), "agency publishing must require approval");
assert(serverSource.includes("campaignCueCanManageCampaignLocation"), "hosted-page publishing must reuse the shared campaign-location permission contract");
assert(!serverSource.includes("PUBLISH_ROLES"), "hosted-page publishing must not drift into a private role allowlist");
assert(serverSource.includes("unstable_cache") && serverSource.includes("revalidateTag"), "public reads must be cached and mutation-invalidated");
assert(serverSource.includes("parseCampaignCuePublicOfferPageRecord(replayOfferSnap.data(), replaySlug!, now)"), "publish replay must reject an expired public record against current time");
assert(!serverSource.includes("parseCampaignCuePublicOfferPageRecord(replayOfferSnap.data(), replaySlug!, new Date(0))"), "publish replay must not revive an expired public record against epoch time");
assert(routeSource.includes("withCampaignCueAuth") && routeSource.includes("applyCampaignCueRateLimit"), "owner mutation route must enforce auth and rate limit");
assert(publicPageSource.includes("index: false") && publicPageSource.includes("noarchive: true"), "public campaign pages must remain noindex and noarchive");
assert(!publicPageSource.includes("publishedBy") && !publicPageSource.includes("workspaceId") && !publicPageSource.includes("campaignId"), "public UI must not render internal identifiers");
assert(!publicPageSource.includes("analytics") && !publicPageSource.includes("cookie"), "public page must not add visitor analytics or cookies");
assert(workspaceSource.includes("generateBrandedQrCodeDataUrl") && workspaceSource.includes("getCampaignCuePublicOfferPath"), "owner surface must generate QR locally from the public link");
assert(ruleSource.includes("match /campaigncuePublicOffers/{slug}") && ruleSource.includes("allow read, write: if false"), "client SDK access to public records must remain denied");

console.log(`CampaignCue hosted offer page tests passed (${checks} checks).`);
