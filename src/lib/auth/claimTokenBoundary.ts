export const AUTH_CLAIM_TOKEN_MIN_LENGTH = 20;
export const AUTH_CLAIM_TOKEN_MAX_LENGTH = 256;
export const AUTH_CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

export function normalizeAuthClaimToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim();
  if (token !== value) return null;
  if (token.length < AUTH_CLAIM_TOKEN_MIN_LENGTH || token.length > AUTH_CLAIM_TOKEN_MAX_LENGTH) return null;
  return AUTH_CLAIM_TOKEN_PATTERN.test(token) ? token : null;
}
