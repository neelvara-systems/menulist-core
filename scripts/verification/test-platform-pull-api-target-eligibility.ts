import assert from 'node:assert/strict';
import { buildMenuSnapshot } from '../../src/lib/posSync/payloadFormatter';
import {
    getActivePublicTempStatus,
    normalizePublicBusinessAttributes,
} from '../../src/lib/publicApi/businessProjection';
import { isMenuListPublicApiEntityEligible } from '../../src/lib/publicApi/targetEligibility';
import { buildPullApiETagPayload } from '../../src/lib/publicApi/responseIdentity';
import {
    isMenuListPublicApiCredentialInScope,
    isMenuListPublicApiProductEntity,
    isMenuListPublicApiStoreIdentityConsistent,
    isMenuListPublicApiTenantIdentityConsistent,
    resolveMenuListPublicApiTenantDocumentId,
} from '../../src/lib/publicApi/menuListScope';
import { inheritLinkedPublicPullMetadata } from '../../src/lib/publicApi/menuProjection';
import {
    clearMasterCache,
    populateMasterCache,
    resolveProjectForRender,
} from '../../src/lib/multiOutlet/resolveProject';
import type { Project } from '../../src/components/templates/main-app/projects/types';

assert.equal(isMenuListPublicApiEntityEligible({}), true, 'legacy active entities remain eligible');
assert.equal(isMenuListPublicApiEntityEligible({ active: true, deleted: false }), true);
assert.equal(isMenuListPublicApiEntityEligible(null), false);
assert.equal(isMenuListPublicApiEntityEligible([]), false);
assert.equal(isMenuListPublicApiEntityEligible({ active: false }), false);
assert.equal(isMenuListPublicApiEntityEligible({ deleted: true }), false);
assert.equal(isMenuListPublicApiEntityEligible({ blocked: true }), false);
assert.equal(isMenuListPublicApiEntityEligible({ tenantBlocked: true }), false);
assert.equal(isMenuListPublicApiEntityEligible({ blockDetails: { blocked: true } }), false);

assert.equal(isMenuListPublicApiProductEntity({}), true, 'legacy MenuList records without pId remain compatible');
assert.equal(isMenuListPublicApiProductEntity({ pId: 'ML', productId: 'ML' }), true);
assert.equal(isMenuListPublicApiProductEntity({ pId: 'AL' }), false);
assert.equal(isMenuListPublicApiProductEntity({ pId: 'ML', productId: 'AL' }), false);
assert.equal(isMenuListPublicApiCredentialInScope({}), true, 'legacy credentials without metadata remain compatible');
assert.equal(isMenuListPublicApiCredentialInScope({ productId: 'ML', purpose: 'menulist_public_api' }), true);
assert.equal(isMenuListPublicApiCredentialInScope({ productId: 'AL', purpose: 'answerlattice_public_api' }), false);
assert.equal(isMenuListPublicApiCredentialInScope({ productId: 'ML', purpose: 'answerlattice_public_api' }), false);
assert.equal(resolveMenuListPublicApiTenantDocumentId({ tenantId: 1, tId: '1' }), '1');
assert.equal(resolveMenuListPublicApiTenantDocumentId({ tenantId: 1, tId: 2 }), null);
assert.equal(resolveMenuListPublicApiTenantDocumentId({ tenantId: '01' }), null);
assert.equal(resolveMenuListPublicApiTenantDocumentId({ tenantId: ' 1' }), null);
assert.equal(isMenuListPublicApiStoreIdentityConsistent({}, '2'), true, 'legacy missing store aliases remain compatible');
assert.equal(isMenuListPublicApiStoreIdentityConsistent({ storeId: 2, sId: '2' }, '2'), true);
assert.equal(isMenuListPublicApiStoreIdentityConsistent({ storeId: 2, sId: 3 }, '2'), false);
assert.equal(isMenuListPublicApiTenantIdentityConsistent({}, '1'), true, 'legacy missing tenant aliases remain compatible');
assert.equal(isMenuListPublicApiTenantIdentityConsistent({ tenantId: 1, tId: '1' }, '1'), true);
assert.equal(isMenuListPublicApiTenantIdentityConsistent({ tenantId: 2 }, '1'), false);

assert.deepEqual(
    normalizePublicBusinessAttributes({
        acceptsCards: false,
        internalOwnerNote: 'must not leave the store document',
        vegetarian: true,
        wifi: 'yes',
    }),
    { acceptsCards: false, vegetarian: true },
    'business attribute output must include only known boolean public fields',
);
assert.equal(normalizePublicBusinessAttributes(['vegetarian']), null);
assert.deepEqual(
    getActivePublicTempStatus({
        createdBy: 'private-user-id',
        expiresAt: '2026-07-13T12:00:00.000Z',
        message: '  Open from noon  ',
        type: 'opening_late',
    }, Date.parse('2026-07-13T11:00:00.000Z')),
    {
        expiresAt: '2026-07-13T12:00:00.000Z',
        message: 'Open from noon',
        type: 'opening_late',
    },
    'temporary status output must omit private creator metadata and normalize public fields',
);
assert.equal(
    getActivePublicTempStatus({
        expiresAt: '2026-07-13T10:00:00.000Z',
        message: 'Expired',
        type: 'custom',
    }, Date.parse('2026-07-13T11:00:00.000Z')),
    null,
);
assert.equal(getActivePublicTempStatus({ expiresAt: 'later', type: 'private_state' }), null);

const firstResponse = buildPullApiETagPayload({
    generatedAt: '2026-07-13T10:00:00.000Z',
    menu: { items: [{ id: 'item-1' }] },
    schemaVersion: '1.0',
    timestamp: '2026-07-13T10:00:00.000Z',
});
const repeatedResponse = buildPullApiETagPayload({
    generatedAt: '2026-07-13T10:01:00.000Z',
    menu: { items: [{ id: 'item-1' }] },
    schemaVersion: '1.0',
    timestamp: '2026-07-13T10:01:00.000Z',
});
assert.deepEqual(
    repeatedResponse,
    firstResponse,
    'request-time generatedAt/timestamp values must not change pull-response identity',
);
assert.notDeepEqual(
    buildPullApiETagPayload({
        generatedAt: '2026-07-13T10:01:00.000Z',
        menu: { items: [{ id: 'item-2' }] },
        schemaVersion: '1.0',
        timestamp: '2026-07-13T10:01:00.000Z',
    }),
    firstResponse,
    'changed public truth must change the pull-response identity payload',
);

async function verifyLinkedOutletPullProjection(): Promise<void> {
    const masterProjectId = '1-master-menu-10';
    const masterProject: Project = {
        projectId: masterProjectId,
        languages: ['en'],
        menuVersion: 7,
        files: [{
            uid: 'master-file',
            extractedData: {
                data: {
                    categories: [{ id: 'category-1', active: true, name: { en: 'Food' } }],
                    items: [{
                        id: 'item-1',
                        active: true,
                        available: true,
                        category: 'category-1',
                        name: { en: 'Inherited item' },
                        price: '100',
                    }],
                    languages: [{ code: 'en', name: 'English', isPrimary: true }],
                },
            },
        }],
    };
    const outletProject: Project = {
        projectId: '1-outlet-menu-20',
        masterProjectId,
        files: [],
        overrides: {
            attributes: {},
            categories: {},
            items: {
                'item-1': { price: '125' },
            },
        },
    };

    clearMasterCache();
    try {
        populateMasterCache(masterProjectId, masterProject);
        const resolvedProject = inheritLinkedPublicPullMetadata(
            await resolveProjectForRender({ storeProject: outletProject }),
            masterProject,
        );
        assert.equal(resolvedProject._resolved?.isMasterLinked, true);

        const payload = buildMenuSnapshot(
            resolvedProject,
            20,
            1,
            resolvedProject.menuVersion ?? 1,
            'INR',
        );
        assert.equal(payload.projectId, outletProject.projectId);
        assert.equal(payload.version, 7, 'linked outlet pulls without a local publish version inherit master menu version');
        assert.deepEqual(
            payload.languages,
            [{ code: 'en', name: 'en', isPrimary: true }],
            'linked outlet pulls without local languages inherit master languages',
        );
        assert.deepEqual(
            payload.menu.categories.map((category) => category.id),
            ['category-1'],
            'linked outlet pull output must inherit master categories',
        );
        assert.deepEqual(
            payload.menu.items.map((item) => ({ id: item.id, price: item.price })),
            [{ id: 'item-1', price: '125' }],
            'linked outlet pull output must merge master items with outlet overrides',
        );
    } finally {
        clearMasterCache();
    }
}

verifyLinkedOutletPullProjection()
    .then(() => {
        process.stdout.write('Platform Pull API target eligibility, response identity, and linked outlet projection tests passed.\n');
    })
    .catch((error: unknown) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exitCode = 1;
    });
