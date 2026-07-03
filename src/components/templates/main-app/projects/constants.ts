import { MENU_EXTRACTION_JOB_LIMITS } from '@data/shared/menuExtractionJob';

// ============================
// FILE UPLOAD LIMITS
// ============================

// Individual file size limits
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB per image (JPG, PNG, WebP)
export const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB per PDF (compressed format)

// Total upload session limit
export const MAX_TOTAL_UPLOAD_SIZE = 200 * 1024 * 1024; // 200MB total per session

// Warning threshold (show warning but don't block)
export const WARN_FILE_SIZE = 30 * 1024 * 1024; // 30MB - warn user about large file

// Extraction job file/page limits. Keep this aligned with the backend request schema
// so oversized batches are blocked before client Storage upload.
export const MAX_MENU_EXTRACTION_FILES = MENU_EXTRACTION_JOB_LIMITS.MAX_FILES;

// PDF processing limits
export const MAX_PDF_PAGES = MAX_MENU_EXTRACTION_FILES; // Maximum pages to process per PDF
export const WARN_PDF_PAGES = Math.max(10, MAX_PDF_PAGES - 3); // Show warning for PDFs with many pages

// File processing timeout
export const PROCESSING_TIMEOUT = 120000; // 2 minutes

// ============================
// ALLOWED FILE TYPES
// ============================

export const ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf']
} as const;

// File type MIME types array (for quick checks)
export const ALLOWED_MIME_TYPES = Object.keys(ALLOWED_FILE_TYPES);

// All allowed extensions (for display/validation)
export const ALLOWED_EXTENSIONS = Object.values(ALLOWED_FILE_TYPES).flat();

// ============================
// FILE MAGIC BYTES (SIGNATURES)
// ============================
// NOTE: Magic byte signatures have been moved to shared location:
// @lib/security/fileSignatures.ts
// 
// This ensures consistency across all file validation logic in the app.
// Projects feature uses: FILE_SIGNATURES_WITH_WILDCARDS (with null wildcards for RIFF)
// Image uploads use: FILE_SIGNATURES (standard signatures)

// ============================
// EDITOR / AUTO-SAVE
// ============================

// Debounce interval: how long after the last change we wait before auto-saving
export const AUTOSAVE_DEBOUNCE_MS = 15000; // 15 seconds

// Minimum gap between auto-saves to avoid excessive Firestore writes
export const AUTOSAVE_MIN_INTERVAL_MS = 30000; // 30 seconds
