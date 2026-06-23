import { SIGNALDESK_API_ROUTES } from "@constant/signaldesk/routes";
import type {
    SignalDeskKillSwitchScope,
    SignalDeskKillSwitchStatus,
    SignalDeskOverview,
    SignalDeskSection,
    SignalDeskWorkspaceResponse,
} from "@type/signaldesk";

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
    | "send-approved-message"
    | "upsert-provider-account"
    | "upsert-budget-policy"
    | "upsert-connector-setting"
    | "upsert-model-route"
    | "upsert-enrichment-waterfall"
    | "upsert-audience-segment"
    | "upsert-sender-domain"
    | "upsert-self-service-cta"
    | "run-enrichment-waterfall"
    | "create-approval-packet"
    | "create-sequencer-handoff"
    | "send-owned-sequence-step";

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
    const response = await fetch(SIGNALDESK_API_ROUTES.KILL_SWITCHES, {
        body: JSON.stringify(input),
        headers: {
            "Content-Type": "application/json",
        },
        method: "POST",
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.data) {
        throw new Error(payload?.error || "Failed to update SignalDesk pause");
    }

    return payload.data;
}
