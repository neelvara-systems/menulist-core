export const CANONICA_CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CANONICA_CHAT_IMAGE_MAX_BASE64_LENGTH = Math.ceil((CANONICA_CHAT_IMAGE_MAX_BYTES * 4) / 3) + 100;

export const CANONICA_CHAT_IMAGE_ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
] as const;

export const CANONICA_CHAT_IMAGE_ALLOWED_MIME_TYPE_SET = new Set<string>(CANONICA_CHAT_IMAGE_ALLOWED_MIME_TYPES);

export const CANONICA_CHAT_IMAGE_ACCEPT = CANONICA_CHAT_IMAGE_ALLOWED_MIME_TYPES.join(',');
export const CANONICA_CHAT_IMAGE_ALLOWED_LABEL = 'JPEG, PNG, WebP, or GIF';

export function normalizeCanonicaChatImageMimeType(value?: string | null): string {
    return String(value || '').split(';')[0].trim().toLowerCase();
}

export function isAllowedCanonicaChatImageMimeType(value?: string | null): boolean {
    return CANONICA_CHAT_IMAGE_ALLOWED_MIME_TYPE_SET.has(normalizeCanonicaChatImageMimeType(value));
}

export function stripDataUrlPrefix(value: string): string {
    const base64 = value.includes(',') ? value.split(',').pop() || '' : value;
    return base64.replace(/\s+/g, '');
}
