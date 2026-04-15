/**
 * Shared AI Image Generation Functions
 * 
 * Extracted from route.ts and batch-generation/route.ts to eliminate code duplication.
 * Both single generation and batch worker share these exact same model calls.
 * 
 * Models used:
 * - Gemini 2.5 Flash: Primary generation (supports reference images)
 * - Imagen 3: Alternative generation (better for text-free images)
 */

import { GenerateContentResponse, GenerateImagesResponse, HarmBlockThreshold, HarmCategory, Modality } from "@google/genai";
import { getImageAsBase64 } from "@lib/apiUtils";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { GenerateImageViaApiPayloadGenerationConfiType } from "@template/main-app/projects/types";
import { writeLogEntry } from 'logs/utils';

export type AI_MODEL_TYPE = "GEMINI" | "IMAGEN";

export const IMAGE_AI_MODELS = {
    GEMINI: "gemini-2.5-flash-image",
    IMAGEN: "imagen-3.0-generate-002"
} as const;

const SYSTEM_INSTRUCTION = `You are a professional image generation assistant for businesses (restaurants, spas, salons, etc.).

🔒 CRITICAL SAFETY RULES - YOU MUST NEVER:
1. Generate images containing explicit, violent, or disturbing content
2. Generate images with hate symbols, offensive gestures, or discriminatory content
3. Generate images depicting illegal activities or dangerous behavior
4. Generate images with text containing inappropriate, offensive, or vulgar language
5. Generate images that could be misleading, deceptive, or harmful

✅ YOU SHOULD:
1. Generate professional, high-quality images suitable for business use
2. Focus on food, products, services, ambiance, or professional contexts
3. Ensure images are appropriate for all audiences
4. Keep compositions clean, appealing, and brand-safe
5. Avoid including text in images unless specifically requested

Generate images based on the given prompt while adhering to these safety guidelines.`;

const SAFETY_SETTINGS = [
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
    },
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
    }
];

export async function generateGeminiImageViaFlash(
    prompt: string,
    generationConfig: GenerateImageViaApiPayloadGenerationConfiType,
    logFile: string
): Promise<{ images: { base64: string; mimeType: string }[], response: GenerateContentResponse } | null> {
    try {
        logger.info('Image generation started (Gemini Flash)', { promptLength: prompt.length });
        let contents: any = `${SYSTEM_INSTRUCTION}\n\n${prompt}\n\nDo not include any text in image unless specifically requested.`;
        if (generationConfig.referanceImage) {
            const { base64ImageData, mimeType } = await getImageAsBase64(generationConfig.referanceImage);
            contents = [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64ImageData,
                    },
                },
                { text: `${SYSTEM_INSTRUCTION}\n\nEdit the image based on the given prompt: ${prompt}\n\nMaintain professional quality and ensure the result is appropriate for business use.` }
            ];
        }
        const response = await genAIClient.models.generateContent({
            model: IMAGE_AI_MODELS.GEMINI,
            contents: contents,
            config: {
                temperature: 1,
                responseModalities: [Modality.TEXT, Modality.IMAGE],
                safetySettings: SAFETY_SETTINGS
            },
        });

        let generatedImages: { base64: string; mimeType: string }[] = [];
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64Image = part.inlineData.data;
                    const mimeType = `image/${part.inlineData.mimeType.split('/').pop()}`;
                    generatedImages.push({ base64: base64Image, mimeType });
                }
            }
        }

        logger.info('Image generation completed (Gemini Flash)', { imageCount: generatedImages.length });
        await writeLogEntry({ logFileName: logFile, logType: 'GEMINI_FLASH_SUCCESS', data: { prompt, response } });
        return { images: generatedImages, response };
    } catch (error) {
        logger.error('Error generating image (Gemini Flash)', error);
        await writeLogEntry({ logFileName: logFile, logType: 'GEMINI_FLASH_ERROR', error: error });
        return null;
    }
}

export async function generateGeminiImageViaImagen3(
    prompt: string,
    generationConfig: GenerateImageViaApiPayloadGenerationConfiType,
    logFile: string
): Promise<{ images: { base64: string; mimeType: string }[], response: GenerateImagesResponse } | null> {
    try {
        logger.info('Image generation started (Imagen 3)', { promptLength: prompt.length });

        const response = await genAIClient.models.generateImages({
            model: IMAGE_AI_MODELS.IMAGEN,
            prompt: prompt,
            config: {
                aspectRatio: generationConfig?.aspectRatio || "1:1",
                numberOfImages: generationConfig?.numberOfImages || 1,
            },
        });

        let generatedImages: { base64: string; mimeType: string }[] = [];
        if (response.generatedImages && response.generatedImages.length > 0) {
            generatedImages = response.generatedImages.map(img => ({
                base64: img.image.imageBytes,
                mimeType: img.image.mimeType,
            }));
        }
        logger.info('Image generation completed (Imagen 3)', { imageCount: generatedImages.length });
        await writeLogEntry({ logFileName: logFile, logType: 'IMAGEN3_SUCCESS', data: { prompt, response } });
        return { images: generatedImages, response };
    } catch (error) {
        logger.error('Error generating image (Imagen 3)', error);
        await writeLogEntry({ logFileName: logFile, logType: 'IMAGEN3_ERROR', error: error });
        return null;
    }
}

/**
 * Select the correct image generation function based on model type and config.
 * Uses Gemini Flash when reference images are provided (Imagen doesn't support them).
 */
export function selectImageGenerator(
    aiModel: AI_MODEL_TYPE,
    generationConfig: GenerateImageViaApiPayloadGenerationConfiType
) {
    return (aiModel === "GEMINI" || Boolean(generationConfig?.referanceImage?.url))
        ? generateGeminiImageViaFlash
        : generateGeminiImageViaImagen3;
}
