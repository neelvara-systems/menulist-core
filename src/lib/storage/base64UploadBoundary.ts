export type SupportedBase64UploadFileType =
    | 'jpeg' | 'jpg' | 'png' | 'svg' | 'webp' | 'gif'
    | 'image/jpeg' | 'image/jpg' | 'image/png' | 'image/svg+xml' | 'image/webp' | 'image/gif'
    | 'pdf' | 'doc' | 'docx' | 'txt'
    | 'application/pdf' | 'application/msword'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    | 'text/plain'
    | 'ttf' | 'otf' | 'woff' | 'woff2'
    | 'font/ttf' | 'font/otf' | 'font/woff' | 'font/woff2'
    | 'application/font-woff' | 'application/font-sfnt'
    | 'application/x-font-ttf' | 'application/x-font-opentype';

export interface Base64UploadConfig {
    contentType: string;
    decodedBytes: number;
    extension: string;
    uploadFormat: 'data_url';
}

const MEBIBYTE = 1024 * 1024;

const MAX_BYTES_BY_CONTENT_TYPE: Readonly<Record<string, number>> = {
    'application/msword': 50 * MEBIBYTE,
    'application/pdf': 50 * MEBIBYTE,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 50 * MEBIBYTE,
    'font/otf': 10 * MEBIBYTE,
    'font/ttf': 10 * MEBIBYTE,
    'font/woff': 10 * MEBIBYTE,
    'font/woff2': 10 * MEBIBYTE,
    'image/gif': 10 * MEBIBYTE,
    'image/jpeg': 10 * MEBIBYTE,
    'image/png': 10 * MEBIBYTE,
    'image/svg+xml': 4 * MEBIBYTE,
    'image/webp': 10 * MEBIBYTE,
    'text/plain': 5 * MEBIBYTE,
};

const TYPE_CONFIG = new Map<string, Pick<Base64UploadConfig, 'contentType' | 'extension'>>([
    ['jpeg', { contentType: 'image/jpeg', extension: '.jpeg' }],
    ['jpg', { contentType: 'image/jpeg', extension: '.jpeg' }],
    ['image/jpeg', { contentType: 'image/jpeg', extension: '.jpeg' }],
    ['image/jpg', { contentType: 'image/jpeg', extension: '.jpeg' }],
    ['png', { contentType: 'image/png', extension: '.png' }],
    ['image/png', { contentType: 'image/png', extension: '.png' }],
    ['svg', { contentType: 'image/svg+xml', extension: '.svg' }],
    ['image/svg+xml', { contentType: 'image/svg+xml', extension: '.svg' }],
    ['webp', { contentType: 'image/webp', extension: '.webp' }],
    ['image/webp', { contentType: 'image/webp', extension: '.webp' }],
    ['gif', { contentType: 'image/gif', extension: '.gif' }],
    ['image/gif', { contentType: 'image/gif', extension: '.gif' }],
    ['pdf', { contentType: 'application/pdf', extension: '.pdf' }],
    ['application/pdf', { contentType: 'application/pdf', extension: '.pdf' }],
    ['doc', { contentType: 'application/msword', extension: '.doc' }],
    ['application/msword', { contentType: 'application/msword', extension: '.doc' }],
    ['docx', {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: '.docx',
    }],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: '.docx',
    }],
    ['txt', { contentType: 'text/plain', extension: '.txt' }],
    ['text/plain', { contentType: 'text/plain', extension: '.txt' }],
    ['ttf', { contentType: 'font/ttf', extension: '.ttf' }],
    ['font/ttf', { contentType: 'font/ttf', extension: '.ttf' }],
    ['application/font-sfnt', { contentType: 'font/ttf', extension: '.ttf' }],
    ['application/x-font-ttf', { contentType: 'font/ttf', extension: '.ttf' }],
    ['otf', { contentType: 'font/otf', extension: '.otf' }],
    ['font/otf', { contentType: 'font/otf', extension: '.otf' }],
    ['application/x-font-opentype', { contentType: 'font/otf', extension: '.otf' }],
    ['woff', { contentType: 'font/woff', extension: '.woff' }],
    ['font/woff', { contentType: 'font/woff', extension: '.woff' }],
    ['application/font-woff', { contentType: 'font/woff', extension: '.woff' }],
    ['woff2', { contentType: 'font/woff2', extension: '.woff2' }],
    ['font/woff2', { contentType: 'font/woff2', extension: '.woff2' }],
]);

const normalizeType = (value: unknown) => (
    typeof value === 'string' ? value.trim().toLowerCase() : ''
);

const resolveTypeConfig = (value: unknown) => TYPE_CONFIG.get(normalizeType(value));

const decodeBase64Bytes = (payload: string, maxEncodedLength = payload.length): Uint8Array => {
    const boundedLength = Math.min(payload.length, maxEncodedLength);
    const encodedLength = boundedLength - (boundedLength % 4);
    if (encodedLength <= 0) throw new Error('base64_upload_payload_invalid');
    try {
        const binary = atob(payload.slice(0, encodedLength));
        return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } catch {
        throw new Error('base64_upload_payload_invalid');
    }
};

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean => (
    bytes.length >= signature.length
    && signature.every((byte, index) => bytes[index] === byte)
);

const hasSafeSvgContent = (payload: string): boolean => {
    let svg: string;
    try {
        svg = new TextDecoder('utf-8', { fatal: true }).decode(decodeBase64Bytes(payload));
    } catch {
        return false;
    }

    const normalized = svg.replace(/^\uFEFF/, '').trim();
    if (!/^<\?xml[\s\S]*?\?>\s*<svg\b|^<svg\b/i.test(normalized)) return false;
    if (!/<\/svg\s*>\s*$|<svg\b[^>]*\/\s*>\s*$/i.test(normalized)) return false;
    if (/<\s*(?:script|foreignObject|iframe|object|embed|audio|video|base)\b/i.test(normalized)) return false;
    if (/<!\s*(?:doctype|entity)\b/i.test(normalized)) return false;
    if (/\son[a-z0-9_-]+\s*=/i.test(normalized)) return false;
    if (/\b(?:javascript|vbscript)\s*:/i.test(normalized)) return false;
    if (/\b(?:href|xlink:href)\s*=\s*(?:"\s*(?!#)|'\s*(?!#)|[^\s"'#])/i.test(normalized)) return false;
    if (/@import\b|expression\s*\(/i.test(normalized)) return false;

    const cssUrlPattern = /url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi;
    let cssUrlMatch = cssUrlPattern.exec(normalized);
    while (cssUrlMatch) {
        if (!cssUrlMatch[2].trim().startsWith('#')) return false;
        cssUrlMatch = cssUrlPattern.exec(normalized);
    }
    return true;
};

const hasExpectedSignature = (payload: string, contentType: string): boolean => {
    if (contentType === 'image/svg+xml') return hasSafeSvgContent(payload);

    const bytes = decodeBase64Bytes(payload, 64);
    if (contentType === 'image/jpeg') return startsWith(bytes, [0xff, 0xd8, 0xff]);
    if (contentType === 'image/png') return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (contentType === 'image/gif') {
        return startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
            || startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    }
    if (contentType === 'image/webp') {
        return startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
            && bytes.length >= 12
            && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50]);
    }
    if (contentType === 'application/pdf') return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    if (contentType === 'application/msword') {
        return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    }
    if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
    }
    if (contentType === 'font/ttf') {
        return startsWith(bytes, [0x00, 0x01, 0x00, 0x00])
            || startsWith(bytes, [0x74, 0x72, 0x75, 0x65])
            || startsWith(bytes, [0x74, 0x79, 0x70, 0x31]);
    }
    if (contentType === 'font/otf') return startsWith(bytes, [0x4f, 0x54, 0x54, 0x4f]);
    if (contentType === 'font/woff') return startsWith(bytes, [0x77, 0x4f, 0x46, 0x46]);
    if (contentType === 'font/woff2') return startsWith(bytes, [0x77, 0x4f, 0x46, 0x32]);
    if (contentType === 'text/plain') {
        try {
            const text = new TextDecoder('utf-8', { fatal: true }).decode(decodeBase64Bytes(payload));
            return !text.includes('\0');
        } catch {
            return false;
        }
    }
    return false;
};

export function resolveBase64UploadConfig({
    type,
    url,
}: {
    type?: SupportedBase64UploadFileType | string | null;
    url: unknown;
}): Base64UploadConfig {
    if (typeof url !== 'string') throw new Error('base64_upload_data_url_invalid');
    const separatorIndex = url.indexOf(',');
    if (separatorIndex < 0 || separatorIndex > 128) throw new Error('base64_upload_data_url_invalid');
    const headerMatch = /^data:([^;,]+);base64$/i.exec(url.slice(0, separatorIndex));
    if (!headerMatch) throw new Error('base64_upload_data_url_invalid');

    const payload = url.slice(separatorIndex + 1);
    if (!payload || payload.length % 4 !== 0) throw new Error('base64_upload_payload_invalid');
    const payloadConfig = resolveTypeConfig(headerMatch[1]);
    if (!payloadConfig) throw new Error('base64_upload_mime_type_invalid');
    const maxBytes = MAX_BYTES_BY_CONTENT_TYPE[payloadConfig.contentType];
    if (!maxBytes) throw new Error('base64_upload_mime_type_invalid');
    if (payload.length > Math.ceil(maxBytes / 3) * 4 + 4) throw new Error('base64_upload_payload_too_large');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) throw new Error('base64_upload_payload_invalid');

    const paddingBytes = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
    const decodedBytes = Math.floor((payload.length * 3) / 4) - paddingBytes;
    if (decodedBytes <= 0) throw new Error('base64_upload_payload_empty');
    if (decodedBytes > maxBytes) throw new Error('base64_upload_payload_too_large');

    const normalizedDeclaredType = normalizeType(type);
    const declaredConfig = normalizedDeclaredType ? resolveTypeConfig(normalizedDeclaredType) : payloadConfig;
    if (!declaredConfig) throw new Error('base64_upload_declared_type_invalid');
    if (declaredConfig.contentType !== payloadConfig.contentType) {
        throw new Error('base64_upload_type_mismatch');
    }
    if (!hasExpectedSignature(payload, payloadConfig.contentType)) {
        throw new Error('base64_upload_signature_mismatch');
    }

    return {
        ...payloadConfig,
        decodedBytes,
        uploadFormat: 'data_url',
    };
}
