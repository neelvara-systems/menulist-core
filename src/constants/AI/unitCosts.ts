import { AI_ACTIONS_TYPES } from "@constant/common";
import { CONTENT_CREDIT_OPERATION_COSTS } from "@data/shared/contentCreditPolicy";

// ═══════════════════════════════════════════════════════════════
// USD → INR CONVERSION (update periodically)
// ═══════════════════════════════════════════════════════════════
export const USD_TO_INR = 94.87; // As of May 2026, update periodically for internal margin tracking.

// ═══════════════════════════════════════════════════════════════
// REAL GOOGLE COST PER OPERATION (in USD)
// Source: https://ai.google.dev/gemini-api/docs/pricing (May 2026)
//
// Gemini 2.5 Flash:  Input $0.30/1M tokens, Output $2.50/1M tokens
// Gemini 2.5 Flash Image: $0.039/image (1290 output tokens)
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
    [AI_ACTIONS_TYPES.CAMPAIGN_CAPTION]: 0.0008, // Tiny caption generation
    [AI_ACTIONS_TYPES.MENU_CARD_EXPORT_DESIGN_ADVISOR]: 0.0012, // Bounded print-layout recommendation JSON
    [AI_ACTIONS_TYPES.MENU_INTAKE_IDENTITY]: 0.0020, // Upload preflight identity/readability check
    [AI_ACTIONS_TYPES.PUBLIC_MENU_EXTRACTION]: 0.0080, // Public draft extraction
    [AI_ACTIONS_TYPES.WEEKLY_NARRATIVE]: 0.0016, // Analytics summary narrative
    [AI_ACTIONS_TYPES.OWNER_BUSINESS_ASSISTANT_ANSWER]: 0.0016, // Grounded owner answer over cached packet
    [AI_ACTIONS_TYPES.AI_MENU_MANAGER_PLANNER]: 0.0006, // Unresolved AMM intent over capped selected-menu context
    [AI_ACTIONS_TYPES.HELP_CENTER_SEARCH]: 0.0016, // Support answer generation
    [AI_ACTIONS_TYPES.HELP_CENTER_EMBEDDING]: 0.0002, // Article/query embedding
    [AI_ACTIONS_TYPES.ANSWERLATTICE_TRANSLATION]: 0.0020, // KB article translation
    [AI_ACTIONS_TYPES.ANSWERLATTICE_FAQ_GENERATION]: 0.0012, // Article-backed FAQ suggestion generation
    [AI_ACTIONS_TYPES.ANSWERLATTICE_WIDGET_SEARCH]: 0.0016, // Public widget answer generation and supporting provider steps
    [AI_ACTIONS_TYPES.ANSWERLATTICE_SUPPORT_SEARCH]: 0.0016, // Provider-backed Answerlattice help/widget fallback
    [AI_ACTIONS_TYPES.ANSWERLATTICE_KB_EMBEDDING]: 0.0002, // Answerlattice KB article/query embedding
    [AI_ACTIONS_TYPES.ANSWERLATTICE_DRAFT_GENERATION]: 0.0016, // Canonical answer draft generation from support signals
    [AI_ACTIONS_TYPES.ANSWERLATTICE_TICKET_KNOWLEDGE_EXTRACTION]: 0.0016, // Resolved ticket cluster extraction
    [AI_ACTIONS_TYPES.ANSWERLATTICE_ONBOARDING_BOOTSTRAP]: 0.0016, // Entity/draft bootstrap provider calls
    [AI_ACTIONS_TYPES.ANSWERLATTICE_ENTITY_EXTRACTION]: 0.0016, // Article save ontology/entity extraction
    [AI_ACTIONS_TYPES.ANSWERLATTICE_FRICTION_INSIGHT]: 0.0016, // Weekly friction insight generation
    [AI_ACTIONS_TYPES.ANSWERLATTICE_ANSWER_TEST]: 0.0016, // Owner-triggered full-runtime support answer test
    [AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_OCR]: 0.0025, // Screenshot/UI OCR for source intake
    [AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_TRANSCRIPTION]: 0.0060, // Short audio/video transcription for source intake
    [AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_EMBEDDING]: 0.0002, // Intake-published article embedding

    // Paid operations
    [AI_ACTIONS_TYPES.REVIEW_REPLY_SUGGESTION]: 0.0008, // Owner-requested review reply draft
    [AI_ACTIONS_TYPES.REWRITE_DESCRIPTION]: 0.0016, // ~1K input + ~500 output tokens
    [AI_ACTIONS_TYPES.IMAGE_GENERATION]: 0.0400, // Gemini 2.5 Flash Image: approx $0.039/image
    [AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION]: 0.0400, // Per image
    [AI_ACTIONS_TYPES.LANGUAGE_ADDITION]: 0.0044, // ~2K input + ~1.5K output tokens
    [AI_ACTIONS_TYPES.ITEM_TRANSLATION]: 0.0004, // ~200 input + ~150 output tokens
    [AI_ACTIONS_TYPES.IMAGE_TRANSLATION]: 0.0450, // OCR + translation + regen
    [AI_ACTIONS_TYPES.IMAGE_EDITING]: 0.0400, // Same as image generation
};

// ═══════════════════════════════════════════════════════════════
// CONTENT CREDIT COSTS
//
// Calibrated so: 250 units ≈ enough for a typical store's first
// month of active AI usage (descriptions + 20 images + 3 languages)
//
// 1 unit ≈ ₹12 at ₹2,999 per 250-unit pack
//
// Eligible owner-operation rates are public so credit packs and referral
// rewards have concrete meaning. Provider cost, margin, and overdraft remain
// internal and must never be exposed.
// @see __docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md
// ═══════════════════════════════════════════════════════════════
export const AI_UNIT_COSTS: Record<string, number> = {
    // Free operations (0 units — always pass capacity check)
    // RATIONALE: These are INPUT/SETUP operations that get data into the system.
    // Keeping them platform-absorbed ensures the user's first AI experience is frictionless.
    // Real cost per operation is negligible (₹0.13–₹0.67). Do NOT add quotas.
    [AI_ACTIONS_TYPES.IMAGE_PROCESSING]: 0, // Core extraction — platform absorbed
    [AI_ACTIONS_TYPES.ADD_DESCRIPTION]: 0, // First-pass description — platform absorbed
    [AI_ACTIONS_TYPES.NEW_ITEM_METADATA]: 0, // Structural — platform absorbed
    [AI_ACTIONS_TYPES.SEO_AEO_GENERATION]: 0, // First-pass SEO setup — platform absorbed
    [AI_ACTIONS_TYPES.BUSINESS_COPY_GENERATION]: 0, // First-pass business copy setup — platform absorbed
    [AI_ACTIONS_TYPES.MENU_INTAKE_IDENTITY]: 0, // Upload guardrail — platform absorbed
    [AI_ACTIONS_TYPES.PUBLIC_MENU_EXTRACTION]: 0, // Public lead/intake operation — absorbed by platform
    [AI_ACTIONS_TYPES.WEEKLY_NARRATIVE]: 0, // Internal analytics summary — absorbed by platform
    [AI_ACTIONS_TYPES.OWNER_BUSINESS_ASSISTANT_ANSWER]: 0, // Deterministic/grounded owner assistant answers are absorbed unless later monetized
    [AI_ACTIONS_TYPES.AI_MENU_MANAGER_PLANNER]: 0, // Deterministic-first fallback; provider use is bounded, logged, and platform absorbed
    [AI_ACTIONS_TYPES.HELP_CENTER_SEARCH]: 0, // Support/control-plane operation — not owner pack usage
    [AI_ACTIONS_TYPES.HELP_CENTER_EMBEDDING]: 0, // Support/control-plane operation — not owner pack usage
    [AI_ACTIONS_TYPES.ANSWERLATTICE_TRANSLATION]: 0, // Answerlattice/control-plane operation — not MenuList owner pack usage
    [AI_ACTIONS_TYPES.ANSWERLATTICE_FAQ_GENERATION]: 0, // Answerlattice/control-plane operation — owner-triggered but not MenuList pack usage
    [AI_ACTIONS_TYPES.ANSWERLATTICE_WIDGET_SEARCH]: 0, // Answerlattice public support operation — logged, not charged to support credits
    [AI_ACTIONS_TYPES.ANSWERLATTICE_SUPPORT_SEARCH]: 1, // One provider-backed support fallback request
    [AI_ACTIONS_TYPES.ANSWERLATTICE_KB_EMBEDDING]: 0, // Publishing support infrastructure — logged, not charged separately
    [AI_ACTIONS_TYPES.ANSWERLATTICE_DRAFT_GENERATION]: 0, // Nightly canonical draft support operation — logged for cost visibility
    [AI_ACTIONS_TYPES.ANSWERLATTICE_TICKET_KNOWLEDGE_EXTRACTION]: 0, // Nightly ticket knowledge support operation — logged for cost visibility
    [AI_ACTIONS_TYPES.ANSWERLATTICE_ONBOARDING_BOOTSTRAP]: 0, // Founder onboarding support operation — logged for cost visibility
    [AI_ACTIONS_TYPES.ANSWERLATTICE_ENTITY_EXTRACTION]: 0, // Article save ontology/entity extraction — logged for cost visibility
    [AI_ACTIONS_TYPES.ANSWERLATTICE_FRICTION_INSIGHT]: 0, // Weekly insight support operation — logged for cost visibility
    [AI_ACTIONS_TYPES.ANSWERLATTICE_ANSWER_TEST]: 1, // Owner-triggered full-runtime QA; deterministic-only tests remain free
    [AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_OCR]: 1, // Answerlattice support-credit operation, charged in Answerlattice credit ledger
    [AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_TRANSCRIPTION]: 2, // Answerlattice support-credit operation, charged in Answerlattice credit ledger
    [AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_EMBEDDING]: 0, // Publishing support infrastructure — logged, not charged separately

    // Paid operations (consumes units from monthly credits)
    // These are VALUE-ADD operations that produce premium outputs.
    [AI_ACTIONS_TYPES.CAMPAIGN_CAPTION]: 1, // Tiny owner-requested campaign copy generation
    [AI_ACTIONS_TYPES.MENU_CARD_EXPORT_DESIGN_ADVISOR]: 1, // Pro/Premium print-layout recommendation
    [AI_ACTIONS_TYPES.REVIEW_REPLY_SUGGESTION]: 1, // Owner-requested review reply draft
    [AI_ACTIONS_TYPES.REWRITE_DESCRIPTION]: CONTENT_CREDIT_OPERATION_COSTS.DESCRIPTION_REWRITE,
    [AI_ACTIONS_TYPES.IMAGE_GENERATION]: CONTENT_CREDIT_OPERATION_COSTS.GENERATED_MENU_IMAGE,
    [AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION]: CONTENT_CREDIT_OPERATION_COSTS.GENERATED_MENU_IMAGE,
    [AI_ACTIONS_TYPES.LANGUAGE_ADDITION]: CONTENT_CREDIT_OPERATION_COSTS.LANGUAGE_ADDITION,
    [AI_ACTIONS_TYPES.ITEM_TRANSLATION]: CONTENT_CREDIT_OPERATION_COSTS.ITEM_TRANSLATION,
    [AI_ACTIONS_TYPES.IMAGE_TRANSLATION]: CONTENT_CREDIT_OPERATION_COSTS.IMAGE_TRANSLATION,
    [AI_ACTIONS_TYPES.IMAGE_EDITING]: CONTENT_CREDIT_OPERATION_COSTS.IMAGE_EDIT,
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

const hasOwnCostEntry = (registry: Record<string, number>, actionType: string) =>
    Object.prototype.hasOwnProperty.call(registry, actionType);

export function assertKnownAiAction(actionType: string): void {
    if (!actionType || !hasOwnCostEntry(AI_UNIT_COSTS, actionType)) {
        throw new Error(`AI action "${actionType || 'unknown'}" is missing an explicit unit cost entry.`);
    }

    if (!hasOwnCostEntry(GEMINI_COST_USD, actionType)) {
        throw new Error(`AI action "${actionType}" is missing an explicit real-cost entry.`);
    }
}

/**
 * Check if an AI action is free (0 units)
 */
export function isFreeTierAction(actionType: string): boolean {
    return getUnitCost(actionType) === 0;
}

/**
 * Get unit cost for an AI action
 */
export function getUnitCost(actionType: string): number {
    assertKnownAiAction(actionType);
    return AI_UNIT_COSTS[actionType];
}

/**
 * Get the estimated real Google cost for an operation (in INR paise)
 * Used for internal margin tracking in transaction logs.
 */
export function getRealCostPaise(actionType: string): number {
    assertKnownAiAction(actionType);
    const costUSD = GEMINI_COST_USD[actionType];
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
