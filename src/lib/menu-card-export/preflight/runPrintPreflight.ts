import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardLayoutPlan } from '../models/layoutTypes';
import type { MenuCardPreflightResult } from '../models/preflightTypes';
import type { MenuCardPrintSource } from '../models/printModel';
import type { MenuCardExportWarning } from '../models/warningTypes';
import { calculateMenuMetrics } from '../layout/calculateMenuMetrics';
import { validateLayout } from '../layout/validateLayout';
import { checkBleedAndSafeArea } from './checkBleedAndSafeArea';
import { checkPhotoQuality } from './checkPhotoQuality';
import { checkQrSafety } from './checkQrSafety';
import { checkSelectableText } from './checkSelectableText';

export function runPrintPreflight(
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    plan: MenuCardLayoutPlan,
): MenuCardPreflightResult {
    const metrics = calculateMenuMetrics(source);
    const warnings: MenuCardExportWarning[] = [
        ...validateLayout(plan, settings),
        ...checkQrSafety(source, settings),
        ...checkBleedAndSafeArea(settings),
        ...checkPhotoQuality(source, settings),
        ...checkSelectableText(),
    ];

    if (source.flags.hasMissingPrices) {
        warnings.push({
            code: 'missing_prices',
            severity: settings.preset === 'staff_reference' ? 'info' : 'warning',
            message: 'Some visible items do not have prices.',
        });
    }

    if (metrics.longTextCount > 0) {
        warnings.push({
            code: 'long_text',
            severity: 'warning',
            message: 'Some item text may wrap across more lines.',
            count: metrics.longTextCount,
        });
    }

    const blockerCount = warnings.filter((warning) => warning.severity === 'blocker').length;
    const warningCount = warnings.filter((warning) => warning.severity === 'warning').length;

    return {
        status: blockerCount > 0 ? 'blocked' : warningCount > 0 ? 'warnings' : 'passed',
        warningCount,
        blockerCount,
        warnings,
        checkedAt: new Date().toISOString(),
    };
}
