#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import { loadAnswerlatticeAnswerTraces } from '../../src/lib/answerlattice/answerTraceServer';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const scope = { tId: 41, sId: 4101 };
const collection = () => db.collection(DB_COLLECTIONS.AI_SEARCH_HISTORY);

const baseHistory = (createdOn: Timestamp) => ({
    pId: PRODUCT_IDS.ANSWERLATTICE,
    ...scope,
    createdOn,
    expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
    retentionDays: 30,
    query: 'Why did the billing setup fail?',
    craftedAnswer: 'The setup needs an approved billing administrator.',
    answerType: 'procedure',
    mountContext: 'widget',
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    if (!db || typeof db.collection !== 'function') {
        throw new Error('Answerlattice emulator Firestore is not configured');
    }

    await db.recursiveDelete(collection());
    const now = Date.now();

    await collection().doc('trace-review').set({
        ...baseHistory(Timestamp.fromMillis(now)),
        canonical: false,
        answerSource: 'rag',
        matchedEntityIds: ['billing', 'billing'],
        confidence: 'low',
        fallbackReason: 'No approved canonical answer matched.',
        isGood: false,
        resolutionOutcome: 'not_resolved',
        escalationTicketId: 'ticket-billing',
        drifted: true,
        citations: [
            {
                id: 'billing-guide',
                title: 'Billing setup guide',
                url: 'https://docs.example.com/billing',
            },
            {
                id: 'private-billing-guide',
                title: 'Private billing setup guide',
                url: 'https://docs.example.com/private?token=secret',
            },
        ],
        visitorEmail: 'private@example.com',
        visitorId: 'visitor-private',
        requestOrigin: 'https://private.example.com/settings/billing',
        debugEvidenceUrls: ['https://private.example.com/debug?token=secret'],
        rawMetadata: { accessToken: 'secret' },
    });
    await collection().doc('trace-cached-canonical').set({
        ...baseHistory(Timestamp.fromMillis(now - 1_000)),
        query: 'Can I download my invoice?',
        craftedAnswer: 'Yes. Open Billing and select the invoice download action.',
        canonical: true,
        canonicalAnswerId: 'invoice-download',
        answerSource: 'cache',
        confidence: 'high',
        resolutionOutcome: 'resolved',
    });
    await collection().doc('trace-expired').set({
        ...baseHistory(Timestamp.fromMillis(now - 2_000)),
        query: 'This expired answer must not be visible.',
        answerSource: 'empty',
        canonical: false,
        expiresAt: Timestamp.fromMillis(now - 1),
    });
    await collection().doc('trace-other-workspace').set({
        ...baseHistory(Timestamp.fromMillis(now - 3_000)),
        sId: scope.sId + 1,
        answerSource: 'empty',
        canonical: false,
    });

    const recent = await loadAnswerlatticeAnswerTraces(scope);
    assert.equal(recent.mode, 'recent');
    assert.equal(recent.scannedCount, 3, 'recent mode must scan only the authenticated workspace');
    assert.equal(recent.windowLimited, false);
    assert.equal(recent.traces.length, 1, 'recent mode must return review candidates only');
    assert.equal(recent.traces[0]?.id, 'trace-review');
    assert.deepEqual(recent.traces[0]?.matchedEntityIds, ['billing']);
    assert.deepEqual(recent.traces[0]?.citations, [{
        id: 'billing-guide',
        title: 'Billing setup guide',
        url: 'https://docs.example.com/billing',
    }]);
    assert.deepEqual(recent.traces[0]?.reviewSignals, [
        'canonical_miss',
        'fallback_used',
        'low_confidence',
        'negative_feedback',
        'not_resolved',
        'escalated',
        'drifted_answer',
    ]);
    const projectedRecent = recent.traces[0] as unknown as Record<string, unknown>;
    for (const privateField of [
        'visitorEmail',
        'visitorId',
        'requestOrigin',
        'debugEvidenceUrls',
        'rawMetadata',
    ]) {
        assert.equal(projectedRecent[privateField], undefined, `${privateField} must not leave the server projection`);
    }

    const exactReview = await loadAnswerlatticeAnswerTraces(scope, 'trace-review');
    assert.equal(exactReview.mode, 'exact');
    assert.equal(exactReview.scannedCount, 1);
    assert.equal(exactReview.traces[0]?.id, 'trace-review');

    const exactCachedCanonical = await loadAnswerlatticeAnswerTraces(scope, 'trace-cached-canonical');
    assert.equal(exactCachedCanonical.traces.length, 1);
    assert.deepEqual(
        exactCachedCanonical.traces[0]?.reviewSignals,
        [],
        'a cached canonical answer must not manufacture fallback repair work',
    );

    const wrongScope = await loadAnswerlatticeAnswerTraces(
        { tId: scope.tId, sId: scope.sId + 1 },
        'trace-review',
    );
    assert.equal(wrongScope.scannedCount, 1);
    assert.deepEqual(wrongScope.traces, [], 'an exact cross-workspace lookup must fail closed');

    const expired = await loadAnswerlatticeAnswerTraces(scope, 'trace-expired');
    assert.equal(expired.scannedCount, 1);
    assert.deepEqual(expired.traces, [], 'an expired exact trace must fail closed before TTL deletion');

    await db.recursiveDelete(collection());
    console.log('Answerlattice Answer Trace emulator verification passed.');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
