import { FEATURE_FLAGS } from "@config/features";
import {
    generateGrowthOSKit,
    getGrowthOSSummary,
    refreshGrowthOSActions,
    recordGrowthOSExport,
    suggestGrowthOSReviewReply,
} from "@database/growthos";
import {
    getGrowthOSClientScope,
    getGrowthOSSummaryCacheKey,
} from "@lib/growthos/clientContracts";
import type {
    GrowthOSDestination,
    GrowthOSExportMethod,
    GrowthOSReviewTone,
    GrowthOSSummaryDocument,
} from "@type/growthos";
import useSWR from "swr";

export const useGrowthOS = (
    input: { storeId: unknown; tenantId: unknown },
    enabled = true,
) => {
    const scope = getGrowthOSClientScope(input);
    const cacheKey = FEATURE_FLAGS.ENABLE_GROWTHOS_ADDON && enabled
        ? getGrowthOSSummaryCacheKey(scope)
        : null;
    const { data, error, isLoading, mutate } = useSWR<GrowthOSSummaryDocument | null>(
        cacheKey,
        () => getGrowthOSSummary(scope!),
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 30000,
        },
    );

    return {
        growthOSSummary: data,
        isLoading,
        isError: error,
        mutate,
    };
};

export const refreshGrowthOSForProject = refreshGrowthOSActions;

export const createGrowthOSKitForProject = generateGrowthOSKit;

export const recordGrowthOSKitExport = recordGrowthOSExport;

export const prepareGrowthOSReviewReply = suggestGrowthOSReviewReply;

export type GrowthOSExportPayload = {
    destination: GrowthOSDestination;
    kitId: string;
    method: GrowthOSExportMethod;
    outputId?: string;
};

export type GrowthOSReviewPayload = {
    rating?: number;
    reviewText: string;
    tone?: GrowthOSReviewTone;
};
