import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardExportWarning } from '../models/warningTypes';

export function checkBleedAndSafeArea(settings: MenuCardExportSettings): MenuCardExportWarning[] {
    if (settings.preset !== 'print_shop_packet') return [];

    return [{
        code: 'print_safe_area',
        severity: 'info',
        message: 'Print-shop packet uses safe margins and includes print notes.',
    }];
}
