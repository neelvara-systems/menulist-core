/**
 * Menu Extraction Types
 * 
 * Types for AI-extracted menu data (categories, items, languages).
 */

import { FileMessage } from "./fileMessages.types";
import type { ExtractedBusinessProfile } from "../sharedData/extractedBusinessProfile";

// ═══════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface MenuFileToProcess {
    uid?: string;
    name: string;
    size: number;
    type: string;
    url: string; // HTTPS URL or data URI
}

export interface TargetLanguage {
    code: string;
    name: string;
}

export interface MenuExtractionAuditContext {
    jobId?: string;
    tId?: string | number;
    sId?: string | number;
    uId?: string;
    source?: string;
    destinationType?: string;
    destinationId?: string;
    jobMode?: string;
    skipProjectSave?: boolean;
}

export interface ProcessMenuImagesRequest {
    files: MenuFileToProcess[];
    targetLanguages: TargetLanguage[];
    projectId?: string;
    fileId?: string;
    action?: string;
    businessCategory?: string;
    businessType?: string;
    auditContext?: MenuExtractionAuditContext;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTED DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Per-item AI self-assessment of extraction certainty (Infrastructure Compounding 10.1) */
export interface ExtractionConfidence {
    name: 'high' | 'medium' | 'low';
    price: 'high' | 'medium' | 'low';
}

export interface MenuLanguage {
    code: string;
    name: string;
    isPrimary?: boolean;
}

export interface MenuItemAttribute {
    name: Record<string, string>;
    price?: number | string | null;
}

export interface MenuItem {
    id: string;
    name: Record<string, string>;
    description?: Record<string, string>;
    price?: number | string | null;
    categoryId: string;
    attributes?: MenuItemAttribute[];
    tags?: string[];
    dietaryTags?: string[];
    spiceLevel?: 'none' | 'mild' | 'medium' | 'hot' | 'very-hot';
    duration?: number;
    confidence?: ExtractionConfidence;  // Infrastructure Compounding 10.1
}

export interface MenuCategory {
    id: string;
    name: Record<string, string>;
    description?: Record<string, string>;
    icon?: string;
}

export interface BusinessAttributeSuggestion {
    key: string;
    value: true;
    confidence?: 'high' | 'medium' | 'low';
    evidence?: string;
    sourceFileIndex?: number;
}

export interface ExtractedMenuData {
    languages: MenuLanguage[];
    categories: MenuCategory[];
    items: MenuItem[];
    extractedBusinessProfile?: ExtractedBusinessProfile;
    businessAttributeSuggestions?: BusinessAttributeSuggestion[];
    fileMessages?: FileMessage[]; // Per-file warnings/errors from AI (Section 8.14)
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE SUMMARY (Infrastructure Compounding 10.1)
// Aggregate confidence stats for the entire extraction job
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfidenceSummary {
    highConfidenceCount: number;
    mediumConfidenceCount: number;
    lowConfidenceCount: number;
    averageConfidenceScore: number;  // 0-1 (high=1, medium=0.6, low=0.2)
}

// ═══════════════════════════════════════════════════════════════════════════
// QUALITY SCORING
// ═══════════════════════════════════════════════════════════════════════════

export interface QualityDetails {
    categoryQuality: number;
    itemQuality: number;
    priceQuality: number;
    descriptionQuality: number;
}

export interface QualityScore {
    score: number;
    isLowQuality: boolean;
    warning?: string;
    details: QualityDetails;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE TYPE
// ═══════════════════════════════════════════════════════════════════════════

export interface ProcessMenuImagesResponse {
    data: {
        message: string;
        data: ExtractedMenuData;
        qualityScore: number;
        qualityDetails: QualityDetails;
    };
    transaction: {
        requestId: string;
        totalCharge: number;
        totalCredits: number;
        unitsConsumed: number;
        processingTime: number;
        transactionId: string | null;
        recorded: boolean;
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
    timings?: {
        requestStartedAt?: number;
        uploadStartedAt?: number;
        uploadCompletedAt?: number;
        batchProcessingStartedAt?: number;
        batchProcessingCompletedAt?: number;
        operationLoggedAt?: number;
        uploadMs?: number;
        batchProcessingMs?: number;
        totalProcessingMs?: number;
    };
    /** Extraction provenance — raw AI responses + version tracking (P0 hardening) */
    provenance?: {
        rawBatchResponses: {
            batchIndex: number;
            rawText: string;
            truncated: boolean;
        }[];
        promptVersion: string;
        model: string;
    };
}
