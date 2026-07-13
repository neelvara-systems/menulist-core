import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    getActiveTenantStoreSummaryId,
    isActiveStoreRecordInTenantScope,
} from '@lib/multiOutlet/sessionStoreContextBoundary';
import { isLegacySingleStoreMasterCandidate } from '@lib/multiOutlet/locationAccess';

assert.equal(getActiveTenantStoreSummaryId({ active: true, storeId: 22 }), 22);
assert.equal(getActiveTenantStoreSummaryId({ active: true, storeId: '22' }), 22);
assert.equal(getActiveTenantStoreSummaryId({ active: true, storeId: '2.2e1' }), null);
assert.equal(getActiveTenantStoreSummaryId({ active: false, storeId: 22 }), null);
assert.equal(getActiveTenantStoreSummaryId({ active: true, storeDetails: { active: false }, storeId: 22 }), null);

assert.equal(isActiveStoreRecordInTenantScope({
    active: true,
    deleted: false,
    storeId: 22,
    tenantId: 11,
}, { storeId: 22, tenantId: 11 }), true);
assert.equal(isActiveStoreRecordInTenantScope({
    active: true,
    storeId: 22,
    tenantId: 12,
}, { storeId: 22, tenantId: 11 }), false);
assert.equal(isActiveStoreRecordInTenantScope({
    active: true,
    sId: '22',
    storeId: 22,
    tId: '11',
    tenantId: 11,
}, { storeId: 22, tenantId: 11 }), true);
assert.equal(isActiveStoreRecordInTenantScope({
    active: true,
    sId: '2.2e1',
    storeId: 22,
    tenantId: 11,
}, { storeId: 22, tenantId: 11 }), false);
assert.equal(isActiveStoreRecordInTenantScope({
    active: true,
    blocked: true,
    storeId: 22,
    tenantId: 11,
}, { storeId: 22, tenantId: 11 }), false);

assert.equal(isLegacySingleStoreMasterCandidate({
    storeDetails: { storeId: 1000 },
    tenantDetails: { storesList: [{ active: true, storeId: '1e3' }] },
}), false, 'malformed summary IDs must not make a store a legacy master');

const providerSource = fs.readFileSync(path.resolve(process.cwd(), 'src/providers/sessionProvider.tsx'), 'utf8');
assert.match(providerSource, /getActiveTenantStoreSummaryId\(store\) === requestedStoreContextId/);
assert.match(providerSource, /isActiveStoreRecordInTenantScope\(targetStore,/);
assert.doesNotMatch(providerSource, /Number\(store\?\.storeId\) === activeStoreContextId/);

console.log('Session store-context boundary tests passed.');
