/**
 * MENU PDF GENERATOR
 * Compatibility wrapper for older "Menu PDF" buttons.
 *
 * The visual output is intentionally delegated to Menu Card Export so Use
 * MenuList, mobile Share, project Share, and the dedicated Print Menu route
 * all produce the same branded physical-menu PDF.
 *
 * @see __docs__/menu-card-export/menu-card-export_impl.md
 */

import type { MenuCardExportPreset } from '@lib/menu-card-export/models/exportTypes';
import { buildDefaultSettings } from '@lib/menu-card-export/presets/presetRegistry';
import { renderPdf } from '@lib/menu-card-export/render/renderPdf';
import { buildPrintSource } from '@lib/menu-card-export/source/buildPrintSource';
import { resolveAutoPrintDesign } from '@lib/menu-card-export/templates/autoPrintDesign';

interface MenuItem {
    id: string;
    name: Record<string, string> | string;
    description?: Record<string, string> | string;
    price?: string;
    category?: string;
    categoryId?: string;
    active?: boolean;
    available?: boolean;
    attributes?: Array<{
        id: string;
        name: Record<string, string> | string;
        price?: string;
        active?: boolean;
    }>;
}

interface Category {
    id: string;
    name: Record<string, string> | string;
    active?: boolean;
}

export interface MenuPdfOptions {
    projectName: string;
    storeName: string;
    language: string;
    menuUrl?: string;
    currency?: string;
    currencyCode?: string;
    showDescriptions?: boolean;
    showQrCode?: boolean;
    headerColor?: string;
    brandColor?: string;
    address?: string;
    contactLine?: string;
    logoUrl?: string;
    businessType?: string;
    businessCategory?: string;
    activePlanType?: string | null;
    projectId?: string;
    preset?: MenuCardExportPreset;
    projectData?: Record<string, any> | null;
    storeData?: Record<string, any> | null;
    items: MenuItem[];
    categories: Category[];
    showUpdatedOn?: boolean;
    updatedAt?: unknown;
    styleId?: string;
}

export interface GeneratedPdf {
    blob: Blob;
    filename: string;
    snapshotHash: string;
}

function compactArray<T>(items: Array<T | undefined | null | false | ''>): T[] {
    return items.filter(Boolean) as T[];
}

function resolvePhone(options: MenuPdfOptions, storeData: Record<string, any>): string | undefined {
    const contactLine = String(options.contactLine || '').trim();
    return contactLine
        || storeData.phone
        || storeData.phoneNumber
        || storeData.publicPresence?.phone
        || undefined;
}

function buildCompatibilityProject(options: MenuPdfOptions): Record<string, any> {
    const existing = options.projectData || {};
    const language = options.language || existing.defaultLanguage || 'en';
    const extractedData = existing.extractedData || {
        data: {
            categories: options.categories,
            items: options.items,
        },
    };

    return {
        ...existing,
        projectId: options.projectId || existing.projectId || existing.id || '',
        name: existing.name || options.projectName || 'Menu',
        defaultLanguage: existing.defaultLanguage || language,
        languages: Array.isArray(existing.languages) && existing.languages.length > 0
            ? existing.languages
            : compactArray([language]),
        modifiedOn: existing.modifiedOn || existing.updatedAt || options.updatedAt || null,
        extractedData,
    };
}

function buildCompatibilityStore(options: MenuPdfOptions): Record<string, any> {
    const existing = options.storeData || {};
    const activePlanType = options.activePlanType
        || existing.activePlanType
        || existing.publicPresence?.activePlanType
        || null;
    const brandColor = options.brandColor
        || options.headerColor
        || existing.publicPresence?.accentColor
        || existing.primaryColor
        || existing.brandColor
        || existing.themeColor;

    return {
        ...existing,
        name: options.storeName || existing.name || existing.storeName || existing.businessName || 'Menu',
        storeName: options.storeName || existing.storeName,
        businessName: options.storeName || existing.businessName,
        logo: options.logoUrl || existing.logo || existing.logoUrl || existing.publicPresence?.logoUrl,
        logoUrl: options.logoUrl || existing.logoUrl || existing.logo,
        businessType: options.businessType || existing.businessType || existing.businessIndustry,
        businessCategory: options.businessCategory || existing.businessCategory,
        activePlanType,
        currencySymbol: options.currency || existing.currencySymbol || '',
        currency: existing.currency || options.currencyCode || options.currency || '',
        currencyCode: options.currencyCode || existing.currencyCode || existing.currency,
        primaryColor: brandColor || existing.primaryColor,
        brandColor: brandColor || existing.brandColor,
        themeColor: brandColor || existing.themeColor,
        publicPresence: {
            ...(existing.publicPresence || {}),
            accentColor: brandColor || existing.publicPresence?.accentColor,
            logoUrl: options.logoUrl || existing.publicPresence?.logoUrl || existing.logoUrl || existing.logo,
            businessType: options.businessType || existing.publicPresence?.businessType,
            businessCategory: options.businessCategory || existing.publicPresence?.businessCategory,
            activePlanType,
        },
        address: options.address || existing.address,
        addressLine: options.address || existing.addressLine,
        phone: resolvePhone(options, existing),
    };
}

function normalizeSettings(options: MenuPdfOptions) {
    const preset = options.preset || 'home_print';
    const initialSettings = buildDefaultSettings(preset, options.styleId || 'classic');
    const project = buildCompatibilityProject(options);
    const store = buildCompatibilityStore(options);
    const initialSource = buildPrintSource({
        project,
        store,
        menuUrl: options.menuUrl || '',
        language: options.language,
        settings: initialSettings,
    });
    const autoDesign = resolveAutoPrintDesign(initialSource, preset);

    return {
        project,
        store,
        settings: {
            ...(options.styleId ? initialSettings : autoDesign.settings),
            includeDescriptions: options.showDescriptions ?? autoDesign.settings.includeDescriptions,
            includeLogo: true,
            includeQr: options.showQrCode ?? autoDesign.settings.includeQr,
            includeContactBlock: true,
            includeUpdatedDate: options.showUpdatedOn ?? true,
        },
    };
}

export async function generateMenuPdf(options: MenuPdfOptions): Promise<GeneratedPdf> {
    const { project, store, settings } = normalizeSettings(options);
    const source = buildPrintSource({
        project,
        store,
        menuUrl: options.menuUrl || '',
        language: options.language,
        settings,
    });
    const artifact = await renderPdf(source, settings);

    return {
        blob: artifact.blob,
        filename: artifact.filename,
        snapshotHash: artifact.sourceHash,
    };
}

export function downloadPdf(pdfResult: GeneratedPdf): void {
    const url = URL.createObjectURL(pdfResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function generateAndDownloadMenuPdf(options: MenuPdfOptions): Promise<void> {
    downloadPdf(await generateMenuPdf(options));
}
