import { ANSWERLATTICE_GOVERNANCE_TABS, ANSWERLATTICE_ROUTES, getAnswerlatticeGovernanceRoute } from '@constant/answerlattice/navigations';
import { PRODUCT_IDS } from '@constant/product';
import { EMPTY_ANSWERLATTICE_ACTIVATION_ANSWER_TEST_SUMMARY } from '@lib/answerlattice/activationAnswerTestSummary';
import { isAnswerlatticeSubscriptionInScope } from '@lib/answerlattice/billingScopeBoundary';
import {
    getAnswerlatticeSubscriptionTimestampMillis,
    isAnswerlatticeSubscriptionCurrent,
    projectAnswerlatticeSubscriptionForRead,
} from '@lib/answerlattice/subscriptionReadBoundary';
import { normalizeWidgetAllowedOrigins } from '@lib/answerlattice/widgetConfig';
import { buildAnswerlatticeWidgetKeySummaries, normalizeAnswerlatticeWidgetApiState } from '@lib/answerlattice/widgetKeyManager';
import { getWidgetRuntimeStatusFromStoreData } from '@lib/answerlattice/widgetRuntimeStatus';
import { getNotificationReadiness } from '@lib/notifications';
import type {
    AnswerlatticeActivationStage,
    AnswerlatticeActivationAnswerTestSummary,
    AnswerlatticeActivationFirstValueEvidence,
    AnswerlatticeActivationStep,
    AnswerlatticeActivationStepStatus,
    AnswerlatticeActivationSubscriptionSummary,
    AnswerlatticeActivationSummary,
    AnswerlatticeCompiledContextReadiness,
    AnswerlatticeLaunchProofItem,
    AnswerlatticeLaunchProofSummary,
    AnswerlatticeSurfaceReadinessItem,
    AnswerlatticeSurfaceContentSummary,
    AnswerlatticeTrustMetrics,
    AnswerlatticeWidgetRuntimeStatus,
} from '@type/answerlattice';
import type { AnswerlatticeCoverageData } from '@database/answerlattice/coverageKPI';
import { createHash } from 'crypto';

export const getAnswerlatticeActivationSummaryDocId = (tId: number, sId: number) =>
    `activation_${Number(tId)}_${Number(sId)}`;

export const ANSWERLATTICE_WIDGET_RUNTIME_PROOF_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const ANSWERLATTICE_WIDGET_RUNTIME_CLOCK_SKEW_MS = 5 * 60 * 1000;
const ANSWERLATTICE_ACTIVATION_FIRST_VALUE_EVIDENCE_KEYS: ReadonlyArray<keyof AnswerlatticeActivationFirstValueEvidence> = [
    'knowledgeReadyObservedAt',
    'trustedAnswerReadyObservedAt',
    'answerTestProofReadyObservedAt',
    'widgetRuntimeVerifiedObservedAt',
    'launchProofReadyObservedAt',
];

const normalizeActivationFirstObservedAt = (value: unknown, nowMillis: number): string | null => {
    if (typeof value !== 'string' || value.length > 40) return null;
    const millis = Date.parse(value);
    if (!Number.isFinite(millis) || millis < 0 || millis > nowMillis) return null;
    return new Date(millis).toISOString() === value ? value : null;
};

const getTimestampMillis = (value: any): number => {
    if (!value) return 0;
    try {
        if (typeof value.toMillis === 'function') return value.toMillis();
        if (typeof value.seconds === 'number') return value.seconds * 1000;
        if (typeof value._seconds === 'number') return value._seconds * 1000;
        const parsed = Date.parse(String(value));
        return Number.isFinite(parsed) ? parsed : 0;
    } catch {
        return 0;
    }
};

const normalizeBoundedString = (value: unknown, maxLength: number): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    return normalized ? normalized.slice(0, maxLength) : null;
};

const normalizeNonNegativeSafeInteger = (value: unknown, max = 1_000_000): number => {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
        ? value
        : 0;
};

const normalizeWidgetRuntimeStatusForActivation = (
    storeData: Record<string, any>,
): AnswerlatticeWidgetRuntimeStatus | null => {
    const value = getWidgetRuntimeStatusFromStoreData(storeData);
    if (!value) return null;
    const lastSeenMillis = getTimestampMillis(value.lastSeenAt);

    return {
        lastSeenAt: lastSeenMillis > 0 ? new Date(lastSeenMillis).toISOString() : null,
        lastOrigin: normalizeBoundedString(value.lastOrigin, 180),
        lastPath: normalizeBoundedString(value.lastPath, 180),
        lastContextKey: normalizeBoundedString(value.lastContextKey, 120),
        lastFeature: normalizeBoundedString(value.lastFeature, 120),
        lastPage: normalizeBoundedString(value.lastPage, 120),
        userAgentFamily: normalizeBoundedString(value.userAgentFamily, 40),
        seenCount: normalizeNonNegativeSafeInteger(value.seenCount, 1_000_000_000),
    };
};

const isWidgetRuntimeProofCurrent = (lastSeenMillis: number, nowMillis: number): boolean => (
    lastSeenMillis > 0
    && lastSeenMillis <= nowMillis + ANSWERLATTICE_WIDGET_RUNTIME_CLOCK_SKEW_MS
    && nowMillis - lastSeenMillis <= ANSWERLATTICE_WIDGET_RUNTIME_PROOF_MAX_AGE_MS
);

const getReadinessStage = (
    launchProofReady: boolean,
    steps: AnswerlatticeActivationStep[],
): AnswerlatticeActivationStage => {
    if (launchProofReady) return 'live';
    if (steps.some(step => ['workspace', 'product-profile', 'license'].includes(step.key) && step.status !== 'complete')) return 'setup';
    if (steps.some(step => ['knowledge', 'help-center', 'entities', 'canonical-answers', 'answer-tests', 'product-surfaces'].includes(step.key) && step.status !== 'complete')) return 'knowledge';
    if (steps.some(step => ['widget-key', 'allowed-origins', 'widget-install', 'page-context'].includes(step.key) && step.status !== 'complete')) return 'install';
    return 'knowledge';
};

const buildStep = (input: {
    key: string;
    title: string;
    description: string;
    status: AnswerlatticeActivationStepStatus;
    required?: boolean;
    actionLabel?: string;
    route?: string;
    costNote?: string;
}): AnswerlatticeActivationStep => ({
    required: input.required !== false,
    ...input,
});

const getCombinedStatus = (steps: AnswerlatticeActivationStep[], keys: string[]): AnswerlatticeActivationStepStatus => {
    const selected = keys
        .map(key => steps.find(step => step.key === key)?.status)
        .filter(Boolean) as AnswerlatticeActivationStepStatus[];
    if (!selected.length) return 'pending';
    if (selected.every(status => status === 'complete')) return 'complete';
    if (selected.some(status => status === 'complete' || status === 'attention')) return 'attention';
    return 'pending';
};

const buildLaunchProof = (items: AnswerlatticeLaunchProofItem[]): AnswerlatticeLaunchProofSummary => {
    const completeCount = items.filter(item => item.status === 'complete').length;
    const totalCount = items.length;

    return {
        ready: totalCount > 0 && completeCount === totalCount,
        score: totalCount > 0 ? Math.round((completeCount / totalCount) * 100) : 0,
        completeCount,
        totalCount,
        blockers: items
            .filter(item => item.status !== 'complete')
            .map(item => item.title),
        items,
    };
};

export function buildAnswerlatticeActivationFirstValueEvidence(params: {
    existingEvidence?: unknown;
    launchProof: AnswerlatticeLaunchProofSummary;
    nowMillis: number;
}): AnswerlatticeActivationFirstValueEvidence {
    const existing = params.existingEvidence && typeof params.existingEvidence === 'object' && !Array.isArray(params.existingEvidence)
        ? params.existingEvidence as Record<string, unknown>
        : {};
    const observedAt = new Date(params.nowMillis).toISOString();
    const proofReady = (key: string) => params.launchProof.items.some(item => item.key === key && item.status === 'complete');
    const preserveOrObserve = (key: keyof AnswerlatticeActivationFirstValueEvidence, achieved: boolean): string | null => (
        normalizeActivationFirstObservedAt(existing[key], params.nowMillis)
        || (achieved ? observedAt : null)
    );

    return {
        knowledgeReadyObservedAt: preserveOrObserve('knowledgeReadyObservedAt', proofReady('knowledge-surfaces')),
        trustedAnswerReadyObservedAt: preserveOrObserve('trustedAnswerReadyObservedAt', proofReady('ontology-canonical')),
        answerTestProofReadyObservedAt: preserveOrObserve('answerTestProofReadyObservedAt', proofReady('priority-answer-checks')),
        widgetRuntimeVerifiedObservedAt: preserveOrObserve('widgetRuntimeVerifiedObservedAt', proofReady('widget-runtime')),
        launchProofReadyObservedAt: preserveOrObserve('launchProofReadyObservedAt', params.launchProof.ready),
    };
}

export function shouldPersistActivationFirstValueEvidenceAtomically(
    existing: Record<string, any> | null,
    next: AnswerlatticeActivationSummary,
): boolean {
    if (
        !existing
        || existing.pId !== PRODUCT_IDS.ANSWERLATTICE
        || existing.tId !== next.tId
        || existing.sId !== next.sId
        || !existing.firstValueEvidence
        || typeof existing.firstValueEvidence !== 'object'
        || Array.isArray(existing.firstValueEvidence)
        || Object.keys(existing.firstValueEvidence).length !== ANSWERLATTICE_ACTIVATION_FIRST_VALUE_EVIDENCE_KEYS.length
        || Object.keys(existing.firstValueEvidence).some(key => (
            !ANSWERLATTICE_ACTIVATION_FIRST_VALUE_EVIDENCE_KEYS.includes(key as keyof AnswerlatticeActivationFirstValueEvidence)
        ))
    ) return true;

    const nowMillis = Date.parse(next.computedAtIso);
    return ANSWERLATTICE_ACTIVATION_FIRST_VALUE_EVIDENCE_KEYS.some(key => {
        const rawValue = existing.firstValueEvidence[key];
        const normalizedValue = normalizeActivationFirstObservedAt(rawValue, nowMillis);
        return rawValue !== normalizedValue || normalizedValue !== next.firstValueEvidence[key];
    });
}

const normalizeSubscription = (
    value: unknown,
    scope: { tId: number; sId: number },
    nowMillis: number,
): AnswerlatticeActivationSubscriptionSummary | null => {
    if (!isAnswerlatticeSubscriptionInScope(value, scope)) return null;
    const subscription = projectAnswerlatticeSubscriptionForRead(
        value,
        `activation_${scope.tId}_${scope.sId}`,
        scope.tId,
        scope.sId,
    );
    if (!subscription) return null;
    const subscriptionEndMillis = [
        subscription.subscriptionEndDate,
        subscription.cycleEndDate,
    ]
        .map(getAnswerlatticeSubscriptionTimestampMillis)
        .filter((candidate): candidate is number => candidate !== null)
        .sort((left, right) => left - right)[0] ?? null;
    const isCurrent = isAnswerlatticeSubscriptionCurrent(subscription, nowMillis);

    return {
        id: normalizeBoundedString(subscription.providerSubscriptionId || subscription.id, 200),
        planId: normalizeBoundedString(subscription.planId, 80),
        planName: normalizeBoundedString(subscription.planName, 120),
        status: subscription.status === 'active' && !isCurrent
            ? 'expired'
            : subscription.status,
        currency: subscription.currency,
        amount: subscription.amount <= 1_000_000_000 ? subscription.amount : null,
        isBeta: false,
        subscriptionEndDate: subscriptionEndMillis === null
            ? null
            : new Date(subscriptionEndMillis).toISOString(),
    };
};

const getSurfaceReadinessPriority = (item: AnswerlatticeSurfaceReadinessItem): number => {
    const priority: Record<AnswerlatticeSurfaceReadinessItem['status'], number> = {
        needs_articles: 4,
        open_signals: 3,
        needs_mapping: 2,
        ready: 1,
    };
    return priority[item.status] || 0;
};

const buildSurfaceReadiness = (content: AnswerlatticeSurfaceContentSummary | null | undefined): AnswerlatticeSurfaceReadinessItem[] => {
    if (!content?.surfaces) return [];

    return Object.values(content.surfaces)
        .map((surface): AnswerlatticeSurfaceReadinessItem => {
            const articleCount = surface.articles?.length || 0;
            const faqCount = surface.faqs?.length || 0;
            const changelogCount = surface.changelogs?.length || 0;
            const ticketCount = surface.tickets?.total || 0;
            const openTicketCount = surface.tickets?.open || 0;
            const hasRoutingSignal = Boolean(
                (surface.routePatterns || []).length
                || surface.feature
                || surface.page
                || surface.workflow
                || (surface.entityHints || []).length
                || (surface.tags || []).length
            );

            if (!hasRoutingSignal) {
                return {
                    key: surface.key,
                    label: surface.label,
                    routePatterns: surface.routePatterns || [],
                    articleCount,
                    faqCount,
                    changelogCount,
                    ticketCount,
                    openTicketCount,
                    status: 'needs_mapping',
                };
            }

            if (articleCount === 0 && faqCount === 0) {
                return {
                    key: surface.key,
                    label: surface.label,
                    routePatterns: surface.routePatterns || [],
                    articleCount,
                    faqCount,
                    changelogCount,
                    ticketCount,
                    openTicketCount,
                    status: 'needs_articles',
                };
            }

            if (openTicketCount > 0) {
                return {
                    key: surface.key,
                    label: surface.label,
                    routePatterns: surface.routePatterns || [],
                    articleCount,
                    faqCount,
                    changelogCount,
                    ticketCount,
                    openTicketCount,
                    status: 'open_signals',
                };
            }

            return {
                key: surface.key,
                label: surface.label,
                routePatterns: surface.routePatterns || [],
                articleCount,
                faqCount,
                changelogCount,
                ticketCount,
                openTicketCount,
                status: 'ready',
            };
        })
        .sort((left, right) => (
            getSurfaceReadinessPriority(right) - getSurfaceReadinessPriority(left)
            || right.openTicketCount - left.openTicketCount
            || (left.articleCount + (left.faqCount || 0)) - (right.articleCount + (right.faqCount || 0))
            || left.label.localeCompare(right.label)
        ))
        .slice(0, 8);
};

export function buildAnswerlatticeActivationSummary(params: {
    tId: number;
    sId: number;
    storeData: Record<string, any>;
    subscription?: Record<string, any> | null;
    contextSummary?: AnswerlatticeSurfaceContentSummary | null;
    coverage?: AnswerlatticeCoverageData | null;
    trustMetrics?: AnswerlatticeTrustMetrics | null;
    compiledContext?: AnswerlatticeCompiledContextReadiness | null;
    answerTests?: AnswerlatticeActivationAnswerTestSummary | null;
    existingSummary?: Record<string, any> | null;
    nowMillis?: number;
}): AnswerlatticeActivationSummary {
    const storeData = params.storeData || {};
    const nowMillis = typeof params.nowMillis === 'number' && Number.isFinite(params.nowMillis) && params.nowMillis >= 0
        ? params.nowMillis
        : Date.now();
    const embeddedSubscription = normalizeSubscription(
        storeData.answerlatticeSubscription,
        params,
        nowMillis,
    );
    const fallbackSubscription = normalizeSubscription(params.subscription, params, nowMillis);
    const subscription = [embeddedSubscription, fallbackSubscription]
        .find((candidate) => candidate?.status === 'active')
        || embeddedSubscription
        || fallbackSubscription;
    const runtimeStatus = normalizeWidgetRuntimeStatusForActivation(storeData);
    const content = params.contextSummary || null;
    const widgetKeyState = normalizeAnswerlatticeWidgetApiState(storeData.answerlatticeWidgetApi);
    const widgetKeySummaries = buildAnswerlatticeWidgetKeySummaries(widgetKeyState);
    const hasWidgetKey = widgetKeySummaries.length > 0;
    const allowedOrigins = normalizeWidgetAllowedOrigins(storeData.widgetAllowedOrigins);
    const subscriptionStatus = subscription?.status || '';
    const licenseStatus: AnswerlatticeActivationStepStatus = subscriptionStatus === 'active'
        ? 'complete'
        : subscriptionStatus === 'pending'
            ? 'attention'
            : 'pending';
    const runtimeLastSeenMillis = getTimestampMillis(runtimeStatus?.lastSeenAt);
    const hasWidgetEverBeenSeen = runtimeLastSeenMillis > 0;
    const hasWidgetSeenRecently = isWidgetRuntimeProofCurrent(runtimeLastSeenMillis, nowMillis);
    const hasRuntimeContextMarker = Boolean(runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage);
    const hasRuntimeContext = hasWidgetSeenRecently && hasRuntimeContextMarker;
    const entityCount = Number(
        params.trustMetrics?.entityAnswerCoverage?.totalEntities
        || params.trustMetrics?.entityHealth?.totalEntities
        || 0
    );
    const activeCanonicalAnswerCount = Number(params.trustMetrics?.drift?.activeCount || 0);
    const primarySurfaces = Array.isArray(storeData.primarySurfaces)
        ? storeData.primarySurfaces
            .filter((value: unknown): value is string => typeof value === 'string')
            .map((value: string) => normalizeBoundedString(value, 80))
            .filter((value: string | null): value is string => Boolean(value))
            .slice(0, 8)
        : [];
    const workspaceProductUrl = normalizeBoundedString(storeData.productUrl, 500);
    const workspaceSupportEmail = normalizeBoundedString(storeData.supportEmail, 320);
    const hasProductProfile = Boolean(workspaceProductUrl && workspaceSupportEmail);
    const notificationReadiness = getNotificationReadiness(PRODUCT_IDS.ANSWERLATTICE);
    const notificationsReady = notificationReadiness.enabled && notificationReadiness.smtpConfigured && hasProductProfile;
    const surfaceReadiness = buildSurfaceReadiness(content);
    const canonicalCoverageRate = Number.isFinite(Number(params.coverage?.coverage?.rate)) ? Number(params.coverage?.coverage?.rate) : null;
    const canonicalCoverageTotal = Number.isFinite(Number(params.coverage?.coverage?.total)) ? Number(params.coverage?.coverage?.total) : null;
    const metricsComplete = params.trustMetrics?.sourceCompleteness?.complete === true;
    const noEscalationRate = metricsComplete && Number.isFinite(Number(params.trustMetrics?.nonEscalation?.rate))
        ? Number(params.trustMetrics?.nonEscalation?.rate)
        : null;
    const confirmedResolutionTotal = metricsComplete
        ? Number(params.trustMetrics?.confirmedResolution?.explicitOutcomeTotal || 0)
        : null;
    const confirmedResolutionRate = metricsComplete && confirmedResolutionTotal && confirmedResolutionTotal > 0
        ? Number(params.trustMetrics?.confirmedResolution?.rate || 0)
        : null;
    const driftRate = metricsComplete && Number.isFinite(Number(params.trustMetrics?.drift?.rate))
        ? Number(params.trustMetrics?.drift?.rate)
        : null;
    const entityAnswerCoverageRate = metricsComplete && Number.isFinite(Number(params.trustMetrics?.entityAnswerCoverage?.rate))
        ? Number(params.trustMetrics?.entityAnswerCoverage?.rate)
        : null;
    const compiledContextReady = params.compiledContext?.status === 'ready' && (
        params.compiledContext?.publicBundlesReady === true
        || params.compiledContext?.privateBundlesReady === true
        || Number(params.compiledContext?.bundleVersion || 0) > 0
    );
    const answerTests = params.answerTests || EMPTY_ANSWERLATTICE_ACTIVATION_ANSWER_TEST_SUMMARY;
    const answerTestsReady = answerTests.firstTenCount >= 10
        && answerTests.latestProofStatus === 'ready'
        && answerTests.latestCriticalFailureCount === 0;

    const steps: AnswerlatticeActivationStep[] = [
        buildStep({
            key: 'workspace',
            title: 'Workspace created',
            description: 'Company and product workspace are available.',
            status: storeData ? 'complete' : 'pending',
            route: ANSWERLATTICE_ROUTES.SETTINGS,
            actionLabel: 'Review Settings',
            costNote: 'Uses the existing Answerlattice store document.',
        }),
        buildStep({
            key: 'product-profile',
            title: 'Product details captured',
            description: hasProductProfile
                ? 'Product URL and support email are saved for setup, widget, and help-center configuration.'
                : 'Add your product URL and support email so Answerlattice can verify install and route users correctly.',
            status: hasProductProfile ? 'complete' : 'attention',
            route: ANSWERLATTICE_ROUTES.SETTINGS,
            actionLabel: 'Review Details',
            costNote: 'Stored on the existing Answerlattice store document.',
        }),
        buildStep({
            key: 'license',
            title: 'License active',
            description: subscriptionStatus === 'pending'
                ? 'Payment is pending. Keep setup moving, but resolve billing before launch.'
                : 'Paid subscription is recorded for this workspace.',
            status: licenseStatus,
            route: ANSWERLATTICE_ROUTES.SETTINGS,
            actionLabel: 'Check License',
            costNote: 'Read from store subscription summary; legacy fallback is capped to 5 docs.',
        }),
        buildStep({
            key: 'knowledge',
            title: 'Knowledge imported',
            description: `${content?.articleCount || 0} published article${(content?.articleCount || 0) === 1 ? '' : 's'} and ${content?.faqCount || 0} FAQ${(content?.faqCount || 0) === 1 ? '' : 's'} available in the compact content summary.`,
            status: ((content?.articleCount || 0) + (content?.faqCount || 0)) > 0 ? 'complete' : 'pending',
            route: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE,
            actionLabel: 'Import Content',
            costNote: 'Reads platformSummary context content; no article collection scan on this page.',
        }),
        buildStep({
            key: 'help-center',
            title: 'Help center ready',
            description: ((content?.articleCount || 0) + (content?.faqCount || 0)) > 0
                ? 'The public help center has published content to show customers.'
                : 'Publish at least one article or FAQ before sending customers to the help center.',
            status: ((content?.articleCount || 0) + (content?.faqCount || 0)) > 0 ? 'complete' : 'pending',
            route: ANSWERLATTICE_ROUTES.DOCS,
            actionLabel: 'Preview Docs',
            costNote: 'Uses the existing context summary content counts.',
        }),
        buildStep({
            key: 'entities',
            title: 'Product entities reviewed',
            description: entityCount > 0
                ? `${entityCount} product entit${entityCount === 1 ? 'y is' : 'ies are'} modeled for retrieval and governance.`
                : 'Review feature, plan, role, workflow, integration, and error-code entities.',
            status: entityCount > 0 ? 'complete' : 'pending',
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ENTITIES),
            actionLabel: 'Review Entities',
            costNote: 'Uses the trust metrics summary; no entity collection scan on this page.',
        }),
        buildStep({
            key: 'canonical-answers',
            title: 'Canonical answers reviewed',
            description: activeCanonicalAnswerCount > 0
                ? `${activeCanonicalAnswerCount} active canonical answer${activeCanonicalAnswerCount === 1 ? '' : 's'} available for governed retrieval.`
                : 'Create or review canonical answers so repeated questions do not depend on fallback generation.',
            status: activeCanonicalAnswerCount > 0 ? 'complete' : 'pending',
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS),
            actionLabel: 'Review Answers',
            costNote: 'Uses the trust metrics summary; no canonical answer collection scan on this page.',
        }),
        buildStep({
            key: 'answer-tests',
            title: 'Priority answers tested',
            description: answerTests.firstTenCount < 10
                ? `${answerTests.firstTenCount}/10 launch questions are ready. Define the questions most likely to interrupt launch.`
                : answerTests.latestProofStale
                    ? 'Priority questions or governed source truth changed after the retained run. Run the First 10 checks again.'
                : !answerTests.latestProofStatus
                    ? 'The First 10 are defined. Run the deterministic canonical checks to verify the expected answer or safe escalation.'
                    : answerTestsReady
                        ? 'The latest retained run covers the First 10 with no critical failure.'
                        : `The latest First 10 proof is ${answerTests.latestProofStatus}; review ${answerTests.latestCriticalFailureCount} critical failure${answerTests.latestCriticalFailureCount === 1 ? '' : 's'}.`,
            status: answerTestsReady
                ? 'complete'
                : answerTests.firstTenCount >= 10 || answerTests.latestProofStatus
                    ? 'attention'
                    : 'pending',
            route: ANSWERLATTICE_ROUTES.LAUNCH_ANSWERS,
            actionLabel: answerTests.firstTenCount < 10 ? 'Build First 10' : 'Run Answer Checks',
            costNote: 'Reads the bounded Answer Tests summary. Canonical-only checks do not call a provider.',
        }),
        buildStep({
            key: 'product-surfaces',
            title: 'Product surfaces mapped',
            description: `${content?.surfaceCount || 0} product surface${(content?.surfaceCount || 0) === 1 ? '' : 's'} mapped to routes, articles, releases, and signals.`,
            status: (content?.surfaceCount || 0) > 0 ? 'complete' : 'pending',
            route: ANSWERLATTICE_ROUTES.PRODUCT_SURFACES,
            actionLabel: 'Map Surfaces',
            costNote: 'Uses the same compact summary doc as widget contextual retrieval.',
        }),
        buildStep({
            key: 'widget-key',
            title: 'Widget key ready',
            description: hasWidgetKey ? 'A dedicated Answerlattice widget key exists.' : 'Create a widget key before installing Answerlattice in your product.',
            status: hasWidgetKey ? 'complete' : 'pending',
            route: ANSWERLATTICE_ROUTES.WIDGET,
            actionLabel: hasWidgetKey ? 'Open Widget' : 'Create Key',
            costNote: 'Key status is derived from the store document; raw keys are never read back.',
        }),
        buildStep({
            key: 'allowed-origins',
            title: 'Allowed origins locked',
            description: allowedOrigins.length > 0
                ? `${allowedOrigins.length} allowed origin${allowedOrigins.length === 1 ? '' : 's'} configured.`
                : 'Add your app origin so leaked widget keys cannot be used from unknown domains.',
            status: allowedOrigins.length > 0 ? 'complete' : 'attention',
            route: ANSWERLATTICE_ROUTES.WIDGET,
            actionLabel: 'Secure Origins',
            costNote: 'Stored on the existing store document; no separate security collection.',
        }),
        buildStep({
            key: 'widget-install',
            title: 'Widget seen in product',
            description: hasWidgetSeenRecently
                ? `Seen within the last 7 days on ${runtimeStatus?.lastPath || 'a product page'}.`
                : hasWidgetEverBeenSeen
                    ? 'Widget telemetry is older than 7 days. Open the installed product again before relying on launch proof.'
                    : 'Install the script and open your product once so Answerlattice can verify the widget loads.',
            status: hasWidgetSeenRecently ? 'complete' : hasWidgetEverBeenSeen ? 'attention' : 'pending',
            route: ANSWERLATTICE_ROUTES.WIDGET,
            actionLabel: hasWidgetEverBeenSeen ? 'Verify Widget' : 'Install Widget',
            costNote: 'Runtime writes are throttled and stored on the existing store document.',
        }),
        buildStep({
            key: 'page-context',
            title: 'Page context received',
            description: hasRuntimeContext
                ? `Latest context: ${runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage}.`
                : hasRuntimeContextMarker
                    ? 'A context marker exists, but its widget telemetry is stale. Open the product and confirm the current route context again.'
                : 'Send path, title, feature, workflow, role, or locale after route changes so answers match the user screen.',
            status: hasRuntimeContext ? 'complete' : hasRuntimeContextMarker ? 'attention' : 'pending',
            route: ANSWERLATTICE_ROUTES.PRODUCT_SURFACES,
            actionLabel: 'Set Context',
            costNote: 'Context is transient at runtime; only a sanitized last-seen marker is stored.',
        }),
        buildStep({
            key: 'notifications',
            title: 'Ticket notifications ready',
            description: notificationsReady
                ? `Ticket emails are enabled from ${notificationReadiness.fromAddress}. Send a test email before launch.`
                : notificationReadiness.enabled
                    ? 'Add sender configuration and support email so ticket replies do not go unnoticed.'
                    : 'Enable Answerlattice notifications before launching support to customers.',
            status: notificationsReady ? 'complete' : 'attention',
            route: ANSWERLATTICE_ROUTES.ACTIVATION,
            actionLabel: 'Test Email',
            costNote: 'No collection scan. Sends are rate-limited and logged to the Answerlattice notification log only when an email is attempted.',
        }),
        buildStep({
            key: 'release-notes',
            title: 'Changelog published',
            description: `${content?.changelogCount || 0} recent release note${(content?.changelogCount || 0) === 1 ? '' : 's'} linked in the context summary.`,
            status: (content?.changelogCount || 0) > 0 ? 'complete' : 'optional',
            required: false,
            route: ANSWERLATTICE_ROUTES.CHANGELOG,
            actionLabel: 'Add Release Notes',
            costNote: 'Recent changelog entries are pre-compacted into the context summary.',
        }),
        buildStep({
            key: 'ticket-signals',
            title: 'Support signal loop tested',
            description: `${content?.ticketCount || 0} ticket signal${(content?.ticketCount || 0) === 1 ? '' : 's'} visible in the context summary.`,
            status: (content?.ticketCount || 0) > 0 ? 'complete' : 'optional',
            required: false,
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE),
            actionLabel: 'Test Ticket Flow',
            costNote: 'Tickets remain signal sources, not a helpdesk replacement.',
        }),
    ];

    const requiredSteps = steps.filter(step => step.required);
    const completeRequired = requiredSteps.filter(step => step.status === 'complete').length;
    const readinessScore = requiredSteps.length > 0
        ? Math.round((completeRequired / requiredSteps.length) * 100)
        : 0;
    const governanceSummaryStatus: AnswerlatticeActivationStepStatus = canonicalCoverageTotal !== null && metricsComplete && compiledContextReady
        ? 'complete'
        : canonicalCoverageTotal !== null || metricsComplete || compiledContextReady || entityCount > 0 || activeCanonicalAnswerCount > 0
            ? 'attention'
            : 'pending';
    const signalLoopStatus: AnswerlatticeActivationStepStatus = (content?.ticketCount || 0) > 0
        ? 'complete'
        : hasWidgetSeenRecently || hasRuntimeContext
            ? 'attention'
            : 'pending';
    const launchProof = buildLaunchProof([
        {
            key: 'self-serve-setup',
            title: 'Self-serve setup',
            description: 'Workspace, product profile, and license state are ready without manual provisioning.',
            status: getCombinedStatus(steps, ['workspace', 'product-profile', 'license']),
            route: ANSWERLATTICE_ROUTES.SETTINGS,
            actionLabel: 'Review Setup',
        },
        {
            key: 'knowledge-surfaces',
            title: 'Knowledge and surfaces',
            description: 'Imported content is mapped to product pages, workflows, and help-center output.',
            status: getCombinedStatus(steps, ['knowledge', 'help-center', 'product-surfaces']),
            route: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE,
            actionLabel: 'Import Knowledge',
        },
        {
            key: 'ontology-canonical',
            title: 'Ontology and canonical answers',
            description: 'Product entities and approved canonical answers exist before customer traffic.',
            status: getCombinedStatus(steps, ['entities', 'canonical-answers']),
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS),
            actionLabel: 'Review Governance',
        },
        {
            key: 'priority-answer-checks',
            title: 'Priority answer checks',
            description: 'The First 10 launch questions have a retained ready proof with no critical failure.',
            status: getCombinedStatus(steps, ['answer-tests']),
            route: ANSWERLATTICE_ROUTES.LAUNCH_ANSWERS,
            actionLabel: answerTests.firstTenCount < 10 ? 'Build First 10' : 'Review Answer Checks',
        },
        {
            key: 'widget-runtime',
            title: 'Widget runtime proof',
            description: 'Widget key, allowed origins, install telemetry, and page context have all been verified.',
            status: getCombinedStatus(steps, ['widget-key', 'allowed-origins', 'widget-install', 'page-context']),
            route: ANSWERLATTICE_ROUTES.WIDGET,
            actionLabel: 'Verify Widget',
        },
        {
            key: 'governance-summaries',
            title: 'Governance summaries',
            description: 'Coverage, trust, and compiled context summaries are available for launch review.',
            status: governanceSummaryStatus,
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.TRUST),
            actionLabel: 'Open Trust Metrics',
        },
        {
            key: 'signal-loop-test',
            title: 'Signal source test',
            description: 'A fallback or ticket signal source is visible; open Signal Queue to confirm proposal quality before broader rollout.',
            status: signalLoopStatus,
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE),
            actionLabel: 'Test Signal Flow',
        },
    ]);
    const existingSummaryInScope = params.existingSummary?.pId === PRODUCT_IDS.ANSWERLATTICE
        && params.existingSummary?.tId === params.tId
        && params.existingSummary?.sId === params.sId
        ? params.existingSummary
        : null;
    const firstValueEvidence = buildAnswerlatticeActivationFirstValueEvidence({
        existingEvidence: existingSummaryInScope?.firstValueEvidence,
        launchProof,
        nowMillis,
    });
    const signaturePayload = {
        tId: params.tId,
        sId: params.sId,
        readinessScore,
        subscriptionStatus,
        hasWidgetKey,
        allowedOriginCount: allowedOrigins.length,
        widgetLastSeenAt: runtimeStatus?.lastSeenAt || null,
        widgetRuntimeProofCurrent: hasWidgetSeenRecently,
        widgetPath: runtimeStatus?.lastPath || null,
        widgetContext: runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage || null,
        notificationsEnabled: notificationReadiness.enabled,
        smtpConfigured: notificationReadiness.smtpConfigured,
        productUrl: workspaceProductUrl,
        supportEmail: workspaceSupportEmail,
        billingModel: normalizeBoundedString(storeData.billingModel, 40),
        primarySurfaceCount: primarySurfaces.length,
        articleCount: content?.articleCount || 0,
        faqCount: content?.faqCount || 0,
        surfaceCount: content?.surfaceCount || 0,
        changelogCount: content?.changelogCount || 0,
        ticketCount: content?.ticketCount || 0,
        surfaceReadiness: surfaceReadiness.map(surface => ({
            key: surface.key,
            status: surface.status,
            articleCount: surface.articleCount,
            faqCount: surface.faqCount || 0,
            openTicketCount: surface.openTicketCount,
            changelogCount: surface.changelogCount,
        })),
        entityCount,
        activeCanonicalAnswerCount,
        answerTests,
        compiledContextStatus: params.compiledContext?.status || null,
        compiledContextVersion: params.compiledContext?.bundleVersion || 0,
        launchProof: launchProof.items.map(item => ({
            key: item.key,
            status: item.status,
        })),
    };

    return {
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: params.tId,
        sId: params.sId,
        readinessScore,
        stage: getReadinessStage(launchProof.ready, steps),
        computedAtIso: new Date(nowMillis).toISOString(),
        signature: createHash('sha256').update(JSON.stringify(signaturePayload)).digest('hex').slice(0, 24),
        workspace: {
            companyName: normalizeBoundedString(storeData.companyName || storeData.businessName || storeData.tenantName, 160),
            productName: normalizeBoundedString(storeData.productName || storeData.name, 160),
            productUrl: workspaceProductUrl,
            supportEmail: workspaceSupportEmail,
            billingModel: normalizeBoundedString(storeData.billingModel, 40),
            primarySurfaceCount: primarySurfaces.length,
        },
        subscription,
        widget: {
            hasWidgetKey,
            keyPrefix: normalizeBoundedString(widgetKeyState.keyPrefix, 32),
            allowedOriginCount: allowedOrigins.length,
            configVersion: normalizeNonNegativeSafeInteger(storeData.widgetConfigVersion, Number.MAX_SAFE_INTEGER),
            runtimeStatus,
        },
        notifications: {
            enabled: notificationReadiness.enabled,
            smtpConfigured: notificationReadiness.smtpConfigured,
            fromAddress: normalizeBoundedString(notificationReadiness.fromAddress, 320),
            logTarget: normalizeBoundedString(notificationReadiness.logTarget, 160),
        },
        content: {
            surfaceCount: content?.surfaceCount || 0,
            articleCount: content?.articleCount || 0,
            faqCount: content?.faqCount || 0,
            changelogCount: content?.changelogCount || 0,
            ticketCount: content?.ticketCount || 0,
            summaryGeneratedAt: getTimestampMillis(content?.generatedAt) > 0
                ? new Date(getTimestampMillis(content?.generatedAt)).toISOString()
                : null,
            surfaceReadiness,
        },
        governance: {
            canonicalCoverageRate,
            canonicalCoverageTotal,
            noEscalationRate,
            confirmedResolutionRate,
            confirmedResolutionTotal,
            driftRate,
            entityAnswerCoverageRate,
            metricsComplete,
        },
        answerTests,
        compiledContext: params.compiledContext || null,
        launchProof,
        firstValueEvidence,
        steps,
        readModel: {
            firestoreReads: 8,
            firestoreWrites: '0 on normal view; 1 compact platformSummary write only when readiness signature changes or becomes stale.',
            source: 'stores + platformSummary activation/context/coverage/trust/bundle/answer-tests/source-version docs',
        },
    };
}

export function shouldPersistActivationSummary(existing: Record<string, any> | null, next: AnswerlatticeActivationSummary): boolean {
    if (!existing) return true;
    if (existing.signature !== next.signature) return true;
    const lastComputed = getTimestampMillis(existing.lastComputedAt || existing.computedAtIso);
    return !lastComputed || Date.now() - lastComputed > 30 * 60 * 1000;
}
