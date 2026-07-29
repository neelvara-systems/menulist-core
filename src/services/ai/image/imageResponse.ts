import { MEDIA_ACCEPTED_IMAGE_MIME_TYPES } from '@lib/media/imageProfiles';

export type AiImageResponseItem = {
    base64: string;
    mimeType: string;
};

const AI_IMAGE_MIME_TYPES = new Set<string>(MEDIA_ACCEPTED_IMAGE_MIME_TYPES);

export const normalizeAiImageResponseItems = (value: unknown): AiImageResponseItem[] | null => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) return null;

    const normalized: AiImageResponseItem[] = [];
    for (const item of value) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        const record = item as Record<string, unknown>;
        if (
            typeof record.base64 !== 'string'
            || record.base64.length === 0
            || typeof record.mimeType !== 'string'
            || !AI_IMAGE_MIME_TYPES.has(record.mimeType)
        ) {
            return null;
        }
        const dataUrlPrefix = `data:${record.mimeType};base64,`;
        if (record.base64.startsWith('data:') && !record.base64.startsWith(dataUrlPrefix)) {
            return null;
        }
        normalized.push({
            base64: record.base64.startsWith(dataUrlPrefix)
                ? record.base64
                : `${dataUrlPrefix}${record.base64}`,
            mimeType: record.mimeType,
        });
    }
    return normalized;
};
