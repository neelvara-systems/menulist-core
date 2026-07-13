import { SIGNALDESK_API_ROUTES } from "@constant/signaldesk/routes";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import type {
    SignalDeskKillSwitchScope,
    SignalDeskKillSwitchStatus,
    SignalDeskOverview,
    SignalDeskSection,
    SignalDeskWorkspaceResponse,
} from "@type/signaldesk";

const getSignalDeskClientModeHeaders = () => {
    if (typeof window === "undefined") return {};
    const mobileUserAgent = /\b(Android|iPhone|iPad|iPod|Mobile|Windows Phone)\b/i.test(window.navigator.userAgent || "");
    const mobileViewport = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches;
    return mobileUserAgent || mobileViewport
        ? { "x-signaldesk-client-mode": "mobile-readonly" }
        : {};
};

const isSignalDeskMobileClient = () => Object.keys(getSignalDeskClientModeHeaders()).length > 0;
const SIGNALDESK_OVERVIEW_LOAD_FAILED = "Failed to load SignalDesk";
const SIGNALDESK_WORKSPACE_LOAD_FAILED = "Failed to load SignalDesk workspace";
const SIGNALDESK_ACTION_FAILED = "SignalDesk action failed";
const SIGNALDESK_PAUSE_UPDATE_FAILED = "Failed to update SignalDesk pause";
const SIGNALDESK_CLIENT_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;
const SIGNALDESK_CLIENT_RESPONSE_PARSE_FAILED = "signaldesk_client_response_parse_failed";
const SIGNALDESK_CLIENT_RESPONSE_REJECTED = "signaldesk_client_response_rejected";
const SIGNALDESK_CLIENT_RESPONSE_INVALID = "signaldesk_client_response_invalid";

type SignalDeskClientJsonContext = {
    action?: string;
    operation: "overview" | "workspace" | "action" | "kill-switch";
    scope?: string;
    section?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const isDataEnvelope = (value: unknown): value is { data: unknown } => (
    isRecord(value) && "data" in value
);

const isSignalDeskOverviewData = (value: unknown): value is SignalDeskOverview => (
    isRecord(value)
    && isRecord(value.access)
    && isRecord(value.controlRoom)
    && isRecord(value.cost)
    && isRecord(value.queues)
    && isRecord(value.setup)
    && Array.isArray(value.activeKillSwitches)
    && Array.isArray(value.incidents)
    && Array.isArray(value.metrics)
);

const isSignalDeskWorkspaceData = (value: unknown): value is SignalDeskWorkspaceResponse => {
    if (!isRecord(value)) return false;
    return isSignalDeskOverviewData(value) && isRecord(value.workspace);
};

const isAcknowledgedSignalDeskData = <T,>(value: unknown): value is T => Boolean(value);

const getSignalDeskClientResponseLogContext = (
    response: Response,
    context: SignalDeskClientJsonContext,
) => ({
    ...getBoundedRuntimeStringContext("action", context.action),
    ...getBoundedRuntimeStringContext("scope", context.scope),
    ...getBoundedRuntimeStringContext("section", context.section),
    mobileClient: isSignalDeskMobileClient(),
    operation: context.operation,
    product: "signaldesk",
    responseOk: response.ok,
    responseStatus: response.status,
});

const readSignalDeskClientDataResponse = async <T>(
    response: Response,
    context: SignalDeskClientJsonContext,
    isValidData: (value: unknown) => value is T,
): Promise<T | null> => {
    const logContext = getSignalDeskClientResponseLogContext(response, context);
    let payload: unknown;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            SIGNALDESK_CLIENT_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure(SIGNALDESK_CLIENT_RESPONSE_PARSE_FAILED, error, logContext);
        return null;
    }

    if (!response.ok) {
        logRuntimeFailure(SIGNALDESK_CLIENT_RESPONSE_REJECTED, undefined, logContext);
        return null;
    }

    if (!isDataEnvelope(payload) || !isValidData(payload.data)) {
        logRuntimeFailure(SIGNALDESK_CLIENT_RESPONSE_INVALID, undefined, logContext);
        return null;
    }

    return payload.data;
};

export type SignalDeskAction =
    | "seed-defaults"
    | "create-source-policy"
    | "import-targets"
    | "score-target"
    | "create-evidence"
    | "create-draft"
    | "review-approval"
    | "export-message"
    | "record-manual-contact"
    | "capture-reply"
    | "record-outcome"
    | "create-route-token"
    | "revoke-route-token"
    | "capture-demand-signal"
    | "run-source-provider"
    | "run-ai-assist"
    | "run-ai-volume-batch"
    | "review-ai-shadow-run"
    | "prepare-channel-handoff"
    | "upsert-channel-window-state"
    | "send-approved-message"
    | "upsert-provider-account"
    | "upsert-budget-policy"
    | "upsert-connector-setting"
    | "upsert-model-route"
    | "upsert-enrichment-waterfall"
    | "upsert-audience-segment"
    | "recommend-market-pod-plan"
    | "review-market-pod"
    | "upsert-sender-domain"
    | "upsert-self-service-cta"
    | "create-daily-growth-mission"
    | "review-growth-mission"
    | "create-experiment-card"
    | "review-experiment-card"
    | "upsert-offer-cta"
    | "qualify-revenue-account"
    | "upsert-commercial-opportunity"
    | "upsert-commercial-offer"
    | "upsert-operating-envelope"
    | "refresh-activation-watch"
    | "upsert-reply-playbook"
    | "create-source-quality-snapshot"
    | "create-research-agent-run"
    | "refresh-provider-source-retention"
    | "create-weekly-strategist-memo"
    | "create-provider-evaluation"
    | "run-enrichment-waterfall"
    | "create-approval-packet"
    | "create-sequencer-handoff"
    | "send-owned-sequence-step"
    | "upsert-content-source"
    | "upsert-proof-permission"
    | "create-content-asset"
    | "generate-content-distribution-drafts"
    | "review-content-distribution-draft"
    | "schedule-content-distribution-draft"
    | "record-content-performance"
    | "upsert-trust-partner-profile"
    | "create-trust-partner-niche-test"
    | "create-trust-partner-brief"
    | "review-trust-partner-deal"
    | "record-trust-partner-deliverable"
    | "record-trust-partner-metrics"
    | "review-trust-partner-renewal"
    | "upsert-team-member";

export async function getSignalDeskOverview(): Promise<SignalDeskOverview> {
    const response = await fetch(SIGNALDESK_API_ROUTES.OVERVIEW, {
        cache: "no-store",
    });
    const payload = await readSignalDeskClientDataResponse(response, { operation: "overview" }, isSignalDeskOverviewData);

    if (!payload) {
        throw new Error(SIGNALDESK_OVERVIEW_LOAD_FAILED);
    }

    return payload;
}

export async function getSignalDeskWorkspace(section: SignalDeskSection): Promise<SignalDeskWorkspaceResponse> {
    const response = await fetch(`${SIGNALDESK_API_ROUTES.WORKSPACE}?section=${encodeURIComponent(section)}`, {
        cache: "no-store",
    });
    const payload = await readSignalDeskClientDataResponse(response, {
        operation: "workspace",
        section,
    }, isSignalDeskWorkspaceData);

    if (!payload) {
        throw new Error(SIGNALDESK_WORKSPACE_LOAD_FAILED);
    }

    return payload;
}

export async function runSignalDeskAction<T = unknown>(action: SignalDeskAction, payload: unknown = {}): Promise<T> {
    const response = await fetch(SIGNALDESK_API_ROUTES.ACTIONS, {
        body: JSON.stringify({ action, payload }),
        headers: {
            "Content-Type": "application/json",
            ...getSignalDeskClientModeHeaders(),
        },
        method: "POST",
    });
    const responsePayload = await readSignalDeskClientDataResponse<T>(response, {
        action,
        operation: "action",
    }, isAcknowledgedSignalDeskData);

    if (!responsePayload) {
        throw new Error(SIGNALDESK_ACTION_FAILED);
    }

    return responsePayload;
}

export async function setSignalDeskKillSwitch(input: {
    reason: string;
    scope: SignalDeskKillSwitchScope;
    status: SignalDeskKillSwitchStatus;
}) {
    const mobileEmergencyPause = isSignalDeskMobileClient() && input.status === "active"
        ? { mobileConfirmation: "MOBILE_EMERGENCY_PAUSE" }
        : {};
    const response = await fetch(SIGNALDESK_API_ROUTES.KILL_SWITCHES, {
        body: JSON.stringify({ ...input, ...mobileEmergencyPause }),
        headers: {
            "Content-Type": "application/json",
            ...getSignalDeskClientModeHeaders(),
        },
        method: "POST",
    });
    const payload = await readSignalDeskClientDataResponse(response, {
        operation: "kill-switch",
        scope: input.scope,
    }, isAcknowledgedSignalDeskData);

    if (!payload) {
        throw new Error(SIGNALDESK_PAUSE_UPDATE_FAILED);
    }

    return payload;
}
