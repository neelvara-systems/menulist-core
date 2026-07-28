import assert from 'node:assert/strict';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    AnswerlatticeIntakeReviewItemSchema,
    AnswerlatticeKnowledgeIntakeJobSchema,
    AnswerlatticeKnowledgeIntakePublishRequestSchema,
    AnswerlatticeKnowledgeSourceSchema,
    AnswerlatticeSourceGovernanceInputSchema,
    getAnswerlatticeKnowledgeIntakeTimestampMillis,
    normalizeAnswerlatticeKnowledgeIntakeScope,
    parseAnswerlatticeKnowledgeIntakeJob,
} from '../../src/lib/answerlattice/knowledgeIntakeContracts';
import { sanitizeAnswerlatticeIntakeMetadata } from '../../src/lib/answerlattice/knowledgeIntakePrivacy';
import { getAnswerlatticeKnowledgeIntakeLogContext } from '../../src/lib/answerlattice/knowledgeIntakeDiagnostics';

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
const publishItemId = `kii_${'1'.repeat(28)}`;
assert.equal(AnswerlatticeKnowledgeIntakePublishRequestSchema.safeParse(undefined).success, true);
assert.equal(AnswerlatticeKnowledgeIntakePublishRequestSchema.safeParse({}).success, true);
assert.equal(AnswerlatticeKnowledgeIntakePublishRequestSchema.safeParse({ itemIds: [publishItemId] }).success, true);
assert.equal(
    AnswerlatticeKnowledgeIntakePublishRequestSchema.safeParse({ itemIds: [] }).success,
    false,
    'an explicit empty selection must not become publish-all',
);
assert.equal(
    AnswerlatticeKnowledgeIntakePublishRequestSchema.safeParse({
        itemIds: [publishItemId, publishItemId],
    }).success,
    false,
    'an explicit publish selection must be unique',
);
assert.deepEqual(normalizeAnswerlatticeKnowledgeIntakeScope(1, 101), { tId: 1, sId: 101 });
for (const [tId, sId] of [
    ['1', 101],
    [true, 101],
    [1.5, 101],
    [1, Number.NaN],
    [1, Number.MAX_SAFE_INTEGER + 1],
]) {
    assert.equal(
        normalizeAnswerlatticeKnowledgeIntakeScope(tId, sId),
        null,
        'runtime workspace scope must not coerce untrusted values',
    );
}
assert.equal(getAnswerlatticeKnowledgeIntakeTimestampMillis(timestamp), Date.parse(timestamp));
assert.equal(getAnswerlatticeKnowledgeIntakeTimestampMillis({ seconds: 10, nanoseconds: 500_000_000 }), 10_500);
assert.equal(getAnswerlatticeKnowledgeIntakeTimestampMillis({ toMillis: () => 42 }), 42);
assert.equal(getAnswerlatticeKnowledgeIntakeTimestampMillis({ toMillis: () => Number.NaN }), null);
assert.equal(getAnswerlatticeKnowledgeIntakeTimestampMillis({
    get toMillis() {
        throw new Error('hostile getter');
    },
}), null);
assert.equal(getAnswerlatticeKnowledgeIntakeTimestampMillis({
    toMillis() {
        throw new Error('malformed legacy timestamp');
    },
}), null);
assert.doesNotThrow(() => AnswerlatticeKnowledgeIntakeJobSchema.safeParse({
    ...job,
    modifiedOn: {
        get toMillis() {
            throw new Error('hostile getter');
        },
    },
}));
assert.equal(AnswerlatticeKnowledgeIntakeJobSchema.safeParse({
    ...job,
    modifiedOn: {
        get toMillis() {
            throw new Error('hostile getter');
        },
    },
}).success, false);
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
const governanceInput = {
    requestId: '8b85d4cb-1578-4bca-9bf3-2c0a31cb6246',
    authority: 'official_documentation',
    owner: 'Support',
    approvalStatus: 'approved',
    accessScope: 'public',
    citationEligibility: 'public',
    effectiveDate: '2026-07-01',
    reviewDate: '2026-10-01',
    applicability: {
        products: ['Core app'],
        plans: ['Pro'],
        roles: ['Owner'],
        regions: ['EU'],
        versions: ['v2'],
    },
    conflictSourceIds: [],
    notes: 'Reviewed against the current billing screen.',
};
const { requestId: governanceRequestId, ...storedGovernance } = governanceInput;
assert.ok(governanceRequestId);
assert.equal(AnswerlatticeSourceGovernanceInputSchema.safeParse(governanceInput).success, true);
assert.equal(
    AnswerlatticeKnowledgeSourceSchema.safeParse({
        ...processingSource,
        governance: {
            ...storedGovernance,
            reviewedBy: 'owner@example.com',
            reviewedOn: timestamp,
        },
    }).success,
    true,
    'sources may carry a strict reviewed governance object',
);
assert.equal(
    AnswerlatticeSourceGovernanceInputSchema.safeParse({ ...governanceInput, authority: 'model_confidence' }).success,
    false,
    'model confidence cannot impersonate source authority',
);
assert.equal(
    AnswerlatticeSourceGovernanceInputSchema.safeParse({ ...governanceInput, reviewDate: '2026-02-30' }).success,
    false,
    'invalid calendar dates must fail closed',
);
assert.equal(
    AnswerlatticeSourceGovernanceInputSchema.safeParse({
        ...governanceInput,
        conflictSourceIds: Array.from({ length: 6 }, (_, index) => `kis_${index.toString(16).padStart(28, '0')}`),
    }).success,
    false,
    'source conflicts must stay bounded',
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
    sourceIds: [processingSource.id],
};
assert.equal(AnswerlatticeIntakeReviewItemSchema.safeParse(reviewItem).success, true);
assert.equal(
    AnswerlatticeIntakeReviewItemSchema.safeParse({ ...reviewItem, confidenceScore: 1.5 }).success,
    false,
);
assert.equal(
    AnswerlatticeIntakeReviewItemSchema.safeParse({
        ...reviewItem,
        sourceIds: Array.from({ length: 6 }, (_, index) => `kis_${String(index).repeat(28)}`),
    }).success,
    false,
    'review evidence must stay within the bounded source set',
);

const sanitizedMetadata = sanitizeAnswerlatticeIntakeMetadata({
    contact: 'founder@example.com',
    nested: {
        authorization: 'authorization=sk-abcdefghijklmnopqrstuvwxyz123456',
        notes: ['safe', 'password: super-secret-password'],
    },
});
assert.equal(sanitizedMetadata.contact, '[redacted-email]');
assert.equal(String(sanitizedMetadata.nested.authorization).includes('abcdefghijklmnopqrstuvwxyz123456'), false);
assert.equal(String(sanitizedMetadata.nested.notes[1]).includes('super-secret-password'), false);
assert.deepEqual(
    sanitizeAnswerlatticeIntakeMetadata({
        finite: 3,
        invalidDate: new Date(Number.NaN),
        infinite: Number.POSITIVE_INFINITY,
    }),
    {
        finite: 3,
        invalidDate: null,
        infinite: null,
    },
);
assert.deepEqual(sanitizeAnswerlatticeIntakeMetadata(new Proxy({}, {
    ownKeys() {
        throw new Error('hostile metadata');
    },
})), {});
assert.equal(getAnswerlatticeKnowledgeIntakeLogContext({ createdCount: 3 }).createdCount, 3);
assert.equal(getAnswerlatticeKnowledgeIntakeLogContext({ createdCount: '3' }).createdCount, undefined);
assert.equal(getAnswerlatticeKnowledgeIntakeLogContext({ usageUnits: false }).usageUnits, undefined);
assert.equal(
    getAnswerlatticeKnowledgeIntakeLogContext({ publishedCount: Number.POSITIVE_INFINITY }).publishedCount,
    undefined,
);

process.stdout.write('Answerlattice Knowledge Intake contract tests passed.\n');
