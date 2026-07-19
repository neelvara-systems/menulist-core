import { getAnswerlatticeFirstTrustedAnswerCases } from '@lib/answerlattice/answerTestStarterPack';
import {
    ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION,
    answerlatticeAnswerTestSourceVersionsEqual,
    getAnswerlatticeAnswerTestSummaryId,
    normalizeAnswerlatticeAnswerTestSourceVersions,
} from '@lib/answerlattice/answerTestContracts';
import type { AnswerlatticeActivationAnswerTestSummary } from '@type/answerlattice';

export const EMPTY_ANSWERLATTICE_ACTIVATION_ANSWER_TEST_SUMMARY: AnswerlatticeActivationAnswerTestSummary = {
    activeCaseCount: 0,
    firstTenCount: 0,
    latestProofStatus: null,
    latestCriticalFailureCount: 0,
    latestProofStale: false,
    lastRunAt: null,
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const toBoundedNonNegativeInteger = (value: unknown, maximum: number): number => {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized < 0) return 0;
    return Math.min(maximum, Math.floor(normalized));
};

export const buildAnswerlatticeActivationAnswerTestSummary = (
    value: unknown,
    tId: number,
    sId: number,
    currentSourceVersions: unknown,
): AnswerlatticeActivationAnswerTestSummary => {
    const revision = isRecord(value) && typeof value.revision === 'number'
        && Number.isSafeInteger(value.revision) && value.revision >= 0
        ? value.revision
        : null;
    const schemaVersion = isRecord(value) && typeof value.schemaVersion === 'number'
        && Number.isSafeInteger(value.schemaVersion)
        ? value.schemaVersion
        : null;
    if (
        !isRecord(value)
        || value.id !== getAnswerlatticeAnswerTestSummaryId(tId, sId)
        || value.pId !== 'AL'
        || value.tId !== tId
        || value.sId !== sId
        || revision === null
        || schemaVersion === null
        || schemaVersion < 1
        || schemaVersion > ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION
    ) {
        return { ...EMPTY_ANSWERLATTICE_ACTIVATION_ANSWER_TEST_SUMMARY };
    }

    const activeCases = Array.isArray(value.cases)
        ? value.cases
            .slice(0, 100)
            .flatMap((candidate) => {
                if (!isRecord(candidate) || candidate.active !== true) return [];
                const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
                const updatedAt = typeof candidate.updatedAt === 'string' ? candidate.updatedAt : '';
                const launchPack = isRecord(candidate.launchPack)
                    && candidate.launchPack.version === 1
                    && typeof candidate.launchPack.sourceHash === 'string'
                    && /^[a-f0-9]{64}$/.test(candidate.launchPack.sourceHash)
                    && typeof candidate.launchPack.reviewItemId === 'string'
                    && /^kii_[a-f0-9]{28}$/.test(candidate.launchPack.reviewItemId)
                    ? {
                        version: 1 as const,
                        sourceHash: candidate.launchPack.sourceHash,
                        reviewItemId: candidate.launchPack.reviewItemId,
                    }
                    : undefined;
                return /^[a-zA-Z0-9_-]{1,80}$/.test(id) && Number.isFinite(Date.parse(updatedAt))
                    ? [{
                        id,
                        active: true,
                        updatedAt,
                        riskLevel: candidate.riskLevel === 'critical' ? 'critical' as const : 'standard' as const,
                        ...(launchPack ? { launchPack } : {}),
                    }]
                    : [];
            })
        : [];
    const firstTenCases = getAnswerlatticeFirstTrustedAnswerCases(activeCases, { activeOnly: true });
    const firstTenIds = firstTenCases.map(testCase => testCase.id);
    const normalizedCurrentSourceVersions = normalizeAnswerlatticeAnswerTestSourceVersions(currentSourceVersions);

    const coveredRuns = Array.isArray(value.runs)
        ? value.runs.slice(0, 10).flatMap((candidate) => {
            if (!isRecord(candidate) || !Array.isArray(candidate.results) || firstTenIds.length < 10) return [];
            const resultPairs = candidate.results
                .slice(0, 25)
                .flatMap(result => (
                    isRecord(result)
                    && typeof result.caseId === 'string'
                    && typeof result.passed === 'boolean'
                    && (result.riskLevel === 'standard' || result.riskLevel === 'critical')
                        ? [[result.caseId, result] as const]
                        : []
                ));
            const resultsById = new Map(resultPairs);
            if (resultsById.size !== resultPairs.length || !firstTenIds.every(id => resultsById.has(id))) return [];
            const completedAtMillis = typeof candidate.completedAt === 'string'
                ? Date.parse(candidate.completedAt)
                : Number.NaN;
            const casesAreCurrent = Number.isFinite(completedAtMillis)
                && completedAtMillis <= Date.now() + (5 * 60 * 1000)
                && firstTenCases.every(testCase => Date.parse(testCase.updatedAt) <= completedAtMillis);
            const sourcesAreCurrent = Boolean(
                normalizedCurrentSourceVersions
                && answerlatticeAnswerTestSourceVersionsEqual(
                    candidate.sourceVersions,
                    normalizedCurrentSourceVersions,
                )
            );
            const suiteIsCurrent = candidate.suiteRevision === revision;
            return [{ candidate, casesAreCurrent, sourcesAreCurrent, suiteIsCurrent }];
        })
        : [];
    const matchingRun = coveredRuns.find(run => (
        run.casesAreCurrent && run.sourcesAreCurrent && run.suiteIsCurrent
    ))?.candidate;
    const latestCoveredRun = coveredRuns[0]?.candidate;

    const rawMatchingResults: unknown[] = isRecord(matchingRun) && Array.isArray(matchingRun.results)
        ? matchingRun.results.slice(0, 25)
        : [];
    const matchingResults = rawMatchingResults.length
        ? firstTenIds.flatMap(caseId => {
            const result = rawMatchingResults
                .slice(0, 25)
                .find(candidate => isRecord(candidate) && candidate.caseId === caseId && typeof candidate.passed === 'boolean');
            return isRecord(result) ? [result] : [];
        })
        : [];
    const firstTenCasesById = new Map(firstTenCases.map(testCase => [testCase.id, testCase]));
    const criticalFailureCount = matchingResults.filter(result => (
        result.passed === false
        && typeof result.caseId === 'string'
        && (
            result.riskLevel === 'critical'
            || firstTenCasesById.get(result.caseId)?.riskLevel === 'critical'
        )
    )).length;
    const proofStatus = matchingResults.length < 10
        ? null
        : criticalFailureCount > 0
            ? 'blocked' as const
            : matchingResults.some(result => result.passed === false)
                ? 'review' as const
                : 'ready' as const;
    const displayedRun = matchingRun || latestCoveredRun;
    const completedAt = isRecord(displayedRun)
        && typeof displayedRun.completedAt === 'string'
        && Number.isFinite(Date.parse(displayedRun.completedAt))
        ? displayedRun.completedAt
        : null;

    return {
        activeCaseCount: activeCases.length,
        firstTenCount: firstTenIds.length,
        latestProofStatus: proofStatus,
        latestCriticalFailureCount: toBoundedNonNegativeInteger(criticalFailureCount, 10),
        latestProofStale: firstTenIds.length >= 10 && coveredRuns.length > 0 && !matchingRun,
        lastRunAt: completedAt,
    };
};
