import assert from "node:assert/strict";
import {
    buildDeterministicOutletProjectId,
    MAX_PROJECT_PROPAGATION_STORES,
    normalizeProjectPropagationPlan,
} from "../../src/lib/multiOutlet/projectPropagationBoundary";

const stores = [
    { storeId: 10, isMaster: true, active: true },
    { storeId: 11, active: true },
    { storeId: "12", active: false },
    { storeId: 13, blocked: true },
];

const canonicalMaster = { storeId: 10, tenantId: 10, isMaster: true, active: true };
assert.deepEqual(normalizeProjectPropagationPlan(stores, 10, canonicalMaster, 10), {
    outletStoreIds: ["11"],
    sourceStoreId: "10",
});
assert.deepEqual(
    normalizeProjectPropagationPlan([{ storeId: 10 }, { storeId: 11 }], 10, canonicalMaster, 10),
    { outletStoreIds: ["11"], sourceStoreId: "10" },
    "canonical master authority must support a legacy compact row without isMaster",
);
assert.equal(normalizeProjectPropagationPlan(stores, 11, { storeId: 11, tenantId: 10, isMaster: false }, 10), null, "an outlet cannot propagate as a master");
assert.equal(normalizeProjectPropagationPlan([{ storeId: 10, isMaster: true }, { storeId: "10" }], 10, canonicalMaster, 10), null, "duplicate store aliases fail closed");
assert.equal(normalizeProjectPropagationPlan(new Array(MAX_PROJECT_PROPAGATION_STORES + 1).fill({ storeId: 1 }), 1, canonicalMaster, 10), null, "oversized lists fail closed");
assert.equal(normalizeProjectPropagationPlan(stores, 10, { ...canonicalMaster, tenantId: 99 }, 10), null, "cross-tenant canonical source fails closed");

const firstId = buildDeterministicOutletProjectId({
    masterProjectId: "10-master-menu-10",
    outletStoreId: "11",
    tenantId: "10",
});
const secondId = buildDeterministicOutletProjectId({
    masterProjectId: "10-master-menu-10",
    outletStoreId: "11",
    tenantId: "10",
});
assert.equal(firstId, secondId, "retry identity must be deterministic");
assert.match(firstId || "", /^10-linked-\d+-11$/);
assert.equal(buildDeterministicOutletProjectId({
    masterProjectId: "99-master-menu-10",
    outletStoreId: "11",
    tenantId: "10",
}), null, "cross-tenant master identity fails closed");

console.log("Project propagation boundary tests passed.");
