import { AI_ACTIONS_TYPES } from "@constant/common";

export type AiOperationPresentationInput = {
    action?: string | null;
    clientResponse?: any;
    inputStrings?: Record<string, string>;
    itemDetails?: { name?: string } | null;
    itemsList?: Array<{ id?: string; name?: string }>;
    targetLang?: LanguageValue | LanguageValue[];
    targetLanguages?: LanguageValue[];
    unitsConsumed?: number | null;
};

type LanguageValue = {
    code?: string;
    name?: string;
} | string | null | undefined;

export type AiOperationTone = "content" | "extraction" | "image" | "language" | "system";
export type AiOperationPresentationValues = Record<string, string | number>;
export type AiOperationPresentationTranslator = (
    key: string,
    values?: AiOperationPresentationValues,
) => string;

const countArray = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

const baseFormatCount = (count: number, singular: string, plural = `${singular}s`) => (
    `${count.toLocaleString()} ${count === 1 ? singular : plural}`
);

const translate = (
    translator: AiOperationPresentationTranslator | undefined,
    key: string,
    fallback: string,
    values?: AiOperationPresentationValues,
): string => {
    if (!translator) return fallback;

    try {
        const translated = translator(key, values);
        return translated && translated !== key ? translated : fallback;
    } catch {
        return fallback;
    }
};

const formatCount = (
    count: number,
    singular: string,
    plural = `${singular}s`,
    translator?: AiOperationPresentationTranslator,
    translationKey?: string,
) => {
    const fallback = baseFormatCount(count, singular, plural);
    return translationKey ? translate(translator, translationKey, fallback, { count }) : fallback;
};

const formatActionFallback = (action: string): string => (
    action
        .split("_")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
);

export const formatAiOperationActionLabel = (
    action?: string | null,
    translator?: AiOperationPresentationTranslator,
): string => {
    if (!action) return translate(translator, "actions.menuEnhancement", "Menu enhancement");
    if (action === AI_ACTIONS_TYPES.OWNER_BUSINESS_ASSISTANT_ANSWER) {
        return translate(translator, `actions.${action}`, "Business Health answer");
    }
    if (action === AI_ACTIONS_TYPES.OWNER_BUSINESS_ASSISTANT_ACTION_TEXT) {
        return translate(translator, `actions.${action}`, "Business Health draft");
    }

    return translate(translator, `actions.${action}`, formatActionFallback(action));
};

export const formatAiOperationCredits = (
    units?: number | null,
    translator?: AiOperationPresentationTranslator,
): string => {
    const consumed = Number(units || 0);
    return consumed > 0
        ? formatCount(consumed, "credit", "credits", translator, "counts.credits")
        : translate(translator, "counts.noCreditsUsed", "No credits used");
};

export const getAiOperationTone = (action?: string | null): AiOperationTone => {
    if (action === AI_ACTIONS_TYPES.IMAGE_PROCESSING || action === AI_ACTIONS_TYPES.PUBLIC_MENU_EXTRACTION) {
        return "extraction";
    }
    if (
        action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION
        || action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION
        || action === AI_ACTIONS_TYPES.ITEM_TRANSLATION
    ) {
        return "language";
    }
    if (
        action === AI_ACTIONS_TYPES.IMAGE_GENERATION
        || action === AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION
        || action === AI_ACTIONS_TYPES.IMAGE_EDITING
    ) {
        return "image";
    }
    if (
        action === AI_ACTIONS_TYPES.ADD_DESCRIPTION
        || action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION
        || action === AI_ACTIONS_TYPES.NEW_ITEM_METADATA
        || action === AI_ACTIONS_TYPES.SEO_AEO_GENERATION
        || action === AI_ACTIONS_TYPES.BUSINESS_COPY_GENERATION
        || action === AI_ACTIONS_TYPES.CAMPAIGN_CAPTION
        || action === AI_ACTIONS_TYPES.REVIEW_REPLY_SUGGESTION
        || action === AI_ACTIONS_TYPES.MENU_CARD_EXPORT_DESIGN_ADVISOR
        || action === AI_ACTIONS_TYPES.OWNER_BUSINESS_ASSISTANT_ANSWER
        || action === AI_ACTIONS_TYPES.OWNER_BUSINESS_ASSISTANT_ACTION_TEXT
    ) {
        return "content";
    }
    return "system";
};

const countDescriptionRows = (operation: AiOperationPresentationInput): number => {
    if (!operation.clientResponse || typeof operation.clientResponse !== "object" || Array.isArray(operation.clientResponse)) {
        return 0;
    }

    const response = operation.clientResponse as Record<string, unknown>;

    return Object.values(response).reduce<number>((total, languageDescriptions) => {
        if (!languageDescriptions || typeof languageDescriptions !== "object" || Array.isArray(languageDescriptions)) {
            return total;
        }
        return total + Object.keys(languageDescriptions as Record<string, unknown>).length;
    }, 0);
};

const countTranslationRows = (operation: AiOperationPresentationInput): number => {
    if (operation.clientResponse?.translations && typeof operation.clientResponse.translations === "object") {
        return Object.keys(operation.clientResponse.translations).length;
    }
    return operation.inputStrings ? Object.keys(operation.inputStrings).length : 0;
};

const formatLanguage = (language: LanguageValue): string | null => {
    if (!language) return null;
    if (typeof language === "string") return language;
    return language.name || language.code || null;
};

const formatTargetLanguages = (operation: AiOperationPresentationInput): string | null => {
    const directTargets = Array.isArray(operation.targetLang) ? operation.targetLang : [operation.targetLang];
    const languages = (operation.targetLanguages || directTargets)
        .map(formatLanguage)
        .filter(Boolean);

    if (languages.length === 0) return null;
    if (languages.length <= 2) return languages.join(", ");
    return `${languages.slice(0, 2).join(", ")} and ${languages.length - 2} more`;
};

export const getAiOperationOwnerSummary = (
    operation: AiOperationPresentationInput,
    translator?: AiOperationPresentationTranslator,
): string => {
    const action = operation.action;

    if (action === AI_ACTIONS_TYPES.IMAGE_PROCESSING || action === AI_ACTIONS_TYPES.PUBLIC_MENU_EXTRACTION) {
        const items = countArray(operation.clientResponse?.data?.items);
        const categories = countArray(operation.clientResponse?.data?.categories);
        if (items > 0 || categories > 0) {
            return translate(
                translator,
                "summary.extractedItemsAndCategories",
                `Extracted ${baseFormatCount(items, "item")} and ${baseFormatCount(categories, "category", "categories")}.`,
                {
                    items: formatCount(items, "item", "items", translator, "counts.items"),
                    categories: formatCount(categories, "category", "categories", translator, "counts.categories"),
                },
            );
        }
        return translate(translator, "summary.menuExtractionSaved", "Menu extraction output saved.");
    }

    if (action === AI_ACTIONS_TYPES.ADD_DESCRIPTION || action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION) {
        const rows = countDescriptionRows(operation);
        if (action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION) {
            return rows > 0
                ? translate(
                    translator,
                    "summary.revisedDescriptionsCount",
                    `Revised ${baseFormatCount(rows, "description")}.`,
                    { count: rows },
                )
                : translate(translator, "summary.revisedDescriptions", "Revised descriptions.");
        }
        return rows > 0
            ? translate(
                translator,
                "summary.preparedDescriptionsCount",
                `Prepared ${baseFormatCount(rows, "description")}.`,
                { count: rows },
            )
            : translate(translator, "summary.preparedDescriptions", "Prepared descriptions.");
    }

    if (
        action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION
        || action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION
        || action === AI_ACTIONS_TYPES.ITEM_TRANSLATION
    ) {
        const rows = countTranslationRows(operation);
        const targets = formatTargetLanguages(operation);
        const rowText = rows > 0
            ? formatCount(rows, "row", "rows", translator, "counts.rows")
            : translate(translator, "counts.translationRows", "translation rows");
        return targets
            ? translate(translator, "summary.translatedRowsToTargets", `Translated ${rowText} to ${targets}.`, { rowText, targets })
            : translate(translator, "summary.translatedRows", `Translated ${rowText}.`, { rowText });
    }

    if (action === AI_ACTIONS_TYPES.IMAGE_GENERATION || action === AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION) {
        const images = countArray(operation.clientResponse);
        const itemName = operation.itemDetails?.name;
        if (images > 0 && itemName) {
            return translate(
                translator,
                "summary.generatedImagesForItem",
                `Generated ${baseFormatCount(images, "image")} for ${itemName}.`,
                { count: images, itemName },
            );
        }
        if (images > 0) {
            return translate(
                translator,
                "summary.generatedImages",
                `Generated ${baseFormatCount(images, "image")}.`,
                { count: images },
            );
        }
        return translate(translator, "summary.generatedMenuImage", "Generated menu image output.");
    }

    if (action === AI_ACTIONS_TYPES.IMAGE_EDITING) {
        const itemName = operation.itemDetails?.name;
        return itemName
            ? translate(translator, "summary.editedImageForItem", `Edited image for ${itemName}.`, { itemName })
            : translate(translator, "summary.editedMenuImage", "Edited menu image output.");
    }

    if (action === AI_ACTIONS_TYPES.NEW_ITEM_METADATA) {
        return translate(translator, "summary.preparedItemDetails", "Prepared item details.");
    }

    if (action === AI_ACTIONS_TYPES.SEO_AEO_GENERATION) {
        return translate(translator, "summary.preparedMenuDiscoveryText", "Prepared menu discovery text.");
    }

    if (action === AI_ACTIONS_TYPES.BUSINESS_COPY_GENERATION) {
        return translate(translator, "summary.preparedBusinessCopy", "Prepared business copy.");
    }

    if (action === AI_ACTIONS_TYPES.CAMPAIGN_CAPTION) {
        return translate(translator, "summary.preparedCampaignCaption", "Prepared campaign caption.");
    }

    if (action === AI_ACTIONS_TYPES.REVIEW_REPLY_SUGGESTION) {
        return translate(translator, "summary.preparedReviewReplyDraft", "Prepared review reply draft.");
    }

    if (action === AI_ACTIONS_TYPES.MENU_CARD_EXPORT_DESIGN_ADVISOR) {
        return translate(translator, "summary.preparedMenuCardExportGuidance", "Prepared menu card export guidance.");
    }

    if (action === AI_ACTIONS_TYPES.OWNER_BUSINESS_ASSISTANT_ANSWER) {
        return translate(translator, "summary.businessHealthQuestionAnswered", "Answered a Business Health question.");
    }

    if (action === AI_ACTIONS_TYPES.OWNER_BUSINESS_ASSISTANT_ACTION_TEXT) {
        return translate(translator, "summary.businessHealthDraftPrepared", "Prepared a Business Health draft.");
    }

    if (action === AI_ACTIONS_TYPES.MENU_INTAKE_IDENTITY) {
        return translate(translator, "summary.checkedMenuUploadDetails", "Checked menu upload details.");
    }

    return translate(translator, "summary.activityRecorded", "Activity recorded.");
};
