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
import { drawMenuListAttribution } from '../platformAttribution';
import { MenuKitInput } from '../types';
import { resolvePrintableTemplateBrandTokens } from '../../printable-asset-templates/templateStyles';

type StickerInput = MenuKitInput & { _logo?: PreloadedLogo | null };

const SIZE = 945; // 80mm at 300dpi

export async function generateCounterSticker(input: StickerInput): Promise<Blob> {
    const { storeName, menuUrl, shortLink, businessType, businessCategory, _logo } = input;
    const labels = getOfferingLabels(businessType, businessCategory);
    const logo = _logo || null;
    const brand = resolvePrintableTemplateBrandTokens(input.brandColor, input.templateFamilyId);

    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Premium paper background
    ctx.fillStyle = brand.paper;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Brand border
    ctx.strokeStyle = brand.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, SIZE - 40, SIZE - 40);

    ctx.fillStyle = brand.softAccent;
    if (input.templateFamilyId === 'clean-utility') {
        ctx.strokeStyle = brand.border;
        ctx.lineWidth = 3;
        ctx.strokeRect(46, 46, SIZE - 92, 170);
    } else {
        ctx.fillRect(46, 46, SIZE - 92, 170);
    }

    // "SCAN FOR MENU" — bold, centered
    ctx.fillStyle = brand.accent;
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
        color: { dark: brand.qrDark, light: brand.qrLight },
        errorCorrectionLevel: 'H',
    });

    const qrX = (SIZE - 400) / 2;
    const qrY = 230;
    ctx.fillStyle = brand.surface;
    ctx.fillRect(qrX - 28, qrY - 28, 456, 456);
    ctx.strokeStyle = brand.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(qrX - 28, qrY - 28, 456, 456);
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
    ctx.fillStyle = brand.text;
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
        ctx.fillStyle = brand.muted;
        ctx.fillText(`Or open: ${shortLink}`, SIZE / 2, SIZE - 55);
    }

    drawMenuListAttribution(ctx, {
        activePlanType: input.activePlanType,
        color: brand.border,
        font: '16px system-ui, -apple-system, sans-serif',
        gap: 5,
        logoHeight: 14,
        x: SIZE / 2,
        y: SIZE - 28,
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate sticker'))),
            'image/png'
        );
    });
}
