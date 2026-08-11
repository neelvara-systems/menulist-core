import {
    ANSWERLATTICE_ANSWER_TEST_MAX_CASES,
    ANSWERLATTICE_ANSWER_TEST_MAX_RUNS,
    ANSWERLATTICE_ANSWER_TEST_SOURCES,
    answerlatticeAnswerTestSourceVersionsEqual,
    type AnswerlatticeAnswerTestCase,
    type AnswerlatticeAnswerTestCaseResult,
    type AnswerlatticeAnswerTestRun,
    type AnswerlatticeAnswerTestSummary,
} from '@lib/answerlattice/answerTestContracts';
import { z } from 'zod';

export const ANSWERLATTICE_SCOPE_COVERAGE_MATRIX_SCHEMA_VERSION = 1;
export const ANSWERLATTICE_SCOPE_COVERAGE_STATUSES = [
    'covered',
    'needs_review',
    'missing',
    'unverified',
    'other_route',
] as const;

export type AnswerlatticeScopeCoverageStatus = typeof ANSWERLATTICE_SCOPE_COVERAGE_STATUSES[number];

const boundedInteger = z.number().int().nonnegative().max(ANSWERLATTICE_ANSWER_TEST_MAX_CASES);

export const AnswerlatticeScopeCoverageRowSchema = z.object({
    caseId: z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    status: z.enum(ANSWERLATTICE_SCOPE_COVERAGE_STATUSES),
    actualSource: z.enum(ANSWERLATTICE_ANSWER_TEST_SOURCES).optional(),
    answerId: z.string().trim().min(1).max(160).optional(),
    verifiedAt: z.string().datetime().optional(),
}).strict().superRefine((row, context) => {
    const hasCurrentResult = ['covered', 'needs_review', 'missing'].includes(row.status);
    if (hasCurrentResult && (!row.actualSource || !row.verifiedAt)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Current coverage states require an actual source and verification time.',
        });
    }
    if (!hasCurrentResult && (row.actualSource || row.answerId || row.verifiedAt)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Unverified and alternate-route rows cannot claim current result evidence.',
        });
    }
    if (row.status === 'covered' && (row.actualSource !== 'canonical' || !row.answerId)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Covered rows require an identified canonical answer.',
        });
    }
    if (row.status === 'needs_review' && row.actualSource !== 'canonical') {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Review rows require the canonical route.',
        });
    }
    if (row.status === 'missing' && row.actualSource === 'canonical') {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Missing rows must identify a non-canonical route.',
        });
    }
    if (row.actualSource !== 'canonical' && row.answerId) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Only canonical results may expose an answer ID.',
        });
    }
});

export type AnswerlatticeScopeCoverageRow = z.infer<typeof AnswerlatticeScopeCoverageRowSchema>;

export const AnswerlatticeScopeCoverageMatrixSchema = z.object({
    schemaVersion: z.literal(ANSWERLATTICE_SCOPE_COVERAGE_MATRIX_SCHEMA_VERSION),
    suiteRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    activeCaseCount: boundedInteger,
    canonicalTargetCount: boundedInteger,
    coveredCount: boundedInteger,
    needsReviewCount: boundedInteger,
    missingCount: boundedInteger,
    unverifiedCount: boundedInteger,
    otherRouteCount: boundedInteger,
    rows: z.array(AnswerlatticeScopeCoverageRowSchema).max(ANSWERLATTICE_ANSWER_TEST_MAX_CASES),
}).strict().superRefine((matrix, context) => {
    const rowIds = matrix.rows.map(row => row.caseId);
    if (new Set(rowIds).size !== rowIds.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Scope coverage rows must have unique case IDs.',
            path: ['rows'],
        });
    }
    const expectedCounts = {
        activeCaseCount: matrix.rows.length,
        canonicalTargetCount: matrix.rows.filter(row => row.status !== 'other_route').length,
        coveredCount: matrix.rows.filter(row => row.status === 'covered').length,
        needsReviewCount: matrix.rows.filter(row => row.status === 'needs_review').length,
        missingCount: matrix.rows.filter(row => row.status === 'missing').length,
        unverifiedCount: matrix.rows.filter(row => row.status === 'unverified').length,
        otherRouteCount: matrix.rows.filter(row => row.status === 'other_route').length,
    };
    Object.entries(expectedCounts).forEach(([field, expected]) => {
        if (matrix[field as keyof typeof expectedCounts] !== expected) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Scope coverage ${field} is inconsistent.`,
                path: [field],
            });
        }
    });
});

export type AnswerlatticeScopeCoverageMatrix = z.infer<typeof AnswerlatticeScopeCoverageMatrixSchema>;

type CurrentRun = {
    completedAt: string;
    completedAtMillis: number;
    resultsByCaseId: Map<string, AnswerlatticeAnswerTestCaseResult>;
};

const getCurrentRuns = (
    runs: AnswerlatticeAnswerTestRun[],
    currentSourceVersions: unknown,
    nowMillis: number,
): CurrentRun[] => runs
    .slice(0, ANSWERLATTICE_ANSWER_TEST_MAX_RUNS)
    .flatMap((run) => {
        const completedAtMillis = Date.parse(run.completedAt);
        if (
            !Number.isFinite(completedAtMillis)
            || completedAtMillis > nowMillis + (5 * 60 * 1000)
            || !answerlatticeAnswerTestSourceVersionsEqual(run.sourceVersions, currentSourceVersions)
        ) return [];

        const resultsByCaseId = new Map(run.results.map(result => [result.caseId, result]));
        if (resultsByCaseId.size !== run.results.length) return [];
        return [{
            completedAt: run.completedAt,
            completedAtMillis,
            resultsByCaseId,
        }];
    })
    .sort((left, right) => right.completedAtMillis - left.completedAtMillis);

const getCoverageRow = (
    testCase: AnswerlatticeAnswerTestCase,
    currentRuns: CurrentRun[],
): AnswerlatticeScopeCoverageRow => {
    if (testCase.expected.source !== 'canonical') {
        return { caseId: testCase.id, status: 'other_route' };
    }

    const caseUpdatedAtMillis = Date.parse(testCase.updatedAt);
    const currentResult = currentRuns.find(run => (
        Number.isFinite(caseUpdatedAtMillis)
        && caseUpdatedAtMillis <= run.completedAtMillis
        && run.resultsByCaseId.has(testCase.id)
    ));
    const result = currentResult?.resultsByCaseId.get(testCase.id);
    if (!currentResult || !result) {
        return { caseId: testCase.id, status: 'unverified' };
    }

    if (result.source !== 'canonical') {
        return {
            caseId: testCase.id,
            status: 'missing',
            actualSource: result.source,
            verifiedAt: currentResult.completedAt,
        };
    }

    const answerId = result.answerId?.trim();
    return {
        caseId: testCase.id,
        status: result.passed && answerId ? 'covered' : 'needs_review',
        actualSource: 'canonical',
        ...(answerId ? { answerId } : {}),
        verifiedAt: currentResult.completedAt,
    };
};

const STATUS_ORDER: Record<AnswerlatticeScopeCoverageStatus, number> = {
    missing: 0,
    needs_review: 1,
    unverified: 2,
    covered: 3,
    other_route: 4,
};

export const buildAnswerlatticeScopeCoverageMatrix = (
    summary: AnswerlatticeAnswerTestSummary,
    currentSourceVersions: unknown,
    nowMillis = Date.now(),
): AnswerlatticeScopeCoverageMatrix => {
    const activeCases = summary.cases
        .slice(0, ANSWERLATTICE_ANSWER_TEST_MAX_CASES)
        .filter(testCase => testCase.active);
    const casesById = new Map(activeCases.map(testCase => [testCase.id, testCase]));
    const currentRuns = getCurrentRuns(summary.runs, currentSourceVersions, nowMillis);
    const rows = activeCases
        .map(testCase => getCoverageRow(testCase, currentRuns))
        .sort((left, right) => {
            const statusDifference = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
            if (statusDifference !== 0) return statusDifference;
            const leftCase = casesById.get(left.caseId);
            const rightCase = casesById.get(right.caseId);
            const riskDifference = Number(rightCase?.riskLevel === 'critical')
                - Number(leftCase?.riskLevel === 'critical');
            if (riskDifference !== 0) return riskDifference;
            return String(leftCase?.title || left.caseId).localeCompare(
                String(rightCase?.title || right.caseId),
            );
        });

    return AnswerlatticeScopeCoverageMatrixSchema.parse({
        schemaVersion: ANSWERLATTICE_SCOPE_COVERAGE_MATRIX_SCHEMA_VERSION,
        suiteRevision: summary.revision,
        activeCaseCount: rows.length,
        canonicalTargetCount: rows.filter(row => row.status !== 'other_route').length,
        coveredCount: rows.filter(row => row.status === 'covered').length,
        needsReviewCount: rows.filter(row => row.status === 'needs_review').length,
        missingCount: rows.filter(row => row.status === 'missing').length,
        unverifiedCount: rows.filter(row => row.status === 'unverified').length,
        otherRouteCount: rows.filter(row => row.status === 'other_route').length,
        rows,
    });
};

export const parseAnswerlatticeScopeCoverageMatrixForClient = (
    value: unknown,
    summary: AnswerlatticeAnswerTestSummary,
): AnswerlatticeScopeCoverageMatrix | null => {
    const parsed = AnswerlatticeScopeCoverageMatrixSchema.safeParse(value);
    if (!parsed.success || parsed.data.suiteRevision !== summary.revision) return null;

    const activeCases = summary.cases.filter(testCase => testCase.active);
    const activeIds = new Set(activeCases.map(testCase => testCase.id));
    if (
        parsed.data.rows.length !== activeIds.size
        || parsed.data.rows.some(row => !activeIds.has(row.caseId))
    ) return null;

    const rowsById = new Map(parsed.data.rows.map(row => [row.caseId, row]));
    const routesAreConsistent = activeCases.every((testCase) => {
        const row = rowsById.get(testCase.id);
        return testCase.expected.source === 'canonical'
            ? row?.status !== 'other_route'
            : row?.status === 'other_route';
    });
    return routesAreConsistent ? parsed.data : null;
};
