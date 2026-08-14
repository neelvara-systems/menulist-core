import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    deleteDoc,
    doc,
    getDoc,
    runTransaction,
    setDoc,
    updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-tenant-store-scoped-rules';
const ROOT = path.resolve(__dirname, '..', '..');

const STORE_ONE_PATHS = [
    ['tenants', '1', 'stores', '101', 'changelogPages', 'page-1'],
    ['tenants', '1', 'stores', '101', 'privateData', 'private-1'],
    ['todos', '1', '101', 'todo-1'],
    ['todosMetadata', 'data', '1', '101'],
    ['notes', '1', '101', 'note-1'],
    ['notesMetadata', 'data', '1', '101'],
    ['campaigns', '1', '101', 'campaign-1'],
    ['campaignExports', '1', '101', 'export-1'],
] as const;

const SERVER_ONLY_STORE_ONE_PATHS = [
    ['growthosKits', '1', '101', 'kit-1'],
    ['growthosExports', '1', '101', 'export-1'],
] as const;

const STORE_TWO_PATHS = STORE_ONE_PATHS.map((segments) => (
    segments.map((segment) => segment === '101' ? '102' : segment)
));

const SERVER_ONLY_STORE_TWO_PATHS = SERVER_ONLY_STORE_ONE_PATHS.map((segments) => (
    segments.map((segment) => segment === '101' ? '102' : segment)
));

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const environment = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'),
        },
    });

    try {
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, 'tenants/1'), {
                active: true,
                blocked: false,
                blockDetails: { blocked: false },
                deleted: false,
                name: 'Tenant One',
                outletCreationLock: false,
                storesList: [{ active: true, isMaster: true, name: 'Store One', storeId: 101 }],
                tenantId: 1,
            });
            await setDoc(doc(db, 'stores/101'), {
                name: 'Store One',
                specialHours: {},
                storeId: 101,
                tenantId: 1,
            });
            await setDoc(doc(db, 'stores/102'), {
                name: 'Store Two',
                specialHours: {},
                storeId: 102,
                tenantId: 1,
            });
            await setDoc(doc(db, 'stores/201'), {
                name: 'Foreign Store',
                specialHours: {},
                storeId: 201,
                tenantId: 2,
            });
            for (const segments of [
                ...STORE_ONE_PATHS,
                ...STORE_TWO_PATHS,
                ...SERVER_ONLY_STORE_ONE_PATHS,
                ...SERVER_ONLY_STORE_TWO_PATHS,
            ]) {
                const resourcePath = segments.join('/');
                await setDoc(doc(db, segments.join('/')), {
                    marker: resourcePath,
                    sId: resourcePath.split('/').includes('102') ? 102 : 101,
                    tId: 1,
                });
            }
            await setDoc(doc(db, 'projects/1/101/1-outlet-101'), {
                files: [{}],
                projectId: '1-outlet-101',
                sId: 101,
                tId: 1,
            });
            await setDoc(doc(db, 'projects/1/101/1-invalid-link-101'), {
                files: [{}],
                projectId: '1-invalid-link-101',
                sId: 101,
                tId: 1,
            });
            await setDoc(doc(db, 'projects/1/101/1-multi-file-outlet-101'), {
                files: [{}, {}],
                projectId: '1-multi-file-outlet-101',
                sId: 101,
                tId: 1,
            });
            await setDoc(doc(db, 'projects/1/101/1-linked-101'), {
                files: [{}],
                masterProjectId: '1-master-102',
                projectId: '1-linked-101',
                sId: 101,
                tId: 1,
            });
            await setDoc(doc(db, 'projects/1/101/1-misbound-101'), {
                files: [{}],
                projectId: '1-misbound-101',
                sId: 102,
                tId: 1,
            });
            await setDoc(doc(db, 'projects/1/102/1-master-102'), {
                files: [{}],
                projectId: '1-master-102',
                sId: 102,
                tId: 1,
            });
            await setDoc(doc(db, 'projects/1/102/1-multi-master-102'), {
                files: [{}, {}],
                projectId: '1-multi-master-102',
                sId: 102,
                tId: 1,
            });
            await setDoc(doc(db, 'projects/1/102/1-empty-master-102'), {
                files: [],
                projectId: '1-empty-master-102',
                sId: 102,
                tId: 1,
            });
            await setDoc(doc(db, 'projects/1/102/1-deleted-master-102'), {
                deleted: true,
                files: [{}],
                projectId: '1-deleted-master-102',
                sId: 102,
                tId: 1,
            });
            await setDoc(doc(db, 'projects/1/102/1-inactive-master-102'), {
                active: false,
                files: [{}],
                projectId: '1-inactive-master-102',
                sId: 102,
                tId: 1,
            });
            await setDoc(doc(db, 'projects/2/201/2-master-201'), {
                files: [{}],
                projectId: '2-master-201',
                sId: 201,
                tId: 2,
            });
            await setDoc(doc(db, 'projects/1-legacy-101'), {
                files: [{}],
                projectId: '1-legacy-101',
                sId: 101,
                tId: 1,
            });
            await setDoc(doc(db, 'projects/1-legacy-102'), {
                files: [{}],
                projectId: '1-legacy-102',
                sId: 102,
                tId: 1,
            });
            await setDoc(doc(db, 'projectsData/1/101/1-legacy-alias-101'), {
                projectId: '1-legacy-alias-101',
                sId: 101,
                tId: 1,
            });
            await setDoc(doc(db, 'projectsData/1/102/1-legacy-alias-102'), {
                projectId: '1-legacy-alias-102',
                sId: 102,
                tId: 1,
            });
            await setDoc(doc(db, 'projectsMetadata/1/101/1-legacy-metadata-101'), {
                pricingIntegrity: { pdf: { status: 'FRESH', version: 1 } },
                projectId: '1-legacy-metadata-101',
                sId: 101,
                tId: 1,
            });
            await setDoc(doc(db, 'projectsMetadata/1/102/1-legacy-metadata-102'), {
                pricingIntegrity: { pdf: { status: 'FRESH', version: 1 } },
                projectId: '1-legacy-metadata-102',
                sId: 102,
                tId: 1,
            });
            await setDoc(doc(db, 'subdomainRenameLog/server-audit'), {
                ackRef: 'support-ticket-1',
                newSubdomain: 'new-host',
                operatorUserId: 'platform-operator',
                previousSubdomain: 'old-host',
                reason: 'Verified legal rename request',
                storeId: '101',
                tenantId: 1,
            });
            await setDoc(doc(db, 'reviews/1/101/review-1'), {
                id: 'review-1',
                reviewerDisplayName: 'Historical reviewer',
                sId: 101,
                tId: 1,
            });
        });

        const storeOneDb = environment.authenticatedContext('store-one-owner', {
            role: 'OWNER',
            storeId: '101',
            storeIds: ['101'],
            tenantId: '1',
            uId: 'store-one-owner',
        }).firestore();
        const multiStoreDb = environment.authenticatedContext('multi-store-owner', {
            role: 'OWNER',
            storeId: '101',
            storeIds: ['101', '102'],
            tenantId: '1',
            uId: 'multi-store-owner',
        }).firestore();
        const foreignTenantDb = environment.authenticatedContext('foreign-owner', {
            role: 'OWNER',
            storeId: '201',
            storeIds: ['201'],
            tenantId: '2',
            uId: 'foreign-owner',
        }).firestore();
        const platformDb = environment.authenticatedContext('platform-operator', {
            platformRole: 'PLATFORM',
            role: 'PLATFORM',
            uId: 'platform-operator',
        }).firestore();

        await assertSucceeds(getDoc(doc(storeOneDb, 'stores/101')));
        await assertFails(getDoc(doc(storeOneDb, 'stores/102')));
        await assertSucceeds(getDoc(doc(multiStoreDb, 'stores/102')));
        await assertFails(getDoc(doc(foreignTenantDb, 'stores/101')));
        await assertSucceeds(getDoc(doc(platformDb, 'stores/101')));
        await assertSucceeds(updateDoc(doc(storeOneDb, 'stores/101'), {
            hoursLastUpdatedAt: '2026-12-20T00:00:00.000Z',
            specialHours: {
                '2026-12-25': { hours: '', label: 'Holiday closure' },
            },
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'stores/102'), {
            specialHours: {
                '2026-12-25': { hours: '', label: 'Cross-store write' },
            },
        }));
        await assertFails(updateDoc(doc(foreignTenantDb, 'stores/101'), {
            specialHours: {
                '2026-12-25': { hours: '', label: 'Cross-tenant write' },
            },
        }));

        await assertSucceeds(getDoc(doc(storeOneDb, 'projects/1/101/1-outlet-101')));
        await assertSucceeds(getDoc(doc(storeOneDb, 'projects/1/101/1-default-101')));
        await assertFails(getDoc(doc(storeOneDb, 'projects/1/102/1-default-102')));
        await assertFails(getDoc(doc(storeOneDb, 'projects/2/201/2-default-201')));
        await assertFails(getDoc(doc(storeOneDb, 'projects/1/102/1-master-102')));
        await assertSucceeds(getDoc(doc(multiStoreDb, 'projects/1/102/1-master-102')));
        await assertFails(getDoc(doc(foreignTenantDb, 'projects/1/101/1-outlet-101')));
        await assertSucceeds(getDoc(doc(platformDb, 'projects/1/102/1-master-102')));
        await assertFails(getDoc(doc(storeOneDb, 'projects/1/101/1-misbound-101')));
        await assertSucceeds(getDoc(doc(storeOneDb, 'projects/1-legacy-101')));
        await assertFails(getDoc(doc(storeOneDb, 'projects/1-legacy-102')));
        await assertSucceeds(getDoc(doc(multiStoreDb, 'projects/1-legacy-102')));
        await assertFails(getDoc(doc(foreignTenantDb, 'projects/1-legacy-101')));
        await assertSucceeds(getDoc(doc(platformDb, 'projects/1-legacy-102')));

        for (let index = 0; index < STORE_ONE_PATHS.length; index += 1) {
            const storeOnePath = STORE_ONE_PATHS[index];
            const storeTwoPath = STORE_TWO_PATHS[index];

            await assertSucceeds(getDoc(doc(storeOneDb, storeOnePath.join('/'))));
            await assertFails(getDoc(doc(storeOneDb, storeTwoPath.join('/'))));
            await assertSucceeds(getDoc(doc(multiStoreDb, storeTwoPath.join('/'))));
            await assertFails(getDoc(doc(foreignTenantDb, storeOnePath.join('/'))));
        }
        for (const collectionName of ['projectsData', 'projectsMetadata']) {
            const documentPrefix = collectionName === 'projectsData'
                ? '1-legacy-alias'
                : '1-legacy-metadata';
            await assertSucceeds(getDoc(doc(
                storeOneDb,
                `${collectionName}/1/101/${documentPrefix}-101`,
            )));
            await assertFails(getDoc(doc(
                storeOneDb,
                `${collectionName}/1/102/${documentPrefix}-102`,
            )));
            await assertSucceeds(getDoc(doc(
                multiStoreDb,
                `${collectionName}/1/102/${documentPrefix}-102`,
            )));
            await assertFails(getDoc(doc(
                foreignTenantDb,
                `${collectionName}/1/101/${documentPrefix}-101`,
            )));
        }
        for (const clientDb of [storeOneDb, multiStoreDb, foreignTenantDb, platformDb]) {
            for (const segments of [
                ...SERVER_ONLY_STORE_ONE_PATHS,
                ...SERVER_ONLY_STORE_TWO_PATHS,
            ]) {
                const documentRef = doc(clientDb, segments.join('/'));
                await assertFails(getDoc(documentRef));
                await assertFails(updateDoc(documentRef, { status: 'forged' }));
                await assertFails(deleteDoc(documentRef));
            }
        }

        await assertFails(setDoc(doc(storeOneDb, 'applicationLogs', 'client-log'), {
            message: 'client-controlled Firestore log',
        }));
        await assertFails(setDoc(doc(storeOneDb, 'errorLogs', 'client-error'), {
            message: 'client-controlled Firestore error',
        }));
        await assertFails(setDoc(doc(storeOneDb, 'aiHelpCenterFeedback', 'unused-client-feedback'), {
            sId: 101,
            tId: 1,
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'notes/1/101/note-1'), {
            title: 'Reactivated orphan note',
        }));
        await assertFails(setDoc(doc(storeOneDb, 'notes/1/101/new-note'), {
            title: 'New orphan note',
        }));
        await assertFails(deleteDoc(doc(storeOneDb, 'notes/1/101/note-1')));
        await assertFails(updateDoc(doc(storeOneDb, 'notesMetadata/data/1/101'), {
            categories: [],
        }));
        await assertFails(setDoc(doc(storeOneDb, 'notesMetadata/data/1/103'), {
            categories: [],
        }));
        await assertFails(deleteDoc(doc(storeOneDb, 'notesMetadata/data/1/101')));
        for (const clientDb of [storeOneDb, platformDb]) {
            await assertFails(getDoc(doc(clientDb, 'subdomainRenameLog', 'server-audit')));
            await assertFails(setDoc(doc(clientDb, 'subdomainRenameLog', 'forged-audit'), {
                ackRef: 'forged',
                operatorUserId: 'forged',
                reason: 'Client-forged rename evidence',
                storeId: '101',
                tenantId: 1,
            }));
            await assertFails(deleteDoc(doc(clientDb, 'subdomainRenameLog', 'server-audit')));
        }
        for (const clientDb of [storeOneDb, multiStoreDb, foreignTenantDb, platformDb]) {
            await assertFails(getDoc(doc(clientDb, 'reviews/1/101/review-1')));
            await assertFails(setDoc(doc(clientDb, 'reviews/1/101/forged-review'), {
                id: 'forged-review',
                sId: 101,
                tId: 1,
            }));
            await assertFails(deleteDoc(doc(clientDb, 'reviews/1/101/review-1')));
        }

        await assertSucceeds(updateDoc(doc(storeOneDb, 'tenants/1'), {
            name: 'Owner-visible tenant name',
        }));
        await assertSucceeds(updateDoc(doc(storeOneDb, 'tenants/1'), {
            storesList: [{ active: true, isMaster: true, name: 'Updated store name', storeId: 101 }],
        }));
        for (const serverManagedPatch of [
            { active: false },
            { authDisabled: true },
            { blocked: true },
            { blockDetails: { blocked: true, reason: 'forged' } },
            { deleted: true },
            { deletedAt: 'forged' },
            { outletCreationLock: true },
            { outletCreationLockAt: 'forged' },
            { pId: 'AL' },
            { tenantBlocked: true },
        ]) {
            await assertFails(updateDoc(doc(storeOneDb, 'tenants/1'), serverManagedPatch));
        }

        await assertSucceeds(setDoc(doc(storeOneDb, 'projects/1/101/1-created-101'), {
            files: [{}],
            projectId: '1-created-101',
            sId: 101,
            tId: 1,
        }));
        await assertSucceeds(runTransaction(storeOneDb, async (transaction) => {
            const projectRef = doc(storeOneDb, 'projects/1/101/1-default-101');
            const snapshot = await transaction.get(projectRef);

            if (!snapshot.exists()) {
                transaction.set(projectRef, {
                    files: [],
                    projectId: '1-default-101',
                    sId: 101,
                    tId: 1,
                });
            }
        }));
        await assertSucceeds(getDoc(doc(storeOneDb, 'projects/1/101/1-default-101')));
        await assertFails(setDoc(doc(storeOneDb, 'projects/1/101/1-forged-identity-101'), {
            files: [{}],
            projectId: '1-forged-identity-101',
            sId: 102,
            tId: 1,
        }));
        await assertFails(setDoc(doc(storeOneDb, 'projects/1/101/1-created-linked-101'), {
            files: [{}],
            masterProjectId: '1-master-102',
            projectId: '1-created-linked-101',
            sId: 101,
            tId: 1,
        }));
        await assertSucceeds(setDoc(doc(multiStoreDb, 'projects/1/101/1-created-linked-101'), {
            files: [{}],
            masterProjectId: '1-master-102',
            projectId: '1-created-linked-101',
            sId: 101,
            tId: 1,
        }));
        await assertFails(setDoc(doc(storeOneDb, 'projects/1/101/1-created-broken-link-101'), {
            files: [{}],
            masterProjectId: '1-missing-102',
            projectId: '1-created-broken-link-101',
            sId: 101,
            tId: 1,
        }));
        await assertSucceeds(updateDoc(doc(storeOneDb, 'projects/1/101/1-outlet-101'), {
            name: 'Outlet menu',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-outlet-101'), {
            active: false,
            deleted: true,
        }));
        await assertFails(deleteDoc(doc(storeOneDb, 'projects/1/101/1-outlet-101')));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-outlet-101'), {
            sId: 102,
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projectsData/1/101/1-legacy-alias-101'), {
            tenantId: 2,
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projectsData/1/101/1-legacy-alias-101'), {
            name: 'Parallel legacy truth',
        }));
        await assertFails(setDoc(doc(storeOneDb, 'projectsData/1/101/1-new-legacy-alias-101'), {
            projectId: '1-new-legacy-alias-101',
            sId: 101,
            tId: 1,
        }));
        await assertFails(deleteDoc(doc(storeOneDb, 'projectsData/1/101/1-legacy-alias-101')));
        await assertFails(updateDoc(doc(storeOneDb, 'projectsMetadata/1/101/1-legacy-metadata-101'), {
            'pricingIntegrity.pdf.status': 'STALE',
        }));
        await assertFails(setDoc(doc(storeOneDb, 'projectsMetadata/1/101/1-new-legacy-metadata-101'), {
            projectId: '1-new-legacy-metadata-101',
            sId: 101,
            tId: 1,
        }));
        await assertFails(deleteDoc(doc(storeOneDb, 'projectsMetadata/1/101/1-legacy-metadata-101')));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-outlet-101'), {
            masterProjectId: '1-master-102',
            overrides: {},
        }));
        await assertSucceeds(updateDoc(doc(multiStoreDb, 'projects/1/101/1-outlet-101'), {
            masterProjectId: '1-master-102',
            overrides: {},
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-invalid-link-101'), {
            masterProjectId: '1-missing-102',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-invalid-link-101'), {
            masterProjectId: '2-master-201',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-invalid-link-101'), {
            masterProjectId: '1-multi-master-102',
        }));
        await assertFails(updateDoc(doc(multiStoreDb, 'projects/1/101/1-invalid-link-101'), {
            masterProjectId: '1-empty-master-102',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-invalid-link-101'), {
            masterProjectId: '1-deleted-master-102',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-invalid-link-101'), {
            masterProjectId: '1-inactive-master-102',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-multi-file-outlet-101'), {
            masterProjectId: '1-master-102',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-linked-101'), {
            overrides: { itemPrice: 25 },
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-linked-101'), {
            name: 'Bypass protected outlet save',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-linked-101'), {
            masterProjectId: '1-other-master-102',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'projects/1/101/1-linked-101'), {
            files: [],
        }));
    } finally {
        await environment.cleanup();
    }

    process.stdout.write('Tenant/store-scoped Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
