/**
 * Shared AI Image Generation Functions
 * 
 * Extracted from route.ts and batch-generation/route.ts to eliminate code duplication.
 * Both single generation and batch worker share these exact same model calls.
 * 
 * Model used:
 * - Gemini 3.1 Flash Image: Production image generation and editing path.
 */

import { ContentListUnion, GenerateContentResponse, HarmBlockThreshold, HarmCategory, Modality } from "@google/genai";
import { GEMINI_MODELS } from "@constant/AI/models";
import { normalizeGeneratedImagesFromProvider } from "@lib/ai/generatedImageOutput";
import { summarizeImageProviderResponse } from "@lib/ai/imageOperationLogging";
import type { ResolvedImageSubjectReference } from "@lib/ai/imageSubjectProfiles";
import { getImageAsBase64, type ImageFetchStorageScope } from "@lib/apiUtils";
import { mapWithConcurrency } from "@lib/async/boundedConcurrency";
import { genAIClient } from "@lib/google/genAi";
import { logAIRouteFailure } from "@lib/google/genAi/diagnostics";
import { logger } from "@lib/monitoring/logger";
import { GenerateImageViaApiPayloadGenerationConfiType } from "@template/main-app/projects/types";
import { writeLogEntry } from 'logs/utils';

export type GeneratedImagePayload = {
    base64: string;
    cacheHit?: boolean;
    mimeType: string;
    promptCacheKey?: string;
    sizeBytes?: number;
    storagePath?: string;
    uploadedUrl?: string;
};
export type ImageProviderResponse = GenerateContentResponse;
export type ImageGenerationPromptRunOptions = {
    referenceImageStorageScope?: ImageFetchStorageScope;
    subjectReferences?: ResolvedImageSubjectReference[];
};

export const IMAGE_AI_MODELS = {
    GEMINI: GEMINI_MODELS.IMAGE_GEN,
} as const;
export type AI_MODEL_TYPE = keyof typeof IMAGE_AI_MODELS;

const IMAGE_PROMPT_CONCURRENCY = 2;

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
    logFile: string,
    options: ImageGenerationPromptRunOptions = {},
): Promise<{ images: { base64: string; mimeType: string }[], response: GenerateContentResponse } | null> {
    try {
        logger.info('Image generation started (Gemini Flash)', { promptLength: prompt.length });
        let contents: ContentListUnion = `${SYSTEM_INSTRUCTION}\n\n${prompt}\n\nDo not include any text in image unless specifically requested.`;
        if (options.subjectReferences?.length || generationConfig.referanceImage) {
            const parts: ContentListUnion = [];
            options.subjectReferences?.forEach((reference) => {
                parts.push({
                    inlineData: {
                        mimeType: reference.mimeType,
                        data: reference.base64ImageData,
                    },
                });
            });
            if (generationConfig.referanceImage) {
                const { base64ImageData, mimeType } = await getImageAsBase64(generationConfig.referanceImage, {
                    storageScope: options.referenceImageStorageScope,
                });
                parts.push({ inlineData: { mimeType, data: base64ImageData } });
            }
            const identityInstruction = options.subjectReferences?.length
                ? `The first ${options.subjectReferences.length} images are authorized identity references for the same adult person. Preserve that person's recognizable identity, facial structure, skin tone, and stable distinguishing features. If a person appears, show only this saved person unless the prompt explicitly requests other people. Change only the requested hairstyle, clothing, pose, activity, scene, or treatment. ${generationConfig.referanceImage ? 'The final image is a separate visual/style reference; never replace the saved person with the person in that final image.' : ''}`
                : 'Use the supplied image only as the requested visual reference.';
            parts.push({ text: `${SYSTEM_INSTRUCTION}\n\n${identityInstruction}\n\nCreate or edit the image based on this prompt: ${prompt}\n\nMaintain professional quality and ensure the result is appropriate for business use.` });
            contents = parts;
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

        const generatedImages = normalizeGeneratedImagesFromProvider(response);

        logger.info('Image generation completed (Gemini Flash)', { imageCount: generatedImages.length });
        await writeLogEntry({
            logFileName: logFile,
            logType: 'GEMINI_FLASH_SUCCESS',
            data: {
                promptLength: prompt.length,
                response: summarizeImageProviderResponse(response),
            },
        });
        return { images: generatedImages, response };
    } catch (error) {
        logAIRouteFailure('image_generation_gemini_flash_failed', error, {
            hasReferenceImage: Boolean(generationConfig.referanceImage?.url),
            subjectReferenceCount: options.subjectReferences?.length || 0,
            model: IMAGE_AI_MODELS.GEMINI,
            promptLength: prompt.length,
        });
        await writeLogEntry({ logFileName: logFile, logType: 'GEMINI_FLASH_ERROR', error: error });
        return null;
    }
}

export async function runImageGenerationPrompts({
    generationConfig,
    logFile,
    prompts,
    referenceImageStorageScope,
    subjectReferences,
}: {
    generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
    logFile: string;
    prompts: string[];
    referenceImageStorageScope?: ImageFetchStorageScope;
    subjectReferences?: ResolvedImageSubjectReference[];
}): Promise<{
    failedPromptCount: number;
    images: GeneratedImagePayload[];
    promptCount: number;
    responses: ImageProviderResponse[];
}> {
    if (!prompts.length) {
        return {
            failedPromptCount: 0,
            images: [],
            promptCount: 0,
            responses: [],
        };
    }

    const runPrompt = async (prompt: string) => {
        const result = await generateGeminiImageViaFlash(prompt, generationConfig, logFile, {
            referenceImageStorageScope,
            subjectReferences,
        });
        return result || null;
    };

    const results = prompts.length === 1
        ? [await runPrompt(prompts[0])]
        : await mapWithConcurrency(prompts, IMAGE_PROMPT_CONCURRENCY, runPrompt);

    const successfulResults = results.filter(Boolean) as Array<{
        images: GeneratedImagePayload[];
        response: ImageProviderResponse;
    }>;

    return {
        failedPromptCount: prompts.length - successfulResults.length,
        images: successfulResults.flatMap((result) => result.images || []),
        promptCount: prompts.length,
        responses: successfulResults.map((result) => result.response),
    };
}
