import type { MenuCardExportSettings } from '../models/exportTypes';

export function getPrintBox(settings: MenuCardExportSettings) {
    const safeMargin = settings.preset === 'print_shop_packet' ? 14 : 12;
    const footerReserve = settings.includeQr ? 30 : 16;
    return {
        safeMargin,
        footerReserve,
        bleedMm: settings.preset === 'print_shop_packet' ? 3 : 0,
    };
}
