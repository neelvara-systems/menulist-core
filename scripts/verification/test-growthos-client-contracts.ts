import assert from "node:assert/strict";
import {
    getGrowthOSClientScope,
    getGrowthOSSummaryCacheKey,
    projectGrowthOSSummaryForScope,
} from "../../src/lib/growthos/clientContracts";
import { getGrowthOSRateLimitFailureDecision } from "../../src/lib/growthos/rateLimitPolicy";
import { getGrowthOSTimestampMillis } from "../../src/lib/growthos/readiness";

const scopeA = getGrowthOSClientScope({ tenantId: 11, storeId: 22 });
const scopeB = getGrowthOSClientScope({ tenantId: 12, storeId: 22 });
assert.deepEqual(scopeA, { tId: "11", sId: "22" });
assert.deepEqual(getGrowthOSSummaryCacheKey(scopeA), ["growthos-summary", "11", "22"]);
assert.notDeepEqual(getGrowthOSSummaryCacheKey(scopeA), getGrowthOSSummaryCacheKey(scopeB));
assert.equal(getGrowthOSClientScope({ tenantId: "01", storeId: 22 }), null);

const summary = {
    tId: "11",
    sId: "22",
    date: "2026-07-26",
    eligible: true,
    secondaryActions: [],
};
assert.deepEqual(projectGrowthOSSummaryForScope(summary, scopeA!), summary);
assert.equal(projectGrowthOSSummaryForScope({ ...summary, tId: "12" }, scopeA!), null);
assert.equal(projectGrowthOSSummaryForScope({ ...summary, secondaryActions: null }, scopeA!), null);
assert.equal(projectGrowthOSSummaryForScope({
    ...summary,
    latestKit: {
        id: "kit-1",
        actionType: "promote_item",
        title: "Pack",
        outputs: [{ id: "output-1", destination: "staff_brief", label: "Brief", text: "Text", preflight: { status: "ready", blocks: [], warnings: [] } }],
        sourceFactsHash: "hash",
        status: "draft",
        expiresAt: { get toMillis() { throw new Error("hostile"); } },
    },
}, scopeA!), null);

const now = 1_000_000;
assert.deepEqual(
    getGrowthOSRateLimitFailureDecision({
        now,
        reason: "provider_unavailable",
        resetAt: now + 5_000,
    }),
    {
        code: "RATE_LIMIT_UNAVAILABLE",
        providerUnavailable: true,
        retryAfter: 5,
        status: 503,
    },
);
assert.equal(getGrowthOSRateLimitFailureDecision({
    now,
    reason: "limit_exceeded",
    resetAt: now + 60_001,
}).status, 429);

assert.equal(getGrowthOSTimestampMillis("2026-07-26T00:00:00.000Z"), 1785024000000);
assert.equal(getGrowthOSTimestampMillis({ toMillis: () => 1234 }), 1234);
assert.equal(getGrowthOSTimestampMillis({ get toMillis() { throw new Error("hostile"); } }), null);
assert.equal(getGrowthOSTimestampMillis({ toDate: () => new Date(Number.NaN) }), null);

console.log("GrowthOS client/rate/timestamp contracts passed");
