const PUBLIC_CONTACT_SOURCE_PATH_MAX_LENGTH = 240;
const PUBLIC_CONTACT_REFERRER_MAX_LENGTH = 300;

export function normalizePublicContactSourcePath(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const sourcePath = value.trim();
    if (
        !sourcePath.startsWith('/')
        || sourcePath.startsWith('//')
        || sourcePath.includes('\\')
        || /%5c/i.test(sourcePath)
    ) return null;
    try {
        const parsed = new URL(sourcePath, 'https://menulist.invalid');
        if (parsed.origin !== 'https://menulist.invalid') return null;
        return parsed.pathname.slice(0, PUBLIC_CONTACT_SOURCE_PATH_MAX_LENGTH) || null;
    } catch {
        return null;
    }
}

export function normalizePublicContactReferrer(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
        return `${parsed.origin}${parsed.pathname}`.slice(0, PUBLIC_CONTACT_REFERRER_MAX_LENGTH);
    } catch {
        return null;
    }
}

export function preserveOptionalPublicContactCount(value: number | null | undefined): number | null {
    return value ?? null;
}
