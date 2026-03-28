/**
 * Takeaway Card Template — 85×55 mm PNG (1004×650px at 300dpi)
 *
 * Business-card-sized insert for takeaway/delivery orders.
 * Owner prints a batch and drops one into each takeaway bag or box.
 * Creates off-site discovery — customers keep the card and scan later.
 *
 * Landscape orientation (wider than tall) — fits naturally in bags/boxes.
 * Copy is identity-focused ("SAVE OUR MENU"), not promotional.
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import QRCode from 'qrcode';
import { getOfferingLabels } from '../businessTypeLabels';
import { PreloadedLogo } from '../imageLoader';
import { MenuKitInput } from '../types';

type TakeawayInput = MenuKitInput & { _logo?: PreloadedLogo | null };

const W = 1004; // 85mm at 300dpi
const H = 650;  // 55mm at 300dpi

export async function generateTakeawayCard(input: TakeawayInput): Promise<Blob> {
    const { storeName, menuUrl, shortLink, businessType, _logo } = input;
    const labels = getOfferingLabels(businessType);
    const logo = _logo || null;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Subtle border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, W - 28, H - 28);

    // QR Code — left side
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: 380,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
    });

    const qrSize = 380;
    const qrX = 50;
    const qrY = (H - qrSize) / 2;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // Right side — text content
    const textX = qrX + qrSize + 40;
    const textMaxW = W - textX - 40;

    // Logo (if available) — small, left-aligned on right side
    let contentY = 100;
    if (logo) {
        const maxLH = 50;
        const maxLW = 120;
        const scale = Math.min(maxLW / (logo.width || 1), maxLH / (logo.height || 1), 1);
        const lw = Math.round((logo.width || 60) * scale);
        const lh = Math.round((logo.height || 30) * scale);
        ctx.drawImage(logo.element, textX, 60, lw, lh);
        contentY = 60 + lh + 16;
    }

    // Store name — bold
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Truncate long names
    let displayName = storeName;
    while (ctx.measureText(displayName).width > textMaxW && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
    }
    if (displayName !== storeName) displayName += '\u2026';
    ctx.fillText(displayName, textX, contentY);

    // "SAVE OUR MENU" / "SAVE OUR SERVICES"
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#333333';
    ctx.fillText(`SAVE OUR ${labels.offeringUpper}`, textX, contentY + 56);

    // "Scan to view" — instruction
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText(`Scan to view ${labels.offeringLower}`, textX, contentY + 104);

    // Short link — small
    if (shortLink) {
        ctx.font = '20px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(shortLink, textX, contentY + 140);
    }

    // Bottom branding — tiny, right-aligned
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'right';
    ctx.fillText('Powered by MenuList', W - 40, H - 30);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate takeaway card'))),
            'image/png'
        );
    });
}
