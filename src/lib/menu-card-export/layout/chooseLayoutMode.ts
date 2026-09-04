import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardLayoutMode } from '../models/layoutTypes';

export function chooseLayoutMode(settings: MenuCardExportSettings, columnCount?: number): MenuCardLayoutMode {
    if (settings.preset === 'qr_insert') return 'qr_insert';
    if (settings.styleId === 'premium') return 'single_column';
    if (settings.styleId === 'compact' && settings.paperSize === 'a4' && columnCount === 3) return 'three_column_compact';
    if (settings.styleId === 'takeaway') return 'single_column';
    return 'two_column_category_flow';
}
