import assert from "node:assert/strict";

import { SIGNALDESK_PRODUCT_CODE } from "../../src/constants/signaldesk/product";
import { parseSignalDeskSourcePolicyDocument } from "../../src/lib/signaldesk/sourcePolicyContracts";

class TestTimestamp {
    constructor(private readonly value: string) {}

    toDate() {
        return new Date(this.value);
    }
}

const now = Date.now();
const timestamp = (offsetMs: number) => new TestTimestamp(new Date(now + offsetMs).toISOString());
const sourcePolicyId = "source_policy_contract_test";
const validPolicy = {
    accessMethod: "owner-supplied",
    allowedContactChannels: ["email"],
    allowedFields: ["displayName", "email"],
    allowedUse: {
        contact: true,
        evidence: true,
        import: true,
        personalization: true,
        providerRun: false,
        storage: true,
    },
    approvedAt: timestamp(-60_000),
    attributionRequirements: [],
    blockedFields: [],
    createdAt: timestamp(-120_000),
    expiresAt: timestamp(24 * 60 * 60 * 1_000),
    lastReviewedAt: timestamp(-60_000),
    name: "Owner supplied source policy",
    notes: "Owner confirmed the source and contact authority.",
    pId: SIGNALDESK_PRODUCT_CODE,
    policyOwner: "owner@example.test",
    prohibitedUses: ["No provider send"],
    rawPayloadPolicy: "never-store",
    refreshMethod: "owner-refresh",
    retentionDays: 30,
    sourcePolicyId,
    sourceType: "owned-demand",
    status: "active",
};

const parsed = parseSignalDeskSourcePolicyDocument({
    ...validPolicy,
    privateProviderPayload: "must-not-project",
}, sourcePolicyId);
assert.equal(parsed.sourcePolicyId, sourcePolicyId);
assert.equal(
    "privateProviderPayload" in parsed,
    false,
    "persisted source-policy projection must not expose undeclared fields",
);

const throwingTimestamp = Object.defineProperty({}, "toDate", {
    get() {
        throw new Error("private timestamp getter detail");
    },
});
assert.throws(
    () => parseSignalDeskSourcePolicyDocument({
        ...validPolicy,
        updatedAt: throwingTimestamp,
    }, sourcePolicyId),
    { message: "SOURCE_POLICY_SHAPE_INVALID" },
    "throwing timestamp access must fail through the stable source-policy contract",
);

const hostileDocument = new Proxy({}, {
    get() {
        throw new Error("private persisted getter detail");
    },
});
assert.throws(
    () => parseSignalDeskSourcePolicyDocument(hostileDocument, sourcePolicyId),
    { message: "SOURCE_POLICY_SHAPE_INVALID" },
    "hostile persisted documents must not leak arbitrary getter failures",
);

console.log("SignalDesk source-policy contract tests passed.");
