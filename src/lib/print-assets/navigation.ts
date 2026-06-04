export const PRINT_ASSETS_ROUTE = '/use-menulist/print-assets';

export function buildPrintAssetsUrl(projectId?: string | null): string {
    if (!projectId) return PRINT_ASSETS_ROUTE;
    return `${PRINT_ASSETS_ROUTE}?projectId=${encodeURIComponent(projectId)}`;
}
