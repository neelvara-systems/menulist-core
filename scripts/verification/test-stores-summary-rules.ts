#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    deleteApp as deleteAdminApp,
    initializeApp as initializeAdminApp,
} from 'firebase-admin/app';
import {
    getFirestore as getAdminFirestore,
    Timestamp,
} from 'firebase-admin/firestore';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteApp, initializeApp } from 'firebase/app';
import {
    connectFirestoreEmulator,
    deleteField,
    doc,
    getDoc,
    getFirestore,
    runTransaction,
    serverTimestamp,
    setDoc,
    terminate,
    updateDoc,
} from 'firebase/firestore';
import {
    allocateNextPlatformEntityId,
    readPlatformCounterSnapshot,
} from '../../src/lib/platform/platformCounterAllocator';
import { resolvePlatformCounterFloor } from '../../src/data/shared/platformCounterBoundary';
import {
    normalizeStoreSummaryNumericAliases,
    normalizeStoreSummaryNumericDocumentId,
    normalizeStoreSummaryDate,
    normalizePlatformStoreSummaryIdentity,
    parsePlatformStoreSummary,
} from '../../src/data/shared/storeSummaryBoundary';
import { createTenantStoreInTransaction } from '../../src/lib/onboarding/createTenantStore';
import {
    getSubdomainClaimDocumentId,
    isSubdomainUnavailableError,
    isValidSubdomainClaimCandidate,
    readSubdomainReservationInTransaction,
    writeCurrentSubdomainClaim,
    writeRedirectSubdomainClaim,
    writeReleasedSubdomainClaim,
} from '../../src/lib/routing/subdomainClaim';
import {
    isSubdomainOwnerScopeError,
    readSubdomainOwnerStoreInTransaction,
} from '../../src/lib/routing/subdomainOwnerScope';
import {
    getOutletSlugClaimDocumentId,
    isValidOutletSlugClaimCandidate,
    readOutletSlugReservationInTransaction,
    writeCurrentOutletSlugClaim,
    writeReleasedOutletSlugClaim,
} from '../../src/lib/routing/outletSlugClaim';
import {
    buildBrandPropagationValues,
    buildStoreSummaryBrandPropagationValues,
    isBrandPropagationResult,
    normalizeMasterStorePropagationFields,
} from '../../src/lib/multiOutlet/brandPropagationBoundary';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-stores-summary-rules';
const ROOT = path.resolve(__dirname, '..', '..');

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    assert(
        isValidSubdomainClaimCandidate(`a${'b'.repeat(61)}z`),
        'A 63-character DNS label must be admitted by the shared claim boundary',
    );
    assert(
        !isValidSubdomainClaimCandidate(`a${'b'.repeat(62)}z`),
        'A 64-character DNS label must be rejected by the shared claim boundary',
    );
    assert(
        !isValidSubdomainClaimCandidate('legacy_invalid_slug'),
        'Malformed legacy slugs must not be used as deterministic claim document IDs',
    );
    assert(
        isValidOutletSlugClaimCandidate(`a${'b'.repeat(58)}z`),
        'A 60-character outlet path segment must be admitted by the claim boundary',
    );
    assert(
        !isValidOutletSlugClaimCandidate(`a${'b'.repeat(59)}z`),
        'A 61-character outlet path segment must be rejected by the claim boundary',
    );

    assert(
        resolvePlatformCounterFloor(
            { tenants: { count: '7' } },
            { tenants: { count: 6 } },
            { 'stores.204.tId': '109' },
            'tenant',
        ) === 109,
        'Counter floor must reconcile exact legacy string counters and flat store summaries',
    );
    assert(
        resolvePlatformCounterFloor(
            { stores: { count: '001' } },
            null,
            JSON.parse('{"stores":{"__proto__":{"tId":999},"205":{"tId":110}}}'),
            'store',
        ) === 205,
        'Counter floor must ignore ambiguous counters and prototype-path entries',
    );
    const admittedStoreSummary = parsePlatformStoreSummary(JSON.parse(JSON.stringify({
        stores: {
            '201': { active: true, storeId: 201, tId: 101 },
            '0202': { active: true, tId: 102 },
            '203': null,
            '204': { storeId: 999, tId: 104 },
        },
        'stores.202.active': true,
        'stores.202.tId': '102',
        'stores.205.tId': '102x',
    })));
    assert(
        Object.keys(admittedStoreSummary).join(',') === '201,202',
        'Store summary parser must admit only exact numeric store/tenant scopes and matching embedded identity',
    );
    assert(admittedStoreSummary['202'].active === true, 'Store summary parser must preserve valid flat legacy fields');
    assert(admittedStoreSummary['202'].tId === '102', 'Store summary parser must normalize admitted tenant scope');
    assert(
        normalizePlatformStoreSummaryIdentity('201', { storeId: 201, tenantId: 101 })?.tId === '101',
        'Canonical store backfill identity must admit a matching numeric source row',
    );
    assert(
        normalizePlatformStoreSummaryIdentity('201', { storeId: 202, tenantId: 101 }) === null,
        'Canonical store backfill identity must reject a conflicting embedded store ID',
    );
    assert(
        normalizeStoreSummaryNumericAliases([101, '101']) === '101',
        'Numeric and string compatibility aliases must agree exactly',
    );
    assert(
        normalizeStoreSummaryNumericAliases([101, 102]) === null,
        'Conflicting tenant aliases must fail closed',
    );
    assert(
        normalizePlatformStoreSummaryIdentity('201', {
            storeId: 201,
            sId: 202,
            tenantId: 101,
        }) === null,
        'Canonical store identity must reject conflicting embedded store aliases',
    );
    assert(
        normalizePlatformStoreSummaryIdentity('201', {
            storeId: 201,
            tenantId: 101,
            tId: 102,
        }) === null,
        'Canonical store identity must reject conflicting embedded tenant aliases',
    );
    assert(
        normalizeStoreSummaryNumericDocumentId('__proto__') === null,
        'Dynamic store-summary writer keys must reject prototype path segments',
    );
    assert(
        normalizeStoreSummaryNumericDocumentId('0201') === null,
        'Dynamic store-summary writer keys must reject ambiguous numeric document IDs',
    );
    assert(normalizeStoreSummaryDate({ _seconds: 'bad' }) === null, 'Malformed persisted summary timestamps must fail closed');
    assert(
        normalizeStoreSummaryDate(1_700_000_000)?.getUTCFullYear() === 2023,
        'Legacy seconds timestamps must normalize without becoming 1970 dates',
    );
    const propagationFields = normalizeMasterStorePropagationFields([
        'logo',
        'logo',
        'businessType',
        'notAllowed',
    ]);
    assert(propagationFields.join(',') === 'logo,businessType', 'Brand propagation fields must be allow-listed and deduplicated');
    const propagationValues = buildBrandPropagationValues({ businessType: 'Cafe' }, propagationFields);
    assert(propagationValues.logo === null, 'Cleared master fields must propagate as explicit null');
    assert(propagationValues.businessType === 'Cafe', 'Persisted master values must be propagation authority');
    const summaryPropagationValues = buildStoreSummaryBrandPropagationValues({
        businessType: 'Cafe',
        currencyCode: 'INR',
        logo: null,
    });
    assert(
        Object.keys(summaryPropagationValues).sort().join(',') === 'businessType,logo',
        'Summary propagation must include only the bounded summary field set',
    );
    assert(
        isBrandPropagationResult({ failed: 0, propagated: 2, skipped: 0, success: true }),
        'Valid atomic brand-propagation acknowledgement must be admitted',
    );
    assert(
        !isBrandPropagationResult({ failed: 1, propagated: 1, skipped: 0, success: true }),
        'Partial brand-propagation acknowledgement must fail closed',
    );

    const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
    const testEnvironment = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules },
    });

    try {
        await testEnvironment.withSecurityRulesDisabled(async (context) => {
            const summaryRef = doc(context.firestore(), 'platformSummary', 'storesSummary');
            await setDoc(summaryRef, {
                stores: {
                    '201': { active: true, name: 'Tenant A', tId: 101 },
                    '202': { active: true, name: 'Tenant B', tId: 102 },
                },
                lastUpdated: 'seed',
            });
            await setDoc(doc(context.firestore(), 'tenants', '101'), {
                tenantId: 101,
                storesList: [{ name: 'Tenant A', storeId: 201, tenantName: 'Tenant A' }],
            });
            await setDoc(doc(context.firestore(), 'stores', '201'), {
                active: true,
                name: 'Tenant A',
                storeId: 201,
                tenantId: 101,
                tenantName: 'Tenant A',
            });
            await setDoc(summaryRef, {
                stores: {
                    '201': { name: 'Tenant A Partial Merge' },
                },
                lastUpdated: 'partial-nested-merge',
            }, { merge: true });
            const merged = (await getDoc(summaryRef)).data();
            assert(merged?.stores?.['201']?.tId === 101, 'Nested set merge must preserve existing summary identity fields');
            assert(merged?.stores?.['201']?.active === true, 'Nested set merge must preserve unrelated summary fields');
            assert(merged?.stores?.['202']?.tId === 102, 'Nested set merge must preserve other store slots');
        });

        const owner = testEnvironment.authenticatedContext('tenant-a-owner', {
            platformRole: 'OWNER',
            role: 'OWNER',
            tenantId: '101',
            storeId: '201',
            storeIds: ['201'],
        });
        const summaryRef = doc(owner.firestore(), 'platformSummary', 'storesSummary');

        await assertSucceeds(runTransaction(owner.firestore(), async (transaction) => {
            const storeRef = doc(owner.firestore(), 'stores', '201');
            const tenantRef = doc(owner.firestore(), 'tenants', '101');
            const [storeSnapshot, tenantSnapshot] = await Promise.all([
                transaction.get(storeRef),
                transaction.get(tenantRef),
            ]);
            assert(storeSnapshot.exists() && tenantSnapshot.exists(), 'Atomic store rename fixtures must exist');
            transaction.update(storeRef, { name: 'Tenant A Atomic' });
            transaction.update(tenantRef, {
                storesList: [{ name: 'Tenant A Atomic', storeId: 201, tenantName: 'Tenant A' }],
            });
            transaction.set(summaryRef, {
                lastUpdated: serverTimestamp(),
                stores: { '201': { name: 'Tenant A Atomic', tId: 101 } },
            }, { merge: true });
        }));
        await assertFails(runTransaction(owner.firestore(), async (transaction) => {
            const storeRef = doc(owner.firestore(), 'stores', '201');
            const tenantRef = doc(owner.firestore(), 'tenants', '101');
            await Promise.all([transaction.get(storeRef), transaction.get(tenantRef)]);
            transaction.update(storeRef, { name: 'Must Roll Back' });
            transaction.update(tenantRef, {
                storesList: [{ name: 'Must Roll Back', storeId: 201, tenantName: 'Tenant A' }],
            });
            transaction.set(summaryRef, {
                lastUpdated: serverTimestamp(),
                stores: { '201': { name: 'Must Roll Back', tId: 102 } },
            }, { merge: true });
        }));
        await testEnvironment.withSecurityRulesDisabled(async (context) => {
            const [storeSnapshot, tenantSnapshot, summarySnapshot] = await Promise.all([
                getDoc(doc(context.firestore(), 'stores', '201')),
                getDoc(doc(context.firestore(), 'tenants', '101')),
                getDoc(doc(context.firestore(), 'platformSummary', 'storesSummary')),
            ]);
            assert(storeSnapshot.data()?.name === 'Tenant A Atomic', 'Rejected summary scope must roll back canonical store rename');
            assert(tenantSnapshot.data()?.storesList?.[0]?.name === 'Tenant A Atomic', 'Rejected summary scope must roll back tenant list rename');
            assert(summarySnapshot.data()?.stores?.['201']?.name === 'Tenant A Atomic', 'Rejected summary scope must preserve the admitted summary rename');
        });

        const confirmedAt = '2026-07-11T12:00:00.000Z';
        await assertSucceeds(runTransaction(owner.firestore(), async (transaction) => {
            const storeRef = doc(owner.firestore(), 'stores', '201');
            const storeSnapshot = await transaction.get(storeRef);
            assert(storeSnapshot.exists(), 'Atomic menu-presence store fixture must exist');
            transaction.update(storeRef, {
                'menuPresence.googleBusiness': confirmedAt,
            });
            transaction.set(summaryRef, {
                lastUpdated: serverTimestamp(),
                stores: {
                    '201': {
                        menuPresence: { googleBusiness: confirmedAt },
                        modifiedOn: confirmedAt,
                        tId: 101,
                    },
                },
            }, { merge: true });
        }));
        await assertFails(runTransaction(owner.firestore(), async (transaction) => {
            const storeRef = doc(owner.firestore(), 'stores', '201');
            await transaction.get(storeRef);
            transaction.update(storeRef, {
                'menuPresence.appleBusiness': confirmedAt,
            });
            transaction.set(summaryRef, {
                lastUpdated: serverTimestamp(),
                stores: {
                    '201': {
                        menuPresence: { appleBusiness: confirmedAt },
                        modifiedOn: confirmedAt,
                        tId: 102,
                    },
                },
            }, { merge: true });
        }));
        await testEnvironment.withSecurityRulesDisabled(async (context) => {
            const [storeSnapshot, summarySnapshot] = await Promise.all([
                getDoc(doc(context.firestore(), 'stores', '201')),
                getDoc(doc(context.firestore(), 'platformSummary', 'storesSummary')),
            ]);
            assert(
                storeSnapshot.data()?.menuPresence?.googleBusiness === confirmedAt,
                'Admitted presence transaction must update the canonical store',
            );
            assert(
                summarySnapshot.data()?.stores?.['201']?.menuPresence?.googleBusiness === confirmedAt,
                'Admitted presence transaction must update the store summary projection',
            );
            assert(
                storeSnapshot.data()?.menuPresence?.appleBusiness === undefined,
                'Rejected summary identity must roll back the canonical presence update',
            );
            assert(
                summarySnapshot.data()?.stores?.['201']?.menuPresence?.appleBusiness === undefined,
                'Rejected summary identity must not create a partial presence projection',
            );
        });

        await assertSucceeds(updateDoc(summaryRef, {
            'stores.201.name': 'Tenant A Updated',
            lastUpdated: 'allowed-name-update',
        }));
        await assertSucceeds(updateDoc(summaryRef, {
            'stores.201.storeId': '201',
            lastUpdated: 'allowed-matching-identity',
        }));
        await assertSucceeds(updateDoc(summaryRef, {
            'stores.201.active': false,
            lastUpdated: 'allowed-soft-deactivation',
        }));
        await testEnvironment.withSecurityRulesDisabled(async (context) => {
            const softDeactivatedSummary = (
                await getDoc(doc(context.firestore(), 'platformSummary', 'storesSummary'))
            ).data();
            assert(softDeactivatedSummary?.stores?.['201']?.active === false, 'Soft deactivation must retain an inactive summary row');
            assert(softDeactivatedSummary?.stores?.['201']?.tId === 101, 'Soft deactivation must preserve summary tenant identity');
        });

        await assertFails(updateDoc(summaryRef, {
            'stores.201.tId': 102,
            lastUpdated: 'forged-tenant',
        }));
        await assertFails(updateDoc(summaryRef, {
            'stores.201.storeId': '202',
            lastUpdated: 'forged-store',
        }));
        await assertFails(updateDoc(summaryRef, {
            'stores.201.tId': deleteField(),
            lastUpdated: 'missing-tenant',
        }));
        await assertFails(updateDoc(summaryRef, {
            'stores.202.name': 'Cross-tenant overwrite',
            lastUpdated: 'foreign-slot',
        }));

        await testEnvironment.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'platformSummary', 'summary'), {
                stores: { count: 10 },
                tenants: { count: 5 },
            });
            await setDoc(doc(context.firestore(), 'platformSummary', 'default'), {
                stores: { count: 8 },
                tenants: { count: 7 },
            });
            await setDoc(doc(context.firestore(), 'tenants', '103'), { tenantId: 103 });
        });

        const [emulatorHost, emulatorPort] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
        const platformApp = initializeApp({ projectId: PROJECT_ID }, `platform-counter-${Date.now()}`);
        const platformDb = getFirestore(platformApp);
        connectFirestoreEmulator(platformDb, emulatorHost, Number(emulatorPort), {
            mockUserToken: {
                sub: 'platform-id-allocator',
                platformRole: 'PLATFORM',
                role: 'PLATFORM',
            },
        });
        try {
            const beforeAllocation = await readPlatformCounterSnapshot(platformDb);
            assert(beforeAllocation.tenants.count === 102, 'Tenant counter floor must include storesSummary tenant IDs');
            assert(beforeAllocation.stores.count === 202, 'Store counter floor must include storesSummary map keys');

            const firstTenantId = await allocateNextPlatformEntityId(platformDb, 'tenant');
            assert(firstTenantId === 104, 'Allocator must skip an occupied entity document ID');
            const concurrentTenantIds = await Promise.all([
                allocateNextPlatformEntityId(platformDb, 'tenant'),
                allocateNextPlatformEntityId(platformDb, 'tenant'),
            ]);
            assert(
                concurrentTenantIds.slice().sort((a, b) => a - b).join(',') === '105,106',
                'Concurrent allocations must serialize to distinct IDs',
            );
            const nextStoreId = await allocateNextPlatformEntityId(platformDb, 'store');
            assert(nextStoreId === 203, 'Store allocation must continue after the highest summary map key');

            const canonicalCounters = (await getDoc(doc(platformDb, 'platformSummary', 'summary'))).data();
            assert(canonicalCounters?.tenants?.count === 106, 'Canonical tenant counter must record the latest reservation');
            assert(canonicalCounters?.stores?.count === 203, 'Canonical store counter must record the latest reservation');
        } finally {
            await terminate(platformDb);
            await deleteApp(platformApp);
        }

        const adminApp = initializeAdminApp(
            { projectId: PROJECT_ID },
            `platform-counter-admin-${Date.now()}`,
        );
        const adminDb = getAdminFirestore(adminApp);
        try {
            const createOnboardingScope = (businessName: string) => adminDb.runTransaction(
                (transaction) => createTenantStoreInTransaction(transaction, adminDb, {
                    businessName,
                    businessType: 'Restaurant',
                    email: `${businessName.toLowerCase().replaceAll(' ', '-')}@example.test`,
                    onboardingSource: 'AUDIT_EMULATOR',
                    subdomain: { preChecked: 'shared-audit-name' },
                }),
            );
            const concurrentOnboardingScopes = await Promise.all([
                createOnboardingScope('Counter Test A'),
                createOnboardingScope('Counter Test B'),
            ]);
            const tenantIds = concurrentOnboardingScopes.map((scope) => scope.tenantId).sort((a, b) => a - b);
            const storeIds = concurrentOnboardingScopes.map((scope) => scope.storeId).sort((a, b) => a - b);
            assert(tenantIds.join(',') === '107,108', 'Concurrent onboarding transactions must allocate distinct tenant IDs');
            assert(storeIds.join(',') === '204,205', 'Concurrent onboarding transactions must allocate distinct store IDs');
            const assignedSubdomains = concurrentOnboardingScopes.map((scope) => scope.subdomain || '');
            assert(
                new Set(assignedSubdomains).size === 2,
                'Concurrent onboarding transactions must not commit the same public subdomain',
            );
            assert(
                assignedSubdomains.filter((subdomain) => subdomain === 'shared-audit-name').length === 1,
                'Exactly one concurrent onboarding transaction may own the requested public subdomain',
            );
            const createdTenantDocs = await Promise.all(
                tenantIds.map((tenantId) => adminDb.collection('tenants').doc(String(tenantId)).get()),
            );
            const createdStoreDocs = await Promise.all(
                storeIds.map((storeId) => adminDb.collection('stores').doc(String(storeId)).get()),
            );
            assert(createdTenantDocs.every((snapshot) => snapshot.exists), 'Allocated tenant IDs must be committed atomically');
            assert(createdStoreDocs.every((snapshot) => snapshot.exists), 'Allocated store IDs must be committed atomically');
            const requestedSubdomainStores = await adminDb.collection('stores')
                .where('subdomain', '==', 'shared-audit-name')
                .get();
            assert(requestedSubdomainStores.size === 1, 'Requested public subdomain must resolve to exactly one canonical store');
            const requestedClaim = await adminDb.collection('platformSummary')
                .doc(getSubdomainClaimDocumentId('shared-audit-name'))
                .get();
            assert(requestedClaim.exists, 'Requested public subdomain must have a durable claim document');
            assert(
                requestedClaim.data()?.storeId === requestedSubdomainStores.docs[0].id,
                'Durable subdomain claim owner must match the canonical store document',
            );

            await Promise.all([
                adminDb.collection('stores').doc('301').set({ active: true, storeId: 301, tenantId: 201 }),
                adminDb.collection('stores').doc('302').set({ active: true, storeId: 302, tenantId: 202 }),
            ]);
            const claimExistingStore = (storeId: string, tenantId: string) => adminDb.runTransaction(async (transaction) => {
                const now = Timestamp.now();
                const reservation = await readSubdomainReservationInTransaction({
                    db: adminDb,
                    nowMillis: now.toMillis(),
                    storeId,
                    subdomain: 'concurrent-owner-name',
                    tenantId,
                    transaction,
                });
                transaction.set(adminDb.collection('stores').doc(storeId), {
                    modifiedOn: now,
                    subdomain: reservation.subdomain,
                }, { merge: true });
                writeCurrentSubdomainClaim(transaction, reservation, now);
            });
            const concurrentOwnerClaims = await Promise.allSettled([
                claimExistingStore('301', '201'),
                claimExistingStore('302', '202'),
            ]);
            assert(
                concurrentOwnerClaims.filter((result) => result.status === 'fulfilled').length === 1,
                'Concurrent owner assignments must have exactly one successful public subdomain claim',
            );
            const ownerClaimStores = await adminDb.collection('stores')
                .where('subdomain', '==', 'concurrent-owner-name')
                .get();
            assert(ownerClaimStores.size === 1, 'Concurrent owner assignments must leave exactly one canonical host owner');
            const ownerClaim = await adminDb.collection('platformSummary')
                .doc(getSubdomainClaimDocumentId('concurrent-owner-name'))
                .get();
            assert(
                ownerClaim.data()?.storeId === ownerClaimStores.docs[0].id,
                'Concurrent owner claim ledger must match the only canonical host owner',
            );

            const claimSubdomainForStore = (
                storeId: string,
                tenantId: string,
                subdomain: string,
                nowMillis: number,
            ) => adminDb.runTransaction(async (transaction) => {
                const now = Timestamp.fromMillis(nowMillis);
                const reservation = await readSubdomainReservationInTransaction({
                    db: adminDb,
                    nowMillis,
                    storeId,
                    subdomain,
                    tenantId,
                    transaction,
                });
                transaction.set(adminDb.collection('stores').doc(storeId), {
                    active: true,
                    modifiedOn: now,
                    storeId: Number(storeId),
                    subdomain: reservation.subdomain,
                    tenantId: Number(tenantId),
                }, { merge: true });
                writeCurrentSubdomainClaim(transaction, reservation, now);
            });

            const redirectStartedAt = Date.now();
            const redirectExpiresAtMillis = redirectStartedAt + 60_000;
            const redirectOwnerStoreId = '401';
            const redirectOwnerTenantId = '501';
            const redirectSuccessorStoreId = '402';
            const redirectSuccessorTenantId = '502';
            const redirectedSubdomain = 'redirect-owner-name';
            const replacementSubdomain = 'redirect-owner-renamed';
            await Promise.all([
                adminDb.collection('stores').doc(redirectOwnerStoreId).set({ active: true, storeId: 401, tenantId: 501 }),
                adminDb.collection('stores').doc(redirectSuccessorStoreId).set({ active: true, storeId: 402, tenantId: 502 }),
            ]);
            await claimSubdomainForStore(
                redirectOwnerStoreId,
                redirectOwnerTenantId,
                redirectedSubdomain,
                redirectStartedAt,
            );
            await adminDb.runTransaction(async (transaction) => {
                const now = Timestamp.fromMillis(redirectStartedAt + 1);
                const expiresAt = Timestamp.fromMillis(redirectExpiresAtMillis);
                const replacementReservation = await readSubdomainReservationInTransaction({
                    db: adminDb,
                    nowMillis: now.toMillis(),
                    storeId: redirectOwnerStoreId,
                    subdomain: replacementSubdomain,
                    tenantId: redirectOwnerTenantId,
                    transaction,
                });
                transaction.update(adminDb.collection('stores').doc(redirectOwnerStoreId), {
                    modifiedOn: now,
                    previousSubdomains: [{ expiresAt, subdomain: redirectedSubdomain }],
                    previousSubdomainSlugs: [redirectedSubdomain],
                    subdomain: replacementSubdomain,
                });
                writeCurrentSubdomainClaim(transaction, replacementReservation, now);
                writeRedirectSubdomainClaim({
                    claimRef: adminDb.collection('platformSummary').doc(getSubdomainClaimDocumentId(redirectedSubdomain)),
                    expiresAt,
                    now,
                    storeId: redirectOwnerStoreId,
                    subdomain: redirectedSubdomain,
                    tenantId: redirectOwnerTenantId,
                    transaction,
                });
            });
            const redirectClaim = await adminDb.collection('platformSummary')
                .doc(getSubdomainClaimDocumentId(redirectedSubdomain))
                .get();
            assert(redirectClaim.data()?.status === 'redirect', 'Renamed public subdomain must become a redirect claim');
            assert(redirectClaim.data()?.storeId === redirectOwnerStoreId, 'Redirect claim must preserve its canonical store owner');
            assert(
                redirectClaim.data()?.expiresAt?.toMillis?.() === redirectExpiresAtMillis,
                'Redirect claim must preserve the configured expiry',
            );

            let redirectBlockedBeforeExpiry = false;
            try {
                await adminDb.runTransaction((transaction) => readSubdomainReservationInTransaction({
                    db: adminDb,
                    nowMillis: redirectStartedAt + 2,
                    storeId: redirectSuccessorStoreId,
                    subdomain: redirectedSubdomain,
                    tenantId: redirectSuccessorTenantId,
                    transaction,
                }));
            } catch (error) {
                redirectBlockedBeforeExpiry = isSubdomainUnavailableError(error);
            }
            assert(redirectBlockedBeforeExpiry, 'Redirect claim must block another store until expiry');

            await claimSubdomainForStore(
                redirectSuccessorStoreId,
                redirectSuccessorTenantId,
                redirectedSubdomain,
                redirectExpiresAtMillis + 1,
            );
            const expiredRedirectClaim = await adminDb.collection('platformSummary')
                .doc(getSubdomainClaimDocumentId(redirectedSubdomain))
                .get();
            assert(
                expiredRedirectClaim.data()?.status === 'current'
                    && expiredRedirectClaim.data()?.storeId === redirectSuccessorStoreId,
                'Expired redirect and history must permit a new owner',
            );

            const releasedOwnerStoreId = '403';
            const releasedOwnerTenantId = '503';
            const releasedSuccessorStoreId = '404';
            const releasedSuccessorTenantId = '504';
            const releasedSubdomain = 'released-owner-name';
            const releasedReplacementSubdomain = 'released-owner-renamed';
            const releasedAtMillis = redirectExpiresAtMillis + 10_000;
            await Promise.all([
                adminDb.collection('stores').doc(releasedOwnerStoreId).set({ active: true, storeId: 403, tenantId: 503 }),
                adminDb.collection('stores').doc(releasedSuccessorStoreId).set({ active: true, storeId: 404, tenantId: 504 }),
            ]);
            await claimSubdomainForStore(
                releasedOwnerStoreId,
                releasedOwnerTenantId,
                releasedSubdomain,
                releasedAtMillis - 1,
            );
            await adminDb.runTransaction(async (transaction) => {
                const now = Timestamp.fromMillis(releasedAtMillis);
                const replacementReservation = await readSubdomainReservationInTransaction({
                    db: adminDb,
                    nowMillis: releasedAtMillis,
                    storeId: releasedOwnerStoreId,
                    subdomain: releasedReplacementSubdomain,
                    tenantId: releasedOwnerTenantId,
                    transaction,
                });
                transaction.update(adminDb.collection('stores').doc(releasedOwnerStoreId), {
                    modifiedOn: now,
                    subdomain: releasedReplacementSubdomain,
                });
                writeCurrentSubdomainClaim(transaction, replacementReservation, now);
                writeReleasedSubdomainClaim({
                    claimRef: adminDb.collection('platformSummary').doc(getSubdomainClaimDocumentId(releasedSubdomain)),
                    now,
                    storeId: releasedOwnerStoreId,
                    subdomain: releasedSubdomain,
                    tenantId: releasedOwnerTenantId,
                    transaction,
                });
            });
            await claimSubdomainForStore(
                releasedSuccessorStoreId,
                releasedSuccessorTenantId,
                releasedSubdomain,
                releasedAtMillis + 1,
            );
            const releasedClaim = await adminDb.collection('platformSummary')
                .doc(getSubdomainClaimDocumentId(releasedSubdomain))
                .get();
            assert(
                releasedClaim.data()?.status === 'current'
                    && releasedClaim.data()?.storeId === releasedSuccessorStoreId,
                'Released claim must permit immediate ownership transfer',
            );

            const saturatedSubdomain = 'history-saturation-name';
            const saturationBatch = adminDb.batch();
            for (let index = 0; index < 20; index += 1) {
                saturationBatch.set(adminDb.collection('stores').doc(String(600 + index)), {
                    active: true,
                    previousSubdomains: [{
                        expiresAt: Timestamp.fromMillis(releasedAtMillis - 1),
                        subdomain: saturatedSubdomain,
                    }],
                    previousSubdomainSlugs: [saturatedSubdomain],
                    storeId: 600 + index,
                    tenantId: 700 + index,
                });
            }
            await saturationBatch.commit();
            let saturatedHistoryBlocked = false;
            try {
                await adminDb.runTransaction((transaction) => readSubdomainReservationInTransaction({
                    db: adminDb,
                    nowMillis: releasedAtMillis,
                    storeId: '405',
                    subdomain: saturatedSubdomain,
                    tenantId: '505',
                    transaction,
                }));
            } catch (error) {
                saturatedHistoryBlocked = isSubdomainUnavailableError(error);
            }
            assert(saturatedHistoryBlocked, 'Saturated previous-subdomain lookup must fail closed');

            await Promise.all([
                adminDb.collection('stores').doc('811').set({ active: true, isMaster: true, storeId: 811, tenantId: 911 }),
                adminDb.collection('stores').doc('812').set({ active: true, isMaster: false, storeId: 812, tenantId: 911 }),
                adminDb.collection('stores').doc('813').set({ active: true, storeId: 813, tenantId: 912 }),
                adminDb.collection('stores').doc('814').set({ active: true, storeId: 814, tenantId: 913 }),
                adminDb.collection('stores').doc('815').set({ active: true, storeId: 815, tenantId: 913 }),
                adminDb.collection('stores').doc('816').set({
                    active: true,
                    isMaster: true,
                    storeId: 816,
                    tenantId: 914,
                    tId: 915,
                }),
            ]);
            const readSubdomainOwnerStore = (storeId: string, tenantId: string) => adminDb.runTransaction(
                (transaction) => readSubdomainOwnerStoreInTransaction({
                    db: adminDb,
                    storeId,
                    tenantId,
                    transaction,
                }),
            );
            const explicitMaster = await readSubdomainOwnerStore('811', '911');
            assert(
                explicitMaster.storeRef.id === '811',
                'Explicit master store must retain brand subdomain authority',
            );
            let explicitOutletBlocked = false;
            try {
                await readSubdomainOwnerStore('812', '911');
            } catch (error) {
                explicitOutletBlocked = isSubdomainOwnerScopeError(error) && error.reason === 'MASTER_REQUIRED';
            }
            assert(explicitOutletBlocked, 'Explicit outlet must not claim a brand subdomain');
            const legacySingleStore = await readSubdomainOwnerStore('813', '912');
            assert(
                legacySingleStore.storeRef.id === '813',
                'Legacy single store must retain subdomain assignment compatibility',
            );
            let ambiguousLegacyStoreBlocked = false;
            try {
                await readSubdomainOwnerStore('814', '913');
            } catch (error) {
                ambiguousLegacyStoreBlocked = isSubdomainOwnerScopeError(error) && error.reason === 'MASTER_REQUIRED';
            }
            assert(
                ambiguousLegacyStoreBlocked,
                'Legacy multi-store topology without a master marker must fail closed',
            );
            let conflictingTenantAliasesBlocked = false;
            try {
                await readSubdomainOwnerStore('816', '914');
            } catch (error) {
                conflictingTenantAliasesBlocked = isSubdomainOwnerScopeError(error)
                    && error.reason === 'INVALID_SCOPE';
            }
            assert(
                conflictingTenantAliasesBlocked,
                'Conflicting persisted tenant aliases must fail closed before subdomain ownership',
            );

            await Promise.all([
                adminDb.collection('stores').doc('801').set({ active: true, storeId: 801, tenantId: 901 }),
                adminDb.collection('stores').doc('802').set({ active: true, storeId: 802, tenantId: 901 }),
                adminDb.collection('stores').doc('803').set({ active: true, storeId: 803, tenantId: 902 }),
            ]);
            const claimOutletSlug = (storeId: string, tenantId: string) => adminDb.runTransaction(async (transaction) => {
                const now = Timestamp.now();
                const reservation = await readOutletSlugReservationInTransaction({
                    db: adminDb,
                    outletSlug: 'shared-outlet',
                    storeId,
                    tenantId,
                    transaction,
                });
                transaction.set(adminDb.collection('stores').doc(storeId), {
                    modifiedOn: now,
                    outletSlug: reservation.outletSlug,
                }, { merge: true });
                writeCurrentOutletSlugClaim(transaction, reservation, now);
            });
            const sameTenantOutletClaims = await Promise.allSettled([
                claimOutletSlug('801', '901'),
                claimOutletSlug('802', '901'),
            ]);
            assert(
                sameTenantOutletClaims.filter((result) => result.status === 'fulfilled').length === 1,
                'Concurrent outlets in one tenant must have exactly one successful path-segment claim',
            );
            await claimOutletSlug('803', '902');
            const tenant901OutletStores = await adminDb.collection('stores')
                .where('tenantId', '==', 901)
                .where('outletSlug', '==', 'shared-outlet')
                .get();
            const tenant902OutletStores = await adminDb.collection('stores')
                .where('tenantId', '==', 902)
                .where('outletSlug', '==', 'shared-outlet')
                .get();
            assert(tenant901OutletStores.size === 1, 'One tenant must retain exactly one canonical outlet slug owner');
            assert(tenant902OutletStores.size === 1, 'Different tenants may safely reuse the same outlet slug');
            const tenant901OutletClaim = await adminDb.collection('platformSummary')
                .doc(getOutletSlugClaimDocumentId('901', 'shared-outlet'))
                .get();
            const tenant902OutletClaim = await adminDb.collection('platformSummary')
                .doc(getOutletSlugClaimDocumentId('902', 'shared-outlet'))
                .get();
            assert(
                tenant901OutletClaim.data()?.storeId === tenant901OutletStores.docs[0].id,
                'Tenant-scoped outlet claim must match its canonical store owner',
            );
            assert(
                tenant902OutletClaim.data()?.storeId === tenant902OutletStores.docs[0].id,
                'A second tenant outlet claim must remain partitioned from the first tenant',
            );

            const tenant901OwnerId = tenant901OutletStores.docs[0].id;
            const tenant901ReplacementId = tenant901OwnerId === '801' ? '802' : '801';
            await adminDb.runTransaction(async (transaction) => {
                const now = Timestamp.now();
                const claimRef = adminDb.collection('platformSummary')
                    .doc(getOutletSlugClaimDocumentId('901', 'shared-outlet'));
                await transaction.get(claimRef);
                transaction.update(adminDb.collection('stores').doc(tenant901OwnerId), { active: false });
                writeReleasedOutletSlugClaim(transaction, {
                    claimRef,
                    outletSlug: 'shared-outlet',
                    storeId: tenant901OwnerId,
                    tenantId: '901',
                }, now);
            });
            await claimOutletSlug(tenant901ReplacementId, '901');
            const replacementClaim = await adminDb.collection('platformSummary')
                .doc(getOutletSlugClaimDocumentId('901', 'shared-outlet'))
                .get();
            assert(
                replacementClaim.data()?.storeId === tenant901ReplacementId,
                'Deactivation release must permit a different active outlet to claim the path',
            );
        } finally {
            await deleteAdminApp(adminApp);
        }

        console.log('storesSummary Firestore identity-boundary tests passed.');
    } finally {
        await testEnvironment.cleanup();
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
