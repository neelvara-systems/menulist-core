import assert from "node:assert/strict";

import {
    isCurrentScreenSeenPublicScope,
    resolveUniqueLegacyScreenSeenStoreId,
} from "../../src/lib/screen/screenSeenScope";

assert.equal(resolveUniqueLegacyScreenSeenStoreId([]), null);
assert.equal(resolveUniqueLegacyScreenSeenStoreId(["campaigns_202"]), "202");
assert.equal(resolveUniqueLegacyScreenSeenStoreId(["campaigns_202", "campaigns_203"]), null);
assert.equal(resolveUniqueLegacyScreenSeenStoreId(["campaigns_002"]), null);
assert.equal(resolveUniqueLegacyScreenSeenStoreId(["campaign_202"]), null);

const storeData = {
    active: true,
    storeId: 202,
    tenantId: 101,
};
const tenantData = {
    active: true,
    tenantId: 101,
};

assert.equal(isCurrentScreenSeenPublicScope({
    storeData,
    storeDocumentId: "202",
    tenantData,
    tenantDocumentId: "101",
}), true);

[
    { storeData: { ...storeData, active: false }, tenantData },
    { storeData: { ...storeData, deleted: true }, tenantData },
    { storeData: { ...storeData, blocked: true }, tenantData },
    { storeData: { ...storeData, storeId: 203 }, tenantData },
    { storeData: { ...storeData, tenantId: 102 }, tenantData },
    { storeData, tenantData: { ...tenantData, active: false } },
    { storeData, tenantData: { ...tenantData, deleted: true } },
    { storeData, tenantData: { ...tenantData, tenantBlocked: true } },
    { storeData, tenantData: { ...tenantData, tenantId: 102 } },
].forEach((scope) => {
    assert.equal(isCurrentScreenSeenPublicScope({
        ...scope,
        storeDocumentId: "202",
        tenantDocumentId: "101",
    }), false);
});

console.log("Screen Seen current public-scope behavior verification passed");
