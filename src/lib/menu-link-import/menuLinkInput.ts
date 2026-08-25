export type MenuLinkInputValidation =
    | { valid: true; normalizedUrl: string }
    | { valid: false; message: string };

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

    url.hash = '';
    return { valid: true, normalizedUrl: url.toString() };
};
