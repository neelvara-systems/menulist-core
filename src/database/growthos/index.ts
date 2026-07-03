import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { GROWTHOS_SUMMARY_DOC_PREFIX } from "@constant/growthos";
import { doc, getDoc } from "@firebase/firestore";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { getGrowthOSBoundedStringContext, logGrowthOSApiFailure } from "@lib/growthos/diagnostics";
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

const getGrowthOSSummaryDocRef = (session: any) => (
    doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `${GROWTHOS_SUMMARY_DOC_PREFIX}_${session.sId}`)
);

const GROWTHOS_CLIENT_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const GROWTHOS_CLIENT_REQUEST_POLICY: Pick<RequestInit, "cache" | "credentials" | "redirect"> = {
    cache: "no-store",
    credentials: "same-origin",
    redirect: "manual",
};

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

    if (!payload || typeof payload !== "object") {
        logGrowthOSApiFailure("[GrowthOS Client] Response invalid", "growthos_client_response_invalid", undefined, {
            ...getGrowthOSBoundedStringContext("operation", operation),
            responseStatus: response.status,
        });
        throw new Error(fallbackMessage);
    }

    return payload as T;
}

export const getGrowthOSSummary = async (): Promise<GrowthOSSummaryDocument | null> => {
    if (!FEATURE_FLAGS.ENABLE_GROWTHOS_ADDON) return null;
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const snap = await getDoc(getGrowthOSSummaryDocRef(session));
            return snap.exists() ? snap.data() as GrowthOSSummaryDocument : null;
        },
        null,
        "getGrowthOSSummary",
    );
};

export const refreshGrowthOSActions = async (
    projectId: string,
    forceRefresh = false,
): Promise<GrowthOSDataResponse<GrowthOSSummaryDocument>> => {
    const response = await fetch("/api/growthos/actions/refresh", {
        ...GROWTHOS_CLIENT_REQUEST_POLICY,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, forceRefresh }),
    });
    return parseResponse<GrowthOSDataResponse<GrowthOSSummaryDocument>>(response, "Failed to refresh Growth Kits", "refresh_actions");
};

export const generateGrowthOSKit = async (params: {
    actionId?: string;
    actionType?: string;
    projectId: string;
}): Promise<GrowthOSGenerateResponse> => {
    const response = await fetch("/api/growthos/kits/generate", {
        ...GROWTHOS_CLIENT_REQUEST_POLICY,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    return parseResponse<GrowthOSGenerateResponse>(response, "Failed to create Growth Kit", "generate_kit");
};

export const recordGrowthOSExport = async (params: {
    destination: GrowthOSDestination;
    kitId: string;
    method: GrowthOSExportMethod;
    outputId?: string;
}): Promise<GrowthOSExportResponse> => {
    const response = await fetch("/api/growthos/kits/export", {
        ...GROWTHOS_CLIENT_REQUEST_POLICY,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    return parseResponse<GrowthOSExportResponse>(response, "Failed to record Growth Kit use", "record_export");
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
    return parseResponse<{ result: GrowthOSReviewGuardResult }>(response, "Failed to prepare review reply", "suggest_review_reply");
};
