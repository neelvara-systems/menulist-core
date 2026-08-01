import { z } from 'zod';

export const ANSWERLATTICE_ANSWER_TRACE_RECENT_SCAN_LIMIT = 30;
export const ANSWERLATTICE_ANSWER_TRACE_RECENT_RESULT_LIMIT = 12;
export const ANSWERLATTICE_ANSWER_TRACE_MAX_ANSWER_CHARS = 6_000;
export const ANSWERLATTICE_ANSWER_TRACE_RESPONSE_MAX_BYTES = 1024 * 1024;

export const ANSWERLATTICE_ANSWER_TRACE_REVIEW_SIGNALS = [
    'canonical_miss',
    'fallback_used',
    'low_confidence',
    'negative_feedback',
    'not_resolved',
    'escalated',
    'drifted_answer',
    'no_answer',
] as const;

const answerTraceReviewSignalSchema = z.enum(ANSWERLATTICE_ANSWER_TRACE_REVIEW_SIGNALS);
const answerTraceDocumentIdSchema = z.string().trim().min(1).max(180);
const answerTraceCitationSchema = z.object({
    id: answerTraceDocumentIdSchema,
    title: z.string().trim().min(1).max(240),
    url: z.string().url().max(500),
}).strict();

export const AnswerlatticeAnswerTraceSchema = z.object({
    id: answerTraceDocumentIdSchema,
    createdAt: z.string().datetime({ offset: true }),
    question: z.string().trim().min(1).max(500),
    answer: z.string().max(ANSWERLATTICE_ANSWER_TRACE_MAX_ANSWER_CHARS),
    answerSource: z.enum(['canonical', 'faq', 'rag', 'cache', 'empty', 'unknown']),
    answerType: z.enum(['explanation', 'navigation', 'procedure', 'faq']).nullable(),
    canonical: z.boolean(),
    canonicalAnswerId: answerTraceDocumentIdSchema.nullable(),
    faqAnswerId: answerTraceDocumentIdSchema.nullable(),
    matchedEntityIds: z.array(answerTraceDocumentIdSchema).max(20),
    citations: z.array(answerTraceCitationSchema).max(8),
    fallbackReason: z.string().trim().min(1).max(240).nullable(),
    confidence: z.enum(['high', 'medium', 'low', 'none']).nullable(),
    mountContext: z.enum(['help_center', 'widget', 'api']).nullable(),
    clarificationRequired: z.array(z.enum(['plan', 'role', 'state'])).max(3),
    sourceVersions: z.object({
        canonical: z.number().int().positive().optional(),
        kb: z.number().int().positive().optional(),
    }).strict(),
    userFeedback: z.enum(['good', 'bad', 'not_resolved']).nullable(),
    escalationTicketId: answerTraceDocumentIdSchema.nullable(),
    drifted: z.boolean(),
    reviewSignals: z.array(answerTraceReviewSignalSchema)
        .min(0)
        .max(ANSWERLATTICE_ANSWER_TRACE_REVIEW_SIGNALS.length),
}).strict().superRefine((trace, context) => {
    if (new Set(trace.matchedEntityIds).size !== trace.matchedEntityIds.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Matched entity IDs must be unique.',
            path: ['matchedEntityIds'],
        });
    }
    if (new Set(trace.reviewSignals).size !== trace.reviewSignals.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Review signals must be unique.',
            path: ['reviewSignals'],
        });
    }
});

export const AnswerlatticeAnswerTraceResponseSchema = z.object({
    mode: z.enum(['exact', 'recent']),
    scannedCount: z.number().int().nonnegative().max(ANSWERLATTICE_ANSWER_TRACE_RECENT_SCAN_LIMIT),
    windowLimited: z.boolean(),
    traces: z.array(AnswerlatticeAnswerTraceSchema)
        .max(ANSWERLATTICE_ANSWER_TRACE_RECENT_RESULT_LIMIT),
}).strict().superRefine((response, context) => {
    if (response.traces.length > response.scannedCount) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Answer trace results cannot exceed the scanned document count.',
            path: ['traces'],
        });
    }
    if (response.mode === 'exact') {
        if (response.scannedCount > 1 || response.traces.length > 1 || response.windowLimited) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Exact trace responses may contain at most one result.',
            });
        }
    }
    if (response.mode === 'recent'
        && response.windowLimited !== (response.scannedCount === ANSWERLATTICE_ANSWER_TRACE_RECENT_SCAN_LIMIT)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Recent trace window state must match the scanned document count.',
            path: ['windowLimited'],
        });
    }
    if (response.mode === 'recent' && response.traces.some(trace => trace.reviewSignals.length === 0)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Recent trace responses may contain review candidates only.',
            path: ['traces'],
        });
    }
});

export type AnswerlatticeAnswerTrace = z.infer<typeof AnswerlatticeAnswerTraceSchema>;
export type AnswerlatticeAnswerTraceResponse = z.infer<typeof AnswerlatticeAnswerTraceResponseSchema>;
