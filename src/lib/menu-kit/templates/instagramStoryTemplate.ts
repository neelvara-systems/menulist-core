/**
 * Instagram Story Template — 1080×1920 PNG
 *
 * Store-level "Menu is live" story image.
 * Owner posts to Instagram, saves as "Menu" highlight.
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import QRCode from 'qrcode';
import { resolveMenuKitBrandTokens } from '../brandTokens';
import { getOfferingLabels } from '../businessTypeLabels';
import { PreloadedLogo } from '../imageLoader';
import { drawMenuListAttribution, MENU_LIST_ATTRIBUTION_TEXT } from '../platformAttribution';
import { MenuKitInput } from '../types';

type StoryInput = MenuKitInput & { _logo?: PreloadedLogo | null };

const W = 1080;
const H = 1920;

export async function generateInstagramStory(input: StoryInput): Promise<Blob> {
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

    ctx.fillStyle = brand.accent;
    ctx.fillRect(0, 0, W, 360);

    // Logo — centered, above store name (if available)
    let nameY = 340;
    if (logo) {
        const maxLH = 100;
        const maxLW = 280;
        const scale = Math.min(maxLW / (logo.width || 1), maxLH / (logo.height || 1), 1);
        const lw = Math.round((logo.width || 100) * scale);
        const lh = Math.round((logo.height || 100) * scale);
        ctx.fillStyle = brand.surface;
        ctx.fillRect(W / 2 - lw / 2 - 24, 220 - 18, lw + 48, lh + 36);
        ctx.drawImage(logo.element, W / 2 - lw / 2, 220, lw, lh);
        nameY = 220 + lh + 40;
    }

    // Store name — bold, top area
    ctx.fillStyle = brand.accentText;
    ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Truncate long names
    let displayName = storeName;
    while (ctx.measureText(displayName).width > W - 120 && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
    }
    if (displayName !== storeName) displayName += '\u2026';
    ctx.fillText(displayName, W / 2, nameY);

    // Decorative line
    ctx.strokeStyle = brand.softAccent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 120, 400);
    ctx.lineTo(W / 2 + 120, 400);
    ctx.stroke();

    // "MENU IS LIVE" label
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.accent;
    ctx.fillText(labels.isLiveUpper, W / 2, 490);

    // QR Code — large, centered
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: 500,
        margin: 2,
        color: { dark: brand.qrDark, light: brand.qrLight },
        errorCorrectionLevel: 'H',
    });
    ctx.fillStyle = brand.surface;
    ctx.fillRect((W - 580) / 2, 560, 580, 580);
    ctx.strokeStyle = brand.border;
    ctx.lineWidth = 5;
    ctx.strokeRect((W - 580) / 2, 560, 580, 580);
    ctx.drawImage(qrCanvas, (W - 500) / 2, 600, 500, 500);

    // "Scan to view our full menu"
    ctx.font = '40px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.text;
    ctx.fillText(labels.scanToView, W / 2, 1200);

    // Short link — smaller, grey
    ctx.font = '32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.muted;
    ctx.fillText(shortLink, W / 2, 1280);

    // Bottom branding area — subtle
    ctx.fillStyle = brand.softAccent;
    ctx.fillRect(0, H - 120, W, 120);
    drawMenuListAttribution(ctx, {
        activePlanType: input.activePlanType,
        color: brand.border,
        font: '24px system-ui, -apple-system, sans-serif',
        gap: 8,
        logoHeight: 22,
        text: MENU_LIST_ATTRIBUTION_TEXT,
        x: W / 2,
        y: H - 55,
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate Instagram story'))),
            'image/png'
        );
    });
}
