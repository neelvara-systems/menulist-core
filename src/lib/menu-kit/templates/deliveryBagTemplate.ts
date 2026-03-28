/**
 * Delivery Bag Sticker Template — 60×60 mm PNG (709px at 300dpi)
 *
 * Small QR sticker for delivery bags. Creates off-site discovery —
 * customers receiving deliveries scan to view/reorder from the menu.
 *
 * Smaller than counter sticker (80mm) to fit delivery bag surfaces.
 * Copy is neutral ("VIEW MENU") not promotional ("REORDER") — identity surface,
 * not marketing. Follows Menu Kit doctrine: printed things must stay valid indefinitely.
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import QRCode from 'qrcode';
import { getOfferingLabels } from '../businessTypeLabels';
import { PreloadedLogo } from '../imageLoader';
import { MenuKitInput } from '../types';

type DeliveryInput = MenuKitInput & { _logo?: PreloadedLogo | null };

const SIZE = 709; // 60mm at 300dpi

export async function generateDeliveryBagSticker(input: DeliveryInput): Promise<Blob> {
    const { storeName, menuUrl, shortLink, businessType, _logo } = input;
    const labels = getOfferingLabels(businessType);
    const logo = _logo || null;

    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Subtle border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, SIZE - 32, SIZE - 32);

    // "VIEW MENU" / "VIEW SERVICES" — bold, centered
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`VIEW ${labels.offeringUpper}`, SIZE / 2, 70);

    // QR Code — centered, slightly smaller than counter sticker
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: 340,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
    });

    const qrX = (SIZE - 340) / 2;
    const qrY = 120;
    ctx.drawImage(qrCanvas, qrX, qrY, 340, 340);

    // Logo — small, centered (if available)
    let storeNameY = SIZE - 90;
    if (logo) {
        const maxLH = 36;
        const maxLW = 100;
        const scale = Math.min(maxLW / (logo.width || 1), maxLH / (logo.height || 1), 1);
        const lw = Math.round((logo.width || 50) * scale);
        const lh = Math.round((logo.height || 36) * scale);
        ctx.drawImage(logo.element, SIZE / 2 - lw / 2, SIZE - 140, lw, lh);
        storeNameY = SIZE - 140 + lh + 14;
    }

    // Store name — small, centered, grey
    ctx.font = '30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.textBaseline = 'middle';

    // Truncate long names
    let displayName = storeName;
    while (ctx.measureText(displayName).width > SIZE - 60 && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
    }
    if (displayName !== storeName) displayName += '\u2026';

    ctx.fillText(displayName, SIZE / 2, storeNameY);

    // Short link fallback — tiny, bottom
    if (shortLink) {
        ctx.font = '18px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(shortLink, SIZE / 2, SIZE - 38);
    }

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate delivery bag sticker'))),
            'image/png'
        );
    });
}
