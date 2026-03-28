/**
 * Placement Guide Template — 1080×1080 PNG (square)
 *
 * Generic guide showing where to place QR codes.
 * Same for all stores — does NOT include store name or QR.
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import { MenuKitInput } from '../types';

const SIZE = 1080;

export async function generatePlacementGuide(_input: MenuKitInput): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Subtle border
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, SIZE - 60, SIZE - 60);

    // Title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WHERE TO PLACE', SIZE / 2, 110);
    ctx.fillText('YOUR QR CODE', SIZE / 2, 175);

    // Decorative line
    ctx.strokeStyle = '#000000';
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
        ctx.fillStyle = '#000000';
        ctx.fillText(`${item.icon}  ${item.text}`, 80, y);

        ctx.font = '28px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText(`     ${item.sub}`, 80, y + 44);

        y += 110;
    }

    // Print sizes section
    y += 10;
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText('PRINT SIZES', 80, y);

    y += 48;
    ctx.font = '30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#444444';

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
    ctx.fillStyle = '#000000';
    ctx.fillText('BEFORE OPENING', 80, y);

    y += 48;
    ctx.font = '30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#444444';

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
    ctx.fillStyle = '#999999';
    ctx.textAlign = 'center';
    ctx.fillText('Tip: Matte finish recommended — glossy causes glare', SIZE / 2, SIZE - 70);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate placement guide'))),
            'image/png'
        );
    });
}
