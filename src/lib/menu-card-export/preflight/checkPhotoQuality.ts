import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardPrintSource } from '../models/printModel';
import type { MenuCardExportWarning } from '../models/warningTypes';

export function checkPhotoQuality(source: MenuCardPrintSource, settings: MenuCardExportSettings): MenuCardExportWarning[] {
    if (!settings.includePhotos) return [];
    if (source.flags.hasPhotos) return [];

    return [{
        code: 'low_photo_quality',
        severity: 'warning',
        message: 'No print-ready photos were found. Use a non-photo style for cleaner output.',
    }];
}
