import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import getActiveSession, {
    clearClientSessionCache,
    getProductScopedClientSession,
    refreshClientSessionCacheFromApi,
} from '@lib/auth/getActiveSession';
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

const verifyClientSessionRefreshBoundary = async () => {
    const originalWindow = globalThis.window;
    const originalFetch = globalThis.fetch;
    let sessionFetchCount = 0;
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
            location: {
                hostname: 'app.menulist.ai',
                pathname: '/projects',
            },
            localStorage: {
                getItem: () => null,
                removeItem: () => undefined,
                setItem: () => undefined,
            },
        },
    });
    globalThis.fetch = async () => {
        sessionFetchCount += 1;
        return new Response(JSON.stringify(session), {
            headers: { 'content-type': 'application/json' },
            status: 200,
        });
    };

    try {
        clearClientSessionCache();
        const refreshedSession = await refreshClientSessionCacheFromApi();
        assert.equal(refreshedSession?.uId, session.uId);
        assert.equal(sessionFetchCount, 1, 'the provider must refresh the complete JSON session once');
        const primedSession = await getActiveSession();
        assert.equal(primedSession?.uId, session.uId);
        assert.equal(primedSession?.tId, session.tId);
        assert.equal(primedSession?.sId, session.sId);
        assert.equal(sessionFetchCount, 1, 'the refreshed session must seed the short-lived DAL cache');
        clearClientSessionCache();
    } finally {
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: originalWindow,
        });
        globalThis.fetch = originalFetch;
    }
};

const verifyConcurrentClientSessionBoundary = async () => {
    const originalWindow = globalThis.window;
    const originalFetch = globalThis.fetch;
    let releaseFetch: (() => void) | null = null;
    let sessionFetchCount = 0;
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
            location: {
                hostname: 'app.menulist.ai',
                pathname: '/answerlattice/product-surfaces',
            },
            localStorage: {
                getItem: () => null,
                removeItem: () => undefined,
                setItem: () => undefined,
            },
        },
    });
    globalThis.fetch = async () => {
        sessionFetchCount += 1;
        await new Promise<void>((resolve) => {
            releaseFetch = resolve;
        });
        return new Response(JSON.stringify(session), {
            headers: { 'content-type': 'application/json' },
            status: 200,
        });
    };

    try {
        clearClientSessionCache();
        const parallelReads = [
            getActiveSession(),
            getActiveSession(),
            getActiveSession(),
        ];
        await new Promise(resolve => setTimeout(resolve, 0));
        assert.equal(sessionFetchCount, 1, 'parallel DAL reads must share one session request');
        assert.ok(releaseFetch, 'the shared session request must be pending before settlement');
        releaseFetch();
        const settledSessions = await Promise.all(parallelReads);
        assert.equal(settledSessions.length, 3);
        for (const settledSession of settledSessions) {
            assert.equal(settledSession?.uId, session.uId);
            assert.equal(settledSession?.tId, 101);
            assert.equal(settledSession?.sId, 202);
        }
        clearClientSessionCache();
    } finally {
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: originalWindow,
        });
        globalThis.fetch = originalFetch;
    }
};

const clientSessionRefreshBoundary = verifyClientSessionRefreshBoundary();
const concurrentClientSessionBoundary = clientSessionRefreshBoundary.then(
    verifyConcurrentClientSessionBoundary,
);

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
    /if \(joinedGeneration !== clientSessionGeneration\)/,
    'a caller joining an in-flight request must reject logout-invalidated settlement by generation',
);
assert.doesNotMatch(
    activeSessionSource,
    /joinedGeneration !== clientSessionGeneration\s+\|\| clientSessionRequest !== joinedRequest/,
    'a completed shared request must not make concurrent callers look logged out after its slot is cleared',
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
assert.match(
    activeSessionSource,
    /refreshClientSessionCacheFromApi[\s\S]*clientSessionGeneration \+= 1;[\s\S]*clientSessionCache = null;/,
    'an explicit provider refresh must invalidate older client identity before starting its request',
);

const sessionProviderSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/providers/sessionProvider.tsx'),
    'utf8',
);
const clientRefreshIndex = sessionProviderSource.indexOf(
    'refreshClientSessionCacheFromApi()',
);
const exposeStoreIndex = sessionProviderSource.indexOf('setLoginStoreDetails(fetchedStore);');
assert.ok(clientRefreshIndex >= 0, 'the authenticated provider must refresh the complete client session');
assert.ok(
    clientRefreshIndex < exposeStoreIndex,
    'the provider must refresh the complete client session before exposing bootstrapped store data',
);
assert.doesNotMatch(
    sessionProviderSource,
    /<Provider\s+session=\{session\}/,
    'the NextAuth client context must not receive the expiry-stripped Server Component session',
);
assert.match(
    sessionProviderSource,
    /getFirebaseAuthSessionScopeKey\(effectiveSession\)/,
    'the provider Firebase readiness key must follow the route-aware MenuList or Answerlattice client scope',
);
assert.doesNotMatch(
    sessionProviderSource,
    /firebaseAuthRequiredScopeKey\s*=\s*requiresFirebaseAuth\s*\?\s*getSessionProviderScopeKey\(effectiveSession\)/,
    'the provider must not reuse the MenuList data scope key for Answerlattice Help Center auth readiness',
);
assert.match(
    sessionProviderSource,
    /productContext === 'answerlattice'[\s\S]*isAnswerlatticeRuntimeRoute\(normalizedPathname, currentHostname\)/,
    'the provider must accept a server-stable Answerlattice product context before consulting browser hostname',
);

const answerlatticeLayoutSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/app/(answerlattice)/layout.tsx'),
    'utf8',
);
assert.match(
    answerlatticeLayoutSource,
    /<SessionProvider session=\{session\} productContext="answerlattice">/,
    'the Answerlattice server layout must pin product context so rewritten clean-domain routes hydrate consistently',
);

const firebaseAuthSyncSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/lib/auth/firebaseAuthSync.ts'),
    'utf8',
);
assert.match(
    firebaseAuthSyncSource,
    /const nextKey = \[\s*shouldUseAnswerlatticeScope\(effectiveSession\) \? PRODUCT_IDS\.ANSWERLATTICE : PRODUCT_IDS\.MENULIST,/,
    'in-flight Firebase Auth sync deduplication must distinguish MenuList and Answerlattice products',
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

concurrentClientSessionBoundary.then(() => {
    console.log('Active session product-scope boundary tests passed.');
});
