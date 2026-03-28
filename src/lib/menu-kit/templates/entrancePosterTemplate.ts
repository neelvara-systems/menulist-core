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
import { getOfferingLabels } from '../businessTypeLabels';
import { PreloadedLogo } from '../imageLoader';
import { MenuKitInput } from '../types';

type PosterInput = MenuKitInput & { _logo?: PreloadedLogo | null };

export async function generateEntrancePoster(input: PosterInput): Promise<Blob> {
    const { storeName, menuUrl, shortLink, lastPublishedAt, businessType, _logo } = input;
    const labels = getOfferingLabels(businessType);
    const logo = _logo || null;

    // A4 dimensions in mm
    const W = 210;
    const H = 297;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [W, H],
    });

    // White background (default)
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');

    // Subtle border
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, W - 20, H - 20);

    // Heading — "OUR MENU" / "OUR SERVICES" etc.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(0, 0, 0);
    doc.text(`OUR ${labels.offeringUpper}`, W / 2, 50, { align: 'center' });

    // Decorative line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(W / 2 - 40, 58, W / 2 + 40, 58);

    // QR Code — large, centered (80mm for entrance scanning distance)
    const qrDataUrl = await QRCode.toDataURL(menuUrl, {
        width: 800,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
    });

    const qrSize = 80;
    const qrX = (W - qrSize) / 2;
    const qrY = 72;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // "Scan to view menu" — medium
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(`Scan to view ${labels.offeringLower}`, W / 2, 168, { align: 'center' });

    // "Open camera → point at QR" — instruction line
    doc.setFontSize(12);
    doc.setTextColor(120, 120, 120);
    doc.text('Open camera \u2192 point at QR', W / 2, 180, { align: 'center' });

    // Short link fallback
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Or open: ${shortLink}`, W / 2, 194, { align: 'center' });

    // Logo — centered, above store name (if available)
    let storeNameY = 220;
    if (logo) {
        const maxLogoH = 18; // mm
        const maxLogoW = 40; // mm
        const scale = Math.min(maxLogoW / (logo.width || 1), maxLogoH / (logo.height || 1), 1);
        const lw = (logo.width || 40) * scale;
        const lh = (logo.height || 18) * scale;
        doc.addImage(logo.dataUrl, 'PNG', W / 2 - lw / 2, 206, lw, lh);
        storeNameY = 206 + lh + 6;
    }

    // Store name — large, centered
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
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
        doc.setTextColor(150, 150, 150);
        doc.text(`Updated on: ${dateStr}`, W / 2, 240, { align: 'center' });
    }

    // Bottom branding — subtle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text('Menu powered by MenuList', W / 2, H - 18, { align: 'center' });

    return doc.output('blob');
}
