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

const countArray = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

const formatCount = (count: number, singular: string, plural = `${singular}s`) => (
    `${count.toLocaleString()} ${count === 1 ? singular : plural}`
);

export const formatAiOperationActionLabel = (action?: string | null): string => {
    if (!action) return "Menu enhancement";
    return action
        .split("_")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

export const formatAiOperationCredits = (units?: number | null): string => {
    const consumed = Number(units || 0);
    return consumed > 0 ? formatCount(consumed, "credit") : "No credits used";
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

export const getAiOperationOwnerSummary = (operation: AiOperationPresentationInput): string => {
    const action = operation.action;

    if (action === AI_ACTIONS_TYPES.IMAGE_PROCESSING || action === AI_ACTIONS_TYPES.PUBLIC_MENU_EXTRACTION) {
        const items = countArray(operation.clientResponse?.data?.items);
        const categories = countArray(operation.clientResponse?.data?.categories);
        if (items > 0 || categories > 0) {
            return `Extracted ${formatCount(items, "item")} and ${formatCount(categories, "category", "categories")}.`;
        }
        return "Menu extraction output saved.";
    }

    if (action === AI_ACTIONS_TYPES.ADD_DESCRIPTION || action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION) {
        const rows = countDescriptionRows(operation);
        const verb = action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION ? "Revised" : "Prepared";
        return rows > 0 ? `${verb} ${formatCount(rows, "description")}.` : `${verb} descriptions.`;
    }

    if (
        action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION
        || action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION
        || action === AI_ACTIONS_TYPES.ITEM_TRANSLATION
    ) {
        const rows = countTranslationRows(operation);
        const targets = formatTargetLanguages(operation);
        const rowText = rows > 0 ? formatCount(rows, "row") : "translation rows";
        return targets ? `Translated ${rowText} to ${targets}.` : `Translated ${rowText}.`;
    }

    if (action === AI_ACTIONS_TYPES.IMAGE_GENERATION || action === AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION) {
        const images = countArray(operation.clientResponse);
        const itemName = operation.itemDetails?.name;
        if (images > 0 && itemName) return `Generated ${formatCount(images, "image")} for ${itemName}.`;
        if (images > 0) return `Generated ${formatCount(images, "image")}.`;
        return "Generated menu image output.";
    }

    if (action === AI_ACTIONS_TYPES.IMAGE_EDITING) {
        const itemName = operation.itemDetails?.name;
        return itemName ? `Edited image for ${itemName}.` : "Edited menu image output.";
    }

    if (action === AI_ACTIONS_TYPES.NEW_ITEM_METADATA) {
        return "Prepared item details.";
    }

    if (action === AI_ACTIONS_TYPES.SEO_AEO_GENERATION) {
        return "Prepared menu discovery text.";
    }

    if (action === AI_ACTIONS_TYPES.BUSINESS_COPY_GENERATION) {
        return "Prepared business copy.";
    }

    if (action === AI_ACTIONS_TYPES.CAMPAIGN_CAPTION) {
        return "Prepared campaign caption.";
    }

    if (action === AI_ACTIONS_TYPES.REVIEW_REPLY_SUGGESTION) {
        return "Prepared review reply draft.";
    }

    if (action === AI_ACTIONS_TYPES.MENU_CARD_EXPORT_DESIGN_ADVISOR) {
        return "Prepared menu card export guidance.";
    }

    if (action === AI_ACTIONS_TYPES.MENU_INTAKE_IDENTITY) {
        return "Checked menu upload details.";
    }

    return "Activity recorded.";
};
