export const DEFAULT_PUBLIC_PREVIEW_IMAGE = '/images/default-menu-preview.png';

export interface PublicSharePreviewInput {
    businessName?: unknown;
    canonicalUrl?: string;
    keywords?: string[] | string;
    logoUrl?: string;
    menuUrl: string;
    metaDescription?: unknown;
    metaTitle?: unknown;
    tagline?: unknown;
}

export interface PublicSharePreviewMeta {
    description: string;
    imageUrl: string;
    keywords: string[];
    siteName: string;
    title: string;
    url: string;
}

function readStringValues(value: object): string[] {
    try {
        return Object.keys(value)
            .slice(0, 64)
            .flatMap((key) => {
                try {
                    const entry = Reflect.get(value, key);
                    return typeof entry === 'string' ? [entry] : [];
                } catch {
                    return [];
                }
            });
    } catch {
        return [];
    }
}

export function normalizeMetaText(value: unknown, fallback = ''): string {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || fallback;
    }

    if (value && typeof value === 'object') {
        const candidates = readStringValues(value)
            .map((entry) => entry.trim())
            .filter(Boolean);

        if (candidates.length > 0) {
            return candidates[0];
        }
    }

    return fallback;
}

export function normalizeSeoKeywords(keywords?: string[] | string): string[] {
    let values: unknown[];
    try {
        values = Array.isArray(keywords)
            ? Array.from(keywords)
            : typeof keywords === 'string' ? keywords.split(',') : [];
    } catch {
        return [];
    }

    return values
        .flatMap((item) => typeof item === 'string' ? [item.trim()] : [])
        .filter(Boolean);
}

export function buildPublicSharePreviewMeta({
    businessName,
    canonicalUrl,
    keywords,
    logoUrl,
    menuUrl,
    metaDescription,
    metaTitle,
    tagline,
}: PublicSharePreviewInput): PublicSharePreviewMeta {
    const siteName = normalizeMetaText(businessName, 'Business');
    const title = normalizeMetaText(metaTitle) || `${siteName} | Menu`;
    const description = normalizeMetaText(metaDescription)
        || normalizeMetaText(tagline)
        || `View the menu for ${siteName}`;

    return {
        description,
        imageUrl: logoUrl || DEFAULT_PUBLIC_PREVIEW_IMAGE,
        keywords: normalizeSeoKeywords(keywords),
        siteName,
        title,
        url: canonicalUrl || menuUrl,
    };
}
