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

export function buildItemOgImagePath(itemId?: string | null, version?: string | number | null): string {
    const normalizedItemId = encodeURIComponent(String(itemId || '').trim());
    if (!normalizedItemId) return '';

    const params = new URLSearchParams();
    if (version !== undefined && version !== null && String(version).trim()) {
        params.set('v', String(version).trim());
    }

    const query = params.toString();
    return `/api/og/item/${normalizedItemId}${query ? `?${query}` : ''}`;
}

export function buildItemDownloadPath(itemId?: string | null, version?: string | number | null): string {
    const normalizedItemId = encodeURIComponent(String(itemId || '').trim());
    if (!normalizedItemId) return '';

    const params = new URLSearchParams();
    if (version !== undefined && version !== null && String(version).trim()) {
        params.set('v', String(version).trim());
    }

    const query = params.toString();
    return `/api/item-card/${normalizedItemId}${query ? `?${query}` : ''}`;
}

export function appendItemRouteContext(
    path: string,
    context: { projectId?: string | null; tenantId?: string | number | null; storeId?: string | number | null },
): string {
    if (!path) return '';

    const [base, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    if (context.projectId) params.set('project', String(context.projectId));
    if (context.tenantId) params.set('tenant', String(context.tenantId));
    if (context.storeId) params.set('store', String(context.storeId));
    const nextQuery = params.toString();
    return `${base}${nextQuery ? `?${nextQuery}` : ''}`;
}
