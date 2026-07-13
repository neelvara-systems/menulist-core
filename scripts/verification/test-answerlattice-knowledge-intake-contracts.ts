import assert from 'node:assert/strict';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    AnswerlatticeIntakeReviewItemSchema,
    AnswerlatticeKnowledgeIntakeJobSchema,
    AnswerlatticeKnowledgeSourceSchema,
    parseAnswerlatticeKnowledgeIntakeJob,
} from '../../src/lib/answerlattice/knowledgeIntakeContracts';

const timestamp = '2026-07-11T00:00:00.000Z';
const job = {
    id: 'ABCDEFGHIJKLMNOPQRST',
    pId: PRODUCT_IDS.ANSWERLATTICE,
    tId: 1,
    sId: 101,
    title: 'Product help import',
    status: 'collecting',
    sourceCount: 1,
    reviewItemCount: 0,
    acceptedItemCount: 0,
    publishedItemCount: 0,
    createdOn: timestamp,
    modifiedOn: timestamp,
};

assert.equal(AnswerlatticeKnowledgeIntakeJobSchema.safeParse(job).success, true);
assert.equal(
    AnswerlatticeKnowledgeIntakeJobSchema.safeParse({ ...job, pId: 'ML' }).success,
    false,
    'client and API payloads from another product must fail closed',
);
assert.equal(
    AnswerlatticeKnowledgeIntakeJobSchema.safeParse({ ...job, sourceCount: -1 }).success,
    false,
    'stored counters cannot be negative',
);
assert.equal(
    parseAnswerlatticeKnowledgeIntakeJob({ ...job, pId: undefined }, job.id).pId,
    PRODUCT_IDS.ANSWERLATTICE,
    'legacy intake rows without pId remain readable inside the Answerlattice-only collection',
);
assert.throws(
    () => parseAnswerlatticeKnowledgeIntakeJob({ ...job, id: 'different_job' }, job.id),
    /identity is invalid/,
    'stored IDs must agree with the Firestore document ID',
);

const processingSource = {
    id: `kis_${'a'.repeat(28)}`,
    pId: PRODUCT_IDS.ANSWERLATTICE,
    tId: 1,
    sId: 101,
    jobId: job.id,
    type: 'screenshot_ocr',
    title: 'Billing screenshot',
    status: 'processing',
    contentText: null,
    contentExcerpt: '',
    contentHash: 'a'.repeat(64),
    processingRun: {
        id: 'media_123',
        status: 'processing',
        startedAt: timestamp,
        leaseExpiresAt: '2026-07-11T00:10:00.000Z',
        completedAt: null,
    },
};
assert.equal(AnswerlatticeKnowledgeSourceSchema.safeParse(processingSource).success, true);
assert.equal(
    AnswerlatticeKnowledgeSourceSchema.safeParse({ ...processingSource, contentHash: 'not-a-hash' }).success,
    false,
);

const reviewItem = {
    id: `kii_${'b'.repeat(28)}`,
    pId: PRODUCT_IDS.ANSWERLATTICE,
    tId: 1,
    sId: 101,
    jobId: job.id,
    target: 'faq',
    status: 'accepted',
    title: 'Why did billing fail?',
    question: 'Why did billing fail?',
    answer: 'Open Billing and review the failed invoice.',
    confidenceScore: 0.8,
};
assert.equal(AnswerlatticeIntakeReviewItemSchema.safeParse(reviewItem).success, true);
assert.equal(
    AnswerlatticeIntakeReviewItemSchema.safeParse({ ...reviewItem, confidenceScore: 1.5 }).success,
    false,
);

process.stdout.write('Answerlattice Knowledge Intake contract tests passed.\n');
