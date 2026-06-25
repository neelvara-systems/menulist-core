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
import { resolveMenuKitBrandTokens } from '../brandTokens';
import { getOfferingLabels } from '../businessTypeLabels';
import { PreloadedLogo } from '../imageLoader';
import { drawMenuListAttribution, MENU_LIST_ATTRIBUTION_TEXT } from '../platformAttribution';
import { MenuKitInput } from '../types';

type TakeawayInput = MenuKitInput & { _logo?: PreloadedLogo | null };

const W = 1004; // 85mm at 300dpi
const H = 650;  // 55mm at 300dpi

export async function generateTakeawayCard(input: TakeawayInput): Promise<Blob> {
    const { storeName, menuUrl, shortLink, businessType, businessCategory, _logo } = input;
    const labels = getOfferingLabels(businessType, businessCategory);
    const logo = _logo || null;
    const brand = resolveMenuKitBrandTokens(input.brandColor);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Premium paper background
    ctx.fillStyle = brand.paper;
    ctx.fillRect(0, 0, W, H);

    // Brand border
    ctx.strokeStyle = brand.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, W - 28, H - 28);

    ctx.fillStyle = brand.softAccent;
    ctx.fillRect(32, 32, W - 64, H - 64);
    ctx.fillStyle = brand.surface;
    ctx.fillRect(42, 42, W - 84, H - 84);

    // QR Code — left side
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: 380,
        margin: 4,
        color: { dark: brand.qrDark, light: brand.qrLight },
        errorCorrectionLevel: 'H',
    });

    const qrSize = 380;
    const qrX = 50;
    const qrY = (H - qrSize) / 2;
    ctx.fillStyle = brand.surface;
    ctx.fillRect(qrX - 18, qrY - 18, qrSize + 36, qrSize + 36);
    ctx.strokeStyle = brand.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(qrX - 18, qrY - 18, qrSize + 36, qrSize + 36);
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
    ctx.fillStyle = brand.text;
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
    ctx.fillStyle = brand.accent;
    ctx.fillText(`SAVE OUR ${labels.offeringUpper}`, textX, contentY + 56);

    // "Scan to view" — instruction
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.muted;
    ctx.fillText(`Scan to view ${labels.offeringLower}`, textX, contentY + 104);

    // Short link — small
    if (shortLink) {
        ctx.font = '20px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = brand.muted;
        ctx.fillText(shortLink, textX, contentY + 140);
    }

    // Bottom branding — tiny, right-aligned
    drawMenuListAttribution(ctx, {
        activePlanType: input.activePlanType,
        align: 'right',
        color: brand.border,
        font: '16px system-ui, -apple-system, sans-serif',
        logoHeight: 14,
        text: MENU_LIST_ATTRIBUTION_TEXT,
        x: W - 40,
        y: H - 30,
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate takeaway card'))),
            'image/png'
        );
    });
}
