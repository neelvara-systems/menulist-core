import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardPrintSource } from '../models/printModel';
import type { MenuCardExportWarning } from '../models/warningTypes';

export function checkQrSafety(source: MenuCardPrintSource, settings: MenuCardExportSettings): MenuCardExportWarning[] {
    if (!settings.includeQr) return [];

    const warnings: MenuCardExportWarning[] = [];
    const urlLength = source.qr.destinationUrl.length;

    if (!/^https?:\/\//i.test(source.qr.destinationUrl)) {
        warnings.push({
            code: 'qr_too_dense',
            severity: 'blocker',
            message: 'QR link is not ready. Use a valid menu link before export.',
        });
    }

    if (urlLength > 180) {
        warnings.push({
            code: 'qr_too_dense',
            severity: 'warning',
            message: 'QR link is long. Print one sample and scan it before printing many copies.',
        });
    }

    return warnings;
}
