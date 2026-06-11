import type { ExtractedBusinessProfile } from "../sharedData/extractedBusinessProfile";
import type { ConfidenceSummary } from "../types";

export function buildExtractionResultSummary(
    menuData: any,
    confidenceSummary?: ConfidenceSummary | null,
    extractedBusinessProfile?: ExtractedBusinessProfile,
): Record<string, unknown> {
    const categories = Array.isArray(menuData?.categories) ? menuData.categories : [];
    const items = Array.isArray(menuData?.items) ? menuData.items : [];
    const languages = Array.isArray(menuData?.languages) ? menuData.languages : [];
    const fileMessages = Array.isArray(menuData?.fileMessages) ? menuData.fileMessages : [];
    const businessAttributeSuggestions = Array.isArray(menuData?.businessAttributeSuggestions)
        ? menuData.businessAttributeSuggestions
        : [];

    return {
        categoriesCount: categories.length,
        itemsCount: items.length,
        languagesCount: languages.length,
        fileMessagesCount: fileMessages.length,
        businessAttributeSuggestionsCount: businessAttributeSuggestions.length,
        dietaryTaggedItemsCount: items.filter((item: any) => Array.isArray(item?.dietaryTags) && item.dietaryTags.length > 0).length,
        attributedItemsCount: items.filter((item: any) => Array.isArray(item?.attributes) && item.attributes.length > 0).length,
        hasExtractedBusinessProfile: Boolean(extractedBusinessProfile || menuData?.extractedBusinessProfile),
        ...(confidenceSummary ? { confidenceSummary } : {}),
    };
}
