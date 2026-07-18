import type {
    AnswerlatticeActivationSummary,
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
    ok?: boolean;
    manifest: {
        status: string;
        bundleVersion?: number;
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

const isActivationSummary = (value: unknown): value is AnswerlatticeActivationSummary => {
    if (!isRecord(value)) return false;
    return (
        isFiniteNumber(value.tId)
        && isFiniteNumber(value.sId)
        && isFiniteNumber(value.readinessScore)
        && typeof value.stage === 'string'
        && isRecord(value.workspace)
        && isRecord(value.content)
        && isRecord(value.governance)
        && isRecord(value.answerTests)
        && isFiniteNumber(value.answerTests.activeCaseCount)
        && isFiniteNumber(value.answerTests.firstTenCount)
        && isFiniteNumber(value.answerTests.latestCriticalFailureCount)
        && typeof value.answerTests.latestProofStale === 'boolean'
        && isRecord(value.launchProof)
        && Array.isArray(value.steps)
        && isRecord(value.readModel)
    );
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
    && typeof value.recipientEmail === 'string'
    && value.recipientEmail.length > 0
);

export const isAnswerlatticeCompiledContextRebuildResponse = (
    value: unknown,
): value is AnswerlatticeCompiledContextRebuildResponse => (
    isRecord(value)
    && isRecord(value.manifest)
    && typeof value.manifest.status === 'string'
    && (
        value.manifest.bundleVersion === undefined
        || isFiniteNumber(value.manifest.bundleVersion)
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
