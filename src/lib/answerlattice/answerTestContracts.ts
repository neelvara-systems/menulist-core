import { AnswerlatticeContextSchema, type ValidatedContextPayload } from '@lib/validation/contextSchema';
import { z } from 'zod';

export const ANSWERLATTICE_ANSWER_TEST_MAX_CASES = 100;
export const ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES = 25;
export const ANSWERLATTICE_ANSWER_TEST_MAX_RUNS = 10;
export const ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES = 10;
export const ANSWERLATTICE_ANSWER_TEST_MAX_RESERVATIONS = 5;
export const ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION = 3;
export const ANSWERLATTICE_ANSWER_TEST_SOURCE_VERSION_KEYS = [
    'canonical',
    'kb',
    'docsNav',
    'entities',
    'entityRelations',
    'releases',
] as const;

export type AnswerlatticeAnswerTestSourceVersionKey = typeof ANSWERLATTICE_ANSWER_TEST_SOURCE_VERSION_KEYS[number];
export type AnswerlatticeAnswerTestSourceVersions = Record<AnswerlatticeAnswerTestSourceVersionKey, number>;

export const normalizeAnswerlatticeAnswerTestSourceVersions = (
    value: unknown,
): AnswerlatticeAnswerTestSourceVersions | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const normalized = {} as AnswerlatticeAnswerTestSourceVersions;
    for (const key of ANSWERLATTICE_ANSWER_TEST_SOURCE_VERSION_KEYS) {
        const rawVersion = record[key];
        const version = typeof rawVersion === 'number'
            ? rawVersion
            : typeof rawVersion === 'string' && /^(0|[1-9]\d*)$/.test(rawVersion)
                ? Number(rawVersion)
                : Number.NaN;
        if (!Number.isSafeInteger(version) || version < 0) return null;
        normalized[key] = version;
    }
    return normalized;
};

export const answerlatticeAnswerTestSourceVersionsEqual = (
    left: unknown,
    right: unknown,
): boolean => {
    const normalizedLeft = normalizeAnswerlatticeAnswerTestSourceVersions(left);
    const normalizedRight = normalizeAnswerlatticeAnswerTestSourceVersions(right);
    return Boolean(
        normalizedLeft
        && normalizedRight
        && ANSWERLATTICE_ANSWER_TEST_SOURCE_VERSION_KEYS.every(
            key => normalizedLeft[key] === normalizedRight[key],
        )
    );
};

export const ANSWERLATTICE_ANSWER_TEST_MODES = ['canonical_only', 'full_runtime'] as const;
export type AnswerlatticeAnswerTestMode = typeof ANSWERLATTICE_ANSWER_TEST_MODES[number];

export const ANSWERLATTICE_ANSWER_TEST_SOURCES = ['canonical', 'faq', 'rag', 'escalation', 'no_answer'] as const;
export type AnswerlatticeAnswerTestSource = typeof ANSWERLATTICE_ANSWER_TEST_SOURCES[number];

export const ANSWERLATTICE_ANSWER_TEST_RISK_LEVELS = ['standard', 'critical'] as const;
export type AnswerlatticeAnswerTestRiskLevel = typeof ANSWERLATTICE_ANSWER_TEST_RISK_LEVELS[number];

export const ANSWERLATTICE_ANSWER_TEST_CITATION_POLICIES = ['not_required', 'at_least_one', 'specific_sources'] as const;
export type AnswerlatticeAnswerTestCitationPolicy = typeof ANSWERLATTICE_ANSWER_TEST_CITATION_POLICIES[number];

export const ANSWERLATTICE_ANSWER_TEST_PROOF_STATUSES = ['ready', 'review', 'blocked'] as const;
export type AnswerlatticeAnswerTestProofStatus = typeof ANSWERLATTICE_ANSWER_TEST_PROOF_STATUSES[number];

const AnswerlatticeAnswerTestExpectedSchema = z.object({
    source: z.enum(ANSWERLATTICE_ANSWER_TEST_SOURCES),
    answerId: z.string().trim().min(1).max(160).optional(),
    faqId: z.string().trim().min(1).max(160).optional(),
    minimumConfidence: z.enum(['high', 'medium', 'low', 'none']).optional(),
    mustInclude: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
    mustNotInclude: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
    citationPolicy: z.enum(ANSWERLATTICE_ANSWER_TEST_CITATION_POLICIES).default('not_required'),
    referenceIds: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
}).strict().superRefine((expected, context) => {
    if (expected.citationPolicy === 'specific_sources' && expected.referenceIds.length === 0) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'At least one expected reference is required for the specific-sources policy.',
            path: ['referenceIds'],
        });
    }
});

export const AnswerlatticeAnswerTestCaseSchema = z.object({
    id: z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    title: z.string().trim().min(1).max(120),
    query: z.string().trim().min(2).max(500),
    context: AnswerlatticeContextSchema.optional(),
    expected: AnswerlatticeAnswerTestExpectedSchema,
    riskLevel: z.enum(ANSWERLATTICE_ANSWER_TEST_RISK_LEVELS).default('standard'),
    relatedEntityIds: z.array(z.string().trim().min(1).max(160)).max(10).default([]),
    launchPack: z.object({
        version: z.literal(1),
        sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
        reviewItemId: z.string().regex(/^kii_[a-f0-9]{28}$/),
    }).strict().optional(),
    active: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).strict();

export type AnswerlatticeAnswerTestCase = Omit<z.infer<typeof AnswerlatticeAnswerTestCaseSchema>, 'context'> & {
    context?: ValidatedContextPayload;
};

const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
        .join(',')}}`;
};

const getAnswerTestCaseDefinition = (testCase: AnswerlatticeAnswerTestCase): string => {
    const { createdAt: _createdAt, updatedAt: _updatedAt, ...definition } = testCase;
    return stableStringify(definition);
};

export const prepareAnswerlatticeAnswerTestCasesForWrite = (
    currentCases: AnswerlatticeAnswerTestCase[],
    submittedCases: AnswerlatticeAnswerTestCase[],
    serverNow: string,
): AnswerlatticeAnswerTestCase[] => {
    if (!z.string().datetime().safeParse(serverNow).success) {
        throw new Error('Answer test save timestamp is invalid.');
    }
    const currentById = new Map(currentCases.map(testCase => [testCase.id, testCase]));
    return submittedCases.map((submittedCase) => {
        const currentCase = currentById.get(submittedCase.id);
        if (!currentCase) {
            return {
                ...submittedCase,
                createdAt: serverNow,
                updatedAt: serverNow,
            };
        }
        const definitionChanged = getAnswerTestCaseDefinition(currentCase)
            !== getAnswerTestCaseDefinition(submittedCase);
        return {
            ...submittedCase,
            createdAt: currentCase.createdAt,
            updatedAt: definitionChanged ? serverNow : currentCase.updatedAt,
        };
    });
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

export const AnswerlatticeAnswerTestCaseResultSchema = z.object({
    caseId: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120),
    passed: z.boolean(),
    source: z.enum(ANSWERLATTICE_ANSWER_TEST_SOURCES),
    answerId: z.string().trim().min(1).max(160).optional(),
    faqId: z.string().trim().min(1).max(160).optional(),
    riskLevel: z.enum(ANSWERLATTICE_ANSWER_TEST_RISK_LEVELS),
    relatedEntityIds: z.array(z.string().trim().min(1).max(160)).max(10),
    referenceIds: z.array(z.string().trim().min(1).max(160)).max(8),
    citationPolicy: z.enum(ANSWERLATTICE_ANSWER_TEST_CITATION_POLICIES),
    citationPassed: z.boolean(),
    missingReferenceIds: z.array(z.string().trim().min(1).max(160)).max(8),
    confidence: z.enum(['high', 'medium', 'low', 'none']).optional(),
    answerPreview: z.string().max(360),
    failures: z.array(z.string().trim().min(1).max(240)).max(20),
    aiProviderUsed: z.boolean(),
    durationMs: z.number().int().nonnegative(),
}).strict();

export type AnswerlatticeAnswerTestCaseResult = z.infer<typeof AnswerlatticeAnswerTestCaseResultSchema>;

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
    criticalCaseCount: number;
    criticalFailureCount: number;
    proofStatus: AnswerlatticeAnswerTestProofStatus;
    providerCaseCount: number;
    durationMs: number;
    releaseId?: string;
    releaseVersion?: string;
    sourceVersions?: AnswerlatticeAnswerTestSourceVersions;
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
