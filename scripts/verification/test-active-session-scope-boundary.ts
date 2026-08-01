import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { getProductScopedClientSession } from '@lib/auth/getActiveSession';
import type LoginUserType from '@type/loginUser';

const session = {
    expires: '2026-08-01T00:00:00.000Z',
    pId: 'ML',
    platformRole: 'OWNER',
    role: 'OWNER',
    sId: 22,
    tId: 11,
    uId: 'user-1',
    user: {
        active: true,
        email: 'owner@example.com',
        id: 'user-1',
        isVerified: true,
        name: 'Owner',
        pId: 'ML',
        platformRole: 'OWNER',
        productAccounts: {
            AL: {
                storeId: 202,
                tenantId: 101,
            },
        },
        productId: 'ML',
        role: 'OWNER',
        storeId: 22,
        storeIds: [22, 33],
        stores: [],
        tenantId: 11,
    },
} satisfies LoginUserType;

const menuListScope = getProductScopedClientSession(session, '/projects', 'app.menulist.ai');
assert.equal(menuListScope, session, 'MenuList routes must retain the MenuList session scope');

const answerlatticeScope = getProductScopedClientSession(
    session,
    '/answerlattice/activation',
    'app.menulist.ai',
);
assert.ok(answerlatticeScope);
assert.equal(answerlatticeScope.tId, 101);
assert.equal(answerlatticeScope.sId, 202);
assert.equal(answerlatticeScope.user.tenantId, 101);
assert.equal(answerlatticeScope.user.storeId, 202);
assert.equal(session.tId, 11, 'product projection must not mutate the cached raw session');
assert.equal(session.sId, 22, 'product projection must not mutate the cached raw session');

const menuListAfterAnswerlattice = getProductScopedClientSession(
    session,
    '/projects',
    'app.menulist.ai',
);
assert.ok(menuListAfterAnswerlattice);
assert.equal(menuListAfterAnswerlattice.tId, 11);
assert.equal(menuListAfterAnswerlattice.sId, 22);

const activeSessionSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/lib/auth/getActiveSession.ts'),
    'utf8',
);
const menuListProjectionIndex = activeSessionSource.indexOf(
    'const menuListSession = applyActiveStoreContextToSession(session);',
);
const productProjectionIndex = activeSessionSource.indexOf(
    'return getProductScopedClientSession(\n        menuListSession,',
);
assert.ok(menuListProjectionIndex >= 0, 'the current store context must be applied to raw MenuList sessions');
assert.ok(
    productProjectionIndex > menuListProjectionIndex,
    'product scope must be projected only after the MenuList store context is resolved',
);
assert.match(
    activeSessionSource,
    /const request = getClientSessionFromApi\(\);\s+clientSessionRequest = request;/,
    'the shared in-flight request must contain only the raw session fetch',
);
assert.match(
    activeSessionSource,
    /joinedGeneration !== clientSessionGeneration\s+\|\| clientSessionRequest !== joinedRequest/,
    'a caller joining an in-flight request must reject logout-invalidated settlement',
);
assert.match(
    activeSessionSource,
    /requestGeneration !== clientSessionGeneration\s+\|\| clientSessionRequest !== request/,
    'a request creator must reject logout-invalidated settlement',
);
assert.match(
    activeSessionSource,
    /if \(clientSessionRequest === request\) \{\s+clientSessionRequest = null;/,
    'an older request must not clear a newer request slot',
);
assert.doesNotMatch(
    activeSessionSource,
    /return clientSessionRequest;/,
    'a joined caller must never receive a scope selected by the request creator',
);

const sessionCleanupSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/lib/auth/clientSessionCleanup.ts'),
    'utf8',
);
assert.match(
    sessionCleanupSource,
    /clearClientSessionCache\(\);\s+writeActiveStoreContextId\(null\);/,
    'authenticated browser cleanup must invalidate raw session memory before other tenant state',
);

console.log('Active session product-scope boundary tests passed.');
