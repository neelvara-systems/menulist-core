import assert from "node:assert/strict";
import {
    clampCustomerAppIconSize,
    normalizeCustomerAppDisplayName,
    normalizeCustomerAppRenderableImageUrl,
    resolveCustomerAppIconSource,
} from "../../src/lib/pwa/customerAppAssets";
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
assert.equal(
    readCommittedPWAIconOverride({ ...store, storeId: '11' }, { tenantId: 10, storeId: 11 }, url),
    null,
    'numeric-looking persisted store identity must not satisfy exact icon commit admission',
);
assert.equal(
    readCommittedPWAIconOverride({ ...store, tenantId: '10' }, { tenantId: 10, storeId: 11 }, url),
    null,
    'numeric-looking persisted tenant identity must not satisfy exact icon commit admission',
);
assert.equal(readCommittedPWAIconOverride(store, { tenantId: 10, storeId: 11 }, `${url}-other`), null);
assert.equal(readCommittedPWAIconOverride({ ...store, publicPresence: { ...store.publicPresence, pwaIconMode: "generated" } }, { tenantId: 10, storeId: 11 }, url), null);
assert.equal(readCommittedPWAIconOverride({ ...store, publicPresence: { ...store.publicPresence, pwaIconUpdatedAt: "" } }, { tenantId: 10, storeId: 11 }, url), null);

assert.equal(clampCustomerAppIconSize('192'), 192);
assert.equal(clampCustomerAppIconSize('192junk'), 512);
assert.equal(clampCustomerAppIconSize('0192'), 512);
assert.equal(normalizeCustomerAppDisplayName(`  ${'A'.repeat(140)}  `).length, 120);
assert.equal(normalizeCustomerAppDisplayName({ hostile: true }), 'Menu');

process.env.NEXT_PUBLIC_MENULIST_FIREBASE_STORAGE_BUCKET = 'example';
const trustedStorageUrl = 'https://firebasestorage.googleapis.com/v0/b/example/o/tenants%2F10%2Fstores%2F11%2Fpwa-icons%2Ficon.png?alt=media';
assert.equal(normalizeCustomerAppRenderableImageUrl(trustedStorageUrl), trustedStorageUrl);
for (const unsafeUrl of [
    'http://firebasestorage.googleapis.com/v0/b/example/o/icon.png',
    'https://user:secret@firebasestorage.googleapis.com/v0/b/example/o/icon.png',
    'https://firebasestorage.googleapis.com:444/v0/b/example/o/icon.png',
    'https://localhost/internal.png',
    'https://127.0.0.1/internal.png',
    'https://example.com/owner-controlled.png',
    'https://firebasestorage.googleapis.com/v0/b/attacker-bucket/o/icon.png',
    'https://firebasestorage.googleapis.com/v0/b/example/o/not-an-image.svg',
]) {
    assert.equal(normalizeCustomerAppRenderableImageUrl(unsafeUrl), undefined, unsafeUrl);
}
assert.deepEqual(resolveCustomerAppIconSource({
    publicPresence: { pwaIconMode: 'override', pwaIconOverrideUrl: 'https://localhost/internal.png' },
    logo: trustedStorageUrl,
}), { imageUrl: trustedStorageUrl, source: 'logo' });
assert.deepEqual(resolveCustomerAppIconSource({
    publicPresence: { pwaIconMode: 'override', pwaIconOverrideUrl: 'https://localhost/internal.png' },
    logo: 'https://example.com/logo.png',
}), { source: 'generated' });

console.log("PWA icon commit boundary tests passed.");
