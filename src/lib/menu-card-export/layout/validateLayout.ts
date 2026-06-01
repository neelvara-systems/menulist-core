import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardLayoutPlan } from '../models/layoutTypes';
import type { MenuCardExportWarning } from '../models/warningTypes';

export function validateLayout(plan: MenuCardLayoutPlan, settings: MenuCardExportSettings): MenuCardExportWarning[] {
    const warnings: MenuCardExportWarning[] = [];

    if (plan.categories.length === 0) {
        warnings.push({
            code: 'empty_menu',
            severity: 'blocker',
            message: 'No visible items are available for export.',
        });
    }

    if (settings.preset === 'whatsapp' && plan.pageCount > 8) {
        warnings.push({
            code: 'file_size_risk',
            severity: 'warning',
            message: 'This WhatsApp PDF may be long. Use Compact or hide descriptions if needed.',
        });
    }

    if (plan.pageCount > 16) {
        warnings.push({
            code: 'page_overflow',
            severity: 'warning',
            message: 'This menu creates many pages. Compact style is recommended.',
        });
    }

    return warnings;
}
