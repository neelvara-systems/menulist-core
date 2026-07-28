/**
 * AI Service Constants
 * 
 * Centralized configuration for AI operations including:
 * - Model settings
 * - Generation config
 * - Safety settings
 * - Rate limiting
 * - Circuit breaker config
 */

import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { DB_COLLECTIONS } from "./database";
import { ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG } from "../sharedData/answerlatticeEmbedding";
import { GEMINI_STABLE_MODELS } from '../sharedData/geminiRuntime';

// ═══════════════════════════════════════════════════════════════
// MODEL CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const AI_MODEL = GEMINI_STABLE_MODELS.TEXT_HIGH_THROUGHPUT;
export const OWNER_ANALYTICS_AI_MODEL = GEMINI_STABLE_MODELS.TEXT_HIGH_THROUGHPUT;
export const AI_ADVANCED_MODEL = GEMINI_STABLE_MODELS.TEXT_COMPLEX;
export const ANSWERLATTICE_TEXT_MODEL = GEMINI_STABLE_MODELS.TEXT_HIGH_THROUGHPUT;
export const ANSWERLATTICE_EMBEDDING_MODEL = ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.model;
export const ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY =
    ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.outputDimensionality;
export const ANSWERLATTICE_EMBEDDING_CACHE_VERSION = ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.cacheVersion;
export const ANSWERLATTICE_EMBEDDING_VECTOR_FIELD = ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.vectorField;
// Maps grounding stays flag-off until provider smoke confirms this pinned GenAI path.
export const MAPS_PLACE_CHECK_MODEL = GEMINI_STABLE_MODELS.TEXT_BALANCED;

/**
 * Extraction prompt version — increment when parallelProcessingPrompt.ts changes
 * Stored in job metadata for debugging extraction quality regressions
 */
export const EXTRACTION_PROMPT_VERSION = "parallel_v5";

export const GENERATION_CONFIG = {
    temperature: 0.2,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 65536,
    responseMimeType: 'application/json' as const,
};

// ═══════════════════════════════════════════════════════════════
// SAFETY SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Safety settings - CRITICAL for food menus
 * 
 * Cocktail names like "Sex on the Beach", "Liquid Cocaine" or descriptions like 
 * "Killer Wings", "Death by Chocolate" can trigger safety filters and return zero data
 */
export const SAFETY_SETTINGS = [
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE
    },
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE
    }
];

// ═══════════════════════════════════════════════════════════════
// BATCH PROCESSING
// ═══════════════════════════════════════════════════════════════

export const MAX_IMAGES_PER_BATCH = 10;
export const BASE_DELAY_BETWEEN_BATCHES_MS = 1000;
export const MAX_DELAY_BETWEEN_BATCHES_MS = 8000;

// ═══════════════════════════════════════════════════════════════
// COST TRACKING (MUST match @constant/common in frontend)
// ═══════════════════════════════════════════════════════════════

export const TOKENS_PER_CREDIT = 500;
export const CHARGE_PER_CREDIT = 100; // paise

// ═══════════════════════════════════════════════════════════════
// FIRESTORE COLLECTIONS
// ═══════════════════════════════════════════════════════════════

export const AI_OPERATIONS_COLLECTION = DB_COLLECTIONS.MENULIST_AI_EXTRACTION_OPERATIONS;

// ═══════════════════════════════════════════════════════════════
// CIRCUIT BREAKER CONFIG
// ═══════════════════════════════════════════════════════════════

/**
 * Circuit breaker configuration for Gemini AI calls
 * 
 * - failureThreshold: Opens after 5 consecutive failures
 * - resetTimeout: Waits 30 seconds before attempting recovery
 * - halfOpenRequests: Tests with 3 requests in half-open state
 */
export const CIRCUIT_BREAKER_CONFIG = {
    name: 'gemini-ai',
    failureThreshold: 5,
    resetTimeout: 30000,
    halfOpenRequests: 3,
};
