import assert from 'node:assert/strict';
import { buildMenuSnapshot } from '../../src/lib/posSync/payloadFormatter';
import {
    getActivePublicTempStatus,
    normalizePublicBusinessAttributes,
    normalizePublicBusinessGeo,
    normalizePublicBusinessLastModified,
    normalizePublicBusinessStringRecord,
    normalizePublicBusinessText,
    normalizePublicBusinessWorkingHours,
} from '../../src/lib/publicApi/businessProjection';
import { isMenuListPublicApiEntityEligible } from '../../src/lib/publicApi/targetEligibility';
import { buildPullApiETagPayload } from '../../src/lib/publicApi/responseIdentity';
import { buildCanonicalItemUrl } from '../../src/lib/menu/itemTruthUrls';
import {
    MAX_CUSTOM_BUSINESS_ATTRIBUTES,
    normalizeBusinessAttributes,
    normalizeCustomBusinessAttributes,
} from '../../src/lib/obp/businessAttributes';
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
assert.equal(normalizePublicBusinessText({ privateValue: 'must not escape' }), null);
assert.equal(normalizePublicBusinessText('  Public value  ', 80), 'Public value');
assert.deepEqual(
    normalizePublicBusinessWorkingHours({ mon: ' 09:00 - 17:00 ', sun: 'closed' }),
    { mon: '09:00-17:00', sun: '' },
);
assert.equal(normalizePublicBusinessWorkingHours({ someday: '09:00-17:00' }), null);
assert.equal(normalizePublicBusinessWorkingHours({ mon: { privateValue: 'must not escape' } }), null);
assert.deepEqual(
    normalizePublicBusinessStringRecord({ custom_platform: ' https://example.com/profile ' }),
    { custom_platform: 'https://example.com/profile' },
);
assert.equal(normalizePublicBusinessStringRecord({ privateConfig: { accessToken: 'secret' } }), null);
assert.deepEqual(normalizePublicBusinessGeo({ latitude: 12.5, longitude: 77.6 }), {
    latitude: 12.5,
    longitude: 77.6,
});
assert.equal(normalizePublicBusinessGeo({ latitude: 12.5, longitude: 77.6, privatePrecision: 10 }), null);
assert.equal(normalizePublicBusinessGeo({ latitude: 91, longitude: 77.6 }), null);
assert.equal(normalizePublicBusinessLastModified('2026-07-31T12:00:00.000Z'), '2026-07-31T12:00:00.000Z');
assert.equal(normalizePublicBusinessLastModified('not-a-date'), null);
assert.equal(normalizePublicBusinessLastModified({ toDate: () => new Date('2026-07-31T12:00:00.000Z') }), '2026-07-31T12:00:00.000Z');
assert.equal(normalizePublicBusinessLastModified({ get toDate() { throw new Error('hostile'); } }), null);
assert.deepEqual(
    normalizeBusinessAttributes({ acceptsCards: false, internal: true, vegetarian: true, wifi: 'false' }),
    { acceptsCards: false, vegetarian: true },
    'owner and public controlled attributes must share known-boolean runtime admission',
);
const normalizedCustomAttributes = normalizeCustomBusinessAttributes([
    { active: false, id: 'disabled', label: 'Disabled owner attribute' },
    { active: 'yes', id: 'malformed-active', label: 'Malformed active state' },
    { id: 'duplicate', label: 'First duplicate' },
    { id: 'duplicate', label: 'Second duplicate' },
    ...Array.from({ length: 10 }, (_, index) => ({ id: `bounded-${index}`, label: `Bounded ${index}` })),
]);
assert.equal(normalizedCustomAttributes.length, MAX_CUSTOM_BUSINESS_ATTRIBUTES, 'custom attributes must remain owner-editor bounded');
assert.equal(normalizedCustomAttributes[0]?.active, false, 'disabled custom attributes must retain explicit owner state');
assert.equal(normalizedCustomAttributes[1]?.active, false, 'malformed active state must fail closed');
assert.equal(normalizedCustomAttributes.filter((attribute) => attribute.id === 'duplicate').length, 1, 'duplicate custom attribute IDs must not enter public projection');
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

const canonicalItemUrl = new URL(buildCanonicalItemUrl(
    'https://example.menulist.online/menu',
    'item / 1',
    'hi',
));
assert.equal(canonicalItemUrl.origin + canonicalItemUrl.pathname, 'https://example.menulist.online/menu');
assert.equal(canonicalItemUrl.searchParams.get('item'), 'item / 1', 'item identity must survive URL encoding');
assert.equal(canonicalItemUrl.searchParams.get('lang'), 'hi', 'localized item URLs must retain language identity');

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
                        attributes: [{
                            id: 'size-large',
                            active: true,
                            name: { en: 'Large' },
                            price: '150',
                        }],
                        allergens: ['milk'],
                        dietaryTags: ['vegetarian'],
                        decisionFacts: {
                            allergens: {
                                value: ['milk'],
                                source: 'owner',
                                confirmed: true,
                                updatedAt: '2026-07-22T00:00:00.000Z',
                            },
                        },
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
    const masterFiles = masterProject.files ?? [];
    assert.equal(masterFiles.length, 1, 'linked public pull fixture must contain exactly one master file');
    const masterFile = masterFiles[0];
    assert.ok(masterFile, 'linked public pull fixture master file must be present');

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
        assert.deepEqual(
            payload.menu.items[0]?.attributes,
            [{ id: 'size-large', active: true, name: { en: 'Large' }, price: '150' }],
            'variant identity and price must remain stable in the public menu projection',
        );
        assert.deepEqual(payload.menu.items[0]?.allergens, ['milk']);
        assert.deepEqual(payload.menu.items[0]?.dietaryTags, ['vegetarian']);
        assert.deepEqual(
            payload.menu.items[0]?.decisionFacts,
            { allergens: { value: ['milk'] } },
            'public pull output may expose the approved value but must not leak internal provenance metadata',
        );
        assert.equal(
            populateMasterCache(masterProjectId, {
                ...masterProject,
                projectId: '2-wrong-master-30',
            }),
            false,
            'master cache population must reject a project whose identity differs from the cache key',
        );

        clearMasterCache();
        assert.equal(populateMasterCache(masterProjectId, {
            ...masterProject,
            masterProjectId: '1-upstream-master-5',
        }), true);
        assert.equal(
            (await resolveProjectForRender({ storeProject: outletProject }))._resolved?.isMasterLinked,
            false,
            'a linked project cannot itself become inheritance authority for another outlet',
        );

        clearMasterCache();
        assert.equal(populateMasterCache(masterProjectId, {
            ...masterProject,
            files: [...masterFiles, { ...masterFile, uid: 'second-master-file' }],
        }), true);
        assert.equal(
            (await resolveProjectForRender({ storeProject: outletProject }))._resolved?.isMasterLinked,
            false,
            'multi-file master inheritance must fail closed instead of flattening ambiguous files',
        );

        clearMasterCache();
        assert.equal(populateMasterCache(masterProjectId, masterProject), true);
        const multiFileOutlet = {
            ...outletProject,
            files: [
                {
                    uid: 'local-file-1',
                    extractedData: { data: { categories: [], items: [], languages: [] } },
                },
                {
                    uid: 'local-file-2',
                    extractedData: {
                        data: {
                            categories: [{ id: 'L_C_local', name: { en: 'Local' } }],
                            items: [{ id: 'L_I_local', category: 'L_C_local', name: { en: 'Local item' } }],
                            languages: [],
                        },
                    },
                },
            ],
        } as unknown as Project;
        assert.equal(
            (await resolveProjectForRender({ storeProject: multiFileOutlet }))._resolved?.isMasterLinked,
            false,
            'multi-file outlet inheritance must fail closed instead of duplicating later-file local entities',
        );

        clearMasterCache();
        assert.equal(populateMasterCache(masterProjectId, masterProject), true);
        const invalidLocalIdentityOutlet = {
            ...outletProject,
            files: [{
                uid: 'local-file',
                extractedData: {
                    data: {
                        categories: [{ id: 'ghost-category', name: { en: 'Ghost' } }],
                        items: [{ id: 'ghost-item', category: 'ghost-category', name: { en: 'Ghost item' } }],
                        languages: [],
                    },
                },
            }],
        } as unknown as Project;
        assert.equal(
            (await resolveProjectForRender({ storeProject: invalidLocalIdentityOutlet }))._resolved?.isMasterLinked,
            false,
            'unprefixed store-only entities must not become linked public menu truth',
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
