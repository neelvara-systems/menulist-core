/**
 * Extraction Library - Client-Side
 * 
 * Spec Reference: ai-extraction-integration.md
 * 
 * Public API for client-side extraction comparison and application.
 */

// Core comparison engine
export { runComparisonEngine, updateApplyPlan } from './comparisonEngine';
export type {
    ApplyPlan, ComparisonEngineInput,
    ComparisonEngineOutput,
    ComparisonMode, ComparisonStats,
    ExistingCategory,
    ExistingItem,
    ExtractedCategoryInput,
    ExtractedItemInput, PreviewCategoryRow, PreviewIgnoredRow, PreviewItemRow,
    PreviewWarningRow
} from './comparisonEngine.types';

// Apply changes
export { applyExtractionChanges, discardExtractionChanges } from './applyChanges';
export type { ApplyChangesParams, ApplyChangesResult } from './applyChanges';

// Utilities
export { getNormalizedNameFromObject, normalizeName } from './normalize';
export { findBestMatch, isExactMatch, MATCH_THRESHOLDS, similarity } from './similarity';
export { isValidCategoryName, isValidItemName, isValidPrice, validateExtractedCategory, validateExtractedItem } from './validation';

// Redistribute (ported from server)
export {
    buildExistingCategoriesMap, generateLocalCategoryId, generateLocalItemId, processParallelResponse, redistributeExtractedData,
    transformIdsForFile
} from './redistribute';
export type {
    CombinedAIResponse, ExtractedData,
    ExtractedDataCategory,
    ExtractedDataItem, FileMapping
} from './redistribute';

// Zod validation schemas
export {
    CategoryOverrideSchema, ItemOverrideSchema, NewCategorySchema, NewItemSchema, SaveExtractionReviewSchema, validateItemOverride, validateNewCategory, validateNewItem, validateSaveExtractionReview
} from './schemas';
export type {
    ApplyItemOverrideInput, CategoryOverride, ItemOverride, NewCategory, NewItem, SaveExtractionReviewInput
} from './schemas';

