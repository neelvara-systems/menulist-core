import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardPrintSource } from '../models/printModel';
import { getMenuCardPreset } from '../presets/presetRegistry';
import { getMenuCardTemplate } from '../templates/registry';
import { resolveMenuCardBusinessPrintProfile } from '../templates/businessPrintProfiles';
import { MENU_CARD_EXPORT_RENDERER_VERSION, shortSourceReference } from '../render/artifactMetadata';

export type PrintInstructionMetadata = {
    generatedAt?: Date;
    sourceHash?: string;
    pageCount?: number;
};

export function buildPrintInstructions(
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    metadata: PrintInstructionMetadata = {},
): string {
    const preset = getMenuCardPreset(settings.preset);
    const template = getMenuCardTemplate(settings.styleId);
    const generatedAt = metadata.generatedAt || new Date();
    const sourceReference = metadata.sourceHash ? shortSourceReference(metadata.sourceHash) : 'Not available';
    const profile = resolveMenuCardBusinessPrintProfile({
        businessCategory: source.business.businessCategory,
        catalogKind: source.business.catalogKind,
        offeringKind: source.business.offeringKind,
    });

    const lines = [
        'PRINT INSTRUCTIONS',
        '',
        'Source summary:',
        `Business: ${source.business.name}`,
        `${profile.documentLabel}: ${source.menu.title}`,
        `Preset: ${preset.label}`,
        `Style: ${template.name} (${template.id} v${template.version})`,
        `Paper size: ${settings.paperSize.toUpperCase()}`,
        `Orientation: ${settings.orientation}`,
        `Density: ${settings.density}`,
        `Pages: ${metadata.pageCount || 'Not available'}`,
        `Generated: ${generatedAt.toISOString()}`,
        `${profile.documentLabel} updated: ${source.menu.updatedAt || 'Not available'}`,
        `Source reference: ${sourceReference}`,
        `Renderer: ${MENU_CARD_EXPORT_RENDERER_VERSION}`,
        `Live ${profile.documentLabel.toLowerCase()}: ${source.qr.destinationUrl}`,
        '',
        'Print notes:',
        '- Print one sample first.',
        '- Scan the QR code from the sample before printing many copies.',
        '- Keep the file at 100% scale unless the print shop confirms a different setup.',
        '- Keep all text inside the safe margin.',
        '- Use the PDF document properties and source reference above if support needs to identify this export.',
        '',
        source.business.phone ? `Contact: ${source.business.phone}` : '',
        source.business.address ? `Address: ${source.business.address}` : '',
    ].filter((line) => line !== '');

    return lines.join('\n');
}
