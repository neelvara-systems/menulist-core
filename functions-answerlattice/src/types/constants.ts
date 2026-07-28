/**
 * Firebase Functions Constants
 * 
 * Collection names and shared constants.
 */

import { DB_COLLECTIONS } from "../constants/database";

// ═══════════════════════════════════════════════════════════════════════════
// COLLECTION NAMES
// ═══════════════════════════════════════════════════════════════════════════

export const INGESTION_JOB_COLLECTION = DB_COLLECTIONS.KB_GENERATION_JOBS;
export const KB_CATEGORIES_COLLECTION = DB_COLLECTIONS.KB_CATEGORIES;
export const KB_ARTICLES_COLLECTION = DB_COLLECTIONS.KB_ARTICLES;
export const ANSWERLATTICE_FAQS_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_FAQS;
export const ANSWERLATTICE_CACHE_VERSIONS_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS;
export const MENU_IMAGE_PROCESSING_JOBS_COLLECTION = DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS;

// ═══════════════════════════════════════════════════════════════════════════
// FILE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export const FILE_TYPE = {
    PDF: "pdf",
    IMAGE: "image",
    VIDEO: "video",
    AUDIO: "audio",
    DOCUMENT: "document",
    WEBSITE: "website",
    YOUTUBE: "youtube",
    GOOGLE_DRIVE: "google_drive",
    COPIED_TEXT: "copied_text",
} as const;

export type SourceFileType = typeof FILE_TYPE[keyof typeof FILE_TYPE];
