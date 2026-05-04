type StoreIdentityLike = {
    id?: string | number | null;
    isMaster?: boolean | null;
    name?: string | null;
    storeId?: string | number | null;
    storeName?: string | null;
    tenantName?: string | null;
};

const MAIN_STORE_SUFFIX = /\s+-\s+Main Store$/i;

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function stripMainStoreSuffix(value: string): string {
    return value.replace(MAIN_STORE_SUFFIX, '').trim();
}

export function getBrandName(store?: StoreIdentityLike | null, fallback = 'Business'): string {
    const tenantName = cleanText(store?.tenantName);
    if (tenantName) return tenantName;

    const storeName = cleanText(store?.name) || cleanText(store?.storeName);
    const normalizedStoreName = stripMainStoreSuffix(storeName);
    return normalizedStoreName || fallback || 'Business';
}

export function getStoreName(store?: StoreIdentityLike | null, fallback = 'Store'): string {
    return cleanText(store?.name) || cleanText(store?.storeName) || fallback || 'Store';
}

export function getStoreContextName(store?: StoreIdentityLike | null, fallback = 'Business'): string {
    const brandName = getBrandName(store, '');
    const storeName = getStoreName(store, '');
    const comparableStoreName = stripMainStoreSuffix(storeName);
    const normalizedBrandPrefix = `${brandName.toLowerCase()} - `;

    if (brandName && storeName.toLowerCase().startsWith(normalizedBrandPrefix)) {
        return storeName;
    }

    if (brandName && storeName && comparableStoreName.toLowerCase() !== brandName.toLowerCase()) {
        return `${brandName} - ${storeName}`;
    }

    return storeName || brandName || fallback || 'Business';
}

export const getBrandStoreLabel = getStoreContextName;
