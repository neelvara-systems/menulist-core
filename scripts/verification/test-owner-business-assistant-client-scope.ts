import assert from 'node:assert/strict';
import { resolveOwnerBusinessAssistantClientScope } from '../../src/lib/ownerBusinessAssistant/clientScope';
import { getOwnerBusinessAssistantBrowserCacheInvalidationPrefixes } from '../../src/lib/ownerBusinessAssistant/cacheInvalidation';

assert.deepEqual(
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20 }),
    { cacheScope: '10:20', tenantId: '10', storeId: '20' },
);
assert.deepEqual(
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20 }, '20', '10'),
    { cacheScope: '10:20', tenantId: '10', storeId: '20' },
);
assert.equal(
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20 }, 21),
    null,
    'a requested store and authenticated store mismatch must fail closed',
);
assert.equal(
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20 }, 20, 11),
    null,
    'a requested tenant and authenticated tenant mismatch must fail closed',
);
assert.equal(resolveOwnerBusinessAssistantClientScope({ tId: 0, sId: 20 }), null);
assert.equal(resolveOwnerBusinessAssistantClientScope({ tId: '10', sId: ' 20 ' }), null);
assert.equal(resolveOwnerBusinessAssistantClientScope(null), null);
assert.notEqual(
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20 })?.cacheScope,
    resolveOwnerBusinessAssistantClientScope({ tId: 11, sId: 20 })?.cacheScope,
    'the same store id under different tenants must not share browser state',
);
assert.deepEqual(
    getOwnerBusinessAssistantBrowserCacheInvalidationPrefixes({ tenantId: 10, storeId: 20 }),
    [
        'ownerBusinessAssistant-current:10:20:',
        'ownerBusinessAssistant-analytics:10:20:',
        'ownerBusinessAssistant-locations:',
        'ownerBusinessAssistant-packet:20:',
    ],
);
assert.deepEqual(
    getOwnerBusinessAssistantBrowserCacheInvalidationPrefixes({ storeId: 20 }).slice(0, 2),
    ['ownerBusinessAssistant-current:', 'ownerBusinessAssistant-analytics:'],
    'a caller without tenant context must clear all tenant-scoped read models instead of missing the new keys',
);

process.stdout.write('Owner Business Assistant client scope tests passed.\n');
