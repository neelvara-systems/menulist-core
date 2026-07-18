import { FEATURE_FLAGS } from '@config/features';
import { buildQrCodeFilename, generateBrandedQrCodeDataUrl } from '@lib/utils/qrCode';
import { isPrintableAssetEditorRenderable, renderPrintableAssetEditorTemplate, renderPrintableAssetEditorTemplateFiles } from './editorDocumentAdapter';
import { getPrintableAssetType } from './assetTypes';
import { mapPrintableTemplateToMenuCardStyle } from './templateFamilies';
import type { PrintableAssetOutputFormat, PrintableAssetRenderInput, PrintableAssetRenderResult, PrintableAssetTypeId } from './types';

const PDFJS_CDN_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const PDFJS_CDN_TIMEOUT_MS = 5000;

let pdfjsLoadPromise: Promise<any> | null = null;

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

function replaceFilenameExtension(filename: string, extension: string): string {
    return filename.replace(/\.[a-z0-9]+$/i, '') + extension;
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read generated file'));
        reader.readAsDataURL(blob);
    });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate image preview'))),
            'image/png',
        );
    });
}

function getImagePdfPage(assetTypeId: PrintableAssetTypeId, width: number, height: number): {
    heightMm: number;
    widthMm: number;
} {
    if (assetTypeId === 'business_card') return { widthMm: 183, heightMm: 55 };
    if (assetTypeId === 'staff_id_card') return { widthMm: 54, heightMm: 85 };
    if (assetTypeId === 'product_tag') return { widthMm: 90, heightMm: 50 };
    if (assetTypeId === 'gift_certificate') return { widthMm: 210, heightMm: 99 };
    if (assetTypeId === 'postcard') return { widthMm: 148, heightMm: 105 };
    if (assetTypeId === 'counter_sticker') return { widthMm: 80, heightMm: 80 };
    if (assetTypeId === 'feedback_qr') return { widthMm: 100, heightMm: 150 };
    if (assetTypeId === 'event_invitation') return { widthMm: 105, heightMm: 148 };
    if (assetTypeId === 'campaign_flyer') return { widthMm: 148, heightMm: 210 };
    if (assetTypeId === 'campaign_poster') return { widthMm: 210, heightMm: 297 };

    const aspect = height > 0 ? width / height : 1;
    if (aspect >= 1) {
        const widthMm = 210;
        return { widthMm, heightMm: Math.max(1, widthMm / aspect) };
    }

    const heightMm = 297;
    return { widthMm: Math.max(1, heightMm * aspect), heightMm };
}

async function wrapImageBlobInPdf(
    imageBlob: Blob,
    assetTypeId: PrintableAssetTypeId,
    filename: string,
): Promise<PrintableAssetRenderResult> {
    const dataUrl = await blobToDataUrl(imageBlob);
    const dimensions = await new Promise<{ height: number; width: number }>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
        image.onerror = () => reject(new Error('Failed to measure generated image'));
        image.src = dataUrl;
    });
    const page = getImagePdfPage(assetTypeId, dimensions.width, dimensions.height);
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
        orientation: page.widthMm >= page.heightMm ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [page.widthMm, page.heightMm],
    });
    doc.addImage(dataUrl, 'PNG', 0, 0, page.widthMm, page.heightMm);

    return {
        blob: doc.output('blob'),
        filename: replaceFilenameExtension(filename, '.pdf'),
        label: 'PDF',
        mimeType: 'application/pdf',
        outputFormat: 'pdf',
    };
}

async function loadPdfJsFromCdn(): Promise<any> {
    const existingLib = (window as any).pdfjsLib;
    if (existingLib) {
        existingLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
        return existingLib;
    }

    if (!pdfjsLoadPromise) {
        pdfjsLoadPromise = new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${PDFJS_CDN_SRC}"]`) as HTMLScriptElement | null;
            let settled = false;
            const settle = (callback: () => void) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeout);
                callback();
            };
            const timeout = window.setTimeout(() => settle(() => {
                pdfjsLoadPromise = null;
                reject(new Error('PDF preview library load timed out'));
            }), PDFJS_CDN_TIMEOUT_MS);

            const handleLoaded = () => {
                const loadedLib = (window as any).pdfjsLib;
                if (!loadedLib) {
                    settle(() => {
                        pdfjsLoadPromise = null;
                        reject(new Error('PDF preview library loaded but was unavailable'));
                    });
                    return;
                }
                loadedLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
                settle(() => resolve(loadedLib));
            };

            if (existingScript) {
                if (existingScript.dataset.menulistPdfjsLoaded === 'true') {
                    queueMicrotask(handleLoaded);
                    return;
                }
                existingScript.addEventListener('load', handleLoaded, { once: true });
                existingScript.addEventListener('error', () => {
                    settle(() => {
                        pdfjsLoadPromise = null;
                        reject(new Error('Failed to load PDF preview library'));
                    });
                }, { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = PDFJS_CDN_SRC;
            script.async = true;
            script.onload = () => {
                script.dataset.menulistPdfjsLoaded = 'true';
                handleLoaded();
            };
            script.onerror = () => {
                settle(() => {
                    pdfjsLoadPromise = null;
                    reject(new Error('Failed to load PDF preview library'));
                });
            };
            document.head.appendChild(script);
        });
    }

    return pdfjsLoadPromise;
}

async function loadPdfJsForPreview(): Promise<any> {
    if (typeof window === 'undefined') {
        throw new Error('PDF preview is only available in the browser');
    }

    try {
        return await loadPdfJsFromCdn();
    } catch {
        return import('pdfjs-dist/legacy/build/pdf.mjs');
    }
}

async function renderPdfFirstPageToPng(
    pdfBlob: Blob,
    filename: string,
): Promise<PrintableAssetRenderResult> {
    const pdfjs = await loadPdfJsForPreview();
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data: bytes, disableWorker: true, useSystemFonts: true } as any);
    const pdf = await loadingTask.promise;

    try {
        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const maxCanvasWidth = 1800;
        const scale = Math.max(1, Math.min(2.5, maxCanvasWidth / Math.max(1, baseViewport.width)));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Failed to render PDF preview');
        await page.render({ canvasContext: context, viewport } as any).promise;
        return {
            blob: await canvasToPngBlob(canvas),
            filename: replaceFilenameExtension(filename, '.png'),
            label: 'Image',
            mimeType: 'image/png',
            outputFormat: 'png',
        };
    } finally {
        await pdf.destroy();
    }
}

async function convertResultFormat(
    result: PrintableAssetRenderResult,
    input: PrintableAssetRenderInput,
    requestedFormat: PrintableAssetOutputFormat,
): Promise<PrintableAssetRenderResult> {
    if (result.outputFormat === requestedFormat) return result;

    if (requestedFormat === 'png' && result.mimeType === 'application/pdf') {
        return renderPdfFirstPageToPng(result.blob, result.filename);
    }

    if (requestedFormat === 'pdf' && result.mimeType === 'image/png') {
        return wrapImageBlobInPdf(result.blob, input.assetTypeId, result.filename);
    }

    return result;
}

export async function renderPrintableAsset(input: PrintableAssetRenderInput): Promise<PrintableAssetRenderResult> {
    const assetType = getPrintableAssetType(input.assetTypeId);
    const requestedFormat = input.outputFormat || assetType.outputFormat;

    if (
        FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_EDITOR_RENDERER
        && requestedFormat !== 'zip'
        && isPrintableAssetEditorRenderable(input.assetTypeId)
    ) {
        return renderPrintableAssetEditorTemplate({
            ...input,
            outputFormat: requestedFormat,
        });
    }

    if (input.assetTypeId === 'print_menu') {
        if (!input.printMenuOptions) {
            throw new Error('Print menu options are required');
        }
        const { generateMenuPdf } = await import('@lib/export/menuPdfGenerator');
        const result = await generateMenuPdf({
            ...input.printMenuOptions,
            styleId: mapPrintableTemplateToMenuCardStyle(input.templateFamilyId),
        });
        return convertResultFormat({
            blob: result.blob,
            filename: result.filename,
            label: assetType.title,
            mimeType: 'application/pdf',
            outputFormat: 'pdf',
        }, input, requestedFormat);
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
        return convertResultFormat({
            blob: dataUrlToBlob(dataUrl),
            filename: `${safeName(input.storeName)}_${buildQrCodeFilename('feedback', 'qr')}.png`,
            label: assetType.title,
            mimeType: 'image/png',
            outputFormat: 'png',
        }, input, requestedFormat);
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
            filename: result.zipFilename,
            label: assetType.title,
            mimeType: 'application/zip',
            outputFormat: 'zip',
        };
    }

    if (!assetType.menuKitAssetKey) {
        throw new Error(`Unsupported printable asset: ${input.assetTypeId}`);
    }

    const result = await generateMenuKitAsset(menuKitInput, assetType.menuKitAssetKey, { outputFormat: requestedFormat === 'png' ? 'png' : 'pdf' });
    const nativeFormat: PrintableAssetOutputFormat = result.mimeType === 'application/pdf' ? 'pdf' : 'png';
    return convertResultFormat({
        ...result,
        outputFormat: nativeFormat,
    }, input, requestedFormat);
}

export async function renderPrintableAssetDownloadFiles(input: PrintableAssetRenderInput): Promise<PrintableAssetRenderResult[]> {
    const assetType = getPrintableAssetType(input.assetTypeId);
    const requestedFormat = input.outputFormat || assetType.outputFormat;

    if (
        FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_EDITOR_RENDERER
        && requestedFormat !== 'zip'
        && isPrintableAssetEditorRenderable(input.assetTypeId)
    ) {
        return renderPrintableAssetEditorTemplateFiles({
            ...input,
            outputFormat: requestedFormat,
        });
    }

    return [await renderPrintableAsset(input)];
}
