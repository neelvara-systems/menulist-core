import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { GROWTHOS_SUMMARY_DOC_PREFIX } from "@constant/growthos";
import { doc, getDoc } from "@firebase/firestore";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import type {
    GrowthOSDestination,
    GrowthOSExportMethod,
    GrowthOSReviewGuardResult,
    GrowthOSReviewTone,
    GrowthOSSummaryDocument,
} from "@type/growthos";

const getGrowthOSSummaryDocRef = (session: any) => (
    doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `${GROWTHOS_SUMMARY_DOC_PREFIX}_${session.sId}`)
);

async function parseResponse(response: Response, fallbackMessage: string) {
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(payload?.message || payload?.error || fallbackMessage);
    }
    return payload;
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

export const refreshGrowthOSActions = async (projectId: string, forceRefresh = false) => {
    const response = await fetch("/api/growthos/actions/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, forceRefresh }),
    });
    return parseResponse(response, "Failed to refresh Growth Kits");
};

export const generateGrowthOSKit = async (params: {
    actionId?: string;
    actionType?: string;
    projectId: string;
}) => {
    const response = await fetch("/api/growthos/kits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    return parseResponse(response, "Failed to create Growth Kit");
};

export const recordGrowthOSExport = async (params: {
    destination: GrowthOSDestination;
    kitId: string;
    method: GrowthOSExportMethod;
    outputId?: string;
}) => {
    const response = await fetch("/api/growthos/kits/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    return parseResponse(response, "Failed to record Growth Kit use");
};

export const suggestGrowthOSReviewReply = async (params: {
    rating?: number;
    reviewText: string;
    tone?: GrowthOSReviewTone;
}): Promise<{ result: GrowthOSReviewGuardResult }> => {
    const response = await fetch("/api/growthos/reviews/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    return parseResponse(response, "Failed to prepare review reply");
};
