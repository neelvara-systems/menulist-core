import { createHash } from 'crypto';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    checkAnswerlatticeAICapacity,
    finalizeAnswerlatticeAiOperationAccounting,
    type AnswerlatticeAiActor,
} from '@lib/answerlattice/aiAccounting';
import {
    attemptCanonicalRetrieval,
    CANONICAL_GOVERNED_FALLBACK_MESSAGES,
    getAnswerlatticeCanonicalAnswerCacheKey,
    isCanonicalGovernedFallbackReason,
} from '@lib/answerlattice/canonicalRetrieval';
import { attemptFaqAnswerRetrieval } from '@lib/answerlattice/faqRetrieval';
import {
    ANSWERLATTICE_ANSWER_TEST_CITATION_POLICIES,
    ANSWERLATTICE_ANSWER_TEST_MAX_RUNS,
    ANSWERLATTICE_ANSWER_TEST_MAX_RESERVATIONS,
    ANSWERLATTICE_ANSWER_TEST_RISK_LEVELS,
    ANSWERLATTICE_ANSWER_TEST_SOURCES,
    AnswerlatticeAnswerTestCaseSchema,
    createEmptyAnswerlatticeAnswerTestSummary,
    getAnswerlatticeAnswerTestSummaryId,
    normalizeAnswerlatticeAnswerTestSourceVersions,
    type AnswerlatticeAnswerTestCase,
    type AnswerlatticeAnswerTestCaseResult,
    type AnswerlatticeAnswerTestMode,
    type AnswerlatticeAnswerTestRun,
    type AnswerlatticeAnswerTestRunReservation,
    type AnswerlatticeAnswerTestSourceVersions,
    type AnswerlatticeAnswerTestSource,
    type AnswerlatticeAnswerTestSummary,
} from '@lib/answerlattice/answerTestContracts';
import {
    evaluateAnswerTestCase,
    extractAnswerTestReferenceIds,
    getAnswerTestProofSummary,
    type AnswerlatticeResolvedTestAnswer,
} from '@lib/answerlattice/answerTestEvaluation';
import {
    classifyAnswerlatticeProposalImpact,
    type AnswerlatticeProposalImpactComparison,
} from '@lib/answerlattice/proposalImpactContracts';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { ANSWERLATTICE_CACHE_SOURCES } from '@lib/answerlattice/cacheVersionManifest';
import { getAnswerlatticeCacheVersionServer } from '@lib/answerlattice/cacheVersionServer';
import { getAnswerlatticeCompiledSourceVersionsAdmin } from '@lib/answerlattice/compiledSourceVersionsAdmin';
import { normalizeAnswerlatticeReleaseId } from '@lib/answerlattice/releaseIdBoundary';
import {
    parseAnswerlatticeRetrievalRelease,
    parseAnswerlatticeRetrievalSearchIndex,
} from '@lib/answerlattice/retrievalContracts';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { coreSearch } from '@lib/search/searchCore';
import type { CoreSearchResult } from '@lib/search/types';
import type {
    AnswerlatticeCanonicalAnswer,
    AnswerlatticeEntitySearchIndex,
    AnswerlatticeRelease,
} from '@type/answerlattice';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';

const ANSWER_TEST_RUN_RESERVATION_TTL_MS = 15 * 60 * 1000;
const ANSWER_TEST_SUMMARY_MAX_BYTES = 480 * 1024;

type AnswerTestScope = { tId: number; sId: number };

type AnswerTestRetrievalPreload = {
    searchIndex: AnswerlatticeEntitySearchIndex[];
    latestRelease: AnswerlatticeRelease | null;
    currentVersion?: number;
    activeAnswerCache: Map<string, AnswerlatticeCanonicalAnswer[]>;
    kbSourceVersion?: number;
};

type AnswerTestPreload = AnswerTestRetrievalPreload & {
    sourceVersions: AnswerlatticeAnswerTestSourceVersions;
};

type ResolvedAnswer = AnswerlatticeResolvedTestAnswer & {
    aiProviderOperations?: string[];
    aiProviderTokenUsage?: CoreSearchResult['aiProviderTokenUsage'];
};

const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
        .join(',')}}`;
};

const getAnswerTestAccountingIdempotencyKey = (
    runId: string,
    testCase: AnswerlatticeAnswerTestCase,
): string => {
    const caseHash = createHash('sha256').update(stableStringify({
        context: testCase.context || null,
        expected: testCase.expected,
        id: testCase.id,
        query: testCase.query,
        updatedAt: testCase.updatedAt,
    })).digest('hex');
    return `answer_test:${runId}:${testCase.id}:${caseHash}`;
};

export class AnswerlatticeAnswerTestCapacityError extends Error {
    readonly remaining: number;
    readonly required: number;

    constructor(remaining: number, required: number) {
        super('Not enough support credits to run the selected full-runtime tests.');
        this.name = 'AnswerlatticeAnswerTestCapacityError';
        this.remaining = remaining;
        this.required = required;
    }
}

export class AnswerlatticeAnswerTestSummaryTooLargeError extends Error {
    constructor() {
        super('The answer-test suite is too large to save safely. Remove old or oversized test content.');
        this.name = 'AnswerlatticeAnswerTestSummaryTooLargeError';
    }
}

export class AnswerlatticeAnswerTestRunConflictError extends Error {
    readonly reason: 'in_progress' | 'busy';
    readonly retryAfter: number;

    constructor(reason: 'in_progress' | 'busy', retryAfter: number) {
        super(reason === 'in_progress'
            ? 'This answer-test request is already running.'
            : 'Too many answer-test runs are already in progress.');
        this.name = 'AnswerlatticeAnswerTestRunConflictError';
        this.reason = reason;
        this.retryAfter = Math.max(1, Math.ceil(retryAfter));
    }
}

const getDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new Error('Answerlattice Firebase is not configured.');
    }
    return answerlatticeFirestoreAdmin;
};

const getSummaryRef = (scope: AnswerTestScope) => (
    getDb().collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeAnswerTestSummaryId(scope.tId, scope.sId))
);

const normalizeStringList = (value: unknown, limit: number, maxLength: number): string[] => (
    Array.isArray(value)
        ? Array.from(new Set(value
            .map(item => typeof item === 'string' ? item.trim().slice(0, maxLength) : '')
            .filter(Boolean)))
            .slice(0, limit)
        : []
);

const normalizeNonNegativeInteger = (value: unknown): number => {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? Math.floor(normalized) : 0;
};

const normalizeResult = (value: unknown): AnswerlatticeAnswerTestCaseResult | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const result = value as Partial<AnswerlatticeAnswerTestCaseResult>;
    const caseId = String(result.caseId || '').trim().slice(0, 80);
    if (!caseId) return null;
    const source = ANSWERLATTICE_ANSWER_TEST_SOURCES.includes(result.source as AnswerlatticeAnswerTestSource)
        ? result.source as AnswerlatticeAnswerTestSource
        : 'no_answer';
    const riskLevel = ANSWERLATTICE_ANSWER_TEST_RISK_LEVELS.includes(result.riskLevel as 'standard' | 'critical')
        ? result.riskLevel as 'standard' | 'critical'
        : 'standard';
    const citationPolicy = ANSWERLATTICE_ANSWER_TEST_CITATION_POLICIES.includes(result.citationPolicy as 'not_required' | 'at_least_one' | 'specific_sources')
        ? result.citationPolicy as 'not_required' | 'at_least_one' | 'specific_sources'
        : 'not_required';
    const referenceIds = normalizeStringList(result.referenceIds, 8, 160);
    const missingReferenceIds = normalizeStringList(result.missingReferenceIds, 8, 160);

    return {
        caseId,
        title: String(result.title || 'Untitled test').trim().slice(0, 120),
        passed: result.passed === true,
        source,
        ...(result.answerId ? { answerId: String(result.answerId).trim().slice(0, 160) } : {}),
        ...(result.faqId ? { faqId: String(result.faqId).trim().slice(0, 160) } : {}),
        riskLevel,
        relatedEntityIds: normalizeStringList(result.relatedEntityIds, 10, 160),
        referenceIds,
        citationPolicy,
        citationPassed: typeof result.citationPassed === 'boolean'
            ? result.citationPassed
            : citationPolicy === 'not_required',
        missingReferenceIds,
        ...(result.confidence === 'high' || result.confidence === 'medium' || result.confidence === 'low' || result.confidence === 'none'
            ? { confidence: result.confidence }
            : {}),
        answerPreview: String(result.answerPreview || '').replace(/\s+/g, ' ').trim().slice(0, 360),
        failures: normalizeStringList(result.failures, 20, 240),
        aiProviderUsed: result.aiProviderUsed === true,
        durationMs: normalizeNonNegativeInteger(result.durationMs),
    };
};

const normalizeRun = (value: unknown): AnswerlatticeAnswerTestRun | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const run = value as Partial<AnswerlatticeAnswerTestRun>;
    if (!run.id || !run.mode || !Array.isArray(run.results)) return null;

    const results = run.results
        .slice(0, 25)
        .map(normalizeResult)
        .filter((result): result is AnswerlatticeAnswerTestCaseResult => Boolean(result));
    if (results.length === 0) return null;
    const passedCount = results.filter(result => result.passed).length;
    const failedCount = results.length - passedCount;
    const proof = getAnswerTestProofSummary(results);
    const sourceVersions = normalizeAnswerlatticeAnswerTestSourceVersions(run.sourceVersions);

    return {
        id: String(run.id).slice(0, 120),
        mode: run.mode === 'full_runtime' ? 'full_runtime' : 'canonical_only',
        status: failedCount === 0 ? 'passed' : passedCount === 0 ? 'failed' : 'partial',
        startedAt: String(run.startedAt || ''),
        completedAt: String(run.completedAt || ''),
        createdBy: String(run.createdBy || 'unknown').slice(0, 180),
        caseCount: results.length,
        passedCount,
        failedCount,
        ...proof,
        providerCaseCount: results.filter(result => result.aiProviderUsed).length,
        durationMs: normalizeNonNegativeInteger(run.durationMs),
        ...(run.releaseId ? { releaseId: String(run.releaseId).slice(0, 160) } : {}),
        ...(run.releaseVersion ? { releaseVersion: String(run.releaseVersion).slice(0, 80) } : {}),
        ...(sourceVersions ? { sourceVersions } : {}),
        results,
    };
};

const normalizeReservation = (value: unknown): AnswerlatticeAnswerTestRunReservation | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const reservation = value as Partial<AnswerlatticeAnswerTestRunReservation>;
    const id = String(reservation.id || '').trim();
    const startedAt = String(reservation.startedAt || '');
    const expiresAt = String(reservation.expiresAt || '');
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(id)) return null;
    if (!Number.isFinite(Date.parse(startedAt)) || !Number.isFinite(Date.parse(expiresAt))) return null;
    return {
        id,
        createdBy: String(reservation.createdBy || 'unknown').slice(0, 180),
        startedAt,
        expiresAt,
    };
};

export const compactAnswerlatticeAnswerTestSummaryForWrite = (
    summary: AnswerlatticeAnswerTestSummary,
): AnswerlatticeAnswerTestSummary => {
    const next: AnswerlatticeAnswerTestSummary = {
        ...summary,
        runs: summary.runs.slice(0, ANSWERLATTICE_ANSWER_TEST_MAX_RUNS),
        reservations: summary.reservations.slice(0, ANSWERLATTICE_ANSWER_TEST_MAX_RESERVATIONS),
    };
    while (next.runs.length > 1 && Buffer.byteLength(JSON.stringify(next), 'utf8') > ANSWER_TEST_SUMMARY_MAX_BYTES) {
        next.runs = next.runs.slice(0, -1);
    }
    if (Buffer.byteLength(JSON.stringify(next), 'utf8') > ANSWER_TEST_SUMMARY_MAX_BYTES) {
        throw new AnswerlatticeAnswerTestSummaryTooLargeError();
    }
    return next;
};

export const normalizeAnswerlatticeAnswerTestSummary = (
    raw: Record<string, unknown> | undefined,
    scope: AnswerTestScope,
): AnswerlatticeAnswerTestSummary => {
    const empty = createEmptyAnswerlatticeAnswerTestSummary(scope.tId, scope.sId);
    if (
        !raw
        || normalizeAnswerlatticeScopeDocumentId(raw.tId) !== scope.tId
        || normalizeAnswerlatticeScopeDocumentId(raw.sId) !== scope.sId
    ) return empty;

    const cases = Array.isArray(raw.cases)
        ? raw.cases
            .map(value => AnswerlatticeAnswerTestCaseSchema.safeParse(value))
            .filter(result => result.success)
            .map(result => result.data as AnswerlatticeAnswerTestCase)
            .slice(0, 100)
        : [];
    const runs = Array.isArray(raw.runs)
        ? raw.runs.map(normalizeRun).filter((run): run is AnswerlatticeAnswerTestRun => Boolean(run)).slice(0, ANSWERLATTICE_ANSWER_TEST_MAX_RUNS)
        : [];
    const reservations = Array.isArray(raw.reservations)
        ? raw.reservations
            .map(normalizeReservation)
            .filter((reservation): reservation is AnswerlatticeAnswerTestRunReservation => Boolean(reservation))
            .slice(0, ANSWERLATTICE_ANSWER_TEST_MAX_RESERVATIONS)
        : [];

    return {
        ...empty,
        revision: Math.max(0, Math.floor(Number(raw.revision || 0))),
        cases,
        runs,
        reservations,
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
        updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy.slice(0, 180) : null,
    };
};

export const reserveAnswerlatticeAnswerTestRun = async (
    scope: AnswerTestScope,
    runId: string,
    createdBy: string,
): Promise<{ summary: AnswerlatticeAnswerTestSummary; completedRun?: AnswerlatticeAnswerTestRun }> => {
    const summaryRef = getSummaryRef(scope);
    return getDb().runTransaction(async transaction => {
        const snapshot = await transaction.get(summaryRef);
        const current = normalizeAnswerlatticeAnswerTestSummary(snapshot.exists ? snapshot.data() : undefined, scope);
        const completedRun = current.runs.find(run => run.id === runId);
        if (completedRun) return { summary: current, completedRun };

        const now = Date.now();
        const activeReservations = current.reservations.filter(reservation => Date.parse(reservation.expiresAt) > now);
        const existing = activeReservations.find(reservation => reservation.id === runId);
        if (existing) {
            throw new AnswerlatticeAnswerTestRunConflictError(
                'in_progress',
                (Date.parse(existing.expiresAt) - now) / 1000,
            );
        }
        if (activeReservations.length >= ANSWERLATTICE_ANSWER_TEST_MAX_RESERVATIONS) {
            const earliestExpiry = Math.min(...activeReservations.map(reservation => Date.parse(reservation.expiresAt)));
            throw new AnswerlatticeAnswerTestRunConflictError('busy', (earliestExpiry - now) / 1000);
        }

        const reservation: AnswerlatticeAnswerTestRunReservation = {
            id: runId,
            createdBy: createdBy.slice(0, 180),
            startedAt: new Date(now).toISOString(),
            expiresAt: new Date(now + ANSWER_TEST_RUN_RESERVATION_TTL_MS).toISOString(),
        };
        const next = compactAnswerlatticeAnswerTestSummaryForWrite({
            ...current,
            reservations: [reservation, ...activeReservations],
        });
        transaction.set(summaryRef, next, { merge: false });
        return { summary: next };
    });
};

export const releaseAnswerlatticeAnswerTestRun = async (
    scope: AnswerTestScope,
    runId: string,
): Promise<void> => {
    const summaryRef = getSummaryRef(scope);
    await getDb().runTransaction(async transaction => {
        const snapshot = await transaction.get(summaryRef);
        if (!snapshot.exists) return;
        const current = normalizeAnswerlatticeAnswerTestSummary(snapshot.data(), scope);
        const reservations = current.reservations.filter(reservation => reservation.id !== runId);
        if (reservations.length === current.reservations.length) return;
        transaction.set(summaryRef, { ...current, reservations }, { merge: false });
    });
};

export const loadAnswerlatticeAnswerTestSummary = async (
    scope: AnswerTestScope,
): Promise<AnswerlatticeAnswerTestSummary> => {
    const snapshot = await getSummaryRef(scope).get();
    return normalizeAnswerlatticeAnswerTestSummary(snapshot.exists ? snapshot.data() : undefined, scope);
};

export const loadAnswerlatticeAnswerTestPreload = async (
    scope: AnswerTestScope,
): Promise<AnswerTestPreload> => {
    const [indexSnapshot, releaseSnapshot, kbSourceVersion, compiledSourceVersions] = await Promise.all([
        getDb().collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .limit(501)
            .get(),
        getDb().collection(DB_COLLECTIONS.ANSWERLATTICE_RELEASES)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .where('status', '==', 'active')
            .orderBy('versionNormalized', 'desc')
            .limit(1)
            .get(),
        getAnswerlatticeCacheVersionServer(ANSWERLATTICE_CACHE_SOURCES.KB, scope.tId, scope.sId),
        getAnswerlatticeCompiledSourceVersionsAdmin(scope.tId, scope.sId),
    ]);

    if (indexSnapshot.size > 500) {
        throw new Error('Answerlattice answer-test search index exceeds the supported preload boundary.');
    }
    const searchIndex = indexSnapshot.docs.map(doc => parseAnswerlatticeRetrievalSearchIndex(
        { ...doc.data(), id: doc.id },
        scope,
    ));
    const latestRelease = releaseSnapshot.empty
        ? null
        : parseAnswerlatticeRetrievalRelease(
            { ...releaseSnapshot.docs[0].data(), id: releaseSnapshot.docs[0].id },
            scope,
        );

    const sourceVersions = normalizeAnswerlatticeAnswerTestSourceVersions(compiledSourceVersions);
    if (!sourceVersions) {
        throw new Error('Answerlattice answer-test source versions are unavailable.');
    }

    return { searchIndex, latestRelease, activeAnswerCache: new Map(), kbSourceVersion, sourceVersions };
};

const loadAnswerlatticeProposalImpactPreload = async (
    scope: AnswerTestScope,
    currentVersion: number,
): Promise<AnswerTestRetrievalPreload> => {
    const [indexSnapshot, kbSourceVersion] = await Promise.all([
        getDb().collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .limit(501)
            .get(),
        getAnswerlatticeCacheVersionServer(ANSWERLATTICE_CACHE_SOURCES.KB, scope.tId, scope.sId),
    ]);
    if (indexSnapshot.size > 500) {
        throw new Error('Answerlattice proposal-impact search index exceeds the supported preload boundary.');
    }
    const searchIndex = indexSnapshot.docs.map(doc => parseAnswerlatticeRetrievalSearchIndex(
        { ...doc.data(), id: doc.id },
        scope,
    ));
    return {
        searchIndex,
        latestRelease: null,
        currentVersion,
        activeAnswerCache: new Map(),
        kbSourceVersion,
    };
};

const runDeterministicAnswer = async (
    testCase: AnswerlatticeAnswerTestCase,
    scope: AnswerTestScope,
    preload: AnswerTestRetrievalPreload,
): Promise<ResolvedAnswer> => {
    const canonical = await attemptCanonicalRetrieval(testCase.query, {
        tId: scope.tId,
        sId: scope.sId,
        currentVersion: preload.currentVersion,
        context: testCase.context,
        preloadedSearchIndex: preload.searchIndex,
        preloadedLatestRelease: preload.latestRelease,
        activeAnswerCache: preload.activeAnswerCache,
    });

    if (canonical.found && canonical.answer) {
        return {
            source: 'canonical',
            answer: canonical.answer.content.detailedExplanation || canonical.answer.content.structuredSummary,
            answerId: canonical.answer.id,
            relatedEntityIds: canonical.matchedEntityIds,
            confidence: canonical.confidence,
            referenceIds: [],
            aiProviderUsed: false,
        };
    }

    if (isCanonicalGovernedFallbackReason(canonical.fallbackReason)) {
        return {
            source: 'escalation',
            answer: CANONICAL_GOVERNED_FALLBACK_MESSAGES[canonical.fallbackReason],
            relatedEntityIds: canonical.matchedEntityIds,
            confidence: 'low',
            referenceIds: [],
            aiProviderUsed: false,
        };
    }

    const faq = await attemptFaqAnswerRetrieval(testCase.query, {
        tId: scope.tId,
        sId: scope.sId,
        context: testCase.context,
        sourceVersion: preload.kbSourceVersion,
        includeFullArticleReference: false,
    });
    if (faq.found && faq.faq) {
        return {
            source: 'faq',
            answer: faq.faq.answer,
            faqId: faq.faq.id,
            relatedEntityIds: Array.isArray(faq.faq.entityIds) ? faq.faq.entityIds.map(String).slice(0, 10) : [],
            referenceIds: extractAnswerTestReferenceIds(faq.references),
            confidence: faq.confidence,
            aiProviderUsed: false,
        };
    }

    return {
        source: 'no_answer',
        answer: '',
        confidence: canonical.confidence,
        aiProviderUsed: false,
        relatedEntityIds: [],
        referenceIds: [],
    };
};

const cloneAnswerTestRetrievalPreload = (
    preload: AnswerTestRetrievalPreload,
): AnswerTestRetrievalPreload => ({
    ...preload,
    activeAnswerCache: new Map(
        Array.from(preload.activeAnswerCache.entries()).map(([key, answers]) => [key, [...answers]]),
    ),
});

const overlayAnswerlatticeProposalCandidate = (
    preload: AnswerTestRetrievalPreload,
    scope: AnswerTestScope,
    candidate: AnswerlatticeCanonicalAnswer,
    targetAnswerId: string | null,
) => {
    const candidateEntityIds = new Set(candidate.scope.entityIds);
    for (const [cacheKey, answers] of Array.from(preload.activeAnswerCache.entries())) {
        const entityId = candidate.scope.entityIds.find(
            id => getAnswerlatticeCanonicalAnswerCacheKey(scope.tId, scope.sId, id) === cacheKey,
        );
        const nextAnswers = answers.filter(answer => (
            answer.id !== candidate.id
            && (!targetAnswerId || answer.id !== targetAnswerId)
        ));
        if (entityId && candidateEntityIds.has(entityId) && candidate.status === 'active') {
            nextAnswers.push(candidate);
        }
        preload.activeAnswerCache.set(cacheKey, nextAnswers);
    }
};

export const runAnswerlatticeProposalImpactTests = async ({
    candidate,
    cases,
    currentVersion,
    scope,
    targetAnswerId,
}: {
    candidate: AnswerlatticeCanonicalAnswer;
    cases: AnswerlatticeAnswerTestCase[];
    currentVersion: number;
    scope: AnswerTestScope;
    targetAnswerId: string | null;
}): Promise<{
    comparisons: AnswerlatticeProposalImpactComparison[];
    currentResults: AnswerlatticeAnswerTestCaseResult[];
    proposedResults: AnswerlatticeAnswerTestCaseResult[];
}> => {
    const currentPreload = await loadAnswerlatticeProposalImpactPreload(scope, currentVersion);
    const currentResults: AnswerlatticeAnswerTestCaseResult[] = [];
    for (const testCase of cases) {
        const startedAt = Date.now();
        const resolved = await runDeterministicAnswer(testCase, scope, currentPreload);
        currentResults.push(evaluateAnswerTestCase(testCase, resolved, Date.now() - startedAt));
    }

    const proposedPreload = cloneAnswerTestRetrievalPreload(currentPreload);
    overlayAnswerlatticeProposalCandidate(proposedPreload, scope, candidate, targetAnswerId);
    const proposedResults: AnswerlatticeAnswerTestCaseResult[] = [];
    for (const testCase of cases) {
        const startedAt = Date.now();
        const resolved = await runDeterministicAnswer(testCase, scope, proposedPreload);
        proposedResults.push(evaluateAnswerTestCase(testCase, resolved, Date.now() - startedAt));
    }

    const comparisons = cases.map((testCase, index): AnswerlatticeProposalImpactComparison => ({
        caseId: testCase.id,
        title: testCase.title,
        riskLevel: testCase.riskLevel,
        classification: classifyAnswerlatticeProposalImpact(currentResults[index], proposedResults[index]),
        current: currentResults[index],
        proposed: proposedResults[index],
    }));
    return { comparisons, currentResults, proposedResults };
};

const resolveCoreSearchAnswer = (result: CoreSearchResult): ResolvedAnswer => {
    const source: AnswerlatticeAnswerTestSource = result.escalation?.escalationSuggested
        ? 'escalation'
        : result.answerSource === 'canonical'
            ? 'canonical'
            : result.answerSource === 'faq'
                ? 'faq'
                : result.answerSource === 'rag'
                    ? 'rag'
                    : 'no_answer';

    return {
        source,
        answer: source === 'no_answer' ? '' : String(result.craftedAnswer || ''),
        answerId: result.canonicalAnswerId,
        faqId: result.faqAnswerId,
        relatedEntityIds: [],
        referenceIds: extractAnswerTestReferenceIds(result.references),
        confidence: result.confidence,
        aiProviderUsed: Boolean(result.aiProviderUsed),
        aiProviderOperations: result.aiProviderOperations,
        aiProviderTokenUsage: result.aiProviderTokenUsage,
    };
};

const accountProviderBackedTest = async (
    scope: AnswerTestScope,
    actor: AnswerlatticeAiActor,
    capacitySubscription: FirestoreSubscriptionDoc | null,
    runId: string,
    testCase: AnswerlatticeAnswerTestCase,
    resolved: ResolvedAnswer,
    durationMs: number,
) => {
    if (!resolved.aiProviderUsed) return;
    await finalizeAnswerlatticeAiOperationAccounting({
        actor,
        capacitySubscription,
        context: {
            answerTestCaseId: testCase.id,
            answerTestRunId: runId,
            source: resolved.source,
        },
        idempotencyKey: getAnswerTestAccountingIdempotencyKey(runId, testCase),
        input: {
            action: AI_ACTIONS_TYPES.ANSWERLATTICE_ANSWER_TEST,
            billingMode: 'billable',
            clientResponse: {
                responseSummaryKind: 'answerlattice_answer_test',
                answerSource: resolved.source,
                providerOperations: resolved.aiProviderOperations || [],
            },
            model: 'coreSearch',
            processingTime: durationMs,
            promptTokenCount: resolved.aiProviderTokenUsage?.promptTokenCount || 0,
            candidatesTokenCount: resolved.aiProviderTokenUsage?.candidatesTokenCount || 0,
            totalTokenCount: resolved.aiProviderTokenUsage?.totalTokenCount || 0,
            source: 'answerlattice_answer_test',
            unitsConsumed: 1,
        },
        logLabel: 'answer test',
        scope,
    });
};

export const runAnswerlatticeAnswerTests = async ({
    actor,
    cases,
    mode,
    release,
    runId,
    scope,
}: {
    actor: AnswerlatticeAiActor;
    cases: AnswerlatticeAnswerTestCase[];
    mode: AnswerlatticeAnswerTestMode;
    release?: AnswerlatticeRelease | null;
    runId: string;
    scope: AnswerTestScope;
}): Promise<AnswerlatticeAnswerTestRun> => {
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();
    const preload = await loadAnswerlatticeAnswerTestPreload(scope);
    const deterministicRuns: Array<{ resolved: ResolvedAnswer; durationMs: number }> = [];
    for (const testCase of cases) {
        const caseStartedAt = Date.now();
        const resolved = await runDeterministicAnswer(testCase, scope, preload);
        deterministicRuns.push({ resolved, durationMs: Date.now() - caseStartedAt });
    }
    const deterministic = deterministicRuns.map(result => result.resolved);
    const caseDurations = deterministicRuns.map(result => result.durationMs);
    const fallbackIndexes = mode === 'full_runtime'
        ? deterministic.map((answer, index) => answer.source === 'no_answer' ? index : -1).filter(index => index >= 0)
        : [];

    let capacitySubscription: FirestoreSubscriptionDoc | null = null;
    if (fallbackIndexes.length > 0) {
        const capacity = await checkAnswerlatticeAICapacity(
            scope,
            AI_ACTIONS_TYPES.ANSWERLATTICE_ANSWER_TEST,
            fallbackIndexes.length,
        );
        if (!capacity.allowed) {
            throw new AnswerlatticeAnswerTestCapacityError(capacity.remaining, capacity.unitsRequired);
        }
        capacitySubscription = capacity.subscription;
    }

    const resolvedAnswers = [...deterministic];
    for (const index of fallbackIndexes) {
        const testCase = cases[index];
        const caseStartedAt = Date.now();
        const result = await coreSearch({
            query: testCase.query,
            mountContext: 'help_center',
            executionContext: 'answer_test',
            retrievalPreload: preload,
            tId: scope.tId,
            sId: scope.sId,
            uId: String(actor.id || 'answer-test'),
            productContext: testCase.context,
        });
        const resolved = resolveCoreSearchAnswer(result);
        await accountProviderBackedTest(
            scope,
            actor,
            capacitySubscription,
            runId,
            testCase,
            resolved,
            Date.now() - caseStartedAt,
        );
        resolvedAnswers[index] = resolved;
        caseDurations[index] = Date.now() - caseStartedAt;
    }

    const results = cases.map((testCase, index) => (
        evaluateAnswerTestCase(testCase, resolvedAnswers[index], caseDurations[index] || 0)
    ));
    const passedCount = results.filter(result => result.passed).length;
    const failedCount = results.length - passedCount;
    const proof = getAnswerTestProofSummary(results);
    const completedAt = new Date().toISOString();

    return {
        id: runId,
        mode,
        status: failedCount === 0 ? 'passed' : passedCount === 0 ? 'failed' : 'partial',
        startedAt,
        completedAt,
        createdBy: String(actor.email || actor.name || actor.id || 'unknown').slice(0, 180),
        caseCount: results.length,
        passedCount,
        failedCount,
        ...proof,
        providerCaseCount: results.filter(result => result.aiProviderUsed).length,
        durationMs: Date.now() - startedAtMs,
        ...(release?.id ? { releaseId: release.id } : {}),
        ...(release?.versionLabel ? { releaseVersion: release.versionLabel } : {}),
        sourceVersions: preload.sourceVersions,
        results,
    };
};

export const saveAnswerlatticeAnswerTestRun = async (
    scope: AnswerTestScope,
    run: AnswerlatticeAnswerTestRun,
): Promise<AnswerlatticeAnswerTestSummary> => {
    const summaryRef = getSummaryRef(scope);
    return getDb().runTransaction(async transaction => {
        const snapshot = await transaction.get(summaryRef);
        const current = normalizeAnswerlatticeAnswerTestSummary(snapshot.exists ? snapshot.data() : undefined, scope);
        const next = compactAnswerlatticeAnswerTestSummaryForWrite({
            ...current,
            revision: current.revision + 1,
            runs: [run, ...current.runs.filter(existing => existing.id !== run.id)].slice(0, ANSWERLATTICE_ANSWER_TEST_MAX_RUNS),
            reservations: current.reservations.filter(reservation => reservation.id !== run.id),
            updatedAt: run.completedAt,
            updatedBy: run.createdBy,
        });
        transaction.set(summaryRef, next, { merge: false });
        return next;
    });
};

export const getAnswerlatticeAnswerTestRelease = async (
    scope: AnswerTestScope,
    releaseId: string,
): Promise<AnswerlatticeRelease | null> => {
    const normalizedReleaseId = normalizeAnswerlatticeReleaseId(releaseId);
    if (!normalizedReleaseId) return null;
    const snapshot = await getDb().collection(DB_COLLECTIONS.ANSWERLATTICE_RELEASES).doc(normalizedReleaseId).get();
    if (!snapshot.exists) return null;
    const release = { ...snapshot.data(), id: snapshot.id } as AnswerlatticeRelease;
    if (
        normalizeAnswerlatticeScopeDocumentId(release.tId) !== scope.tId
        || normalizeAnswerlatticeScopeDocumentId(release.sId) !== scope.sId
    ) return null;
    return release;
};

export const selectAnswerlatticeReleaseTestCases = (
    cases: AnswerlatticeAnswerTestCase[],
    release: AnswerlatticeRelease,
): AnswerlatticeAnswerTestCase[] => {
    const changed = new Set((release.entityChanges || []).map(String));
    return cases.filter(testCase => (
        testCase.active
        && testCase.relatedEntityIds.some(entityId => changed.has(entityId))
    ));
};
