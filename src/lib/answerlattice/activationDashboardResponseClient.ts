import type {
    AnswerlatticeActivationSummary,
    AnswerlatticeBundleStatus,
    AnswerlatticeOperationsStatusSummary,
} from '@type/answerlattice';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export const ANSWERLATTICE_ACTIVATION_DASHBOARD_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
export const ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

export type AnswerlatticeActivationSummaryResponse = {
    summary: AnswerlatticeActivationSummary;
};

export type AnswerlatticeOperationsStatusResponse = {
    operations: AnswerlatticeOperationsStatusSummary;
};

export type AnswerlatticeNotificationTestResponse = {
    sent: true;
    recipientEmail: string;
    readiness?: unknown;
};

export type AnswerlatticeCompiledContextRebuildResponse = {
    ok: boolean;
    manifest: {
        status: AnswerlatticeBundleStatus;
        bundleVersion: number;
        activeVersion?: number;
        lastReadyVersion?: number;
        stats?: unknown;
        lastBuildError?: string | null;
        staleReason?: string | null;
    };
};

export type AnswerlatticeActivationDashboardResponseKind =
    | 'activation_summary_load'
    | 'readiness_metrics_load'
    | 'weekly_digest_load'
    | 'operations_status_load'
    | 'notification_test'
    | 'compiled_context_rebuild';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const isSafeIntegerBetween = (value: unknown, min: number, max: number): value is number => (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= min
    && value <= max
);

const isOptionalBoundedString = (value: unknown, maxLength: number): boolean => (
    value === undefined
    || value === null
    || (typeof value === 'string' && value.length <= maxLength)
);

const isCanonicalIsoTimestamp = (value: unknown): value is string => {
    if (typeof value !== 'string' || value.length > 40) return false;
    const millis = Date.parse(value);
    return Number.isFinite(millis) && new Date(millis).toISOString() === value;
};

const isOptionalCanonicalIsoTimestamp = (value: unknown): boolean => (
    value === undefined || value === null || isCanonicalIsoTimestamp(value)
);

const isPercentageOrNull = (value: unknown): boolean => (
    value === undefined
    || value === null
    || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100)
);

const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isBoundedEmailAddress = (value: unknown): value is string => (
    typeof value === 'string'
    && value.length > 0
    && value.length <= 320
    && SIMPLE_EMAIL_PATTERN.test(value)
);

const ACTIVATION_STEP_STATUSES = new Set(['complete', 'attention', 'pending', 'optional']);
const ACTIVATION_STAGES = new Set(['setup', 'install', 'knowledge', 'live']);
const SURFACE_READINESS_STATUSES = new Set(['ready', 'needs_mapping', 'needs_articles', 'open_signals']);
const COMPILED_CONTEXT_STATUSES = new Set(['empty', 'building', 'ready', 'stale', 'failed', 'superseded']);

const isActivationStep = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    return (
        typeof value.key === 'string'
        && value.key.length > 0
        && value.key.length <= 80
        && typeof value.title === 'string'
        && value.title.length > 0
        && value.title.length <= 160
        && typeof value.description === 'string'
        && value.description.length <= 800
        && ACTIVATION_STEP_STATUSES.has(String(value.status))
        && typeof value.required === 'boolean'
        && isOptionalBoundedString(value.actionLabel, 120)
        && isOptionalBoundedString(value.route, 240)
        && isOptionalBoundedString(value.costNote, 500)
    );
};

const isLaunchProofItem = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    return (
        typeof value.key === 'string'
        && value.key.length > 0
        && value.key.length <= 80
        && typeof value.title === 'string'
        && value.title.length > 0
        && value.title.length <= 160
        && typeof value.description === 'string'
        && value.description.length <= 800
        && ACTIVATION_STEP_STATUSES.has(String(value.status))
        && isOptionalBoundedString(value.actionLabel, 120)
        && isOptionalBoundedString(value.route, 240)
    );
};

const isSurfaceReadinessItem = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    return (
        typeof value.key === 'string'
        && value.key.length > 0
        && value.key.length <= 120
        && typeof value.label === 'string'
        && value.label.length > 0
        && value.label.length <= 200
        && Array.isArray(value.routePatterns)
        && value.routePatterns.length <= 20
        && value.routePatterns.every(route => typeof route === 'string' && route.length <= 180)
        && isSafeIntegerBetween(value.articleCount, 0, 1_000_000)
        && (value.faqCount === undefined || isSafeIntegerBetween(value.faqCount, 0, 1_000_000))
        && isSafeIntegerBetween(value.changelogCount, 0, 1_000_000)
        && isSafeIntegerBetween(value.ticketCount, 0, 1_000_000)
        && isSafeIntegerBetween(value.openTicketCount, 0, 1_000_000)
        && Number(value.openTicketCount) <= Number(value.ticketCount)
        && SURFACE_READINESS_STATUSES.has(String(value.status))
    );
};

const isActivationAnswerTests = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    return (
        isSafeIntegerBetween(value.activeCaseCount, 0, 10_000)
        && isSafeIntegerBetween(value.firstTenCount, 0, 10)
        && (
            value.latestProofStatus === null
            || value.latestProofStatus === 'ready'
            || value.latestProofStatus === 'review'
            || value.latestProofStatus === 'blocked'
        )
        && isSafeIntegerBetween(value.latestCriticalFailureCount, 0, 10_000)
        && typeof value.latestProofStale === 'boolean'
        && isOptionalCanonicalIsoTimestamp(value.lastRunAt)
    );
};

const isWidgetRuntimeStatus = (value: unknown): boolean => {
    if (value === undefined || value === null) return true;
    if (!isRecord(value)) return false;
    return (
        isOptionalCanonicalIsoTimestamp(value.lastSeenAt)
        && isOptionalBoundedString(value.lastOrigin, 180)
        && isOptionalBoundedString(value.lastPath, 180)
        && isOptionalBoundedString(value.lastContextKey, 120)
        && isOptionalBoundedString(value.lastFeature, 120)
        && isOptionalBoundedString(value.lastPage, 120)
        && isOptionalBoundedString(value.userAgentFamily, 40)
        && (value.seenCount === undefined || isSafeIntegerBetween(value.seenCount, 0, 1_000_000_000))
    );
};

const isCompiledContextReadiness = (value: unknown): boolean => {
    if (value === undefined || value === null) return true;
    if (!isRecord(value)) return false;
    if (
        !COMPILED_CONTEXT_STATUSES.has(String(value.status))
        || !isSafeIntegerBetween(value.bundleVersion, 0, Number.MAX_SAFE_INTEGER)
        || !isSafeIntegerBetween(value.activeVersion, 0, Number.MAX_SAFE_INTEGER)
        || !isSafeIntegerBetween(value.lastReadyVersion, 0, Number.MAX_SAFE_INTEGER)
        || !isOptionalBoundedString(value.publicBundleId, 120)
        || !isOptionalCanonicalIsoTimestamp(value.generatedAt)
        || !isOptionalCanonicalIsoTimestamp(value.lastBuildCompletedAt)
        || !isOptionalBoundedString(value.lastBuildError, 200)
        || !isOptionalBoundedString(value.staleReason, 200)
        || typeof value.publicBundlesReady !== 'boolean'
        || typeof value.privateBundlesReady !== 'boolean'
    ) return false;

    if (value.stats !== undefined) {
        if (
            !isRecord(value.stats)
            || (value.stats.bytesTotal !== undefined && !isSafeIntegerBetween(value.stats.bytesTotal, 0, Number.MAX_SAFE_INTEGER))
            || (value.stats.routes !== undefined && !isSafeIntegerBetween(value.stats.routes, 0, 1_000_000))
        ) return false;
    }
    return true;
};

const isLaunchProof = (value: unknown): boolean => {
    if (!isRecord(value) || !Array.isArray(value.items) || value.items.length > 10) return false;
    if (!value.items.every(isLaunchProofItem)) return false;
    if (
        typeof value.ready !== 'boolean'
        || !isSafeIntegerBetween(value.score, 0, 100)
        || !isSafeIntegerBetween(value.completeCount, 0, value.items.length)
        || value.totalCount !== value.items.length
        || !Array.isArray(value.blockers)
        || value.blockers.length > value.items.length
        || !value.blockers.every(blocker => typeof blocker === 'string' && blocker.length > 0 && blocker.length <= 160)
    ) return false;

    const completeCount = value.items.filter(item => isRecord(item) && item.status === 'complete').length;
    const expectedReady = value.items.length > 0 && completeCount === value.items.length;
    const expectedScore = value.items.length > 0
        ? Math.round((completeCount / value.items.length) * 100)
        : 0;
    const expectedBlockers = value.items
        .filter(item => isRecord(item) && item.status !== 'complete')
        .map(item => isRecord(item) ? item.title : null);
    return value.completeCount === completeCount
        && value.ready === expectedReady
        && value.score === expectedScore
        && value.blockers.length === expectedBlockers.length
        && value.blockers.every((blocker, index) => blocker === expectedBlockers[index]);
};

const isActivationSummary = (value: unknown): value is AnswerlatticeActivationSummary => {
    if (!isRecord(value)) return false;
    if (
        (value.pId !== undefined && value.pId !== 'AL')
        || !isSafeIntegerBetween(value.tId, 1, Number.MAX_SAFE_INTEGER)
        || !isSafeIntegerBetween(value.sId, 1, Number.MAX_SAFE_INTEGER)
        || !isSafeIntegerBetween(value.readinessScore, 0, 100)
        || !ACTIVATION_STAGES.has(String(value.stage))
        || !isCanonicalIsoTimestamp(value.computedAtIso)
        || typeof value.signature !== 'string'
        || !/^[a-f0-9]{24}$/.test(value.signature)
        || !isRecord(value.workspace)
        || !isOptionalBoundedString(value.workspace.companyName, 160)
        || !isOptionalBoundedString(value.workspace.productName, 160)
        || !isOptionalBoundedString(value.workspace.productUrl, 500)
        || !isOptionalBoundedString(value.workspace.supportEmail, 320)
        || !isOptionalBoundedString(value.workspace.billingModel, 40)
        || (value.workspace.primarySurfaceCount !== undefined && !isSafeIntegerBetween(value.workspace.primarySurfaceCount, 0, 8))
    ) return false;

    if (value.subscription !== null) {
        if (
            !isRecord(value.subscription)
            || !isOptionalBoundedString(value.subscription.id, 200)
            || !isOptionalBoundedString(value.subscription.planId, 80)
            || !isOptionalBoundedString(value.subscription.planName, 120)
            || !isOptionalBoundedString(value.subscription.status, 40)
            || !isOptionalBoundedString(value.subscription.currency, 8)
            || !(
                value.subscription.amount === undefined
                || value.subscription.amount === null
                || (isFiniteNumber(value.subscription.amount) && value.subscription.amount >= 0 && value.subscription.amount <= 1_000_000_000)
            )
            || (value.subscription.isBeta !== undefined && typeof value.subscription.isBeta !== 'boolean')
            || !isOptionalCanonicalIsoTimestamp(value.subscription.subscriptionEndDate)
        ) return false;
    }

    if (
        !isRecord(value.widget)
        || typeof value.widget.hasWidgetKey !== 'boolean'
        || !isOptionalBoundedString(value.widget.keyPrefix, 32)
        || !isSafeIntegerBetween(value.widget.allowedOriginCount, 0, 25)
        || !isSafeIntegerBetween(value.widget.configVersion, 0, Number.MAX_SAFE_INTEGER)
        || !isWidgetRuntimeStatus(value.widget.runtimeStatus)
        || !isRecord(value.notifications)
        || typeof value.notifications.enabled !== 'boolean'
        || typeof value.notifications.smtpConfigured !== 'boolean'
        || !isOptionalBoundedString(value.notifications.fromAddress, 320)
        || !isOptionalBoundedString(value.notifications.logTarget, 160)
        || !isRecord(value.content)
        || !isSafeIntegerBetween(value.content.surfaceCount, 0, 1_000_000)
        || !isSafeIntegerBetween(value.content.articleCount, 0, 1_000_000)
        || (value.content.faqCount !== undefined && !isSafeIntegerBetween(value.content.faqCount, 0, 1_000_000))
        || !isSafeIntegerBetween(value.content.changelogCount, 0, 1_000_000)
        || !isSafeIntegerBetween(value.content.ticketCount, 0, 1_000_000)
        || !isOptionalCanonicalIsoTimestamp(value.content.summaryGeneratedAt)
        || !Array.isArray(value.content.surfaceReadiness)
        || value.content.surfaceReadiness.length > 8
        || !value.content.surfaceReadiness.every(isSurfaceReadinessItem)
        || !isRecord(value.governance)
        || !isPercentageOrNull(value.governance.canonicalCoverageRate)
        || !(
            value.governance.canonicalCoverageTotal === undefined
            || value.governance.canonicalCoverageTotal === null
            || isSafeIntegerBetween(value.governance.canonicalCoverageTotal, 0, 1_000_000)
        )
        || !isPercentageOrNull(value.governance.noEscalationRate)
        || !isPercentageOrNull(value.governance.confirmedResolutionRate)
        || !(
            value.governance.confirmedResolutionTotal === undefined
            || value.governance.confirmedResolutionTotal === null
            || isSafeIntegerBetween(value.governance.confirmedResolutionTotal, 0, 1_000_000)
        )
        || !isPercentageOrNull(value.governance.driftRate)
        || !isPercentageOrNull(value.governance.entityAnswerCoverageRate)
        || (value.governance.metricsComplete !== undefined && typeof value.governance.metricsComplete !== 'boolean')
        || !isActivationAnswerTests(value.answerTests)
        || !isCompiledContextReadiness(value.compiledContext)
        || !isLaunchProof(value.launchProof)
        || !Array.isArray(value.steps)
        || value.steps.length > 20
        || !value.steps.every(isActivationStep)
        || !isRecord(value.readModel)
        || !isSafeIntegerBetween(value.readModel.firestoreReads, 0, 20)
        || typeof value.readModel.firestoreWrites !== 'string'
        || value.readModel.firestoreWrites.length > 300
        || typeof value.readModel.source !== 'string'
        || value.readModel.source.length > 500
        || (value.readModel.legacySubscriptionFallbackUsed !== undefined && typeof value.readModel.legacySubscriptionFallbackUsed !== 'boolean')
        || (
            value.readModel.legacySubscriptionFallbackReadCap !== undefined
            && !isSafeIntegerBetween(value.readModel.legacySubscriptionFallbackReadCap, 0, 5)
        )
    ) return false;

    return value.stage !== 'live'
        || (isRecord(value.launchProof) && value.launchProof.ready === true);
};

const isOperationsStatus = (value: unknown): value is AnswerlatticeOperationsStatusSummary => {
    if (!isRecord(value)) return false;
    return (
        isRecord(value.schedule)
        && isRecord(value.masterScheduler)
        && isRecord(value.workspace)
        && Array.isArray(value.latestRuns)
        && isRecord(value.readModel)
    );
};

export const isAnswerlatticeActivationSummaryResponse = (
    value: unknown,
): value is AnswerlatticeActivationSummaryResponse => (
    isRecord(value) && isActivationSummary(value.summary)
);

export const isAnswerlatticeOperationsStatusResponse = (
    value: unknown,
): value is AnswerlatticeOperationsStatusResponse => (
    isRecord(value) && isOperationsStatus(value.operations)
);

export const isAnswerlatticeNotificationTestResponse = (
    value: unknown,
): value is AnswerlatticeNotificationTestResponse => (
    isRecord(value)
    && value.sent === true
    && isBoundedEmailAddress(value.recipientEmail)
);

export const isAnswerlatticeCompiledContextRebuildResponse = (
    value: unknown,
): value is AnswerlatticeCompiledContextRebuildResponse => (
    isRecord(value)
    && typeof value.ok === 'boolean'
    && isRecord(value.manifest)
    && COMPILED_CONTEXT_STATUSES.has(String(value.manifest.status))
    && value.ok === (value.manifest.status === 'ready')
    && isSafeIntegerBetween(value.manifest.bundleVersion, 0, Number.MAX_SAFE_INTEGER)
    && (
        value.manifest.activeVersion === undefined
        || isSafeIntegerBetween(value.manifest.activeVersion, 0, Number.MAX_SAFE_INTEGER)
    )
    && (
        value.manifest.lastReadyVersion === undefined
        || isSafeIntegerBetween(value.manifest.lastReadyVersion, 0, Number.MAX_SAFE_INTEGER)
    )
    && isOptionalBoundedString(value.manifest.lastBuildError, 200)
    && isOptionalBoundedString(value.manifest.staleReason, 200)
    && (
        value.manifest.stats === undefined
        || (
            isRecord(value.manifest.stats)
            && Object.values(value.manifest.stats).every(stat => (
                stat === undefined
                || isSafeIntegerBetween(stat, 0, Number.MAX_SAFE_INTEGER)
            ))
        )
    )
);

const getActivationDashboardResponseLogContext = (
    kind: AnswerlatticeActivationDashboardResponseKind,
    response: Response,
) => ({
    ...getBoundedAnswerlatticeStringContext('responseKind', kind),
    responseOk: response.ok,
    responseStatus: response.status,
});

export const readAnswerlatticeActivationDashboardResponse = async <T,>(
    response: Response,
    kind: AnswerlatticeActivationDashboardResponseKind,
    isValid: (value: unknown) => value is T,
    fallbackMessage: string,
): Promise<T> => {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_ACTIVATION_DASHBOARD_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_activation_dashboard_response_parse_failed',
            error,
            getActivationDashboardResponseLogContext(kind, response),
        );
        throw new Error(fallbackMessage);
    }

    if (!response.ok) {
        logAnswerlatticeFailure(
            'answerlattice_activation_dashboard_response_rejected',
            undefined,
            getActivationDashboardResponseLogContext(kind, response),
        );
        throw new Error(fallbackMessage);
    }

    if (!isValid(payload)) {
        logAnswerlatticeFailure(
            'answerlattice_activation_dashboard_response_invalid',
            undefined,
            getActivationDashboardResponseLogContext(kind, response),
        );
        throw new Error(fallbackMessage);
    }

    return payload;
};
