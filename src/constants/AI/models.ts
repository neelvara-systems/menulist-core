/**
 * AI Models Configuration (Google Gemini Only)
 * ════════════════════════════════════════════════════════════════
 * 
 * Centralized configuration for all AI models used across the application.
 * Production rule:
 * - Do not use preview, experimental, or latest aliases in production.
 * - Do not use shut-down model families such as Gemini 2.0 Flash.
 * - Keep default upgrades deliberate; model changes affect cost, parsing, and output shape.
 * 
 * Usage:
 * import { AI_MODELS } from '@constant/AI/models';
 * const { model, config } = AI_MODELS.IMAGE_PROCESSING;
 */

// ═══════════════════════════════════════════════════════════════
// GOOGLE GEMINI MODELS
// ═══════════════════════════════════════════════════════════════

export const GEMINI_MODELS = {
    // Text Generation Models
    TEXT_GEN: 'gemini-2.5-flash',
    TEXT_FAST: 'gemini-2.5-flash-lite',
    TEXT_PRO: 'gemini-2.5-pro',
    TEXT_FRONTIER_STABLE: 'gemini-3.5-flash',
    TEXT_FRONTIER_FAST_STABLE: 'gemini-3.1-flash-lite',

    // Image Generation Models
    IMAGE_GEN: 'gemini-2.5-flash-image',
    IMAGE_FRONTIER_STABLE: 'gemini-3.1-flash-image',
    // Legacy generateImages() branch. The active image routes default to IMAGE_GEN.
    IMAGEN_3: 'imagen-3.0-generate-002',

    // Embedding Model
    TEXT_EMBEDDING: 'gemini-embedding-001',
    MULTIMODAL_EMBEDDING: 'gemini-embedding-2',
} as const;

// ═══════════════════════════════════════════════════════════════
// OPERATION-WISE AI MODEL CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * AI Models mapped to specific operations
 * Each operation has its recommended model and optimized config
 * 
 * Temperature Guide:
 * - 0.0-0.3: Factual, deterministic (OCR, extraction, QnA)
 * - 0.3-0.7: Balanced (translation, metadata)
 * - 0.7-1.0: Creative (descriptions, suggestions)
 */
export const AI_MODELS = {
    /**
     * 🖼️ Image/Menu Data Extraction (OCR)
     * 
     * Model: Gemini 2.5 Flash
     * Why: Production-optimized for parallel processing with batch support
     *      Better price-performance for high-volume tasks
     *      Supports up to 65,536 output tokens
     * 
     * Config: Low temperature for accuracy, JSON output
     */
    IMAGE_PROCESSING: {
        model: GEMINI_MODELS.TEXT_GEN,
        config: {
            temperature: 0.2,      // Low for accuracy (was 1.0)
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 65536, // Increased for large menus
            responseMimeType: 'application/json',
        },
        description: 'Menu image OCR and data extraction',
    },

    /**
     * 🌐 Translation
     *
     * Model: Gemini 2.5 Flash
     * Why: Stable production model. Gemini 2.0 Flash is shut down and must not
     *      be used in production paths.
     *
     * Config: Moderate temperature for natural language
     */
    TRANSLATION: {
        model: GEMINI_MODELS.TEXT_GEN,
        config: {
            temperature: 0.3,      // Low-moderate for faithful translation
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
        },
        description: 'Menu item translation to multiple languages',
    },

    /**
     * ✍️ Description Generation
     * 
     * Model: Gemini 2.5 Flash
     * Why: Creative tasks benefit from 2.5's improved language capabilities
     * 
     * Config: Higher temperature for creative, engaging descriptions
     */
    DESCRIPTION_GENERATION: {
        model: GEMINI_MODELS.TEXT_GEN,
        config: {
            temperature: 0.8,      // High for creativity
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
        },
        description: 'AI-generated menu item descriptions',
    },

    /**
     * 📝 New Item Metadata Generation
     *
     * Model: Gemini 2.5 Flash
     * Why: Stable production model for structured JSON output.
     *
     * Config: Moderate temperature for balanced output
     */
    NEW_ITEM_METADATA: {
        model: GEMINI_MODELS.TEXT_GEN,
        config: {
            temperature: 0.5,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
        },
        description: 'Generate metadata for new menu items',
    },

    /**
     * 🎨 Image Generation (Gemini Flash)
     * 
     * Why: Supports reference images for editing/variations
     * 
     * Config: High temperature for creative variety
     */
    IMAGE_GENERATION: {
        model: GEMINI_MODELS.IMAGE_GEN,
        config: {
            temperature: 1.0,
        },
        description: 'AI-generated food/menu images with Gemini',
    },

    /**
     * 🎨 Image Generation (legacy Imagen 3 branch)
     *
     * Model: imagen-3.0-generate-002
     * Why: Preserved for the dormant generateImages() branch. Do not make this
     *      the production default without a provider-specific migration and
     *      current model/deprecation check.
     */
    IMAGEN: {
        model: GEMINI_MODELS.IMAGEN_3,
        config: {
            aspectRatio: '1:1',
            numberOfImages: 1,
        },
        description: 'High-quality image generation with Imagen 3',
    },

    /**
     * 💬 Chat / QnA (Knowledge Base)
     * 
     * Model: Gemini 2.5 Flash
     * Why: Better conversational capabilities
     * 
     * Config: Zero temperature for factual grounding
     */
    CHAT: {
        model: GEMINI_MODELS.TEXT_GEN,
        config: {
            temperature: 0.0,      // Zero for factual QnA
            topP: 0.9,
            topK: 40,
            responseMimeType: 'application/json',
        },
        description: 'Conversational AI and knowledge base QnA',
    },

    /**
     * 🔍 Image to Text Query (Vision)
     * 
     * Model: Gemini 3 Flash
     * Why: Complex reasoning for understanding images + generating queries
     */
    IMAGE_TO_QUERY: {
        model: GEMINI_MODELS.TEXT_GEN,
        config: {
            temperature: 0.3,
        },
        description: 'Generate search queries from images',
    },

    /**
     * 📊 Text Embeddings
     *
     * Model: gemini-embedding-001
     * Why: Existing Answerlattice/help-center vector indexes use this text-only
     *      embedding space. Migrating to Gemini Embedding 2 requires a full
     *      re-embedding plan, not a string-only change.
     */
    EMBEDDINGS: {
        model: GEMINI_MODELS.TEXT_EMBEDDING,
        config: {},
        description: 'Vector embeddings for semantic search',
    },
} as const;

// ═══════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════

export type GeminiModelType = typeof GEMINI_MODELS[keyof typeof GEMINI_MODELS];
export type AIOperationType = keyof typeof AI_MODELS;

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get model configuration for a specific operation
 */
export function getModelConfig(operation: AIOperationType) {
    return AI_MODELS[operation];
}

/**
 * Get just the model name for an operation
 */
export function getModelName(operation: AIOperationType): string {
    return AI_MODELS[operation].model;
}
