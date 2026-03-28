/**
 * Google Maps Upload Template — 1200×900 PNG (landscape)
 *
 * Store-level "Official Menu" image for Google Business Profile.
 * Owner uploads to GBP Photos section.
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import QRCode from 'qrcode';
import { getOfferingLabels } from '../businessTypeLabels';
import { MenuKitInput } from '../types';

const W = 1200;
const H = 900;

export async function generateGoogleMapsImage(input: MenuKitInput): Promise<Blob> {
    const { storeName, menuUrl, shortLink, businessType } = input;
    const labels = getOfferingLabels(businessType);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Subtle border
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, W - 60, H - 60);

    // "OFFICIAL MENU" — bold, top-left area
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels.officialUpper, 80, 120);

    // Decorative line under heading
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(80, 155);
    ctx.lineTo(420, 155);
    ctx.stroke();

    // QR Code — left side
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: 350,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
    });
    ctx.drawImage(qrCanvas, 80, 210, 350, 350);

    // Store name — right side, large
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';

    // Word wrap store name in right column
    const maxWidth = W - 520;
    const words = storeName.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth) {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);

    // Max 3 lines
    const displayLines = lines.slice(0, 3);
    const lineHeight = 60;
    const startY = 300;
    displayLines.forEach((line, i) => {
        ctx.fillText(line, 500, startY + i * lineHeight);
    });

    // Short link — bottom area
    ctx.font = '32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'left';
    ctx.fillText(shortLink, 80, H - 120);

    // "Updated regularly" — bottom, smaller
    ctx.font = '26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#999999';
    ctx.fillText('Updated regularly', 80, H - 72);

    // Bottom branding — subtle, right-aligned
    ctx.font = '20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'right';
    ctx.fillText('Menu powered by MenuList', W - 80, H - 72);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate Google Maps image'))),
            'image/png'
        );
    });
}
