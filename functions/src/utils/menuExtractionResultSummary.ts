import type { ExtractedBusinessProfile } from "../sharedData/extractedBusinessProfile";
import type { ConfidenceSummary } from "../types";

type MenuExtractionSummaryInput = {
    categories?: unknown;
    items?: unknown;
    languages?: unknown;
    fileMessages?: unknown;
    businessAttributeSuggestions?: unknown;
    extractedBusinessProfile?: unknown;
};

function asSummaryInput(value: unknown): MenuExtractionSummaryInput {
    return typeof value === "object" && value !== null
        ? value as MenuExtractionSummaryInput
        : {};
}

function hasNonEmptyArrayField(value: unknown, field: "dietaryTags" | "attributes"): boolean {
    if (typeof value !== "object" || value === null) return false;
    const fieldValue = (value as Record<string, unknown>)[field];
    return Array.isArray(fieldValue) && fieldValue.length > 0;
}

export function buildExtractionResultSummary(
    menuData: unknown,
    confidenceSummary?: ConfidenceSummary | null,
    extractedBusinessProfile?: ExtractedBusinessProfile,
): Record<string, unknown> {
    const input = asSummaryInput(menuData);
    const categories = Array.isArray(input.categories) ? input.categories : [];
    const items = Array.isArray(input.items) ? input.items : [];
    const languages = Array.isArray(input.languages) ? input.languages : [];
    const fileMessages = Array.isArray(input.fileMessages) ? input.fileMessages : [];
    const businessAttributeSuggestions = Array.isArray(input.businessAttributeSuggestions)
        ? input.businessAttributeSuggestions
        : [];

    return {
        categoriesCount: categories.length,
        itemsCount: items.length,
        languagesCount: languages.length,
        fileMessagesCount: fileMessages.length,
        businessAttributeSuggestionsCount: businessAttributeSuggestions.length,
        dietaryTaggedItemsCount: items.filter((item) => hasNonEmptyArrayField(item, "dietaryTags")).length,
        attributedItemsCount: items.filter((item) => hasNonEmptyArrayField(item, "attributes")).length,
        hasExtractedBusinessProfile: Boolean(extractedBusinessProfile || input.extractedBusinessProfile),
        ...(confidenceSummary ? { confidenceSummary } : {}),
    };
}
