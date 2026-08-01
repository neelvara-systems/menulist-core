import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';

export function normalizeMenuCardQrDestination(value: string): string | null {
    const candidate = value.trim();
    if (!candidate) return null;

    try {
        const parsed = new URL(candidate);
        if (
            (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
            || parsed.username
            || parsed.password
        ) {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
}

export function buildQrDestination(menuUrl: string, preset: string): string {
    const normalized = normalizeMenuCardQrDestination(menuUrl);
    if (!normalized) return '';
    return withAnalyticsSource(normalized, preset === 'whatsapp' ? 'whatsapp' : 'qr');
}

export function buildShortUrl(menuUrl: string): string {
    const normalized = normalizeMenuCardQrDestination(menuUrl);
    if (!normalized) return '';
    return normalized.replace(/^https?:\/\//i, '');
}
