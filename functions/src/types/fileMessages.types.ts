/**
 * File Messages Types
 * 
 * Per-file processing warnings/errors from AI extraction.
 * Spec: menu-image-processing-job-queue-spec.md Section 8.14
 */

export type FileMessageStatus = "error" | "warning";

export type FileMessageType =
    // File-level issues
    | "image_unreadable"   // Entire image too blurry/corrupted
    | "no_menu_content"    // Image doesn't contain menu data
    | "image_partial"      // Part of image cut off or unclear
    | "low_quality"        // Low quality but extracted
    // Content-level issues
    | "items_omitted"      // Some items couldn't be extracted
    | "category_unclear"   // Category name unclear
    | "values_omitted"     // Specific values (price, desc) omitted
    // Quality warnings
    | "ocr_uncertain"      // Possible OCR errors
    | "verify_required";   // Manual verification recommended

export interface OmittedItemDetail {
    position?: string;     // "row 3", "bottom-left section"
    partialName?: string;  // What AI could read: "Spring R***"
    reason: string;        // "name unclear", "price smudged"
}

export interface AffectedFieldDetail {
    itemId?: number;       // If item was extracted but field missing
    itemName?: string;     // For reference: "Butter Chicken"
    field: string;         // "price" | "description" | "attributes"
    reason: string;        // "text faded", "overlapping text"
}

export interface FileMessageDetails {
    omittedItems?: OmittedItemDetail[];
    affectedFields?: AffectedFieldDetail[];
    omittedCount?: number;     // Quick count: "3 items omitted"
    extractedCount?: number;   // "8 of 11 items extracted"
}

export interface FileMessage {
    sourceFileIndex: number;
    status: FileMessageStatus;
    type: FileMessageType;
    message: string;           // Human-readable summary
    details?: FileMessageDetails;
}
