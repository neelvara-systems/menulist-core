import {
    FALLBACK_BUSINESS_CATEGORY,
    normalizeBusinessCategory,
    resolveBusinessCategory,
} from "@data/shared/businessTypes";
import type { CampaignCuePackTemplateBusinessCategory } from "@type/campaigncuePackTemplates";

const CAMPAIGNCUE_VERTICAL_CATEGORY_MAP: Record<string, CampaignCuePackTemplateBusinessCategory> = {
    agency_client: "specialty",
    clinic: "health",
    fitness: "health",
    local_service: "service",
    multi_location: "specialty",
    other: "specialty",
    restaurant: "food",
    retail: "retail",
    salon: "service",
};

export function resolveCampaignCuePackTemplateCategory(input: {
    businessCategory?: string;
    businessType?: string;
}): CampaignCuePackTemplateBusinessCategory {
    const explicitCategory = normalizeBusinessCategory(input.businessCategory);
    if (explicitCategory) return explicitCategory as CampaignCuePackTemplateBusinessCategory;

    const normalizedType = String(input.businessType || "").trim().toLowerCase();
    if (normalizedType && CAMPAIGNCUE_VERTICAL_CATEGORY_MAP[normalizedType]) {
        return CAMPAIGNCUE_VERTICAL_CATEGORY_MAP[normalizedType];
    }

    const sharedCategory = resolveBusinessCategory(input.businessType, input.businessCategory);
    return (sharedCategory || FALLBACK_BUSINESS_CATEGORY) as CampaignCuePackTemplateBusinessCategory;
}

export function buildCampaignCuePackTemplateOverflowDocId(
    businessCategory: CampaignCuePackTemplateBusinessCategory,
    index: number,
): string {
    if (index <= 1) return businessCategory;
    return `${businessCategory}_${index}`;
}

export function isCampaignCuePackTemplateCatalogIdForCategory(
    catalogId: string,
    businessCategory: CampaignCuePackTemplateBusinessCategory,
): boolean {
    if (catalogId === businessCategory) return true;
    const escapedCategory = businessCategory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${escapedCategory}_[2-9][0-9]*$`).test(catalogId);
}
