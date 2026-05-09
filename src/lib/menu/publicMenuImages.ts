import type { UserUploadedFileType } from '@type/common';

export type PublicMenuImage = UserUploadedFileType & {
    url: string;
};

const IMAGE_URL_KEYS = ['url', 'src', 'imageUrl', 'downloadURL', 'uploadedUrl'] as const;

function normalizeImageEntry(entry: unknown): PublicMenuImage | null {
    if (!entry) return null;

    if (typeof entry === 'string') {
        const url = entry.trim();
        return url ? { url } : null;
    }

    if (typeof entry !== 'object') return null;

    const record = entry as Record<string, unknown>;
    const url = IMAGE_URL_KEYS
        .map((key) => record[key])
        .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
        ?.trim();

    if (!url) return null;

    return {
        ...(entry as UserUploadedFileType),
        url,
    };
}

export function normalizePublicMenuImages(images: unknown): PublicMenuImage[] {
    const entries = Array.isArray(images)
        ? images
        : images && typeof images === 'object'
            ? normalizeImageEntry(images)
                ? [images]
                : Object.values(images as Record<string, unknown>)
            : images
                ? [images]
                : [];

    return entries
        .map(normalizeImageEntry)
        .filter((image): image is PublicMenuImage => Boolean(image));
}

export function getPrimaryPublicMenuImage(item: { images?: unknown } | null | undefined): string | undefined {
    return normalizePublicMenuImages(item?.images)[0]?.url;
}
