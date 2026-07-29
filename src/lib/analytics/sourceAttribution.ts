import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';

export type AnalyticsEntrySource =
    | 'copy_link'
    | 'direct'
    | 'facebook'
    | 'google'
    | 'instagram'
    | 'menu_kit'
    | 'native_share'
    | 'obp'
    | 'qr'
    | 'shortcut'
    | 'whatsapp'
    | 'other';

const MAX_SOURCE_ATTRIBUTION_DIAGNOSTICS = 25;
const reportedSourceAttributionFailures = new Set<string>();

const isAbsoluteAnalyticsUrl = (url: string): boolean => /^[a-z][a-z\d+\-.]*:\/\//i.test(url);

function logSourceAttributionFailure(
    error: unknown,
    url: string,
    entrySource: AnalyticsEntrySource,
): void {
    const failureKey = [
        entrySource,
        url.length,
        isAbsoluteAnalyticsUrl(url) ? 'absolute' : 'relative',
        url.includes('?') ? 'query' : 'no-query',
        url.includes('#') ? 'hash' : 'no-hash',
    ].join(':');

    if (reportedSourceAttributionFailures.has(failureKey)) return;
    if (reportedSourceAttributionFailures.size >= MAX_SOURCE_ATTRIBUTION_DIAGNOSTICS) return;
    reportedSourceAttributionFailures.add(failureKey);

    logAnalyticsFailure('analytics_source_attribution_url_parse_failed', error, {
        ...getBoundedAnalyticsStringContext('sourceUrl', url),
        ...getBoundedAnalyticsStringContext('entrySource', entrySource),
        isAbsoluteUrl: isAbsoluteAnalyticsUrl(url),
        hasQuery: url.includes('?'),
        hasHash: url.includes('#'),
    });
}

export function withAnalyticsSource(url: string, entrySource: AnalyticsEntrySource): string {
    if (!url) return url;

    try {
        const isAbsolute = isAbsoluteAnalyticsUrl(url);
        const base = typeof window !== 'undefined' ? window.location.origin : 'https://menulist.ai';
        const parsed = new URL(url, base);

        parsed.searchParams.set('entry_source', entrySource);

        return isAbsolute
            ? parsed.toString()
            : `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch (error) {
        logSourceAttributionFailure(error, url, entrySource);
        return url;
    }
}
