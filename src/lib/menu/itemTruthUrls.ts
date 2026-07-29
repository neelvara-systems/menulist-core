export const ITEM_QUERY_PARAM = 'item';

export function buildCanonicalItemUrl(baseUrl: string, itemId?: string | null, language?: string | null): string {
    const normalizedBase = (baseUrl || '').trim();
    const normalizedItemId = String(itemId || '').trim();
    if (!normalizedBase || !normalizedItemId) return normalizedBase;

    try {
        const isAbsoluteHttpUrl = /^https?:\/\//i.test(normalizedBase);
        const url = new URL(normalizedBase, 'https://menulist.ai');
        if (isAbsoluteHttpUrl && url.protocol !== 'http:' && url.protocol !== 'https:') return normalizedBase;

        url.searchParams.set(ITEM_QUERY_PARAM, normalizedItemId);
        const normalizedLanguage = language?.trim();
        if (normalizedLanguage) {
            url.searchParams.set('lang', normalizedLanguage);
        }

        return isAbsoluteHttpUrl
            ? url.toString()
            : `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return normalizedBase;
    }
}
