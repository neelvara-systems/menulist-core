import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const AI_MENU_MANAGER_LEGACY_SESSION_ID_PATTERN = /^amm_[a-f0-9]{24}$/;
export const AI_MENU_MANAGER_SESSION_ID_PATTERN = /^amm2_[1-9]\d*_[1-9]\d*_\d{4}-\d{2}-\d{2}_[\s\S]{1,160}$/;
export const AI_MENU_MANAGER_PROPOSAL_ID_PATTERN = /^amm_prop_[a-f0-9]{28}$/;
export const AI_MENU_MANAGER_PROJECT_ID_MAX_LENGTH = 160;

export type AiMenuManagerScopeDocumentId = {
    documentId: string;
    numericId: number;
};

function normalizePatternedFirestoreId(value: unknown, pattern: RegExp): string | null {
    if (typeof value !== 'string') return null;
    const documentId = value;
    if (documentId !== documentId.trim()) return null;
    return pattern.test(documentId) && isValidFirestoreDocumentId(documentId) ? documentId : null;
}

export function normalizeAiMenuManagerSessionId(value: unknown): string | null {
    return normalizePatternedFirestoreId(value, AI_MENU_MANAGER_SESSION_ID_PATTERN)
        || normalizePatternedFirestoreId(value, AI_MENU_MANAGER_LEGACY_SESSION_ID_PATTERN);
}

export function normalizeAiMenuManagerProposalId(value: unknown): string | null {
    return normalizePatternedFirestoreId(value, AI_MENU_MANAGER_PROPOSAL_ID_PATTERN);
}

export function normalizeAiMenuManagerProjectId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const documentId = value;
    if (documentId !== documentId.trim()) return null;
    if (!documentId || documentId.length > AI_MENU_MANAGER_PROJECT_ID_MAX_LENGTH) return null;
    return isValidFirestoreDocumentId(documentId) ? documentId : null;
}

export function normalizeAiMenuManagerScopeDocumentId(value: unknown): AiMenuManagerScopeDocumentId | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;

    const raw = String(value);
    if (raw !== raw.trim() || !isValidFirestoreDocumentId(raw)) return null;

    const numericId = Number(raw);
    if (!Number.isSafeInteger(numericId) || numericId <= 0 || String(numericId) !== raw) return null;

    return { documentId: raw, numericId };
}
