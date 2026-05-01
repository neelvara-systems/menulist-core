/**
 * Pure Customer App manifest identity helpers.
 *
 * Kept dependency-free so regression scripts can run without loading the
 * Next/Webpack asset graph.
 */

export function buildStoreManifestId(storeId: string | number): string {
    return `/?store=${storeId}`;
}

export function getStoreManifestStartUrl(hasCustomerMenu: boolean): '/' | '/menu' {
    return hasCustomerMenu ? '/menu' : '/';
}
