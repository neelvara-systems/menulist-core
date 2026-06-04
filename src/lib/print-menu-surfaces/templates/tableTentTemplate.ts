/**
 * Print Menu Table Tent Template - A5 landscape PDF, folds to dual A6 portrait faces.
 *
 * This is a scan-first physical table surface. It is intentionally separate from
 * social/poster Menu Kit styling: the customer sees a premium brand card,
 * a large black QR, and one clear action.
 *
 * @see __docs__/print-menu-surfaces/print-menu-surfaces_impl.md
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { resolveMenuKitBrandTokens } from '../../menu-kit/brandTokens';
import { getOfferingLabels } from '../../menu-kit/businessTypeLabels';
import { type PreloadedLogo } from '../../menu-kit/imageLoader';
import { type MenuKitInput } from '../../menu-kit/types';
import { drawPrintMenuCardFace, printMenuMm } from './printMenuCardFace';

type PrintMenuTableTentInput = MenuKitInput & { _logo?: PreloadedLogo | null };

const SHEET_W_MM = 210;
const SHEET_H_MM = 148;
const FACE_W_MM = SHEET_W_MM / 2;
const FACE_H_MM = SHEET_H_MM;

export async function generatePrintMenuTableTent(input: PrintMenuTableTentInput): Promise<Blob> {
    const { storeName, menuUrl, shortLink, businessType, businessCategory, _logo } = input;
    const labels = getOfferingLabels(businessType, businessCategory);
    const logo = _logo || null;
    const brand = resolveMenuKitBrandTokens(input.brandColor);

    const faceW = printMenuMm(FACE_W_MM);
    const faceH = printMenuMm(FACE_H_MM);
    const sheetW = printMenuMm(SHEET_W_MM);
    const sheetH = printMenuMm(SHEET_H_MM);

    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: 720,
        margin: 4,
        color: { dark: brand.qrDark, light: brand.qrLight },
        errorCorrectionLevel: 'H',
    });

    const canvas = document.createElement('canvas');
    canvas.width = sheetW;
    canvas.height = sheetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.fillStyle = brand.paper;
    ctx.fillRect(0, 0, sheetW, sheetH);

    const faceOpts = {
        activePlanType: input.activePlanType,
        brand,
        logo,
        menuLabel: labels.offeringUpper,
        qrCanvas,
        shortLink,
        storeName,
    };

    // Left face: rotated so it reads upright from the opposite side of the table.
    ctx.save();
    ctx.translate(faceW, faceH);
    ctx.rotate(Math.PI);
    drawPrintMenuCardFace(ctx, faceW, faceH, faceOpts);
    ctx.restore();

    // Right face: normal orientation.
    ctx.save();
    ctx.translate(faceW, 0);
    drawPrintMenuCardFace(ctx, faceW, faceH, faceOpts);
    ctx.restore();

    ctx.strokeStyle = brand.border;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.moveTo(faceW, printMenuMm(6));
    ctx.lineTo(faceW, sheetH - printMenuMm(6));
    ctx.stroke();
    ctx.setLineDash([]);

    const imgDataUrl = canvas.toDataURL('image/png');
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [SHEET_W_MM, SHEET_H_MM],
    });
    doc.addImage(imgDataUrl, 'PNG', 0, 0, SHEET_W_MM, SHEET_H_MM);

    return doc.output('blob');
}
