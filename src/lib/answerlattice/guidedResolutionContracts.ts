import { z } from 'zod';
import { AnswerlatticeProcedureSchema } from './procedureValidation';

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

export type AnswerlatticeGuidanceHistoryEvidence = {
    contextKey?: unknown;
    guidedProcedure?: unknown;
    widgetSessionId?: unknown;
};

export type AnswerlatticeGuidanceOutcomeEvidence = {
    contextKey: string | null;
    expectedEvent: string | null;
    procedureSlug: string | null;
    targetId: string | null;
};

const normalizeOptionalSemanticId = (value: unknown): string | null => {
    const parsed = SemanticIdSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
};

export const matchAnswerlatticeGuidanceOutcomeToHistory = (
    outcome: AnswerlatticeGuidanceOutcome,
    history: AnswerlatticeGuidanceHistoryEvidence,
): AnswerlatticeGuidanceOutcomeEvidence | null => {
    const procedureResult = AnswerlatticeProcedureSchema.safeParse(history.guidedProcedure);
    if (!procedureResult.success) return null;
    const procedure = procedureResult.data;
    const procedureSlug = procedure.procedureSlug || null;
    if ((outcome.procedureSlug || null) !== procedureSlug) return null;
    if (outcome.totalSteps !== procedure.steps.length) return null;

    const storedWidgetSessionId = typeof history.widgetSessionId === 'string'
        ? history.widgetSessionId.trim()
        : '';
    if (!/^[A-Za-z0-9_-]{8,120}$/.test(storedWidgetSessionId)) return null;
    if (outcome.widgetSessionId !== storedWidgetSessionId) return null;

    const storedContextKey = normalizeOptionalSemanticId(history.contextKey);
    if ((outcome.contextKey || null) !== storedContextKey) return null;

    const evidenceStepOrder = outcome.outcome === 'completed'
        ? procedure.steps.length
        : outcome.blockedStepOrder;
    const evidenceStep = procedure.steps.find((step) => step.stepOrder === evidenceStepOrder);
    if (!evidenceStep) return null;
    if (outcome.outcome !== 'completed' && outcome.completedSteps !== evidenceStep.stepOrder - 1) return null;

    const targetId = evidenceStep.target || null;
    const expectedEvent = evidenceStep.expectedEvent || null;
    if ((outcome.targetId || null) !== targetId) return null;
    if ((outcome.expectedEvent || null) !== expectedEvent) return null;
    if (outcome.outcome === 'target_missing' && !targetId) return null;

    return {
        contextKey: storedContextKey,
        expectedEvent,
        procedureSlug,
        targetId,
    };
};

export const buildAnswerlatticeGuidanceOutcomeIdempotencyKey = (
    outcome: Pick<AnswerlatticeGuidanceOutcome, 'procedureSessionId' | 'searchHistoryId'>,
): string => `guided_resolution:${outcome.searchHistoryId}:${outcome.procedureSessionId}`;
