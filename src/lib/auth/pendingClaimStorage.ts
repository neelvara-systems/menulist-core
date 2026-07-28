import { normalizeAuthClaimToken } from "./claimTokenBoundary";

export const PENDING_CLAIM_TOKEN_STORAGE_KEY = "pendingClaimToken";

export const writePendingClaimToken = (
  storage: Pick<Storage, "setItem">,
  value: unknown,
): boolean => {
  const token = normalizeAuthClaimToken(value);
  if (!token) return false;

  try {
    storage.setItem(PENDING_CLAIM_TOKEN_STORAGE_KEY, token);
    return true;
  } catch {
    return false;
  }
};

export const readPendingClaimToken = (
  storage: Pick<Storage, "getItem" | "removeItem">,
): string | null => {
  try {
    const token = normalizeAuthClaimToken(
      storage.getItem(PENDING_CLAIM_TOKEN_STORAGE_KEY),
    );
    if (token) return token;
    storage.removeItem(PENDING_CLAIM_TOKEN_STORAGE_KEY);
  } catch {
    // Browser storage is an optional handoff mechanism.
  }
  return null;
};

export const clearPendingClaimToken = (
  storage: Pick<Storage, "removeItem">,
): void => {
  try {
    storage.removeItem(PENDING_CLAIM_TOKEN_STORAGE_KEY);
  } catch {
    // The server still enforces expiry and one-time claim consumption.
  }
};
