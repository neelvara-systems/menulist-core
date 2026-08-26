import { ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS } from '@type/answerlattice';

// Keep each hosted request comfortably below the 30-second client timeout while
// still allowing the largest valid 120-item job to finish inside the six-call
// per-minute publish rate limit.
export const ANSWERLATTICE_KNOWLEDGE_INTAKE_CLIENT_PUBLISH_BATCH_SIZE = Math.floor(
    ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_PUBLISH_ITEMS / 2,
);

export const buildAnswerlatticeKnowledgeIntakePublishBatches = (
    itemIds: string[],
): string[][] => {
    const uniqueItemIds = Array.from(new Set(itemIds));
    const batchSize = ANSWERLATTICE_KNOWLEDGE_INTAKE_CLIENT_PUBLISH_BATCH_SIZE;

    return Array.from(
        { length: Math.ceil(uniqueItemIds.length / batchSize) },
        (_, index) => uniqueItemIds.slice(index * batchSize, (index + 1) * batchSize),
    );
};
