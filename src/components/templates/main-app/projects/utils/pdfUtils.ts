/**
 * PDF Processing Utilities
 * 
 * LAZY LOADED - pdfjs-dist is only imported when this module is used
 * Import this dynamically: const { convertPdfToImages } = await import('./utils/pdfUtils')
 */

import { message } from 'antd';

// Lazy load pdfjs-dist only when needed
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
let GlobalWorkerOptions: typeof import('pdfjs-dist').GlobalWorkerOptions | null = null;

const ensurePdfLibLoaded = async () => {
    if (!pdfjsLib) {
        pdfjsLib = await import('pdfjs-dist');
        GlobalWorkerOptions = pdfjsLib.GlobalWorkerOptions;
        GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }
    return pdfjsLib;
};

let processedFiles: string[] = [];

/**
 * Converts PDF files to images with proper memory management and error handling
 * 
 * Features:
 * - Prevents memory leaks by cleaning up canvases
 * - Limits to 50 pages per PDF to prevent browser crashes
 * - Shows warnings for large PDFs (>30 pages)
 * - Handles corrupted PDFs gracefully
 * - Tracks processing time
 * 
 * @param pdfFile - Array of PDF File objects
 * @param tenantId - Tenant identifier
 * @param storeId - Store identifier
 * @returns Promise<Array> - Array of converted image objects
 */
export const convertPdfToImages = async (pdfFile: any[], tenantId: any, storeId: any) => {
    const convertedImages: any[] = [];
    const canvases: HTMLCanvasElement[] = []; // Track canvases for cleanup

    return new Promise(async (resolve) => {
        if (!pdfFile?.length) {
            resolve([]);
            return;
        }

        // Lazy load pdfjs-dist
        const pdfjs = await ensurePdfLibLoaded();

        console.log("🔄 Started PDF conversion");
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
                console.log(`📄 Processing ${file.name}: ${totalPages} pages`);

                // Check page limit (50 max as per requirements)
                if (totalPages > 50) {
                    message.error({
                        content: `"${file.name}" has ${totalPages} pages. Maximum allowed is 50 pages per PDF. Please split the PDF into smaller files.`,
                        duration: 8
                    });
                    pdf.cleanup();
                    continue; // Skip this file
                }

                // Show warning for large PDFs (30+ pages)
                if (totalPages > 30) {
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
                        console.error('Failed to get canvas context');
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
                        uid: `${tenantId}${Math.random().toString(36).substring(2, 5).toUpperCase()}${storeId}`,
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

                    // Log progress every 10 pages
                    if (i % 10 === 0) {
                        console.log(`  ✓ Processed ${i}/${totalPages} pages`);
                    }
                }

                // Clean up PDF document
                pdf.cleanup();
            }

            const processingTime = Date.now() - startTime;
            console.log(`✅ PDF conversion complete: ${(processingTime / 1000).toFixed(2)}s`);

            // Reset processed files tracker
            processedFiles = [];

            resolve(convertedImages);

        } catch (error) {
            console.error('❌ Error converting PDF:', error);
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
            console.log(`🧹 Cleaned up ${canvases.length} canvases`);
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
