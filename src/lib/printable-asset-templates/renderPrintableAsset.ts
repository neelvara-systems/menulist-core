import { buildQrCodeFilename, generateBrandedQrCodeDataUrl } from '@lib/utils/qrCode';
import { getPrintableAssetType } from './assetTypes';
import { mapPrintableTemplateToMenuCardStyle } from './templateFamilies';
import type { PrintableAssetRenderInput, PrintableAssetRenderResult } from './types';

function dataUrlToBlob(dataUrl: string): Blob {
    const [header, payload] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/png';
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
}

function safeName(value: string): string {
    return value.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_') || 'Menu';
}

export async function renderPrintableAsset(input: PrintableAssetRenderInput): Promise<PrintableAssetRenderResult> {
    const assetType = getPrintableAssetType(input.assetTypeId);

    if (input.assetTypeId === 'print_menu') {
        if (!input.printMenuOptions) {
            throw new Error('Print menu options are required');
        }
        const { generateMenuPdf } = await import('@lib/export/menuPdfGenerator');
        const result = await generateMenuPdf({
            ...input.printMenuOptions,
            styleId: mapPrintableTemplateToMenuCardStyle(input.templateFamilyId),
        });
        return {
            blob: result.blob,
            filename: result.filename,
            label: assetType.title,
            mimeType: 'application/pdf',
        };
    }

    if (input.assetTypeId === 'feedback_qr') {
        if (!input.projectId) {
            throw new Error('Project ID is required for Feedback QR');
        }
        const dataUrl = await generateBrandedQrCodeDataUrl(input.feedbackUrl || input.menuUrl, {
            activePlanType: input.activePlanType,
            brandColor: input.brandColor,
            footer: (input.feedbackUrl || input.menuUrl).replace(/^https?:\/\//, ''),
            logoUrl: input.logoUrl || undefined,
            storeName: input.storeName,
            subtitle: 'Scan to leave feedback',
            templateFamilyId: input.templateFamilyId,
            title: 'Feedback QR',
        });
        return {
            blob: dataUrlToBlob(dataUrl),
            filename: `${safeName(input.storeName)}_${buildQrCodeFilename('feedback', 'qr')}.png`,
            label: assetType.title,
            mimeType: 'image/png',
        };
    }

    const { generateMenuKit, generateMenuKitAsset } = await import('@lib/menu-kit/menuKitGenerator');
    const menuKitInput = {
        activePlanType: input.activePlanType,
        brandColor: input.brandColor,
        businessCategory: input.businessCategory,
        businessType: input.businessType,
        lastPublishedAt: input.lastPublishedAt,
        locale: input.locale,
        logoUrl: input.logoUrl || undefined,
        menuUrl: input.menuUrl,
        shortLink: input.shortLink,
        storeName: input.storeName,
        templateFamilyId: input.templateFamilyId,
    };

    if (input.assetTypeId === 'complete_menu_kit') {
        const result = await generateMenuKit(menuKitInput);
        return {
            blob: result.zipBlob,
            filename: `${safeName(input.storeName)}_MenuKit_${input.templateFamilyId}.zip`,
            label: assetType.title,
            mimeType: 'application/zip',
        };
    }

    if (!assetType.menuKitAssetKey) {
        throw new Error(`Unsupported printable asset: ${input.assetTypeId}`);
    }

    return generateMenuKitAsset(menuKitInput, assetType.menuKitAssetKey);
}
