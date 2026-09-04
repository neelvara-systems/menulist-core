import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardPrintSource } from '../models/printModel';
import type { MenuCardTemplate } from '../models/templateTypes';
import { resolveMenuCardBusinessPrintProfile } from '../templates/businessPrintProfiles';

export const MENU_CARD_EXPORT_RENDERER_VERSION = 'menu-card-export-jspdf-v28';

export function safeArtifactFilename(value: string, maxLength = 120): string {
    const normalized = (value || 'menu')
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_');
    return (normalized || 'menu').slice(0, maxLength);
}

export function formatArtifactDate(date: Date = new Date()): string {
    return date.toISOString().slice(0, 10);
}

export function shortSourceReference(sourceHash: string): string {
    const clean = (sourceHash || 'mce-unknown').replace(/[^a-zA-Z0-9-]/g, '');
    return clean.slice(0, 16) || 'mce-unknown';
}

function presetFilenameToken(preset: MenuCardExportSettings['preset']): string {
    return preset
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

export function buildArtifactFilename(params: {
    source: MenuCardPrintSource;
    settings: MenuCardExportSettings;
    template: MenuCardTemplate;
    sourceHash: string;
    extension: 'pdf' | 'zip';
    generatedAt?: Date;
}): string {
    const { source, settings, sourceHash, extension, generatedAt } = params;
    const base = safeArtifactFilename([
        source.business.name,
        source.menu.title,
        presetFilenameToken(settings.preset),
        formatArtifactDate(generatedAt),
        shortSourceReference(sourceHash),
    ].filter(Boolean).join('_'));

    return `${base}.${extension}`;
}

export function buildPdfDocumentProperties(params: {
    source: MenuCardPrintSource;
    settings: MenuCardExportSettings;
    template: MenuCardTemplate;
    sourceHash: string;
}) {
    const { source, settings, template, sourceHash } = params;
    const profile = resolveMenuCardBusinessPrintProfile({
        businessCategory: source.business.businessCategory,
        catalogKind: source.business.catalogKind,
        offeringKind: source.business.offeringKind,
    });

    return {
        title: `${source.business.name} - ${source.menu.title}`,
        subject: `${presetFilenameToken(settings.preset)} ${profile.documentLabel.toLowerCase()} export from current MenuList data`,
        author: source.business.name || 'MenuList',
        keywords: [
            'MenuList',
            `print ${profile.documentLabel.toLowerCase()}`,
            source.business.name,
            source.menu.title,
            source.business.businessCategory,
            source.business.offeringKind,
            settings.preset,
            settings.paperSize,
            settings.orientation,
            settings.density,
            template.id,
            `template-${template.version}`,
            source.menu.language,
            shortSourceReference(sourceHash),
        ].filter(Boolean).join(', '),
        creator: 'MenuList Menu Card Export',
    };
}
