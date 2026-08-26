#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { attemptFaqAnswerRetrieval } from '../../src/lib/answerlattice/faqRetrieval';
import { requireAnswerlatticeFirestoreAdmin } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';

const db = requireAnswerlatticeFirestoreAdmin();
const collection = db.collection('answerlattice_faqs');
const scope = { tId: 71, sId: 7101 };
const targetQuestion = 'How do I retrieve a reviewed FAQ beyond the public window?';

const faq = (overrides: Record<string, unknown> = {}) => ({
    pId: 'AL',
    tId: scope.tId,
    sId: scope.sId,
    question: 'Placeholder question',
    answer: 'Placeholder answer.',
    status: 'published',
    source: 'manual',
    active: true,
    articleId: null,
    articleTitle: null,
    entityIds: [],
    contextKeys: [],
    tags: [],
    sortOrder: 0,
    modifiedOn: new Date('2026-08-26T00:00:00.000Z'),
    ...overrides,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    await db.recursiveDelete(collection);

    const batch = db.batch();
    for (let index = 0; index < 84; index += 1) {
        batch.set(collection.doc(`faq-window-${String(index).padStart(3, '0')}`), faq({
            question: `Bounded FAQ window question ${index}`,
            answer: `Bounded FAQ window answer ${index}.`,
            sortOrder: index,
        }));
    }
    batch.set(collection.doc('faq-overflow-target'), faq({
        question: targetQuestion,
        answer: 'The exact overflow lookup retrieves this reviewed answer without scanning another page.',
        sortOrder: 999,
    }));

    // These rows share the question but must never cross the exact-query boundary.
    batch.set(collection.doc('faq-overflow-wrong-tenant'), faq({ tId: 72, question: targetQuestion, sortOrder: 999 }));
    batch.set(collection.doc('faq-overflow-wrong-store'), faq({ sId: 7102, question: targetQuestion, sortOrder: 999 }));
    batch.set(collection.doc('faq-overflow-wrong-product'), faq({ pId: 'ML', question: targetQuestion, sortOrder: 999 }));
    batch.set(collection.doc('faq-overflow-draft'), faq({ status: 'draft', question: targetQuestion, sortOrder: 999 }));
    batch.set(collection.doc('faq-overflow-inactive'), faq({ active: false, question: targetQuestion, sortOrder: 999 }));
    await batch.commit();

    const result = await attemptFaqAnswerRetrieval(targetQuestion, {
        ...scope,
        sourceVersion: 1,
        includeFullArticleReference: false,
    });
    assert.equal(result.found, true, 'an exact published FAQ outside the first 80 must be retrievable');
    assert.equal(result.faq?.id, 'faq-overflow-target', 'the scoped published target must win over invalid decoys');
    assert.equal(result.faq?.answer, 'The exact overflow lookup retrieves this reviewed answer without scanning another page.');
    assert.equal(result.confidence, 'high');
    assert.equal(result.matchReason, 'exact_overflow_exact_question');
    assert.deepEqual(result.references, []);

    const whitespaceNormalized = await attemptFaqAnswerRetrieval(`  ${targetQuestion}  `, {
        ...scope,
        sourceVersion: 2,
        includeFullArticleReference: false,
    });
    assert.equal(whitespaceNormalized.faq?.id, 'faq-overflow-target', 'bounded input cleanup must preserve exact overflow retrieval');

    const wrongScope = await attemptFaqAnswerRetrieval(targetQuestion, {
        tId: scope.tId,
        sId: scope.sId + 100,
        sourceVersion: 3,
        includeFullArticleReference: false,
    });
    assert.equal(wrongScope.found, false, 'another workspace must not retrieve the scoped FAQ');

    const malformedScope = await attemptFaqAnswerRetrieval(targetQuestion, {
        tId: Number.NaN,
        sId: scope.sId,
        sourceVersion: 4,
        includeFullArticleReference: false,
    });
    assert.equal(malformedScope.found, false, 'malformed runtime scope must fail closed');

    process.stdout.write('Answerlattice FAQ overflow emulator verification passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
