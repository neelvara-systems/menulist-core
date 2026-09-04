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
import { fillRoundedRect, fillRoundedVerticalGradient, strokeRoundedRect, truncateCanvasText } from '../canvasPrimitives';
import { PreloadedLogo } from '../imageLoader';
import { drawMenuListAttribution } from '../platformAttribution';
import { MenuKitInput } from '../types';
import { resolvePrintableTemplateBrandTokens } from '../../printable-asset-templates/templateStyles';
import { normalizePrintableTemplateFamilyId } from '../../printable-asset-templates/templateFamilies';
import { drawPrintableThemeArtwork, loadPrintableThemeArtwork } from '../../printable-asset-templates/themeArtwork';

type StickerInput = MenuKitInput & { _logo?: PreloadedLogo | null };

const SIZE = 945; // 80mm at 300dpi
const PADDING = 38;

function drawStickerCornerAccents(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
): void {
    const len = 54;
    const inset = 20;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.78;
    [
        [x + inset, y + inset, 1, 1],
        [x + w - inset, y + inset, -1, 1],
        [x + inset, y + h - inset, 1, -1],
        [x + w - inset, y + h - inset, -1, -1],
    ].forEach(([cx, cy, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy + sy * len);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + sx * len, cy);
        ctx.stroke();
    });
    ctx.restore();
}

function drawStickerDotCluster(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.58;
    for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
            ctx.beginPath();
            ctx.arc(x + col * 20, y + row * 20, 7, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawStickerLeafSpray(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    flip = false,
): void {
    const direction = flip ? -1 : 1;

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + direction * 80, y + 120);
    ctx.stroke();

    for (let index = 0; index < 5; index += 1) {
        ctx.save();
        ctx.translate(x + direction * (14 + index * 14), y + 20 + index * 20);
        ctx.rotate(direction * (0.55 + index * 0.08));
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function drawStickerDiagonalStrips(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    color: string,
): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 7;
    for (let index = 0; index < 5; index += 1) {
        const offset = index * 26;
        ctx.beginPath();
        ctx.moveTo(x + offset, y + 80);
        ctx.lineTo(x + 58 + offset, y);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x + w - 110, y);
    ctx.lineTo(x + w - 40, y + 80);
    ctx.moveTo(x + w - 70, y);
    ctx.lineTo(x + w, y + 80);
    ctx.stroke();
    ctx.restore();
}

function drawStickerDecorations(
    ctx: CanvasRenderingContext2D,
    templateFamilyId: string,
    brand: ReturnType<typeof resolvePrintableTemplateBrandTokens>,
): void {
    if (templateFamilyId === 'botanical-heritage') {
        drawStickerCornerAccents(ctx, PADDING, PADDING, SIZE - PADDING * 2, SIZE - PADDING * 2, brand.border);
        drawStickerLeafSpray(ctx, 90, 84, brand.accent);
        drawStickerLeafSpray(ctx, SIZE - 90, 84, brand.accent, true);
        return;
    }

    if (templateFamilyId === 'classic-luxe') {
        drawStickerCornerAccents(ctx, PADDING, PADDING, SIZE - PADDING * 2, SIZE - PADDING * 2, brand.border);
        drawStickerDotCluster(ctx, 96, SIZE - 206, brand.accent);
        drawStickerDotCluster(ctx, SIZE - 148, SIZE - 206, brand.accent);
        return;
    }

    if (templateFamilyId === 'executive-dark') {
        drawStickerCornerAccents(ctx, PADDING, PADDING, SIZE - PADDING * 2, SIZE - PADDING * 2, brand.border);
        drawStickerDiagonalStrips(ctx, 96, 245, SIZE - 192, brand.accent);
        return;
    }

    if (templateFamilyId === 'soft-curve') {
        ctx.save();
        ctx.fillStyle = brand.softAccent;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.ellipse(SIZE - 150, 170, 250, 130, -0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawStickerDotCluster(ctx, SIZE - 158, SIZE - 220, brand.accent);
        return;
    }

    if (templateFamilyId === 'brand-banner') {
        drawStickerDiagonalStrips(ctx, 96, 104, SIZE - 192, brand.border);
        return;
    }

    if (templateFamilyId === 'local-bold') {
        fillRoundedRect(ctx, 86, 76, SIZE - 172, 18, 9, brand.accent);
        fillRoundedRect(ctx, PADDING + 12, PADDING + 96, 14, SIZE - PADDING * 2 - 192, 7, brand.accent);
        fillRoundedRect(ctx, SIZE - PADDING - 26, PADDING + 96, 14, SIZE - PADDING * 2 - 192, 7, brand.accent);
        drawStickerDiagonalStrips(ctx, 104, SIZE - 216, SIZE - 208, brand.border);
        return;
    }

    if (templateFamilyId === 'qr-first' || templateFamilyId === 'clean-utility') {
        drawStickerCornerAccents(ctx, PADDING, PADDING, SIZE - PADDING * 2, SIZE - PADDING * 2, templateFamilyId === 'qr-first' ? brand.accent : brand.border);
    }
}

export async function generateCounterSticker(input: StickerInput): Promise<Blob> {
    const { storeName, menuUrl, shortLink, businessType, businessCategory, _logo } = input;
    const labels = getOfferingLabels(businessType, businessCategory);
    const logo = _logo || null;
    const templateFamilyId = normalizePrintableTemplateFamilyId(input.templateFamilyId);
    const brand = resolvePrintableTemplateBrandTokens(input.brandColor, templateFamilyId);
    const themeArtwork = await loadPrintableThemeArtwork(templateFamilyId);
    const isBanner = templateFamilyId === 'brand-banner';
    const isDark = templateFamilyId === 'executive-dark';
    const qrSize = templateFamilyId === 'qr-first' ? 470 : 420;
    const qrPanel = qrSize + 60;
    const qrY = templateFamilyId === 'qr-first' ? 238 : 258;

    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.fillStyle = brand.paper;
    ctx.fillRect(0, 0, SIZE, SIZE);
    if (isBanner) {
        fillRoundedVerticalGradient(ctx, 0, 0, SIZE, 250, 0, brand.gradientFrom, brand.gradientTo);
    } else if (templateFamilyId === 'classic-luxe' || templateFamilyId === 'botanical-heritage' || templateFamilyId === 'craft-kitchen') {
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = brand.softAccent;
        ctx.beginPath();
        ctx.ellipse(SIZE / 2, 80, 300, 58, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    fillRoundedRect(ctx, PADDING, PADDING, SIZE - PADDING * 2, SIZE - PADDING * 2, templateFamilyId === 'clean-utility' ? 0 : 24, brand.surface);
    strokeRoundedRect(ctx, PADDING, PADDING, SIZE - PADDING * 2, SIZE - PADDING * 2, templateFamilyId === 'clean-utility' ? 0 : 24, brand.border, isDark ? 5 : 3);
    drawPrintableThemeArtwork(ctx, themeArtwork, {
        height: SIZE - PADDING * 2,
        width: SIZE - PADDING * 2,
        x: PADDING,
        y: PADDING,
    }, { cornerOpacity: 0.26, railOpacity: 0.20, templateFamilyId });
    drawStickerDecorations(ctx, templateFamilyId, brand);

    const headerX = 84;
    const headerY = isBanner ? 82 : 76;
    const headerW = SIZE - 168;
    const headerH = templateFamilyId === 'clean-utility' ? 130 : 142;
    if (templateFamilyId === 'clean-utility') {
        strokeRoundedRect(ctx, headerX, headerY, headerW, headerH, 0, brand.border, 3);
    } else {
        fillRoundedRect(ctx, headerX, headerY, headerW, headerH, 18, templateFamilyId === 'executive-dark' ? brand.softAccent : brand.softAccent);
    }

    ctx.fillStyle = templateFamilyId === 'executive-dark' ? brand.accent : brand.accent;
    ctx.font = `bold ${templateFamilyId === 'qr-first' ? 48 : 52}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCAN FOR', SIZE / 2, headerY + 48);
    ctx.fillText(labels.offeringUpper, SIZE / 2, headerY + 100);

    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: qrSize,
        margin: 4,
        color: { dark: brand.qrDark, light: brand.qrLight },
        errorCorrectionLevel: 'H',
    });

    const qrX = (SIZE - qrSize) / 2;
    fillRoundedRect(ctx, qrX - 30, qrY - 30, qrPanel, qrPanel, templateFamilyId === 'clean-utility' ? 0 : 16, '#ffffff');
    strokeRoundedRect(ctx, qrX - 30, qrY - 30, qrPanel, qrPanel, templateFamilyId === 'clean-utility' ? 0 : 16, brand.border, 4);
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    let storeNameY = SIZE - 124;
    if (logo) {
        const maxLH = 50;
        const maxLW = 120;
        const scale = Math.min(maxLW / (logo.width || 1), maxLH / (logo.height || 1), 1);
        const lw = Math.round((logo.width || 50) * scale);
        const lh = Math.round((logo.height || 50) * scale);
        ctx.drawImage(logo.element, SIZE / 2 - lw / 2, SIZE - 165, lw, lh);
        storeNameY = SIZE - 165 + lh + 18;
    }

    ctx.font = '36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.text;
    ctx.textBaseline = 'middle';

    ctx.fillText(truncateCanvasText(ctx, storeName, SIZE - 130), SIZE / 2, storeNameY);

    if (shortLink) {
        ctx.font = '22px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = brand.muted;
        ctx.fillText(truncateCanvasText(ctx, `Or open: ${shortLink}`, SIZE - 150), SIZE / 2, SIZE - 76);
    }

    drawMenuListAttribution(ctx, {
        activePlanType: input.activePlanType,
        color: brand.border,
        font: '16px system-ui, -apple-system, sans-serif',
        gap: 5,
        logoHeight: 14,
        x: SIZE / 2,
        y: SIZE - 44,
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate sticker'))),
            'image/png'
        );
    });
}
