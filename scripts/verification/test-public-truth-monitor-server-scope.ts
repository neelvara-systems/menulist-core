import assert from "node:assert/strict";

import { getOutletSessionScope } from "../../src/lib/multiOutlet/outletSessionScope";
import {
    canMenuRevalidationSessionAccessStore,
    resolveMenuRevalidationSessionAccess,
} from "../../src/lib/cache/menuRevalidationSessionAccess";
import {
    isStorePermissionDataInScope,
    resolveStorePermissionSessionScope,
} from "../../src/lib/permissions/scopeDocumentId";
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
assert.equal(
    isCurrentPublicTruthMonitorStoreScope({
        storeData: { active: true, tenantId: 101, tId: "101" },
        tenantData: activeTenant,
        tenantDocumentId: "101",
    }),
    true,
    "equivalent persisted tenant aliases must remain eligible",
);
assert.equal(
    isCurrentPublicTruthMonitorStoreScope({
        storeData: { active: true, tId: "101" },
        tenantData: activeTenant,
        tenantDocumentId: "101",
    }),
    true,
    "a valid legacy tenant alias must remain compatible",
);

[
    { storeData: { ...activeStore, tenantId: 102 }, tenantData: activeTenant },
    { storeData: { ...activeStore, tId: 102 }, tenantData: activeTenant },
    { storeData: { ...activeStore, tId: "invalid" }, tenantData: activeTenant },
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
assert.equal(
    resolveStorePermissionSessionScope({
        sId: "202",
        storeId: "203",
        tId: "101",
        tenantId: "101",
        user: { storeId: "202", tenantId: "101" },
    }),
    null,
    "contradictory root verbose and shorthand store aliases must fail closed",
);
assert.equal(
    resolveStorePermissionSessionScope({
        sId: "202",
        storeId: "202",
        tId: "101",
        tenantId: "102",
        user: { storeId: "202", tenantId: "101" },
    }),
    null,
    "contradictory root verbose and shorthand tenant aliases must fail closed",
);

const revalidationAccess = resolveMenuRevalidationSessionAccess({
    sId: "202",
    storeId: 202,
    tId: "101",
    tenantId: 101,
    platformRole: "OWNER",
    user: {
        platformRole: "OWNER",
        storeId: 202,
        tenantId: 101,
        storeIds: ["203", "invalid"],
        stores: [{ storeId: 204 }, { storeId: " 205" }],
    },
});
assert.ok(revalidationAccess);
assert.equal(revalidationAccess.tenantId, "101");
assert.equal(canMenuRevalidationSessionAccessStore(revalidationAccess, "202"), true);
assert.equal(canMenuRevalidationSessionAccessStore(revalidationAccess, "203"), true);
assert.equal(canMenuRevalidationSessionAccessStore(revalidationAccess, "204"), true);
assert.equal(canMenuRevalidationSessionAccessStore(revalidationAccess, "205"), false);
assert.equal(
    resolveMenuRevalidationSessionAccess({
        sId: 202,
        tId: 101,
        platformRole: "OWNER",
        user: { storeId: 202, tenantId: 101, platformRole: "PLATFORM" },
    }),
    null,
    "conflicting platform-role aliases must not elevate cache revalidation access",
);
assert.deepEqual(
    resolveMenuRevalidationSessionAccess({
        platformRole: "PLATFORM",
        user: { platformRole: "PLATFORM" },
    }),
    { allowedStoreIds: new Set<string>(), platformSession: true },
    "an exact platform session may retain global cache revalidation access",
);

assert.deepEqual(
    getOutletSessionScope({
        sId: "202",
        tId: 101,
        user: { storeId: 202, tenantId: "101" },
    }),
    {
        storeDocumentId: "202",
        storeId: "202",
        tenantDocumentId: "101",
        tenantId: 101,
    },
    "outlet scope must preserve canonical agreeing session aliases",
);
assert.equal(
    getOutletSessionScope({
        sId: "202",
        tId: 101,
        user: { storeId: 203, tenantId: "101" },
    }),
    null,
    "outlet scope must reject conflicting nested store identity",
);

const permissionSessionScope = resolveStorePermissionSessionScope({ sId: 202, tId: 101 });
assert.ok(permissionSessionScope);
assert.equal(
    isStorePermissionDataInScope(
        { storeId: 202, sId: "202", tenantId: 101, tId: "101" },
        permissionSessionScope.storeScope,
        permissionSessionScope.tenantScope,
    ),
    true,
    "permission store data must admit exact persisted aliases",
);
for (const storeData of [
    { storeId: 202, sId: 203, tenantId: 101, tId: 101 },
    { storeId: 202, tenantId: 101, tId: 102 },
    { storeId: 202, tenantId: 101, tId: "invalid" },
]) {
    assert.equal(
        isStorePermissionDataInScope(
            storeData,
            permissionSessionScope.storeScope,
            permissionSessionScope.tenantScope,
        ),
        false,
        "permission store data must reject every conflicting or malformed present alias",
    );
}

console.log("Public Truth Monitor server-scope behavior verification passed");
