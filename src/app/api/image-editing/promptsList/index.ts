import { GenerateImageViaApiPayloadItemDetailsType } from "@template/main-app/projects/types";
import { UserUploadedFileType } from "@type/common";
import { logImageEditingPromptFailure } from "./diagnostics";
import getBackgroundReplacementPrompt from "./getBackgroundReplacementPrompt";
import getBusinessSpecificPrompt from "./getBusinessSpecificPrompt";
import getClothingTryonPrompt from "./getClothingTryonPrompt";
import getGenericSingleImagePrompt from "./getGenericSingleImagePrompt";
import getGenericTwoImagePrompt from "./getGenericTwoImagePrompt";
import getHairStylePrompt from "./getHairStylePrompt";
import getImageEnhancementPrompt from "./getImageEnhancementPrompt";
import getObjectPlacementPrompt from "./getObjectPlacementPrompt";
import getRemoveBackgroundPrompt from "./getRemoveBackgroundPrompt";
import getSkinTreatmentPrompt from "./getSkinTreatmentPrompt";
import getTattooTryonPrompt from "./getTattooTryonPrompt";
import {
    IMAGE_EDITING_PROMPT_TEXT_MAX_LENGTH,
    sanitizeImageEditingItemDetails,
    sanitizeImageEditingPromptText,
} from "./promptInput";

export function generateImageEditingPrompt(
    businessType: string,
    generationConfig: {
        prompt: string;
        referanceImage: UserUploadedFileType | null;
        feature?: string;
        promptImages?: UserUploadedFileType[] | null;
    },
    itemDetails: GenerateImageViaApiPayloadItemDetailsType, // Parameter retained for API compatibility.
): string | null {

    const { feature } = generationConfig;
    const prompt = sanitizeImageEditingPromptText(generationConfig.prompt, IMAGE_EDITING_PROMPT_TEXT_MAX_LENGTH);
    const safeItemDetails = sanitizeImageEditingItemDetails(itemDetails);

    switch (feature) {
        case "Remove Background":
            return getRemoveBackgroundPrompt();

        case "Replace Background":
            return getBackgroundReplacementPrompt(prompt);

        case "Enhance Image":
            return getImageEnhancementPrompt(prompt);

        case "Object Placement":
            return getObjectPlacementPrompt(prompt);

        case "Hair Style":
            return getHairStylePrompt(prompt);

        case "Clothing Try-On":
            return getClothingTryonPrompt(prompt, (generationConfig.promptImages?.length ?? 0) > 0);

        case "Tattoo Try-On":
            return getTattooTryonPrompt(prompt, (generationConfig.promptImages?.length ?? 0) > 0);

        case "Skin Treatment":
            return getSkinTreatmentPrompt(prompt);

        case "Generic Single-Image Edit":
            return getGenericSingleImagePrompt(prompt);

        case "Generic Two-Image Edit":
            return getGenericTwoImagePrompt(prompt);

        default:
            if (!feature) {
                logImageEditingPromptFailure("image_editing_feature_missing", undefined, {
                    businessType,
                    hasItemName: Boolean(safeItemDetails.name),
                });
                return null;
            }
            try {
                return getBusinessSpecificPrompt(businessType, feature, safeItemDetails);
            } catch (error) {
                logImageEditingPromptFailure("image_editing_business_specific_prompt_failed", error, {
                    businessType,
                    feature,
                    hasItemCategory: Boolean(safeItemDetails.category),
                    hasItemDescription: Boolean(safeItemDetails.description),
                    hasItemName: Boolean(safeItemDetails.name),
                });
                return null;
            }
    }
}
