import assert from "node:assert/strict";
import {
    isResellerClientsResponse,
    projectResellerClientRecord,
} from "../../src/lib/reseller/resellerClientRecord";

const record = projectResellerClientRecord("subscription-1", {
    amount: 40000,
    billingMode: "manual",
    createdOn: new Date("2026-07-25T10:00:00.000Z"),
    modifiedOn: new Date("2026-07-25T11:00:00.000Z"),
    name: "Cafe",
    planType: "MONTH",
    quantity: 2,
    resellerId: "actor-1",
    resellerPricingTier: "FOUNDER_400",
    status: "active",
    validUntil: new Date("2026-10-25T10:00:00.000Z"),
}, { storeId: 101, tenantId: 201 }, null);
assert(record);
assert.equal(record.amountExpected, 40000);
assert.equal(record.subscriptionQuantity, 2);
assert.equal(record.createdOn, "2026-07-25T10:00:00.000Z");

for (const amount of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "40000"]) {
    assert.equal(projectResellerClientRecord("subscription-1", {
        amount,
        billingMode: "manual",
        quantity: 1,
        resellerId: "actor-1",
        resellerPricingTier: "FOUNDER_400",
        status: "active",
    }, { storeId: 101, tenantId: 201 }, null), null);
}
assert.equal(projectResellerClientRecord("subscription-1", {
    amount: Number.MAX_SAFE_INTEGER,
    billingMode: "auto",
    quantity: 2,
    resellerId: "actor-1",
    resellerPricingTier: "FOUNDER_400",
    status: "pending",
}, { storeId: 101, tenantId: 201 }, null), null);

const response = {
    invalidRowCount: 0,
    isPartial: false,
    transactions: [record],
};
assert.equal(isResellerClientsResponse(response), true);
assert.equal(isResellerClientsResponse({ ...response, internal: true }), false);
assert.equal(isResellerClientsResponse({
    ...response,
    transactions: [{ ...record, validUntil: { seconds: 1 } }],
}), false);

console.log("Reseller client-record boundary tests passed.");
