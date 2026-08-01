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
import { buildDefaultSettings, menuCardPresetRegistry } from '@lib/menu-card-export/presets/presetRegistry';
import { renderPdf } from '@lib/menu-card-export/render/renderPdf';
import { buildPrintSource, normalizeMenuCardLogoUrl } from '@lib/menu-card-export/source/buildPrintSource';
import { normalizeMenuCardQrDestination } from '@lib/menu-card-export/source/buildQrDestination';
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

function readOwnField(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        return Object.prototype.hasOwnProperty.call(value, key)
            ? (value as Record<string, unknown>)[key]
            : undefined;
    } catch {
        return undefined;
    }
}

function boundedText(value: unknown, maxLength = 1_500): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.slice(0, maxLength).trim();
    return normalized || undefined;
}

function snapshotArray(value: unknown): any[] {
    if (!Array.isArray(value)) return [];
    try {
        return Array.from(value).slice(0, 10_000);
    } catch {
        return [];
    }
}

function projectLegacyStoreData(value: unknown): Record<string, any> {
    const publicPresence = readOwnField(value, 'publicPresence');
    return {
        activePlanType: boundedText(readOwnField(value, 'activePlanType'), 64) || null,
        address: boundedText(readOwnField(value, 'address'), 500),
        addressLine: boundedText(readOwnField(value, 'addressLine'), 500),
        brandColor: boundedText(readOwnField(value, 'brandColor'), 32),
        businessCategory: boundedText(readOwnField(value, 'businessCategory'), 120),
        businessIndustry: boundedText(readOwnField(value, 'businessIndustry'), 120),
        businessName: boundedText(readOwnField(value, 'businessName'), 240),
        businessType: boundedText(readOwnField(value, 'businessType'), 120),
        currency: boundedText(readOwnField(value, 'currency'), 16),
        currencyCode: boundedText(readOwnField(value, 'currencyCode'), 16),
        currencySymbol: boundedText(readOwnField(value, 'currencySymbol'), 16),
        logo: normalizeMenuCardLogoUrl(readOwnField(value, 'logo')),
        logoUrl: normalizeMenuCardLogoUrl(readOwnField(value, 'logoUrl')),
        name: boundedText(readOwnField(value, 'name'), 240),
        phone: boundedText(readOwnField(value, 'phone'), 80),
        phoneNumber: boundedText(readOwnField(value, 'phoneNumber'), 80),
        primaryColor: boundedText(readOwnField(value, 'primaryColor'), 32),
        publicPresence: {
            accentColor: boundedText(readOwnField(publicPresence, 'accentColor'), 32),
            activePlanType: boundedText(readOwnField(publicPresence, 'activePlanType'), 64) || null,
            businessCategory: boundedText(readOwnField(publicPresence, 'businessCategory'), 120),
            businessType: boundedText(readOwnField(publicPresence, 'businessType'), 120),
            logoUrl: normalizeMenuCardLogoUrl(readOwnField(publicPresence, 'logoUrl')),
            phone: boundedText(readOwnField(publicPresence, 'phone'), 80),
        },
        storeName: boundedText(readOwnField(value, 'storeName'), 240),
        themeColor: boundedText(readOwnField(value, 'themeColor'), 32),
    };
}

export function normalizeLegacyMenuPdfOptions(value: unknown): MenuPdfOptions | null {
    const projectName = boundedText(readOwnField(value, 'projectName'), 240);
    const storeName = boundedText(readOwnField(value, 'storeName'), 240);
    const language = boundedText(readOwnField(value, 'language'), 35);
    if (!projectName || !storeName || !language) return null;

    const menuUrlValue = readOwnField(value, 'menuUrl');
    const menuUrl = typeof menuUrlValue === 'string'
        ? normalizeMenuCardQrDestination(menuUrlValue) || undefined
        : undefined;
    const projectIdCandidate = boundedText(readOwnField(value, 'projectId'));
    const projectId = projectIdCandidate && !projectIdCandidate.includes('/') ? projectIdCandidate : undefined;
    const projectData = readOwnField(value, 'projectData');
    const updatedAt = readOwnField(value, 'updatedAt');
    const projectDataUpdatedAt = readOwnField(projectData, 'modifiedOn')
        ?? readOwnField(projectData, 'updatedAt');
    const optionalText = (key: string, maxLength: number) => boundedText(readOwnField(value, key), maxLength);
    const activePlanTypeValue = readOwnField(value, 'activePlanType');
    const showDescriptions = readOwnField(value, 'showDescriptions');
    const showQrCode = readOwnField(value, 'showQrCode');
    const showUpdatedOn = readOwnField(value, 'showUpdatedOn');
    const currency = optionalText('currency', 16);
    const currencyCode = optionalText('currencyCode', 16);
    const brandColor = optionalText('brandColor', 32);
    const headerColor = optionalText('headerColor', 32);
    const address = optionalText('address', 500);
    const contactLine = optionalText('contactLine', 80);
    const logoUrl = normalizeMenuCardLogoUrl(readOwnField(value, 'logoUrl'));
    const businessType = optionalText('businessType', 120);
    const businessCategory = optionalText('businessCategory', 120);
    const styleIdCandidate = optionalText('styleId', 32);
    const styleId = styleIdCandidate === 'classic' || styleIdCandidate === 'compact' || styleIdCandidate === 'premium'
        ? styleIdCandidate
        : undefined;
    const presetCandidate = optionalText('preset', 64);
    const preset = menuCardPresetRegistry.some((entry) => entry.id === presetCandidate)
        ? presetCandidate as MenuCardExportPreset
        : undefined;

    return {
        projectName,
        storeName,
        language,
        items: snapshotArray(readOwnField(value, 'items')),
        categories: snapshotArray(readOwnField(value, 'categories')),
        ...(menuUrl ? { menuUrl } : {}),
        ...(projectId ? { projectId } : {}),
        ...(currency ? { currency } : {}),
        ...(currencyCode ? { currencyCode } : {}),
        ...(brandColor ? { brandColor } : {}),
        ...(headerColor ? { headerColor } : {}),
        ...(address ? { address } : {}),
        ...(contactLine ? { contactLine } : {}),
        ...(logoUrl ? { logoUrl } : {}),
        ...(businessType ? { businessType } : {}),
        ...(businessCategory ? { businessCategory } : {}),
        ...(activePlanTypeValue === null
            ? { activePlanType: null }
            : boundedText(activePlanTypeValue, 64)
                ? { activePlanType: boundedText(activePlanTypeValue, 64) }
                : {}),
        ...(typeof showDescriptions === 'boolean' ? { showDescriptions } : {}),
        ...(typeof showQrCode === 'boolean' ? { showQrCode } : {}),
        ...(typeof showUpdatedOn === 'boolean' ? { showUpdatedOn } : {}),
        ...(styleId ? { styleId } : {}),
        ...(preset ? { preset } : {}),
        ...(updatedAt !== undefined || projectDataUpdatedAt !== undefined
            ? { updatedAt: updatedAt ?? projectDataUpdatedAt }
            : {}),
        projectData: {
            defaultLanguage: language,
            modifiedOn: updatedAt ?? projectDataUpdatedAt ?? null,
            name: projectName,
            projectId: projectId || '',
        },
        storeData: projectLegacyStoreData(readOwnField(value, 'storeData')),
    };
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

export function resolveLegacyMenuPdfIncludeQr(
    menuUrl: unknown,
    requested: boolean | undefined,
    autoDefault: boolean,
): boolean {
    if (typeof menuUrl !== 'string' || !normalizeMenuCardQrDestination(menuUrl)) {
        return false;
    }
    return requested ?? autoDefault;
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
            includeQr: resolveLegacyMenuPdfIncludeQr(
                options.menuUrl,
                options.showQrCode,
                autoDesign.settings.includeQr,
            ),
            includeContactBlock: true,
            includeUpdatedDate: options.showUpdatedOn ?? true,
        },
    };
}

export async function generateMenuPdf(options: MenuPdfOptions): Promise<GeneratedPdf> {
    const admittedOptions = normalizeLegacyMenuPdfOptions(options);
    if (!admittedOptions) throw new Error('Invalid Menu PDF input');
    const { project, store, settings } = normalizeSettings(admittedOptions);
    const source = buildPrintSource({
        project,
        store,
        menuUrl: admittedOptions.menuUrl || '',
        language: admittedOptions.language,
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
