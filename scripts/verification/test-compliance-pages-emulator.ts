#!/usr/bin/env ts-node

import assert = require('node:assert/strict');
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import {
    deleteComplianceOverrideServer,
    saveComplianceOverrideServer,
} from '@database/compliance/server';

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const collection = firestoreAdmin.collection('compliancePages');
    const existing = await collection.get();
    await Promise.all(existing.docs.map((document) => document.ref.delete()));

    await saveComplianceOverrideServer(
        '202',
        '101',
        'privacy',
        'Owner-reviewed privacy policy text that remains inside the exact store and tenant scope.',
    );
    const validRef = collection.doc('202');
    const valid = (await validRef.get()).data();
    assert.equal(valid?.sId, '202');
    assert.equal(valid?.tId, '101');

    await assert.rejects(
        saveComplianceOverrideServer(
            '202',
            '999',
            'terms',
            'A conflicting tenant must never overwrite or extend the existing compliance document.',
        ),
        /invalid_compliance_override_document/,
    );
    assert.equal((await validRef.get()).data()?.termsOverride, undefined);

    await deleteComplianceOverrideServer('404', '101', 'privacy');
    assert.equal((await collection.doc('404').get()).exists, false);

    await assert.rejects(
        deleteComplianceOverrideServer('202', '999', 'privacy'),
        /invalid_compliance_override_document/,
    );
    assert.equal(typeof (await validRef.get()).data()?.privacyOverride, 'string');

    await deleteComplianceOverrideServer('202', '101', 'privacy');
    assert.equal((await validRef.get()).data()?.privacyOverride, undefined);

    process.stdout.write('Compliance page Admin emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
