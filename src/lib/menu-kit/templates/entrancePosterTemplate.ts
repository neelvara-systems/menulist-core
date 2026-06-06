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

export async function generateEntrancePoster(input: PosterInput): Promise<Blob> {
    const { storeName, menuUrl, shortLink, lastPublishedAt, businessType, businessCategory, _logo } = input;
    const labels = getOfferingLabels(businessType, businessCategory);
    const logo = _logo || null;
    const brand = resolvePrintableTemplateBrandTokens(input.brandColor, input.templateFamilyId);

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
    if (input.templateFamilyId === 'clean-utility') {
        doc.setDrawColor(...brand.borderRgb);
        doc.setLineWidth(0.35);
        doc.rect(7, 7, W - 14, H - 14, 'S');
    } else {
        drawPdfVerticalGradient(doc, 0, 0, W, 94, brand.gradientFromRgb, brand.gradientToRgb);
    }

    // Premium content sheet
    doc.setFillColor(...brand.surfaceRgb);
    doc.setDrawColor(...brand.borderRgb);
    doc.setLineWidth(0.45);
    doc.roundedRect(14, 22, W - 28, 244, 6, 6, 'FD');
    doc.setFillColor(...brand.softAccentRgb);
    doc.roundedRect(28, 34, W - 56, 32, 4, 4, 'F');

    // Heading — "OUR MENU" / "OUR SERVICES" etc.
    doc.setFont('helvetica', 'bold');
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
