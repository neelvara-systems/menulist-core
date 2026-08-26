import assert from 'node:assert/strict';
import {
    markAnswerlatticeKnowledgeIntakeItemsPublished,
    upsertAnswerlatticeKnowledgeIntakeJob,
    upsertAnswerlatticeKnowledgeIntakeReviewItem,
    upsertAnswerlatticeKnowledgeIntakeSource,
    type AnswerlatticeKnowledgeIntakeBundleState,
} from '../../src/lib/answerlattice/knowledgeIntakeMutationState';
import type {
    AnswerlatticeIntakeReviewItem,
    AnswerlatticeKnowledgeIntakeJob,
    AnswerlatticeKnowledgeSource,
} from '../../src/types/answerlattice';

const job = (id: string) => ({ id } as AnswerlatticeKnowledgeIntakeJob);
const source = (id: string) => ({ id } as AnswerlatticeKnowledgeSource);
const item = (id: string, status: AnswerlatticeIntakeReviewItem['status']) => ({
    id,
    status,
} as AnswerlatticeIntakeReviewItem);

assert.deepEqual(
    upsertAnswerlatticeKnowledgeIntakeJob([job('older'), job('current')], job('current')).map(value => value.id),
    ['current', 'older'],
    'created jobs should appear immediately without duplicates',
);

const bundle: AnswerlatticeKnowledgeIntakeBundleState = {
    job: job('job-1'),
    sources: [source('source-1')],
    reviewItems: [item('item-1', 'draft'), item('item-2', 'accepted')],
};

assert.deepEqual(
    upsertAnswerlatticeKnowledgeIntakeSource(bundle, 'job-1', source('source-2')).sources.map(value => value.id),
    ['source-2', 'source-1'],
    'persisted sources should appear before background readback completes',
);
assert.equal(
    upsertAnswerlatticeKnowledgeIntakeSource(bundle, 'other-job', source('source-2')),
    bundle,
    'a stale-scope source mutation must not alter the visible bundle',
);

const acceptedItem = item('item-1', 'accepted');
assert.equal(
    upsertAnswerlatticeKnowledgeIntakeReviewItem(bundle, 'job-1', acceptedItem).reviewItems[0]?.status,
    'accepted',
    'review mutations should update the visible item immediately',
);

const published = markAnswerlatticeKnowledgeIntakeItemsPublished(bundle, 'job-1', ['item-2']);
assert.equal(published.reviewItems[0]?.status, 'draft');
assert.equal(published.reviewItems[1]?.status, 'published');
assert.equal(
    markAnswerlatticeKnowledgeIntakeItemsPublished(bundle, 'other-job', ['item-2']),
    bundle,
    'a stale-scope publish must not alter the visible bundle',
);

console.log('Answerlattice Knowledge Intake mutation state tests passed.');
