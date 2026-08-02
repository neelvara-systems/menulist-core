#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { requireAnswerlatticeFirestoreAdmin } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import {
    executeAnswerlatticeFeedbackSubmission,
} from '../../src/lib/answerlattice/feedbackSubmissionServer';

const scope = { tId: 1, sId: 101 };
const db = requireAnswerlatticeFirestoreAdmin();
const actor = {
    id: 'customer-1',
    name: 'Customer One',
    role: 'CUSTOMER',
    sourceContext: {
        uId: 'customer-1',
        name: 'Customer One',
        email: 'customer@example.com',
        pId: 'AL' as const,
        tId: 1,
        sId: 101,
    },
};

const request = (comment = 'Clear and useful.') => ({
    requestId: 'feedback_request_1',
    submission: {
        type: 'general' as const,
        rating: 5,
        comment,
    },
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    await db.recursiveDelete(db.collection('feedback'));
    await db.recursiveDelete(db.collection('answerlattice_signalEvents'));

    const first = await executeAnswerlatticeFeedbackSubmission(request(), scope, actor);
    assert.equal(first.created, true);
    assert.equal(first.replayed, false);
    assert.equal(first.record.pId, 'AL');
    assert.equal(first.record.tId, 1);
    assert.equal(first.record.sId, 101);
    assert.equal(first.record.uId, actor.id);
    assert.equal(first.record.comment, 'Clear and useful.');
    assert.match(first.record.submissionFingerprint, /^[a-f0-9]{64}$/);
    assert.equal((await db.collection('feedback').doc(first.id).get()).exists, true);

    const replay = await executeAnswerlatticeFeedbackSubmission(request(), scope, actor);
    assert.equal(replay.id, first.id);
    assert.equal(replay.created, false);
    assert.equal(replay.replayed, true);
    assert.equal((await db.collection('feedback').get()).size, 1);
    assert.equal((await db.collection('answerlattice_signalEvents').get()).size, 1);

    const feedbackRef = db.collection('feedback').doc(first.id);
    await feedbackRef.update({ stalePrivateField: 'must-not-enter-response' });
    const staleFieldReplay = await executeAnswerlatticeFeedbackSubmission(request(), scope, actor);
    assert.equal(
        Object.prototype.hasOwnProperty.call(staleFieldReplay.record, 'stalePrivateField'),
        false,
        'replay responses must project an allowlisted record instead of spreading persisted fields',
    );

    await feedbackRef.update({ tId: '1' });
    await assert.rejects(
        executeAnswerlatticeFeedbackSubmission(request(), scope, actor),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 409,
        'replay scope must reject coercive persisted metadata',
    );
    await feedbackRef.update({ tId: scope.tId });

    await assert.rejects(
        executeAnswerlatticeFeedbackSubmission(request('Changed replay payload.'), scope, actor),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 409,
    );

    const featureRequest = await executeAnswerlatticeFeedbackSubmission({
        requestId: 'feedback_request_2',
        submission: {
            type: 'feature_requests',
            featureRequest: 'Please add clearer setup guides.',
        },
    }, scope, actor);
    assert.equal(featureRequest.created, true);
    assert.equal((await db.collection('feedback').get()).size, 2);
    assert.equal((await db.collection('answerlattice_signalEvents').get()).size, 2);

    await assert.rejects(
        executeAnswerlatticeFeedbackSubmission(request(), scope, { ...actor, id: 'unknown' }),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 401,
    );
}

run()
    .then(() => process.stdout.write('Answerlattice feedback-submission emulator tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
