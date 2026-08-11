import assert from "node:assert/strict";
import {
    assertCampaignCueBusinessBrainRecordScope,
    assertCampaignCueStoreRecordScope,
    assertCampaignCueWorkspaceRecordScope,
    CampaignCueWorkspaceScopeError,
    resolveCampaignCueSessionIdentity,
    resolveCampaignCueSessionStoreRole,
} from "@lib/campaigncue/workspaceScope";

const expectDenied = (label: string, operation: () => unknown) => {
    assert.throws(operation, CampaignCueWorkspaceScopeError, label);
};

const store = {
    active: true,
    storeId: 22,
    tId: "11",
    tenantId: 11,
};

assert.deepEqual(resolveCampaignCueSessionIdentity({
    sId: "22",
    tId: "11",
    uId: "user_1",
    user: { id: "user_1", storeId: 22, tenantId: 11 },
}), { sId: "22", tId: "11", userId: "user_1" });
assert.equal(resolveCampaignCueSessionIdentity({
    sId: "22",
    tId: "11",
    uId: "user_1",
    user: { id: "user_2", storeId: 22, tenantId: 11 },
}), null, "conflicting user aliases fail closed");
assert.equal(resolveCampaignCueSessionIdentity({
    sId: "22",
    tId: "11",
    uId: "user_1",
    user: { id: "user_1", storeId: 22, tenantId: 12 },
}), null, "conflicting tenant aliases fail closed");
assert.equal(resolveCampaignCueSessionIdentity({
    sId: "store-22",
    tId: "11",
    uId: "user_1",
}), null, "nonnumeric workspace scope fails closed");

assert.equal(resolveCampaignCueSessionStoreRole({
    role: "owner",
    user: {
        role: "owner",
        stores: [{ role: "owner", storeId: 22 }],
    },
}, "22"), "owner", "matching current-store role aliases resolve");
assert.equal(resolveCampaignCueSessionStoreRole({
    role: "owner",
    user: {
        role: "owner",
        stores: [{ role: "staff", storeId: 22 }],
    },
}, "22"), null, "conflicting current-store role aliases fail closed");
assert.equal(resolveCampaignCueSessionStoreRole({
    role: "owner",
    user: {
        role: "owner",
        stores: [{ role: "staff", storeId: 23 }],
    },
}, "22"), "owner", "a different store mapping cannot replace the active-store role");

assert.equal(assertCampaignCueStoreRecordScope(store, { sId: "22", tId: "11" }), store);
expectDenied("foreign tenant", () => assertCampaignCueStoreRecordScope({ ...store, tenantId: 12, tId: 12 }, { sId: "22", tId: "11" }));
expectDenied("conflicting tenant aliases", () => assertCampaignCueStoreRecordScope({ ...store, tId: 12 }, { sId: "22", tId: "11" }));
expectDenied("conflicting store alias", () => assertCampaignCueStoreRecordScope({ ...store, sId: 23 }, { sId: "22", tId: "11" }));
expectDenied("missing tenant ownership", () => assertCampaignCueStoreRecordScope({ active: true, storeId: 22 }, { sId: "22", tId: "11" }));
expectDenied("deleted store", () => assertCampaignCueStoreRecordScope({ ...store, deleted: true }, { sId: "22", tId: "11" }));
expectDenied("platform-blocked store", () => assertCampaignCueStoreRecordScope({ ...store, blockDetails: { blocked: true } }, { sId: "22", tId: "11" }));

const workspace = {
    id: "cc_11_22",
    workspaceId: "cc_11_22",
    productId: "CC",
    tId: "11",
    sId: "22",
    status: "active",
    defaultRole: "owner",
    members: {
        user_1: { role: "owner" },
    },
};

assert.equal(
    assertCampaignCueWorkspaceRecordScope(workspace, {
        sId: "22",
        tId: "11",
        userId: "user_1",
        workspaceId: "cc_11_22",
    }),
    workspace,
);
expectDenied("non-member", () => assertCampaignCueWorkspaceRecordScope(workspace, {
    sId: "22",
    tId: "11",
    userId: "user_2",
    workspaceId: "cc_11_22",
}));
expectDenied("foreign embedded workspace scope", () => assertCampaignCueWorkspaceRecordScope({
    ...workspace,
    tId: "12",
}, {
    sId: "22",
    tId: "11",
    userId: "user_1",
    workspaceId: "cc_11_22",
}));
expectDenied("wrong product", () => assertCampaignCueWorkspaceRecordScope({
    ...workspace,
    productId: "ML",
}, {
    sId: "22",
    tId: "11",
    userId: "user_1",
    workspaceId: "cc_11_22",
}));

const businessBrain = {
    id: "default",
    businessBrainId: "default",
    workspaceId: "cc_11_22",
};
assert.equal(assertCampaignCueBusinessBrainRecordScope(businessBrain, "cc_11_22"), businessBrain);
expectDenied("foreign Business Brain", () => assertCampaignCueBusinessBrainRecordScope({
    ...businessBrain,
    workspaceId: "cc_12_22",
}, "cc_11_22"));

console.log("CampaignCue workspace scope tests passed.");
