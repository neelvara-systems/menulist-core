import { PUBLIC_MENU_DRAFT_DATA_LIMITS } from '@data/shared/publicMenuDraftData';

export type SharableItemCardOption = {
    name: string;
    priceLabel?: string;
};

export interface SharableItemCardInput {
    itemName: string;
    description?: string;
    categoryName?: string;
    price?: string;
    storeName: string;
    projectName?: string;
    imageUrl?: string;
    accentColor?: string;
    updatedLabel?: string;
    options?: readonly SharableItemCardOption[];
}

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

export function buildSharableItemCardFilename(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'item-card';
}

function drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
): number {
    const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    let line = '';
    let lines = 0;

    for (let index = 0; index < words.length; index += 1) {
        const testLine = line ? `${line} ${words[index]}` : words[index];
        const isLastAllowedLine = lines === maxLines - 1;
        if (ctx.measureText(testLine).width <= maxWidth || !line) {
            line = testLine;
            continue;
        }

        ctx.fillText(fitTextWithEllipsis(ctx, line, maxWidth), x, y);
        y += lineHeight;
        lines += 1;
        line = words[index];

        if (isLastAllowedLine) {
            while (ctx.measureText(`${line}...`).width > maxWidth && line.length > 4) {
                line = line.slice(0, -1);
            }
            ctx.fillText(`${line}...`, x, y);
            return y + lineHeight;
        }
    }

    if (line && lines < maxLines) {
        ctx.fillText(fitTextWithEllipsis(ctx, line, maxWidth), x, y);
        y += lineHeight;
    }

    return y;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

function fitTextWithEllipsis(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string {
    if (ctx.measureText(value).width <= maxWidth) return value;
    let fitted = value;
    while (fitted.length > 1 && ctx.measureText(`${fitted}…`).width > maxWidth) {
        fitted = fitted.slice(0, -1).trimEnd();
    }
    return `${fitted}…`;
}

async function loadImage(url?: string): Promise<HTMLImageElement | null> {
    if (!url) return null;
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = url;
    });
}

export async function generateSharableItemCardBlob(input: SharableItemCardInput): Promise<Blob> {
    if (typeof document === 'undefined') {
        throw new Error('Sharable item cards can only be generated in the browser.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available.');

    const accent = input.accentColor || '#0f172a';
    const options = (Array.isArray(input.options) ? input.options : [])
        .map((option) => ({
            name: String(option?.name || '').trim(),
            priceLabel: String(option?.priceLabel || '').trim() || undefined,
        }))
        .filter((option) => option.name)
        .slice(0, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ATTRIBUTES_PER_ITEM);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    roundedRect(ctx, 54, 54, CARD_WIDTH - 108, CARD_HEIGHT - 108, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.stroke();

    const image = await loadImage(input.imageUrl);
    const imageX = 90;
    const imageY = 90;
    const imageW = 420;
    const imageH = 450;
    roundedRect(ctx, imageX, imageY, imageW, imageH, 18);
    ctx.save();
    ctx.clip();
    if (image) {
        const scale = Math.max(imageW / image.width, imageH / image.height);
        const drawW = image.width * scale;
        const drawH = image.height * scale;
        ctx.drawImage(image, imageX + (imageW - drawW) / 2, imageY + (imageH - drawH) / 2, drawW, drawH);
    } else {
        ctx.fillStyle = `${accent}18`;
        ctx.fillRect(imageX, imageY, imageW, imageH);
        ctx.fillStyle = accent;
        ctx.font = '800 104px system-ui, -apple-system, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(input.itemName.slice(0, 1).toUpperCase(), imageX + imageW / 2, imageY + imageH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();

    const textX = 548;
    const textW = 556;
    ctx.fillStyle = accent;
    ctx.font = '800 28px system-ui, -apple-system, Segoe UI, sans-serif';
    drawWrappedText(ctx, input.storeName || 'Menu', textX, 116, textW, 34, 1);

    ctx.fillStyle = '#64748b';
    ctx.font = '650 24px system-ui, -apple-system, Segoe UI, sans-serif';
    drawWrappedText(ctx, input.categoryName || input.projectName || 'Menu item', textX, 164, textW, 30, 1);

    ctx.fillStyle = '#0f172a';
    const itemNameFont = options.length > 0
        ? (input.itemName.length > 42 ? '800 44px' : '860 54px')
        : (input.itemName.length > 42 ? '800 54px' : '860 64px');
    const itemNameLineHeight = options.length > 0
        ? (input.itemName.length > 42 ? 48 : 54)
        : (input.itemName.length > 42 ? 58 : 68);
    ctx.font = `${itemNameFont} system-ui, -apple-system, Segoe UI, sans-serif`;
    let y = drawWrappedText(ctx, input.itemName || 'Menu item', textX, options.length > 0 ? 226 : 238, textW, itemNameLineHeight, 2);

    if (input.price) {
        ctx.fillStyle = accent;
        ctx.font = `${options.length > 0 ? '850 38px' : '850 44px'} system-ui, -apple-system, Segoe UI, sans-serif`;
        ctx.fillText(input.price, textX, y + (options.length > 0 ? 8 : 12));
        y += options.length > 0 ? 50 : 62;
    }

    if (options.length > 0) {
        if (input.description) {
            ctx.fillStyle = '#334155';
            ctx.font = '500 21px system-ui, -apple-system, Segoe UI, sans-serif';
            ctx.fillText(fitTextWithEllipsis(ctx, input.description.replace(/\s+/g, ' ').trim(), textW), textX, y + 4);
            y += 34;
        }
        ctx.fillStyle = '#64748b';
        ctx.font = '800 18px system-ui, -apple-system, Segoe UI, sans-serif';
        ctx.fillText('OPTIONS', textX, y + 4);

        const visibleOptions = options.slice(0, input.description ? 2 : 3);
        let optionY = y + 30;
        visibleOptions.forEach((option) => {
            ctx.fillStyle = '#334155';
            ctx.font = '650 21px system-ui, -apple-system, Segoe UI, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(fitTextWithEllipsis(ctx, option.name, textW - 150), textX, optionY);
            if (option.priceLabel) {
                ctx.fillStyle = accent;
                ctx.font = '750 21px system-ui, -apple-system, Segoe UI, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(option.priceLabel, textX + textW, optionY);
            }
            optionY += 24;
        });
        ctx.textAlign = 'left';
        if (options.length > visibleOptions.length) {
            ctx.fillStyle = '#64748b';
            ctx.font = '650 19px system-ui, -apple-system, Segoe UI, sans-serif';
            ctx.fillText(`${options.length - visibleOptions.length} more options`, textX, optionY);
        }
    } else if (input.description) {
        ctx.fillStyle = '#334155';
        ctx.font = '400 26px system-ui, -apple-system, Segoe UI, sans-serif';
        drawWrappedText(ctx, input.description, textX, y + 12, textW, 35, 3);
    }

    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(textX, 516);
    ctx.lineTo(textX + textW, 516);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '650 21px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(input.updatedLabel || 'Current menu', textX, 558);
    ctx.textAlign = 'right';
    ctx.fillText('MenuList', textX + textW, 558);
    ctx.textAlign = 'left';

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Could not generate item card.'));
        }, 'image/png', 0.95);
    });
}

export async function downloadSharableItemCard(input: SharableItemCardInput): Promise<void> {
    const blob = await generateSharableItemCardBlob(input);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${buildSharableItemCardFilename(input.itemName)}-card.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function shareSharableItemCard(input: SharableItemCardInput): Promise<'shared' | 'downloaded'> {
    const blob = await generateSharableItemCardBlob(input);
    const file = new File([blob], `${buildSharableItemCardFilename(input.itemName)}-card.png`, { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
            files: [file],
            title: input.itemName,
            text: input.storeName,
        });
        return 'shared';
    }

    await downloadSharableItemCard(input);
    return 'downloaded';
}
