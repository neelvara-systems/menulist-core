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

const readStoreField = (
    store: unknown,
    key: keyof StoreIdentityLike,
): unknown => {
    if (!store || typeof store !== 'object') return undefined;
    try {
        return Reflect.get(store, key);
    } catch {
        return undefined;
    }
};

export function stripMainStoreSuffix(value: string): string {
    return value.replace(MAIN_STORE_SUFFIX, '').trim();
}

export function getBrandName(store?: unknown, fallback = 'Business'): string {
    const tenantName = cleanText(readStoreField(store, 'tenantName'));
    if (tenantName) return tenantName;

    const storeName = cleanText(readStoreField(store, 'name')) || cleanText(readStoreField(store, 'storeName'));
    const normalizedStoreName = stripMainStoreSuffix(storeName);
    return normalizedStoreName || fallback;
}

export function getStoreName(store?: unknown, fallback = 'Store'): string {
    return cleanText(readStoreField(store, 'name'))
        || cleanText(readStoreField(store, 'storeName'))
        || fallback;
}

export function getStoreContextName(store?: unknown, fallback = 'Business'): string {
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
