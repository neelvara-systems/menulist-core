import {
    normalizeOBPExternalHttpsUrl,
    normalizeOBPSocialUrl,
    type OBPSocialPlatform,
} from '@lib/obp/publicLinks';

const OWNER_SOCIAL_PLATFORM_KEY_MAX_LENGTH = 64;
const KNOWN_SOCIAL_PLATFORMS = new Set<OBPSocialPlatform>([
    'facebook',
    'instagram',
    'linkedin',
    'twitter',
    'youtube',
]);

function normalizeOwnerSocialPlatformKey(value: unknown): string {
    const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (
        !key
        || key === 'whatsapp'
        || key.length > OWNER_SOCIAL_PLATFORM_KEY_MAX_LENGTH
        || /[\u0000-\u001f\u007f]/.test(key)
    ) {
        return '';
    }
    return key;
}

export function normalizeOwnerSocialMediaLink(platformKey: unknown, value: unknown): string | null {
    const key = normalizeOwnerSocialPlatformKey(platformKey);
    const rawValue = typeof value === 'string' ? value.trim() : '';
    if (!key || !rawValue) return null;

    return KNOWN_SOCIAL_PLATFORMS.has(key as OBPSocialPlatform)
        ? normalizeOBPSocialUrl(key as OBPSocialPlatform, rawValue)
        : normalizeOBPExternalHttpsUrl(rawValue);
}

export function normalizeOwnerSocialMediaLinks(
    source: Record<string, string> | null | undefined,
): {
    invalidKeys: string[];
    socialMedia: Record<string, string>;
} {
    const invalidKeys: string[] = [];
    const socialMedia: Record<string, string> = {};

    Object.entries(source || {}).forEach(([rawKey, rawValue]) => {
        const key = normalizeOwnerSocialPlatformKey(rawKey);
        const value = typeof rawValue === 'string' ? rawValue.trim() : '';

        if (!value) return;
        if (!key || Object.prototype.hasOwnProperty.call(socialMedia, key)) {
            invalidKeys.push(rawKey);
            return;
        }

        const normalizedValue = normalizeOwnerSocialMediaLink(key, value);
        if (!normalizedValue) {
            invalidKeys.push(key);
            return;
        }

        socialMedia[key] = normalizedValue;
    });

    return { invalidKeys, socialMedia };
}
