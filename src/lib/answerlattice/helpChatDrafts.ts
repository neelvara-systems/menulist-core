import { normalizeAnswerlatticeChatSessionId } from '@lib/answerlattice/chatSessionContracts';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';

const ANSWERLATTICE_HELP_CHAT_DRAFT_PREFIX = 'answerlattice-help-chat';
const ANSWERLATTICE_HELP_CHAT_TEXT_DRAFT_PREFIX = `${ANSWERLATTICE_HELP_CHAT_DRAFT_PREFIX}:draft:v2:`;
const ANSWERLATTICE_HELP_CHAT_IMAGE_DRAFT_PREFIX = `${ANSWERLATTICE_HELP_CHAT_DRAFT_PREFIX}:image-draft:v2:`;
const LEGACY_HELP_CHAT_DRAFT_PREFIX = 'chat-draft-';
export const ANSWERLATTICE_HELP_CHAT_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const ANSWERLATTICE_HELP_CHAT_DRAFT_MAX_LENGTH = 2000;

const asRecord = (value: unknown): Record<string, unknown> | null => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null
);

const normalizeConsistentUserId = (sessionOrUser: unknown): string | null => {
    const record = asRecord(sessionOrUser);
    const user = asRecord(record?.user);
    const suppliedIds = [
        record?.uId,
        user?.id,
        user?.uId,
    ].filter((value) => value !== undefined && value !== null);

    if (suppliedIds.length === 0) return null;

    const normalizedIds = suppliedIds.map(normalizeAnswerlatticeChatSessionId);
    const firstId = normalizedIds[0];
    return firstId && normalizedIds.every((value) => value === firstId)
        ? firstId
        : null;
};

export type AnswerlatticeHelpChatDraftKeys = {
    draftKey: string;
    imageDraftKey: string;
};

export const serializeAnswerlatticeHelpChatDraft = (
    text: string,
    savedAt = Date.now(),
): string | null => {
    if (!text.trim() || text.length > ANSWERLATTICE_HELP_CHAT_DRAFT_MAX_LENGTH) return null;
    if (!Number.isSafeInteger(savedAt) || savedAt <= 0) return null;
    return JSON.stringify({ version: 1, text, savedAt });
};

export const parseAnswerlatticeHelpChatDraft = (
    value: string | null | undefined,
    now = Date.now(),
): string | null => {
    if (!value || !Number.isSafeInteger(now) || now <= 0) return null;

    try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        if (
            !parsed
            || typeof parsed !== 'object'
            || Array.isArray(parsed)
            || Object.keys(parsed).some((key) => !['version', 'text', 'savedAt'].includes(key))
            || parsed.version !== 1
            || typeof parsed.text !== 'string'
            || !parsed.text.trim()
            || parsed.text.length > ANSWERLATTICE_HELP_CHAT_DRAFT_MAX_LENGTH
            || !Number.isSafeInteger(parsed.savedAt)
        ) {
            return null;
        }

        const savedAt = parsed.savedAt as number;
        return savedAt > now || now - savedAt > ANSWERLATTICE_HELP_CHAT_DRAFT_MAX_AGE_MS
            ? null
            : parsed.text;
    } catch {
        return null;
    }
};

export const resolveAnswerlatticeHelpChatDraftScope = (sessionOrUser: unknown): string | null => {
    const scope = resolveAnswerlatticeSessionScope(sessionOrUser);
    const userId = normalizeConsistentUserId(sessionOrUser);
    if (!scope || !userId) return null;

    return `${scope.tenantId}:${scope.storeId}:${encodeURIComponent(userId)}`;
};

export const getAnswerlatticeHelpChatDraftKeys = (
    draftScope: string | null | undefined,
    sessionId: string | null | undefined,
): AnswerlatticeHelpChatDraftKeys | null => {
    if (!draftScope) return null;

    const normalizedSessionId = sessionId === null || sessionId === undefined
        ? 'new'
        : normalizeAnswerlatticeChatSessionId(sessionId);
    if (!normalizedSessionId) return null;

    const keySuffix = `${draftScope}:${normalizedSessionId}`;
    return {
        draftKey: `${ANSWERLATTICE_HELP_CHAT_TEXT_DRAFT_PREFIX}${keySuffix}`,
        imageDraftKey: `${ANSWERLATTICE_HELP_CHAT_IMAGE_DRAFT_PREFIX}${keySuffix}`,
    };
};

export const getLegacyHelpChatDraftKeys = (
    sessionId: string | null | undefined,
): AnswerlatticeHelpChatDraftKeys => {
    const keySuffix = sessionId === null || sessionId === undefined
        ? 'new'
        : normalizeAnswerlatticeChatSessionId(sessionId) || 'invalid';
    return {
        draftKey: `chat-draft-${keySuffix}`,
        imageDraftKey: `chat-draft-image-${keySuffix}`,
    };
};

type HelpChatDraftStorage = Pick<Storage, 'key' | 'length' | 'removeItem'>;

export const purgeForeignAnswerlatticeHelpChatDrafts = (
    storage: HelpChatDraftStorage,
    activeDraftScope: string | null | undefined,
): number => {
    const activeTextDraftPrefix = activeDraftScope
        ? `${ANSWERLATTICE_HELP_CHAT_TEXT_DRAFT_PREFIX}${activeDraftScope}:`
        : null;
    let removedCount = 0;

    for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (!key) continue;

        const isLegacyDraft = key.startsWith(LEGACY_HELP_CHAT_DRAFT_PREFIX);
        const isImageDraft = key.startsWith(ANSWERLATTICE_HELP_CHAT_IMAGE_DRAFT_PREFIX);
        const isForeignTextDraft = key.startsWith(ANSWERLATTICE_HELP_CHAT_TEXT_DRAFT_PREFIX)
            && (!activeTextDraftPrefix || !key.startsWith(activeTextDraftPrefix));

        if (isLegacyDraft || isImageDraft || isForeignTextDraft) {
            storage.removeItem(key);
            removedCount += 1;
        }
    }

    return removedCount;
};
