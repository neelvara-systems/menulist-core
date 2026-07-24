import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    getActiveTenantStoreSummaryId,
    isActiveStoreRecordInTenantScope,
} from '@lib/multiOutlet/sessionStoreContextBoundary';
import {
    getSessionProviderScopeKey,
    getMenuListSessionProviderScopeKey,
    getSubscriptionLoadScopeKey,
    hasSessionProviderScopeChanged,
} from '@lib/multiOutlet/sessionProviderScopeBoundary';
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

const firstProviderScope = getSessionProviderScopeKey({
    pId: 'ML',
    productId: 'ML',
    tId: 11,
    sId: 22,
    user: { id: 'user-a', tenantId: 11, storeId: 22, pId: 'ML', productId: 'ML' },
});
assert.ok(firstProviderScope);
assert.equal(hasSessionProviderScopeChanged(undefined, firstProviderScope), false);
assert.equal(hasSessionProviderScopeChanged(firstProviderScope, firstProviderScope), false);
assert.equal(hasSessionProviderScopeChanged(firstProviderScope, getSessionProviderScopeKey({
    pId: 'ML',
    productId: 'ML',
    tId: 12,
    sId: 22,
    user: { id: 'user-a', tenantId: 12, storeId: 22, pId: 'ML', productId: 'ML' },
})), true, 'a tenant switch must reset provider state even when a store ID is reused');
assert.equal(getSessionProviderScopeKey({
    pId: 'ML',
    productId: 'AL',
    tId: 11,
    sId: 22,
    user: { id: 'user-a', tenantId: 11, storeId: 22 },
}), null, 'conflicting product aliases cannot identify a provider scope');
assert.equal(getSessionProviderScopeKey({
    pId: 'ML',
    tId: 11,
    sId: 22,
    user: { id: 'user-a', tenantId: 99, storeId: 22 },
}), null, 'conflicting tenant aliases cannot identify a provider scope');
const answerlatticeProviderSession = {
    pId: 'AL',
    productId: 'AL',
    tId: 101,
    sId: 202,
    user: { id: 'user-al', tenantId: 101, storeId: 202, pId: 'AL', productId: 'AL' },
};
assert.ok(getSessionProviderScopeKey(answerlatticeProviderSession));
assert.equal(getMenuListSessionProviderScopeKey(answerlatticeProviderSession), null);
assert.equal(getMenuListSessionProviderScopeKey({
    pId: 'ML',
    productId: 'ML',
    tId: 11,
    sId: 22,
    user: { id: 'user-ml', tenantId: 11, storeId: 22, pId: 'ML', productId: 'ML' },
}), '["ML","user-ml",11,22]');
const firstPlatformProviderScope = getSessionProviderScopeKey({
    pId: 'ML',
    platformRole: 'PLATFORM',
    user: { id: 'platform-a', platformRole: 'PLATFORM' },
});
assert.equal(firstPlatformProviderScope, '["ML","platform-a","platform","PLATFORM"]');
assert.equal(hasSessionProviderScopeChanged(firstPlatformProviderScope, getSessionProviderScopeKey({
    pId: 'ML',
    platformRole: 'PLATFORM',
    user: { id: 'platform-b', platformRole: 'PLATFORM' },
})), true, 'a storeless platform-user switch must reset provider state');
assert.equal(getSessionProviderScopeKey({
    pId: 'ML',
    platformRole: 'OWNER',
    user: { id: 'platform-a', platformRole: 'OWNER' },
}), null, 'loss of persisted platform role must retire the storeless platform provider scope');
assert.equal(getMenuListSessionProviderScopeKey({
    pId: 'ML',
    platformRole: 'PLATFORM',
    user: { id: 'platform-a', platformRole: 'PLATFORM' },
}), null, 'storeless platform identity must not authorize store billing scope');
assert.equal(getSubscriptionLoadScopeKey(11, 22), '11:22');
assert.equal(getSubscriptionLoadScopeKey(12, 22), '12:22');
assert.equal(getSubscriptionLoadScopeKey(' 11 ', 22), null);

const providerSource = fs.readFileSync(path.resolve(process.cwd(), 'src/providers/sessionProvider.tsx'), 'utf8');
assert.match(providerSource, /getActiveTenantStoreSummaryId\(store\) === requestedStoreContextId/);
assert.match(providerSource, /isActiveStoreRecordInTenantScope\(targetStore,/);
assert.match(providerSource, /hasSessionProviderScopeChanged\(providerSessionScopeKeyRef\.current, currentProviderScopeKey\)/);
assert.match(providerSource, /activeSubscriptionRequestScopeKeyRef\.current === requestScopeKey/);
assert.match(providerSource, /activeSubscriptionScopeKeyRef\.current !== requestScopeKey/);
assert.match(providerSource, /providerStateMatchesCurrentSession \? activeSubscription : null/);
assert.match(providerSource, /providerStateMatchesCurrentSession \? tenantDetails : null/);
assert.doesNotMatch(providerSource, /activeSubscriptionRequestStoreIdRef/);
assert.doesNotMatch(providerSource, /Number\(store\?\.storeId\) === activeStoreContextId/);

console.log('Session store-context boundary tests passed.');
