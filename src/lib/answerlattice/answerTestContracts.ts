import { AnswerlatticeContextSchema, type ValidatedContextPayload } from '@lib/validation/contextSchema';
import { z } from 'zod';

export const ANSWERLATTICE_ANSWER_TEST_MAX_CASES = 100;
export const ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES = 25;
export const ANSWERLATTICE_ANSWER_TEST_MAX_RUNS = 10;
export const ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES = 10;
export const ANSWERLATTICE_ANSWER_TEST_MAX_RESERVATIONS = 5;
export const ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION = 1;

export const ANSWERLATTICE_ANSWER_TEST_MODES = ['canonical_only', 'full_runtime'] as const;
export type AnswerlatticeAnswerTestMode = typeof ANSWERLATTICE_ANSWER_TEST_MODES[number];

export const ANSWERLATTICE_ANSWER_TEST_SOURCES = ['canonical', 'faq', 'rag', 'escalation', 'no_answer'] as const;
export type AnswerlatticeAnswerTestSource = typeof ANSWERLATTICE_ANSWER_TEST_SOURCES[number];

export const AnswerlatticeAnswerTestCaseSchema = z.object({
    id: z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    title: z.string().trim().min(1).max(120),
    query: z.string().trim().min(2).max(500),
    context: AnswerlatticeContextSchema.optional(),
    expected: z.object({
        source: z.enum(ANSWERLATTICE_ANSWER_TEST_SOURCES),
        answerId: z.string().trim().min(1).max(160).optional(),
        faqId: z.string().trim().min(1).max(160).optional(),
        minimumConfidence: z.enum(['high', 'medium', 'low', 'none']).optional(),
        mustInclude: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
        mustNotInclude: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
    }).strict(),
    relatedEntityIds: z.array(z.string().trim().min(1).max(160)).max(10).default([]),
    active: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).strict();

export type AnswerlatticeAnswerTestCase = Omit<z.infer<typeof AnswerlatticeAnswerTestCaseSchema>, 'context'> & {
    context?: ValidatedContextPayload;
};

export const AnswerlatticeAnswerTestSaveSchema = z.object({
    revision: z.number().int().min(0),
    cases: z.array(AnswerlatticeAnswerTestCaseSchema).max(ANSWERLATTICE_ANSWER_TEST_MAX_CASES),
}).strict();

export const AnswerlatticeAnswerTestRunRequestSchema = z.object({
    requestId: z.string().trim().min(8).max(100).regex(/^[a-zA-Z0-9_-]+$/),
    caseIds: z.array(z.string().trim().min(1).max(80)).max(ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES).optional(),
    mode: z.enum(ANSWERLATTICE_ANSWER_TEST_MODES).default('canonical_only'),
}).strict();

export const AnswerlatticeAnswerTestReleaseCheckSchema = z.object({
    requestId: z.string().trim().min(8).max(100).regex(/^[a-zA-Z0-9_-]+$/),
    releaseId: z.string().trim().min(1).max(160),
    mode: z.enum(ANSWERLATTICE_ANSWER_TEST_MODES).default('canonical_only'),
}).strict();

export const AnswerlatticeAnswerTestRollbackSchema = z.object({
    answerId: z.string().trim().min(1).max(160),
    auditLogId: z.string().trim().min(1).max(160),
    reason: z.string().trim().min(8).max(500),
}).strict();

export type AnswerlatticeAnswerTestCaseResult = {
    caseId: string;
    title: string;
    passed: boolean;
    source: AnswerlatticeAnswerTestSource;
    answerId?: string;
    faqId?: string;
    relatedEntityIds: string[];
    confidence?: 'high' | 'medium' | 'low' | 'none';
    answerPreview: string;
    failures: string[];
    aiProviderUsed: boolean;
    durationMs: number;
};

export type AnswerlatticeAnswerTestRun = {
    id: string;
    mode: AnswerlatticeAnswerTestMode;
    status: 'passed' | 'failed' | 'partial';
    startedAt: string;
    completedAt: string;
    createdBy: string;
    caseCount: number;
    passedCount: number;
    failedCount: number;
    providerCaseCount: number;
    durationMs: number;
    releaseId?: string;
    releaseVersion?: string;
    results: AnswerlatticeAnswerTestCaseResult[];
};

export type AnswerlatticeAnswerTestRunReservation = {
    id: string;
    createdBy: string;
    startedAt: string;
    expiresAt: string;
};

export type AnswerlatticeAnswerTestSummary = {
    id: string;
    schemaVersion: number;
    pId: 'AL';
    tId: number;
    sId: number;
    revision: number;
    cases: AnswerlatticeAnswerTestCase[];
    runs: AnswerlatticeAnswerTestRun[];
    reservations: AnswerlatticeAnswerTestRunReservation[];
    updatedAt: string | null;
    updatedBy: string | null;
};

export const getAnswerlatticeAnswerTestSummaryId = (tId: number, sId: number) => (
    `answerTests_${Number(tId)}_${Number(sId)}`
);

export const createEmptyAnswerlatticeAnswerTestSummary = (
    tId: number,
    sId: number,
): AnswerlatticeAnswerTestSummary => ({
    id: getAnswerlatticeAnswerTestSummaryId(tId, sId),
    schemaVersion: ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION,
    pId: 'AL',
    tId,
    sId,
    revision: 0,
    cases: [],
    runs: [],
    reservations: [],
    updatedAt: null,
    updatedBy: null,
});
