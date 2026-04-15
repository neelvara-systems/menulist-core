/**
 * AI Models Configuration (Google Gemini Only)
 * ════════════════════════════════════════════════════════════════
 * 
 * Centralized configuration for all AI models used across the application.
 * Based on benchmarks and real-world testing (Nov 2025):
 * 
 * 🔬 Key Findings:
 * - Gemini 2.0 Flash: BEST for OCR/data extraction (98-99% accuracy)
 * - Gemini 2.0 Flash: BEST for translation (more idiomatic)
 * - Gemini 2.5 Flash: Good for creative text generation
 * - Gemini 2.5 Pro: Best for complex reasoning tasks
 * 
 * Sources:
 * - Reddit r/LocalLLaMA: "Gemini 2.0-flash was better than 2.5-PRO for OCR"
 * - Reddit r/GeminiAI: "2.0 models seem consistently superior for OCR"
 * - Google AI Forum: "2.0 is much better for OCR tasks"
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
    FLASH_2_0: 'gemini-2.0-flash',           // Best for OCR, translation, accuracy
    FLASH_2_5: 'gemini-2.5-flash',           // Good for creative tasks, conversations
    PRO_2_5: 'gemini-2.5-pro',               // Best for complex reasoning

    // Image Generation Models
    FLASH_IMAGE_GEN: 'gemini-2.5-flash-image',
    IMAGEN_3: 'imagen-3.0-generate-002',

    // Embedding Model
    TEXT_EMBEDDING: 'text-embedding-004',

    // Legacy (not recommended)
    FLASH_1_5: 'gemini-1.5-flash',
    PRO_1_5: 'gemini-1.5-pro',
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
        model: GEMINI_MODELS.FLASH_2_5,
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
     * Model: Gemini 2.0 Flash
     * Why: More idiomatic, native-like translations
     *      Better terminology, word order, and style
     * 
     * Config: Moderate temperature for natural language
     */
    TRANSLATION: {
        model: GEMINI_MODELS.FLASH_2_0,
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
        model: GEMINI_MODELS.FLASH_2_5,
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
     * Model: Gemini 2.0 Flash
     * Why: Structured data extraction benefits from 2.0's accuracy
     * 
     * Config: Moderate temperature for balanced output
     */
    NEW_ITEM_METADATA: {
        model: GEMINI_MODELS.FLASH_2_0,
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
     * Model: gemini-2.5-flash-image
     * Why: Supports reference images for editing/variations
     * 
     * Config: High temperature for creative variety
     */
    IMAGE_GENERATION: {
        model: GEMINI_MODELS.FLASH_IMAGE_GEN,
        config: {
            temperature: 1.0,
        },
        description: 'AI-generated food/menu images with Gemini',
    },

    /**
     * 🎨 Image Generation (Imagen 3)
     * 
     * Model: imagen-3.0-generate-002
     * Why: Highest quality photorealistic images
     *      Built-in safety filters
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
        model: GEMINI_MODELS.FLASH_2_5,
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
     * Model: Gemini 2.5 Pro
     * Why: Complex reasoning for understanding images + generating queries
     */
    IMAGE_TO_QUERY: {
        model: GEMINI_MODELS.PRO_2_5,
        config: {
            temperature: 0.3,
        },
        description: 'Generate search queries from images',
    },

    /**
     * 📊 Text Embeddings
     * 
     * Model: text-embedding-004
     * Why: Google's latest embedding model for semantic search
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
