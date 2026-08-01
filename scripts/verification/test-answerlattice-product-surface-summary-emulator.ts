#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '@constant/database';
import {
    answerlatticeAdminApp,
    answerlatticeFirestoreAdmin,
} from '@lib/firebase/answerlatticeFirebaseAdmin';
import { rebuildProductSurfaceContentSummaryServer } from '@lib/answerlattice/productSurfaceContentServer';
import { deleteApp } from 'firebase-admin/app';
import { Timestamp } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required.');
}

const SCOPE = { tId: 41, sId: 4101 };
const SUMMARY_ID = `contextContent_${SCOPE.tId}_${SCOPE.sId}`;

const makeSurface = (key: string, priority: number) => ({
    pId: 'AL',
    ...SCOPE,
    key,
    label: key === 'billing' ? 'Billing' : 'Settings',
    description: '',
    routePatterns: [`/${key}`, `/${key}/*`],
    feature: key,
    page: '',
    workflow: '',
    entityHints: [],
    entityIds: [],
    tags: [],
    visibility: { helpWidget: true, helpCenter: true, changelog: true },
    active: true,
    priority,
});

async function run(): Promise<void> {
    if (!answerlatticeFirestoreAdmin) {
        throw new Error('Answerlattice Firestore Admin is not configured.');
    }

    const surfaces = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES);
    const summaryRef = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(SUMMARY_ID);
    const billingRef = surfaces.doc(`${SCOPE.tId}_${SCOPE.sId}_billing`);
    const settingsRef = surfaces.doc(`${SCOPE.tId}_${SCOPE.sId}_settings`);
    const duplicateRef = surfaces.doc('legacy_duplicate_billing');
    const tickets = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.SUPPORT_TICKETS);
    const changelogPageRef = answerlatticeFirestoreAdmin
        .collection(DB_COLLECTIONS.CHANGELOG)
        .doc(String(SCOPE.tId))
        .collection(String(SCOPE.sId))
        .doc('page_000001');
    const now = Timestamp.fromDate(new Date('2026-07-18T08:00:00.000Z'));

    await Promise.all([
        billingRef.set(makeSurface('billing', 200)),
        settingsRef.set(makeSurface('settings', 100)),
        tickets.doc('answerlattice-billing-ticket').set({
            pId: 'AL',
            ...SCOPE,
            subject: 'Billing question',
            status: 'Open',
            priority: 'Normal',
            category: 'Billing Inquiry',
            message: 'Please help.',
            documents: [],
            platformNotes: '',
            platformTags: [],
            contextKeys: ['billing'],
            deleted: false,
            statuses: [],
            messages: [],
            createdOn: now,
            modifiedOn: now,
            createdBy: 'Owner',
            modifiedBy: 'Owner',
            uId: 'owner-1',
        }),
        tickets.doc('menulist-colliding-ticket').set({
            pId: 'ML',
            ...SCOPE,
            subject: 'MenuList billing question',
            status: 'Open',
            priority: 'Normal',
            category: 'Billing Inquiry',
            message: 'Must remain outside Answerlattice.',
            documents: [],
            platformNotes: '',
            platformTags: [],
            contextKeys: ['billing'],
            deleted: false,
            statuses: [],
            messages: [],
            createdOn: now,
            modifiedOn: now,
            createdBy: 'Owner',
            modifiedBy: 'Owner',
            uId: 'owner-2',
        }),
        changelogPageRef.set({
            pId: 'AL',
            ...SCOPE,
            pageNumber: 1,
            createdOn: now,
            createdBy: 'contract-test',
            modifiedOn: now,
            modifiedBy: 'contract-test',
            nextPageId: null,
            entryIds: ['published-entry', 'linked-entry', 'draft-entry', 'unlinked-entry'],
            entries: [
                {
                    id: 'published-entry',
                    title: 'Billing improvements',
                    description: { type: 'doc', content: [] },
                    tags: [],
                    releasedOn: now,
                    createdOn: now,
                    createdBy: 'contract-test',
                    modifiedOn: null,
                    modifiedBy: null,
                    published: true,
                    version: null,
                    contextKeys: ['billing'],
                    entityChanges: [],
                    kbSources: [],
                    youtubeLinks: [],
                    files: [],
                },
                {
                    id: 'linked-entry',
                    title: 'Billing release',
                    description: { type: 'doc', content: [] },
                    tags: [],
                    releasedOn: now,
                    createdOn: now,
                    createdBy: 'contract-test',
                    modifiedOn: null,
                    modifiedBy: null,
                    published: true,
                    version: '1.0.0',
                    releaseId: 'release-linked',
                    contextKeys: ['billing'],
                    entityChanges: ['billing'],
                    kbSources: [],
                    youtubeLinks: [],
                    files: [],
                },
                {
                    id: 'draft-entry',
                    title: 'Draft billing note',
                    description: { type: 'doc', content: [] },
                    tags: [],
                    releasedOn: now,
                    createdOn: now,
                    createdBy: 'contract-test',
                    modifiedOn: null,
                    modifiedBy: null,
                    published: false,
                    version: null,
                    contextKeys: ['billing'],
                    entityChanges: [],
                    kbSources: [],
                    youtubeLinks: [],
                    files: [],
                },
                {
                    id: 'unlinked-entry',
                    title: 'Unlinked billing release',
                    description: { type: 'doc', content: [] },
                    tags: [],
                    releasedOn: now,
                    createdOn: now,
                    createdBy: 'contract-test',
                    modifiedOn: null,
                    modifiedBy: null,
                    published: true,
                    version: '2.0.0',
                    contextKeys: ['billing'],
                    entityChanges: ['billing'],
                    kbSources: [],
                    youtubeLinks: [],
                    files: [],
                },
            ],
        }),
    ]);

    const firstSummary = await rebuildProductSurfaceContentSummaryServer({ ...SCOPE, reason: 'contract_test' });
    assert.equal(firstSummary.surfaceCount, 2);
    assert.deepEqual(Object.keys(firstSummary.surfaces).sort(), ['billing', 'settings']);
    assert.equal(firstSummary.changelogCount, 2);
    assert.equal(firstSummary.ticketCount, 1);
    assert.equal(firstSummary.surfaces.billing.tickets.total, 1);
    assert.deepEqual(
        firstSummary.surfaces.billing.changelogs.map(entry => entry.id).sort(),
        ['linked-entry', 'published-entry'],
    );

    await settingsRef.update({ active: false });
    const secondSummary = await rebuildProductSurfaceContentSummaryServer({ ...SCOPE, reason: 'archive_test' });
    assert.equal(secondSummary.surfaceCount, 1);
    assert.deepEqual(Object.keys(secondSummary.surfaces), ['billing']);

    const persistedAfterArchive = (await summaryRef.get()).data();
    assert.equal(persistedAfterArchive?.surfaceCount, 1);
    assert.deepEqual(Object.keys(persistedAfterArchive?.surfaces || {}), ['billing']);

    await duplicateRef.set(makeSurface('billing', 50));
    await assert.rejects(
        rebuildProductSurfaceContentSummaryServer({ ...SCOPE, reason: 'duplicate_test' }),
        /Duplicate active Answerlattice product surface key: billing/,
    );

    const persistedAfterRejectedRebuild = (await summaryRef.get()).data();
    assert.equal(persistedAfterRejectedRebuild?.surfaceCount, 1);
    assert.deepEqual(Object.keys(persistedAfterRejectedRebuild?.surfaces || {}), ['billing']);

    process.stdout.write('Answerlattice product-surface summary emulator tests passed.\n');
}

void run()
    .then(async () => {
        if (answerlatticeAdminApp) await deleteApp(answerlatticeAdminApp);
    })
    .catch(async (error) => {
        console.error(error);
        if (answerlatticeAdminApp) await deleteApp(answerlatticeAdminApp).catch(() => undefined);
        process.exit(1);
    });
