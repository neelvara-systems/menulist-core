import { z } from 'zod';

import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticePublicCitationUrl } from '@lib/answerlattice/publicAnswerContracts';
import { AnswerlatticeProcedureSchema } from '@lib/answerlattice/procedureValidation';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS } from '@type/answerlattice';

import {
    normalizeAnswerlatticeCanonicalAnswerId,
    normalizeAnswerlatticeMutationProposalId,
    normalizeAnswerlatticeResolvedEntityId,
} from './governanceIdBoundary';

const FirestoreDocumentIdSchema = z.string()
    .min(1)
    .max(180)
    .refine(value => value.trim() === value, 'Document ids must not contain surrounding whitespace');
const EvidenceDocumentIdSchema = FirestoreDocumentIdSchema.refine(isValidFirestoreDocumentId, 'Invalid evidence document id');
const CanonicalAnswerIdSchema = FirestoreDocumentIdSchema.refine(
    value => normalizeAnswerlatticeCanonicalAnswerId(value) === value,
    'Invalid canonical answer id',
);
const MutationProposalIdSchema = FirestoreDocumentIdSchema.refine(
    value => normalizeAnswerlatticeMutationProposalId(value) === value,
    'Invalid mutation proposal id',
);
const ResolvedEntityIdSchema = FirestoreDocumentIdSchema.refine(
    value => normalizeAnswerlatticeResolvedEntityId(value) === value,
    'Invalid resolved entity id',
);

const uniqueIds = (values: string[]) => new Set(values).size === values.length;

export const AnswerlatticeGovernanceEntitySelectionSchema = z.array(ResolvedEntityIdSchema)
    .min(1)
    .max(25)
    .refine(uniqueIds, 'Entity ids must be unique');

const OptionalScopeIdsSchema = z.array(ResolvedEntityIdSchema)
    .max(50)
    .refine(uniqueIds, 'Scope ids must be unique')
    .optional();

const PublicCitationUrlSchema = z.string()
    .trim()
    .min(1)
    .max(ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_CITATION_URL_LENGTH)
    .url()
    .refine(value => normalizeAnswerlatticePublicCitationUrl(value) !== null, 'Citation URL must be a public HTTP or HTTPS URL without credentials');

export const AnswerlatticeCanonicalCitationInputSchema = z.object({
    id: EvidenceDocumentIdSchema.optional(),
    title: z.string().trim().min(1).max(ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_CITATION_TITLE_LENGTH),
    url: PublicCitationUrlSchema,
    sourceId: EvidenceDocumentIdSchema.optional(),
}).strict();

export const AnswerlatticeCanonicalEvidenceSchema = z.object({
    sourceIds: z.array(EvidenceDocumentIdSchema)
        .max(ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_SOURCE_IDS)
        .default([]),
    citations: z.array(AnswerlatticeCanonicalCitationInputSchema)
        .max(ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_PUBLIC_CITATIONS)
        .default([]),
}).strict();

export const AnswerlatticeCanonicalScopeSchema = z.object({
    entityIds: z.array(ResolvedEntityIdSchema)
        .min(1)
        .max(25)
        .refine(uniqueIds, 'Entity ids must be unique'),
    planIds: OptionalScopeIdsSchema,
    roleIds: OptionalScopeIdsSchema,
    stateIds: OptionalScopeIdsSchema,
}).strict();

export const AnswerlatticeCanonicalProductBindingSchema = z.object({
    introducedInVersion: z.number().int().positive().max(999_999_999),
    lastValidatedInVersion: z.number().int().positive().max(999_999_999),
    applicableVersions: z.object({
        from: z.number().int().positive().max(999_999_999),
        to: z.number().int().positive().max(999_999_999).nullable().optional(),
    }).strict(),
}).strict().superRefine((binding, context) => {
    if (binding.lastValidatedInVersion < binding.introducedInVersion) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Last validated version cannot precede the introduced version',
            path: ['lastValidatedInVersion'],
        });
    }
    if (
        binding.applicableVersions.to != null
        && binding.applicableVersions.to < binding.applicableVersions.from
    ) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Applicable version end cannot precede its start',
            path: ['applicableVersions', 'to'],
        });
    }
});

export const AnswerlatticeCanonicalContentSchema = z.object({
    structuredSummary: z.string().trim().min(1).max(500),
    detailedExplanation: z.string().trim().min(1).max(24_000),
    edgeCases: z.string().trim().max(8_000).optional(),
    constraints: z.string().trim().max(8_000).optional(),
    procedure: AnswerlatticeProcedureSchema.optional(),
}).strict();

export const AnswerlatticeCanonicalProposalAnswerSchema = z.object({
    title: z.string().trim().min(1).max(180),
    status: z.enum(['active', 'needs_review', 'deprecated', 'archived']),
    answerType: z.enum(['explanation', 'navigation', 'procedure']).default('explanation'),
    scope: AnswerlatticeCanonicalScopeSchema,
    productBinding: AnswerlatticeCanonicalProductBindingSchema,
    content: AnswerlatticeCanonicalContentSchema,
    evidence: AnswerlatticeCanonicalEvidenceSchema.optional(),
}).strict().superRefine((answer, context) => {
    if (answer.answerType === 'procedure' && !answer.content.procedure) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Procedure answers require structured procedure steps.',
            path: ['content', 'procedure'],
        });
    }
    if (answer.answerType !== 'procedure' && answer.content.procedure) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Structured procedure steps require answerType procedure.',
            path: ['answerType'],
        });
    }
});

export type AnswerlatticeCanonicalProposalAnswer = {
    title: string;
    status: 'active' | 'needs_review' | 'deprecated' | 'archived';
    answerType: 'explanation' | 'navigation' | 'procedure';
    scope: {
        entityIds: string[];
        planIds?: string[];
        roleIds?: string[];
        stateIds?: string[];
    };
    productBinding: {
        introducedInVersion: number;
        lastValidatedInVersion: number;
        applicableVersions: {
            from: number;
            to?: number | null;
        };
    };
    content: {
        structuredSummary: string;
        detailedExplanation: string;
        edgeCases?: string;
        constraints?: string;
        procedure?: z.infer<typeof AnswerlatticeProcedureSchema>;
    };
    evidence?: {
        sourceIds: string[];
        citations: Array<{
            id?: string;
            title: string;
            url: string;
            sourceId?: string;
        }>;
    };
};

const StoredOpaqueRequestIdSchema = z.string().min(8).max(80);

const AnswerlatticeMutationSuggestedChangeSchema = z.object({
    structuredSummary: z.string().trim().min(1).max(500).optional(),
    detailedExplanation: z.string().trim().min(1).max(24_000).optional(),
    edgeCases: z.string().trim().max(8_000).optional(),
    constraints: z.string().trim().max(8_000).optional(),
    procedure: AnswerlatticeProcedureSchema.optional(),
    draftTitle: z.string().trim().min(1).max(180).optional(),
    draftStatus: z.enum(['pending', 'generated', 'failed']).optional(),
    draftSource: z.enum([
        'signal_cluster',
        'recurring_fallback',
        'onboarding_bootstrap',
        'ticket_resolution',
        'knowledge_intake',
        'manual_authoring',
    ]).optional(),
    draftGeneratedAt: z.unknown().optional(),
    draftSignalExamples: z.array(z.string().trim().min(1).max(1_000)).max(5).optional(),
    draftEntityContext: z.string().trim().max(500).optional(),
    draftPromptVersion: z.string().trim().max(120).optional(),
    draftProcessingRun: z.object({
        id: StoredOpaqueRequestIdSchema,
        startedAt: z.unknown(),
        leaseExpiresAt: z.unknown(),
    }).strict().nullable().optional(),
    lastDraftRequestId: StoredOpaqueRequestIdSchema.optional(),
    reviewReason: z.string().trim().max(4_000).optional(),
    rollbackAuditLogId: MutationProposalIdSchema.optional(),
    proposedContent: AnswerlatticeCanonicalContentSchema.optional(),
    proposedScope: AnswerlatticeCanonicalScopeSchema.optional(),
    proposedProductBinding: AnswerlatticeCanonicalProductBindingSchema.optional(),
    proposedStatus: z.enum(['active', 'needs_review', 'deprecated', 'archived']).optional(),
    proposedAnswerType: z.enum(['explanation', 'navigation', 'procedure']).optional(),
    proposedEvidence: AnswerlatticeCanonicalEvidenceSchema.optional(),
    baseAnswerFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    sourceTicketIds: z.array(FirestoreDocumentIdSchema).max(100).optional(),
    sourceTicketCount: z.number().int().nonnegative().max(1_000_000).optional(),
    resolutionContext: z.string().trim().max(24_000).optional(),
    extractionConfidence: z.number().min(0).max(1).optional(),
}).passthrough();

/**
 * Stored proposals are a trust boundary because they may have been created by
 * an older client, a scheduler, or an import pipeline. Governance validates the
 * fields it consumes before applying a proposal to canonical truth.
 */
export const AnswerlatticeStoredMutationProposalSchema = z.object({
    id: MutationProposalIdSchema,
    pId: z.literal(PRODUCT_IDS.ANSWERLATTICE),
    tId: z.number().int().positive(),
    sId: z.number().int().positive(),
    targetAnswerId: z.string().max(180).refine(
        value => value === '' || normalizeAnswerlatticeCanonicalAnswerId(value) === value,
        'Invalid target answer id',
    ),
    relatedEntityIds: z.array(ResolvedEntityIdSchema).min(1).max(25),
    mutationType: z.enum(['content_refinement', 'scope_adjustment', 'version_update', 'new_answer_required']),
    signalSummary: z.object({
        ticketCount: z.number().int().nonnegative().max(1_000_000),
        chatCount: z.number().int().nonnegative().max(1_000_000),
        escalationCount: z.number().int().nonnegative().max(1_000_000).optional(),
        negativeFeedbackRate: z.number().min(0).max(1),
        exampleReferences: z.array(z.string().trim().min(1).max(1_000)).max(20),
    }).passthrough(),
    suggestedChange: AnswerlatticeMutationSuggestedChangeSchema,
    confidenceScore: z.number().min(0).max(1),
    status: z.enum(['pending_review', 'approved', 'rejected', 'implemented']),
    implementedAnswerId: CanonicalAnswerIdSchema.optional(),
    requestId: StoredOpaqueRequestIdSchema.optional(),
    requestFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    implementedOn: z.unknown().optional(),
    impactTracked: z.boolean().optional(),
    impactResult: z.object({
        preSignalCount: z.number().int().nonnegative().max(1_000_000),
        postSignalCount: z.number().int().nonnegative().max(1_000_000),
        improvementPercent: z.number().int().min(-10_000).max(100),
        trackedAt: z.unknown(),
    }).strict().optional(),
}).passthrough();

const RequestIdSchema = z.string().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/);

export const AnswerlatticeGovernanceEditedContentSchema = z.object({
    title: z.string().trim().min(1).max(180).optional(),
    structuredSummary: z.string().trim().min(1).max(500).optional(),
    detailedExplanation: z.string().trim().min(1).max(24_000).optional(),
    edgeCases: z.string().trim().max(8_000).optional(),
    constraints: z.string().trim().max(8_000).optional(),
    citations: z.array(AnswerlatticeCanonicalCitationInputSchema)
        .max(ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_PUBLIC_CITATIONS)
        .optional(),
}).strict();

export type AnswerlatticeGovernanceEditedContent = z.infer<typeof AnswerlatticeGovernanceEditedContentSchema>;

export type AnswerlatticeGovernanceAction =
    | { action: 'propose_create'; requestId: string; answer: AnswerlatticeCanonicalProposalAnswer }
    | { action: 'propose_update'; requestId: string; answerId: string; answer: AnswerlatticeCanonicalProposalAnswer }
    | {
        action: 'approve_proposal';
        proposalId: string;
        editedContent?: AnswerlatticeGovernanceEditedContent;
        entityIds?: string[];
    }
    | { action: 'reject_proposal'; proposalId: string }
    | { action: 'mark_implemented'; proposalId: string }
    | { action: 'evaluate_drift' }
    | { action: 'validate_drift'; answerId: string }
    | { action: 'merge_entities'; requestId: string; survivorId: string; mergedId: string };

const AnswerlatticeGovernanceActionBaseSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('propose_create'),
        requestId: RequestIdSchema,
        answer: AnswerlatticeCanonicalProposalAnswerSchema,
    }).strict(),
    z.object({
        action: z.literal('propose_update'),
        requestId: RequestIdSchema,
        answerId: CanonicalAnswerIdSchema,
        answer: AnswerlatticeCanonicalProposalAnswerSchema,
    }).strict(),
    z.object({
        action: z.literal('approve_proposal'),
        proposalId: MutationProposalIdSchema,
        editedContent: AnswerlatticeGovernanceEditedContentSchema.optional(),
        entityIds: AnswerlatticeGovernanceEntitySelectionSchema.optional(),
    }).strict(),
    z.object({
        action: z.literal('reject_proposal'),
        proposalId: MutationProposalIdSchema,
    }).strict(),
    z.object({
        action: z.literal('mark_implemented'),
        proposalId: MutationProposalIdSchema,
    }).strict(),
    z.object({
        action: z.literal('evaluate_drift'),
    }).strict(),
    z.object({
        action: z.literal('validate_drift'),
        answerId: CanonicalAnswerIdSchema,
    }).strict(),
    z.object({
        action: z.literal('merge_entities'),
        requestId: RequestIdSchema,
        survivorId: ResolvedEntityIdSchema,
        mergedId: ResolvedEntityIdSchema,
    }).strict(),
]);

export const AnswerlatticeGovernanceActionSchema = AnswerlatticeGovernanceActionBaseSchema.superRefine(
    (value, context) => {
        if (value.action === 'merge_entities' && value.survivorId === value.mergedId) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Entity ids must be different',
                path: ['mergedId'],
            });
        }
    },
) as z.ZodType<AnswerlatticeGovernanceAction>;

export type AnswerlatticeGovernanceActionResult = {
    success: true;
    action: AnswerlatticeGovernanceAction['action'];
    proposalId?: string;
    answerId?: string;
    status?: 'pending_review' | 'approved' | 'rejected' | 'implemented';
    created?: boolean;
    transferredAnswers?: number;
    transferredArticles?: number;
    transferredFaqs?: number;
    transferredRelations?: number;
    transferredSurfaces?: number;
    evaluatedAnswers?: number;
    updatedAnswers?: number;
};

export const AnswerlatticeGovernanceActionResultSchema = z.object({
    success: z.literal(true),
    action: z.enum([
        'propose_create',
        'propose_update',
        'approve_proposal',
        'reject_proposal',
        'mark_implemented',
        'evaluate_drift',
        'validate_drift',
        'merge_entities',
    ]),
    proposalId: MutationProposalIdSchema.optional(),
    answerId: CanonicalAnswerIdSchema.optional(),
    status: z.enum(['pending_review', 'approved', 'rejected', 'implemented']).optional(),
    created: z.boolean().optional(),
    transferredAnswers: z.number().int().nonnegative().optional(),
    transferredArticles: z.number().int().nonnegative().optional(),
    transferredFaqs: z.number().int().nonnegative().optional(),
    transferredRelations: z.number().int().nonnegative().optional(),
    transferredSurfaces: z.number().int().nonnegative().optional(),
    evaluatedAnswers: z.number().int().nonnegative().optional(),
    updatedAnswers: z.number().int().nonnegative().optional(),
}).strict() as z.ZodType<AnswerlatticeGovernanceActionResult>;
