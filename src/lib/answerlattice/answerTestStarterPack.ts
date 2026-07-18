import type { AnswerlatticeAnswerTestCase } from '@lib/answerlattice/answerTestContracts';
import { isAnswerlatticeProductStarterPackCaseId } from '@lib/answerlattice/firstTrustedAnswerPackContracts';

type StarterCaseDefinition = Readonly<{
    id: string;
    title: string;
    query: string;
    feature: string;
    workflow: string;
    riskLevel: AnswerlatticeAnswerTestCase['riskLevel'];
}>;

export const ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS = [
    'starter_getting_started',
    'starter_account_access',
    'starter_billing_charge',
    'starter_plan_limits',
    'starter_team_permissions',
    'starter_data_import',
    'starter_integration_setup',
    'starter_common_error',
    'starter_cancel_export',
    'starter_recent_change',
] as const;

const STARTER_CASES: StarterCaseDefinition[] = [
    { id: 'starter_getting_started', title: 'Getting started', query: 'What should I do first after creating my account?', feature: 'onboarding', workflow: 'first_setup', riskLevel: 'standard' },
    { id: 'starter_account_access', title: 'Account access', query: 'I cannot sign in. What should I check?', feature: 'account', workflow: 'sign_in_recovery', riskLevel: 'standard' },
    { id: 'starter_billing_charge', title: 'Billing and charges', query: 'Why was I charged and where can I see the invoice?', feature: 'billing', workflow: 'invoice_review', riskLevel: 'critical' },
    { id: 'starter_plan_limits', title: 'Plan limits', query: 'What is included in my plan and what happens when I reach a limit?', feature: 'billing', workflow: 'plan_limits', riskLevel: 'critical' },
    { id: 'starter_team_permissions', title: 'Team access and permissions', query: 'How do I invite a teammate and control what they can access?', feature: 'team', workflow: 'invite_member', riskLevel: 'standard' },
    { id: 'starter_data_import', title: 'Import or add data', query: 'How do I import or add my existing data?', feature: 'data', workflow: 'import_data', riskLevel: 'standard' },
    { id: 'starter_integration_setup', title: 'Integration setup', query: 'How do I connect an integration and verify that it is working?', feature: 'integrations', workflow: 'connect_integration', riskLevel: 'standard' },
    { id: 'starter_common_error', title: 'Common error recovery', query: 'I see an error while completing this step. What should I try next?', feature: 'errors', workflow: 'recover_from_error', riskLevel: 'standard' },
    { id: 'starter_cancel_export', title: 'Cancellation and data export', query: 'How do I export my data or cancel my account safely?', feature: 'account', workflow: 'export_or_cancel', riskLevel: 'critical' },
    { id: 'starter_recent_change', title: 'Recent product change', query: 'What changed recently and does it affect how I use this feature?', feature: 'releases', workflow: 'review_recent_change', riskLevel: 'standard' },
];

export const createAnswerlatticeFirstTrustedAnswerCases = (
    existingCaseIds: Iterable<string>,
    now = new Date(),
): AnswerlatticeAnswerTestCase[] => {
    const existing = new Set(existingCaseIds);
    if (Array.from(existing).some(isAnswerlatticeProductStarterPackCaseId)) return [];
    const timestamp = now.toISOString();

    return STARTER_CASES
        .filter(testCase => !existing.has(testCase.id))
        .map(testCase => ({
            id: testCase.id,
            title: testCase.title,
            query: testCase.query,
            context: {
                contextVersion: 1,
                feature: testCase.feature,
                workflow: testCase.workflow,
            },
            expected: {
                source: 'canonical',
                mustInclude: [],
                mustNotInclude: [],
                citationPolicy: 'not_required',
                referenceIds: [],
            },
            riskLevel: testCase.riskLevel,
            relatedEntityIds: [],
            active: true,
            createdAt: timestamp,
            updatedAt: timestamp,
        }));
};

export const countAnswerlatticeFirstTrustedAnswerCases = (
    cases: ReadonlyArray<Pick<AnswerlatticeAnswerTestCase, 'id'>>,
): number => {
    const starterIds = new Set<string>(ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS);
    return cases.filter(testCase => (
        starterIds.has(testCase.id) || isAnswerlatticeProductStarterPackCaseId(testCase.id)
    )).length;
};

export const replaceAnswerlatticeFirstTrustedAnswerCases = (
    existingCases: AnswerlatticeAnswerTestCase[],
    productCases: AnswerlatticeAnswerTestCase[],
): AnswerlatticeAnswerTestCase[] => {
    const genericStarterIds = new Set<string>(ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS);
    const existingById = new Map(existingCases.map(testCase => [testCase.id, testCase]));
    const nextProductCases = productCases.map((testCase) => {
        const existing = existingById.get(testCase.id);
        return existing?.launchPack?.sourceHash
            && existing.launchPack.sourceHash === testCase.launchPack?.sourceHash
            ? existing
            : testCase;
    });
    return [
        ...existingCases.filter(testCase => (
            !genericStarterIds.has(testCase.id)
            && !isAnswerlatticeProductStarterPackCaseId(testCase.id)
        )),
        ...nextProductCases,
    ];
};
