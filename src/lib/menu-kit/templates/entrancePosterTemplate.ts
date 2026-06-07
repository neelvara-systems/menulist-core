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
import { type RgbColor } from '../brandTokens';
import { getOfferingLabels } from '../businessTypeLabels';
import { PreloadedLogo } from '../imageLoader';
import {
    createMenuListLogoMarkDataUrl,
    getMenuListLogoMarkWidth,
    MENU_LIST_MENU_ATTRIBUTION_TEXT,
} from '../platformAttribution';
import { resolveMenuListAttributionPolicy } from '../../platform/menuListBranding';
import { MenuKitInput } from '../types';
import { resolvePrintableTemplateBrandTokens } from '../../printable-asset-templates/templateStyles';
import { normalizePrintableTemplateFamilyId } from '../../printable-asset-templates/templateFamilies';

type PosterInput = MenuKitInput & { _logo?: PreloadedLogo | null };

function drawPdfVerticalGradient(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    from: RgbColor,
    to: RgbColor,
    steps = 32,
): void {
    const stripeH = height / steps;

    for (let i = 0; i < steps; i += 1) {
        const t = steps <= 1 ? 0 : i / (steps - 1);
        const color: RgbColor = [
            Math.round(from[0] + (to[0] - from[0]) * t),
            Math.round(from[1] + (to[1] - from[1]) * t),
            Math.round(from[2] + (to[2] - from[2]) * t),
        ];
        doc.setFillColor(...color);
        doc.rect(x, y + stripeH * i, width, stripeH + 0.2, 'F');
    }
}

function drawPdfCornerAccents(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    color: RgbColor,
): void {
    const inset = 5;
    const len = 12;
    doc.setDrawColor(...color);
    doc.setLineWidth(0.45);
    [
        [x + inset, y + inset, 1, 1],
        [x + width - inset, y + inset, -1, 1],
        [x + inset, y + height - inset, 1, -1],
        [x + width - inset, y + height - inset, -1, -1],
    ].forEach(([cx, cy, sx, sy]) => {
        doc.line(cx, cy + sy * len, cx, cy);
        doc.line(cx, cy, cx + sx * len, cy);
    });
}

function drawPdfDotCluster(doc: jsPDF, x: number, y: number, color: RgbColor): void {
    doc.setFillColor(...color);
    for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
            doc.circle(x + col * 3.2, y + row * 3.2, 0.55, 'F');
        }
    }
}

function drawPdfLeafSpray(
    doc: jsPDF,
    x: number,
    y: number,
    color: RgbColor,
    flip = false,
): void {
    const direction = flip ? -1 : 1;
    doc.setDrawColor(...color);
    doc.setFillColor(...color);
    doc.setLineWidth(0.3);
    doc.line(x, y, x + direction * 18, y + 30);
    for (let index = 0; index < 5; index += 1) {
        doc.ellipse(x + direction * (3 + index * 3), y + 5 + index * 5, 1.8, 3.6, 'F');
    }
}

function drawPdfDiagonalStrips(doc: jsPDF, x: number, y: number, width: number, color: RgbColor): void {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.8);
    for (let index = 0; index < 5; index += 1) {
        const offset = index * 5;
        doc.line(x + offset, y + 15, x + 12 + offset, y);
    }
    doc.line(x + width - 24, y, x + width - 9, y + 15);
    doc.line(x + width - 16, y, x + width, y + 15);
}

function drawPdfTemplateDecorations(
    doc: jsPDF,
    templateFamilyId: string,
    brand: ReturnType<typeof resolvePrintableTemplateBrandTokens>,
    x: number,
    y: number,
    width: number,
    height: number,
): void {
    if (templateFamilyId === 'botanical-heritage') {
        drawPdfCornerAccents(doc, x, y, width, height, brand.borderRgb);
        drawPdfLeafSpray(doc, x + 9, y + 10, brand.accentRgb);
        drawPdfLeafSpray(doc, x + width - 9, y + 10, brand.accentRgb, true);
        return;
    }

    if (templateFamilyId === 'classic-luxe') {
        drawPdfCornerAccents(doc, x, y, width, height, brand.borderRgb);
        drawPdfDotCluster(doc, x + 31, y + height - 57, brand.accentRgb);
        drawPdfDotCluster(doc, x + width - 39, y + height - 57, brand.accentRgb);
        return;
    }

    if (templateFamilyId === 'executive-dark') {
        drawPdfCornerAccents(doc, x, y, width, height, brand.borderRgb);
        drawPdfDiagonalStrips(doc, x + 24, y + 88, width - 48, brand.accentRgb);
        return;
    }

    if (templateFamilyId === 'soft-curve') {
        doc.setFillColor(...brand.softAccentRgb);
        doc.ellipse(x + width - 26, y + 42, 35, 18, 'F');
        drawPdfDotCluster(doc, x + width - 47, y + height - 59, brand.accentRgb);
        return;
    }

    if (templateFamilyId === 'brand-banner') {
        drawPdfDiagonalStrips(doc, x + 18, y + 31, width - 36, brand.borderRgb);
        return;
    }

    if (templateFamilyId === 'local-bold') {
        doc.setFillColor(...brand.accentRgb);
        doc.roundedRect(x + 23, y + 28, width - 46, 4, 2, 2, 'F');
        doc.roundedRect(x + 8, y + 50, 3, height - 100, 1.5, 1.5, 'F');
        doc.roundedRect(x + width - 11, y + 50, 3, height - 100, 1.5, 1.5, 'F');
        drawPdfDiagonalStrips(doc, x + 26, y + height - 72, width - 52, brand.borderRgb);
        return;
    }

    if (templateFamilyId === 'qr-first' || templateFamilyId === 'clean-utility') {
        drawPdfCornerAccents(doc, x, y, width, height, templateFamilyId === 'qr-first' ? brand.accentRgb : brand.borderRgb);
    }
}

export async function generateEntrancePoster(input: PosterInput): Promise<Blob> {
    const { storeName, menuUrl, shortLink, lastPublishedAt, businessType, businessCategory, _logo } = input;
    const labels = getOfferingLabels(businessType, businessCategory);
    const logo = _logo || null;
    const templateFamilyId = normalizePrintableTemplateFamilyId(input.templateFamilyId);
    const brand = resolvePrintableTemplateBrandTokens(input.brandColor, templateFamilyId);
    const hasOuterBand = templateFamilyId === 'brand-banner';
    const isClassic = templateFamilyId === 'classic-luxe' || templateFamilyId === 'botanical-heritage';

    // A4 dimensions in mm
    const W = 210;
    const H = 297;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [W, H],
    });

    // Premium paper background
    doc.setFillColor(...brand.paperRgb);
    doc.rect(0, 0, W, H, 'F');
    if (templateFamilyId === 'clean-utility') {
        doc.setDrawColor(...brand.borderRgb);
        doc.setLineWidth(0.35);
        doc.rect(7, 7, W - 14, H - 14, 'S');
    } else if (hasOuterBand) {
        drawPdfVerticalGradient(doc, 0, 0, W, 94, brand.gradientFromRgb, brand.gradientToRgb);
    } else if (isClassic) {
        doc.setFillColor(...brand.softAccentRgb);
        doc.ellipse(W / 2, 20, 62, 12, 'F');
    }

    // Premium content sheet
    doc.setFillColor(...brand.surfaceRgb);
    doc.setDrawColor(...brand.borderRgb);
    doc.setLineWidth(0.45);
    doc.roundedRect(14, 22, W - 28, 244, 6, 6, 'FD');
    drawPdfTemplateDecorations(doc, templateFamilyId, brand, 14, 22, W - 28, 244);
    doc.setFillColor(...brand.softAccentRgb);
    if (templateFamilyId === 'clean-utility') {
        doc.setDrawColor(...brand.borderRgb);
        doc.roundedRect(28, 34, W - 56, 32, 0, 0, 'S');
    } else {
        doc.roundedRect(28, 34, W - 56, 32, 4, 4, 'F');
    }

    // Heading — "OUR MENU" / "OUR SERVICES" etc.
    doc.setFont(isClassic ? 'times' : 'helvetica', 'bold');
    doc.setFontSize(30);
    doc.setTextColor(...brand.accentRgb);
    doc.text(`OUR ${labels.offeringUpper}`, W / 2, 54, { align: 'center' });

    // Decorative line
    doc.setDrawColor(...brand.accentRgb);
    doc.setLineWidth(0.6);
    doc.line(W / 2 - 34, 63, W / 2 + 34, 63);

    // QR Code — large, centered (80mm for entrance scanning distance)
    const qrDataUrl = await QRCode.toDataURL(menuUrl, {
        width: 800,
        margin: 2,
        color: { dark: brand.qrDark, light: brand.qrLight },
        errorCorrectionLevel: 'H',
    });

    const qrSize = 80;
    const qrX = (W - qrSize) / 2;
    const qrY = 82;
    doc.setFillColor(...brand.surfaceRgb);
    doc.setDrawColor(...brand.borderRgb);
    doc.roundedRect(qrX - 7, qrY - 7, qrSize + 14, qrSize + 14, 4, 4, 'FD');
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // "Scan to view menu" — medium
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(17);
    doc.setTextColor(...brand.textRgb);
    doc.text(`Scan to view ${labels.offeringLower}`, W / 2, 181, { align: 'center' });

    // Instruction line
    doc.setFontSize(11);
    doc.setTextColor(...brand.mutedRgb);
    doc.text('Open camera and point at QR', W / 2, 193, { align: 'center' });

    // Short link fallback
    doc.setFontSize(9.5);
    doc.setTextColor(...brand.mutedRgb);
    doc.text(`Or open: ${shortLink}`, W / 2, 205, { align: 'center', maxWidth: W - 44 });

    // Logo — centered, above store name (if available)
    let storeNameY = 229;
    if (logo) {
        const maxLogoH = 15; // mm
        const maxLogoW = 36; // mm
        const scale = Math.min(maxLogoW / (logo.width || 1), maxLogoH / (logo.height || 1), 1);
        const lw = (logo.width || 40) * scale;
        const lh = (logo.height || 18) * scale;
        doc.addImage(logo.dataUrl, 'PNG', W / 2 - lw / 2, 216, lw, lh);
        storeNameY = 216 + lh + 6;
    }

    // Store name — large, centered
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.setTextColor(...brand.textRgb);
    doc.text(storeName, W / 2, storeNameY, { align: 'center', maxWidth: W - 40 });

    // "Updated on" date — optional footer
    if (lastPublishedAt) {
        const dateStr = lastPublishedAt.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...brand.mutedRgb);
        doc.text(`Updated on: ${dateStr}`, W / 2, 252, { align: 'center' });
    }

    if (resolveMenuListAttributionPolicy({ activePlanType: input.activePlanType }).showAttribution) {
        // Bottom branding — subtle
        const brandText = MENU_LIST_MENU_ATTRIBUTION_TEXT;
        const brandLogoH = 3;
        const brandLogoW = getMenuListLogoMarkWidth(brandLogoH);
        const brandGap = 1.5;
        const brandLogo = createMenuListLogoMarkDataUrl();
        const brandY = H - 18;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...brand.borderRgb);
        const brandTextW = doc.getTextWidth(brandText);
        const brandStartX = W / 2 - (brandLogoW + brandGap + brandTextW) / 2;
        doc.addImage(brandLogo.dataUrl, 'PNG', brandStartX, brandY - brandLogoH + 0.6, brandLogoW, brandLogoH);
        doc.text(brandText, brandStartX + brandLogoW + brandGap, brandY);
    }

    return doc.output('blob');
}
