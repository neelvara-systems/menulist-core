import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { normalizeAnswerlatticePublicCitationUrl } from '@lib/answerlattice/publicAnswerContracts';
import { AnswerlatticeProcedureSchema } from '@lib/answerlattice/procedureValidation';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import {
    normalizeAnswerlatticeEntitySearchIndexId,
    normalizeAnswerlatticeResolvedEntityId,
} from '@lib/answerlattice/governanceIdBoundary';
import { normalizeAnswerlatticeCanonicalAnswerId } from '@lib/answerlattice/governanceIdBoundary';
import { normalizeAnswerlatticeReleaseId } from '@lib/answerlattice/releaseIdBoundary';
import type {
    AnswerlatticeCanonicalAnswer,
    AnswerlatticeEntity,
    AnswerlatticeEntitySearchIndex,
    AnswerlatticeRelease,
} from '@type/answerlattice';
import { ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS } from '@type/answerlattice';
import { z } from 'zod';

const PositiveScopeIdSchema = z.number().int().positive();
const ProductScopeSchema = z.object({
    pId: z.literal(PRODUCT_IDS.ANSWERLATTICE),
    tId: PositiveScopeIdSchema,
    sId: PositiveScopeIdSchema,
});
const DocumentIdSchema = z.string().trim().min(1).max(180);
const EvidenceDocumentIdSchema = DocumentIdSchema.refine(isValidFirestoreDocumentId, 'Invalid evidence document id');
const EntityIdSchema = DocumentIdSchema.refine(
    value => normalizeAnswerlatticeResolvedEntityId(value) === value,
    'Invalid Answerlattice entity id',
);
const BoundedTokenSchema = z.string().trim().min(1).max(180);
const CanonicalCitationSchema = z.object({
    id: EvidenceDocumentIdSchema,
    title: z.string().trim().min(1).max(ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_CITATION_TITLE_LENGTH),
    url: z.string()
        .trim()
        .min(1)
        .max(ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_CITATION_URL_LENGTH)
        .url()
        .refine(value => normalizeAnswerlatticePublicCitationUrl(value) !== null, 'Invalid public citation URL'),
    sourceId: EvidenceDocumentIdSchema.optional(),
}).strict();

const EntitySearchIndexSchema = ProductScopeSchema.extend({
    id: DocumentIdSchema.refine(
        value => normalizeAnswerlatticeEntitySearchIndexId(value) === value,
        'Invalid Answerlattice entity search-index id',
    ),
    entityId: EntityIdSchema,
    canonicalName: z.string().trim().min(1).max(240),
    synonyms: z.array(BoundedTokenSchema).max(50),
    normalizedTokens: z.array(BoundedTokenSchema).max(120),
    prefixTokens: z.array(BoundedTokenSchema).max(240).optional(),
    weight: z.number().finite().min(0).max(10_000),
}).passthrough();

const ReleaseSchema = ProductScopeSchema.extend({
    id: DocumentIdSchema.refine(
        value => normalizeAnswerlatticeReleaseId(value) === value,
        'Invalid Answerlattice release id',
    ),
    versionLabel: z.string().trim().min(1).max(80),
    versionNormalized: z.number().int().positive().max(999_999_999),
    releasedAt: z.unknown(),
    entityChanges: z.array(EntityIdSchema).max(500),
    status: z.enum(['pending', 'processing', 'active']),
}).passthrough();

const EntitySchema = ProductScopeSchema.extend({
    id: EntityIdSchema,
    type: z.enum(['feature', 'plan', 'role', 'workflow', 'state', 'integration', 'error']),
    name: z.string().trim().min(1).max(240),
    slug: z.string().trim().min(1).max(240),
    description: z.string().trim().max(8_000),
    status: z.enum(['active', 'deprecated', 'beta']),
    currentVersion: z.number().int().positive().max(999_999_999),
}).passthrough();

const CanonicalAnswerSchema = ProductScopeSchema.extend({
    id: DocumentIdSchema.refine(
        value => normalizeAnswerlatticeCanonicalAnswerId(value) === value,
        'Invalid Answerlattice canonical-answer id',
    ),
    title: z.string().trim().min(1).max(240),
    slug: z.string().trim().min(1).max(240),
    status: z.enum(['active', 'needs_review', 'deprecated', 'archived']),
    answerType: z.enum(['explanation', 'navigation', 'procedure']).optional(),
    scope: z.object({
        entityIds: z.array(EntityIdSchema).min(1).max(25),
        planIds: z.array(EntityIdSchema).max(50).optional(),
        roleIds: z.array(EntityIdSchema).max(50).optional(),
        stateIds: z.array(EntityIdSchema).max(50).optional(),
    }).passthrough(),
    productBinding: z.object({
        introducedInVersion: z.number().int().positive().max(999_999_999),
        lastValidatedInVersion: z.number().int().positive().max(999_999_999),
        applicableVersions: z.object({
            from: z.number().int().positive().max(999_999_999),
            to: z.number().int().positive().max(999_999_999).nullable().optional(),
        }).passthrough(),
    }).passthrough(),
    content: z.object({
        structuredSummary: z.string().trim().min(1).max(500),
        detailedExplanation: z.string().trim().min(1).max(24_000).optional(),
        edgeCases: z.string().trim().max(8_000).optional(),
        constraints: z.string().trim().max(8_000).optional(),
        procedure: AnswerlatticeProcedureSchema.optional(),
    }).passthrough(),
    evidence: z.object({
        sourceIds: z.array(EvidenceDocumentIdSchema).max(ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_SOURCE_IDS),
        citations: z.array(CanonicalCitationSchema).max(ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_PUBLIC_CITATIONS),
    }).strict().optional(),
    validation: z.object({
        confidenceScore: z.number().finite().min(0).max(1),
        validationSource: z.enum(['manual', 'signal_cluster', 'release_review']),
        lastValidatedOn: z.unknown(),
        validatedBy: z.string().trim().min(1).max(240),
    }).passthrough(),
    signalMetrics: z.object({
        linkedTicketCount: z.number().int().nonnegative(),
        linkedChatCount: z.number().int().nonnegative(),
        negativeFeedbackCount: z.number().int().nonnegative(),
        lastSignalAt: z.unknown().optional(),
    }).passthrough(),
    governance: z.object({
        driftFlag: z.boolean(),
        driftReason: z.string().trim().max(4_000).optional(),
        reviewRequired: z.boolean(),
    }).passthrough(),
}).passthrough();

const assertScope = (
    value: { pId?: unknown; tId?: unknown; sId?: unknown },
    scope: { tId: number; sId: number },
    label: string,
) => {
    if (
        value.pId !== PRODUCT_IDS.ANSWERLATTICE
        || normalizeAnswerlatticeScopeDocumentId(value.tId) !== scope.tId
        || normalizeAnswerlatticeScopeDocumentId(value.sId) !== scope.sId
    ) {
        throw new Error(`${label} is outside the requested Answerlattice workspace.`);
    }
};

export const parseAnswerlatticeRetrievalSearchIndex = (
    value: unknown,
    scope: { tId: number; sId: number },
): AnswerlatticeEntitySearchIndex => {
    const parsed = EntitySearchIndexSchema.parse(value);
    assertScope(parsed, scope, 'Entity search-index entry');
    return parsed as AnswerlatticeEntitySearchIndex;
};

export const parseAnswerlatticeRetrievalRelease = (
    value: unknown,
    scope: { tId: number; sId: number },
): AnswerlatticeRelease => {
    const parsed = ReleaseSchema.parse(value);
    assertScope(parsed, scope, 'Release');
    return parsed as AnswerlatticeRelease;
};

export const parseAnswerlatticeRetrievalEntity = (
    value: unknown,
    scope: { tId: number; sId: number },
): AnswerlatticeEntity => {
    const parsed = EntitySchema.parse(value);
    assertScope(parsed, scope, 'Entity');
    return parsed as AnswerlatticeEntity;
};

export const parseAnswerlatticeRetrievalCanonicalAnswer = (
    value: unknown,
    scope: { tId: number; sId: number },
): AnswerlatticeCanonicalAnswer => {
    const parsed = CanonicalAnswerSchema.parse(value);
    assertScope(parsed, scope, 'Canonical answer');
    return parsed as AnswerlatticeCanonicalAnswer;
};
