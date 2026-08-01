/**
 * API Types
 * 
 * Request/Response types for project-related API calls.
 */

import { AI_ACTIONS_TYPES } from "@constant/common";
import { LanguageType } from "./common.types";
import { ProjectFileType } from "./project.types";

// ═══════════════════════════════════════════════════════════════════════════
// Action Type Constants
// ═══════════════════════════════════════════════════════════════════════════

export const languageActionType = {
    IMAGE_TRANSLATION: AI_ACTIONS_TYPES.IMAGE_TRANSLATION,
    LANGUAGE_ADDITION: AI_ACTIONS_TYPES.LANGUAGE_ADDITION,
    ITEM_TRANSLATION: AI_ACTIONS_TYPES.ITEM_TRANSLATION,
} as const;

export type LanguageActionType = typeof languageActionType[keyof typeof languageActionType];

export const descriptionActionType = {
    ADD_DESCRIPTION: AI_ACTIONS_TYPES.ADD_DESCRIPTION,
    REWRITE_DESCRIPTION: AI_ACTIONS_TYPES.REWRITE_DESCRIPTION
} as const;

export type DescriptionActionType = typeof descriptionActionType[keyof typeof descriptionActionType];

// ═══════════════════════════════════════════════════════════════════════════
// Translation API
// ═══════════════════════════════════════════════════════════════════════════

export interface TranslationAPIParams {
    inputJson: Record<string, string>;
    targetLang: LanguageType;
    sourceLang: LanguageType;
    action: LanguageActionType;
    projectId: string;
    fileId: string;
}

export interface BatchTranslationAPIParams {
    inputJson: Record<string, string>;
    targetLang: LanguageType[];
    sourceLang: LanguageType;
    action: LanguageActionType;
    projectId: string;
    fileId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Description API
// ═══════════════════════════════════════════════════════════════════════════

export interface DescriptionAPIItem {
    id: string;
    name: string;
    category?: string;
    attributes?: string;
    description?: string;
}

export interface DescriptionAPIParams {
    itemsList: DescriptionAPIItem[];
    targetLang: LanguageType[];
    sourceLang: LanguageType;
    action: DescriptionActionType;
    projectId: string;
    fileId: string;
    contentLength: "Standard" | "Detailed";
    tone?: "Professional" | "Friendly" | "Premium";
    /**
     * Total paid requests in the current owner action. Sent on the first
     * request only so the server can reject an underfunded multi-batch refresh
     * before any provider work. Every request still reserves and settles its
     * own unit independently.
     */
    operationRequestCount?: number;
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
    businessType?: string;
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
    identityOverrideConfirmed?: boolean;
}
