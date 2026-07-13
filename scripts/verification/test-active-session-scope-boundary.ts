import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { getProductScopedClientSession } from '@lib/auth/getActiveSession';
import type LoginUserType from '@type/loginUser';

const session = {
    pId: 'ML',
    sId: 22,
    tId: 11,
    user: {
        pId: 'ML',
        productAccounts: {
            AL: {
                storeId: 202,
                tenantId: 101,
            },
        },
        productId: 'ML',
        storeId: 22,
        storeIds: [22, 33],
        stores: [],
        tenantId: 11,
    },
} as LoginUserType;

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
    /clientSessionRequest = getClientSessionFromApi\(\);/,
    'the shared in-flight request must contain only the raw session fetch',
);
assert.match(
    activeSessionSource,
    /return getCurrentClientSessionScope\(await clientSessionRequest\);/,
    'every caller joining an in-flight request must project its current route scope',
);
assert.doesNotMatch(
    activeSessionSource,
    /return clientSessionRequest;/,
    'a joined caller must never receive a scope selected by the request creator',
);

console.log('Active session product-scope boundary tests passed.');
