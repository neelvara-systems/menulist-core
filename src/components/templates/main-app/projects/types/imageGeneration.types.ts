/**
 * Image Generation Types
 * 
 * Types for AI image generation configuration and API payloads.
 */

import { UserUploadedFileType } from "@type/common";

// ═══════════════════════════════════════════════════════════════════════════
// Generation Configuration
// ═══════════════════════════════════════════════════════════════════════════

export interface ImageGenerationConfigType {
    prompt?: string;
    referanceImages?: any[];
    referanceImage?: UserUploadedFileType | null;
    loading?: boolean;
    generatedImages?: UserUploadedFileType[] | [];
    stylesCategory?: string;
    styles: string[];
    aspectRatio: string;
    environments?: string[]; // Only one environment can be selected
    lighting?: string[];
    colors?: string[];
    moods?: string[];
    compositions?: string[];
    backgroundColor?: string;
    negativePrompt?: string;
    transparentBg?: boolean;
    foregroundColor?: string;
    selectedImageTypes?: string[];
    isMultiMode?: boolean;
    agreeToTerms?: boolean; // Content policy agreement
}

// ═══════════════════════════════════════════════════════════════════════════
// API Payload Types
// ═══════════════════════════════════════════════════════════════════════════

export type GenerateImageViaApiPayloadGenerationConfiType = {
    prompt?: string;
    referanceImage?: UserUploadedFileType | null;
    stylesCategory?: string;
    styles?: string[];
    aspectRatio?: string;
    environments?: string[];
    lighting?: string[];
    colors?: string[];
    moods?: string[];
    compositions?: string[];
    backgroundColor?: string;
    transparentBg?: boolean;
    negativePrompt?: string;
    foregroundColor?: string;
    selectedImageTypes?: string[];
    isMultiMode?: boolean;
    numberOfImages?: number;
    agreeToTerms?: boolean;
}

export type GenerateImageViaApiPayloadItemDetailsType = {
    id?: string;
    name?: string;
    description?: string;
    attributes?: string[];
    category?: string;
}

export type EditImageViaApiPayloadType = {
    generationConfig: {
        prompt: string;
        referanceImage: any | null;
        feature?: string;
        promptImages?: UserUploadedFileType[] | null;
    };
    businessType: string;
    projectId: string;
    fileId: string;
    itemDetails: GenerateImageViaApiPayloadItemDetailsType;
}

export type GenerateImageViaApiPayloadType = {
    generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
    projectId: string;
    fileId?: string;
    businessType: string;
    itemDetails: GenerateImageViaApiPayloadItemDetailsType;
}

export type GenerateImageViaApiPayloadBatchType = {
    generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
    projectId: string;
    businessType: string;
    itemsList?: GenerateImageViaApiPayloadItemDetailsType[];
    jobId: string;
    itemDetails?: GenerateImageViaApiPayloadItemDetailsType;
}
