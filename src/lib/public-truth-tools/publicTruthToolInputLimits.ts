export const PUBLIC_TRUTH_TOOL_INPUT_LIMITS = Object.freeze({
  businessName: 120,
  cityOrArea: 160,
  longText: 8_000,
  phone: 40,
  shortText: 500,
  url: 2_048,
});

export type PublicTruthToolInputLimit =
  (typeof PUBLIC_TRUTH_TOOL_INPUT_LIMITS)[keyof typeof PUBLIC_TRUTH_TOOL_INPUT_LIMITS];

/**
 * Bounds attacker- or owner-controlled tool input before normalization work.
 * UI maxLength attributes are usability controls; report builders retain this
 * runtime boundary because they are exported and can be called independently.
 */
export function boundPublicTruthToolInput(
  value: string | null | undefined,
  maxLength: PublicTruthToolInputLimit,
): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}
