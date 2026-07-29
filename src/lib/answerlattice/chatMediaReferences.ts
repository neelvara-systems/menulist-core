const normalizePersistedMediaUrl = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || normalized.startsWith('data:')) return null;
    return normalized;
};

const safeRead = (value: object, key: string): unknown => {
    try {
        return Reflect.get(value, key);
    } catch {
        return undefined;
    }
};

export const collectAnswerlatticeChatImageUrls = (value: unknown): string[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const messages = safeRead(value, 'messages');
    if (!Array.isArray(messages)) return [];

    const urls = new Set<string>();
    try {
        messages.forEach((message) => {
            if (!message || typeof message !== 'object' || Array.isArray(message)) return;
            const image = safeRead(message, 'image');
            if (!image || typeof image !== 'object' || Array.isArray(image)) return;
            [safeRead(image, 'url'), safeRead(image, 'source')].forEach((candidate) => {
                const normalized = normalizePersistedMediaUrl(candidate);
                if (normalized) urls.add(normalized);
            });
        });
    } catch {
        return [];
    }
    return Array.from(urls);
};

export const filterUnreferencedAnswerlatticeChatImageUrls = (
    candidates: readonly unknown[],
    retainedValue: unknown,
): string[] => {
    const retained = new Set(collectAnswerlatticeChatImageUrls(retainedValue));
    const removable = new Set<string>();
    try {
        candidates.forEach((candidate) => {
            const normalized = normalizePersistedMediaUrl(candidate);
            if (normalized && !retained.has(normalized)) removable.add(normalized);
        });
    } catch {
        return [];
    }
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
