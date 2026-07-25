import assert from "node:assert/strict";

import { resolveStorePermissionSessionScope } from "../../src/lib/permissions/scopeDocumentId";
import { isCurrentPublicTruthMonitorStoreScope } from "../../src/lib/public-truth-tools/publicTruthMonitorServerScope";

const activeStore = {
    active: true,
    tenantId: 101,
};
const activeTenant = {
    active: true,
};

assert.equal(
    isCurrentPublicTruthMonitorStoreScope({
        storeData: activeStore,
        tenantData: activeTenant,
        tenantDocumentId: "101",
    }),
    true,
    "an active store owned by the active tenant must remain eligible",
);

[
    { storeData: { ...activeStore, tenantId: 102 }, tenantData: activeTenant },
    { storeData: { ...activeStore, active: false }, tenantData: activeTenant },
    { storeData: { ...activeStore, deleted: true }, tenantData: activeTenant },
    { storeData: { ...activeStore, tenantBlocked: true }, tenantData: activeTenant },
    { storeData: activeStore, tenantData: { ...activeTenant, active: false } },
    { storeData: activeStore, tenantData: { ...activeTenant, deleted: true } },
    { storeData: activeStore, tenantData: { ...activeTenant, blockDetails: { blocked: true } } },
    { storeData: undefined, tenantData: activeTenant },
    { storeData: activeStore, tenantData: undefined },
].forEach(({ storeData, tenantData }) => {
    assert.equal(
        isCurrentPublicTruthMonitorStoreScope({
            storeData,
            tenantData,
            tenantDocumentId: "101",
        }),
        false,
        "ownership, existence, lifecycle, and platform-block failures must fail closed",
    );
});

assert.deepEqual(
    resolveStorePermissionSessionScope({
        sId: "202",
        tId: "101",
        user: { storeId: 202, tenantId: 101 },
    }),
    {
        storeScope: { documentId: "202", numericId: 202 },
        tenantScope: { documentId: "101", numericId: 101 },
    },
    "equivalent root and nested session aliases must resolve exactly",
);
assert.equal(
    resolveStorePermissionSessionScope({
        sId: "202",
        tId: "101",
        user: { storeId: "203", tenantId: "101" },
    }),
    null,
    "contradictory store aliases must fail closed",
);
assert.equal(
    resolveStorePermissionSessionScope({
        sId: "202",
        tId: "101",
        user: { storeId: "202", tenantId: "102" },
    }),
    null,
    "contradictory tenant aliases must fail closed",
);

console.log("Public Truth Monitor server-scope behavior verification passed");
