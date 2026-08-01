import QRCode from "qrcode";
import {
    CreativeEditorDocument,
    CreativeEditorElement,
    CreativeEditorExportResult,
    CreativeEditorLinearGradient,
    CreativeEditorStrokeStyle,
    CreativeEditorVisibleWatermark,
} from "./types";

const escapeXml = (value: unknown) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const buildCreativeEditorFilename = (document: CreativeEditorDocument, extension: string) => {
    const base = (document.title || "creative-asset")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        || "creative-asset";
    return `${base}.${extension}`;
};

const downloadBlob = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
};

const renderTextElement = (element: Extract<CreativeEditorElement, { type: "text" }>) => {
    const lines = element.text.split("\n");
    const lineHeight = element.fontSize * (element.lineHeight || 1.12);
    const anchor = element.align === "center" ? "middle" : element.align === "right" ? "end" : "start";
    const x = element.align === "center"
        ? element.x + element.width / 2
        : element.align === "right"
            ? element.x + element.width
            : element.x;
    return `<text x="${x}" y="${element.y + element.fontSize}" fill="${escapeXml(element.color)}" font-family="${escapeXml(element.fontFamily || "Inter, Arial, sans-serif")}" font-size="${element.fontSize}" font-weight="${escapeXml(element.fontWeight || "700")}" text-anchor="${anchor}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("")}</text>`;
};

const getStrokeDashArray = (strokeStyle?: CreativeEditorStrokeStyle) => {
    if (strokeStyle === "dashed" || strokeStyle === "dashed-round") return "16 12";
    if (strokeStyle === "long-dashed" || strokeStyle === "long-dashed-round") return "28 12";
    if (strokeStyle === "dash-dot" || strokeStyle === "dash-dot-round") return "18 9 4 9";
    if (strokeStyle === "dotted" || strokeStyle === "dotted-round") return "4 10";
    return "";
};

const getStrokeLineCap = (strokeStyle?: CreativeEditorStrokeStyle, lineCap?: string) => {
    if (lineCap) return lineCap;
    if (strokeStyle?.endsWith("-round") || strokeStyle === "dotted") return "round";
    return "butt";
};

const buildElementShellAttributes = (element: CreativeEditorElement) => {
    const opacity = element.opacity ?? 1;
    const transform = element.rotation
        ? ` transform="rotate(${element.rotation} ${element.x + element.width / 2} ${element.y + element.height / 2})"`
        : "";
    const style = element.blur ? ` style="filter: blur(${element.blur}px);"` : "";
    return ` opacity="${opacity}"${transform}${style} data-layer-id="${escapeXml(element.id)}"`;
};

function getLinearGradientCoords(gradient: CreativeEditorLinearGradient) {
    const angle = -gradient.angle * (Math.PI / 180);
    return {
        x1: Math.round(50 + Math.sin(angle) * 50),
        x2: Math.round(50 + Math.sin(angle + Math.PI) * 50),
        y1: Math.round(50 + Math.cos(angle) * 50),
        y2: Math.round(50 + Math.cos(angle + Math.PI) * 50),
    };
}

function renderBackground(documentValue: CreativeEditorDocument) {
    const { backgroundColor, backgroundGradient, height, width } = documentValue.canvas;
    if (!backgroundGradient?.enabled) {
        return {
            defs: "",
            rect: `<rect width="${width}" height="${height}" fill="${escapeXml(backgroundColor)}" />`,
        };
    }
    const stops = (backgroundGradient.stops && backgroundGradient.stops.length >= 2
        ? backgroundGradient.stops
        : [
            { color: backgroundGradient.from, offset: 0 },
            { color: backgroundGradient.to, offset: 1 },
        ])
        .filter((stop) => typeof stop.color === "string" && Number.isFinite(stop.offset))
        .sort((a, b) => a.offset - b.offset);
    if (stops.length < 2) {
        return {
            defs: "",
            rect: `<rect width="${width}" height="${height}" fill="${escapeXml(backgroundColor)}" />`,
        };
    }
    const coords = getLinearGradientCoords(backgroundGradient);
    const gradientId = "creative-editor-background-gradient";
    return {
        defs: `<defs><linearGradient id="${gradientId}" x1="${coords.x1}%" y1="${coords.y1}%" x2="${coords.x2}%" y2="${coords.y2}%">${stops.map((stop) => `<stop offset="${Math.max(0, Math.min(1, stop.offset)) * 100}%" stop-color="${escapeXml(stop.color)}" />`).join("")}</linearGradient></defs>`,
        rect: `<rect width="${width}" height="${height}" fill="url(#${gradientId})" />`,
    };
}

async function buildQrDataUrl(element: Extract<CreativeEditorElement, { type: "qr" }>) {
    return QRCode.toDataURL(element.value || "https://example.com", {
        color: {
            dark: element.darkColor || "#16231f",
            light: element.lightColor || "#ffffff",
        },
        errorCorrectionLevel: element.errorCorrectionLevel || "H",
        margin: element.margin ?? 4,
        width: Math.max(128, Math.round(Math.max(element.width, element.height))),
    });
}

async function renderElement(element: CreativeEditorElement): Promise<string> {
    if (element.visible === false || element.excludeFromExport || element.editorGuide) return "";
    const shellAttrs = buildElementShellAttributes(element);

    if (element.type === "text") return `<g${shellAttrs}>${renderTextElement(element)}</g>`;
    if (element.type === "pathText") {
        const pathId = `path_${escapeXml(element.id)}`;
        const dash = getStrokeDashArray(element.strokeStyle);
        const pathVisible = element.pathVisible !== false;
        return `<g${shellAttrs}><path id="${pathId}" d="${escapeXml(element.path)}" transform="translate(${element.x} ${element.y})" fill="none" stroke="${pathVisible ? escapeXml(element.pathStroke || "#d7dbdf") : "transparent"}" stroke-width="${pathVisible ? 1 : 0}"${dash ? ` stroke-dasharray="${dash}"` : ""} /><text fill="${escapeXml(element.color)}" font-family="${escapeXml(element.fontFamily || "Inter, Arial, sans-serif")}" font-size="${element.fontSize}" font-weight="${escapeXml(element.fontWeight || "800")}"><textPath href="#${pathId}">${escapeXml(element.text)}</textPath></text></g>`;
    }
    if (element.type === "rect") {
        const dash = getStrokeDashArray(element.strokeStyle);
        return `<g${shellAttrs}><rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="${element.radius || 0}" fill="${escapeXml(element.fill)}" stroke="${escapeXml(element.stroke || "transparent")}" stroke-width="${element.strokeWidth || 0}" stroke-linecap="${getStrokeLineCap(element.strokeStyle, element.strokeLineCap)}"${dash ? ` stroke-dasharray="${dash}"` : ""} /></g>`;
    }
    if (element.type === "ellipse") {
        const dash = getStrokeDashArray(element.strokeStyle);
        return `<g${shellAttrs}><ellipse cx="${element.x + element.width / 2}" cy="${element.y + element.height / 2}" rx="${element.width / 2}" ry="${element.height / 2}" fill="${escapeXml(element.fill)}" stroke="${escapeXml(element.stroke || "transparent")}" stroke-width="${element.strokeWidth || 0}" stroke-linecap="${getStrokeLineCap(element.strokeStyle, element.strokeLineCap)}"${dash ? ` stroke-dasharray="${dash}"` : ""} /></g>`;
    }
    if (element.type === "triangle") {
        const dash = getStrokeDashArray(element.strokeStyle);
        const points = `${element.x + element.width / 2},${element.y} ${element.x + element.width},${element.y + element.height} ${element.x},${element.y + element.height}`;
        return `<g${shellAttrs}><polygon points="${points}" fill="${escapeXml(element.fill)}" stroke="${escapeXml(element.stroke || "transparent")}" stroke-width="${element.strokeWidth || 0}" stroke-linecap="${getStrokeLineCap(element.strokeStyle, element.strokeLineCap)}"${dash ? ` stroke-dasharray="${dash}"` : ""} /></g>`;
    }
    if (element.type === "polygon") {
        const dash = getStrokeDashArray(element.strokeStyle);
        const points = element.points.map((point) => `${point.x},${point.y}`).join(" ");
        const naturalWidth = Math.max(1, ...element.points.map((point) => point.x));
        const naturalHeight = Math.max(1, ...element.points.map((point) => point.y));
        return `<g${shellAttrs}><polygon transform="translate(${element.x} ${element.y}) scale(${element.width / naturalWidth} ${element.height / naturalHeight})" points="${points}" fill="${escapeXml(element.fill)}" stroke="${escapeXml(element.stroke || "transparent")}" stroke-width="${element.strokeWidth || 0}" stroke-linecap="${getStrokeLineCap(element.strokeStyle, element.strokeLineCap)}"${dash ? ` stroke-dasharray="${dash}"` : ""} /></g>`;
    }
    if (element.type === "path") {
        const dash = getStrokeDashArray(element.strokeStyle);
        return `<g${shellAttrs}><path transform="translate(${element.x} ${element.y})" d="${escapeXml(element.path)}" fill="${escapeXml(element.fill)}" stroke="${escapeXml(element.stroke || "transparent")}" stroke-width="${element.strokeWidth || 0}" stroke-linecap="${getStrokeLineCap(element.strokeStyle, element.strokeLineCap)}"${dash ? ` stroke-dasharray="${dash}"` : ""} /></g>`;
    }
    if (element.type === "line") {
        const dash = getStrokeDashArray(element.strokeStyle);
        const marker = element.arrowStyle && element.arrowStyle !== "none"
            ? `<marker id="arrow_${escapeXml(element.id)}" markerHeight="10" markerWidth="10" orient="auto" refX="8" refY="5"><path d="M 0 0 L 10 5 L 0 10 z" fill="${escapeXml(element.stroke)}" /></marker>`
            : "";
        return `<g${shellAttrs}>${marker}<line x1="${element.x}" y1="${element.y}" x2="${element.x + element.width}" y2="${element.y + element.height}" stroke="${escapeXml(element.stroke)}" stroke-width="${element.strokeWidth || 4}" stroke-linecap="${getStrokeLineCap(element.strokeStyle, element.strokeLineCap || "round")}"${dash ? ` stroke-dasharray="${dash}"` : ""}${marker ? ` marker-end="url(#arrow_${escapeXml(element.id)})"` : ""} /></g>`;
    }
    if (element.type === "image") {
        return `<g${shellAttrs}><image href="${escapeXml(element.src)}" x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" preserveAspectRatio="${element.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice"}"><title>${escapeXml(element.alt || element.name)}</title></image></g>`;
    }
    if (element.type === "qr") {
        const dataUrl = await buildQrDataUrl(element);
        return `<g${shellAttrs}><image href="${escapeXml(dataUrl)}" x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" preserveAspectRatio="xMidYMid meet"><title>${escapeXml(element.name)}</title></image></g>`;
    }
    return "";
}

function renderVisibleWatermark(watermark: CreativeEditorVisibleWatermark | undefined, width: number, height: number) {
    if (!watermark?.enabled || !watermark.text.trim()) return "";
    const text = escapeXml(watermark.text);
    const opacity = watermark.opacity;
    if (watermark.position === "tiled") {
        const nodes: string[] = [];
        const stepX = Math.max(260, watermark.text.length * watermark.fontSize * 0.78);
        const stepY = Math.max(150, watermark.fontSize * 5);
        for (let y = 48; y < height; y += stepY) {
            for (let x = -30; x < width; x += stepX) {
                nodes.push(`<text x="${x}" y="${y}" fill="${escapeXml(watermark.color)}" font-family="${escapeXml(watermark.fontFamily || "Inter, Arial, sans-serif")}" font-size="${watermark.fontSize}" font-weight="800" opacity="${opacity}" transform="rotate(${watermark.rotation ?? -24} ${x} ${y})">${text}</text>`);
            }
        }
        return nodes.join("\n");
    }
    const margin = Math.max(24, width * 0.03);
    const estimatedWidth = Math.max(80, watermark.text.length * watermark.fontSize * 0.55);
    const x = watermark.position === "bottom-left" || watermark.position === "top-left"
        ? margin
        : watermark.position === "center"
            ? (width - estimatedWidth) / 2
            : width - estimatedWidth - margin;
    const y = watermark.position === "top-left" || watermark.position === "top-right"
        ? margin + watermark.fontSize
        : watermark.position === "center"
            ? height / 2
            : height - margin;
    return `<text x="${x}" y="${y}" fill="${escapeXml(watermark.color)}" font-family="${escapeXml(watermark.fontFamily || "Inter, Arial, sans-serif")}" font-size="${watermark.fontSize}" font-weight="800" opacity="${opacity}" transform="rotate(${watermark.rotation || 0} ${x} ${y})">${text}</text>`;
}

export async function serializeCreativeDocumentToSvg(documentValue: CreativeEditorDocument): Promise<string> {
    const body = (await Promise.all(documentValue.elements.map(renderElement))).join("\n");
    const { width, height } = documentValue.canvas;
    const background = renderBackground(documentValue);
    const visibleWatermark = renderVisibleWatermark(documentValue.metadata?.visibleWatermark, width, height);
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(documentValue.title)}">`,
        background.defs,
        background.rect,
        body,
        visibleWatermark,
        "</svg>",
    ].join("\n");
}

export async function downloadCreativeEditorSvg(documentValue: CreativeEditorDocument): Promise<CreativeEditorExportResult> {
    const result = await renderCreativeEditorSvgBlob(documentValue);
    if (result.blob) downloadBlob(result.filename, result.blob);
    return result;
}

export async function renderCreativeEditorSvgBlob(documentValue: CreativeEditorDocument): Promise<CreativeEditorExportResult> {
    const svg = await serializeCreativeDocumentToSvg(documentValue);
    const filename = buildCreativeEditorFilename(documentValue, "svg");
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    return {
        blob,
        document: documentValue,
        filename,
        format: "svg",
        mimeType: "image/svg+xml",
        sizeBytes: blob.size,
        svg,
    };
}

export async function downloadCreativeEditorJson(documentValue: CreativeEditorDocument): Promise<CreativeEditorExportResult> {
    const json = JSON.stringify(documentValue, null, 2);
    const filename = buildCreativeEditorFilename(documentValue, "json");
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    downloadBlob(filename, blob);
    return {
        blob,
        document: documentValue,
        filename,
        format: "json",
        mimeType: "application/json",
        sizeBytes: blob.size,
    };
}

export async function downloadCreativeEditorPng(documentValue: CreativeEditorDocument): Promise<CreativeEditorExportResult> {
    const result = await renderCreativeEditorPngBlob(documentValue);
    if (result.blob) downloadBlob(result.filename, result.blob);
    return result;
}

export async function renderCreativeEditorPngBlob(documentValue: CreativeEditorDocument): Promise<CreativeEditorExportResult> {
    const svg = await serializeCreativeDocumentToSvg(documentValue);
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Image export failed. Replace blocked external images or use SVG export."));
            img.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = documentValue.canvas.width;
        canvas.height = documentValue.canvas.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas export is unavailable in this browser.");
        context.drawImage(image, 0, 0);
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result) resolve(result);
                else reject(new Error("PNG export failed. Try SVG export."));
            }, "image/png");
        });
        const filename = buildCreativeEditorFilename(documentValue, "png");
        return {
            blob,
            document: documentValue,
            filename,
            format: "png",
            mimeType: "image/png",
            sizeBytes: blob.size,
            svg,
        };
    } finally {
        URL.revokeObjectURL(url);
    }
}
