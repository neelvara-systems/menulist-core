import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

import { resolveAiMenuManagerSelectedStoreScope } from '../../src/lib/ai-menu-manager/apiGuards';

const request = new NextRequest('https://menulist.ai/api/ai-menu-manager/inbox');
const baseUser = {
    id: 'owner-1',
    storeId: 22,
    storeIds: [22],
    stores: [{ role: 'Owner', storeId: 22 }],
    tenantId: 11,
};

const validScope = resolveAiMenuManagerSelectedStoreScope(request, {
    sId: 22,
    tId: 11,
    uId: 'owner-1',
    user: baseUser,
}, 22);
assert.deepEqual(validScope, { sId: '22', tId: '11', userId: 'owner-1' });

const missingActor = resolveAiMenuManagerSelectedStoreScope(request, {
    sId: 22,
    tId: 11,
    user: { ...baseUser, id: undefined },
}, 22);
assert.equal('error' in missingActor ? missingActor.error?.status : null, 400);

const contradictoryActor = resolveAiMenuManagerSelectedStoreScope(request, {
    sId: 22,
    tId: 11,
    uId: 'owner-1',
    user: { ...baseUser, id: 'owner-2' },
}, 22);
assert.equal('error' in contradictoryActor ? contradictoryActor.error?.status : null, 400);

console.log('AI Menu Manager API guard actor boundary tests passed.');
