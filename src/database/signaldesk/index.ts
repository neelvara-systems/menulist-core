import { SIGNALDESK_API_ROUTES } from "@constant/signaldesk/routes";
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

export type SignalDeskAction =
    | "seed-defaults"
    | "create-source-policy"
    | "import-targets"
    | "score-target"
    | "create-evidence"
    | "create-draft"
    | "review-approval"
    | "export-message"
    | "capture-reply"
    | "record-outcome"
    | "capture-demand-signal"
    | "run-source-provider"
    | "run-ai-assist"
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
    | "upsert-sender-domain"
    | "upsert-self-service-cta"
    | "create-daily-growth-mission"
    | "review-growth-mission"
    | "create-experiment-card"
    | "review-experiment-card"
    | "upsert-offer-cta"
    | "upsert-reply-playbook"
    | "create-source-quality-snapshot"
    | "refresh-provider-source-retention"
    | "create-weekly-strategist-memo"
    | "create-provider-evaluation"
    | "run-enrichment-waterfall"
    | "create-approval-packet"
    | "create-sequencer-handoff"
    | "send-owned-sequence-step"
    | "upsert-content-source"
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
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.data) {
        throw new Error(payload?.error || "Failed to load SignalDesk");
    }

    return payload.data;
}

export async function getSignalDeskWorkspace(section: SignalDeskSection): Promise<SignalDeskWorkspaceResponse> {
    const response = await fetch(`${SIGNALDESK_API_ROUTES.WORKSPACE}?section=${encodeURIComponent(section)}`, {
        cache: "no-store",
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.data) {
        throw new Error(payload?.error || "Failed to load SignalDesk workspace");
    }

    return payload.data;
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
    const responsePayload = await response.json().catch(() => null);

    if (!response.ok || !responsePayload?.data) {
        throw new Error(responsePayload?.error || "SignalDesk action failed");
    }

    return responsePayload.data as T;
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
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.data) {
        throw new Error(payload?.error || "Failed to update SignalDesk pause");
    }

    return payload.data;
}
