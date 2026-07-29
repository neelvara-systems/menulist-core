import type {
    AnswerlatticeAnswerTestCase,
    AnswerlatticeAnswerTestCaseResult,
    AnswerlatticeAnswerTestCitationPolicy,
    AnswerlatticeAnswerTestProofStatus,
    AnswerlatticeAnswerTestSource,
} from '@lib/answerlattice/answerTestContracts';

const ANSWER_PREVIEW_MAX_LENGTH = 360;
const ANSWER_TEST_REFERENCE_LIMIT = 8;
const CONFIDENCE_ORDER = { none: 0, low: 1, medium: 2, high: 3 } as const;

export type AnswerlatticeResolvedTestAnswer = {
    source: AnswerlatticeAnswerTestSource;
    answer: string;
    answerId?: string;
    faqId?: string;
    relatedEntityIds?: string[];
    referenceIds?: string[];
    confidence?: 'high' | 'medium' | 'low' | 'none';
    aiProviderUsed: boolean;
};

const normalizeReferenceId = (value: unknown): string | null => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized ? normalized.slice(0, 160) : null;
};

export const extractAnswerTestReferenceIds = (references: unknown): string[] => {
    if (!Array.isArray(references)) return [];
    const ids = references
        .map((reference) => {
            if (typeof reference === 'string') return normalizeReferenceId(reference);
            if (!reference || typeof reference !== 'object' || Array.isArray(reference)) return null;
            return normalizeReferenceId((reference as Record<string, unknown>).id);
        })
        .filter((id): id is string => Boolean(id));
    return Array.from(new Set(ids)).slice(0, ANSWER_TEST_REFERENCE_LIMIT);
};

export const getAnswerTestProofSummary = (results: AnswerlatticeAnswerTestCaseResult[]): {
    criticalCaseCount: number;
    criticalFailureCount: number;
    proofStatus: AnswerlatticeAnswerTestProofStatus;
} => {
    const criticalCaseCount = results.filter(result => result.riskLevel === 'critical').length;
    const criticalFailureCount = results.filter(result => result.riskLevel === 'critical' && !result.passed).length;
    const failedCount = results.filter(result => !result.passed).length;
    return {
        criticalCaseCount,
        criticalFailureCount,
        proofStatus: criticalFailureCount > 0 ? 'blocked' : failedCount > 0 ? 'review' : 'ready',
    };
};

const evaluateCitationPolicy = (
    policy: AnswerlatticeAnswerTestCitationPolicy,
    expectedReferenceIds: string[],
    actualReferenceIds: string[],
) => {
    if (policy === 'not_required') return { passed: true, missingReferenceIds: [] as string[] };
    if (policy === 'at_least_one') {
        return { passed: actualReferenceIds.length > 0, missingReferenceIds: [] as string[] };
    }

    const actualIds = new Set(actualReferenceIds);
    const missingReferenceIds = expectedReferenceIds.filter(referenceId => !actualIds.has(referenceId));
    return { passed: missingReferenceIds.length === 0, missingReferenceIds };
};

export const evaluateAnswerTestCase = (
    testCase: AnswerlatticeAnswerTestCase,
    resolved: AnswerlatticeResolvedTestAnswer,
    durationMs: number,
): AnswerlatticeAnswerTestCaseResult => {
    const failures: string[] = [];
    const expected = testCase.expected;
    const normalizedAnswer = resolved.answer.toLowerCase();
    const referenceIds = extractAnswerTestReferenceIds(resolved.referenceIds || []);
    const citationEvaluation = evaluateCitationPolicy(
        expected.citationPolicy,
        expected.referenceIds,
        referenceIds,
    );

    if (resolved.source !== expected.source) {
        failures.push(`Expected ${expected.source}, received ${resolved.source}.`);
    }
    if (testCase.riskLevel === 'critical' && resolved.source === 'rag') {
        failures.push(
            'Critical proof requires approved canonical or FAQ truth, or a safe escalation or no-answer route. Knowledge fallback cannot certify a critical answer.',
        );
    }
    if (expected.answerId && resolved.answerId !== expected.answerId) {
        failures.push('The canonical answer did not match the expected answer.');
    }
    if (expected.faqId && resolved.faqId !== expected.faqId) {
        failures.push('The FAQ did not match the expected FAQ.');
    }
    if (
        expected.minimumConfidence
        && CONFIDENCE_ORDER[resolved.confidence || 'none'] < CONFIDENCE_ORDER[expected.minimumConfidence]
    ) {
        failures.push(`Confidence was below ${expected.minimumConfidence}.`);
    }
    expected.mustInclude.forEach((phrase) => {
        if (!normalizedAnswer.includes(phrase.toLowerCase())) {
            failures.push(`Answer did not include required phrase: ${phrase}`);
        }
    });
    expected.mustNotInclude.forEach((phrase) => {
        if (normalizedAnswer.includes(phrase.toLowerCase())) {
            failures.push(`Answer included blocked phrase: ${phrase}`);
        }
    });
    if (!citationEvaluation.passed) {
        failures.push(expected.citationPolicy === 'at_least_one'
            ? 'Answer did not include a supporting reference.'
            : `Answer was missing expected references: ${citationEvaluation.missingReferenceIds.join(', ')}`);
    }

    return {
        caseId: testCase.id,
        title: testCase.title,
        passed: failures.length === 0,
        source: resolved.source,
        ...(resolved.answerId ? { answerId: resolved.answerId } : {}),
        ...(resolved.faqId ? { faqId: resolved.faqId } : {}),
        riskLevel: testCase.riskLevel,
        relatedEntityIds: (resolved.relatedEntityIds || []).slice(0, 10),
        referenceIds,
        citationPolicy: expected.citationPolicy,
        citationPassed: citationEvaluation.passed,
        missingReferenceIds: citationEvaluation.missingReferenceIds,
        ...(resolved.confidence ? { confidence: resolved.confidence } : {}),
        answerPreview: resolved.answer.replace(/\s+/g, ' ').trim().slice(0, ANSWER_PREVIEW_MAX_LENGTH),
        failures,
        aiProviderUsed: resolved.aiProviderUsed,
        durationMs: Math.max(0, Math.floor(durationMs)),
    };
};
