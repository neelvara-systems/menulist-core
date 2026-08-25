import {
    AnswerlatticeAnswerTestCaseSchema,
    type AnswerlatticeAnswerTestCase,
} from '@lib/answerlattice/answerTestContracts';
import { AnswerlatticeIntakeReviewItemSchema } from '@lib/answerlattice/knowledgeIntakeContracts';
import { AnswerlatticeProcedureSchema } from '@lib/answerlattice/procedureValidation';
import {
    ANSWERLATTICE_PROCEDURE_ACTIONS,
    type AnswerlatticeIntakeReviewItem,
} from '@type/answerlattice';
import { Type, type Schema } from '@google/genai';
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

export const canGenerateAnswerlatticeProductStarterPack = (status: unknown): boolean => (
    typeof status === 'string'
    && !['publishing', 'cancelled'].includes(status)
);

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

/**
 * Provider-side structured-output contract. The local Zod schema remains the
 * final authority; this schema prevents otherwise valid Gemini JSON from
 * drifting into extra keys, null optional fields, or missing defaulted arrays
 * before it reaches that boundary.
 */
export const ANSWERLATTICE_PRODUCT_STARTER_PACK_PROVIDER_RESPONSE_SCHEMA: Schema = {
    type: Type.OBJECT,
    required: ['candidates'],
    properties: {
        candidates: {
            type: Type.ARRAY,
            minItems: String(ANSWERLATTICE_PRODUCT_STARTER_PACK_SIZE),
            maxItems: String(ANSWERLATTICE_PRODUCT_STARTER_PACK_SIZE),
            items: {
                type: Type.OBJECT,
                required: [
                    'title',
                    'question',
                    'proposedAnswer',
                    'sourceIds',
                    'entityIds',
                    'missingEvidence',
                    'reason',
                    'expectedSource',
                    'riskLevel',
                    'requiresEscalation',
                ],
                properties: {
                    title: { type: Type.STRING },
                    question: { type: Type.STRING },
                    proposedAnswer: { type: Type.STRING },
                    sourceIds: {
                        type: Type.ARRAY,
                        minItems: '1',
                        maxItems: String(ANSWERLATTICE_PRODUCT_STARTER_PACK_MAX_SOURCE_IDS_PER_ITEM),
                        items: { type: Type.STRING },
                    },
                    entityIds: {
                        type: Type.ARRAY,
                        maxItems: '10',
                        items: { type: Type.STRING },
                    },
                    missingEvidence: {
                        type: Type.ARRAY,
                        maxItems: String(ANSWERLATTICE_PRODUCT_STARTER_PACK_MAX_MISSING_EVIDENCE),
                        items: { type: Type.STRING },
                    },
                    reason: { type: Type.STRING },
                    expectedSource: {
                        type: Type.STRING,
                        enum: ['canonical', 'escalation', 'no_answer'],
                    },
                    riskLevel: {
                        type: Type.STRING,
                        enum: ['standard', 'critical'],
                    },
                    requiresEscalation: { type: Type.BOOLEAN },
                    procedure: {
                        type: Type.OBJECT,
                        required: ['steps'],
                        properties: {
                            procedureSlug: { type: Type.STRING },
                            steps: {
                                type: Type.ARRAY,
                                minItems: '1',
                                maxItems: '12',
                                items: {
                                    type: Type.OBJECT,
                                    required: ['stepOrder', 'action', 'instruction'],
                                    properties: {
                                        stepOrder: { type: Type.INTEGER },
                                        action: {
                                            type: Type.STRING,
                                            enum: Object.values(ANSWERLATTICE_PROCEDURE_ACTIONS),
                                        },
                                        instruction: { type: Type.STRING },
                                        target: { type: Type.STRING },
                                        expectedEvent: { type: Type.STRING },
                                        expectedResult: { type: Type.STRING },
                                        troubleshootingHint: { type: Type.STRING },
                                    },
                                },
                            },
                        },
                    },
                    applicability: {
                        type: Type.OBJECT,
                        properties: {
                            path: { type: Type.STRING },
                            feature: { type: Type.STRING },
                            workflow: { type: Type.STRING },
                            plan: { type: Type.STRING },
                            role: { type: Type.STRING },
                            version: { type: Type.STRING },
                        },
                    },
                },
            },
        },
    },
};

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
