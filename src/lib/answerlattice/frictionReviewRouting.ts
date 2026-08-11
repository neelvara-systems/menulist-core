import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_GOVERNANCE_TABS,
    getAnswerlatticeGovernanceRoute,
} from '@constant/answerlattice/navigations';
import { normalizeAnswerlatticeEntityId } from '@lib/answerlattice/governanceIdBoundary';
import { getAnswerlatticeEntityContextRoute } from '@lib/answerlattice/ownerDecisionNavigation';
import {
    AnswerlatticeFrictionReviewPath,
    isAnswerlatticeFrictionReviewPath,
} from '@lib/answerlattice/frictionEvidenceBrief';

export type AnswerlatticeFrictionReviewDestination =
    | {
        actionLabel: string;
        helperText: string;
        href: string;
        kind: 'internal_route';
    }
    | {
        actionLabel: string;
        helperText: string;
        kind: 'local_export';
    }
    | {
        actionLabel: string;
        helperText: string;
        kind: 'close';
    };

const KNOWLEDGE_MAP_ROUTE = getAnswerlatticeGovernanceRoute(
    ANSWERLATTICE_GOVERNANCE_TABS.MAP,
);
const TRUSTED_ANSWERS_ROUTE = getAnswerlatticeGovernanceRoute(
    ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS,
);

const LOCAL_EXPORT_FALLBACK: AnswerlatticeFrictionReviewDestination = {
    actionLabel: 'Copy brief',
    helperText: 'This topic cannot be routed safely. Copy the evidence brief and verify the product context before acting.',
    kind: 'local_export',
};

const KNOWLEDGE_MAP_DISABLED_FALLBACK: AnswerlatticeFrictionReviewDestination = {
    actionLabel: 'Copy brief',
    helperText: 'Product context is unavailable right now. Copy the evidence brief and review the topic in your existing product system.',
    kind: 'local_export',
};

const buildEntityRoute = (
    actionLabel: string,
    helperText: string,
    route: string,
    entityId: unknown,
): AnswerlatticeFrictionReviewDestination => {
    const normalizedEntityId = normalizeAnswerlatticeEntityId(entityId);
    if (!normalizedEntityId) return LOCAL_EXPORT_FALLBACK;

    return {
        actionLabel,
        helperText,
        href: getAnswerlatticeEntityContextRoute(route, normalizedEntityId),
        kind: 'internal_route',
    };
};

export const getAnswerlatticeFrictionReviewDestination = (
    reviewPath: AnswerlatticeFrictionReviewPath,
    entityId: unknown,
): AnswerlatticeFrictionReviewDestination => {
    if (!isAnswerlatticeFrictionReviewPath(reviewPath)) return LOCAL_EXPORT_FALLBACK;

    switch (reviewPath) {
        case 'investigate_further':
            if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP) {
                return KNOWLEDGE_MAP_DISABLED_FALLBACK;
            }
            return buildEntityRoute(
                'Open product context',
                'Inspect the mapped topic and its governed relationships before deciding what should change.',
                KNOWLEDGE_MAP_ROUTE,
                entityId,
            );
        case 'review_support_knowledge':
            return buildEntityRoute(
                'Review trusted answers',
                'Open trusted answers filtered to this product topic.',
                TRUSTED_ANSWERS_ROUTE,
                entityId,
            );
        case 'review_product_behavior':
            return {
                actionLabel: 'Copy for product review',
                helperText: 'Answerlattice does not own engineering work. Copy the evidence brief into the product or engineering system you already use.',
                kind: 'local_export',
            };
        case 'review_known_limitation':
            return buildEntityRoute(
                'Review limitation answers',
                'Open trusted answers for this topic and verify that the limitation is intentional, approved, and current.',
                TRUSTED_ANSWERS_ROUTE,
                entityId,
            );
        case 'review_access_explanation':
            return buildEntityRoute(
                'Review scoped answers',
                'Open trusted answers for this topic and inspect their plan and role scope.',
                TRUSTED_ANSWERS_ROUTE,
                entityId,
            );
        case 'watch_next_window':
            return {
                actionLabel: 'Close review',
                helperText: 'No reminder is created. Return after the next completed seven-day evidence window.',
                kind: 'close',
            };
        case 'no_action_now':
            return {
                actionLabel: 'Close without changes',
                helperText: 'Nothing is saved or changed by this selection.',
                kind: 'close',
            };
    }
};
