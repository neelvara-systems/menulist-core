import assert from "node:assert/strict";
import {
    assertCampaignCueCueLayersClaimOwnership,
    assertCampaignCueCueLayersIdempotencyIdentity,
    CampaignCueCueLayersIdempotencyConflictError,
    getCampaignCueCueLayersClaimDecision,
    getCampaignCueCueLayersIdempotencyReplay,
} from "../../src/lib/campaigncue/cue-layers/idempotency";

const expected = {
    action: "cue_layers_autosave",
    actorId: "owner_1",
    requestHash: "hash_1",
};

const completed = {
    ...expected,
    resultId: "design_1",
    resultRevision: 2,
    status: "completed" as const,
};

assert.deepEqual(getCampaignCueCueLayersIdempotencyReplay(completed, expected), completed);
assert.equal(assertCampaignCueCueLayersIdempotencyIdentity({ ...expected, status: "in_progress" }, expected).status, "in_progress");

const activeClaim = {
    ...expected,
    claimId: "claim_1",
    leaseExpiresAt: { seconds: 20, nanoseconds: 0 },
    status: "in_progress" as const,
};
assert.deepEqual(getCampaignCueCueLayersClaimDecision(null, expected, 10_000), {
    kind: "claim",
    reason: "missing",
});
assert.deepEqual(getCampaignCueCueLayersClaimDecision({ ...expected, status: "in_progress" }, expected, 10_000), {
    kind: "claim",
    reason: "legacy_or_malformed",
});
assert.deepEqual(getCampaignCueCueLayersClaimDecision(activeClaim, expected, 10_000), { kind: "conflict" });
assert.deepEqual(getCampaignCueCueLayersClaimDecision(activeClaim, expected, 20_000), {
    kind: "claim",
    reason: "expired",
});
assert.deepEqual(getCampaignCueCueLayersClaimDecision({ ...activeClaim, leaseExpiresAt: {} }, expected, 10_000), {
    kind: "claim",
    reason: "legacy_or_malformed",
});
assert.equal(assertCampaignCueCueLayersClaimOwnership(activeClaim, expected, "claim_1").claimId, "claim_1");
assert.throws(
    () => assertCampaignCueCueLayersClaimOwnership(activeClaim, expected, "claim_2"),
    CampaignCueCueLayersIdempotencyConflictError,
);
assert.throws(
    () => assertCampaignCueCueLayersClaimOwnership({ ...activeClaim, status: "completed", resultId: "design_1" }, expected, "claim_1"),
    CampaignCueCueLayersIdempotencyConflictError,
);

for (const value of [
    null,
    { ...completed, action: "cue_layers_export" },
    { ...completed, actorId: "owner_2" },
    { ...completed, requestHash: "hash_2" },
    { ...completed, resultId: undefined },
    { ...completed, resultId: "bad id" },
    { ...completed, secondaryResultId: "bad id" },
    { ...completed, resultRevision: -1 },
    { ...completed, responseError: "x".repeat(501) },
    { ...completed, responseStatus: 200 },
    { ...completed, status: "failed" },
]) {
    assert.throws(
        () => getCampaignCueCueLayersIdempotencyReplay(value, expected),
        CampaignCueCueLayersIdempotencyConflictError,
    );
}

assert.throws(
    () => getCampaignCueCueLayersIdempotencyReplay({ ...expected, status: "in_progress" }, expected),
    CampaignCueCueLayersIdempotencyConflictError,
);

console.log("CampaignCue CueLayers idempotency contract tests passed.");
