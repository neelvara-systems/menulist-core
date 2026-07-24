#!/usr/bin/env ts-node

import assert = require('node:assert/strict');
import { clearStaleDecisionBlocksForProject } from '../../functions/src/decisionBlocksScoring';
import { firestoreAdmin } from '../../functions/src/firebaseAdmin';

const documentRef = firestoreAdmin.collection('projects').doc('1').collection('101').doc('menu');

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    await documentRef.set({
        name: 'Current menu',
        publicDecisionBlocks: {
            tId: '1',
            sId: '101',
            projectId: 'menu',
            stale: true,
        },
    });

    const clearedPath = await clearStaleDecisionBlocksForProject(
        firestoreAdmin,
        '1',
        '101',
        'menu',
        { publicDecisionBlocks: { stale: true } },
    );
    assert.equal(clearedPath, 'projects/1/101/menu');
    const cleared = (await documentRef.get()).data();
    assert.equal(cleared?.publicDecisionBlocks, undefined, 'stale generated truth must be deleted');
    assert.equal(cleared?.name, 'Current menu', 'clearing the projection must preserve canonical project truth');

    const skippedPath = await clearStaleDecisionBlocksForProject(
        firestoreAdmin,
        '1',
        '101',
        'menu',
        { name: 'Current menu' },
    );
    assert.equal(skippedPath, null, 'a project without the generated field must not incur a write');

    process.stdout.write('Decision Blocks stale-projection clear emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
