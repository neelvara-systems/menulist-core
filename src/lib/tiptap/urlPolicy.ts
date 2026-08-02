const TIPTAP_URL_BASE = 'https://menulist.invalid';
const MAX_TIPTAP_URL_LENGTH = 2_048;
const UNSAFE_TIPTAP_URL_CHARACTERS = /[\u0000-\u001f\u007f\\]/;
const TIPTAP_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const TIPTAP_IMAGE_PROTOCOLS = new Set(['http:', 'https:']);

const cleanUrl = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (
        !trimmed
        || trimmed.length > MAX_TIPTAP_URL_LENGTH
        || UNSAFE_TIPTAP_URL_CHARACTERS.test(trimmed)
    ) {
        return '';
    }
    return trimmed;
};

const normalizeRootRelativeUrl = (value: string): string => {
    if (!value.startsWith('/') || value.startsWith('//')) return '';
    try {
        const parsed = new URL(value, TIPTAP_URL_BASE);
        return parsed.origin === TIPTAP_URL_BASE
            ? `${parsed.pathname}${parsed.search}${parsed.hash}`
            : '';
    } catch {
        return '';
    }
};

const normalizeAbsoluteUrl = (
    value: string,
    allowedProtocols: ReadonlySet<string>,
): string => {
    try {
        const parsed = new URL(value);
        if (
            !allowedProtocols.has(parsed.protocol)
            || parsed.username
            || parsed.password
        ) {
            return '';
        }
        return parsed.href;
    } catch {
        return '';
    }
};

export function normalizeTiptapLinkUrl(
    value: unknown,
    options: { assumeHttps?: boolean } = {},
): string {
    const url = cleanUrl(value);
    if (!url || url.startsWith('//')) return '';
    if (url.startsWith('#')) return url;

    const relativeUrl = normalizeRootRelativeUrl(url);
    if (relativeUrl) return relativeUrl;

    const candidate = options.assumeHttps && !/^[a-z][a-z\d+.-]*:/i.test(url)
        ? `https://${url}`
        : url;
    return normalizeAbsoluteUrl(candidate, TIPTAP_LINK_PROTOCOLS);
}

export function normalizeTiptapImageUrl(value: unknown): string {
    const url = cleanUrl(value);
    if (!url || url.startsWith('//')) return '';

    const relativeUrl = normalizeRootRelativeUrl(url);
    return relativeUrl || normalizeAbsoluteUrl(url, TIPTAP_IMAGE_PROTOCOLS);
}

export function normalizeTiptapTextColor(value: unknown): string {
    if (typeof value !== 'string') return '';
    const color = value.trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color : '';
}

export function normalizeTiptapTextAlign(value: unknown): string {
    if (typeof value !== 'string') return '';
    const alignment = value.trim().toLowerCase();
    return ['left', 'center', 'right', 'justify'].includes(alignment)
        ? alignment
        : '';
}
