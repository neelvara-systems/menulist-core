import { ANSWERLATTICE_FIRST_TRUSTED_ANSWER_STARTER_QUESTIONS } from '@lib/answerlattice/firstTrustedAnswerStarterQuestions';

export const ANSWERLATTICE_ONBOARDING_SURFACE_OPTIONS = [
    { key: 'billing', label: 'Billing', starterQuestionIds: ['starter_billing_charge', 'starter_plan_limits'] },
    { key: 'onboarding', label: 'Onboarding', starterQuestionIds: ['starter_getting_started', 'starter_data_import'] },
    { key: 'settings', label: 'Settings', starterQuestionIds: ['starter_account_access', 'starter_common_error'] },
    { key: 'team', label: 'Team', starterQuestionIds: ['starter_team_permissions', 'starter_account_access'] },
    { key: 'integrations', label: 'Connected apps', starterQuestionIds: ['starter_integration_setup', 'starter_common_error'] },
    { key: 'release_notes', label: 'Release notes', starterQuestionIds: ['starter_recent_change', 'starter_plan_limits'] },
] as const;

export type AnswerlatticeOnboardingSurfaceKey = typeof ANSWERLATTICE_ONBOARDING_SURFACE_OPTIONS[number]['key'];

const MAX_PREVIEW_QUESTIONS = 4;
const surfaceByKey = new Map(ANSWERLATTICE_ONBOARDING_SURFACE_OPTIONS.map(surface => [surface.key, surface]));
const starterQuestionById = new Map(
    ANSWERLATTICE_FIRST_TRUSTED_ANSWER_STARTER_QUESTIONS.map(question => [question.id, question]),
);

export const buildAnswerlatticeOnboardingProof = (input: {
    companyName: string;
    productName: string;
    primarySurfaces: readonly string[];
}) => {
    const selectedSurfaces = Array.from(new Set(input.primarySurfaces))
        .flatMap(key => {
            const surface = surfaceByKey.get(key as AnswerlatticeOnboardingSurfaceKey);
            return surface ? [surface] : [];
        });
    const priorityQuestionIds = Array.from(new Set(
        selectedSurfaces.flatMap(surface => surface.starterQuestionIds),
    ));
    const fallbackQuestionIds = ANSWERLATTICE_FIRST_TRUSTED_ANSWER_STARTER_QUESTIONS.map(question => question.id);
    const previewQuestionIds = [...priorityQuestionIds, ...fallbackQuestionIds]
        .filter((id, index, allIds) => allIds.indexOf(id) === index)
        .slice(0, MAX_PREVIEW_QUESTIONS);
    const subjectLabel = input.productName.trim() || input.companyName.trim();

    return {
        subjectLabel,
        selectedSurfaces: selectedSurfaces.map(surface => ({ key: surface.key, label: surface.label })),
        priorityQuestions: previewQuestionIds.flatMap(id => {
            const question = starterQuestionById.get(id);
            return question ? [{ id: question.id, title: question.title, query: question.query }] : [];
        }),
        totalStarterQuestionCount: ANSWERLATTICE_FIRST_TRUSTED_ANSWER_STARTER_QUESTIONS.length,
    };
};
