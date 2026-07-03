import { ExecutionSurface, ExportMethod } from "@type/campaigns";
import { readResponseUint8ArrayWithLimit } from "@lib/security/boundedResponseBody";
import { getBoundedCampaignStringContext, logCampaignFailure } from "./campaignDiagnostics";

const CAMPAIGN_SURFACE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const CAMPAIGN_SURFACE_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
]);
const CAMPAIGN_SURFACE_STORAGE_HOSTS = new Set([
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
]);
const CAMPAIGN_SURFACE_CLIPBOARD_DOCUMENT_UNAVAILABLE = 'campaign_surface_clipboard_document_unavailable';
const CAMPAIGN_SURFACE_TEXTAREA_COPY_RETURNED_FALSE = 'campaign_surface_textarea_copy_returned_false';

interface CampaignClipboardFailureCodes {
    documentUnavailable: string;
    fallbackFailed: string;
}

const DEFAULT_CAMPAIGN_CLIPBOARD_FAILURE_CODES: CampaignClipboardFailureCodes = {
    documentUnavailable: CAMPAIGN_SURFACE_CLIPBOARD_DOCUMENT_UNAVAILABLE,
    fallbackFailed: CAMPAIGN_SURFACE_TEXTAREA_COPY_RETURNED_FALSE,
};

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

export const hasCampaignClipboardWrite = () => (
    typeof navigator !== 'undefined'
    && typeof navigator.clipboard?.writeText === 'function'
);

export const hasCampaignCopyFallback = () => (
    typeof document !== 'undefined'
    && Boolean(document.body)
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
);

export const getCampaignClipboardSupportContext = () => ({
    hasClipboardWrite: hasCampaignClipboardWrite(),
    hasCopyFallback: hasCampaignCopyFallback(),
});

function isLocalDevImageHost(hostname: string): boolean {
    return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
}

function normalizeImageMimeType(value?: string | null): string {
    return String(value || '').split(';')[0].trim().toLowerCase();
}

function resolveCampaignSurfaceImageUrl(imageUrl: string): string {
    const value = String(imageUrl || '').trim();
    if (!value) {
        throw new Error('Campaign image URL is missing');
    }

    if (value.startsWith('data:')) {
        if (/^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(value)) return value;
        throw new Error('Unsupported campaign image data URL');
    }

    const parsed = new URL(value, window.location.origin);
    if (parsed.protocol === 'blob:') {
        if (parsed.origin === window.location.origin) return parsed.toString();
        throw new Error('Unsupported campaign image blob URL');
    }

    if (parsed.protocol === 'https:') {
        if (parsed.origin === window.location.origin || CAMPAIGN_SURFACE_STORAGE_HOSTS.has(parsed.hostname)) {
            return parsed.toString();
        }
        throw new Error('Unsupported campaign image HTTPS host');
    }

    if (parsed.protocol === 'http:') {
        const isSameOriginHttp = window.location.protocol === 'http:' && parsed.origin === window.location.origin;
        if (isSameOriginHttp || (process.env.NODE_ENV !== 'production' && isLocalDevImageHost(parsed.hostname))) {
            return parsed.toString();
        }
    }

    throw new Error('Unsupported campaign image URL');
}

async function fetchCampaignSurfaceImageBlob(imageUrl: string): Promise<Blob> {
    const targetUrl = resolveCampaignSurfaceImageUrl(imageUrl);
    const response = await fetch(targetUrl, { redirect: 'manual' });
    if (!response.ok) {
        throw new Error('Campaign image fetch failed');
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > CAMPAIGN_SURFACE_IMAGE_MAX_BYTES) {
        throw new Error('Campaign image is too large');
    }

    const responseMimeType = normalizeImageMimeType(response.headers.get('content-type'));
    if (responseMimeType && !CAMPAIGN_SURFACE_IMAGE_MIME_TYPES.has(responseMimeType)) {
        throw new Error('Campaign image response is not an allowed image type');
    }

    const imageBytes = await readResponseUint8ArrayWithLimit(response, CAMPAIGN_SURFACE_IMAGE_MAX_BYTES);
    const blob = new Blob([imageBytes], { type: responseMimeType || undefined });
    if (!blob.size || blob.size > CAMPAIGN_SURFACE_IMAGE_MAX_BYTES) {
        throw new Error('Campaign image blob is empty or too large');
    }

    const blobMimeType = normalizeImageMimeType(blob.type);
    if (blobMimeType && !CAMPAIGN_SURFACE_IMAGE_MIME_TYPES.has(blobMimeType)) {
        throw new Error('Campaign image blob is not an allowed image type');
    }

    return blob;
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
            const blob = await fetchCampaignSurfaceImageBlob(imageUrl);
            const file = new File([blob], 'menulist-share.jpg', { type: normalizeImageMimeType(blob.type) || 'image/jpeg' });

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
        await copyCampaignTextToClipboard(imageUrl);

        return {
            success: true,
            method: 'copy_text',
            surface: 'whatsapp_status',
        };
    } catch (error) {
        logCampaignFailure('campaign_whatsapp_status_share_failed', error, {
            ...getBoundedCampaignStringContext('imageUrl', imageUrl),
            ...getBoundedCampaignStringContext('caption', caption),
            ...getCampaignClipboardSupportContext(),
        });
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
        await copyCampaignTextToClipboard(message);

        return {
            success: true,
            method: 'copy_text',
            surface: 'whatsapp_message'
        };
    } catch (error) {
        logCampaignFailure('campaign_whatsapp_message_copy_failed', error, {
            ...getBoundedCampaignStringContext('itemName', itemName),
            hasMenuLink: Boolean(menuLink),
            ...getCampaignClipboardSupportContext(),
        });
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
 * Downloads the current generated poster image directly.
 */
export async function downloadPoster(
    imageUrl: string,
    itemName: string
): Promise<SurfaceExecutionResult> {
    try {
        // Fetch image
        const blob = await fetchCampaignSurfaceImageBlob(imageUrl);

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
        logCampaignFailure('campaign_poster_download_failed', error, {
            ...getBoundedCampaignStringContext('imageUrl', imageUrl),
            ...getBoundedCampaignStringContext('itemName', itemName),
        });
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
 * Downloads the current generated tent-card image directly.
 */
export async function downloadQrTent(
    imageUrl: string,
    itemName: string
): Promise<SurfaceExecutionResult> {
    try {
        // Same as poster for now
        const blob = await fetchCampaignSurfaceImageBlob(imageUrl);

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
        logCampaignFailure('campaign_qr_tent_download_failed', error, {
            ...getBoundedCampaignStringContext('imageUrl', imageUrl),
            ...getBoundedCampaignStringContext('itemName', itemName),
        });
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
        const blob = await fetchCampaignSurfaceImageBlob(imageUrl);

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
        logCampaignFailure('campaign_digital_screen_download_failed', error, {
            ...getBoundedCampaignStringContext('imageUrl', imageUrl),
            ...getBoundedCampaignStringContext('itemName', itemName),
        });
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
export async function copyCampaignTextToClipboard(
    text: string,
    failureCodes: CampaignClipboardFailureCodes = DEFAULT_CAMPAIGN_CLIPBOARD_FAILURE_CODES,
): Promise<void> {
    if (hasCampaignClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            // Fall through to the acknowledged textarea fallback for restricted browsers.
        }
    }

    if (!hasCampaignCopyFallback()) {
        throw new Error(failureCodes.documentUnavailable);
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);

    try {
        textArea.select();
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(failureCodes.fallbackFailed);
        }
    } finally {
        textArea.remove();
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
