/**
 * Entrance Poster Template — A4 PDF (210mm × 297mm)
 *
 * Store-level "Our Menu" poster for restaurant/business entrance.
 * Highest discovery surface — customers check menu before entering.
 * QR is larger than table tent (80–100mm) for scanning from 1–2 meters.
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
    fillRoundedRect,
    fillVerticalGradient,
    fitCanvasText,
    strokeRoundedRect,
    truncateCanvasText,
} from '../canvasPrimitives';
import { getOfferingLabels } from '../businessTypeLabels';
import { PreloadedLogo } from '../imageLoader';
import {
    drawMenuListAttribution,
    MENU_LIST_MENU_ATTRIBUTION_TEXT,
} from '../platformAttribution';
import { MenuKitInput } from '../types';
import { resolvePrintableTemplateBrandTokens } from '../../printable-asset-templates/templateStyles';
import { normalizePrintableTemplateFamilyId } from '../../printable-asset-templates/templateFamilies';

type PosterInput = MenuKitInput & { _logo?: PreloadedLogo | null };

const POSTER_W_MM = 210;
const POSTER_H_MM = 297;
const POSTER_PX_PER_MM = 300 / 25.4;
const POSTER_PX_PER_PT = 300 / 72;

function posterMm(value: number): number {
    return Math.round(value * POSTER_PX_PER_MM);
}

function posterPt(value: number): number {
    return Math.round(value * POSTER_PX_PER_PT);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate entrance poster image'))),
            'image/png',
        );
    });
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read generated entrance poster'));
        reader.readAsDataURL(blob);
    });
}

function drawCanvasCornerAccents(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
): void {
    const inset = posterMm(5);
    const len = posterMm(12);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = posterMm(0.45);
    [
        [x + inset, y + inset, 1, 1],
        [x + width - inset, y + inset, -1, 1],
        [x + inset, y + height - inset, 1, -1],
        [x + width - inset, y + height - inset, -1, -1],
    ].forEach(([cx, cy, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy + sy * len);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + sx * len, cy);
        ctx.stroke();
    });
    ctx.restore();
}

function drawCanvasDotCluster(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.save();
    ctx.fillStyle = color;
    for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
            ctx.beginPath();
            ctx.arc(x + col * posterMm(3.2), y + row * posterMm(3.2), posterMm(0.55), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawCanvasLeafSpray(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    flip = false,
): void {
    const direction = flip ? -1 : 1;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.52;
    ctx.lineWidth = posterMm(0.3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + direction * posterMm(18), y + posterMm(30));
    ctx.stroke();

    for (let index = 0; index < 5; index += 1) {
        ctx.save();
        ctx.translate(x + direction * posterMm(3 + index * 3), y + posterMm(5 + index * 5));
        ctx.rotate(direction * (0.55 + index * 0.08));
        ctx.beginPath();
        ctx.ellipse(0, 0, posterMm(1.8), posterMm(3.6), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function drawCanvasDiagonalStrips(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, color: string): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = posterMm(0.8);
    ctx.globalAlpha = 0.56;
    for (let index = 0; index < 5; index += 1) {
        const offset = posterMm(index * 5);
        ctx.beginPath();
        ctx.moveTo(x + offset, y + posterMm(15));
        ctx.lineTo(x + posterMm(12) + offset, y);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x + width - posterMm(24), y);
    ctx.lineTo(x + width - posterMm(9), y + posterMm(15));
    ctx.moveTo(x + width - posterMm(16), y);
    ctx.lineTo(x + width, y + posterMm(15));
    ctx.stroke();
    ctx.restore();
}

function drawCanvasTemplateDecorations(
    ctx: CanvasRenderingContext2D,
    templateFamilyId: string,
    brand: ReturnType<typeof resolvePrintableTemplateBrandTokens>,
    x: number,
    y: number,
    width: number,
    height: number,
): void {
    if (templateFamilyId === 'botanical-heritage') {
        drawCanvasCornerAccents(ctx, x, y, width, height, brand.border);
        drawCanvasLeafSpray(ctx, x + posterMm(9), y + posterMm(10), brand.accent);
        drawCanvasLeafSpray(ctx, x + width - posterMm(9), y + posterMm(10), brand.accent, true);
        return;
    }

    if (templateFamilyId === 'classic-luxe') {
        drawCanvasCornerAccents(ctx, x, y, width, height, brand.border);
        drawCanvasDotCluster(ctx, x + posterMm(31), y + height - posterMm(57), brand.accent);
        drawCanvasDotCluster(ctx, x + width - posterMm(39), y + height - posterMm(57), brand.accent);
        return;
    }

    if (templateFamilyId === 'executive-dark') {
        drawCanvasCornerAccents(ctx, x, y, width, height, brand.border);
        drawCanvasDiagonalStrips(ctx, x + posterMm(24), y + posterMm(88), width - posterMm(48), brand.accent);
        return;
    }

    if (templateFamilyId === 'soft-curve') {
        ctx.save();
        ctx.fillStyle = brand.softAccent;
        ctx.globalAlpha = 0.42;
        ctx.beginPath();
        ctx.ellipse(x + width - posterMm(26), y + posterMm(42), posterMm(35), posterMm(18), -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawCanvasDotCluster(ctx, x + width - posterMm(47), y + height - posterMm(59), brand.accent);
        return;
    }

    if (templateFamilyId === 'brand-banner') {
        drawCanvasDiagonalStrips(ctx, x + posterMm(18), y + posterMm(31), width - posterMm(36), brand.border);
        return;
    }

    if (templateFamilyId === 'local-bold') {
        fillRoundedRect(ctx, x + posterMm(23), y + posterMm(28), width - posterMm(46), posterMm(4), posterMm(2), brand.accent);
        fillRoundedRect(ctx, x + posterMm(8), y + posterMm(50), posterMm(3), height - posterMm(100), posterMm(1.5), brand.accent);
        fillRoundedRect(ctx, x + width - posterMm(11), y + posterMm(50), posterMm(3), height - posterMm(100), posterMm(1.5), brand.accent);
        drawCanvasDiagonalStrips(ctx, x + posterMm(26), y + height - posterMm(72), width - posterMm(52), brand.border);
        return;
    }

    if (templateFamilyId === 'qr-first' || templateFamilyId === 'clean-utility') {
        drawCanvasCornerAccents(ctx, x, y, width, height, templateFamilyId === 'qr-first' ? brand.accent : brand.border);
    }
}

async function renderEntrancePosterCanvas(input: PosterInput): Promise<HTMLCanvasElement> {
    const { storeName, menuUrl, shortLink, lastPublishedAt, businessType, businessCategory, _logo } = input;
    const labels = getOfferingLabels(businessType, businessCategory);
    const logo = _logo || null;
    const templateFamilyId = normalizePrintableTemplateFamilyId(input.templateFamilyId);
    const brand = resolvePrintableTemplateBrandTokens(input.brandColor, templateFamilyId);
    const hasOuterBand = templateFamilyId === 'brand-banner';
    const isClassic = templateFamilyId === 'classic-luxe' || templateFamilyId === 'botanical-heritage';

    const W = posterMm(POSTER_W_MM);
    const H = posterMm(POSTER_H_MM);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to render entrance poster preview');

    // Premium paper background
    ctx.fillStyle = brand.paper;
    ctx.fillRect(0, 0, W, H);
    if (templateFamilyId === 'clean-utility') {
        ctx.strokeStyle = brand.border;
        ctx.lineWidth = posterMm(0.35);
        ctx.strokeRect(posterMm(7), posterMm(7), W - posterMm(14), H - posterMm(14));
    } else if (hasOuterBand) {
        fillVerticalGradient(ctx, 0, 0, W, posterMm(94), brand.gradientFrom, brand.gradientTo);
    } else if (isClassic) {
        ctx.save();
        ctx.fillStyle = brand.softAccent;
        ctx.globalAlpha = 0.52;
        ctx.beginPath();
        ctx.ellipse(W / 2, posterMm(20), posterMm(62), posterMm(12), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Premium content sheet
    const sheetX = posterMm(14);
    const sheetY = posterMm(22);
    const sheetW = W - posterMm(28);
    const sheetH = posterMm(244);
    ctx.save();
    ctx.shadowColor = 'rgba(17, 24, 39, 0.14)';
    ctx.shadowBlur = posterMm(2.5);
    ctx.shadowOffsetY = posterMm(1.1);
    fillRoundedRect(ctx, sheetX, sheetY, sheetW, sheetH, posterMm(6), brand.surface);
    ctx.restore();
    strokeRoundedRect(ctx, sheetX, sheetY, sheetW, sheetH, posterMm(6), brand.border, posterMm(0.45));
    drawCanvasTemplateDecorations(ctx, templateFamilyId, brand, sheetX, sheetY, sheetW, sheetH);
    if (templateFamilyId === 'clean-utility') {
        ctx.strokeStyle = brand.border;
        ctx.lineWidth = posterMm(0.36);
        ctx.strokeRect(posterMm(28), posterMm(34), W - posterMm(56), posterMm(32));
    } else {
        fillRoundedRect(ctx, posterMm(28), posterMm(34), W - posterMm(56), posterMm(32), posterMm(4), brand.softAccent);
    }

    // Heading — "CURRENT MENU" / "CURRENT SERVICES" etc.
    const fontBase = isClassic
        ? 'Georgia, "Times New Roman", serif'
        : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = brand.accent;
    ctx.font = `800 ${posterPt(30)}px ${fontBase}`;
    ctx.fillText(`OUR ${labels.offeringUpper}`, W / 2, posterMm(54));

    // Decorative line
    ctx.strokeStyle = brand.accent;
    ctx.lineWidth = posterMm(0.6);
    ctx.beginPath();
    ctx.moveTo(W / 2 - posterMm(34), posterMm(63));
    ctx.lineTo(W / 2 + posterMm(34), posterMm(63));
    ctx.stroke();

    // QR Code — large, centered (80mm for entrance scanning distance)
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: posterMm(80),
        margin: 4,
        color: { dark: brand.qrDark, light: brand.qrLight },
        errorCorrectionLevel: 'H',
    });

    const qrSize = posterMm(80);
    const qrX = (W - qrSize) / 2;
    const qrY = posterMm(82);
    ctx.save();
    ctx.shadowColor = 'rgba(17, 24, 39, 0.1)';
    ctx.shadowBlur = posterMm(1.7);
    ctx.shadowOffsetY = posterMm(0.7);
    fillRoundedRect(ctx, qrX - posterMm(7), qrY - posterMm(7), qrSize + posterMm(14), qrSize + posterMm(14), posterMm(4), brand.surface);
    ctx.restore();
    strokeRoundedRect(ctx, qrX - posterMm(7), qrY - posterMm(7), qrSize + posterMm(14), qrSize + posterMm(14), posterMm(4), brand.border, posterMm(0.35));
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // Current-link instruction — medium
    ctx.font = `500 ${posterPt(17)}px ${fontBase}`;
    ctx.fillStyle = brand.text;
    ctx.fillText(labels.scanToView, W / 2, posterMm(181));

    // Instruction line
    ctx.font = `400 ${posterPt(11)}px ${fontBase}`;
    ctx.fillStyle = brand.muted;
    ctx.fillText('Open camera and point at QR', W / 2, posterMm(193));

    // Short link fallback
    ctx.font = `400 ${posterPt(9.5)}px ${fontBase}`;
    ctx.fillStyle = brand.muted;
    ctx.fillText(truncateCanvasText(ctx, `Or open: ${shortLink}`, W - posterMm(44)), W / 2, posterMm(205));

    // Logo — centered, above store name (if available)
    let storeNameY = posterMm(229);
    if (logo) {
        const maxLogoH = posterMm(15);
        const maxLogoW = posterMm(36);
        const scale = Math.min(maxLogoW / (logo.width || 1), maxLogoH / (logo.height || 1), 1);
        const lw = (logo.width || 40) * scale;
        const lh = (logo.height || 18) * scale;
        ctx.drawImage(logo.element, W / 2 - lw / 2, posterMm(216), lw, lh);
        storeNameY = posterMm(216) + lh + posterMm(6);
    }

    // Store name — large, centered
    fitCanvasText(ctx, storeName, W - posterMm(40), `800 ${posterPt(19)}px ${fontBase}`, posterPt(11));
    ctx.fillStyle = brand.text;
    ctx.fillText(truncateCanvasText(ctx, storeName, W - posterMm(40)), W / 2, storeNameY);

    // "Updated on" date — optional footer
    if (lastPublishedAt) {
        const dateStr = lastPublishedAt.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
        ctx.font = `400 ${posterPt(9)}px ${fontBase}`;
        ctx.fillStyle = brand.muted;
        ctx.fillText(`Updated on: ${dateStr}`, W / 2, posterMm(252));
    }

    drawMenuListAttribution(ctx, {
        activePlanType: input.activePlanType,
        color: brand.border,
        font: `400 ${posterPt(8)}px ${fontBase}`,
        gap: posterMm(1.5),
        logoHeight: posterMm(3),
        text: MENU_LIST_MENU_ATTRIBUTION_TEXT,
        x: W / 2,
        y: H - posterMm(18),
    });

    return canvas;
}

export async function generateEntrancePosterImage(input: PosterInput): Promise<Blob> {
    return canvasToPngBlob(await renderEntrancePosterCanvas(input));
}

export async function generateEntrancePoster(input: PosterInput): Promise<Blob> {
    const imageBlob = await generateEntrancePosterImage(input);
    const imageDataUrl = await blobToDataUrl(imageBlob);
    const doc = new jsPDF({
        compress: true,
        orientation: 'portrait',
        unit: 'mm',
        format: [POSTER_W_MM, POSTER_H_MM],
    });
    doc.addImage(imageDataUrl, 'PNG', 0, 0, POSTER_W_MM, POSTER_H_MM, undefined, 'FAST');

    return doc.output('blob');
}
