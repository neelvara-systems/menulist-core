import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';

export function buildQrDestination(menuUrl: string, preset: string): string {
    if (!menuUrl || !/^https?:\/\//i.test(menuUrl)) return menuUrl;
    return withAnalyticsSource(menuUrl, preset === 'whatsapp' ? 'whatsapp' : 'qr');
}

export function buildShortUrl(menuUrl: string): string {
    return (menuUrl || '').replace(/^https?:\/\//i, '');
}
