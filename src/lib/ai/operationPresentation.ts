import { AI_ACTIONS_TYPES } from "@constant/common";
import {
    formatAiOperationHistoryLanguage,
    getAiOperationHistoryJsonObject,
    type AiOperationHistoryJsonValue,
} from '@lib/ai/operationHistoryClientContract';

export type AiOperationPresentationInput = {
    action?: string | null;
    clientResponse?: AiOperationHistoryJsonValue;
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

export const MENULIST_OWNER_AI_ACTIONS = [
    AI_ACTIONS_TYPES.IMAGE_PROCESSING,
    AI_ACTIONS_TYPES.IMAGE_GENERATION,
    AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
    AI_ACTIONS_TYPES.IMAGE_EDITING,
    AI_ACTIONS_TYPES.LANGUAGE_ADDITION,
    AI_ACTIONS_TYPES.IMAGE_TRANSLATION,
    AI_ACTIONS_TYPES.ITEM_TRANSLATION,
    AI_ACTIONS_TYPES.ADD_DESCRIPTION,
    AI_ACTIONS_TYPES.REWRITE_DESCRIPTION,
    AI_ACTIONS_TYPES.SEO_AEO_GENERATION,
    AI_ACTIONS_TYPES.BUSINESS_COPY_GENERATION,
    AI_ACTIONS_TYPES.CAMPAIGN_CAPTION,
    AI_ACTIONS_TYPES.MENU_CARD_EXPORT_DESIGN_ADVISOR,
    AI_ACTIONS_TYPES.MENU_INTAKE_IDENTITY,
    AI_ACTIONS_TYPES.REVIEW_REPLY_SUGGESTION,
    AI_ACTIONS_TYPES.OWNER_BUSINESS_ASSISTANT_ANSWER,
    AI_ACTIONS_TYPES.AI_MENU_MANAGER_PLANNER,
    AI_ACTIONS_TYPES.NEW_ITEM_METADATA,
] as const;

const countArray = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

const countFromSummary = (value: unknown): number => {
    const count = Number(value || 0);
    return Number.isFinite(count) && count > 0 ? count : 0;
};

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
    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_WIDGET_SEARCH) {
        return translate(translator, `actions.${action}`, "Widget answer");
    }
    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_KB_EMBEDDING || action === AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_EMBEDDING) {
        return translate(translator, `actions.${action}`, "Knowledge embedding");
    }
    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_DRAFT_GENERATION) {
        return translate(translator, `actions.${action}`, "Canonical draft");
    }
    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_TICKET_KNOWLEDGE_EXTRACTION) {
        return translate(translator, `actions.${action}`, "Ticket knowledge");
    }
    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_ONBOARDING_BOOTSTRAP) {
        return translate(translator, `actions.${action}`, "Launch setup");
    }
    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_ENTITY_EXTRACTION) {
        return translate(translator, `actions.${action}`, "Entity extraction");
    }
    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_FRICTION_INSIGHT) {
        return translate(translator, `actions.${action}`, "Friction insight");
    }
    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_ANSWER_TEST) {
        return translate(translator, `actions.${action}`, "Answer test");
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
    if (
        action === AI_ACTIONS_TYPES.IMAGE_PROCESSING
        || action === AI_ACTIONS_TYPES.PUBLIC_MENU_EXTRACTION
        || action === AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_OCR
        || action === AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_TRANSCRIPTION
        || action === AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_EMBEDDING
        || action === AI_ACTIONS_TYPES.ANSWERLATTICE_KB_EMBEDDING
        || action === AI_ACTIONS_TYPES.ANSWERLATTICE_ENTITY_EXTRACTION
    ) {
        return "extraction";
    }
    if (
        action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION
        || action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION
        || action === AI_ACTIONS_TYPES.ITEM_TRANSLATION
        || action === AI_ACTIONS_TYPES.ANSWERLATTICE_TRANSLATION
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
        || action === AI_ACTIONS_TYPES.AI_MENU_MANAGER_PLANNER
        || action === AI_ACTIONS_TYPES.ANSWERLATTICE_FAQ_GENERATION
        || action === AI_ACTIONS_TYPES.ANSWERLATTICE_DRAFT_GENERATION
        || action === AI_ACTIONS_TYPES.ANSWERLATTICE_TICKET_KNOWLEDGE_EXTRACTION
        || action === AI_ACTIONS_TYPES.ANSWERLATTICE_FRICTION_INSIGHT
    ) {
        return "content";
    }
    return "system";
};

const countDescriptionRows = (operation: AiOperationPresentationInput): number => {
    const response = getAiOperationHistoryJsonObject(operation.clientResponse);
    const descriptionSummary = getAiOperationHistoryJsonObject(response?.descriptionSummary);
    const compactCount = countFromSummary(descriptionSummary?.descriptionCount);
    if (compactCount > 0) return compactCount;

    if (!response) return 0;

    return Object.values(response).reduce<number>((total, languageDescriptions) => {
        if (!languageDescriptions || typeof languageDescriptions !== "object" || Array.isArray(languageDescriptions)) {
            return total;
        }
        return total + Object.keys(languageDescriptions as Record<string, unknown>).length;
    }, 0);
};

const countTranslationRows = (operation: AiOperationPresentationInput): number => {
    const response = getAiOperationHistoryJsonObject(operation.clientResponse);
    const compactCount = countFromSummary(response?.translationsCount);
    if (compactCount > 0) return compactCount;

    const translations = getAiOperationHistoryJsonObject(response?.translations);
    if (translations) return Object.keys(translations).length;
    return operation.inputStrings ? Object.keys(operation.inputStrings).length : 0;
};

const formatLanguage = (language: LanguageValue): string | null => {
    if (!language) return null;
    return formatAiOperationHistoryLanguage(language) || null;
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
    const clientResponse = getAiOperationHistoryJsonObject(operation.clientResponse);

    if (action === AI_ACTIONS_TYPES.IMAGE_PROCESSING || action === AI_ACTIONS_TYPES.PUBLIC_MENU_EXTRACTION) {
        const data = getAiOperationHistoryJsonObject(clientResponse?.data);
        const dataSummary = getAiOperationHistoryJsonObject(clientResponse?.dataSummary);
        const items = countArray(data?.items) || Number(dataSummary?.itemsCount || 0);
        const categories = countArray(data?.categories) || Number(dataSummary?.categoriesCount || 0);
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
        if (clientResponse?.hasPartialCoverage === true) {
            const fallbackCount = countFromSummary(clientResponse.fallbackKeyCount);
            return fallbackCount > 0
                ? translate(
                    translator,
                    "summary.translationCompletedWithGapsCount",
                    `Translation returned ${baseFormatCount(fallbackCount, "incomplete row")}. Review the content and retry.`,
                    { count: fallbackCount },
                )
                : translate(
                    translator,
                    "summary.translationCompletedWithGaps",
                    "Translation returned incomplete text. Review the content and retry.",
                );
        }
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
        const images = countArray(operation.clientResponse)
            || countFromSummary(clientResponse?.generatedImageCount)
            || countFromSummary(clientResponse?.arrayCount);
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

    if (action === AI_ACTIONS_TYPES.AI_MENU_MANAGER_PLANNER) {
        return translate(translator, "summary.preparedMenuUpdatePlan", "Prepared a menu update plan.");
    }

    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_WIDGET_SEARCH || action === AI_ACTIONS_TYPES.HELP_CENTER_SEARCH) {
        const referencesCount = Number(clientResponse?.referencesCount || 0);
        return referencesCount > 0
            ? translate(translator, "summary.answerlatticeAnswerWithReferences", `Answered with ${baseFormatCount(referencesCount, "reference")}.`, { count: referencesCount })
            : translate(translator, "summary.answerlatticeAnswer", "Answered a support question.");
    }

    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_KB_EMBEDDING || action === AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_EMBEDDING || action === AI_ACTIONS_TYPES.HELP_CENTER_EMBEDDING) {
        return translate(translator, "summary.answerlatticeKnowledgeEmbedding", "Updated knowledge search data.");
    }

    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_TRANSLATION) {
        return translate(translator, "summary.answerlatticeTranslation", "Prepared an article translation.");
    }

    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_FAQ_GENERATION) {
        const createdCount = Number(clientResponse?.createdCount || 0);
        return createdCount > 0
            ? translate(translator, "summary.answerlatticeFaqsCreated", `Prepared ${baseFormatCount(createdCount, "FAQ")}.`, { count: createdCount })
            : translate(translator, "summary.answerlatticeFaqGeneration", "Checked article FAQ suggestions.");
    }

    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_OCR) {
        return translate(translator, "summary.answerlatticeIntakeOcr", "Extracted text from a screenshot.");
    }

    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_TRANSCRIPTION) {
        return translate(translator, "summary.answerlatticeIntakeTranscription", "Extracted text from media.");
    }

    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_DRAFT_GENERATION) {
        return translate(translator, "summary.answerlatticeDraftGeneration", "Prepared a canonical answer draft.");
    }

    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_TICKET_KNOWLEDGE_EXTRACTION) {
        return translate(translator, "summary.answerlatticeTicketKnowledge", "Prepared knowledge from resolved tickets.");
    }

    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_ONBOARDING_BOOTSTRAP) {
        return translate(translator, "summary.answerlatticeOnboardingBootstrap", "Prepared launch setup knowledge.");
    }

    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_ENTITY_EXTRACTION) {
        const matchedCount = Number(clientResponse?.matchedEntityCount || 0);
        return matchedCount > 0
            ? translate(translator, "summary.answerlatticeEntityExtractionMatched", `Matched ${baseFormatCount(matchedCount, "entity")}.`, { count: matchedCount })
            : translate(translator, "summary.answerlatticeEntityExtraction", "Checked article entity context.");
    }

    if (action === AI_ACTIONS_TYPES.ANSWERLATTICE_FRICTION_INSIGHT) {
        return translate(translator, "summary.answerlatticeFrictionInsight", "Prepared a friction insight.");
    }

    if (action === AI_ACTIONS_TYPES.MENU_INTAKE_IDENTITY) {
        return translate(translator, "summary.checkedMenuUploadDetails", "Checked menu upload details.");
    }

    return translate(translator, "summary.activityRecorded", "Activity recorded.");
};
