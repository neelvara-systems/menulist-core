import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
    buildCampaignCuePatternCueBrief,
    buildCampaignCuePatternCueObservation,
    getLatestCampaignCuePatternCueSource,
    inferCampaignCuePatternCuePlatform,
    isCampaignCuePatternCueObservation,
    isCampaignCuePatternCueSourceInput,
    normalizeCampaignCuePatternCueUrl,
} from "@lib/campaigncue/patternCue";
import { isCampaignCueDecisionSourceInput } from "@lib/campaigncue/operatingLoop";
import { CampaignCueSourceInputSchema } from "@lib/validation/campaigncueSchemas";
import type { CampaignCueBusinessBrain, CampaignCueSourceInput } from "@type/campaigncue";

const root = path.resolve(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

const businessBrain: CampaignCueBusinessBrain = {
    id: "cc_brain_default",
    workspaceId: "cc_tenant_store",
    businessBrainId: "cc_brain_default",
    businessType: "restaurant",
    name: "Green Table Cafe",
    locality: "Indiranagar",
    contacts: {
        phone: "+91 90000 00000",
        publicMenuUrl: "https://example.com/menu",
    },
    brandKit: {
        primaryColor: "#1f6f5f",
        voice: "friendly",
        playbook: {
            brandFeel: ["fresh", "local"],
            inspirationNotes: [],
            visualMotifs: [],
            avoidList: ["guaranteed"],
            productFocus: ["lunch combo"],
        },
    },
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    catalog: {
        items: [{
            id: "item_lunch",
            name: "Lunch Combo",
            available: true,
            sourceRefs: ["store_profile"],
        }],
        services: [],
    },
    operatingPulse: {
        businessState: "normal",
        capacityStatus: "available",
        stockStatus: "available",
    },
    commercialPolicy: {
        promotionsAllowed: true,
        discountsAllowed: true,
        discountApprovalRequired: true,
        currencyCode: "INR",
        doNotPromote: [],
    },
    presence: {},
    languagePolicy: {
        sourceLocale: "en-IN",
        targetLocales: [],
        protectedFactReviewRequired: true,
    },
    sourceConfidence: 0.9,
    readiness: {
        status: "ready",
        blockers: [],
        warnings: [],
    },
};

const rawNotes = "SECRET_SOURCE_PHRASE. Fast talking head opening, then quick cuts showing the product close-up and preparation. End by asking viewers to message on WhatsApp.";
const observation = buildCampaignCuePatternCueObservation({
    businessBrain,
    durationSeconds: 24,
    ownerTakeaway: "Use a demonstration opening.",
    platform: "youtube",
    rightsStatus: "reference_only",
    sourceUrl: "https://www.instagram.com/reel/example/#comments",
    transcriptOrNotes: rawNotes,
});

assert.equal(observation.platform, "instagram");
assert.equal(observation.hookType, "demonstration");
assert.equal(observation.pacing, "fast");
assert.equal(observation.ctaPattern, "message");
assert.equal(observation.rightsStatus, "reference_only");
assert.ok(observation.candidateHooks.every((hook) => hook.includes("Green Table Cafe") || hook.includes("Lunch Combo")));
assert.equal(JSON.stringify(observation).includes("SECRET_SOURCE_PHRASE"), false, "raw transcript must not be persisted in the observation");
assert.equal(isCampaignCuePatternCueObservation(observation), true);
assert.equal(inferCampaignCuePatternCuePlatform("not a URL"), "other");

let patternCueCoercionAttempted = false;
assert.equal(isCampaignCuePatternCueObservation({
    ...observation,
    platform: {
        toString() {
            patternCueCoercionAttempted = true;
            throw new Error("persisted enum values must not be coerced");
        },
    },
}), false);
assert.equal(patternCueCoercionAttempted, false);
assert.equal(isCampaignCuePatternCueObservation(new Proxy({}, {
    get() {
        throw new Error("persisted pattern traversal must be contained");
    },
})), false);

assert.equal(normalizeCampaignCuePatternCueUrl("http://instagram.com/reel/example"), null);
assert.equal(normalizeCampaignCuePatternCueUrl("https://localhost/reel/example"), null);
assert.equal(normalizeCampaignCuePatternCueUrl("https://127.0.0.1/reel/example"), null);
assert.equal(normalizeCampaignCuePatternCueUrl("https://[::1]/reel/example"), null);
assert.equal(normalizeCampaignCuePatternCueUrl("https://user:pass@instagram.com/reel/example"), null);
assert.equal(normalizeCampaignCuePatternCueUrl("https://instagram.com/reel/example?access_token=secret"), null);
assert.equal(normalizeCampaignCuePatternCueUrl(`https://example.com/${"a".repeat(1000)}`), null);

const validInput = CampaignCueSourceInputSchema.safeParse({
    idempotencyKey: "source-pattern-001",
    inspiration: {
        sourceUrl: "https://www.instagram.com/reel/example/",
        transcriptOrNotes: rawNotes,
        rightsStatus: "reference_only",
        platform: "instagram",
        durationSeconds: 24,
    },
    label: "Quick lunch reveal",
    sourceType: "inspiration_pattern",
    status: "active",
    value: "https://www.instagram.com/reel/example/",
});
assert.equal(validInput.success, true, "valid inspiration input should pass");

const privateInput = CampaignCueSourceInputSchema.safeParse({
    idempotencyKey: "source-pattern-private-001",
    inspiration: {
        sourceUrl: "https://192.168.1.10/video",
        transcriptOrNotes: rawNotes,
        rightsStatus: "reference_only",
        platform: "other",
    },
    label: "Private example",
    sourceType: "inspiration_pattern",
    status: "active",
    value: "https://192.168.1.10/video",
});
assert.equal(privateInput.success, false, "private-network source URLs must fail");

const patternSource: CampaignCueSourceInput = {
    id: "cc_source_pattern_current",
    workspaceId: businessBrain.workspaceId,
    sourceType: "inspiration_pattern",
    label: "Quick lunch reveal",
    value: observation.summary,
    status: "active",
    confidence: "estimated",
    sourceRefs: [`pattern:${observation.sourceHash}`],
    facts: [],
    patternCue: observation,
};
assert.equal(isCampaignCueDecisionSourceInput(patternSource), false, "inspiration must not satisfy business decision readiness");
assert.equal(getLatestCampaignCuePatternCueSource([patternSource])?.id, patternSource.id);
assert.equal(getLatestCampaignCuePatternCueSource([{ ...patternSource, status: "needs_review" }]), undefined);
assert.equal(isCampaignCuePatternCueSourceInput(undefined), false);
assert.equal(isCampaignCuePatternCueSourceInput(null), false);
assert.equal(isCampaignCuePatternCueSourceInput(patternSource), true);
assert.match(buildCampaignCuePatternCueBrief(patternSource), /Original hook options/);
assert.match(buildCampaignCuePatternCueBrief(patternSource), /do not copy/i);

const normalSource: CampaignCueSourceInput = {
    ...patternSource,
    id: "cc_source_offer",
    sourceType: "offer",
    label: "Lunch offer",
    value: "Lunch Combo is available today",
    confidence: "manual",
    sourceRefs: ["owner_input"],
    patternCue: undefined,
};
assert.equal(isCampaignCueDecisionSourceInput(normalSource), true);

const server = read("src/lib/campaigncue/server.ts");
assert.match(server, /workspaceRef\(workspaceId\)[\s\S]*patternCueSource: sourceInput/, "current pattern must stay on the existing workspace document");
assert.match(server, /if \(input\.sourceType === "inspiration_pattern"\) return \[\]/, "pattern input must not become a business fact");
assert.match(server, /businessSourceInputs\.length \? "manual" : "menulist"/, "inspiration alone must not label the source snapshot as manual business truth");
assert.match(server, /channels\.some\(\(channel\) => channel === "video" \|\| channel === "ugc"\)/, "only video or UGC packs may pin the current pattern");
assert.match(server, /patternCueSourceHash/, "campaign pack must pin the pattern source hash");
assert.match(server, /The example format changed after this pack was created/, "public-use actions must recheck pattern revisions");

const workspace = read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx");
assert.match(workspace, /Learn the format, not the content/);
assert.match(workspace, /These notes are analyzed during this request and are not stored/);
assert.match(workspace, /CampaignCue does not monitor accounts/);
assert.match(workspace, /source\.status === "active" \? "Ready for next reel" : "Needs review"/);

console.log("CampaignCue Pattern Cue verification passed");
