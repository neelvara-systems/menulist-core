import assert from 'node:assert/strict';
import {
    buildOwnerBusinessAssistantThreadStorageKey,
    resolveOwnerBusinessAssistantClientScope,
} from '../../src/lib/ownerBusinessAssistant/clientScope';
import { getOwnerBusinessAssistantBrowserCacheInvalidationPrefixes } from '../../src/lib/ownerBusinessAssistant/cacheInvalidation';

assert.deepEqual(
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20, uId: 'owner-a', user: { id: 'owner-a' } }),
    { actorId: 'owner-a', cacheScope: '10:20', tenantId: '10', storeId: '20' },
);
assert.deepEqual(
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20, uId: 'owner-a' }, '20', '10'),
    { actorId: 'owner-a', cacheScope: '10:20', tenantId: '10', storeId: '20' },
);
assert.equal(
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20, uId: 'owner-a' }, 21),
    null,
    'a requested store and authenticated store mismatch must fail closed',
);
assert.equal(
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20, uId: 'owner-a' }, 20, 11),
    null,
    'a requested tenant and authenticated tenant mismatch must fail closed',
);
assert.equal(resolveOwnerBusinessAssistantClientScope({ tId: 0, sId: 20, uId: 'owner-a' }), null);
assert.equal(resolveOwnerBusinessAssistantClientScope({ tId: '10', sId: ' 20 ', uId: 'owner-a' }), null);
assert.equal(resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20 }), null);
assert.equal(
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20, uId: 'owner-a', user: { id: 'owner-b' } }),
    null,
    'conflicting actor aliases must fail closed',
);
assert.equal(resolveOwnerBusinessAssistantClientScope(null), null);
assert.notEqual(
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20, uId: 'owner-a' })?.cacheScope,
    resolveOwnerBusinessAssistantClientScope({ tId: 11, sId: 20, uId: 'owner-a' })?.cacheScope,
    'the same store id under different tenants must not share browser state',
);
assert.notEqual(
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20, uId: 'owner-a' })?.actorId,
    resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20, uId: 'owner-b' })?.actorId,
    'different actors in one store must not share personal thread identity',
);
const actorAScope = resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20, uId: 'owner:a' });
const actorBScope = resolveOwnerBusinessAssistantClientScope({ tId: 10, sId: 20, uId: 'owner' });
assert.ok(actorAScope && actorBScope);
assert.notEqual(
    buildOwnerBusinessAssistantThreadStorageKey('menu', actorAScope),
    buildOwnerBusinessAssistantThreadStorageKey('a:menu', actorBScope),
    'encoded actor/project components must not create tuple collisions',
);
assert.notEqual(
    buildOwnerBusinessAssistantThreadStorageKey(undefined, actorAScope),
    buildOwnerBusinessAssistantThreadStorageKey('all', actorAScope),
    'the all-project thread key must not collide with a project literally named all',
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
