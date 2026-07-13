import { PRODUCT_IDS } from '@constant/product';
import {
    normalizeAnswerlatticeKnowledgeIntakeJobId,
    normalizeAnswerlatticeKnowledgeIntakeReviewItemId,
    normalizeAnswerlatticeKnowledgeIntakeSourceId,
} from '@lib/answerlattice/knowledgeIntakeIdBoundary';
import {
    ANSWERLATTICE_INTAKE_REVIEW_STATUS,
    ANSWERLATTICE_INTAKE_REVIEW_TARGET,
    ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS,
    ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE,
    type AnswerlatticeIntakeReviewItem,
    type AnswerlatticeKnowledgeIntakeBundle,
    type AnswerlatticeKnowledgeIntakeJob,
    type AnswerlatticeKnowledgeIntakeSummary,
    type AnswerlatticeKnowledgeSource,
} from '@type/answerlattice';
import { z } from 'zod';

const positiveScopeId = z.number().int().positive().safe();
const nonNegativeCount = z.number().int().nonnegative().safe();
const boundedId = z.string().trim().min(1).max(180);
const intakeJobId = boundedId.refine(value => normalizeAnswerlatticeKnowledgeIntakeJobId(value) === value);
const intakeSourceId = boundedId.refine(value => normalizeAnswerlatticeKnowledgeIntakeSourceId(value) === value);
const intakeReviewItemId = boundedId.refine(value => normalizeAnswerlatticeKnowledgeIntakeReviewItemId(value) === value);
const timestampLike = z.custom<unknown>((value) => {
    if (value === undefined || value === null) return true;
    if (value instanceof Date) return Number.isFinite(value.getTime());
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') return Number.isFinite(Date.parse(value));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const candidate = value as { seconds?: unknown; toDate?: unknown; toMillis?: unknown };
    return typeof candidate.toDate === 'function'
        || typeof candidate.toMillis === 'function'
        || (typeof candidate.seconds === 'number' && Number.isFinite(candidate.seconds));
}, 'Invalid timestamp');

const answerlatticeIdentity = {
    pId: z.literal(PRODUCT_IDS.ANSWERLATTICE),
    tId: positiveScopeId,
    sId: positiveScopeId,
};

export const AnswerlatticeKnowledgeIntakeJobSchema = z.object({
    id: intakeJobId,
    ...answerlatticeIdentity,
    title: z.string().max(120),
    status: z.enum(Object.values(ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS) as [string, ...string[]]),
    description: z.string().max(500).optional(),
    productWebsiteUrl: z.string().max(500).nullable().optional(),
    appUrl: z.string().max(500).nullable().optional(),
    targetAudience: z.string().max(160).nullable().optional(),
    defaultCategoryId: z.string().max(180).optional(),
    defaultCategoryTitle: z.string().max(180).optional(),
    defaultSectionId: z.string().max(180).optional(),
    defaultSectionTitle: z.string().max(180).optional(),
    sourceCount: nonNegativeCount,
    readySourceCount: nonNegativeCount.optional(),
    reviewItemCount: nonNegativeCount,
    acceptedItemCount: nonNegativeCount,
    publishedItemCount: nonNegativeCount,
    rejectedItemCount: nonNegativeCount.optional(),
    usageUnitsConsumed: z.number().finite().nonnegative().optional(),
    usageSummary: z.record(z.unknown()).optional(),
    analysisRun: z.object({
        id: boundedId,
        sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
        status: z.enum(['processing', 'completed', 'failed']),
        startedAt: timestampLike,
        leaseExpiresAt: timestampLike,
        completedAt: timestampLike.nullable().optional(),
        createdCount: nonNegativeCount.optional(),
    }).optional(),
    publishRun: z.object({
        id: boundedId,
        status: z.enum(['processing', 'completed', 'failed']),
        itemIds: z.array(intakeReviewItemId).max(50),
        startedAt: timestampLike,
        leaseExpiresAt: timestampLike,
        completedAt: timestampLike.nullable().optional(),
        publishedCount: nonNegativeCount.optional(),
    }).optional(),
    lastAnalyzedAt: timestampLike.nullable().optional(),
    publishedOn: timestampLike.nullable().optional(),
    errorMessage: z.string().max(1_000).nullable().optional(),
    createdOn: timestampLike.optional(),
    modifiedOn: timestampLike.optional(),
    createdBy: z.string().max(180).optional(),
    modifiedBy: z.string().max(180).optional(),
    uId: z.union([z.string().max(180), z.number().safe()]).optional(),
}).passthrough();

export const AnswerlatticeKnowledgeSourceSchema = z.object({
    id: intakeSourceId,
    ...answerlatticeIdentity,
    jobId: intakeJobId,
    type: z.enum(Object.values(ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE) as [string, ...string[]]),
    title: z.string().max(180),
    status: z.enum(['processing', 'ready', 'needs_text', 'failed']),
    originUrl: z.string().max(500).nullable().optional(),
    fileName: z.string().max(180).nullable().optional(),
    mimeType: z.string().max(120).nullable().optional(),
    contentText: z.string().max(40_000).nullable().optional(),
    contentExcerpt: z.string().max(1_200).optional(),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    tags: z.array(z.string().max(80)).max(20).optional(),
    contextKeys: z.array(z.string().max(100)).max(20).optional(),
    entityIds: z.array(z.string().max(180)).max(25).optional(),
    metadata: z.record(z.unknown()).optional(),
    processingRun: z.object({
        id: boundedId,
        status: z.enum(['processing', 'completed', 'failed']),
        startedAt: timestampLike,
        leaseExpiresAt: timestampLike,
        completedAt: timestampLike.nullable().optional(),
    }).optional(),
    errorMessage: z.string().max(1_000).nullable().optional(),
    duplicate: z.boolean().optional(),
    createdOn: timestampLike.optional(),
    modifiedOn: timestampLike.optional(),
    createdBy: z.string().max(180).optional(),
    modifiedBy: z.string().max(180).optional(),
    uId: z.union([z.string().max(180), z.number().safe()]).optional(),
}).passthrough();

export const AnswerlatticeIntakeReviewItemSchema = z.object({
    id: intakeReviewItemId,
    ...answerlatticeIdentity,
    jobId: intakeJobId,
    sourceId: intakeSourceId.nullable().optional(),
    target: z.enum(Object.values(ANSWERLATTICE_INTAKE_REVIEW_TARGET) as [string, ...string[]]),
    status: z.enum(Object.values(ANSWERLATTICE_INTAKE_REVIEW_STATUS) as [string, ...string[]]),
    title: z.string().max(180),
    body: z.string().max(12_000).optional(),
    question: z.string().max(500).optional(),
    answer: z.string().max(4_000).optional(),
    routePath: z.string().max(500).nullable().optional(),
    versionLabel: z.string().max(120).nullable().optional(),
    tags: z.array(z.string().max(80)).max(20).optional(),
    contextKeys: z.array(z.string().max(100)).max(20).optional(),
    entityIds: z.array(z.string().max(180)).max(25).optional(),
    confidenceScore: z.number().finite().min(0).max(1).optional(),
    reason: z.string().max(1_000).optional(),
    publishTargetId: boundedId.nullable().optional(),
    publishedOn: timestampLike.nullable().optional(),
    sortOrder: nonNegativeCount.optional(),
    createdOn: timestampLike.optional(),
    modifiedOn: timestampLike.optional(),
    createdBy: z.string().max(180).optional(),
    modifiedBy: z.string().max(180).optional(),
    uId: z.union([z.string().max(180), z.number().safe()]).optional(),
}).passthrough();

export const AnswerlatticeKnowledgeIntakeSummarySchema = z.object({
    id: boundedId.optional(),
    ...answerlatticeIdentity,
    activeJobId: boundedId.nullable().optional(),
    activeJobTitle: z.string().max(180).nullable().optional(),
    activeJobs: nonNegativeCount.default(0),
    recentJobs: nonNegativeCount.default(0),
    sourceCount: nonNegativeCount.optional(),
    readySources: nonNegativeCount.default(0),
    reviewItems: nonNegativeCount.default(0),
    acceptedItems: nonNegativeCount.default(0),
    publishedItems: nonNegativeCount.default(0),
    rejectedItems: nonNegativeCount.optional(),
    usageUnitsConsumed: z.number().finite().nonnegative().optional(),
    lastJobStatus: z.enum(Object.values(ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS) as [string, ...string[]]).nullable().optional(),
    latestJobStatus: z.enum(Object.values(ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS) as [string, ...string[]]).nullable().optional(),
    summaryHash: z.string().max(128).optional(),
    lastPublishedAt: timestampLike.nullable().optional(),
    lastUpdated: timestampLike.optional(),
}).passthrough();

export const AnswerlatticeKnowledgeIntakeBundleSchema = z.object({
    job: AnswerlatticeKnowledgeIntakeJobSchema.nullable(),
    sources: z.array(AnswerlatticeKnowledgeSourceSchema),
    reviewItems: z.array(AnswerlatticeIntakeReviewItemSchema),
});

function assertStoredDocumentId(data: unknown, documentId: string, label: string): void {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(`${label} data is invalid.`);
    }
    const storedId = (data as Record<string, unknown>).id;
    if (storedId !== undefined && storedId !== documentId) {
        throw new Error(`${label} identity is invalid.`);
    }
}

export function parseAnswerlatticeKnowledgeIntakeJob(data: unknown, documentId: string): AnswerlatticeKnowledgeIntakeJob {
    assertStoredDocumentId(data, documentId, 'Knowledge intake job');
    const record = data as Record<string, unknown>;
    return AnswerlatticeKnowledgeIntakeJobSchema.parse({
        ...record,
        pId: record.pId ?? PRODUCT_IDS.ANSWERLATTICE,
        id: documentId,
        readySourceCount: record.readySourceCount ?? record.sourceReadyCount ?? record.sourceCount,
    }) as AnswerlatticeKnowledgeIntakeJob;
}

export function parseAnswerlatticeKnowledgeSource(data: unknown, documentId: string): AnswerlatticeKnowledgeSource {
    assertStoredDocumentId(data, documentId, 'Knowledge source');
    const record = data as Record<string, unknown>;
    return AnswerlatticeKnowledgeSourceSchema.parse({ ...record, pId: record.pId ?? PRODUCT_IDS.ANSWERLATTICE, id: documentId }) as AnswerlatticeKnowledgeSource;
}

export function parseAnswerlatticeIntakeReviewItem(data: unknown, documentId: string): AnswerlatticeIntakeReviewItem {
    assertStoredDocumentId(data, documentId, 'Review item');
    const record = data as Record<string, unknown>;
    return AnswerlatticeIntakeReviewItemSchema.parse({ ...record, pId: record.pId ?? PRODUCT_IDS.ANSWERLATTICE, id: documentId }) as AnswerlatticeIntakeReviewItem;
}

export function parseAnswerlatticeKnowledgeIntakeSummary(data: unknown, documentId: string): AnswerlatticeKnowledgeIntakeSummary {
    assertStoredDocumentId(data, documentId, 'Knowledge intake summary');
    const record = data as Record<string, unknown>;
    return AnswerlatticeKnowledgeIntakeSummarySchema.parse({ ...record, pId: record.pId ?? PRODUCT_IDS.ANSWERLATTICE, id: documentId }) as AnswerlatticeKnowledgeIntakeSummary;
}

export function parseAnswerlatticeKnowledgeIntakeBundle(data: unknown): AnswerlatticeKnowledgeIntakeBundle {
    return AnswerlatticeKnowledgeIntakeBundleSchema.parse(data) as AnswerlatticeKnowledgeIntakeBundle;
}
