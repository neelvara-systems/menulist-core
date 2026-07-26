import assert from "node:assert/strict";
import { isResellerOnboardingResponse } from "../../src/lib/reseller/resellerOnboardingResponse";

const operationId = "2b167ac8-c4c1-4c90-aa8b-a2d3df7a4f18";
const response = {
    dashboardUrl: "https://app.example.test/login",
    locationCount: 1,
    loginEmail: "owner@example.test",
    ownerUsername: "owner_1",
    passwordSet: true,
    publicUrl: "https://cafe.example.test",
    status: "active",
    storeId: 41,
    subdomain: "cafe",
    subscriptionId: "manual_operation",
    tenantId: 31,
    transactionId: operationId,
};

assert.equal(isResellerOnboardingResponse(response, operationId), true);
assert.equal(isResellerOnboardingResponse({ ...response, storeId: "41" }, operationId), false);
assert.equal(isResellerOnboardingResponse({ ...response, tenantId: 31.5 }, operationId), false);
assert.equal(isResellerOnboardingResponse({ ...response, status: "completed" }, operationId), false);
assert.equal(isResellerOnboardingResponse({ ...response, userId: "private-auth-uid" }, operationId), false);
assert.equal(isResellerOnboardingResponse({ ...response, transactionId: "other" }, operationId), false);

console.log("Reseller onboarding response boundary tests passed.");
