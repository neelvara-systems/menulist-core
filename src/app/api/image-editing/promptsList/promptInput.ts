import { GenerateImageViaApiPayloadItemDetailsType } from "@template/main-app/projects/types";

export const IMAGE_EDITING_PROMPT_TEXT_MAX_LENGTH = 2000;
export const IMAGE_EDITING_ITEM_NAME_MAX_LENGTH = 500;
export const IMAGE_EDITING_ITEM_CATEGORY_MAX_LENGTH = 200;

export function sanitizeImageEditingPromptText(
    value: string | null | undefined,
    maxLength: number = IMAGE_EDITING_PROMPT_TEXT_MAX_LENGTH,
): string {
    if (typeof value !== 'string') return '';

    return value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/[{}<>`$\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength)
        .trim();
}

function sanitizeOptionalImageEditingText(
    value: string | null | undefined,
    maxLength: number,
): string | undefined {
    const sanitized = sanitizeImageEditingPromptText(value, maxLength);
    return sanitized || undefined;
}

export function sanitizeImageEditingItemDetails(
    itemDetails: GenerateImageViaApiPayloadItemDetailsType = {},
): GenerateImageViaApiPayloadItemDetailsType {
    return {
        ...itemDetails,
        category: sanitizeOptionalImageEditingText(itemDetails.category, IMAGE_EDITING_ITEM_CATEGORY_MAX_LENGTH),
        description: sanitizeOptionalImageEditingText(itemDetails.description, IMAGE_EDITING_PROMPT_TEXT_MAX_LENGTH),
        name: sanitizeOptionalImageEditingText(itemDetails.name, IMAGE_EDITING_ITEM_NAME_MAX_LENGTH),
    };
}
