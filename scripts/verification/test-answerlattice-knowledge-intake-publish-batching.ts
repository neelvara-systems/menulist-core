import assert from 'node:assert/strict';
import { buildAnswerlatticeKnowledgeIntakePublishBatches } from '@lib/answerlattice/knowledgeIntakePublishBatching';

assert.deepEqual(buildAnswerlatticeKnowledgeIntakePublishBatches([]), []);
assert.deepEqual(
    buildAnswerlatticeKnowledgeIntakePublishBatches(Array.from({ length: 50 }, (_, index) => `item-${index}`))
        .map(batch => batch.length),
    [25, 25],
);
assert.deepEqual(
    buildAnswerlatticeKnowledgeIntakePublishBatches(Array.from({ length: 51 }, (_, index) => `item-${index}`))
        .map(batch => batch.length),
    [25, 25, 1],
);
assert.deepEqual(
    buildAnswerlatticeKnowledgeIntakePublishBatches(Array.from({ length: 120 }, (_, index) => `item-${index}`))
        .map(batch => batch.length),
    [25, 25, 25, 25, 20],
);
assert.deepEqual(
    buildAnswerlatticeKnowledgeIntakePublishBatches(['item-1', 'item-1', 'item-2']),
    [['item-1', 'item-2']],
);

process.stdout.write('Answerlattice knowledge-intake publish batching tests passed.\n');
