/**
 * Counter Sticker Template — 8×8 cm PNG (80mm × 80mm at 300dpi = 945px)
 *
 * Store-level "Scan for menu" sticker.
 * Different from campaign stickers (item-specific) in physical-surfaces/.
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import QRCode from 'qrcode';
import { getOfferingLabels } from '../businessTypeLabels';
import { PreloadedLogo } from '../imageLoader';
import { MenuKitInput } from '../types';

type StickerInput = MenuKitInput & { _logo?: PreloadedLogo | null };

const SIZE = 945; // 80mm at 300dpi

export async function generateCounterSticker(input: StickerInput): Promise<Blob> {
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
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, SIZE - 40, SIZE - 40);

    // "SCAN FOR MENU" — bold, centered
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCAN FOR', SIZE / 2, 110);
    ctx.fillText(labels.offeringUpper, SIZE / 2, 175);

    // QR Code — centered
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
    });

    const qrX = (SIZE - 400) / 2;
    const qrY = 230;
    ctx.drawImage(qrCanvas, qrX, qrY, 400, 400);

    // Logo — small, centered, between QR and store name (if available)
    let storeNameY = SIZE - 100;
    if (logo) {
        const maxLH = 50;
        const maxLW = 120;
        const scale = Math.min(maxLW / (logo.width || 1), maxLH / (logo.height || 1), 1);
        const lw = Math.round((logo.width || 50) * scale);
        const lh = Math.round((logo.height || 50) * scale);
        ctx.drawImage(logo.element, SIZE / 2 - lw / 2, SIZE - 165, lw, lh);
        storeNameY = SIZE - 165 + lh + 18;
    }

    // Store name — small, centered, grey
    ctx.font = '36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.textBaseline = 'middle';

    // Truncate long names
    let displayName = storeName;
    while (ctx.measureText(displayName).width > SIZE - 80 && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
    }
    if (displayName !== storeName) displayName += '\u2026';

    ctx.fillText(displayName, SIZE / 2, storeNameY);

    // Short link fallback — for customers who cannot scan
    if (shortLink) {
        ctx.font = '22px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`Or open: ${shortLink}`, SIZE / 2, SIZE - 55);
    }

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate sticker'))),
            'image/png'
        );
    });
}
