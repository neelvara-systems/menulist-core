/**
 * Gemini Prompts Registry
 * Central export point for all AI prompts with version management
 */

import { GeminiPrompt } from './types';
import { CAMPAIGN_CAPTION_PROMPT_V1 } from './v1/campaignCaption.prompt';
import { FEEDBACK_ANALYSIS_PROMPT_V1 } from './v1/feedbackAnalysis.prompt';
import { KB_QUALITY_PROMPT_V1 } from './v1/kbQuality.prompt';
import { WEEKLY_NARRATIVE_PROMPT_V1 } from './v1/weeklyNarrative.prompt';

// ================================================================
// PROMPT REGISTRY
// ================================================================

export const PROMPTS = {
  feedbackAnalysis: FEEDBACK_ANALYSIS_PROMPT_V1,
  weeklyNarrative: WEEKLY_NARRATIVE_PROMPT_V1,
  kbQuality: KB_QUALITY_PROMPT_V1,
  campaignCaption: CAMPAIGN_CAPTION_PROMPT_V1,
  // Add new prompts here as they're created
} as const;

export type PromptType = keyof typeof PROMPTS;

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Get a prompt by type
 * Future: Add version parameter for A/B testing
 */
export function getPrompt(type: PromptType): GeminiPrompt {
  return PROMPTS[type];
}

/**
 * Get all available prompt types
 */
export function getAvailablePrompts(): PromptType[] {
  return Object.keys(PROMPTS) as PromptType[];
}

/**
 * Get prompt version info
 */
export function getPromptVersion(type: PromptType): string {
  return PROMPTS[type].version.version;
}

// ================================================================
// EXPORTS
// ================================================================

export * from './types';
export { CAMPAIGN_CAPTION_PROMPT_V1 } from './v1/campaignCaption.prompt';
export { FEEDBACK_ANALYSIS_PROMPT_V1 } from './v1/feedbackAnalysis.prompt';
export { KB_QUALITY_PROMPT_V1 } from './v1/kbQuality.prompt';
export { WEEKLY_NARRATIVE_PROMPT_V1 } from './v1/weeklyNarrative.prompt';

