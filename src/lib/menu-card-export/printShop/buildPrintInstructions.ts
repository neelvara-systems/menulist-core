import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardPrintSource } from '../models/printModel';

export function buildPrintInstructions(source: MenuCardPrintSource, settings: MenuCardExportSettings): string {
    const lines = [
        'PRINT INSTRUCTIONS',
        '',
        `Business: ${source.business.name}`,
        `Menu: ${source.menu.title}`,
        `Paper size: ${settings.paperSize.toUpperCase()}`,
        `Orientation: ${settings.orientation}`,
        `Density: ${settings.density}`,
        `Generated: ${new Date().toISOString()}`,
        `Menu updated: ${source.menu.updatedAt || 'Not available'}`,
        '',
        'Print notes:',
        '- Print one sample first.',
        '- Scan the QR code from the sample before printing many copies.',
        '- Keep the file at 100% scale unless the print shop confirms a different setup.',
        '- Keep all text inside the safe margin.',
        '',
        source.business.phone ? `Contact: ${source.business.phone}` : '',
        source.business.address ? `Address: ${source.business.address}` : '',
    ].filter((line) => line !== '');

    return lines.join('\n');
}
