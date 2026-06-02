import type { MenuCardPrintSource } from '../models/printModel';
import { resolveMenuCardBusinessPrintProfile } from '../templates/businessPrintProfiles';

export function buildQrTestChecklist(source: MenuCardPrintSource): string {
    const profile = resolveMenuCardBusinessPrintProfile({
        businessCategory: source.business.businessCategory,
        catalogKind: source.business.catalogKind,
        offeringKind: source.business.offeringKind,
    });
    const label = profile.documentLabel.toLowerCase();

    return [
        'QR TEST CHECKLIST',
        '',
        `QR opens: ${source.qr.destinationUrl}`,
        '',
        'Before full print:',
        '1. Print one sample page.',
        '2. Scan the QR from a phone camera.',
        `3. Confirm it opens the current ${label}.`,
        '4. Confirm the QR is not cropped.',
        '5. Confirm the short link is readable.',
        '',
        `Short link: ${source.qr.shortUrl || source.business.publicMenuUrl}`,
    ].join('\n');
}
