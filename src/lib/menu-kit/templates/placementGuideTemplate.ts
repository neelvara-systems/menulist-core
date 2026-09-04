/**
 * Placement Guide Template — 1080×1080 PNG (square)
 *
 * Generic guide showing where to place QR codes.
 * Same for all stores — does NOT include store name or QR.
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import { MenuKitInput } from '../types';
import { drawMenuListAttribution } from '../platformAttribution';
import { drawMenuKitThemeBackground, loadMenuKitThemeSurface } from '../themeSurface';

const SIZE = 1080;

export async function generatePlacementGuide(input: MenuKitInput): Promise<Blob> {
    const themeSurface = await loadMenuKitThemeSurface(input);
    const { brand } = themeSurface;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    drawMenuKitThemeBackground(ctx, themeSurface, { height: SIZE, width: SIZE, x: 0, y: 0 }, { artworkOpacity: 0.34 });

    ctx.save();
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = brand.surface;
    ctx.fillRect(42, 42, SIZE - 84, SIZE - 84);
    ctx.restore();

    // Brand border
    ctx.strokeStyle = brand.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, SIZE - 60, SIZE - 60);

    ctx.fillStyle = brand.softAccent;
    ctx.fillRect(54, 54, SIZE - 108, 190);

    // Title
    ctx.fillStyle = brand.accent;
    ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WHERE TO PLACE', SIZE / 2, 110);
    ctx.fillText('YOUR QR CODE', SIZE / 2, 175);

    // Decorative line
    ctx.strokeStyle = brand.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(SIZE / 2 - 160, 220);
    ctx.lineTo(SIZE / 2 + 160, 220);
    ctx.stroke();

    // Checklist items
    ctx.textAlign = 'left';
    const items = [
        { icon: '✅', text: 'Tables: 1 QR per table (center)', sub: 'Print 20% extra for replacements' },
        { icon: '✅', text: 'Counter: Near payment machine', sub: 'Highest scan rate — phone already in hand' },
        { icon: '✅', text: 'Entrance: 1 poster near the door', sub: 'Customers check menu before sitting' },
        { icon: '✅', text: 'Delivery: 1 sticker per bag/box', sub: 'Customers scan to reorder from home' },
    ];

    let y = 280;
    for (const item of items) {
        ctx.font = '40px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = brand.text;
        ctx.fillText(`${item.icon}  ${item.text}`, 80, y);

        ctx.font = '28px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = brand.muted;
        ctx.fillText(`     ${item.sub}`, 80, y + 44);

        y += 110;
    }

    // Print sizes section
    y += 10;
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.accent;
    ctx.fillText('PRINT SIZES', 80, y);

    y += 48;
    ctx.font = '30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.text;

    const sizes = [
        '•  Table QR: 5×5 cm minimum',
        '•  Counter QR: 8×8 cm',
        '•  Entrance poster: 12×12 cm QR',
    ];

    for (const line of sizes) {
        ctx.fillText(line, 100, y);
        y += 44;
    }

    // QR test checklist
    y += 20;
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.accent;
    ctx.fillText('BEFORE OPENING', 80, y);

    y += 48;
    ctx.font = '30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.text;

    const testItems = [
        '☐  Scan QR from several tables',
        '☐  Confirm menu loads quickly',
        '☐  Replace damaged QR cards',
    ];

    for (const line of testItems) {
        ctx.fillText(line, 100, y);
        y += 44;
    }

    // Tip at bottom
    ctx.font = 'italic 26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = brand.muted;
    ctx.textAlign = 'center';
    ctx.fillText('Tip: Matte finish recommended — glossy causes glare', SIZE / 2, SIZE - 70);

    drawMenuListAttribution(ctx, {
        activePlanType: input.activePlanType,
        color: brand.border,
        font: '18px system-ui, -apple-system, sans-serif',
        gap: 6,
        logoHeight: 16,
        x: SIZE / 2,
        y: SIZE - 34,
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate placement guide'))),
            'image/png'
        );
    });
}
