const MAX_CANVAS_TEXT_LENGTH = 4096;
const MAX_CANVAS_FONT_SIZE = 512;
const MIN_CANVAS_FONT_SIZE = 1;
const MAX_CANVAS_TEXT_WIDTH = 100_000;

function normalizeCanvasText(text: string): string {
    return typeof text === 'string' ? text.slice(0, MAX_CANVAS_TEXT_LENGTH) : '';
}

function normalizeCanvasWidth(maxWidth: number): number {
    return Number.isFinite(maxWidth)
        ? Math.max(0, Math.min(MAX_CANVAS_TEXT_WIDTH, maxWidth))
        : 0;
}

export function drawRoundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
): void {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

export function fillRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fillStyle: string,
): void {
    drawRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
}

export function strokeRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    strokeStyle: string,
    lineWidth: number,
): void {
    drawRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

export function fillRoundedVerticalGradient(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    from: string,
    to: string,
): void {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    drawRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = gradient;
    ctx.fill();
}

export function fillVerticalGradient(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    from: string,
    to: string,
): void {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
}

export function fitCanvasText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    font: string,
    minSize: number,
): string {
    const safeText = normalizeCanvasText(text);
    const safeMaxWidth = normalizeCanvasWidth(maxWidth);
    const safeMinSize = Number.isFinite(minSize)
        ? Math.max(MIN_CANVAS_FONT_SIZE, Math.min(MAX_CANVAS_FONT_SIZE, Math.round(minSize)))
        : MIN_CANVAS_FONT_SIZE;
    const safeFont = typeof font === 'string' ? font.slice(0, 512) : '';
    const match = safeFont.match(/(\d+)px/);
    const requestedStartSize = match ? Number(match[1]) : safeMinSize;
    const startSize = Math.max(safeMinSize, Math.min(MAX_CANVAS_FONT_SIZE, requestedStartSize));
    const fontWithoutSize = match
        ? safeFont.replace(/\d+px/, '{size}px')
        : '{size}px sans-serif';
    let size = startSize;

    while (size > safeMinSize) {
        ctx.font = fontWithoutSize.replace('{size}', String(size));
        if (ctx.measureText(safeText).width <= safeMaxWidth) return ctx.font;
        size -= 2;
    }

    ctx.font = fontWithoutSize.replace('{size}', String(safeMinSize));
    return ctx.font;
}

export function truncateCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    const safeText = normalizeCanvasText(text);
    const safeMaxWidth = normalizeCanvasWidth(maxWidth);
    if (ctx.measureText(safeText).width <= safeMaxWidth) return safeText;
    if (ctx.measureText('...').width > safeMaxWidth) return '';

    let lower = 0;
    let upper = safeText.length;
    while (lower < upper) {
        const middle = Math.ceil((lower + upper) / 2);
        if (ctx.measureText(`${safeText.slice(0, middle)}...`).width <= safeMaxWidth) {
            lower = middle;
        } else {
            upper = middle - 1;
        }
    }

    return `${safeText.slice(0, lower)}...`;
}

export function wrapCanvasText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines: number,
): string[] {
    const safeText = normalizeCanvasText(text).replace(/\s+/g, ' ').trim();
    const safeMaxWidth = normalizeCanvasWidth(maxWidth);
    const safeMaxLines = Number.isSafeInteger(maxLines)
        ? Math.max(0, Math.min(100, maxLines))
        : 0;
    if (!safeText || safeMaxWidth <= 0 || safeMaxLines <= 0) return [];

    const words = safeText.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (let index = 0; index < words.length; index += 1) {
        const word = words[index];
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(candidate).width <= safeMaxWidth) {
            currentLine = candidate;
            continue;
        }

        if (lines.length === safeMaxLines - 1) {
            const remainder = [currentLine, ...words.slice(index)].filter(Boolean).join(' ');
            const finalLine = truncateCanvasText(ctx, remainder, safeMaxWidth);
            return finalLine ? [...lines, finalLine] : lines;
        }

        if (currentLine) lines.push(currentLine);
        currentLine = ctx.measureText(word).width <= safeMaxWidth
            ? word
            : truncateCanvasText(ctx, word, safeMaxWidth);
    }

    if (currentLine && lines.length < safeMaxLines) lines.push(currentLine);
    return lines;
}

export function stripDecorativeStatusSymbols(text: string): string {
    return text
        .replace(/[\u2705\u2713\u2714\ufe0f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
