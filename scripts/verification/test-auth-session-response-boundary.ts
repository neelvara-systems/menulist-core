import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { normalizeLoginUserSession } from '@lib/auth/loginSessionBoundary';

const validSession = {
    authIssuedAt: 1_720_000_000,
    expires: '2026-07-20T00:00:00.000Z',
    pId: 'ML',
    platformRole: 'OWNER',
    role: 'owner',
    sId: 22,
    tId: 11,
    uId: 'user-1',
    user: {
        active: true,
        authIssuedAt: 1_720_000_000,
        email: 'owner@example.com',
        id: 'user-1',
        isVerified: true,
        name: 'Owner',
        pId: 'ML',
        platformRole: 'OWNER',
        productAccounts: {
            AL: {
                role: 'owner',
                storeId: 202,
                tenantId: 101,
            },
        },
        productId: 'ML',
        role: 'owner',
        storeId: 22,
        storeIds: [22, 33],
        stores: [
            { role: 'owner', storeId: 22 },
            { role: 'manager', storeId: 33 },
        ],
        tenantId: 11,
    },
};

const clone = () => structuredClone(validSession);

const normalized = normalizeLoginUserSession(validSession);
assert.ok(normalized, 'the compact serialized NextAuth session contract must be accepted');
assert.equal(normalized.expires, validSession.expires, 'session expiry must remain an ISO string');
assert.deepEqual(normalized.user.storeIds, [22, 33]);
assert.equal(normalized.user.productAccounts?.AL?.tenantId, 101);
assert.equal('updatedAt' in (normalized.user.productAccounts?.AL || {}), false);

const privateProductAccountFields = clone();
Object.assign(privateProductAccountFields.user.productAccounts.AL, {
    createdAt: 'private',
    internalNote: 'private',
    updatedAt: 'private',
});
const projectedProductAccount = normalizeLoginUserSession(privateProductAccountFields);
assert.ok(projectedProductAccount);
assert.deepEqual(projectedProductAccount.user.productAccounts?.AL, {
    role: 'owner',
    storeId: 202,
    tenantId: 101,
});

const conflictingProductAccountScope = clone();
Object.assign(conflictingProductAccountScope.user.productAccounts.AL, { tId: 999 });
assert.equal(
    normalizeLoginUserSession(conflictingProductAccountScope),
    null,
    'conflicting product-account tenant aliases must fail closed',
);

const dateExpiry = clone();
dateExpiry.expires = new Date(validSession.expires) as unknown as string;
assert.equal(normalizeLoginUserSession(dateExpiry), null, 'Date objects must not cross the JSON session boundary');

const looseDateString = clone();
looseDateString.expires = '2026';
assert.equal(normalizeLoginUserSession(looseDateString), null, 'non-canonical date strings must not satisfy the ISO expiry contract');

const looseTenantId = clone();
looseTenantId.tId = '1e1' as unknown as number;
assert.equal(normalizeLoginUserSession(looseTenantId), null, 'scientific-notation tenant IDs must be rejected');

const mismatchedStore = clone();
mismatchedStore.user.storeId = 33;
assert.equal(normalizeLoginUserSession(mismatchedStore), null, 'top-level and nested store scope must agree');

const mismatchedUser = clone();
mismatchedUser.user.id = 'user-2';
assert.equal(normalizeLoginUserSession(mismatchedUser), null, 'top-level and nested user identity must agree');

const contradictoryRoles = clone();
contradictoryRoles.user.stores.push({ role: 'staff', storeId: 22 });
assert.equal(normalizeLoginUserSession(contradictoryRoles), null, 'contradictory duplicate store roles must fail closed');

const unknownProductAccount = clone();
Object.assign(unknownProductAccount.user.productAccounts, { UNKNOWN: { storeId: 1, tenantId: 1 } });
assert.equal(normalizeLoginUserSession(unknownProductAccount), null, 'unknown product-account keys must fail closed');

const mismatchedProduct = clone();
mismatchedProduct.user.productId = 'AL';
assert.equal(normalizeLoginUserSession(mismatchedProduct), null, 'product aliases must agree across the compact session');

const mismatchedIssuedAt = clone();
mismatchedIssuedAt.user.authIssuedAt += 1;
assert.equal(normalizeLoginUserSession(mismatchedIssuedAt), null, 'session issuance aliases must agree when both are present');

const onboardingSession = clone();
onboardingSession.tId = null as unknown as number;
onboardingSession.sId = null as unknown as number;
onboardingSession.user.tenantId = null as unknown as number;
onboardingSession.user.storeId = null as unknown as number;
assert.ok(normalizeLoginUserSession(onboardingSession), 'pre-store onboarding sessions may use explicit null scope');

const hostileSession = new Proxy({}, {
    get() {
        throw new Error('hostile session getter');
    },
});
assert.equal(normalizeLoginUserSession(hostileSession), null, 'hostile session access must fail closed');

const hookSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/hooks/useClientAuthSession.ts'),
    'utf8',
);
assert.match(hookSource, /const \{ data, status \} = useSession\(\);/, 'the client hook must use the typed NextAuth result');
assert.doesNotMatch(hookSource, /useSession\(\).*any/, 'the client hook must not erase the session contract with any');
assert.match(hookSource, /normalizeLoginUserSession\(data\)/, 'the client hook must validate the runtime session payload');
assert.match(
    hookSource,
    /getClientSessionScopeForCurrentStore\(/,
    'the client hook must share active-store and product-route projection with the DAL',
);
assert.doesNotMatch(
    hookSource,
    /isAnswerlatticeRuntimeRoute\(/,
    'the client hook must not retain a narrower product-route projection path',
);

console.log('Auth session response boundary tests passed.');
