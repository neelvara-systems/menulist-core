export const ITEM_QUERY_PARAM = 'item';

export function buildCanonicalItemUrl(baseUrl: string, itemId?: string | null, language?: string | null): string {
    const normalizedBase = (baseUrl || '').trim();
    const normalizedItemId = String(itemId || '').trim();
    if (!normalizedBase || !normalizedItemId) return normalizedBase;

    const url = new URL(normalizedBase, 'https://menulist.ai');
    url.searchParams.set(ITEM_QUERY_PARAM, normalizedItemId);
    if (language) {
        url.searchParams.set('lang', language);
    }

    return normalizedBase.startsWith('http')
        ? url.toString()
        : `${url.pathname}${url.search}${url.hash}`;
}
