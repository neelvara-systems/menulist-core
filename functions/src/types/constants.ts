/**
 * Firebase Functions Constants
 * 
 * Collection names and shared constants.
 */

// ═══════════════════════════════════════════════════════════════════════════
// COLLECTION NAMES
// ═══════════════════════════════════════════════════════════════════════════

export const INGESTION_JOB_COLLECTION = "kb_generation_jobs";
export const KB_CATEGORIES_COLLECTION = "kb_categories";
export const KB_ARTICLES_COLLECTION = "kb_articles";
export const MENU_IMAGE_PROCESSING_JOBS_COLLECTION = "menuImageProcessingJobs";

// ═══════════════════════════════════════════════════════════════════════════
// AI CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const AI_TYPE = "gemini"; // "vertex" or "gemini"

// ═══════════════════════════════════════════════════════════════════════════
// FILE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export const FILE_TYPE: Record<string, string> = {
    PDF: "pdf",
    IMAGE: "image",
    VIDEO: "video",
    AUDIO: "audio",
    DOCUMENT: "document",
    WEBSITE: "website",
    YOUTUBE: "youtube",
    GOOGLE_DRIVE: "google_drive",
    COPIED_TEXT: "copied_text",
}

export type SourceFileType = typeof FILE_TYPE[keyof typeof FILE_TYPE];
