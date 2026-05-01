import { AI_ACTIONS_TYPES } from "@constant/common";

// ═══════════════════════════════════════════════════════════════
// USD → INR CONVERSION (update periodically)
// ═══════════════════════════════════════════════════════════════
export const USD_TO_INR = 94.87; // As of May 2026, update periodically for internal margin tracking.

// ═══════════════════════════════════════════════════════════════
// REAL GOOGLE COST PER OPERATION (in USD)
// Source: https://ai.google.dev/gemini-api/docs/pricing (May 2026)
//
// Gemini 2.5 Flash:  Input $0.30/1M tokens, Output $2.50/1M tokens
// Gemini 2.0 Flash:  Input $0.30/1M tokens, Output $2.50/1M tokens (approx)
// Gemini 2.5 Flash Image: $0.039/image (1290 output tokens)
// Imagen 3: $0.04/image (standard)
//
// INTERNAL ONLY — never expose to customers.
// ═══════════════════════════════════════════════════════════════
export const GEMINI_COST_USD: Record<string, number> = {
    // Free operations (we absorb the cost)
    [AI_ACTIONS_TYPES.IMAGE_PROCESSING]: 0.0080, // ~5K input + ~3K output tokens (large menu OCR)
    [AI_ACTIONS_TYPES.ADD_DESCRIPTION]: 0.0016, // ~1K input + ~500 output tokens
    [AI_ACTIONS_TYPES.NEW_ITEM_METADATA]: 0.0008, // ~500 input + ~200 output tokens
    [AI_ACTIONS_TYPES.SEO_AEO_GENERATION]: 0.0016, // Store-level metadata generation
    [AI_ACTIONS_TYPES.BUSINESS_COPY_GENERATION]: 0.0020, // Multi-surface store copy generation

    // Paid operations
    [AI_ACTIONS_TYPES.REWRITE_DESCRIPTION]: 0.0016, // ~1K input + ~500 output tokens
    [AI_ACTIONS_TYPES.IMAGE_GENERATION]: 0.0400, // Imagen 3: $0.04/image or Flash Image: $0.039
    [AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION]: 0.0400, // Per image
    [AI_ACTIONS_TYPES.LANGUAGE_ADDITION]: 0.0044, // ~2K input + ~1.5K output tokens
    [AI_ACTIONS_TYPES.ITEM_TRANSLATION]: 0.0004, // ~200 input + ~150 output tokens
    [AI_ACTIONS_TYPES.IMAGE_TRANSLATION]: 0.0450, // OCR + translation + regen
    [AI_ACTIONS_TYPES.IMAGE_EDITING]: 0.0400, // Same as image generation
};

// ═══════════════════════════════════════════════════════════════
// INTERNAL UNIT COSTS (abstract units for capacity tracking)
//
// Calibrated so: 250 units ≈ enough for a typical store's first
// month of active AI usage (descriptions + 20 images + 3 languages)
//
// 1 unit ≈ ₹12 at ₹2,999 per 250-unit pack
//
// NEVER expose these values to customers.
// @see __docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md
// ═══════════════════════════════════════════════════════════════
export const AI_UNIT_COSTS: Record<string, number> = {
    // Free operations (0 units — always pass capacity check)
    // RATIONALE: These are INPUT/SETUP operations that get data into the system.
    // Keeping them free ensures the user's first AI experience is frictionless.
    // Real cost per operation is negligible (₹0.13–₹0.67). Do NOT add quotas.
    [AI_ACTIONS_TYPES.IMAGE_PROCESSING]: 0, // Core extraction — always free
    [AI_ACTIONS_TYPES.ADD_DESCRIPTION]: 0, // First-pass description — free
    [AI_ACTIONS_TYPES.NEW_ITEM_METADATA]: 0, // Structural — free
    [AI_ACTIONS_TYPES.SEO_AEO_GENERATION]: 0, // First-pass SEO setup — free
    [AI_ACTIONS_TYPES.BUSINESS_COPY_GENERATION]: 0, // First-pass business copy setup — free

    // Paid operations (consumes units from monthly credits)
    // These are VALUE-ADD operations that produce premium outputs.
    [AI_ACTIONS_TYPES.REWRITE_DESCRIPTION]: 1, // ₹12 charge vs ₹0.13 cost → ~99x margin
    [AI_ACTIONS_TYPES.IMAGE_GENERATION]: 5, // ₹60 charge vs ₹3.38 cost → ~18x margin
    [AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION]: 5, // Per image in batch
    [AI_ACTIONS_TYPES.LANGUAGE_ADDITION]: 3, // ₹36 charge vs ₹0.37 cost → ~97x margin
    [AI_ACTIONS_TYPES.ITEM_TRANSLATION]: 1, // ₹12 charge vs ₹0.04 cost → ~300x margin
    [AI_ACTIONS_TYPES.IMAGE_TRANSLATION]: 5, // ₹60 charge vs ₹3.80 cost → ~16x margin
    [AI_ACTIONS_TYPES.IMAGE_EDITING]: 5, // Same as image generation
};

/**
 * Overdraft buffer for soft enforcement at launch.
 *
 * Allows users to exceed their exact capacity by this percentage
 * before blocking. Prevents bad first impressions and support friction.
 *
 * Set to 0 for strict enforcement (after real usage data collected).
 * NEVER expose this to customers.
 */
export const OVERDRAFT_BUFFER_PERCENT = 20; // 20% overdraft allowed at launch

/**
 * Check if an AI action is free (0 units)
 */
export function isFreeTierAction(actionType: string): boolean {
    return (AI_UNIT_COSTS[actionType] ?? 0) === 0;
}

/**
 * Get unit cost for an AI action
 */
export function getUnitCost(actionType: string): number {
    return AI_UNIT_COSTS[actionType] ?? 0;
}

/**
 * Get the estimated real Google cost for an operation (in INR paise)
 * Used for internal margin tracking in transaction logs.
 */
export function getRealCostPaise(actionType: string): number {
    const costUSD = GEMINI_COST_USD[actionType] ?? 0;
    return Math.round(costUSD * USD_TO_INR * 100); // Convert to paise
}

/**
 * Get what we charge the customer for an operation (in INR paise)
 * Based on: 1 unit = ₹2999 / 250 = ₹11.996 ≈ ₹12
 */
export const CHARGE_PER_UNIT_PAISE = Math.round((299900 / 250)); // 1199.6 → 1200 paise = ₹12

export function getOurChargePaise(actionType: string): number {
    return getUnitCost(actionType) * CHARGE_PER_UNIT_PAISE;
}
