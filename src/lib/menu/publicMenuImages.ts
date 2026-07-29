export type PublicMenuImage = {
    variants?: Partial<Record<'thumb' | 'small' | 'medium' | 'large' | 'original', string>>;
    url: string;
};

const IMAGE_URL_KEYS = ['url', 'src', 'imageUrl', 'downloadURL', 'uploadedUrl'] as const;
const IMAGE_VARIANT_KEYS = ['thumb', 'small', 'medium', 'large', 'original'] as const;

const safeRead = (value: object, key: string): unknown => {
    try {
        return Reflect.get(value, key);
    } catch {
        return undefined;
    }
};

const normalizeVariants = (value: unknown): PublicMenuImage['variants'] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

    const variants: NonNullable<PublicMenuImage['variants']> = {};
    for (const key of IMAGE_VARIANT_KEYS) {
        const candidate = safeRead(value, key);
        if (typeof candidate === 'string' && candidate.trim()) {
            variants[key] = candidate.trim();
        }
    }

    return Object.keys(variants).length > 0 ? variants : undefined;
};

function normalizeImageEntry(entry: unknown): PublicMenuImage | null {
    if (!entry) return null;

    if (typeof entry === 'string') {
        const url = entry.trim();
        return url ? { url } : null;
    }

    if (typeof entry !== 'object') return null;

    const url = IMAGE_URL_KEYS
        .map((key) => safeRead(entry, key))
        .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
        ?.trim();

    if (!url) return null;

    const variants = normalizeVariants(safeRead(entry, 'variants'));
    return {
        ...(variants ? { variants } : {}),
        url,
    };
}

export function normalizePublicMenuImages(images: unknown): PublicMenuImage[] {
    if (Array.isArray(images)) {
        return images
            .map(normalizeImageEntry)
            .filter((image): image is PublicMenuImage => Boolean(image));
    }

    const directImage = normalizeImageEntry(images);
    if (directImage) return [directImage];
    if (!images || typeof images !== 'object') return [];

    let entries: unknown[];
    try {
        entries = Object.values(images);
    } catch {
        return [];
    }

    return entries
        .map(normalizeImageEntry)
        .filter((image): image is PublicMenuImage => Boolean(image));
}

export function getPrimaryPublicMenuImage(item: { images?: unknown } | null | undefined): string | undefined {
    const image = normalizePublicMenuImages(item?.images)[0];
    return image?.variants?.medium || image?.variants?.large || image?.url;
}
