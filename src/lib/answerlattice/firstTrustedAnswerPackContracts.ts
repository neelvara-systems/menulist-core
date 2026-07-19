import {
    AnswerlatticeAnswerTestCaseSchema,
    type AnswerlatticeAnswerTestCase,
} from '@lib/answerlattice/answerTestContracts';
import { AnswerlatticeIntakeReviewItemSchema } from '@lib/answerlattice/knowledgeIntakeContracts';
import { AnswerlatticeProcedureSchema } from '@lib/answerlattice/procedureValidation';
import type { AnswerlatticeIntakeReviewItem } from '@type/answerlattice';
import { z } from 'zod';

export const ANSWERLATTICE_PRODUCT_STARTER_PACK_SIZE = 10;
export const ANSWERLATTICE_PRODUCT_STARTER_PACK_CASE_PREFIX = 'product_launch_';
export const ANSWERLATTICE_PRODUCT_STARTER_PACK_CASE_IDS = Array.from(
    { length: ANSWERLATTICE_PRODUCT_STARTER_PACK_SIZE },
    (_, index) => `${ANSWERLATTICE_PRODUCT_STARTER_PACK_CASE_PREFIX}${String(index + 1).padStart(2, '0')}`,
) as readonly string[];
export const ANSWERLATTICE_PRODUCT_STARTER_PACK_VERSION = 1;
export const ANSWERLATTICE_PRODUCT_STARTER_PACK_MAX_SOURCE_CHARS = 32_000;
export const ANSWERLATTICE_PRODUCT_STARTER_PACK_MAX_SOURCE_EXCERPT_CHARS = 1_800;
export const ANSWERLATTICE_PRODUCT_STARTER_PACK_MAX_SOURCE_IDS_PER_ITEM = 5;
export const ANSWERLATTICE_PRODUCT_STARTER_PACK_MAX_MISSING_EVIDENCE = 5;

const boundedOptionalText = (max: number) => z.string().trim().min(1).max(max).optional();

export const AnswerlatticeProductStarterPackCandidateSchema = z.object({
    title: z.string().trim().min(3).max(120),
    question: z.string().trim().min(8).max(300),
    proposedAnswer: z.string().trim().max(2_000).default(''),
    sourceIds: z.array(z.string().trim().min(1).max(180))
        .min(1)
        .max(ANSWERLATTICE_PRODUCT_STARTER_PACK_MAX_SOURCE_IDS_PER_ITEM),
    entityIds: z.array(z.string().trim().min(1).max(180)).max(10).default([]),
    missingEvidence: z.array(z.string().trim().min(1).max(240))
        .max(ANSWERLATTICE_PRODUCT_STARTER_PACK_MAX_MISSING_EVIDENCE)
        .default([]),
    reason: z.string().trim().min(3).max(500),
    expectedSource: z.enum(['canonical', 'escalation', 'no_answer']),
    riskLevel: z.enum(['standard', 'critical']),
    requiresEscalation: z.boolean().default(false),
    procedure: AnswerlatticeProcedureSchema.optional(),
    applicability: z.object({
        path: boundedOptionalText(500),
        feature: boundedOptionalText(100),
        workflow: boundedOptionalText(100),
        plan: boundedOptionalText(100),
        role: boundedOptionalText(100),
        version: boundedOptionalText(100),
    }).strict().default({}),
}).strict();

export type AnswerlatticeProductStarterPackCandidate = z.infer<typeof AnswerlatticeProductStarterPackCandidateSchema>;

export const AnswerlatticeProductStarterPackModelResponseSchema = z.object({
    candidates: z.array(AnswerlatticeProductStarterPackCandidateSchema)
        .length(ANSWERLATTICE_PRODUCT_STARTER_PACK_SIZE),
}).strict();

export const AnswerlatticeProductStarterPackRequestSchema = z.object({
    requestId: z.string().trim().min(8).max(100).regex(/^[a-zA-Z0-9_-]+$/),
}).strict();

export const AnswerlatticeProductStarterPackResultSchema = z.object({
    jobId: z.string().trim().min(1).max(180),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    cached: z.boolean(),
    cases: z.array(AnswerlatticeAnswerTestCaseSchema)
        .length(ANSWERLATTICE_PRODUCT_STARTER_PACK_SIZE),
    reviewItems: z.array(AnswerlatticeIntakeReviewItemSchema)
        .length(ANSWERLATTICE_PRODUCT_STARTER_PACK_SIZE),
    usage: z.object({
        unitsConsumed: z.number().finite().nonnegative(),
        remainingCredits: z.number().finite().nonnegative().nullable(),
    }).strict(),
}).strict();

export type AnswerlatticeProductStarterPackResult = Omit<
    z.infer<typeof AnswerlatticeProductStarterPackResultSchema>,
    'cases' | 'reviewItems'
> & {
    cases: AnswerlatticeAnswerTestCase[];
    reviewItems: AnswerlatticeIntakeReviewItem[];
};

export const AnswerlatticeProductStarterPackResponseSchema = z.object({
    pack: AnswerlatticeProductStarterPackResultSchema,
}).strict();

const ANSWERLATTICE_PRODUCT_STARTER_PACK_CASE_ID_SET = new Set(
    ANSWERLATTICE_PRODUCT_STARTER_PACK_CASE_IDS,
);

export const isAnswerlatticeProductStarterPackCaseId = (caseId: unknown): boolean => (
    typeof caseId === 'string' && ANSWERLATTICE_PRODUCT_STARTER_PACK_CASE_ID_SET.has(caseId)
);
