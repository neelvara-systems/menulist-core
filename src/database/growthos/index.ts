import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { GROWTHOS_SUMMARY_DOC_PREFIX } from "@constant/growthos";
import { doc, getDoc } from "@firebase/firestore";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { getGrowthOSBoundedStringContext, logGrowthOSApiFailure } from "@lib/growthos/diagnostics";
import {
    getGrowthOSClientScope,
    projectGrowthOSExportResult,
    projectGrowthOSKitForScope,
    projectGrowthOSReviewGuardResult,
    projectGrowthOSSummaryForScope,
    type GrowthOSClientScope,
} from "@lib/growthos/clientContracts";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import type {
    GrowthOSDestination,
    GrowthOSExportMethod,
    GrowthOSKit,
    GrowthOSKitStatus,
    GrowthOSReviewGuardResult,
    GrowthOSReviewTone,
    GrowthOSSummaryDocument,
} from "@type/growthos";

const getGrowthOSSummaryDocRef = (session: { sId: string | number }) => (
    doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `${GROWTHOS_SUMMARY_DOC_PREFIX}_${session.sId}`)
);

const GROWTHOS_CLIENT_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const GROWTHOS_CLIENT_REQUEST_POLICY: Pick<RequestInit, "cache" | "credentials" | "redirect"> = {
    cache: "no-store",
    credentials: "same-origin",
    redirect: "manual",
};

async function fetchGrowthOSIdempotentMutation(
    input: RequestInfo | URL,
    init: RequestInit,
): Promise<Response> {
    try {
        return await fetch(input, init);
    } catch {
        return fetch(input, init);
    }
}

type GrowthOSDataResponse<T> = {
    data: T;
};

type GrowthOSGenerateResponse = GrowthOSDataResponse<{
    kit: GrowthOSKit;
    summary: GrowthOSSummaryDocument;
}>;

type GrowthOSExportResponse = GrowthOSDataResponse<{
    exportId?: string;
    isStale?: boolean;
    status?: GrowthOSKitStatus | null;
}>;

async function parseResponse<T = unknown>(
    response: Response,
    fallbackMessage: string,
    operation: string,
    project: (value: unknown) => T | null,
): Promise<T> {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(response, GROWTHOS_CLIENT_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        logGrowthOSApiFailure("[GrowthOS Client] Response parse failed", "growthos_client_response_parse_failed", error, {
            ...getGrowthOSBoundedStringContext("operation", operation),
            responseOk: response.ok,
            responseStatus: response.status,
        });
        throw new Error(fallbackMessage);
    }

    if (!response.ok) {
        logGrowthOSApiFailure("[GrowthOS Client] Response rejected", "growthos_client_response_rejected", undefined, {
            ...getGrowthOSBoundedStringContext("operation", operation),
            responseStatus: response.status,
        });
        throw new Error(fallbackMessage);
    }

    const projected = project(payload);
    if (projected === null) {
        logGrowthOSApiFailure("[GrowthOS Client] Response invalid", "growthos_client_response_invalid", undefined, {
            ...getGrowthOSBoundedStringContext("operation", operation),
            responseStatus: response.status,
        });
        throw new Error(fallbackMessage);
    }

    return projected;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const projectDataEnvelope = <T>(
    value: unknown,
    projectData: (data: unknown) => T | null,
): GrowthOSDataResponse<T> | null => {
    if (!isRecord(value) || !Object.prototype.hasOwnProperty.call(value, "data")) return null;
    const data = projectData(value.data);
    return data === null ? null : { data };
};

const requireCurrentGrowthOSScope = async (): Promise<GrowthOSClientScope> => {
    const session = await getActiveSession();
    const scope = getGrowthOSClientScope({
        storeId: session?.sId,
        tenantId: session?.tId,
    });
    if (!scope) throw new Error("GrowthOS active scope unavailable");
    return scope;
};

export const getGrowthOSSummary = async (
    expectedScope: GrowthOSClientScope,
): Promise<GrowthOSSummaryDocument | null> => {
    if (!FEATURE_FLAGS.ENABLE_GROWTHOS_ADDON) return null;
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const activeScope = getGrowthOSClientScope({
                storeId: session?.sId,
                tenantId: session?.tId,
            });
            if (
                !activeScope
                || activeScope.tId !== expectedScope.tId
                || activeScope.sId !== expectedScope.sId
            ) {
                throw new Error("GrowthOS active scope changed");
            }
            const snap = await getDoc(getGrowthOSSummaryDocRef({
                sId: activeScope.sId,
            }));
            if (!snap.exists()) return null;
            const summary = projectGrowthOSSummaryForScope(snap.data(), expectedScope);
            if (!summary) {
                throw new Error("GrowthOS summary scope mismatch");
            }
            return summary;
        },
        null,
        "getGrowthOSSummary",
    );
};

export const refreshGrowthOSActions = async (
    projectId: string,
    forceRefresh = false,
): Promise<GrowthOSDataResponse<GrowthOSSummaryDocument>> => {
    const scope = await requireCurrentGrowthOSScope();
    const response = await fetch("/api/growthos/actions/refresh", {
        ...GROWTHOS_CLIENT_REQUEST_POLICY,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, forceRefresh }),
    });
    return parseResponse(
        response,
        "Failed to refresh Growth Kits",
        "refresh_actions",
        (value) => projectDataEnvelope(value, (data) => projectGrowthOSSummaryForScope(data, scope)),
    );
};

export const generateGrowthOSKit = async (params: {
    actionId?: string;
    projectId: string;
}): Promise<GrowthOSGenerateResponse> => {
    const scope = await requireCurrentGrowthOSScope();
    const operationId = globalThis.crypto.randomUUID();
    const response = await fetchGrowthOSIdempotentMutation("/api/growthos/kits/generate", {
        ...GROWTHOS_CLIENT_REQUEST_POLICY,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...params,
            operationId,
        }),
    });
    return parseResponse(
        response,
        "Failed to create Growth Kit",
        "generate_kit",
        (value) => projectDataEnvelope(value, (data) => {
            if (!isRecord(data)) return null;
            const kit = projectGrowthOSKitForScope(data.kit, scope);
            const summary = projectGrowthOSSummaryForScope(data.summary, scope);
            return kit && summary ? { kit, summary } : null;
        }),
    );
};

export const recordGrowthOSExport = async (params: {
    destination: GrowthOSDestination;
    kitId: string;
    method: GrowthOSExportMethod;
    outputId?: string;
}): Promise<GrowthOSExportResponse> => {
    const operationId = globalThis.crypto.randomUUID();
    const response = await fetchGrowthOSIdempotentMutation("/api/growthos/kits/export", {
        ...GROWTHOS_CLIENT_REQUEST_POLICY,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...params,
            operationId,
        }),
    });
    return parseResponse(
        response,
        "Failed to record Growth Kit use",
        "record_export",
        (value) => projectDataEnvelope(value, projectGrowthOSExportResult),
    );
};

export const suggestGrowthOSReviewReply = async (params: {
    rating?: number;
    reviewText: string;
    tone?: GrowthOSReviewTone;
}): Promise<{ result: GrowthOSReviewGuardResult }> => {
    const response = await fetch("/api/growthos/reviews/suggest", {
        ...GROWTHOS_CLIENT_REQUEST_POLICY,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    return parseResponse(
        response,
        "Failed to prepare review reply",
        "suggest_review_reply",
        (value) => {
            if (!isRecord(value)) return null;
            const result = projectGrowthOSReviewGuardResult(value.result);
            return result ? { result } : null;
        },
    );
};
