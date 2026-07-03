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
import { generateMenuFileUid } from '../utils';
import { MAX_PDF_PAGES, WARN_PDF_PAGES } from '../constants';

const PDFJS_CDN_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsLoadPromise: Promise<any> | null = null;

const ensurePdfLibLoaded = async () => {
    if (typeof window === 'undefined') {
        throw new Error('PDF conversion is only available in the browser.');
    }

    const existingLib = (window as any).pdfjsLib;
    if (existingLib) {
        existingLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
        return existingLib;
    }

    if (!pdfjsLoadPromise) {
        pdfjsLoadPromise = new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${PDFJS_CDN_SRC}"]`) as HTMLScriptElement | null;

            if (existingScript) {
                existingScript.addEventListener('load', () => {
                    const loadedLib = (window as any).pdfjsLib;
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
                const loadedLib = (window as any).pdfjsLib;
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

    return pdfjsLoadPromise;
};

let processedFiles: string[] = [];

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
};

export const convertPdfToImages = async (
    pdfFile: any[],
    tenantId: any,
    storeId: any,
    options: ConvertPdfToImagesOptions = {},
) => {
    const convertedImages: any[] = [];
    const canvases: HTMLCanvasElement[] = []; // Track canvases for cleanup
    const requestedPageLimit = typeof options.maxPages === 'number' && Number.isFinite(options.maxPages)
        ? Math.floor(options.maxPages)
        : MAX_PDF_PAGES;
    const pageLimit = Math.max(0, Math.min(MAX_PDF_PAGES, requestedPageLimit));

    return new Promise(async (resolve) => {
        if (!pdfFile?.length) {
            resolve([]);
            return;
        }

        // Lazy load pdfjs-dist
        const pdfjs = await ensurePdfLibLoaded();

        const startTime = Date.now();

        try {
            // Process each PDF file sequentially (as user requested)
            for (const file of pdfFile) {
                // Skip already processed files
                if (processedFiles.includes(file.uid)) continue;
                processedFiles.push(file.uid);

                const fileArrayBuffer = await file.arrayBuffer();

                let pdf;
                try {
                    pdf = await pdfjs.getDocument({ data: fileArrayBuffer }).promise;
                } catch (pdfError: any) {
                    // Handle corrupted PDF
                    if (pdfError.name === 'InvalidPDFException' || pdfError.message?.includes('Invalid')) {
                        message.error({
                            content: `"${file.name}" is corrupted or invalid. Please try a different PDF file.`,
                            duration: 6
                        });
                        continue; // Skip this file, continue with others
                    }
                    throw pdfError; // Re-throw other errors
                }

                const totalPages = pdf.numPages;

                // Keep page limit aligned with backend extraction job file cap and the caller's remaining upload slots.
                if (totalPages > MAX_PDF_PAGES || totalPages > pageLimit) {
                    const limitMessage = pageLimit < MAX_PDF_PAGES
                        ? `"${file.name}" has ${totalPages} pages. This upload has ${pageLimit} page${pageLimit === 1 ? '' : 's'} left. Remove selected files or split the PDF.`
                        : `"${file.name}" has ${totalPages} pages. Maximum allowed is ${MAX_PDF_PAGES} pages per PDF. Please split the PDF into smaller files.`;
                    message.error({
                        content: limitMessage,
                        duration: 8
                    });
                    pdf.cleanup();
                    continue; // Skip this file
                }

                // Show warning for large PDFs close to the processing cap.
                if (totalPages > WARN_PDF_PAGES) {
                    message.warning({
                        content: `"${file.name}" has ${totalPages} pages. This will take a few minutes to process and may use significant AI credits.`,
                        duration: 8
                    });
                }

                // Process each page of the current PDF
                for (let i = 1; i <= totalPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });

                    // Create canvas with optimized settings
                    const canvas = document.createElement('canvas');
                    canvases.push(canvas); // Track for cleanup

                    // Use willReadFrequently: false for better performance
                    const context = canvas.getContext('2d', { willReadFrequently: false });
                    if (!context) {
                        logMenuProcessingFailure('menu_pdf_conversion_canvas_context_missing', undefined, {
                            ...getBoundedMenuProcessingStringContext('fileUid', file.uid),
                            pageIndex: i,
                            totalPages,
                        });
                        continue;
                    }

                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    // Render page to canvas
                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;

                    // Convert to JPEG with 80% quality (good balance for OCR)
                    const pageUrl = canvas.toDataURL('image/jpeg', 0.8);

                    const imageData = {
                        uid: generateMenuFileUid(tenantId, storeId),
                        name: `${file.name.replace('.pdf', '')}-page-${i}.jpg`,
                        size: Math.round(pageUrl.length * 0.75), // Approximate size from base64
                        type: 'image/jpeg',
                        url: pageUrl,
                        fileId: file.uid
                    };
                    convertedImages.push(imageData);

                    // ✅ CRITICAL: Clean up canvas immediately after conversion
                    // This prevents memory leaks on large PDFs
                    canvas.width = 0;
                    canvas.height = 0;
                    context.clearRect(0, 0, canvas.width, canvas.height);

                    // Clean up page
                    page.cleanup();
                }

                // Clean up PDF document
                pdf.cleanup();
            }

            // Reset processed files tracker
            processedFiles = [];

            resolve(convertedImages);

        } catch (error) {
            logMenuProcessingFailure('menu_pdf_conversion_failed', error, {
                fileCount: pdfFile.length,
                convertedImageCount: convertedImages.length,
                elapsedMs: Date.now() - startTime,
            });
            message.error({
                content: 'Failed to convert PDF. Please try again or contact support if the issue persists.',
                duration: 6
            });
            resolve([]); // Return empty array instead of rejecting

        } finally {
            // ✅ CRITICAL: Ensure all canvases are cleaned up even on error
            canvases.forEach(canvas => {
                canvas.width = 0;
                canvas.height = 0;
            });
        }
    });
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
    processedFiles = [];
};
