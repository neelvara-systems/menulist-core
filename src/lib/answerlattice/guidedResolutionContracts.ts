import { z } from 'zod';

export const ANSWERLATTICE_GUIDANCE_CONTRACT_VERSION = 'answerlattice.guidance.v1';
export const ANSWERLATTICE_GUIDANCE_MAX_BODY_BYTES = 4 * 1024;
export const ANSWERLATTICE_GUIDANCE_SEMANTIC_ID_PATTERN = /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/;

const SemanticIdSchema = z.string()
    .trim()
    .min(1)
    .max(120)
    .regex(ANSWERLATTICE_GUIDANCE_SEMANTIC_ID_PATTERN);

export const AnswerlatticeGuidanceOutcomeSchema = z.object({
    contractVersion: z.literal(ANSWERLATTICE_GUIDANCE_CONTRACT_VERSION),
    requestId: z.string().regex(/^[A-Za-z0-9_-]{8,120}$/),
    procedureSessionId: z.string().regex(/^[A-Za-z0-9_-]{8,120}$/),
    searchHistoryId: z.string().trim().min(1).max(180),
    procedureSlug: SemanticIdSchema.optional(),
    outcome: z.enum(['completed', 'abandoned', 'escalated', 'target_missing']),
    totalSteps: z.number().int().min(1).max(12),
    completedSteps: z.number().int().min(0).max(12),
    blockedStepOrder: z.number().int().min(1).max(12).optional(),
    targetId: SemanticIdSchema.optional(),
    expectedEvent: SemanticIdSchema.optional(),
    widgetSessionId: z.string().regex(/^[A-Za-z0-9_-]{8,120}$/),
    contextKey: SemanticIdSchema.optional(),
}).strict().superRefine((value, context) => {
    if (value.completedSteps > value.totalSteps) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'completedSteps cannot exceed totalSteps',
            path: ['completedSteps'],
        });
    }
    if (value.blockedStepOrder && value.blockedStepOrder > value.totalSteps) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'blockedStepOrder cannot exceed totalSteps',
            path: ['blockedStepOrder'],
        });
    }
    if (value.outcome === 'completed' && value.completedSteps !== value.totalSteps) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'completed outcomes require every step to be completed',
            path: ['completedSteps'],
        });
    }
    if (value.outcome !== 'completed' && value.blockedStepOrder === undefined) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'incomplete outcomes require the blocked step',
            path: ['blockedStepOrder'],
        });
    }
    if (value.outcome === 'target_missing' && value.targetId === undefined) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'target_missing outcomes require the semantic target',
            path: ['targetId'],
        });
    }
});

export type AnswerlatticeGuidanceOutcome = z.infer<typeof AnswerlatticeGuidanceOutcomeSchema>;

export const buildAnswerlatticeGuidanceOutcomeIdempotencyKey = (
    outcome: Pick<AnswerlatticeGuidanceOutcome, 'procedureSessionId' | 'searchHistoryId'>,
): string => `guided_resolution:${outcome.searchHistoryId}:${outcome.procedureSessionId}`;
