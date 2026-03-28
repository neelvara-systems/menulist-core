import { ExecutionSurface, ExportMethod } from "@type/campaigns";

// ═══════════════════════════════════════════════════════════════
// EXECUTION SURFACES
// 
// Per Strategy Doc:
// - Owner never chooses where. MenuList decides.
// - One primary surface per campaign
// - Export-only execution (no direct posting at launch)
// 
// Launch Priority (per spec):
// 1. WhatsApp Status (primary India surface)
// 2. Printable Poster (captures non-digital owners)
// 3. WhatsApp Message copy (zero friction)
// ═══════════════════════════════════════════════════════════════

/**
 * Surface execution result
 */
export interface SurfaceExecutionResult {
    success: boolean;
    method: ExportMethod;
    surface: ExecutionSurface;
    error?: string;
}

// ═══════════════════════════════════════════════════════════════
// WHATSAPP STATUS (PRIMARY - INDIA)
// 
// Per Strategy Doc:
// - Zero friction, high visibility
// - One tap → opens WhatsApp Status share
// - Uses deep link for mobile, clipboard fallback for desktop
// ═══════════════════════════════════════════════════════════════

/**
 * Share to WhatsApp Status
 * Uses native share API with WhatsApp deep link fallback
 */
export async function shareToWhatsAppStatus(
    imageUrl: string,
    caption?: string
): Promise<SurfaceExecutionResult> {
    try {
        // Check if Web Share API is available (mobile-first approach)
        if (navigator.share && navigator.canShare) {
            // Fetch image and convert to blob for sharing
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'menulist-share.jpg', { type: 'image/jpeg' });

            const shareData: ShareData = {
                files: [file],
                title: caption || 'Check this out!',
            };

            if (navigator.canShare(shareData)) {
                await navigator.share(shareData);
                return {
                    success: true,
                    method: 'whatsapp_share',
                    surface: 'whatsapp_status'
                };
            }
        }

        // Fallback: Open WhatsApp with image URL
        // Note: WhatsApp doesn't support direct status share via URL scheme
        // Best fallback is to copy to clipboard and guide user
        await copyToClipboard(imageUrl);

        return {
            success: true,
            method: 'copy_text',
            surface: 'whatsapp_status',
        };
    } catch (error) {
        console.error('WhatsApp Status share failed:', error);
        return {
            success: false,
            method: 'whatsapp_share',
            surface: 'whatsapp_status',
            error: 'Share failed. Please try again.'
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// WHATSAPP MESSAGE (COPY-READY)
// 
// Per Strategy Doc:
// - Copy-ready message, owner pastes into chats
// - Sample tone: "Hi 👋 {Item} is available today."
// - No offers, no emoji spam
// ═══════════════════════════════════════════════════════════════

/**
 * Generate WhatsApp message for an item
 * Per Strategy Doc: "No offers, no emoji spam"
 */
export function generateWhatsAppMessage(
    itemName: string,
    menuLink?: string
): string {
    let message = `Hi 👋\n\n${itemName} is available today. Sharing in case you're planning to visit.`;

    if (menuLink) {
        message += `\n\nView menu: ${menuLink}`;
    }

    return message;
}

/**
 * Copy WhatsApp message to clipboard
 */
export async function copyWhatsAppMessage(
    itemName: string,
    menuLink?: string
): Promise<SurfaceExecutionResult> {
    try {
        const message = generateWhatsAppMessage(itemName, menuLink);
        await copyToClipboard(message);

        return {
            success: true,
            method: 'copy_text',
            surface: 'whatsapp_message'
        };
    } catch (error) {
        console.error('Copy to clipboard failed:', error);
        return {
            success: false,
            method: 'copy_text',
            surface: 'whatsapp_message',
            error: 'Copy failed. Please try again.'
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// PRINTABLE POSTER
// 
// Per Strategy Doc:
// - A4/A5 PDF, brand colors, QR code auto-added
// - Owner action: "Print & place near counter"
// - Captures non-digital owners
// ═══════════════════════════════════════════════════════════════

/**
 * Download printable poster
 * For now, downloads the image directly
 * TODO: PDF generation with QR code in future
 */
export async function downloadPoster(
    imageUrl: string,
    itemName: string
): Promise<SurfaceExecutionResult> {
    try {
        // Fetch image
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${sanitizeFilename(itemName)}-poster.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return {
            success: true,
            method: 'download',
            surface: 'print_poster'
        };
    } catch (error) {
        console.error('Poster download failed:', error);
        return {
            success: false,
            method: 'download',
            surface: 'print_poster',
            error: 'Download failed. Please try again.'
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// QR TENT CARD
// 
// Per Strategy Doc:
// - Small printable tent, one item highlighted, QR code
// - Best Seller Boost, combo suggestions
// - Feel: Operational, not promotional
// ═══════════════════════════════════════════════════════════════

/**
 * Download QR tent card
 * For now, same as poster download
 * TODO: Generate tent card format with QR code
 */
export async function downloadQrTent(
    imageUrl: string,
    itemName: string
): Promise<SurfaceExecutionResult> {
    try {
        // Same as poster for now
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${sanitizeFilename(itemName)}-tent-card.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return {
            success: true,
            method: 'download',
            surface: 'qr_tent'
        };
    } catch (error) {
        console.error('QR tent download failed:', error);
        return {
            success: false,
            method: 'download',
            surface: 'qr_tent',
            error: 'Download failed. Please try again.'
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// DIGITAL SCREEN IMAGE
// 
// Per Strategy Doc:
// - 16:9 image, no text overload, big image + price
// - Owner uploads to TV manually
// ═══════════════════════════════════════════════════════════════

/**
 * Download digital screen image
 */
export async function downloadDigitalScreen(
    imageUrl: string,
    itemName: string
): Promise<SurfaceExecutionResult> {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${sanitizeFilename(itemName)}-screen.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return {
            success: true,
            method: 'download',
            surface: 'digital_screen'
        };
    } catch (error) {
        console.error('Digital screen download failed:', error);
        return {
            success: false,
            method: 'download',
            surface: 'digital_screen',
            error: 'Download failed. Please try again.'
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}

/**
 * Sanitize filename for download
 */
function sanitizeFilename(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXECUTOR
// ═══════════════════════════════════════════════════════════════

export interface ExecuteSurfaceParams {
    surface: ExecutionSurface;
    imageUrl?: string;
    itemName: string;
    menuLink?: string;
}

/**
 * Execute surface action based on surface type
 * Main entry point for execution surfaces
 */
export async function executeSurface(
    params: ExecuteSurfaceParams
): Promise<SurfaceExecutionResult> {
    const { surface, imageUrl, itemName, menuLink } = params;

    switch (surface) {
        case 'whatsapp_status':
            if (!imageUrl) {
                return {
                    success: false,
                    method: 'whatsapp_share',
                    surface,
                    error: 'No image available'
                };
            }
            return shareToWhatsAppStatus(imageUrl);

        case 'whatsapp_message':
            return copyWhatsAppMessage(itemName, menuLink);

        case 'print_poster':
            if (!imageUrl) {
                return {
                    success: false,
                    method: 'download',
                    surface,
                    error: 'No image available'
                };
            }
            return downloadPoster(imageUrl, itemName);

        case 'qr_tent':
            if (!imageUrl) {
                return {
                    success: false,
                    method: 'download',
                    surface,
                    error: 'No image available'
                };
            }
            return downloadQrTent(imageUrl, itemName);

        case 'digital_screen':
            if (!imageUrl) {
                return {
                    success: false,
                    method: 'download',
                    surface,
                    error: 'No image available'
                };
            }
            return downloadDigitalScreen(imageUrl, itemName);

        default:
            return {
                success: false,
                method: 'copy_text',
                surface,
                error: 'Unknown surface type'
            };
    }
}
