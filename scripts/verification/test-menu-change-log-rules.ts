#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-menu-change-log-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const NOW = Timestamp.fromMillis(1_700_000_000_000);

const canonicalEvent = (tId: number, sId: number) => ({
    projectId: `project-${sId}`,
    itemId: 'item-1',
    changeType: 'PRICE',
    oldValue: '10.00',
    newValue: '12.00',
    changedBy: 'OWNER',
    timestamp: NOW,
    tId,
    sId,
});

const legacyEvent = (entryId: string, tId: number, sId: number) => ({
    id: entryId,
    type: 'PRICE_CHANGED',
    projectId: `project-${sId}`,
    actorUserId: 'owner-101',
    entityType: 'ITEM',
    entityId: 'item-1',
    before: { price: '10.00' },
    after: { price: '12.00' },
    version: 1,
    createdOn: NOW,
    tId,
    sId,
});

const canonicalSnapshot = (tId: number, sId: number) => ({
    projectId: `project-${sId}`,
    tId,
    sId,
    itemCount: 1,
    categoryCount: 1,
    languages: ['en'],
    menuData: {
        items: [{
            id: 'item-1',
            name: { en: 'Tea' },
            price: '10.00',
            category: 'category-1',
            active: true,
            available: true,
            tags: [],
        }],
        categories: [{ id: 'category-1', name: { en: 'Drinks' }, active: true }],
    },
    createdAt: NOW,
    expiresAt: Timestamp.fromMillis(NOW.toMillis() + (90 * 24 * 60 * 60 * 1000)),
    retentionDays: 90,
    snapshotMode: 'full_menu_short_term',
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'),
        },
    });

    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await Promise.all([
                setDoc(doc(db, 'projects', '1', '101', 'project-101'), { projectId: 'project-101' }),
                setDoc(doc(db, 'projects', '1', '102', 'project-102'), { projectId: 'project-102' }),
                setDoc(doc(db, 'projects', '2', '201', 'project-201'), { projectId: 'project-201' }),
                setDoc(doc(db, 'menuChangeLog', '1', '101', 'seed-101'), canonicalEvent(1, 101)),
                setDoc(doc(db, 'menuChangeLog', '1', '102', 'seed-102'), canonicalEvent(1, 102)),
                setDoc(doc(db, 'menuChangeLog', '2', '201', 'seed-201'), canonicalEvent(2, 201)),
                setDoc(doc(db, 'menuSnapshots', '1', '101', 'snapshot-seed-101'), canonicalSnapshot(1, 101)),
                setDoc(doc(db, 'menuSnapshots', '1', '102', 'snapshot-seed-102'), canonicalSnapshot(1, 102)),
                setDoc(doc(db, 'menuSnapshots', '2', '201', 'snapshot-seed-201'), canonicalSnapshot(2, 201)),
            ]);
        });

        const storeOneDb = testEnv.authenticatedContext('owner-101', {
            tenantId: '1',
            storeId: '101',
            storeIds: ['101'],
            role: 'OWNER',
            uId: 'owner-101',
        }).firestore();
        const storeTwoDb = testEnv.authenticatedContext('manager-102', {
            tenantId: '1',
            storeId: '102',
            storeIds: ['102'],
            role: 'MANAGER',
            uId: 'manager-102',
        }).firestore();
        const multiStoreDb = testEnv.authenticatedContext('owner-multi', {
            tenantId: '1',
            storeId: '101',
            storeIds: ['101', '102'],
            role: 'OWNER',
            uId: 'owner-multi',
        }).firestore();
        const readOnlyStaffDb = testEnv.authenticatedContext('staff-101', {
            tenantId: '1',
            storeId: '101',
            storeIds: ['101'],
            role: 'STAFF',
            uId: 'staff-101',
        }).firestore();
        const tenantOnlyDb = testEnv.authenticatedContext('tenant-only', {
            tenantId: '1',
            role: 'MANAGER',
            uId: 'tenant-only',
        }).firestore();
        const otherTenantDb = testEnv.authenticatedContext('owner-201', {
            tenantId: '2',
            storeId: '201',
            storeIds: ['201'],
            role: 'OWNER',
            uId: 'owner-201',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform', {
            platformRole: 'PLATFORM',
            role: 'PLATFORM',
        }).firestore();
        const publicDb = testEnv.unauthenticatedContext().firestore();

        const seed101 = doc(storeOneDb, 'menuChangeLog', '1', '101', 'seed-101');
        await assertSucceeds(getDoc(seed101));
        await assertSucceeds(getDoc(doc(readOnlyStaffDb, 'menuChangeLog', '1', '101', 'seed-101')));
        await assertSucceeds(getDoc(doc(multiStoreDb, 'menuChangeLog', '1', '102', 'seed-102')));
        await assertSucceeds(getDoc(doc(platformDb, 'menuChangeLog', '2', '201', 'seed-201')));
        await assertFails(getDoc(doc(storeTwoDb, 'menuChangeLog', '1', '101', 'seed-101')));
        await assertFails(getDoc(doc(tenantOnlyDb, 'menuChangeLog', '1', '101', 'seed-101')));
        await assertFails(getDoc(doc(otherTenantDb, 'menuChangeLog', '1', '101', 'seed-101')));
        await assertFails(getDoc(doc(publicDb, 'menuChangeLog', '1', '101', 'seed-101')));

        await assertSucceeds(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'canonical-valid'),
            canonicalEvent(1, 101),
        ));
        await assertSucceeds(setDoc(
            doc(multiStoreDb, 'menuChangeLog', '1', '102', 'canonical-multi-store'),
            canonicalEvent(1, 102),
        ));
        await assertFails(setDoc(
            doc(storeTwoDb, 'menuChangeLog', '1', '101', 'cross-store-write'),
            canonicalEvent(1, 101),
        ));
        await assertFails(setDoc(
            doc(readOnlyStaffDb, 'menuChangeLog', '1', '101', 'staff-write'),
            { ...canonicalEvent(1, 101), changedBy: 'STAFF' },
        ));
        await assertFails(setDoc(
            doc(tenantOnlyDb, 'menuChangeLog', '1', '101', 'tenant-only-write'),
            canonicalEvent(1, 101),
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'forged-payload-scope'),
            canonicalEvent(1, 102),
        ));
        const {
            tId: omittedTenantId,
            ...missingPayloadTenantScope
        } = canonicalEvent(1, 101);
        void omittedTenantId;
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'missing-payload-scope'),
            missingPayloadTenantScope,
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'extra-field'),
            { ...canonicalEvent(1, 101), privateOverride: true },
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'bad-type'),
            { ...canonicalEvent(1, 101), changeType: 'FORGED' },
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'bad-timestamp'),
            { ...canonicalEvent(1, 101), timestamp: 'today' },
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'oversized-project'),
            { ...canonicalEvent(1, 101), projectId: 'x'.repeat(181) },
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'unknown-project'),
            { ...canonicalEvent(1, 101), projectId: 'project-does-not-exist' },
        ));

        const validSummary = {
            ...canonicalEvent(1, 101),
            changeType: 'MENU_REVISION_SUMMARY',
            oldValue: null,
            newValue: {
                extractionCorrections: 3,
                extractionCorrectionsByField: {
                    name: 1,
                    price: 2,
                    description: 0,
                    categoryId: 0,
                    tags: 0,
                },
                extractionCorrectionsByConfidence: {
                    high: 1,
                    medium: 2,
                    low: 0,
                },
                itemDriftChanges: [
                    { itemId: 'item-1', priceChanges: 1, availabilityChanges: 0 },
                ],
                itemDriftChangesOverflowCount: 0,
            },
        };
        await assertSucceeds(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'summary-valid'),
            validSummary,
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'summary-oversized'),
            {
                ...validSummary,
                newValue: {
                    ...validSummary.newValue,
                    extractionCorrections: 10_001,
                },
            },
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'summary-field-total-mismatch'),
            {
                ...validSummary,
                newValue: {
                    ...validSummary.newValue,
                    extractionCorrections: 2,
                },
            },
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'summary-confidence-over-attributed'),
            {
                ...validSummary,
                newValue: {
                    ...validSummary.newValue,
                    extractionCorrectionsByConfidence: {
                        high: 3,
                        medium: 3,
                        low: 0,
                    },
                },
            },
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'summary-drift-oversized'),
            {
                ...validSummary,
                newValue: {
                    ...validSummary.newValue,
                    itemDriftChanges: Array.from(
                        { length: 1001 },
                        (_, index) => ({
                            itemId: `item-${index}`,
                            priceChanges: 1,
                            availabilityChanges: 0,
                        }),
                    ),
                },
            },
        ));
        const {
            itemDriftChangesOverflowCount: omittedDriftOverflowCount,
            ...missingDriftOverflowCount
        } = validSummary.newValue;
        void omittedDriftOverflowCount;
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'summary-drift-incomplete'),
            {
                ...validSummary,
                newValue: missingDriftOverflowCount,
            },
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'correction-invalid-field'),
            {
                ...canonicalEvent(1, 101),
                changeType: 'EXTRACTION_CORRECTION',
                oldValue: { field: 'unknown', extracted: 'old' },
                newValue: { field: 'unknown', corrected: 'new' },
            },
        ));

        const legacyId = 'legacy-valid';
        await assertSucceeds(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', legacyId),
            legacyEvent(legacyId, 1, 101),
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuChangeLog', '1', '101', 'legacy-id-mismatch'),
            legacyEvent('different-id', 1, 101),
        ));
        await assertFails(setDoc(
            doc(storeTwoDb, 'menuChangeLog', '1', '101', 'legacy-cross-store'),
            legacyEvent('legacy-cross-store', 1, 101),
        ));

        await assertFails(updateDoc(seed101, { newValue: '99.00' }));
        await assertFails(deleteDoc(seed101));

        const snapshotSeed101 = doc(storeOneDb, 'menuSnapshots', '1', '101', 'snapshot-seed-101');
        await assertSucceeds(getDoc(snapshotSeed101));
        await assertSucceeds(getDoc(doc(readOnlyStaffDb, 'menuSnapshots', '1', '101', 'snapshot-seed-101')));
        await assertSucceeds(getDoc(doc(multiStoreDb, 'menuSnapshots', '1', '102', 'snapshot-seed-102')));
        await assertSucceeds(getDoc(doc(platformDb, 'menuSnapshots', '2', '201', 'snapshot-seed-201')));
        await assertFails(getDoc(doc(storeTwoDb, 'menuSnapshots', '1', '101', 'snapshot-seed-101')));
        await assertFails(getDoc(doc(tenantOnlyDb, 'menuSnapshots', '1', '101', 'snapshot-seed-101')));
        await assertFails(getDoc(doc(otherTenantDb, 'menuSnapshots', '1', '101', 'snapshot-seed-101')));
        await assertFails(getDoc(doc(publicDb, 'menuSnapshots', '1', '101', 'snapshot-seed-101')));

        await assertSucceeds(setDoc(
            doc(storeOneDb, 'menuSnapshots', '1', '101', 'snapshot-valid'),
            canonicalSnapshot(1, 101),
        ));
        await assertSucceeds(setDoc(
            doc(multiStoreDb, 'menuSnapshots', '1', '102', 'snapshot-multi-store-valid'),
            canonicalSnapshot(1, 102),
        ));
        await assertFails(setDoc(
            doc(storeTwoDb, 'menuSnapshots', '1', '101', 'snapshot-cross-store'),
            canonicalSnapshot(1, 101),
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuSnapshots', '1', '101', 'snapshot-forged-scope'),
            canonicalSnapshot(1, 102),
        ));
        const { sId: omittedSnapshotStoreId, ...snapshotWithoutStoreId } = canonicalSnapshot(1, 101);
        void omittedSnapshotStoreId;
        await assertFails(setDoc(
            doc(storeOneDb, 'menuSnapshots', '1', '101', 'snapshot-missing-scope'),
            snapshotWithoutStoreId,
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuSnapshots', '1', '101', 'snapshot-unknown-project'),
            { ...canonicalSnapshot(1, 101), projectId: 'project-does-not-exist' },
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuSnapshots', '1', '101', 'snapshot-count-mismatch'),
            { ...canonicalSnapshot(1, 101), itemCount: 2 },
        ));
        await assertFails(setDoc(
            doc(storeOneDb, 'menuSnapshots', '1', '101', 'snapshot-extra-field'),
            { ...canonicalSnapshot(1, 101), internalOverride: true },
        ));
        await assertFails(updateDoc(snapshotSeed101, { retentionDays: 365 }));
        await assertFails(deleteDoc(snapshotSeed101));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Menu change log Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
