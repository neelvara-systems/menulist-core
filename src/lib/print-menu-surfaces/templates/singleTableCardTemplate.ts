/**
 * Print Menu Single Table / Counter Card Template - A6 portrait PDF.
 *
 * This is the non-folded version of the table tent face. It is for acrylic
 * holders, counter stands, wall clips, takeout counters, or any placement where
 * a normal upright card is easier than a folded tent.
 *
 * @see __docs__/print-menu-surfaces/print-menu-surfaces_impl.md
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { getOfferingLabels } from '../../menu-kit/businessTypeLabels';
import { type PreloadedLogo } from '../../menu-kit/imageLoader';
import { type MenuKitInput } from '../../menu-kit/types';
import { resolvePrintableTemplateBrandTokens } from '../../printable-asset-templates/templateStyles';
import { drawPrintMenuCardFace, printMenuMm } from './printMenuCardFace';

type PrintMenuSingleTableCardInput = MenuKitInput & { _logo?: PreloadedLogo | null };

const CARD_W_MM = 105;
const CARD_H_MM = 148;

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate single table card image'))),
            'image/png',
        );
    });
}

async function renderPrintMenuSingleTableCardCanvas(input: PrintMenuSingleTableCardInput): Promise<HTMLCanvasElement> {
    const { storeName, menuUrl, shortLink, businessType, businessCategory, _logo } = input;
    const labels = getOfferingLabels(businessType, businessCategory);
    const logo = _logo || null;
    const brand = resolvePrintableTemplateBrandTokens(input.brandColor, input.templateFamilyId);

    const cardW = printMenuMm(CARD_W_MM);
    const cardH = printMenuMm(CARD_H_MM);

    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: 720,
        margin: 4,
        color: { dark: brand.qrDark, light: brand.qrLight },
        errorCorrectionLevel: 'H',
    });

    const canvas = document.createElement('canvas');
    canvas.width = cardW;
    canvas.height = cardH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    drawPrintMenuCardFace(ctx, cardW, cardH, {
        activePlanType: input.activePlanType,
        actionLabel: labels.printCardTitle,
        brand,
        instructionLabel: labels.scanToView,
        logo,
        qrCanvas,
        shortLink,
        storeName,
        templateFamilyId: input.templateFamilyId,
    });

    return canvas;
}

export async function generatePrintMenuSingleTableCardImage(input: PrintMenuSingleTableCardInput): Promise<Blob> {
    return canvasToPngBlob(await renderPrintMenuSingleTableCardCanvas(input));
}

export async function generatePrintMenuSingleTableCard(input: PrintMenuSingleTableCardInput): Promise<Blob> {
    const canvas = await renderPrintMenuSingleTableCardCanvas(input);
    const imgDataUrl = canvas.toDataURL('image/png');
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [CARD_W_MM, CARD_H_MM],
    });
    doc.addImage(imgDataUrl, 'PNG', 0, 0, CARD_W_MM, CARD_H_MM);

    return doc.output('blob');
}
