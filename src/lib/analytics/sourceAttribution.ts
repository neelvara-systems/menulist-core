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

export function withAnalyticsSource(url: string, entrySource: AnalyticsEntrySource): string {
    if (!url) return url;

    try {
        const isAbsolute = /^[a-z][a-z\d+\-.]*:\/\//i.test(url);
        const base = typeof window !== 'undefined' ? window.location.origin : 'https://menulist.ai';
        const parsed = new URL(url, base);

        parsed.searchParams.set('entry_source', entrySource);

        return isAbsolute
            ? parsed.toString()
            : `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        const separator = url.includes('?') ? '&' : '?';
        const encodedSource = encodeURIComponent(entrySource);
        return `${url}${separator}entry_source=${encodedSource}`;
    }
}
