import assert from "node:assert/strict";
import { readCommittedPWAIconOverride } from "../../src/lib/pwa/pwaIconCommitBoundary";

const url = "https://firebasestorage.googleapis.com/v0/b/example/o/stores%2Fpwa-icons%2F10%2F11%2Ficon.png";
const store = {
    storeId: 11,
    tenantId: 10,
    publicPresence: {
        pwaIconMode: "override",
        pwaIconOverrideUrl: url,
        pwaIconUpdatedAt: "2026-07-14T00:00:00.000Z",
    },
};

assert.deepEqual(readCommittedPWAIconOverride(store, { tenantId: 10, storeId: 11 }, url), {
    pwaIconOverrideUrl: url,
    pwaIconUpdatedAt: "2026-07-14T00:00:00.000Z",
});
assert.equal(readCommittedPWAIconOverride(store, { tenantId: 10, storeId: 12 }, url), null);
assert.equal(readCommittedPWAIconOverride(store, { tenantId: 99, storeId: 11 }, url), null);
assert.equal(readCommittedPWAIconOverride(store, { tenantId: 10, storeId: 11 }, `${url}-other`), null);
assert.equal(readCommittedPWAIconOverride({ ...store, publicPresence: { ...store.publicPresence, pwaIconMode: "generated" } }, { tenantId: 10, storeId: 11 }, url), null);
assert.equal(readCommittedPWAIconOverride({ ...store, publicPresence: { ...store.publicPresence, pwaIconUpdatedAt: "" } }, { tenantId: 10, storeId: 11 }, url), null);

console.log("PWA icon commit boundary tests passed.");
