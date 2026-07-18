import {
    ANSWERLATTICE_ANSWER_TEST_PROOF_STATUSES,
    ANSWERLATTICE_ANSWER_TEST_RISK_LEVELS,
    AnswerlatticeAnswerTestCaseResultSchema,
    type AnswerlatticeAnswerTestCase,
    type AnswerlatticeAnswerTestCaseResult,
    type AnswerlatticeAnswerTestProofStatus,
} from '@lib/answerlattice/answerTestContracts';
import {
    AnswerlatticeGovernanceEditedContentSchema,
    type AnswerlatticeGovernanceEditedContent,
} from '@lib/answerlattice/governanceContracts';
import {
    normalizeAnswerlatticeMutationProposalId,
    normalizeAnswerlatticeResolvedEntityIds,
} from '@lib/answerlattice/governanceIdBoundary';
import { z } from 'zod';

export const ANSWERLATTICE_PROPOSAL_IMPACT_MAX_CASES = 10;
export const ANSWERLATTICE_PROPOSAL_IMPACT_MAX_AFFECTED_ENTITIES = 75;
export const ANSWERLATTICE_PROPOSAL_IMPACT_CLASSIFICATIONS = [
    'regression',
    'improvement',
    'changed',
    'unchanged',
] as const;

const ProposalIdSchema = z.string().trim().min(1).max(180).refine(
    value => normalizeAnswerlatticeMutationProposalId(value) === value,
    'Invalid mutation proposal id',
);

export const AnswerlatticeProposalImpactRequestSchema = z.object({
    requestId: z.string().trim().min(8).max(100).regex(/^[A-Za-z0-9_-]+$/),
    proposalId: ProposalIdSchema,
    editedContent: AnswerlatticeGovernanceEditedContentSchema.optional(),
}).strict();

const AnswerlatticeProposalImpactAnswerSummarySchema = z.object({
    answerId: z.string().trim().min(1).max(180),
    title: z.string().trim().min(1).max(240),
    status: z.enum(['active', 'needs_review', 'deprecated', 'archived']),
    answerType: z.enum(['explanation', 'navigation', 'procedure']),
    entityIds: z.array(z.string().trim().min(1).max(180)).min(1).max(25),
    versionFrom: z.number().int().positive(),
    versionTo: z.number().int().positive().nullable(),
    structuredSummary: z.string().trim().min(1).max(500),
}).strict();

export const AnswerlatticeProposalImpactComparisonSchema = z.object({
    caseId: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120),
    riskLevel: z.enum(ANSWERLATTICE_ANSWER_TEST_RISK_LEVELS),
    classification: z.enum(ANSWERLATTICE_PROPOSAL_IMPACT_CLASSIFICATIONS),
    current: AnswerlatticeAnswerTestCaseResultSchema,
    proposed: AnswerlatticeAnswerTestCaseResultSchema,
}).strict();

export const AnswerlatticeProposalImpactResponseSchema = z.object({
    requestId: z.string().trim().min(8).max(100),
    proposalId: ProposalIdSchema,
    candidate: AnswerlatticeProposalImpactAnswerSummarySchema,
    currentAnswer: AnswerlatticeProposalImpactAnswerSummarySchema.nullable(),
    linkedTestCount: z.number().int().nonnegative(),
    evaluatedTestCount: z.number().int().nonnegative().max(ANSWERLATTICE_PROPOSAL_IMPACT_MAX_CASES),
    testsTruncated: z.boolean(),
    currentProofStatus: z.enum(ANSWERLATTICE_ANSWER_TEST_PROOF_STATUSES).nullable(),
    proposedProofStatus: z.enum(ANSWERLATTICE_ANSWER_TEST_PROOF_STATUSES).nullable(),
    regressionCount: z.number().int().nonnegative(),
    improvementCount: z.number().int().nonnegative(),
    changedCount: z.number().int().nonnegative(),
    unchangedCount: z.number().int().nonnegative(),
    comparisons: z.array(AnswerlatticeProposalImpactComparisonSchema).max(ANSWERLATTICE_PROPOSAL_IMPACT_MAX_CASES),
    warnings: z.array(z.string().trim().min(1).max(240)).max(6),
}).strict();

export type AnswerlatticeProposalImpactRequest = {
    requestId: string;
    proposalId: string;
    editedContent?: AnswerlatticeGovernanceEditedContent;
};
export type AnswerlatticeProposalImpactClassification =
    typeof ANSWERLATTICE_PROPOSAL_IMPACT_CLASSIFICATIONS[number];
export type AnswerlatticeProposalImpactComparison =
    z.infer<typeof AnswerlatticeProposalImpactComparisonSchema>;
export type AnswerlatticeProposalImpactResponse =
    z.infer<typeof AnswerlatticeProposalImpactResponseSchema>;

export const buildAnswerlatticeProposalImpactAffectedEntityIds = (
    ...entityIdGroups: ReadonlyArray<readonly unknown[]>
): string[] => normalizeAnswerlatticeResolvedEntityIds(
    entityIdGroups.flat(),
    ANSWERLATTICE_PROPOSAL_IMPACT_MAX_AFFECTED_ENTITIES,
);

export const selectAnswerlatticeProposalImpactCases = (
    cases: AnswerlatticeAnswerTestCase[],
    relatedEntityIds: string[],
    targetAnswerId?: string | null,
): {
    cases: AnswerlatticeAnswerTestCase[];
    linkedTestCount: number;
    testsTruncated: boolean;
} => {
    const entityIds = new Set(relatedEntityIds);
    const linked = cases
        .map((testCase, index) => ({ testCase, index }))
        .filter(({ testCase }) => (
            testCase.active
            && (
                Boolean(targetAnswerId && testCase.expected.answerId === targetAnswerId)
                || testCase.relatedEntityIds.some(entityId => entityIds.has(entityId))
            )
        ))
        .sort((left, right) => {
            const riskDelta = Number(right.testCase.riskLevel === 'critical')
                - Number(left.testCase.riskLevel === 'critical');
            return riskDelta || left.index - right.index;
        });

    return {
        cases: linked.slice(0, ANSWERLATTICE_PROPOSAL_IMPACT_MAX_CASES).map(item => item.testCase),
        linkedTestCount: linked.length,
        testsTruncated: linked.length > ANSWERLATTICE_PROPOSAL_IMPACT_MAX_CASES,
    };
};

const resultChanged = (
    current: AnswerlatticeAnswerTestCaseResult,
    proposed: AnswerlatticeAnswerTestCaseResult,
): boolean => (
    current.source !== proposed.source
    || current.answerId !== proposed.answerId
    || current.faqId !== proposed.faqId
    || current.confidence !== proposed.confidence
    || current.answerPreview !== proposed.answerPreview
    || current.citationPassed !== proposed.citationPassed
    || current.failures.join('\n') !== proposed.failures.join('\n')
);

export const classifyAnswerlatticeProposalImpact = (
    current: AnswerlatticeAnswerTestCaseResult,
    proposed: AnswerlatticeAnswerTestCaseResult,
): AnswerlatticeProposalImpactClassification => {
    if (current.passed && !proposed.passed) return 'regression';
    if (!current.passed && proposed.passed) return 'improvement';
    return resultChanged(current, proposed) ? 'changed' : 'unchanged';
};

export const summarizeAnswerlatticeProposalImpact = (
    comparisons: AnswerlatticeProposalImpactComparison[],
    currentProofStatus: AnswerlatticeAnswerTestProofStatus | null,
    proposedProofStatus: AnswerlatticeAnswerTestProofStatus | null,
) => ({
    currentProofStatus,
    proposedProofStatus,
    regressionCount: comparisons.filter(item => item.classification === 'regression').length,
    improvementCount: comparisons.filter(item => item.classification === 'improvement').length,
    changedCount: comparisons.filter(item => item.classification === 'changed').length,
    unchangedCount: comparisons.filter(item => item.classification === 'unchanged').length,
});
