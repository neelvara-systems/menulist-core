/**
 * Table Tent Template — Dual-Orientation A5 PDF (148mm × 210mm, folds to A6)
 *
 * Store-level "Scan to view menu" tent card.
 * Dual-orientation: content appears right-side-up on both halves of A5.
 * Owner prints on A5, folds in half → tent card readable from both sides of table.
 *
 * Rendered via high-DPI canvas (300 DPI) then embedded in PDF — this guarantees
 * correct 180° rotation on the top half, which is unreliable with raw jsPDF transforms.
 *
 * Logo is rendered above the store name when available (passed via _logo from generator).
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { getOfferingLabels } from '../businessTypeLabels';
import { PreloadedLogo } from '../imageLoader';
import { drawMenuListAttribution } from '../platformAttribution';
import { MenuKitInput } from '../types';

type TentCardInput = MenuKitInput & { _logo?: PreloadedLogo | null };

const W_MM = 148;  // A5 width
const H_MM = 210;  // A5 height
const HALF_MM = H_MM / 2; // A6 height
const PX_PER_MM = 300 / 25.4; // ≈ 11.81 px/mm at 300 DPI

/**
 * Draw one half of the tent card content onto a canvas context.
 * Origin is at (0,0) of the half — caller handles positioning/rotation.
 */
function drawHalf(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    opts: {
        labels: ReturnType<typeof getOfferingLabels>;
        storeName: string;
        shortLink: string;
        qrCanvas: HTMLCanvasElement;
        lastPublishedAt?: Date;
        logo: PreloadedLogo | null;
    }
) {
    const { labels, storeName, shortLink, qrCanvas, lastPublishedAt, logo } = opts;
    const cx = w / 2;
    const fontBase = 'system-ui, -apple-system, sans-serif';

    // "SCAN TO VIEW MENU"
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${Math.round(16 * PX_PER_MM)}px ${fontBase}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word wrap title if needed
    const title = labels.scanToViewUpper;
    const maxTitleW = w - 80;
    if (ctx.measureText(title).width > maxTitleW) {
        ctx.font = `bold ${Math.round(13 * PX_PER_MM)}px ${fontBase}`;
    }
    ctx.fillText(title, cx, Math.round(16 * PX_PER_MM));

    // QR Code
    const qrSize = Math.round(35 * PX_PER_MM);
    ctx.drawImage(qrCanvas, cx - qrSize / 2, Math.round(24 * PX_PER_MM), qrSize, qrSize);

    // Logo (if available)
    let nameY = Math.round(66 * PX_PER_MM);
    if (logo) {
        const maxLH = Math.round(10 * PX_PER_MM);
        const maxLW = Math.round(20 * PX_PER_MM);
        const scale = Math.min(maxLW / (logo.width || 1), maxLH / (logo.height || 1), 1);
        const lw = Math.round((logo.width || 20) * scale);
        const lh = Math.round((logo.height || 10) * scale);
        ctx.drawImage(logo.element, cx - lw / 2, nameY, lw, lh);
        nameY += lh + Math.round(2 * PX_PER_MM);
    }

    // Store name
    ctx.font = `bold ${Math.round(12 * PX_PER_MM)}px ${fontBase}`;
    ctx.fillStyle = '#000000';
    let displayName = storeName;
    while (ctx.measureText(displayName).width > w - 60 && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
    }
    if (displayName !== storeName) displayName += '\u2026';
    ctx.fillText(displayName, cx, nameY);

    // "Menu & prices updated regularly"
    ctx.font = `${Math.round(8 * PX_PER_MM)}px ${fontBase}`;
    ctx.fillStyle = '#646464';
    ctx.fillText(labels.updatedRegularly, cx, nameY + Math.round(10 * PX_PER_MM));

    // "Open camera → point at QR"
    ctx.font = `${Math.round(7 * PX_PER_MM)}px ${fontBase}`;
    ctx.fillStyle = '#828282';
    ctx.fillText('Open camera \u2192 point at QR', cx, nameY + Math.round(18 * PX_PER_MM));

    // Short link fallback
    if (shortLink) {
        ctx.font = `${Math.round(6 * PX_PER_MM)}px ${fontBase}`;
        ctx.fillStyle = '#8c8c8c';
        ctx.fillText(`Or open: ${shortLink}`, cx, nameY + Math.round(24 * PX_PER_MM));
    }

    // "Updated on" footer
    if (lastPublishedAt) {
        const dateStr = lastPublishedAt.toLocaleDateString('en-US', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
        ctx.font = `${Math.round(6 * PX_PER_MM)}px ${fontBase}`;
        ctx.fillStyle = '#969696';
        ctx.fillText(`Updated on: ${dateStr}`, cx, h - Math.round(10 * PX_PER_MM));
    }

    // Branding footer
    drawMenuListAttribution(ctx, {
        color: '#b4b4b4',
        font: `${Math.round(5 * PX_PER_MM)}px ${fontBase}`,
        gap: Math.round(1.5 * PX_PER_MM),
        logoHeight: Math.round(3.4 * PX_PER_MM),
        text: 'Menu powered by MenuList',
        x: cx,
        y: h - Math.round(4 * PX_PER_MM),
    });
}

export async function generateTableTent(input: TentCardInput): Promise<Blob> {
    const { storeName, menuUrl, shortLink, lastPublishedAt, businessType, _logo } = input;
    const labels = getOfferingLabels(businessType);
    const logo = _logo || null;

    const W = Math.round(W_MM * PX_PER_MM);
    const H = Math.round(H_MM * PX_PER_MM);
    const halfH = Math.round(HALF_MM * PX_PER_MM);

    // QR Code — generate once as canvas
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
    });

    // Main canvas (A5 at 300 DPI)
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Fold line (dashed, subtle)
    ctx.strokeStyle = '#dcdcdc';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(Math.round(10 * PX_PER_MM), halfH);
    ctx.lineTo(W - Math.round(10 * PX_PER_MM), halfH);
    ctx.stroke();
    ctx.setLineDash([]);

    const halfOpts = { labels, storeName, shortLink, qrCanvas, lastPublishedAt, logo };

    // BOTTOM HALF — right-side-up (faces up when tent card stands)
    ctx.save();
    ctx.translate(0, halfH);
    drawHalf(ctx, W, halfH, halfOpts);
    ctx.restore();

    // TOP HALF — rotated 180° (faces the other side of the table)
    ctx.save();
    ctx.translate(W, halfH);
    ctx.rotate(Math.PI);
    drawHalf(ctx, W, halfH, halfOpts);
    ctx.restore();

    // Convert canvas to PDF
    const imgDataUrl = canvas.toDataURL('image/png');
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [W_MM, H_MM],
    });
    doc.addImage(imgDataUrl, 'PNG', 0, 0, W_MM, H_MM);

    return doc.output('blob');
}
