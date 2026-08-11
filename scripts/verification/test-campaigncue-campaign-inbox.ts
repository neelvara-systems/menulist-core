import assert from "node:assert/strict";
import {
    CAMPAIGNCUE_INBOX_MAX_CANDIDATES,
    CAMPAIGNCUE_INBOX_MAX_DRAFT_LENGTH,
    CAMPAIGNCUE_INBOX_MAX_VALUE_LENGTH,
    buildCampaignCueInboxBatchId,
    buildCampaignCueInboxSourceInputIds,
    campaignCueInboxCandidateToBusinessPatch,
    campaignCueInboxCandidateToSourceInput,
    parseCampaignCueInboxText,
} from "../../src/lib/campaigncue/campaignInbox";
import {
    CampaignCueInboxConfirmSchema,
    CampaignCueSourceInputSchema,
} from "../../src/lib/validation/campaigncueSchemas";

const explicit = parseCampaignCueInboxText([
    "Offer: Weekend haircut package",
    "Price: INR 799",
    "Availability: Four Saturday slots",
    "Ends: Sunday at 6 PM",
].join("\n"));
assert.equal(explicit.blocked, false);
assert.deepEqual(explicit.candidates.map((candidate) => candidate.kind), [
    "offer",
    "price",
    "availability",
    "event",
]);
assert.ok(explicit.candidates.every((candidate) => candidate.destination === "source_input"));
assert.ok(explicit.candidates.every((candidate) => candidate.recommendedStatus === "active"));

const fullWidthSeparator = parseCampaignCueInboxText("Offer：Lunch combo today");
assert.equal(fullWidthSeparator.candidates[0]?.kind, "offer");
assert.equal(fullWidthSeparator.candidates[0]?.value, "Lunch combo today");

const freeProse = "आज दोपहर ग्राहकों ने नया मसाला विकल्प मांगा";
const freeProseResult = parseCampaignCueInboxText(freeProse);
assert.equal(freeProseResult.blocked, false);
assert.equal(freeProseResult.candidates.length, 1);
assert.equal(freeProseResult.candidates[0]?.kind, "note");
assert.equal(freeProseResult.candidates[0]?.value, freeProse);
assert.equal(freeProseResult.candidates[0]?.recommendedStatus, "needs_review");

const noInference = parseCampaignCueInboxText("The price may be INR 799 and the phone may have changed on Friday.");
assert.equal(noInference.candidates.length, 1);
assert.equal(noInference.candidates[0]?.kind, "note");
assert.equal(noInference.candidates[0]?.destination, "source_input");

const deduplicated = parseCampaignCueInboxText("Offer: Lunch combo\nOFFER: Lunch   combo");
assert.equal(deduplicated.candidates.length, 1);

assert.equal(parseCampaignCueInboxText("   \n ").blocked, true);
assert.equal(parseCampaignCueInboxText("x".repeat(CAMPAIGNCUE_INBOX_MAX_DRAFT_LENGTH + 1)).blocked, true);
assert.equal(
    parseCampaignCueInboxText(`Offer: ${"x".repeat(CAMPAIGNCUE_INBOX_MAX_VALUE_LENGTH + 1)}`).blocked,
    true,
);

const tooMany = parseCampaignCueInboxText(
    Array.from({ length: CAMPAIGNCUE_INBOX_MAX_CANDIDATES + 1 }, (_, index) => `Note: Update ${index + 1}`).join("\n"),
);
assert.equal(tooMany.blocked, true);
assert.equal(tooMany.candidates.length, CAMPAIGNCUE_INBOX_MAX_CANDIDATES);
assert.match(tooMany.notices.join(" "), /8 details/);

const businessDetails = parseCampaignCueInboxText([
    "Phone: +91 98765 43210",
    "WhatsApp: +91 98765 43210",
    "Website: https://example.com",
    "Menu link: https://example.com/menu",
    "Booking: https://example.com/book",
    "Location: Indiranagar",
].join("\n"));
assert.equal(businessDetails.blocked, false);
assert.deepEqual(businessDetails.candidates.map((candidate) => candidate.businessField), [
    "phone",
    "whatsapp",
    "website",
    "publicMenuUrl",
    "bookingUrl",
    "locality",
]);
assert.ok(businessDetails.candidates.every((candidate) => candidate.destination === "business_details"));
assert.equal(campaignCueInboxCandidateToSourceInput(businessDetails.candidates[0]!), null);
assert.deepEqual(campaignCueInboxCandidateToBusinessPatch(businessDetails.candidates[0]!), {
    phone: "+91 98765 43210",
});

const sourcePayload = campaignCueInboxCandidateToSourceInput(explicit.candidates[0]!);
assert.deepEqual(sourcePayload, {
    candidateId: "cc_inbox_candidate_1",
    label: "Offer",
    sourceType: "offer",
    status: "active",
    value: "Weekend haircut package",
});

const requestHash = "a".repeat(64);
assert.equal(buildCampaignCueInboxBatchId(requestHash), `cc_inbox_${"a".repeat(24)}`);
const sourceIds = buildCampaignCueInboxSourceInputIds(requestHash, 2);
assert.deepEqual(sourceIds, [
    `cc_source_inbox_${"a".repeat(16)}_01`,
    `cc_source_inbox_${"a".repeat(16)}_02`,
]);
assert.deepEqual(buildCampaignCueInboxSourceInputIds(requestHash, 2), sourceIds);
assert.throws(() => buildCampaignCueInboxBatchId("bad"));
assert.throws(() => buildCampaignCueInboxSourceInputIds(requestHash, 0));
assert.throws(() => buildCampaignCueInboxSourceInputIds(requestHash, CAMPAIGNCUE_INBOX_MAX_CANDIDATES + 1));

const validCandidate = {
    candidateId: "candidate_1",
    sourceType: "offer",
    label: "Offer",
    value: "Lunch combo for INR 499",
    status: "active",
} as const;
const validBatch = {
    action: "confirm_inbox",
    idempotencyKey: "campaign_inbox_123",
    candidates: [validCandidate],
};
assert.equal(CampaignCueInboxConfirmSchema.safeParse(validBatch).success, true);
assert.equal(CampaignCueInboxConfirmSchema.safeParse({ ...validBatch, extra: true }).success, false);
assert.equal(CampaignCueInboxConfirmSchema.safeParse({
    ...validBatch,
    candidates: [{ ...validCandidate, sourceType: "inspiration_pattern" }],
}).success, false);
assert.equal(CampaignCueInboxConfirmSchema.safeParse({
    ...validBatch,
    candidates: [
        validCandidate,
        { ...validCandidate, candidateId: "candidate_2" },
    ],
}).success, false);
assert.equal(CampaignCueInboxConfirmSchema.safeParse({
    ...validBatch,
    candidates: [
        validCandidate,
        {
            ...validCandidate,
            candidateId: "candidate_2",
            label: "  OFFER ",
            value: "Lunch   combo\nfor INR 499",
        },
    ],
}).success, false);
assert.equal(CampaignCueInboxConfirmSchema.safeParse({
    ...validBatch,
    candidates: [{
        ...validCandidate,
        candidateId: "candidate_link",
        sourceType: "booking_link",
        value: "not a link",
    }],
}).success, false);
assert.equal(CampaignCueInboxConfirmSchema.safeParse({
    ...validBatch,
    candidates: Array.from({ length: CAMPAIGNCUE_INBOX_MAX_CANDIDATES + 1 }, (_, index) => ({
        ...validCandidate,
        candidateId: `candidate_${index + 1}`,
        value: `Offer ${index + 1}`,
    })),
}).success, false);
assert.equal(CampaignCueInboxConfirmSchema.safeParse({
    ...validBatch,
    candidates: [{
        ...validCandidate,
        label: "Past customers",
        value: "Paste customer phone numbers from the spreadsheet: +91 98765 43210",
    }],
}).success, false);

assert.equal(CampaignCueSourceInputSchema.safeParse({
    idempotencyKey: "source_input_123",
    sourceType: "manual_note",
    label: "Owner note",
    value: "Use the real storefront photo.",
    status: "needs_review",
}).success, true);

console.log("CampaignCue Campaign Inbox tests passed.");
