/**
 * Instagram Story Template — 1080×1920 PNG
 *
 * Store-level "Menu is live" story image.
 * Owner posts to Instagram, saves as "Menu" highlight.
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import QRCode from 'qrcode';
import { getOfferingLabels } from '../businessTypeLabels';
import { PreloadedLogo } from '../imageLoader';
import { drawMenuListAttribution } from '../platformAttribution';
import { MenuKitInput } from '../types';

type StoryInput = MenuKitInput & { _logo?: PreloadedLogo | null };

const W = 1080;
const H = 1920;

export async function generateInstagramStory(input: StoryInput): Promise<Blob> {
    const { storeName, menuUrl, shortLink, businessType, _logo } = input;
    const labels = getOfferingLabels(businessType);
    const logo = _logo || null;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Logo — centered, above store name (if available)
    let nameY = 340;
    if (logo) {
        const maxLH = 100;
        const maxLW = 280;
        const scale = Math.min(maxLW / (logo.width || 1), maxLH / (logo.height || 1), 1);
        const lw = Math.round((logo.width || 100) * scale);
        const lh = Math.round((logo.height || 100) * scale);
        ctx.drawImage(logo.element, W / 2 - lw / 2, 220, lw, lh);
        nameY = 220 + lh + 40;
    }

    // Store name — bold, top area
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Truncate long names
    let displayName = storeName;
    while (ctx.measureText(displayName).width > W - 120 && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
    }
    if (displayName !== storeName) displayName += '\u2026';
    ctx.fillText(displayName, W / 2, nameY);

    // Decorative line
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 120, 400);
    ctx.lineTo(W / 2 + 120, 400);
    ctx.stroke();

    // "MENU IS LIVE" label
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#22c55e'; // Green
    ctx.fillText(labels.isLiveUpper, W / 2, 490);

    // QR Code — large, centered
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, menuUrl, {
        width: 500,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
    });
    ctx.drawImage(qrCanvas, (W - 500) / 2, 600, 500, 500);

    // "Scan to view our full menu"
    ctx.font = '40px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(labels.scanToView, W / 2, 1200);

    // Short link — smaller, grey
    ctx.font = '32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText(shortLink, W / 2, 1280);

    // Bottom branding area — subtle
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, H - 120, W, 120);
    drawMenuListAttribution(ctx, {
        color: '#bbbbbb',
        font: '24px system-ui, -apple-system, sans-serif',
        gap: 8,
        logoHeight: 22,
        text: 'Powered by MenuList',
        x: W / 2,
        y: H - 55,
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate Instagram story'))),
            'image/png'
        );
    });
}
