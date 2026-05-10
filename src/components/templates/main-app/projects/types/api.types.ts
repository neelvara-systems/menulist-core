/**
 * API Types
 * 
 * Request/Response types for project-related API calls.
 */

import { AI_ACTIONS_TYPES } from "@constant/common";
import { LanguageType } from "./common.types";
import { ExtractedDataItem } from "./extractedData.types";
import { ProjectFileType } from "./project.types";

// ═══════════════════════════════════════════════════════════════════════════
// Action Type Constants
// ═══════════════════════════════════════════════════════════════════════════

export const languageActionType = {
    IMAGE_TRANSLATION: AI_ACTIONS_TYPES.IMAGE_TRANSLATION,
    LANGUAGE_ADDITION: AI_ACTIONS_TYPES.LANGUAGE_ADDITION
}

export const descriptionActionType = {
    ADD_DESCRIPTION: AI_ACTIONS_TYPES.ADD_DESCRIPTION,
    REWRITE_DESCRIPTION: AI_ACTIONS_TYPES.REWRITE_DESCRIPTION
}

// ═══════════════════════════════════════════════════════════════════════════
// Translation API
// ═══════════════════════════════════════════════════════════════════════════

export interface TranslationAPIParams {
    inputJson: any;
    targetLang: LanguageType;
    sourceLang: LanguageType;
    action: keyof typeof languageActionType | string;
    projectId: string;
    fileId: string;
}

export interface BatchTranslationAPIParams {
    inputJson: any;
    targetLang: LanguageType[];
    sourceLang: LanguageType;
    action: keyof typeof languageActionType | string;
    projectId: string;
    fileId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Description API
// ═══════════════════════════════════════════════════════════════════════════

export interface DescriptionAPIParams {
    itemsList: ExtractedDataItem[];
    targetLang: LanguageType[];
    sourceLang: LanguageType;
    action: keyof typeof descriptionActionType;
    projectId: string;
    fileId: string;
    contentLength: "Standard" | "Detailed";
    tone?: "Professional" | "Friendly" | "Premium";
}

// ═══════════════════════════════════════════════════════════════════════════
// New Item Metadata API
// ═══════════════════════════════════════════════════════════════════════════

export interface NewItemMetadataItem {
    id: string;
    category: string;
    name: string;
    description?: string;
    attributes?: { id: string, name: string, price?: string }[];
}

export interface NewItemMetadataAPIParams {
    item: NewItemMetadataItem;
    targetLang: LanguageType[];
    sourceLang: LanguageType;
    projectId: string;
    businessType: string;
    fileId: string;
    contentLength: "Standard" | "Detailed";
    tone?: "Professional" | "Friendly" | "Premium";
}

// ═══════════════════════════════════════════════════════════════════════════
// File Processing API
// ═══════════════════════════════════════════════════════════════════════════

export interface ProcessedFileAPIParams {
    files: ProjectFileType[];
    targetLanguages: LanguageType[];
    projectId: string;
    fileId?: string; // Optional - only used for legacy tracking, job queue uses jobId instead
    action?: string;
    businessCategory?: string;
    businessType?: string;
}
