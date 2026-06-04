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
    const match = font.match(/(\d+)px/);
    const startSize = match ? Number(match[1]) : minSize;
    const fontWithoutSize = font.replace(/\d+px/, '{size}px');
    let size = startSize;

    while (size > minSize) {
        ctx.font = fontWithoutSize.replace('{size}', String(size));
        if (ctx.measureText(text).width <= maxWidth) return ctx.font;
        size -= 2;
    }

    ctx.font = fontWithoutSize.replace('{size}', String(minSize));
    return ctx.font;
}

export function truncateCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;

    let output = text;
    while (output.length > 3 && ctx.measureText(`${output}...`).width > maxWidth) {
        output = output.slice(0, -1);
    }

    return `${output}...`;
}

export function stripDecorativeStatusSymbols(text: string): string {
    return text
        .replace(/[\u2705\u2713\u2714\ufe0f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
