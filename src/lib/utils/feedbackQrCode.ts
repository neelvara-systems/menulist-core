/**
 * Feedback QR Code Generator
 * 
 * Generates high-resolution QR codes for feedback collection.
 * Owners can download and print these for tables/receipts.
 * 
 * @see __docs__/projects/internal-feedback-system/
 */

import { PLATFORM_URL } from '@constant/urls';
import QRCode from 'qrcode';
/**
 * QR code generation options
 */
export interface QrCodeOptions {
    /** Width in pixels (default: 1024 for print) */
    width?: number;
    /** Margin modules (default: 2) */
    margin?: number;
    /** Dark color (default: #000000) */
    darkColor?: string;
    /** Light color (default: #FFFFFF) */
    lightColor?: string;
}

/**
 * Get the base URL for the application
 */
const getBaseUrl = (): string => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_APP_URL || PLATFORM_URL;
};

/**
 * Generate feedback URL for a project
 * 
 * @param projectId - Project ID (consistent with menu URLs)
 * @returns Full feedback URL
 */
export function getFeedbackUrl(projectId: string): string {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/feedback/${projectId}`;
}

/**
 * Generate high-resolution QR code for feedback collection
 * 
 * @param projectId - Project ID
 * @param options - QR code options
 * @returns Data URL (base64) for PNG image
 * 
 * @example
 * ```typescript
 * const qrDataUrl = await generateFeedbackQrCode('abc123');
 * // Use in img tag: <img src={qrDataUrl} />
 * ```
 */
export async function generateFeedbackQrCode(
    projectId: string,
    options?: QrCodeOptions
): Promise<string> {
    const feedbackUrl = getFeedbackUrl(projectId);

    const qrOptions = {
        width: options?.width || 1024,
        margin: options?.margin || 2,
        color: {
            dark: options?.darkColor || '#000000',
            light: options?.lightColor || '#FFFFFF',
        },
        errorCorrectionLevel: 'H' as const, // High error correction for print
    };

    // Generate as data URL (base64 PNG)
    return await QRCode.toDataURL(feedbackUrl, qrOptions);
}

/**
 * Generate QR code as buffer (for server-side generation)
 * 
 * @param projectId - Project ID
 * @param options - QR code options
 * @returns PNG buffer
 */
export async function generateFeedbackQrCodeBuffer(
    projectId: string,
    options?: QrCodeOptions
): Promise<Buffer> {
    const feedbackUrl = getFeedbackUrl(projectId);

    const qrOptions = {
        width: options?.width || 1024,
        margin: options?.margin || 2,
        color: {
            dark: options?.darkColor || '#000000',
            light: options?.lightColor || '#FFFFFF',
        },
        errorCorrectionLevel: 'H' as const,
    };

    return await QRCode.toBuffer(feedbackUrl, qrOptions);
}

/**
 * Download QR code as PNG file
 * 
 * @param dataUrl - Base64 data URL from generateFeedbackQrCode
 * @param filename - Download filename (without extension)
 */
export function downloadQrCode(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Generate filename for QR code download
 * 
 * @param storeName - Store name
 * @returns Sanitized filename
 */
export function getQrCodeFilename(storeName: string): string {
    // Sanitize store name for filename
    const sanitized = storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `${sanitized}-feedback-qr`;
}
