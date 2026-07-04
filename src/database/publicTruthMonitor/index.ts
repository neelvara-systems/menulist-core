import { FEATURE_FLAGS } from "@config/features";
import { PUBLIC_TRUTH_MONITOR_CLIENT_RESPONSE_JSON_MAX_BYTES } from "@constant/publicTruthMonitor";
import {
    buildPublicTruthMonitorExportText,
} from "@lib/public-truth-tools/publicTruthMonitorReport";
import {
    getPublicTruthMonitorBoundedStringContext,
    logPublicTruthMonitorApiFailure,
} from "@lib/public-truth-tools/publicTruthMonitorDiagnostics";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import type {
    PublicTruthMonitorRefreshResponse,
    PublicTruthMonitorSummaryDocument,
    PublicTruthMonitorSummaryResponse,
} from "@type/publicTruthMonitor";

const PUBLIC_TRUTH_MONITOR_CLIENT_REQUEST_POLICY: Pick<RequestInit, "cache" | "credentials" | "redirect"> = {
    cache: "no-store",
    credentials: "same-origin",
    redirect: "manual",
};

async function parsePublicTruthMonitorResponse<T = unknown>(
    response: Response,
    fallbackMessage: string,
    operation: string,
): Promise<T> {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            PUBLIC_TRUTH_MONITOR_CLIENT_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logPublicTruthMonitorApiFailure(
            "[Public Truth Monitor Client] Response parse failed",
            "public_truth_monitor_client_response_parse_failed",
            error,
            {
                ...getPublicTruthMonitorBoundedStringContext("operation", operation),
                responseOk: response.ok,
                responseStatus: response.status,
            },
        );
        throw new Error(fallbackMessage);
    }

    if (!response.ok) {
        logPublicTruthMonitorApiFailure(
            "[Public Truth Monitor Client] Response rejected",
            "public_truth_monitor_client_response_rejected",
            undefined,
            {
                ...getPublicTruthMonitorBoundedStringContext("operation", operation),
                responseStatus: response.status,
            },
        );
        throw new Error(fallbackMessage);
    }

    if (!payload || typeof payload !== "object") {
        logPublicTruthMonitorApiFailure(
            "[Public Truth Monitor Client] Response invalid",
            "public_truth_monitor_client_response_invalid",
            undefined,
            {
                ...getPublicTruthMonitorBoundedStringContext("operation", operation),
                responseStatus: response.status,
            },
        );
        throw new Error(fallbackMessage);
    }

    return payload as T;
}

export const getPublicTruthMonitorSummary = async (): Promise<PublicTruthMonitorSummaryResponse["data"] | null> => {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MONITOR_ADDON) return null;

    const response = await fetch("/api/public-truth-monitor/summary", {
        ...PUBLIC_TRUTH_MONITOR_CLIENT_REQUEST_POLICY,
        method: "GET",
    });
    const payload = await parsePublicTruthMonitorResponse<PublicTruthMonitorSummaryResponse>(
        response,
        "Public truth history could not load",
        "summary",
    );
    return payload.data;
};

export const refreshPublicTruthMonitor = async (params: {
    selectedProjectId?: string | null;
} = {}): Promise<PublicTruthMonitorRefreshResponse["data"]> => {
    const response = await fetch("/api/public-truth-monitor/refresh", {
        ...PUBLIC_TRUTH_MONITOR_CLIENT_REQUEST_POLICY,
        body: JSON.stringify({
            selectedProjectId: params.selectedProjectId || undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
    });
    const payload = await parsePublicTruthMonitorResponse<PublicTruthMonitorRefreshResponse>(
        response,
        "Public truth history could not refresh",
        "refresh",
    );
    return payload.data;
};

export const getPublicTruthMonitorExportText = (
    summary: PublicTruthMonitorSummaryDocument | null,
): string => buildPublicTruthMonitorExportText(summary);
