#!/usr/bin/env ts-node

import assert = require('node:assert/strict');
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { mutateDigitalScreenOwnerStateServer } from '@lib/screen/screenManagementServer';
import { getPrivateScreenControlDocId } from '@lib/screen/privateScreenControl';
import { getPublicScreenStateDocId } from '@lib/screen/publicScreenState';

const TENANT_A = '101';
const TENANT_B = '202';
const STORE_ID = '303';

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const summary = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY);
    const stores = firestoreAdmin.collection(DB_COLLECTIONS.STORES);
    const tenants = firestoreAdmin.collection(DB_COLLECTIONS.TENANTS);
    const summaryRef = summary.doc(`campaigns_${STORE_ID}`);
    const controlRef = summary.doc(getPrivateScreenControlDocId(STORE_ID));
    const publicRef = summary.doc(getPublicScreenStateDocId(STORE_ID));
    const storeRef = stores.doc(STORE_ID);

    await Promise.all([
        summaryRef.delete(),
        controlRef.delete(),
        publicRef.delete(),
        storeRef.set({
            active: true,
            sId: STORE_ID,
            storeId: STORE_ID,
            tId: TENANT_A,
            tenantId: TENANT_A,
        }),
        tenants.doc(TENANT_A).set({
            active: true,
            tId: TENANT_A,
            tenantId: TENANT_A,
        }),
        tenants.doc(TENANT_B).set({
            active: true,
            tId: TENANT_B,
            tenantId: TENANT_B,
        }),
    ]);

    const initialized = await mutateDigitalScreenOwnerStateServer(
        { storeId: STORE_ID, tenantId: TENANT_A },
        { action: 'initialize' },
    );
    assert.equal(initialized?.enabled, true);
    assert.equal(typeof initialized?.screenToken, 'string');
    assert.equal((await controlRef.get()).data()?.tenantId, TENANT_A);

    const validUntilMs = Date.now() + 24 * 60 * 60 * 1000;
    await mutateDigitalScreenOwnerStateServer(
        { storeId: STORE_ID, tenantId: TENANT_A },
        {
            action: 'add_slide',
            slide: {
                availabilityLinked: false,
                availabilityReliability: 'high',
                caption: 'Lunch',
                confidenceScore: 1,
                id: 'owner-slide-1',
                imageUrl: 'https://example.com/lunch.jpg',
                source: 'pinned',
                type: 'owner_upload',
                validUntilMs,
            },
        },
    );
    await assert.rejects(
        mutateDigitalScreenOwnerStateServer(
            { storeId: STORE_ID, tenantId: TENANT_A },
            {
                action: 'add_slide',
                slide: {
                    availabilityLinked: false,
                    availabilityReliability: 'high',
                    caption: 'Different content',
                    confidenceScore: 1,
                    id: 'owner-slide-1',
                    imageUrl: 'https://example.com/different.jpg',
                    source: 'pinned',
                    type: 'owner_upload',
                    validUntilMs,
                },
            },
        ),
        /digital_screen_slide_id_conflict/,
    );

    const beforeReassignment = JSON.stringify({
        control: (await controlRef.get()).data(),
        publicState: (await publicRef.get()).data(),
        summary: (await summaryRef.get()).data(),
    });
    await storeRef.set({
        active: true,
        sId: STORE_ID,
        storeId: STORE_ID,
        tId: TENANT_B,
        tenantId: TENANT_B,
    });
    await assert.rejects(
        mutateDigitalScreenOwnerStateServer(
            { storeId: STORE_ID, tenantId: TENANT_A },
            { action: 'update_settings', ownerOverrideEnabled: true },
        ),
        /digital_screen_scope_changed/,
    );
    assert.equal(JSON.stringify({
        control: (await controlRef.get()).data(),
        publicState: (await publicRef.get()).data(),
        summary: (await summaryRef.get()).data(),
    }), beforeReassignment, 'A reassigned store must leave every screen document unchanged');

    process.stdout.write('Digital Screen management Admin emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
