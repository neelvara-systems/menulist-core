const normalizePersistedMediaUrl = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || normalized.startsWith('data:')) return null;
    return normalized;
};

export const collectAnswerlatticeChatImageUrls = (value: unknown): string[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const messages = (value as { messages?: unknown }).messages;
    if (!Array.isArray(messages)) return [];

    const urls = new Set<string>();
    messages.forEach((message) => {
        if (!message || typeof message !== 'object' || Array.isArray(message)) return;
        const image = (message as { image?: unknown }).image;
        if (!image || typeof image !== 'object' || Array.isArray(image)) return;
        const source = image as { source?: unknown; url?: unknown };
        [source.url, source.source].forEach((candidate) => {
            const normalized = normalizePersistedMediaUrl(candidate);
            if (normalized) urls.add(normalized);
        });
    });
    return Array.from(urls);
};

export const filterUnreferencedAnswerlatticeChatImageUrls = (
    candidates: readonly unknown[],
    retainedValue: unknown,
): string[] => {
    const retained = new Set(collectAnswerlatticeChatImageUrls(retainedValue));
    const removable = new Set<string>();
    candidates.forEach((candidate) => {
        const normalized = normalizePersistedMediaUrl(candidate);
        if (normalized && !retained.has(normalized)) removable.add(normalized);
    });
    return Array.from(removable);
};

export const isAnswerlatticeChatImageStoragePath = (
    path: unknown,
    scope: { tId: number | string; sId: number | string },
    collection = 'chatSessions',
): boolean => {
    const parsed = typeof path === 'string' ? parseStoragePath(path) : null;
    return Boolean(
        parsed
        && parsed.collection === collection
        && parsed.fileType === 'chatimages'
        && parsed.tId === String(scope.tId)
        && parsed.sId === String(scope.sId)
    );
};
import { parseStoragePath } from '@lib/storage/pathGenerator';
