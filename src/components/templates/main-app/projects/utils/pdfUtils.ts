/**
 * PDF Processing Utilities
 * 
 * LAZY LOADED - pdfjs-dist is only imported when this module is used
 * Import this dynamically: const { convertPdfToImages } = await import('./utils/pdfUtils')
 */

import { message } from 'antd';
import {
    getBoundedMenuProcessingStringContext,
    logMenuProcessingFailure,
} from '@lib/firebase/menuProcessingDiagnostics';
import { getBoundedErrorName, getBoundedErrorStringField } from '@lib/monitoring/boundedLogContext';
import { generateMenuFileUid } from '../utils';
import { MAX_PDF_PAGES, WARN_PDF_PAGES } from '../constants';

const PDFJS_CDN_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

type PdfJsPage = {
    cleanup: () => void;
    getViewport: (options: { scale: number }) => { height: number; width: number };
    render: (options: {
        canvasContext: CanvasRenderingContext2D;
        viewport: { height: number; width: number };
    }) => { promise: Promise<void> };
};

type PdfJsDocument = {
    cleanup: () => void;
    getPage: (pageNumber: number) => Promise<PdfJsPage>;
    numPages: number;
};

type PdfJsLibrary = {
    GlobalWorkerOptions: { workerSrc: string };
    getDocument: (options: { data: ArrayBuffer }) => { promise: Promise<PdfJsDocument> };
};

type PdfUploadFile = {
    arrayBuffer: () => Promise<ArrayBuffer>;
    name: string;
    uid: string;
};

export type ConvertedPdfImage = {
    fileId: string;
    name: string;
    size: number;
    type: 'image/jpeg';
    uid: string;
    url: string;
};

let pdfjsLoadPromise: Promise<PdfJsLibrary> | null = null;

const getLoadedPdfJs = (): PdfJsLibrary | null => {
    const candidate = (window as Window & { pdfjsLib?: unknown }).pdfjsLib;
    if (!candidate || typeof candidate !== 'object') return null;
    return candidate as PdfJsLibrary;
};

const ensurePdfLibLoaded = async (): Promise<PdfJsLibrary> => {
    if (typeof window === 'undefined') {
        throw new Error('PDF conversion is only available in the browser.');
    }

    const existingLib = getLoadedPdfJs();
    if (existingLib) {
        existingLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
        return existingLib;
    }

    if (!pdfjsLoadPromise) {
        pdfjsLoadPromise = new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${PDFJS_CDN_SRC}"]`) as HTMLScriptElement | null;

            if (existingScript) {
                existingScript.addEventListener('load', () => {
                    const loadedLib = getLoadedPdfJs();
                    if (!loadedLib) {
                        reject(new Error('PDF library loaded but pdfjsLib was unavailable.'));
                        return;
                    }
                    loadedLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
                    resolve(loadedLib);
                }, { once: true });
                existingScript.addEventListener('error', () => reject(new Error('Failed to load PDF library.')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = PDFJS_CDN_SRC;
            script.async = true;
            script.onload = () => {
                const loadedLib = getLoadedPdfJs();
                if (!loadedLib) {
                    reject(new Error('PDF library loaded but pdfjsLib was unavailable.'));
                    return;
                }
                loadedLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
                resolve(loadedLib);
            };
            script.onerror = () => reject(new Error('Failed to load PDF library.'));
            document.head.appendChild(script);
        });
    }

    try {
        return await pdfjsLoadPromise;
    } catch (error) {
        pdfjsLoadPromise = null;
        throw error;
    }
};

/**
 * Converts PDF files to images with proper memory management and error handling
 * 
 * Features:
 * - Prevents memory leaks by cleaning up canvases
 * - Limits pages per PDF to the shared extraction job file cap
 * - Shows warnings for large PDFs near that cap
 * - Handles corrupted PDFs gracefully
 * - Tracks processing time
 * 
 * @param pdfFile - Array of PDF File objects
 * @param tenantId - Tenant identifier
 * @param storeId - Store identifier
 * @returns Promise<Array> - Array of converted image objects
 */
type ConvertPdfToImagesOptions = {
    maxPages?: number;
    onIssue?: (issue: PdfConversionIssue) => void;
    requireAllPages?: boolean;
    showMessages?: boolean;
};

export type PdfConversionIssue = {
    code: 'canvas_unavailable' | 'conversion_failed' | 'invalid_pdf' | 'large_pdf' | 'page_limit';
    fileName?: string;
    pageLimit?: number;
    totalPages?: number;
};

export const convertPdfToImages = async (
    pdfFile: PdfUploadFile[],
    tenantId: string | number,
    storeId: string | number,
    options: ConvertPdfToImagesOptions = {},
): Promise<ConvertedPdfImage[]> => {
    const convertedImages: ConvertedPdfImage[] = [];
    const canvases: HTMLCanvasElement[] = []; // Track canvases for cleanup
    const processedFileUids = new Set<string>();
    const requestedPageLimit = typeof options.maxPages === 'number' && Number.isFinite(options.maxPages)
        ? Math.floor(options.maxPages)
        : MAX_PDF_PAGES;
    const pageLimit = Math.max(0, Math.min(MAX_PDF_PAGES, requestedPageLimit));
    const showMessages = options.showMessages !== false;
    const startTime = Date.now();

    if (!pdfFile?.length) return [];

    try {
        const pdfjs = await ensurePdfLibLoaded();

        // Process each PDF sequentially to keep browser memory bounded.
        for (const file of pdfFile) {
            if (processedFileUids.has(file.uid)) continue;
            processedFileUids.add(file.uid);

            const fileArrayBuffer = await file.arrayBuffer();
            let pdf: PdfJsDocument | null = null;
            try {
                try {
                    pdf = await pdfjs.getDocument({ data: fileArrayBuffer }).promise;
                } catch (pdfError) {
                    const errorName = getBoundedErrorName(pdfError) || '';
                    const errorMessage = getBoundedErrorStringField(pdfError, 'message') || '';
                    if (errorName === 'InvalidPDFException' || errorMessage.includes('Invalid')) {
                        options.onIssue?.({ code: 'invalid_pdf', fileName: file.name });
                        if (showMessages) {
                            message.error({
                                content: `"${file.name}" is corrupted or invalid. Please try a different PDF file.`,
                                duration: 6
                            });
                        }
                        continue;
                    }
                    throw pdfError;
                }

                const totalPages = pdf.numPages;

                // Keep page limit aligned with backend extraction job file cap and the caller's remaining upload slots.
                if (totalPages > MAX_PDF_PAGES || totalPages > pageLimit) {
                    const limitMessage = pageLimit < MAX_PDF_PAGES
                        ? `"${file.name}" has ${totalPages} pages. This upload has ${pageLimit} page${pageLimit === 1 ? '' : 's'} left. Remove selected files or split the PDF.`
                        : `"${file.name}" has ${totalPages} pages. Maximum allowed is ${MAX_PDF_PAGES} pages per PDF. Please split the PDF into smaller files.`;
                    options.onIssue?.({ code: 'page_limit', fileName: file.name, pageLimit, totalPages });
                    if (showMessages) {
                        message.error({
                            content: limitMessage,
                            duration: 8
                        });
                    }
                    continue; // Skip this file
                }

                // Show warning for large PDFs close to the processing cap.
                if (totalPages > WARN_PDF_PAGES) {
                    options.onIssue?.({ code: 'large_pdf', fileName: file.name, totalPages });
                    if (showMessages) {
                        message.warning({
                            content: `"${file.name}" has ${totalPages} pages. This will take a few minutes to process.`,
                            duration: 8
                        });
                    }
                }

                // Process each page of the current PDF
                for (let i = 1; i <= totalPages; i++) {
                    let page: PdfJsPage | null = null;
                    const canvas = document.createElement('canvas');
                    canvases.push(canvas); // Track for cleanup
                    try {
                        page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 1.5 });
                        const context = canvas.getContext('2d', { willReadFrequently: false });
                        if (!context) {
                            logMenuProcessingFailure('menu_pdf_conversion_canvas_context_missing', undefined, {
                                ...getBoundedMenuProcessingStringContext('fileUid', file.uid),
                                pageIndex: i,
                                totalPages,
                            });
                            options.onIssue?.({ code: 'canvas_unavailable', fileName: file.name, totalPages });
                            if (options.requireAllPages) {
                                throw new Error('menu_pdf_conversion_canvas_context_missing');
                            }
                            continue;
                        }

                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        await page.render({ canvasContext: context, viewport }).promise;
                        const pageUrl = canvas.toDataURL('image/jpeg', 0.8);
                        convertedImages.push({
                            uid: generateMenuFileUid(tenantId, storeId),
                            name: `${file.name.replace(/\.pdf$/i, '')}-page-${i}.jpg`,
                            size: Math.round(pageUrl.length * 0.75),
                            type: 'image/jpeg',
                            url: pageUrl,
                            fileId: file.uid
                        });
                    } finally {
                        page?.cleanup();
                        canvas.width = 0;
                        canvas.height = 0;
                    }
                }
            } finally {
                pdf?.cleanup();
            }
        }

        return convertedImages;
    } catch (error) {
        logMenuProcessingFailure('menu_pdf_conversion_failed', error, {
            fileCount: pdfFile.length,
            convertedImageCount: convertedImages.length,
            elapsedMs: Date.now() - startTime,
        });
        options.onIssue?.({ code: 'conversion_failed' });
        if (showMessages) {
            message.error({
                content: 'Failed to convert PDF. Please try again or contact support if the issue persists.',
                duration: 6
            });
        }
        return [];
    } finally {
        canvases.forEach(canvas => {
            canvas.width = 0;
            canvas.height = 0;
        });
    }
};

/**
 * Check if a file is a PDF
 */
export const isPdfFile = (file: { type?: string; name?: string }): boolean => {
    return file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf') || false;
};

/**
 * Reset the processed files tracker (useful for testing)
 */
export const resetProcessedFiles = () => {
    // Retained for compatibility. Processing state is now scoped to each call.
};
