import { isDataUrl } from '@lib/media/mediaStorage';

const PUBLIC_MENU_BACKGROUND_URL_MAX_LENGTH = 4096;
export const PUBLIC_MENU_BACKGROUND_DATA_PREVIEW_MAX_LENGTH = 7 * 1024 * 1024;

export function normalizePublicMenuBackground(
    value: unknown,
    options: { allowDataPreview?: boolean } = {},
): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized) return null;

    if (/[\u0000-\u001f\u007f]/.test(normalized)) {
        return null;
    }

    if (
        options.allowDataPreview
        && normalized.length <= PUBLIC_MENU_BACKGROUND_DATA_PREVIEW_MAX_LENGTH
        && isDataUrl(normalized)
        && /^data:image\//i.test(normalized)
    ) {
        return normalized;
    }

    if (normalized.length > PUBLIC_MENU_BACKGROUND_URL_MAX_LENGTH) {
        return null;
    }

    if (normalized.startsWith('/') && !normalized.startsWith('//')) {
        return /^\/[a-zA-Z0-9._~!$&'()*+,;=:@%/-]*(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@%/?-]*)?$/.test(normalized)
            ? normalized
            : null;
    }

    try {
        const parsed = new URL(normalized);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
        return parsed.toString();
    } catch {
        return null;
    }
}
