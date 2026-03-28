import { logger } from "@lib/monitoring/logger";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { GenerateImageViaApiPayloadType, ImageGenerationConfigType, ItemForDropdown } from "@template/main-app/projects/types";

async function generateImageViaApi({ itemDetails, generationConfig, projectId, fileId, businessType }: { itemDetails: ItemForDropdown, generationConfig: ImageGenerationConfigType, projectId: string, fileId: string, businessType: string }) {
    try {
        const { prompt, referanceImage, stylesCategory, styles, aspectRatio, environments, lighting, colors, moods, compositions, backgroundColor, transparentBg, negativePrompt, foregroundColor, selectedImageTypes, isMultiMode } = generationConfig;
        const { itemName, descriptionLine, attributesList, categoryName } = itemDetails;
        const payload: GenerateImageViaApiPayloadType = {
            projectId,
            fileId,
            businessType,
            generationConfig: {
                prompt,
                referanceImage,
                stylesCategory,
                styles,
                aspectRatio,
                environments,
                lighting,
                colors,
                moods,
                compositions,
                backgroundColor,
                transparentBg,
                negativePrompt,
                foregroundColor,
                selectedImageTypes,
                isMultiMode,
            },
            itemDetails: {
                name: itemName,
                description: descriptionLine,
                attributes: attributesList,
                category: categoryName
            },
        }
        const response = await fetch('/api/image-generation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw new Error(`Image generation request failed: ${response.statusText}`);
        }
        const responseJson = await response.json();
        syncBalanceFromResponse(responseJson);
        const { data, transaction } = responseJson;
        logger.debug('Image generation response', { transactionId: transaction?.id, imageCount: data?.length });
        if (data?.length > 0) {
            data.map((item: { base64: string; mimeType: string }) => {
                if (!item.base64.startsWith('data:')) {
                    item.base64 = `data:${item.mimeType};base64,${item.base64}`;
                }
            })
            return data;
        }
        return data || [];

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logger.error('Image generation API failed', error, { projectId, fileId });
        return [];
    }
}

export default generateImageViaApi;