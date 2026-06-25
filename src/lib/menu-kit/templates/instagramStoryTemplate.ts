/**
 * Instagram Story Template — 1080×1920 PNG
 *
 * Store-level "Menu is live" story image.
 * Owner posts to Instagram, saves as "Menu" highlight.
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import QRCode from 'qrcode';
import {
    fillRoundedRect,
    fillRoundedVerticalGradient,
    fillVerticalGradient,
    fitCanvasText,
    strokeRoundedRect,
    stripDecorativeStatusSymbols,
    truncateCanvasText,
} from '../canvasPrimitives';
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
    fillVerticalGradient(ctx, 0, 0, W, Math.round(H * 0.58), brand.gradientFrom, brand.gradientTo);

    const cardX = 86;
    const cardY = 230;
    const cardW = W - cardX * 2;
    const cardH = 1320;
    const cardRadius = 42;
    ctx.shadowColor = 'rgba(17, 24, 39, 0.18)';
    ctx.shadowBlur = 44;
    ctx.shadowOffsetY = 26;
    fillRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius, brand.surface);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    strokeRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius, brand.border, 4);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let contentY = cardY + 120;
    if (logo) {
        const maxLH = 100;
        const maxLW = 220;
        const scale = Math.min(maxLW / (logo.width || 1), maxLH / (logo.height || 1), 1);
        const lw = Math.round((logo.width || 100) * scale);
        const lh = Math.round((logo.height || 100) * scale);
        const logoBoxW = lw + 56;
        const logoBoxH = lh + 42;
        fillRoundedRect(ctx, W / 2 - logoBoxW / 2, contentY - logoBoxH / 2, logoBoxW, logoBoxH, 18, brand.paper);
        strokeRoundedRect(ctx, W / 2 - logoBoxW / 2, contentY - logoBoxH / 2, logoBoxW, logoBoxH, 18, brand.border, 2);
        ctx.drawImage(logo.element, W / 2 - lw / 2, contentY - lh / 2, lw, lh);
        contentY += logoBoxH / 2 + 54;
    }

    fitCanvasText(ctx, storeName, cardW - 128, '700 54px system-ui, -apple-system, sans-serif', 34);
    ctx.fillStyle = brand.text;
    ctx.fillText(truncateCanvasText(ctx, storeName, cardW - 128), W / 2, contentY);

    const label = stripDecorativeStatusSymbols(labels.isLiveUpper).toUpperCase();
    ctx.font = '800 42px system-ui, -apple-system, sans-serif';
    const labelW = Math.min(cardW - 180, Math.max(430, ctx.measureText(label).width + 130));
    const labelY = contentY + 92;
    fillRoundedVerticalGradient(ctx, W / 2 - labelW / 2, labelY - 44, labelW, 88, 22, brand.softAccent, '#ffffff');
    ctx.fillStyle = brand.accent;
    ctx.fillText(label, W / 2, labelY);

    // QR Code — large, centered
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: 520,
        margin: 4,
        color: { dark: brand.qrDark, light: brand.qrLight },
        errorCorrectionLevel: 'H',
    });
    const qrPanel = 630;
    const qrSize = 520;
    const qrPanelX = (W - qrPanel) / 2;
    const qrPanelY = labelY + 100;
    fillRoundedRect(ctx, qrPanelX, qrPanelY, qrPanel, qrPanel, 24, brand.surface);
    strokeRoundedRect(ctx, qrPanelX, qrPanelY, qrPanel, qrPanel, 24, brand.border, 5);
    ctx.drawImage(qrCanvas, (W - qrSize) / 2, qrPanelY + (qrPanel - qrSize) / 2, qrSize, qrSize);

    // Current-link instruction
    ctx.font = '500 38px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.text;
    ctx.fillText(labels.scanToView, W / 2, qrPanelY + qrPanel + 78);

    // Short link — smaller, grey
    ctx.font = '30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.muted;
    ctx.fillText(truncateCanvasText(ctx, shortLink, cardW - 180), W / 2, qrPanelY + qrPanel + 150);

    // Bottom branding area — subtle
    fillRoundedRect(ctx, 132, H - 148, W - 264, 74, 24, 'rgba(255, 255, 255, 0.74)');
    drawMenuListAttribution(ctx, {
        activePlanType: input.activePlanType,
        color: brand.muted,
        font: '23px system-ui, -apple-system, sans-serif',
        gap: 8,
        logoHeight: 22,
        text: MENU_LIST_ATTRIBUTION_TEXT,
        x: W / 2,
        y: H - 111,
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate Instagram story'))),
            'image/png'
        );
    });
}
