export const MENU_CARD_EXPORT_ROUTE = '/use-menulist/menu-card-export';

export function buildMenuCardExportUrl(projectId?: string | null): string {
    if (!projectId) return MENU_CARD_EXPORT_ROUTE;
    return `${MENU_CARD_EXPORT_ROUTE}?projectId=${encodeURIComponent(projectId)}`;
}
