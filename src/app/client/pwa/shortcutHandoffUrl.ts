import { normalizeOBPExternalHttpsUrl, normalizeOBPGoogleMapsUrl } from '@lib/obp/publicLinks';

const TEL_URL_PATTERN = /^tel:\+[0-9]+$/;
const WHATSAPP_HOST = 'wa.me';
const WHATSAPP_PATH_PATTERN = /^\/[0-9]+$/;

export function getSafePwaExternalHttpsUrl(value: string): string | null {
    return normalizeOBPExternalHttpsUrl(value);
}

export function getSafePwaGoogleMapsUrl(value: string): string | null {
    return normalizeOBPGoogleMapsUrl(value);
}

export function getSafePwaTelUrl(value: string): string | null {
    const normalized = String(value || '').trim();
    return TEL_URL_PATTERN.test(normalized) ? normalized : null;
}

export function getSafePwaWhatsAppUrl(value: string): string | null {
    const normalized = normalizeOBPExternalHttpsUrl(value);
    if (!normalized) return null;

    const parsed = new URL(normalized);
    if (parsed.hostname.toLowerCase() !== WHATSAPP_HOST) return null;
    if (!WHATSAPP_PATH_PATTERN.test(parsed.pathname)) return null;

    return normalized;
}
