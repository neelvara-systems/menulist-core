export type MenuLinkInputValidation =
    | { valid: true; normalizedUrl: string }
    | { valid: false; message: string };

export const getMenuLinkHostnameForLog = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value.trim().replace(/\\/g, '/'));
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
            ? url.hostname.toLowerCase()
            : null;
    } catch {
        return null;
    }
};

export const validateMenuLinkInput = (value: string): MenuLinkInputValidation => {
    const trimmed = value.trim().replace(/\\/g, '/');
    if (!trimmed) {
        return { valid: false, message: 'Paste a public menu link.' };
    }
    if (trimmed.length > 4000) {
        return { valid: false, message: 'Enter a shorter public menu link.' };
    }

    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        return { valid: false, message: 'Enter a valid public http or https menu link.' };
    }

    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
        return { valid: false, message: 'Enter a valid public http or https menu link.' };
    }
    if (url.username || url.password) {
        return { valid: false, message: 'Use a public menu link without login details.' };
    }
    if (url.port && !((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443'))) {
        return { valid: false, message: 'Use a standard public website link.' };
    }

    // Hash routers encode the actual page in the fragment. Preserve only that
    // route form so the server renderer can reach it; discard ordinary anchors.
    if (!/^#(?:!\/|\/)/.test(url.hash)) {
        url.hash = '';
    }
    return { valid: true, normalizedUrl: url.toString() };
};
