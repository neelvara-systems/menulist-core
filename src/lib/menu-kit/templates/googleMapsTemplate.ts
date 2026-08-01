/**
 * Google Maps Upload Template — 1200×900 PNG (landscape)
 *
 * Store-level current menu/service image for Google Business Profile.
 * Owner uploads to GBP Photos section.
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import QRCode from 'qrcode';
import { resolveMenuKitBrandTokens } from '../brandTokens';
import { getOfferingLabels } from '../businessTypeLabels';
import { truncateCanvasText, wrapCanvasText } from '../canvasPrimitives';
import { PreloadedLogo } from '../imageLoader';
import { drawMenuListAttribution, MENU_LIST_MENU_ATTRIBUTION_TEXT } from '../platformAttribution';
import { MenuKitInput } from '../types';

const W = 1200;
const H = 900;

type GoogleMapsInput = MenuKitInput & { _logo?: PreloadedLogo | null };

export async function generateGoogleMapsImage(input: GoogleMapsInput): Promise<Blob> {
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
    ctx.strokeRect(30, 30, W - 60, H - 60);

    ctx.fillStyle = brand.softAccent;
    ctx.fillRect(54, 54, W - 108, 156);

    // "CURRENT MENU" / "CURRENT SERVICES" — bold, top-left area
    ctx.fillStyle = brand.accent;
    ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels.printCardTitle, 80, 120);

    // Decorative line under heading
    ctx.strokeStyle = brand.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(80, 155);
    ctx.lineTo(420, 155);
    ctx.stroke();

    // QR Code — left side
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: 350,
        margin: 4,
        color: { dark: brand.qrDark, light: brand.qrLight },
        errorCorrectionLevel: 'H',
    });
    ctx.fillStyle = brand.surface;
    ctx.fillRect(58, 188, 394, 394);
    ctx.strokeStyle = brand.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(58, 188, 394, 394);
    ctx.drawImage(qrCanvas, 80, 210, 350, 350);

    // Logo — right column, above store name
    let storeNameStartY = 300;
    if (logo) {
        const maxLH = 80;
        const maxLW = 180;
        const scale = Math.min(maxLW / (logo.width || 1), maxLH / (logo.height || 1), 1);
        const lw = Math.round((logo.width || 120) * scale);
        const lh = Math.round((logo.height || 60) * scale);
        ctx.fillStyle = brand.surface;
        ctx.fillRect(500 - 16, 230 - 12, lw + 32, lh + 24);
        ctx.drawImage(logo.element, 500, 230, lw, lh);
        storeNameStartY = 230 + lh + 58;
    }

    // Store name — right side, large
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.text;
    ctx.textAlign = 'left';

    // Word wrap store name in right column
    const maxWidth = W - 520;
    const displayLines = wrapCanvasText(ctx, storeName, maxWidth, 3);
    const lineHeight = 60;
    const startY = storeNameStartY;
    displayLines.forEach((line, i) => {
        ctx.fillText(line, 500, startY + i * lineHeight);
    });

    // Short link — bottom area
    ctx.font = '32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.text;
    ctx.textAlign = 'left';
    ctx.fillText(truncateCanvasText(ctx, shortLink, W - 160), 80, H - 120);

    // Current-source note — bottom, smaller
    ctx.font = '26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.muted;
    ctx.fillText(labels.updatedRegularly, 80, H - 72);

    // Bottom branding — subtle, right-aligned
    drawMenuListAttribution(ctx, {
        activePlanType: input.activePlanType,
        align: 'right',
        color: brand.border,
        font: '20px system-ui, -apple-system, sans-serif',
        gap: 8,
        logoHeight: 18,
        text: MENU_LIST_MENU_ATTRIBUTION_TEXT,
        x: W - 80,
        y: H - 72,
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate Google Maps image'))),
            'image/png'
        );
    });
}
