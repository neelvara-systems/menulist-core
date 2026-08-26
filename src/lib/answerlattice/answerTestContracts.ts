import { AnswerlatticeContextSchema, type ValidatedContextPayload } from '@lib/validation/contextSchema';
import { z } from 'zod';

export const ANSWERLATTICE_ANSWER_TEST_MAX_CASES = 100;
export const ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES = 25;
export const ANSWERLATTICE_ANSWER_TEST_MAX_RUNS = 10;
export const ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES = 10;
export const ANSWERLATTICE_ANSWER_TEST_MAX_RESERVATIONS = 5;
export const ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION = 4;
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
    const uniqueReferenceIds = new Set(expected.referenceIds);
    if (uniqueReferenceIds.size !== expected.referenceIds.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Expected references must be unique.',
            path: ['referenceIds'],
        });
    }
    const requiredPhrases = expected.mustInclude.map(phrase => phrase.toLowerCase());
    const blockedPhrases = expected.mustNotInclude.map(phrase => phrase.toLowerCase());
    if (new Set(requiredPhrases).size !== requiredPhrases.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Required phrases must be unique.',
            path: ['mustInclude'],
        });
    }
    if (new Set(blockedPhrases).size !== blockedPhrases.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Blocked phrases must be unique.',
            path: ['mustNotInclude'],
        });
    }
    const blockedPhraseSet = new Set(blockedPhrases);
    if (requiredPhrases.some(phrase => blockedPhraseSet.has(phrase))) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'A phrase cannot be both required and blocked.',
            path: ['mustNotInclude'],
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

export const syncAnswerlatticeLaunchPackCaseFromReview = (
    testCase: AnswerlatticeAnswerTestCase,
    review: {
        id: string;
        title: string;
        question?: string | null;
        entityIds?: string[];
        updatedAt: string;
    },
): AnswerlatticeAnswerTestCase => {
    if (!testCase.launchPack || testCase.launchPack.reviewItemId !== review.id) return testCase;
    const title = review.title.trim().slice(0, 120) || testCase.title;
    const query = String(review.question || review.title).trim().slice(0, 500) || testCase.query;
    const relatedEntityIds = Array.from(new Set((review.entityIds || [])
        .map(entityId => entityId.trim().slice(0, 160))
        .filter(Boolean)))
        .slice(0, 10);
    if (
        title === testCase.title
        && query === testCase.query
        && relatedEntityIds.length === testCase.relatedEntityIds.length
        && relatedEntityIds.every((entityId, index) => entityId === testCase.relatedEntityIds[index])
    ) return testCase;
    return {
        ...testCase,
        title,
        query,
        relatedEntityIds,
        updatedAt: review.updatedAt,
    };
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

export const hasDisallowedAnswerlatticeCriticalRagCaseMutation = (
    currentCases: AnswerlatticeAnswerTestCase[],
    submittedCases: AnswerlatticeAnswerTestCase[],
): boolean => {
    const currentById = new Map(currentCases.map(testCase => [testCase.id, testCase]));
    return submittedCases.some((submittedCase) => {
        if (submittedCase.riskLevel !== 'critical' || submittedCase.expected.source !== 'rag') {
            return false;
        }
        const currentCase = currentById.get(submittedCase.id);
        if (!currentCase) return true;
        if (submittedCase.active === false) return false;
        return getAnswerTestCaseDefinition(currentCase) !== getAnswerTestCaseDefinition(submittedCase);
    });
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
    caseIds: z.array(z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/))
        .max(ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES)
        .superRefine((caseIds, context) => {
            if (new Set(caseIds).size !== caseIds.length) {
                context.addIssue({ code: z.ZodIssueCode.custom, message: 'Selected answer-test IDs must be unique.' });
            }
        })
        .optional(),
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

export const isAnswerlatticeAnswerTestRollbackAuthorityInScope = (
    value: unknown,
    scope: { tId: number; sId: number },
): boolean => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const authority = value as Record<string, unknown>;
    return authority.pId === 'AL'
        && authority.tId === scope.tId
        && authority.sId === scope.sId;
};

export const AnswerlatticeAnswerTestRollbackResponseSchema = z.object({
    proposalId: z.string().trim().min(1).max(169).regex(/^rollback_[a-zA-Z0-9_-]+$/),
    created: z.boolean(),
    status: z.enum(['pending_review', 'approved', 'rejected', 'implemented']),
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
    requestFingerprint?: string;
    suiteRevision?: number;
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
    requestFingerprint: string;
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

const safeNonNegativeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const AnswerlatticeAnswerTestRunClientSchema = z.object({
    id: z.string().trim().min(1).max(120),
    suiteRevision: safeNonNegativeInteger.optional(),
    mode: z.enum(ANSWERLATTICE_ANSWER_TEST_MODES),
    status: z.enum(['passed', 'failed', 'partial']),
    startedAt: z.string().max(40),
    completedAt: z.string().max(40),
    createdBy: z.string().max(180),
    caseCount: safeNonNegativeInteger.max(ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES),
    passedCount: safeNonNegativeInteger.max(ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES),
    failedCount: safeNonNegativeInteger.max(ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES),
    criticalCaseCount: safeNonNegativeInteger.max(ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES),
    criticalFailureCount: safeNonNegativeInteger.max(ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES),
    proofStatus: z.enum(ANSWERLATTICE_ANSWER_TEST_PROOF_STATUSES),
    providerCaseCount: safeNonNegativeInteger.max(ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES),
    durationMs: safeNonNegativeInteger,
    releaseId: z.string().trim().min(1).max(160).optional(),
    releaseVersion: z.string().trim().min(1).max(80).optional(),
    results: z.array(AnswerlatticeAnswerTestCaseResultSchema)
        .min(1)
        .max(ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES),
}).strict().superRefine((run, context) => {
    const resultIds = run.results.map(result => result.caseId);
    if (new Set(resultIds).size !== resultIds.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Answer-test run results must have unique case IDs.',
            path: ['results'],
        });
    }
    const passedCount = run.results.filter(result => result.passed).length;
    const failedCount = run.results.length - passedCount;
    const criticalResults = run.results.filter(result => result.riskLevel === 'critical');
    const criticalFailureCount = criticalResults.filter(result => !result.passed).length;
    const providerCaseCount = run.results.filter(result => result.aiProviderUsed).length;
    const proofStatus = criticalFailureCount > 0 ? 'blocked' : failedCount > 0 ? 'review' : 'ready';
    const status = failedCount === 0 ? 'passed' : passedCount === 0 ? 'failed' : 'partial';
    const derivedFields = [
        ['caseCount', run.caseCount, run.results.length],
        ['passedCount', run.passedCount, passedCount],
        ['failedCount', run.failedCount, failedCount],
        ['criticalCaseCount', run.criticalCaseCount, criticalResults.length],
        ['criticalFailureCount', run.criticalFailureCount, criticalFailureCount],
        ['providerCaseCount', run.providerCaseCount, providerCaseCount],
        ['proofStatus', run.proofStatus, proofStatus],
        ['status', run.status, status],
    ] as const;
    derivedFields.forEach(([field, actual, expected]) => {
        if (actual !== expected) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Answer-test run ${field} is inconsistent.`,
                path: [field],
            });
        }
    });
});

const AnswerlatticeAnswerTestClientSummarySchema = z.object({
    id: z.string().trim().min(1).max(180),
    schemaVersion: safeNonNegativeInteger.min(1).max(ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION),
    pId: z.literal('AL'),
    tId: safeNonNegativeInteger,
    sId: safeNonNegativeInteger,
    revision: safeNonNegativeInteger,
    cases: z.array(AnswerlatticeAnswerTestCaseSchema).max(ANSWERLATTICE_ANSWER_TEST_MAX_CASES),
    runs: z.array(AnswerlatticeAnswerTestRunClientSchema).max(ANSWERLATTICE_ANSWER_TEST_MAX_RUNS),
    reservations: z.array(z.never()).length(0),
    updatedAt: z.string().max(40).nullable(),
    updatedBy: z.string().max(180).nullable(),
}).strict().superRefine((summary, context) => {
    const caseIds = summary.cases.map(testCase => testCase.id);
    if (new Set(caseIds).size !== caseIds.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Answer-test cases must have unique IDs.',
            path: ['cases'],
        });
    }
    if (summary.runs.some(run => (
        run.suiteRevision !== undefined && run.suiteRevision > summary.revision
    ))) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Answer-test run revision cannot exceed the suite revision.',
            path: ['runs'],
        });
    }
});

export const projectAnswerlatticeAnswerTestRunForClient = (
    run: AnswerlatticeAnswerTestRun,
): AnswerlatticeAnswerTestRun => {
    const {
        requestFingerprint: _requestFingerprint,
        sourceVersions: _sourceVersions,
        ...clientRun
    } = run;
    return clientRun;
};

export const projectAnswerlatticeAnswerTestSummaryForClient = (
    summary: AnswerlatticeAnswerTestSummary,
): AnswerlatticeAnswerTestSummary => ({
    ...summary,
    runs: summary.runs.map(projectAnswerlatticeAnswerTestRunForClient),
    reservations: [],
});

export const parseAnswerlatticeAnswerTestSummaryForClient = (
    value: unknown,
    scope: { tId: number; sId: number },
): AnswerlatticeAnswerTestSummary | null => {
    const parsed = AnswerlatticeAnswerTestClientSummarySchema.safeParse(value);
    if (
        !parsed.success
        || parsed.data.id !== getAnswerlatticeAnswerTestSummaryId(scope.tId, scope.sId)
        || parsed.data.tId !== scope.tId
        || parsed.data.sId !== scope.sId
    ) return null;
    return parsed.data as AnswerlatticeAnswerTestSummary;
};

export const parseAnswerlatticeAnswerTestSummaryIdentity = (
    raw: Record<string, unknown>,
    scope: { tId: number; sId: number },
): { schemaVersion: number; revision: number } | null => {
    const schemaVersion = raw.schemaVersion;
    const revision = raw.revision;
    if (
        raw.id !== getAnswerlatticeAnswerTestSummaryId(scope.tId, scope.sId)
        || raw.pId !== 'AL'
        || raw.tId !== scope.tId
        || raw.sId !== scope.sId
        || typeof schemaVersion !== 'number'
        || !Number.isSafeInteger(schemaVersion)
        || schemaVersion < 1
        || schemaVersion > ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION
        || typeof revision !== 'number'
        || !Number.isSafeInteger(revision)
        || revision < 0
    ) return null;
    return { schemaVersion, revision };
};

export const getAnswerlatticeAnswerTestSummaryId = (tId: number, sId: number): string => {
    if (!Number.isSafeInteger(tId) || tId < 0 || !Number.isSafeInteger(sId) || sId < 0) {
        throw new Error('Answerlattice answer-test summary scope is invalid.');
    }
    return `answerTests_${tId}_${sId}`;
};

export const isAnswerlatticeAnswerTestRunCurrent = (
    run: Pick<AnswerlatticeAnswerTestRun, 'suiteRevision'> | null | undefined,
    summary: Pick<AnswerlatticeAnswerTestSummary, 'revision'>,
): boolean => Number.isSafeInteger(run?.suiteRevision)
    && run?.suiteRevision === summary.revision;

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
