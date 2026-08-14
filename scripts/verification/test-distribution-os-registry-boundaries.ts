import assert from 'node:assert/strict';

import {
    DISTRIBUTION_OS_BOUNDARY,
    DISTRIBUTION_OS_PRODUCT_IDS,
} from '../../packages/distribution-os/schemas/distribution-os-schema';
import {
    DISTRIBUTION_OS_LEDGERS,
    DISTRIBUTION_OS_PRODUCT_PROFILES,
} from '../../packages/distribution-os/products/distribution-profiles';
import {
    queryDistributionOs,
    readAllDistributionOsEntries,
    runDistributionOsAudit,
} from '../../packages/distribution-os/scripts/lib/distribution-os-ledger';

assert.deepEqual(DISTRIBUTION_OS_BOUNDARY, {
    internalOnly: true,
    readOnlyCommands: true,
    publicRuntime: false,
    firebaseOperations: false,
    providerConnections: false,
    automaticResearch: false,
    automaticPublishing: false,
    automaticOutreach: false,
    automaticSpend: false,
});

assert.equal(DISTRIBUTION_OS_PRODUCT_PROFILES.length, DISTRIBUTION_OS_PRODUCT_IDS.length);
assert.equal(new Set(DISTRIBUTION_OS_PRODUCT_PROFILES.map((profile) => profile.id)).size, DISTRIBUTION_OS_PRODUCT_IDS.length);
assert.equal(DISTRIBUTION_OS_LEDGERS.length, 2);

const entries = readAllDistributionOsEntries();
assert.ok(entries.length >= 13, 'The two maintained ledgers should expose their current numbered entries.');
assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length);
assert.ok(entries.every((entry) => entry.topics.length > 0));

const menuListAiDiscovery = queryDistributionOs({ product: 'menulist', topic: 'ai-discovery' });
assert.ok(menuListAiDiscovery.entries.some((entry) => entry.id.startsWith('ML-MKT-EXT-')));
assert.ok(menuListAiDiscovery.entries.some((entry) => entry.id.startsWith('PP-DIST-EXT-')));

const answerlattice = queryDistributionOs({ product: 'answerlattice' });
assert.ok(answerlattice.entries.length > 0);
assert.ok(answerlattice.entries.every((entry) => entry.ledgerId === 'portfolio-distribution-insights'));

const rejected = queryDistributionOs({ status: 'REJECTED' });
assert.ok(rejected.entries.every((entry) => entry.status === 'REJECTED'));

const exactEntry = queryDistributionOs({ entry: 'ML-MKT-EXT-011' });
assert.equal(exactEntry.entries.length, 1);
assert.equal(exactEntry.entries[0].id, 'ML-MKT-EXT-011');

const audit = runDistributionOsAudit();
assert.deepEqual(audit.errors, []);
assert.equal(audit.productCount, DISTRIBUTION_OS_PRODUCT_IDS.length);
assert.equal(audit.ledgerCount, 2);
assert.equal(audit.entryCount, entries.length);

const invalidProductAudit = runDistributionOsAudit('not-a-product');
assert.ok(invalidProductAudit.errors.some((error) => error.includes('Unknown product')));

console.log(`DistributionOS registry boundaries passed (${entries.length} entries, ${DISTRIBUTION_OS_PRODUCT_IDS.length} product routes).`);
